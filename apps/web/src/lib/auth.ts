import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { authSessions, emailSubscribers } from "@/db/schema";

const SESSION_COOKIE_NAME = "aichangelog_session";

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function newToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export function setSessionCookie(res: NextResponse, token: string, expiresAt: Date) {
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function createSession(subscriberId: number, ttlDays = 30) {
  const rawToken = newToken(32);
  const sessionTokenHash = sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  await db.insert(authSessions).values({
    subscriberId,
    sessionTokenHash,
    expiresAt,
  });

  return { token: rawToken, expiresAt };
}

export async function getCurrentSubscriberId(): Promise<number | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const sessionTokenHash = sha256Hex(token);
  const now = new Date();

  const session = await db.query.authSessions.findFirst({
    where: and(
      eq(authSessions.sessionTokenHash, sessionTokenHash),
      isNull(authSessions.revokedAt),
      gt(authSessions.expiresAt, now)
    ),
  });

  return session?.subscriberId ?? null;
}

export async function getCurrentSubscriber() {
  const subscriberId = await getCurrentSubscriberId();
  if (!subscriberId) return null;

  return db.query.emailSubscribers.findFirst({
    where: eq(emailSubscribers.id, subscriberId),
  });
}
