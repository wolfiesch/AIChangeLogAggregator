import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { authSessions } from "@/db/schema";
import { clearSessionCookie } from "@/lib/auth";

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get("aichangelog_session")?.value;
  const res = NextResponse.json({ ok: true });

  if (!token) {
    clearSessionCookie(res);
    return res;
  }

  const sessionTokenHash = sha256Hex(token);

  try {
    await db
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(authSessions.sessionTokenHash, sessionTokenHash),
          isNull(authSessions.revokedAt)
        )
      );
  } catch (error) {
    console.error("Logout error:", error);
  }

  clearSessionCookie(res);
  return res;
}
