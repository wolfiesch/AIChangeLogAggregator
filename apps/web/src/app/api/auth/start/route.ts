import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { authMagicLinks, emailSubscribers } from "@/db/schema";
import { sendSignInEmail } from "@/lib/email";

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function sanitizeNextPath(nextPath: unknown): string | undefined {
  if (typeof nextPath !== "string") return undefined;
  const trimmed = nextPath.trim();
  if (!trimmed) return undefined;
  if (!trimmed.startsWith("/")) return undefined;
  if (trimmed.startsWith("//")) return undefined;
  if (trimmed.includes("://")) return undefined;
  return trimmed;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const emailRaw = body?.email;
    const nextPath = sanitizeNextPath(body?.next);

    if (!emailRaw || typeof emailRaw !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const email = emailRaw.trim().toLowerCase();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Find or create subscriber record (account)
    const existing = await db.query.emailSubscribers.findFirst({
      where: eq(emailSubscribers.email, email),
    });

    let subscriberId: number;
    if (!existing) {
      const unsubscribeToken = randomBytes(32).toString("hex");

      const inserted = await db
        .insert(emailSubscribers)
        .values({
          email,
          unsubscribeToken,
          // Default to digest OFF unless explicitly subscribed via /subscribe
          unsubscribedAt: new Date(),
        })
        .returning({ id: emailSubscribers.id });

      subscriberId = inserted[0]!.id;
    } else {
      subscriberId = existing.id;
    }

    // Create a short-lived magic link
    const token = randomBytes(32).toString("hex");
    const tokenHash = sha256Hex(token);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await db.insert(authMagicLinks).values({
      subscriberId,
      tokenHash,
      expiresAt,
    });

    await sendSignInEmail(email, token, nextPath);

    return NextResponse.json({
      message: "Check your email for a sign-in link.",
    });
  } catch (error) {
    console.error("Auth start error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
