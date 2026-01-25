import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// URLs to disable (Intercom bot detection + Grok bot detection)
const urlsToDisable = [
  "https://help.openai.com/en/articles/6825453-chatgpt-release-notes",
  "https://help.openai.com/en/articles/9703738-chatgpt-macos-app-release-notes",
  "https://help.openai.com/en/articles/10003026-windows-app-release-notes",
  "https://help.openai.com/en/articles/10128477-chatgpt-enterprise-edu-release-notes",
  "https://help.openai.com/en/articles/9624314-model-release-notes",
  "https://grok.com/changelog",
];

// URL to also disable (GitHub API returns 404 - can't delete due to FK constraints)
const sourcegraphUrl = "https://github.com/sourcegraph/cody/releases";

async function disableSources() {
  console.log("Disabling problematic sources...\n");

  // Disable all problematic sources
  const allUrls = [...urlsToDisable, sourcegraphUrl];

  for (const url of allUrls) {
    const result = await sql`
      UPDATE sources
      SET is_active = false
      WHERE url = ${url}
      RETURNING id, url
    `;
    if (result.length > 0) {
      console.log(`✓ Disabled: ${url}`);
    } else {
      console.log(`- Not found: ${url}`);
    }
  }

  console.log("\nDone!");
}

disableSources()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  });
