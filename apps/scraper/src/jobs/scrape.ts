import { createHash } from "crypto";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema.js";
import {
  StaticScraper,
  GitHubScraper,
  PlaywrightScraper,
  type Scraper,
  type ParsedEntry,
} from "../scrapers/index.js";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

/**
 * Content hash for deduplication
 */
function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Get the appropriate scraper for a source
 */
function getScraperForMethod(method: string): Scraper {
  switch (method) {
    case "static":
      return new StaticScraper();
    case "github_api":
      return new GitHubScraper();
    case "playwright":
      return new PlaywrightScraper();
    default:
      throw new Error(`Unknown scrape method: ${method}`);
  }
}

/**
 * Scrape a single source
 */
async function scrapeSource(source: schema.Source): Promise<{
  entriesFound: number;
  entriesNew: number;
  error?: string;
}> {
  console.log(`  Scraping: ${source.url}`);

  const scraper = getScraperForMethod(source.scrapeMethod);
  const result = await scraper.scrape(source);

  if (!result.success) {
    console.log(`    ❌ Error: ${result.error}`);
    return { entriesFound: 0, entriesNew: 0, error: result.error };
  }

  console.log(`    Found ${result.entries.length} entries`);

  let entriesNew = 0;

  // Insert new entries
  for (const entry of result.entries) {
    const contentHash = hashContent(entry.content);

    try {
      // Check if entry already exists (by hash)
      const existing = await db.query.changelogEntries.findFirst({
        where: eq(schema.changelogEntries.contentHash, contentHash),
      });

      if (existing) {
        continue; // Skip duplicate
      }

      // Insert new entry
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
      // Handle unique constraint violation gracefully
      if (
        err instanceof Error &&
        err.message.includes("unique constraint")
      ) {
        continue;
      }
      console.log(`    ⚠️ Error inserting entry: ${err}`);
    }
  }

  console.log(`    ✓ ${entriesNew} new entries added`);

  return {
    entriesFound: result.entries.length,
    entriesNew,
  };
}

/**
 * Run a complete scrape of all active sources
 */
async function runFullScrape(): Promise<void> {
  console.log("🚀 Starting full scrape...\n");

  // Get all active sources
  const sources = await db.query.sources.findMany({
    where: eq(schema.sources.isActive, true),
    with: {
      product: {
        with: {
          provider: true,
        },
      },
    },
  });

  console.log(`Found ${sources.length} active sources\n`);

  // Group sources by scrape method for efficiency
  const staticSources = sources.filter((s) => s.scrapeMethod === "static");
  const githubSources = sources.filter((s) => s.scrapeMethod === "github_api");
  const playwrightSources = sources.filter((s) => s.scrapeMethod === "playwright");

  let totalFound = 0;
  let totalNew = 0;
  let totalErrors = 0;

  // Scrape static sources (can be parallelized)
  console.log(`📄 Scraping ${staticSources.length} static sources...`);
  for (const source of staticSources) {
    const runId = await startScrapeRun(source.id);
    try {
      const result = await scrapeSource(source);
      totalFound += result.entriesFound;
      totalNew += result.entriesNew;
      if (result.error) totalErrors++;
      await completeScrapeRun(runId, result);
    } catch (err) {
      totalErrors++;
      await failScrapeRun(runId, err instanceof Error ? err.message : String(err));
    }
  }

  // Scrape GitHub sources
  console.log(`\n🐙 Scraping ${githubSources.length} GitHub sources...`);
  for (const source of githubSources) {
    const runId = await startScrapeRun(source.id);
    try {
      const result = await scrapeSource(source);
      totalFound += result.entriesFound;
      totalNew += result.entriesNew;
      if (result.error) totalErrors++;
      await completeScrapeRun(runId, result);
    } catch (err) {
      totalErrors++;
      await failScrapeRun(runId, err instanceof Error ? err.message : String(err));
    }
  }

  // Scrape Playwright sources (sequential to avoid resource issues)
  console.log(`\n🎭 Scraping ${playwrightSources.length} Playwright sources...`);
  const playwrightScraper = new PlaywrightScraper();
  try {
    for (const source of playwrightSources) {
      const runId = await startScrapeRun(source.id);
      try {
        const result = await scrapeSource(source);
        totalFound += result.entriesFound;
        totalNew += result.entriesNew;
        if (result.error) totalErrors++;
        await completeScrapeRun(runId, result);
      } catch (err) {
        totalErrors++;
        await failScrapeRun(runId, err instanceof Error ? err.message : String(err));
      }
    }
  } finally {
    await playwrightScraper.close();
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 Scrape Summary");
  console.log("=".repeat(50));
  console.log(`Sources scraped: ${sources.length}`);
  console.log(`Entries found: ${totalFound}`);
  console.log(`New entries: ${totalNew}`);
  console.log(`Errors: ${totalErrors}`);
  console.log("=".repeat(50));
}

/**
 * Start a scrape run record
 */
async function startScrapeRun(sourceId: number): Promise<number> {
  const [run] = await db
    .insert(schema.scrapeRuns)
    .values({
      sourceId,
      status: "running",
    })
    .returning({ id: schema.scrapeRuns.id });

  return run.id;
}

/**
 * Complete a scrape run
 */
async function completeScrapeRun(
  runId: number,
  result: { entriesFound: number; entriesNew: number; error?: string }
): Promise<void> {
  await db
    .update(schema.scrapeRuns)
    .set({
      status: result.error ? "failed" : "success",
      entriesFound: result.entriesFound,
      entriesNew: result.entriesNew,
      errorMessage: result.error,
      endedAt: new Date(),
    })
    .where(eq(schema.scrapeRuns.id, runId));
}

/**
 * Mark a scrape run as failed
 */
async function failScrapeRun(runId: number, error: string): Promise<void> {
  await db
    .update(schema.scrapeRuns)
    .set({
      status: "failed",
      errorMessage: error,
      endedAt: new Date(),
    })
    .where(eq(schema.scrapeRuns.id, runId));
}

// Run if executed directly
runFullScrape()
  .then(() => {
    console.log("\n✅ Scrape complete!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Scrape failed:", err);
    process.exit(1);
  });
