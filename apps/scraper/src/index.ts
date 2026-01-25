import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { createHash } from "crypto";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, desc } from "drizzle-orm";
import * as schema from "./db/schema.js";
import {
  StaticScraper,
  GitHubScraper,
  PlaywrightScraper,
  StealthScraper,
  type Scraper,
} from "./scrapers/index.js";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const app = new Hono();

// Middleware
app.use("*", logger());
app.use("*", cors());

// Health check
app.get("/", (c) => {
  return c.json({
    status: "ok",
    service: "ai-changelog-scraper",
    timestamp: new Date().toISOString(),
  });
});

// Health check for Fly.io
app.get("/health", (c) => {
  return c.json({ status: "healthy" });
});

// Get scraper status
app.get("/status", async (c) => {
  const recentRuns = await db.query.scrapeRuns.findMany({
    limit: 20,
    orderBy: [desc(schema.scrapeRuns.startedAt)],
    with: {
      source: {
        with: {
          product: {
            with: {
              provider: true,
            },
          },
        },
      },
    },
  });

  const activeSources = await db.query.sources.findMany({
    where: eq(schema.sources.isActive, true),
  });

  return c.json({
    activeSources: activeSources.length,
    recentRuns: recentRuns.map((run) => ({
      id: run.id,
      source: run.source?.url,
      provider: run.source?.product?.provider?.name,
      status: run.status,
      entriesFound: run.entriesFound,
      entriesNew: run.entriesNew,
      error: run.errorMessage,
      startedAt: run.startedAt,
      endedAt: run.endedAt,
    })),
  });
});

// Trigger a full scrape (protected by API key)
app.post("/scrape", async (c) => {
  const apiKey = c.req.header("X-API-Key");
  if (apiKey !== process.env.SCRAPER_API_KEY) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Run scrape in background
  runFullScrape().catch(console.error);

  return c.json({
    status: "started",
    message: "Scrape job started in background",
  });
});

// Scrape a single source (protected by API key)
app.post("/scrape/:sourceId", async (c) => {
  const apiKey = c.req.header("X-API-Key");
  if (apiKey !== process.env.SCRAPER_API_KEY) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const sourceId = parseInt(c.req.param("sourceId"), 10);

  const source = await db.query.sources.findFirst({
    where: eq(schema.sources.id, sourceId),
  });

  if (!source) {
    return c.json({ error: "Source not found" }, 404);
  }

  // Run scrape
  const result = await scrapeSource(source);

  return c.json({
    status: result.error ? "failed" : "success",
    ...result,
  });
});

// ============================================================================
// Scraping Logic
// ============================================================================

function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function getScraperForMethod(method: string): Scraper {
  switch (method) {
    case "static":
      return new StaticScraper();
    case "github_api":
      return new GitHubScraper();
    case "playwright":
      // Use StealthScraper for better bot detection evasion
      return new StealthScraper();
    default:
      throw new Error(`Unknown scrape method: ${method}`);
  }
}

async function scrapeSource(source: schema.Source): Promise<{
  entriesFound: number;
  entriesNew: number;
  error?: string;
}> {
  console.log(`Scraping: ${source.url}`);

  const scraper = getScraperForMethod(source.scrapeMethod);
  const result = await scraper.scrape(source);

  if (!result.success) {
    return { entriesFound: 0, entriesNew: 0, error: result.error };
  }

  let entriesNew = 0;

  for (const entry of result.entries) {
    const contentHash = hashContent(entry.content);

    try {
      const existing = await db.query.changelogEntries.findFirst({
        where: eq(schema.changelogEntries.contentHash, contentHash),
      });

      if (existing) continue;

      await db.insert(schema.changelogEntries).values({
        sourceId: source.id,
        externalId: entry.externalId,
        publishedDate: entry.publishedDate?.toISOString().split("T")[0],
        title: entry.title,
        content: entry.content,
        contentHtml: entry.contentHtml,
        contentHash,
        url: entry.url,
        version: entry.version,
        tags: entry.tags,
      });

      entriesNew++;
    } catch (err) {
      if (err instanceof Error && err.message.includes("unique constraint")) {
        continue;
      }
      console.error(`Error inserting entry:`, err);
    }
  }

  // Update last scraped timestamp
  await db
    .update(schema.sources)
    .set({ lastScrapedAt: new Date() })
    .where(eq(schema.sources.id, source.id));

  return {
    entriesFound: result.entries.length,
    entriesNew,
  };
}

/**
 * Send Slack notification with scrape summary
 */
async function sendScrapeNotification(summary: {
  totalSources: number;
  totalNew: number;
  totalErrors: number;
  failedSources: string[];
}): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const color = summary.totalErrors > 0 ? "#ff0000" : "#36a64f";
  const status = summary.totalErrors > 0 ? "Completed with errors" : "Success";

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attachments: [
          {
            color,
            title: `Scraper Run: ${status}`,
            fields: [
              { title: "Sources", value: String(summary.totalSources), short: true },
              { title: "New Entries", value: String(summary.totalNew), short: true },
              { title: "Errors", value: String(summary.totalErrors), short: true },
              { title: "Success Rate", value: `${Math.round(((summary.totalSources - summary.totalErrors) / summary.totalSources) * 100)}%`, short: true },
            ],
            footer:
              summary.failedSources.length > 0
                ? `Failed: ${summary.failedSources.slice(0, 5).join(", ")}${summary.failedSources.length > 5 ? ` (+${summary.failedSources.length - 5} more)` : ""}`
                : undefined,
            ts: Math.floor(Date.now() / 1000).toString(),
          },
        ],
      }),
    });
    console.log("Sent Slack notification");
  } catch (err) {
    console.error("Failed to send Slack notification:", err);
  }
}

async function runFullScrape(): Promise<void> {
  console.log("Starting full scrape...");

  const sources = await db.query.sources.findMany({
    where: eq(schema.sources.isActive, true),
  });

  // Sort sources: static first, then github_api, then playwright (slowest)
  const methodOrder: Record<string, number> = { static: 0, github_api: 1, playwright: 2 };
  const sortedSources = [...sources].sort((a, b) =>
    (methodOrder[a.scrapeMethod] ?? 99) - (methodOrder[b.scrapeMethod] ?? 99)
  );

  const staticCount = sortedSources.filter(s => s.scrapeMethod === 'static').length;
  const githubCount = sortedSources.filter(s => s.scrapeMethod === 'github_api').length;
  const playwrightCount = sortedSources.filter(s => s.scrapeMethod === 'playwright').length;

  console.log(`Found ${sources.length} active sources (${staticCount} static, ${githubCount} github, ${playwrightCount} playwright)`);

  let totalNew = 0;
  let totalErrors = 0;
  let processed = 0;
  const failedSources: string[] = [];

  const stealthScraper = new StealthScraper();

  try {
    for (const source of sortedSources) {
      processed++;
      console.log(`[${processed}/${sortedSources.length}] Scraping (${source.scrapeMethod}): ${source.url}`);

      try {
        const result = await scrapeSource(source);
        totalNew += result.entriesNew;
        if (result.error) {
          totalErrors++;
          failedSources.push(source.url);
          console.log(`  -> Error: ${result.error}`);
        } else {
          console.log(`  -> Found ${result.entriesFound}, new: ${result.entriesNew}`);
        }

        // Record scrape run
        await db.insert(schema.scrapeRuns).values({
          sourceId: source.id,
          status: result.error ? "failed" : "success",
          entriesFound: result.entriesFound,
          entriesNew: result.entriesNew,
          errorMessage: result.error,
          endedAt: new Date(),
        });
      } catch (err) {
        totalErrors++;
        const errMsg = err instanceof Error ? err.message : String(err);
        failedSources.push(source.url);
        console.error(`  -> Exception: ${errMsg}`);

        await db.insert(schema.scrapeRuns).values({
          sourceId: source.id,
          status: "failed",
          errorMessage: errMsg,
          endedAt: new Date(),
        });
      }
    }
  } finally {
    await stealthScraper.close();
  }

  console.log(`Scrape complete. Processed: ${processed}, New: ${totalNew}, Errors: ${totalErrors}`);

  // Send Slack notification
  await sendScrapeNotification({
    totalSources: sortedSources.length,
    totalNew,
    totalErrors,
    failedSources,
  });

  // Trigger ISR revalidation on Vercel if configured
  if (process.env.VERCEL_REVALIDATE_URL) {
    try {
      await fetch(process.env.VERCEL_REVALIDATE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ revalidate: "/" }),
      });
      console.log("Triggered Vercel ISR revalidation");
    } catch (err) {
      console.error("Failed to trigger ISR:", err);
    }
  }
}

// Start server
const port = parseInt(process.env.PORT || "8080", 10);
console.log(`Scraper server starting on port ${port}`);

serve({
  fetch: app.fetch,
  port,
  hostname: "0.0.0.0",
}, (info) => {
  console.log(`Server running at http://${info.address}:${info.port}`);
});
