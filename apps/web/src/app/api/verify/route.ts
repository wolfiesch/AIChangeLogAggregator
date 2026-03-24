import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailSubscribers } from "@/db/schema";
import { eq } from "drizzle-orm";

const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL ||
    "https://changelog.wolfgangschoenberger.com")
    .trim()
    .replace(/\/$/, "");

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/?error=invalid-token", SITE_URL));
  }

  try {
    // Find subscriber by verification token
    const subscriber = await db.query.emailSubscribers.findFirst({
      where: eq(emailSubscribers.verificationToken, token),
    });

    if (!subscriber) {
      return NextResponse.redirect(new URL("/?error=invalid-token", SITE_URL));
    }

    if (subscriber.verified) {
      return NextResponse.redirect(
        new URL("/?message=already-verified", SITE_URL)
      );
    }

    // Mark as verified
    await db
      .update(emailSubscribers)
      .set({
        verified: true,
        verificationToken: null, // Clear token after use
      })
      .where(eq(emailSubscribers.id, subscriber.id));

    return NextResponse.redirect(
      new URL("/?message=subscription-confirmed", SITE_URL)
    );
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.redirect(new URL("/?error=verification-failed", SITE_URL));
  }
}
