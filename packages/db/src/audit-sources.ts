import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, desc, sql as sqlFn, and, gt } from "drizzle-orm";
import { sources, scrapeRuns, products, providers } from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

/**
 * Audit sources to find those that are failing (returning 0 entries)
 * or have errors in recent scrape runs
 */

async function auditSources() {
  console.log("📊 Auditing AI Changelog Sources\n");
  console.log("=".repeat(80));

  // Get recent scrape results for active sources
  const recentRuns = await db
    .select({
      sourceId: sources.id,
      url: sources.url,
      scrapeMethod: sources.scrapeMethod,
      isActive: sources.isActive,
      productName: products.name,
      providerName: providers.name,
      runId: scrapeRuns.id,
      status: scrapeRuns.status,
      entriesFound: scrapeRuns.entriesFound,
      entriesNew: scrapeRuns.entriesNew,
      error: scrapeRuns.errorMessage,
      startedAt: scrapeRuns.startedAt,
    })
    .from(sources)
    .leftJoin(products, eq(sources.productId, products.id))
    .leftJoin(providers, eq(products.providerId, providers.id))
    .leftJoin(
      scrapeRuns,
      and(
        eq(scrapeRuns.sourceId, sources.id),
        gt(scrapeRuns.startedAt, sqlFn`NOW() - INTERVAL '48 hours'`)
      )
    )
    .where(eq(sources.isActive, true))
    .orderBy(desc(scrapeRuns.startedAt));

  // Group by source, keeping only latest run
  const sourceMap = new Map<
    number,
    {
      url: string;
      scrapeMethod: string;
      provider: string;
      product: string;
      entriesFound: number | null;
      error: string | null;
      status: string | null;
    }
  >();

  for (const run of recentRuns) {
    if (!sourceMap.has(run.sourceId)) {
      sourceMap.set(run.sourceId, {
        url: run.url,
        scrapeMethod: run.scrapeMethod,
        provider: run.providerName || "Unknown",
        product: run.productName || "Unknown",
        entriesFound: run.entriesFound,
        error: run.error,
        status: run.status,
      });
    }
  }

  // Categorize sources
  const failing: typeof recentRuns = [];
  const zeroEntries: typeof recentRuns = [];
  const working: typeof recentRuns = [];
  const noRecentRun: typeof recentRuns = [];

  for (const [sourceId, data] of sourceMap) {
    if (data.status === null) {
      noRecentRun.push({ ...data, sourceId } as unknown as (typeof recentRuns)[0]);
    } else if (data.error) {
      failing.push({ ...data, sourceId } as unknown as (typeof recentRuns)[0]);
    } else if (data.entriesFound === 0) {
      zeroEntries.push({ ...data, sourceId } as unknown as (typeof recentRuns)[0]);
    } else {
      working.push({ ...data, sourceId } as unknown as (typeof recentRuns)[0]);
    }
  }

  // Report failing sources (with errors)
  console.log("\n🔴 FAILING SOURCES (with errors):");
  console.log("-".repeat(80));
  if (failing.length === 0) {
    console.log("  None! ✅");
  } else {
    for (const s of failing) {
      const data = sourceMap.get((s as { sourceId: number }).sourceId)!;
      console.log(`  [${data.scrapeMethod}] ${data.url}`);
      console.log(`      Provider: ${data.provider} | Product: ${data.product}`);
      console.log(`      Error: ${data.error}`);
      console.log();
    }
  }

  // Report zero-entry sources
  console.log("\n🟡 ZERO ENTRIES (no errors, but 0 results):");
  console.log("-".repeat(80));
  if (zeroEntries.length === 0) {
    console.log("  None! ✅");
  } else {
    for (const s of zeroEntries) {
      const data = sourceMap.get((s as { sourceId: number }).sourceId)!;
      console.log(`  [${data.scrapeMethod}] ${data.url}`);
      console.log(`      Provider: ${data.provider} | Product: ${data.product}`);
      console.log();
    }
  }

  // Report no recent runs
  console.log("\n⚪ NO RECENT SCRAPE RUN (in last 48h):");
  console.log("-".repeat(80));
  if (noRecentRun.length === 0) {
    console.log("  None! ✅");
  } else {
    for (const s of noRecentRun) {
      const data = sourceMap.get((s as { sourceId: number }).sourceId)!;
      console.log(`  [${data.scrapeMethod}] ${data.url}`);
      console.log();
    }
  }

  // Summary by scrape method
  console.log("\n📈 SUMMARY BY METHOD:");
  console.log("-".repeat(80));

  const methods = ["static", "github_api", "playwright"];
  for (const method of methods) {
    const total = [...sourceMap.values()].filter((s) => s.scrapeMethod === method).length;
    const workingCount = working.filter(
      (s) => sourceMap.get((s as { sourceId: number }).sourceId)?.scrapeMethod === method
    ).length;
    const failingCount = failing.filter(
      (s) => sourceMap.get((s as { sourceId: number }).sourceId)?.scrapeMethod === method
    ).length;
    const zeroCount = zeroEntries.filter(
      (s) => sourceMap.get((s as { sourceId: number }).sourceId)?.scrapeMethod === method
    ).length;

    console.log(`  ${method.padEnd(12)} | Total: ${total} | Working: ${workingCount} | Zero: ${zeroCount} | Failed: ${failingCount}`);
  }

  console.log("\n" + "=".repeat(80));
  console.log(`Total active sources: ${sourceMap.size}`);
  console.log(`Working: ${working.length} | Zero entries: ${zeroEntries.length} | Failed: ${failing.length} | No recent run: ${noRecentRun.length}`);
}

auditSources()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Audit failed:", err);
    process.exit(1);
  });
