import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { like, eq } from "drizzle-orm";
import { sources, products, providers } from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function checkUrls() {
  console.log("Checking source URLs in database...\n");

  // Check zero-entry static sources
  const zeroEntrySources = [
    "%docs.anthropic%",
    "%platform.claude%",
    "%tabnine%",
    "%continue%",
    "%stability%",
    "%perplexity%",
    "%ai21%",
    "%aider%",
    "%geminicli%",
    "%gemini.google%",
    "%amazon%",
    "%huggingface%",
    "%meta.com%",
    "%x.ai%",
    "%docs.x.ai%",
    "%cloud.google%",
  ];

  for (const pattern of zeroEntrySources) {
    const matches = await db
      .select({
        url: sources.url,
        method: sources.scrapeMethod,
        isActive: sources.isActive,
        config: sources.selectorConfig,
        product: products.name,
        provider: providers.name,
      })
      .from(sources)
      .leftJoin(products, eq(sources.productId, products.id))
      .leftJoin(providers, eq(products.providerId, providers.id))
      .where(like(sources.url, pattern));

    if (matches.length > 0) {
      console.log(`Pattern: ${pattern}`);
      for (const m of matches) {
        console.log(`  [${m.isActive ? "ACTIVE" : "DISABLED"}] ${m.url}`);
        console.log(`    Method: ${m.method} | Provider: ${m.provider} | Product: ${m.product}`);
        console.log(`    Config: ${JSON.stringify(m.config)}`);
        console.log();
      }
    }
  }
}

checkUrls()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
