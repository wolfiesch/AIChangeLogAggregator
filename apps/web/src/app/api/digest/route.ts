import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailSubscribers } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getEntriesSince } from "@/lib/queries";
import { sendDigestEmail, type DigestEntry } from "@/lib/email";

// Vercel cron secret for authentication
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Weekly digest cron endpoint
 *
 * Configured in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/digest",
 *     "schedule": "0 9 * * 1"  // Every Monday at 9am UTC
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends this automatically for cron jobs)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Calculate date range (last 7 days)
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(now);
    weekEnd.setHours(23, 59, 59, 999);

    // Get entries from the last week
    const entries = await getEntriesSince(weekStart, 200);

    if (entries.length === 0) {
      return NextResponse.json({
        message: "No entries to send",
        entriesCount: 0,
        subscribersCount: 0,
      });
    }

    // Transform entries for email
    const digestEntries: DigestEntry[] = entries.map((entry) => ({
      providerName: entry.source?.product?.provider?.name || "Unknown",
      productName: entry.source?.product?.name || "Unknown",
      title: entry.title,
      content: entry.content,
      publishedDate: entry.publishedDate,
      url: entry.url,
    }));

    // Get verified, active subscribers
    const subscribers = await db.query.emailSubscribers.findMany({
      where: and(
        eq(emailSubscribers.verified, true),
        isNull(emailSubscribers.unsubscribedAt)
      ),
    });

    if (subscribers.length === 0) {
      return NextResponse.json({
        message: "No subscribers to notify",
        entriesCount: entries.length,
        subscribersCount: 0,
      });
    }

    // Send digest to each subscriber
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const subscriber of subscribers) {
      try {
        await sendDigestEmail(
          subscriber.email,
          subscriber.unsubscribeToken,
          digestEntries,
          weekStart,
          weekEnd
        );
        results.sent++;
      } catch (error) {
        results.failed++;
        results.errors.push(`${subscriber.email}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    return NextResponse.json({
      message: "Digest sent",
      entriesCount: entries.length,
      subscribersCount: subscribers.length,
      sent: results.sent,
      failed: results.failed,
      errors: results.errors.length > 0 ? results.errors : undefined,
    });
  } catch (error) {
    console.error("Digest error:", error);
    return NextResponse.json(
      { error: "Failed to send digest" },
      { status: 500 }
    );
  }
}

/**
 * Manual trigger for testing (requires API key)
 */
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");

  if (!apiKey || apiKey !== process.env.SCRAPER_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Trigger the same logic as GET
  const fakeRequest = new Request(request.url, {
    headers: { authorization: `Bearer ${CRON_SECRET}` },
  });

  return GET(fakeRequest as unknown as NextRequest);
}
