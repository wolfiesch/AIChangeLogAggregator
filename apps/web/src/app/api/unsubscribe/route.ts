import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailSubscribers } from "@/db/schema";
import { eq } from "drizzle-orm";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://changelog.wolfgangschoenberger.com";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/?error=invalid-token", SITE_URL));
  }

  try {
    // Find subscriber by unsubscribe token
    const subscriber = await db.query.emailSubscribers.findFirst({
      where: eq(emailSubscribers.unsubscribeToken, token),
    });

    if (!subscriber) {
      return NextResponse.redirect(new URL("/?error=invalid-token", SITE_URL));
    }

    if (subscriber.unsubscribedAt) {
      return NextResponse.redirect(
        new URL("/?message=already-unsubscribed", SITE_URL)
      );
    }

    // Mark as unsubscribed
    await db
      .update(emailSubscribers)
      .set({
        unsubscribedAt: new Date(),
      })
      .where(eq(emailSubscribers.id, subscriber.id));

    return NextResponse.redirect(
      new URL("/?message=unsubscribed", SITE_URL)
    );
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return NextResponse.redirect(new URL("/?error=unsubscribe-failed", SITE_URL));
  }
}
