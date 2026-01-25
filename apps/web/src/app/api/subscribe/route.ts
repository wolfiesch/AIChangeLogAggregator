import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { emailSubscribers } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Check if already subscribed
    const existing = await db.query.emailSubscribers.findFirst({
      where: eq(emailSubscribers.email, email.toLowerCase()),
    });

    if (existing) {
      if (existing.verified && !existing.unsubscribedAt) {
        return NextResponse.json(
          { error: "This email is already subscribed" },
          { status: 400 }
        );
      }

      // Re-subscribe if previously unsubscribed
      if (existing.unsubscribedAt) {
        await db
          .update(emailSubscribers)
          .set({
            unsubscribedAt: null,
            verified: true,
          })
          .where(eq(emailSubscribers.id, existing.id));

        return NextResponse.json({
          message: "Welcome back! You've been re-subscribed.",
        });
      }

      // Resend verification if not verified
      // In production, you would send a verification email here
      return NextResponse.json({
        message: "Please check your email to confirm your subscription.",
      });
    }

    // Generate tokens
    const verificationToken = randomBytes(32).toString("hex");
    const unsubscribeToken = randomBytes(32).toString("hex");

    // Insert new subscriber
    await db.insert(emailSubscribers).values({
      email: email.toLowerCase(),
      verificationToken,
      unsubscribeToken,
    });

    // In production, send verification email using Resend or similar
    // For now, auto-verify for testing
    // TODO: Implement email verification with Resend

    return NextResponse.json({
      message: "Thanks for subscribing! Check your email to confirm.",
    });
  } catch (error) {
    console.error("Subscribe error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
