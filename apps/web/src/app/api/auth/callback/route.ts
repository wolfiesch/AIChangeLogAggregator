import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { authMagicLinks, emailSubscribers } from "@/db/schema";
import { createSession, setSessionCookie } from "@/lib/auth";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://changelog.wolfgangschoenberger.com")
  .trim()
  .replace(/\/$/, "");

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function sanitizeNextPath(nextPath: string | null): string {
  if (!nextPath) return "/following";
  const trimmed = nextPath.trim();
  if (!trimmed.startsWith("/")) return "/following";
  if (trimmed.startsWith("//")) return "/following";
  if (trimmed.includes("://")) return "/following";
  return trimmed;
}

export async function GET(request: NextRequest) {
  const rawToken = request.nextUrl.searchParams.get("token");
  const nextPath = sanitizeNextPath(request.nextUrl.searchParams.get("next"));
  if (!rawToken) {
    return NextResponse.redirect(new URL("/signin?error=invalid-link", SITE_URL));
  }

  const tokenHash = sha256Hex(rawToken);
  const now = new Date();

  const magicLink = await db.query.authMagicLinks.findFirst({
    where: and(
      eq(authMagicLinks.tokenHash, tokenHash),
      isNull(authMagicLinks.usedAt),
      gt(authMagicLinks.expiresAt, now)
    ),
  });

  if (!magicLink) {
    return NextResponse.redirect(
      new URL("/signin?error=expired-or-invalid", SITE_URL)
    );
  }

  // Mark link as used
  await db
    .update(authMagicLinks)
    .set({ usedAt: now })
    .where(eq(authMagicLinks.id, magicLink.id));

  // Ensure subscriber is marked verified (email confirmed)
  await db
    .update(emailSubscribers)
    .set({ verified: true, verificationToken: null })
    .where(eq(emailSubscribers.id, magicLink.subscriberId));

  // Create session
  const session = await createSession(magicLink.subscriberId);

  const res = NextResponse.redirect(new URL(nextPath, SITE_URL));
  setSessionCookie(res, session.token, session.expiresAt);
  return res;
}
