import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import { authMagicLinks, emailSubscribers, userFollows } from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getEntriesSince } from "@/lib/queries";
import { sendDigestEmail, type DigestEntry } from "@/lib/email";

// Vercel cron secret for authentication
const CRON_SECRET = process.env.CRON_SECRET;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://changelog.wolfgangschoenberger.com")
  .trim()
  .replace(/\/$/, "");

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

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

    // Preload follows for all subscribers (avoid N queries)
    const subscriberIds = subscribers.map((s) => s.id);
    const followRows = await db
      .select({
        subscriberId: userFollows.subscriberId,
        productId: userFollows.productId,
      })
      .from(userFollows)
      .where(
        sql`${userFollows.subscriberId} IN (${sql.join(
          subscriberIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      );

    const followsBySubscriber = new Map<number, Set<number>>();
    for (const row of followRows) {
      const set = followsBySubscriber.get(row.subscriberId) ?? new Set<number>();
      set.add(row.productId);
      followsBySubscriber.set(row.subscriberId, set);
    }

    // Send digest to each subscriber
    const results = {
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const subscriber of subscribers) {
      try {
        const followedSet = followsBySubscriber.get(subscriber.id) ?? new Set<number>();

        // If the user follows products, personalize. Otherwise, fallback to global digest.
        const relevantEntries =
          followedSet.size > 0
            ? entries.filter((e) => {
                const productId = e.source?.product?.id;
                return typeof productId === "number" && followedSet.has(productId);
              })
            : entries;

        if (relevantEntries.length === 0) {
          results.skipped++;
          continue;
        }

        const digestEntries: DigestEntry[] = relevantEntries.map((entry) => ({
          providerName: entry.source?.product?.provider?.name || "Unknown",
          productName: entry.source?.product?.name || "Unknown",
          title: entry.title,
          content: entry.content,
          publishedDate: entry.publishedDate,
          url: `${SITE_URL}/entry/${entry.id}`,
        }));

        // Generate a one-click manage link (auth via magic link)
        const manageToken = randomBytes(32).toString("hex");
        await db.insert(authMagicLinks).values({
          subscriberId: subscriber.id,
          tokenHash: sha256Hex(manageToken),
          // 7 days
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

        const manageUrl = `${SITE_URL}/api/auth/callback?token=${manageToken}&next=/providers`;

        await sendDigestEmail(
          subscriber.email,
          subscriber.unsubscribeToken,
          digestEntries,
          weekStart,
          weekEnd,
          {
            manageUrl,
            personalized: followedSet.size > 0,
          }
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
      skipped: results.skipped,
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
