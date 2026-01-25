import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { sources } from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

/**
 * Fix failing source configurations based on actual HTML structure analysis
 */

interface SourceFix {
  url: string;
  scrapeMethod?: "static" | "github_api" | "playwright";
  selectorConfig?: Record<string, unknown>;
  isActive?: boolean;
  reason: string;
}

const sourceFixes: SourceFix[] = [
  // =============================================================================
  // NEEDS PLAYWRIGHT (Next.js / React sites that require JS rendering)
  // =============================================================================
  {
    url: "https://docs.anthropic.com/en/release-notes/overview",
    scrapeMethod: "playwright",
    selectorConfig: {
      waitForSelector: "main",
      entrySelector: "h2",
      dateSelector: "h2",
      siblingContentSelector: "ul, p",
    },
    reason: "Next.js site requires JS rendering",
  },
  {
    url: "https://docs.anthropic.com/en/release-notes/claude-apps",
    scrapeMethod: "playwright",
    selectorConfig: {
      waitForSelector: "main",
      entrySelector: "h2",
      dateSelector: "h2",
      siblingContentSelector: "ul, p",
    },
    reason: "Next.js site requires JS rendering",
  },
  {
    url: "https://gemini.google/release-notes/",
    scrapeMethod: "playwright",
    selectorConfig: {
      waitForSelector: "main",
      entrySelector: "section, article",
      dateSelector: "time, h2",
      contentSelector: "p, ul li",
    },
    reason: "Google site may require JS rendering",
  },
  {
    url: "https://changelog.continue.dev/",
    scrapeMethod: "playwright",
    selectorConfig: {
      waitForSelector: "main",
      entrySelector: "article",
      dateSelector: "time",
      titleSelector: "h2, h3",
      contentSelector: "p, ul li",
    },
    reason: "React site requires JS rendering",
  },

  // =============================================================================
  // STATIC SCRAPER FIXES (proper selectors based on actual HTML structure)
  // =============================================================================
  {
    url: "https://aider.chat/HISTORY.html",
    selectorConfig: {
      // Aider uses h3#aider-v[version] for entries with sibling <ul> content
      entrySelector: "h3[id^='aider-v']",
      dateSelector: "h3",
      siblingContentSelector: "ul",
    },
    reason: "Fixed selectors for Just the Docs theme",
  },
  {
    url: "https://docs.perplexity.ai/changelog/changelog",
    selectorConfig: {
      // Perplexity uses h2 for monthly sections with sibling content
      entrySelector: "h2",
      dateSelector: "h2",
      siblingContentSelector: "ul, p",
    },
    reason: "Fixed selectors for Mintlify-style docs",
  },
  {
    url: "https://docs.ai21.com/changelog",
    selectorConfig: {
      // AI21 uses Readme.io style docs
      entrySelector: "h2, h3",
      dateSelector: "h2",
      siblingContentSelector: "ul, p",
    },
    reason: "Fixed selectors for Readme.io docs",
  },
  {
    url: "https://docs.tabnine.com/main/administering-tabnine/release-notes",
    selectorConfig: {
      // Tabnine uses GitBook/Mintlify style
      entrySelector: "h2",
      dateSelector: "h2",
      siblingContentSelector: "ul, p",
    },
    reason: "Fixed selectors for Mintlify-style docs",
  },
  {
    url: "https://platform.stability.ai/docs/release-notes",
    selectorConfig: {
      entrySelector: "h2",
      dateSelector: "h2",
      siblingContentSelector: "ul, p",
    },
    reason: "Fixed selectors for docs site",
  },
  {
    url: "https://geminicli.com/docs/changelogs/",
    selectorConfig: {
      entrySelector: "h2",
      dateSelector: "h2",
      siblingContentSelector: "ul, p",
    },
    reason: "Fixed selectors for changelog format",
  },

  // =============================================================================
  // GOOGLE CLOUD SOURCES (need specific selectors)
  // =============================================================================
  {
    url: "https://docs.cloud.google.com/vertex-ai/generative-ai/docs/release-notes",
    selectorConfig: {
      // Google Cloud docs use h2 for dates with nested content
      entrySelector: "h2",
      dateSelector: "h2",
      siblingContentSelector: "ul, p, table",
    },
    reason: "Fixed selectors for Google Cloud docs",
  },
  {
    url: "https://docs.cloud.google.com/gemini/docs/release-notes",
    selectorConfig: {
      entrySelector: "h2",
      dateSelector: "h2",
      siblingContentSelector: "ul, p, table",
    },
    reason: "Fixed selectors for Google Cloud docs",
  },
  {
    url: "https://docs.cloud.google.com/gemini/enterprise/docs/release-notes",
    selectorConfig: {
      entrySelector: "h2",
      dateSelector: "h2",
      siblingContentSelector: "ul, p, table",
    },
    reason: "Fixed selectors for Google Cloud docs",
  },

  // =============================================================================
  // XAI / DOCS.X.AI
  // =============================================================================
  {
    url: "https://docs.x.ai/docs/release-notes",
    selectorConfig: {
      // xAI docs structure
      entrySelector: "h2, h3",
      dateSelector: "h2",
      siblingContentSelector: "ul, p",
    },
    reason: "Fixed selectors for xAI docs",
  },
  {
    url: "https://x.ai/news",
    selectorConfig: {
      // News page with article cards
      entrySelector: "a[href*='/news/']",
      dateSelector: "time, span",
      titleSelector: "h2, h3",
      linkSelector: "a[href*='/news/']",
      contentSelector: "p",
    },
    reason: "Fixed selectors for news listing",
  },

  // =============================================================================
  // META / HUGGINGFACE
  // =============================================================================
  {
    url: "https://ai.meta.com/blog/",
    selectorConfig: {
      // Meta AI blog has card-style entries
      entrySelector: "a[href*='/blog/']",
      dateSelector: "time, span",
      titleSelector: "h2, h3",
      linkSelector: "a[href*='/blog/']",
      contentSelector: "p",
    },
    reason: "Fixed selectors for blog listing",
  },
  {
    url: "https://huggingface.co/meta-llama",
    scrapeMethod: "playwright", // HuggingFace is a React app
    selectorConfig: {
      waitForSelector: "main",
      entrySelector: "article, a[href*='/meta-llama/']",
      dateSelector: "time",
      titleSelector: "h4, h3",
      linkSelector: "a[href*='/meta-llama/']",
      contentSelector: "p",
    },
    reason: "HuggingFace React app requires Playwright",
  },

  // =============================================================================
  // AMAZON
  // =============================================================================
  {
    url: "https://aws.amazon.com/developer/generative-ai/amazon-q/change-log/",
    selectorConfig: {
      // AWS marketing pages structure
      entrySelector: "article, section, div[class*='change']",
      dateSelector: "time, h3, span",
      contentSelector: "p, ul li",
    },
    reason: "Fixed selectors for AWS marketing pages",
  },
];

async function fixFailingSources() {
  console.log("🔧 Fixing failing source configurations...\n");
  console.log("=".repeat(80));

  let fixed = 0;
  let notFound = 0;
  let errors = 0;

  for (const fix of sourceFixes) {
    try {
      const updateValues: Partial<typeof sources.$inferInsert> = {};

      if (fix.selectorConfig !== undefined) {
        updateValues.selectorConfig = fix.selectorConfig;
      }
      if (fix.scrapeMethod !== undefined) {
        updateValues.scrapeMethod = fix.scrapeMethod;
      }
      if (fix.isActive !== undefined) {
        updateValues.isActive = fix.isActive;
      }

      if (Object.keys(updateValues).length === 0) {
        continue;
      }

      const result = await db
        .update(sources)
        .set(updateValues)
        .where(eq(sources.url, fix.url))
        .returning({ id: sources.id, url: sources.url });

      if (result.length > 0) {
        const method = fix.scrapeMethod ? ` -> ${fix.scrapeMethod}` : "";
        console.log(`✓ [FIXED${method}] ${fix.url}`);
        console.log(`  Reason: ${fix.reason}`);
        console.log();
        fixed++;
      } else {
        console.log(`⚠ [NOT FOUND] ${fix.url}`);
        notFound++;
      }
    } catch (error) {
      console.error(`✗ [ERROR] ${fix.url}: ${error}`);
      errors++;
    }
  }

  console.log("=".repeat(80));
  console.log("\n📊 Summary:");
  console.log(`   Fixed:     ${fixed}`);
  console.log(`   Not found: ${notFound}`);
  console.log(`   Errors:    ${errors}`);
}

fixFailingSources()
  .then(() => {
    console.log("\n✅ Fix complete!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Fix failed:", err);
    process.exit(1);
  });
