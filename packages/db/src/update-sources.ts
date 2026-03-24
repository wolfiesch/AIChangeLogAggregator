import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and } from "drizzle-orm";
import { sources, products, providers } from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

/**
 * Update existing sources with new selectorConfig and isActive values
 * This script allows updating sources without recreating them
 */

interface SourceUpdate {
  url: string;
  selectorConfig?: Record<string, unknown>;
  isActive?: boolean;
  scrapeMethod?: "static" | "github_api" | "playwright";
}

const sourceUpdates: SourceUpdate[] = [
  // ==================== OpenAI ====================
  {
    url: "https://developers.openai.com/changelog/",
    selectorConfig: {
      entrySelector: "ul > li",
      titleSelector: "strong, b",
      contentSelector: "li",
    },
  },
  {
    url: "https://developers.openai.com/codex/changelog/",
    selectorConfig: {
      // Codex changelog: general announcements only (GPT-5.4 mini, etc.)
      // CLI releases come from GitHub API, App releases from separate source
      entrySelector: "li[data-codex-topics='general']",
      dateSelector: "time",
      titleSelector: "h3 > span:first-child",
      contentSelector: "article",
    },
  },

  // ==================== Google ====================
  // Note: <ul> elements are siblings of <h2>, not children, so we use siblingContentSelector
  {
    url: "https://ai.google.dev/gemini-api/docs/changelog",
    selectorConfig: {
      entrySelector: "h2",
      dateSelector: "h2",
      titleSelector: "h2",
      siblingContentSelector: "ul",
    },
  },

  // ==================== Cohere (disabled - 404) ====================
  {
    url: "https://docs.cohere.com/changelog",
    isActive: false,
  },
  {
    url: "https://docs.cohere.com/docs/deprecations",
    isActive: false,
  },

  // ==================== DeepSeek ====================
  {
    url: "https://api-docs.deepseek.com/updates",
    selectorConfig: {
      entrySelector: "h2[id^='date-']",
      dateSelector: "h2",
      titleSelector: "h3",
      contentSelector: "ul li, p",
    },
  },
  {
    url: "https://api-docs.deepseek.com/news/",
    isActive: false, // 404 Not Found
  },

  // ==================== Perplexity ====================
  {
    url: "https://www.perplexity.ai/changelog",
    isActive: false, // 403 Forbidden - bot detection
  },
  {
    url: "https://docs.perplexity.ai/changelog/changelog",
    selectorConfig: {
      entrySelector: "h2",
      dateSelector: "h2",
      titleSelector: "strong, b",
      contentSelector: "ul li, p",
    },
  },

  // ==================== Cursor ====================
  {
    url: "https://cursor.com/changelog",
    selectorConfig: {
      entrySelector: "article",
      dateSelector: "time[dateTime]",
      titleSelector: "h1",
      contentSelector: "div.prose, div[class*='prose']",
    },
  },

  // ==================== Windsurf (Next.js - requires playwright) ====================
  // Note: <ul> elements are siblings of <h2>, not children, so we use siblingContentSelector
  {
    url: "https://windsurf.com/changelog",
    scrapeMethod: "playwright",
    selectorConfig: {
      waitForSelector: "main h2",
      entrySelector: "h2",
      dateSelector: "h2",
      titleSelector: "h2",
      siblingContentSelector: "ul",
    },
  },
  {
    url: "https://windsurf.com/changelog/jetbrains",
    scrapeMethod: "playwright",
    selectorConfig: {
      waitForSelector: "main h2",
      entrySelector: "h2",
      dateSelector: "h2",
      titleSelector: "h2",
      siblingContentSelector: "ul",
    },
  },
  {
    url: "https://windsurf.com/changelog/vscode",
    scrapeMethod: "playwright",
    selectorConfig: {
      waitForSelector: "main h2",
      entrySelector: "h2",
      dateSelector: "h2",
      titleSelector: "h2",
      siblingContentSelector: "ul",
    },
  },
  {
    url: "https://windsurf.com/changelog/windsurf-next",
    scrapeMethod: "playwright",
    selectorConfig: {
      waitForSelector: "main h2",
      entrySelector: "h2",
      dateSelector: "h2",
      titleSelector: "h2",
      siblingContentSelector: "ul",
    },
  },
  {
    url: "https://windsurf.com/changelog/jetbrains-prerelease",
    scrapeMethod: "playwright",
    selectorConfig: {
      waitForSelector: "main h2",
      entrySelector: "h2",
      dateSelector: "h2",
      titleSelector: "h2",
      siblingContentSelector: "ul",
    },
  },

  // ==================== Mistral ====================
  {
    url: "https://docs.mistral.ai/getting-started/changelog",
    selectorConfig: {
      entrySelector: "div.changelog-content, section",
      dateSelector: "h2, h3",
      titleSelector: "h3",
      contentSelector: "ul li, p",
    },
  },

  // ==================== Together AI ====================
  {
    url: "https://docs.together.ai/docs/changelog",
    selectorConfig: {
      entrySelector: "h2",
      dateSelector: "h2",
      titleSelector: "strong, b",
      contentSelector: "ul li, p",
    },
  },

  // ==================== Replicate ====================
  {
    url: "https://replicate.com/changelog",
    selectorConfig: {
      entrySelector: "a[href^='/changelog/']",
      dateSelector: "time, p",
      titleSelector: "h2, h3, strong",
      linkSelector: "a[href^='/changelog/']",
      contentSelector: "p",
    },
  },

  // ==================== Groq ====================
  {
    url: "https://console.groq.com/docs/changelog",
    selectorConfig: {
      entrySelector: "h3",
      dateSelector: "h3",
      titleSelector: "h3",
      contentSelector: "ul li, p",
    },
  },
];

async function updateSources() {
  console.log("🔄 Updating existing sources...\n");

  let updated = 0;
  let notFound = 0;
  let errors = 0;

  for (const update of sourceUpdates) {
    try {
      // Build the update object
      const updateValues: Partial<typeof sources.$inferInsert> = {};

      if (update.selectorConfig !== undefined) {
        updateValues.selectorConfig = update.selectorConfig;
      }
      if (update.isActive !== undefined) {
        updateValues.isActive = update.isActive;
      }
      if (update.scrapeMethod !== undefined) {
        updateValues.scrapeMethod = update.scrapeMethod;
      }

      // Skip if nothing to update
      if (Object.keys(updateValues).length === 0) {
        continue;
      }

      const result = await db
        .update(sources)
        .set(updateValues)
        .where(eq(sources.url, update.url))
        .returning({ id: sources.id, url: sources.url });

      if (result.length > 0) {
        const status = update.isActive === false ? "DISABLED" : "UPDATED";
        console.log(`  ✓ [${status}] ${update.url}`);
        updated++;
      } else {
        console.log(`  ⚠ [NOT FOUND] ${update.url}`);
        notFound++;
      }
    } catch (error) {
      console.error(`  ✗ [ERROR] ${update.url}: ${error}`);
      errors++;
    }
  }

  console.log("\n📊 Summary:");
  console.log(`   Updated:   ${updated}`);
  console.log(`   Not found: ${notFound}`);
  console.log(`   Errors:    ${errors}`);
}

async function updateCodexProducts() {
  console.log("\n🔄 Updating Codex products...\n");

  // Update existing "Codex" product to be CLI-specific
  const updateResult = await db
    .update(products)
    .set({
      name: "Codex CLI",
      type: "cli",
      description: "OpenAI Codex CLI coding agent",
    })
    .where(eq(products.slug, "openai-codex"))
    .returning({ id: products.id, slug: products.slug });

  if (updateResult.length > 0) {
    console.log(`  ✓ [UPDATED] openai-codex → "Codex CLI" (type: cli)`);
  }

  // Check if Codex App product already exists
  const existing = await db
    .select()
    .from(products)
    .where(eq(products.slug, "openai-codex-app"));

  if (existing.length > 0) {
    console.log(`  ✓ [EXISTS] openai-codex-app already in DB (id: ${existing[0].id})`);
    return existing[0].id;
  }

  // Get OpenAI provider ID
  const openaiProvider = await db
    .select()
    .from(providers)
    .where(eq(providers.slug, "openai"));

  if (openaiProvider.length === 0) {
    console.log(`  ✗ [ERROR] OpenAI provider not found`);
    return null;
  }

  // Insert new Codex App product
  const [newProduct] = await db
    .insert(products)
    .values({
      providerId: openaiProvider[0].id,
      name: "Codex App",
      slug: "openai-codex-app",
      type: "desktop",
      description: "OpenAI Codex desktop application",
    })
    .returning({ id: products.id, slug: products.slug });

  console.log(`  ✓ [INSERTED] openai-codex-app (id: ${newProduct.id})`);
  return newProduct.id;
}

async function addCodexAppSource(productId: number) {
  console.log("\n🔄 Adding Codex App source...\n");

  // Check if source already exists
  const existingSources = await db
    .select()
    .from(sources)
    .where(
      and(
        eq(sources.productId, productId),
        eq(sources.url, "https://developers.openai.com/codex/changelog/")
      )
    );

  if (existingSources.length > 0) {
    // Update existing source's selector config
    await db
      .update(sources)
      .set({
        selectorConfig: {
          entrySelector: "li[data-codex-topics='codex-app']",
          dateSelector: "time",
          titleSelector: "h3 > span:first-child",
          contentSelector: "article",
        },
      })
      .where(eq(sources.id, existingSources[0].id));
    console.log(`  ✓ [UPDATED] Codex App source selector config`);
    return;
  }

  // Insert new source
  await db.insert(sources).values({
    productId,
    url: "https://developers.openai.com/codex/changelog/",
    scrapeMethod: "static",
    selectorConfig: {
      entrySelector: "li[data-codex-topics='codex-app']",
      dateSelector: "time",
      titleSelector: "h3 > span:first-child",
      contentSelector: "article",
    },
    isActive: true,
  });

  console.log(`  ✓ [INSERTED] Codex App source (static scraper)`);
}

async function main() {
  const codexAppProductId = await updateCodexProducts();
  if (codexAppProductId) {
    await addCodexAppSource(codexAppProductId);
  }
  await updateSources();
}

main()
  .then(() => {
    console.log("\n✅ Update complete!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Update failed:", err);
    process.exit(1);
  });
