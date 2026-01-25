#!/usr/bin/env npx tsx
/**
 * Test individual scrapers without touching the database.
 *
 * Usage:
 *   pnpm test:scraper static https://aider.chat/HISTORY.html
 *   pnpm test:scraper playwright https://docs.anthropic.com/en/release-notes/overview
 *   pnpm test:scraper stealth https://docs.anthropic.com/en/release-notes/overview
 *   pnpm test:scraper github https://github.com/anthropics/claude-code/releases
 *
 * With custom selector config (JSON):
 *   pnpm test:scraper playwright URL '{"waitForSelector":"h3","entrySelector":"h3","siblingContentSelector":"ul"}'
 */

import { StaticScraper } from "../scrapers/static.js";
import { PlaywrightScraper } from "../scrapers/playwright.js";
import { StealthScraper } from "../scrapers/stealth.js";
import { GitHubScraper } from "../scrapers/github.js";
import type { Source } from "../db/schema.js";

const SCRAPERS = {
  static: () => new StaticScraper(),
  playwright: () => new PlaywrightScraper(),
  stealth: () => new StealthScraper(),
  github: () => new GitHubScraper(),
} as const;

type ScraperType = keyof typeof SCRAPERS;

async function testScraper(
  scraperType: ScraperType,
  url: string,
  selectorConfig?: Record<string, unknown>
) {
  console.log(`\n🧪 Testing ${scraperType} scraper`);
  console.log(`   URL: ${url}`);
  if (selectorConfig) {
    console.log(`   Config: ${JSON.stringify(selectorConfig, null, 2)}`);
  }
  console.log("─".repeat(60));

  // Create a mock source object
  const mockSource: Source = {
    id: 0,
    productId: 0,
    url,
    scrapeMethod: scraperType === "github" ? "github_api" : scraperType === "stealth" ? "playwright" : scraperType,
    selectorConfig: selectorConfig || null,
    isActive: true,
    createdAt: new Date(),
    lastScrapedAt: null,
  };

  const scraperFactory = SCRAPERS[scraperType];
  if (!scraperFactory) {
    console.error(`❌ Unknown scraper type: ${scraperType}`);
    console.log(`   Available: ${Object.keys(SCRAPERS).join(", ")}`);
    process.exit(1);
  }

  const scraper = scraperFactory();
  const startTime = Date.now();

  try {
    const result = await scraper.scrape(mockSource);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!result.success) {
      console.log(`\n❌ Scrape failed (${elapsed}s)`);
      console.log(`   Error: ${result.error}`);
      return;
    }

    console.log(`\n✅ Scrape succeeded (${elapsed}s)`);
    console.log(`   Entries found: ${result.entries.length}`);
    console.log("─".repeat(60));

    // Show first 5 entries
    const entriesToShow = result.entries.slice(0, 5);
    entriesToShow.forEach((entry, i) => {
      console.log(`\n📄 Entry ${i + 1}:`);
      if (entry.publishedDate) {
        console.log(`   Date: ${entry.publishedDate.toISOString().split("T")[0]}`);
      }
      if (entry.title) {
        console.log(`   Title: ${entry.title.substring(0, 80)}${entry.title.length > 80 ? "..." : ""}`);
      }
      if (entry.url) {
        console.log(`   URL: ${entry.url}`);
      }
      // Show content preview
      const contentPreview = entry.content.substring(0, 200).replace(/\s+/g, " ");
      console.log(`   Content: ${contentPreview}${entry.content.length > 200 ? "..." : ""}`);
    });

    if (result.entries.length > 5) {
      console.log(`\n   ... and ${result.entries.length - 5} more entries`);
    }

    // Clean up browser if needed
    if ("close" in scraper && typeof scraper.close === "function") {
      await scraper.close();
    }
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n❌ Scrape threw error (${elapsed}s)`);
    console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);

    // Clean up browser if needed
    if ("close" in scraper && typeof scraper.close === "function") {
      await scraper.close();
    }
    process.exit(1);
  }
}

// Parse CLI arguments
const [, , scraperType, url, configJson] = process.argv;

if (!scraperType || !url) {
  console.log(`
Usage: pnpm test:scraper <type> <url> [selectorConfig]

Types:
  static      - Cheerio-based HTML scraper
  playwright  - Playwright browser scraper
  stealth     - Puppeteer stealth scraper (for bot detection)
  github      - GitHub API scraper

Examples:
  pnpm test:scraper static https://aider.chat/HISTORY.html
  pnpm test:scraper stealth https://docs.anthropic.com/en/release-notes/overview
  pnpm test:scraper stealth https://docs.anthropic.com/en/release-notes/overview '{"waitForSelector":"h3","entrySelector":"h3","dateSelector":"h3","siblingContentSelector":"ul"}'
`);
  process.exit(1);
}

let selectorConfig: Record<string, unknown> | undefined;
if (configJson) {
  try {
    selectorConfig = JSON.parse(configJson);
  } catch {
    console.error(`❌ Invalid JSON for selectorConfig: ${configJson}`);
    process.exit(1);
  }
}

testScraper(scraperType as ScraperType, url, selectorConfig)
  .then(() => {
    console.log("\n✅ Test complete!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Test failed:", err);
    process.exit(1);
  });
