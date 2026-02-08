import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { providers, products, sources } from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// ============================================================================
// Seed Data: All AI Providers, Products, and Changelog Sources
// ============================================================================

interface SeedProvider {
  name: string;
  slug: string;
  logoUrl?: string;
  websiteUrl: string;
}

interface SeedProduct {
  providerSlug: string;
  name: string;
  slug: string;
  type: string;
  description?: string;
}

interface SeedSource {
  productSlug: string;
  url: string;
  scrapeMethod: "static" | "github_api" | "playwright";
  selectorConfig?: Record<string, unknown>;
  isActive?: boolean; // Defaults to true; set false to disable problematic sources
}

const seedProviders: SeedProvider[] = [
  {
    name: "OpenAI",
    slug: "openai",
    websiteUrl: "https://openai.com",
  },
  {
    name: "Anthropic",
    slug: "anthropic",
    websiteUrl: "https://anthropic.com",
  },
  {
    name: "Google",
    slug: "google",
    websiteUrl: "https://ai.google.dev",
  },
  {
    name: "xAI",
    slug: "xai",
    websiteUrl: "https://x.ai",
  },
  {
    name: "Mistral AI",
    slug: "mistral",
    websiteUrl: "https://mistral.ai",
  },
  {
    name: "Cohere",
    slug: "cohere",
    websiteUrl: "https://cohere.com",
  },
  {
    name: "Meta",
    slug: "meta",
    websiteUrl: "https://ai.meta.com",
  },
  {
    name: "DeepSeek",
    slug: "deepseek",
    websiteUrl: "https://deepseek.com",
  },
  {
    name: "Perplexity",
    slug: "perplexity",
    websiteUrl: "https://perplexity.ai",
  },
  {
    name: "Amazon",
    slug: "amazon",
    websiteUrl: "https://aws.amazon.com/bedrock",
  },
  {
    name: "Groq",
    slug: "groq",
    websiteUrl: "https://groq.com",
  },
  {
    name: "Together AI",
    slug: "together",
    websiteUrl: "https://together.ai",
  },
  {
    name: "Replicate",
    slug: "replicate",
    websiteUrl: "https://replicate.com",
  },
  {
    name: "AI21 Labs",
    slug: "ai21",
    websiteUrl: "https://ai21.com",
  },
  {
    name: "Stability AI",
    slug: "stability",
    websiteUrl: "https://stability.ai",
  },
  {
    name: "Cursor",
    slug: "cursor",
    websiteUrl: "https://cursor.com",
  },
  {
    name: "Windsurf",
    slug: "windsurf",
    websiteUrl: "https://windsurf.com",
  },
  {
    name: "Aider",
    slug: "aider",
    websiteUrl: "https://aider.chat",
  },
  {
    name: "GitHub",
    slug: "github",
    websiteUrl: "https://github.com",
  },
  {
    name: "Continue.dev",
    slug: "continue",
    websiteUrl: "https://continue.dev",
  },
  {
    name: "Tabnine",
    slug: "tabnine",
    websiteUrl: "https://tabnine.com",
  },
  {
    name: "Sourcegraph",
    slug: "sourcegraph",
    websiteUrl: "https://sourcegraph.com",
  },
];

const seedProducts: SeedProduct[] = [
  // ==================== OpenAI ====================
  {
    providerSlug: "openai",
    name: "OpenAI API",
    slug: "openai-api",
    type: "api",
    description: "OpenAI Developer Platform API",
  },
  {
    providerSlug: "openai",
    name: "Codex",
    slug: "openai-codex",
    type: "desktop",
    description: "OpenAI Codex CLI and desktop application",
  },
  {
    providerSlug: "openai",
    name: "ChatGPT",
    slug: "chatgpt",
    type: "chat",
    description: "ChatGPT web application",
  },
  {
    providerSlug: "openai",
    name: "ChatGPT macOS",
    slug: "chatgpt-macos",
    type: "desktop",
    description: "ChatGPT desktop app for macOS",
  },
  {
    providerSlug: "openai",
    name: "ChatGPT Windows",
    slug: "chatgpt-windows",
    type: "desktop",
    description: "ChatGPT desktop app for Windows",
  },
  {
    providerSlug: "openai",
    name: "ChatGPT Enterprise/Edu",
    slug: "chatgpt-enterprise",
    type: "chat",
    description: "ChatGPT for Enterprise and Education",
  },
  {
    providerSlug: "openai",
    name: "OpenAI Models",
    slug: "openai-models",
    type: "api",
    description: "OpenAI model releases",
  },

  // ==================== Anthropic ====================
  {
    providerSlug: "anthropic",
    name: "Claude API",
    slug: "claude-api",
    type: "api",
    description: "Claude Developer Platform",
  },
  {
    providerSlug: "anthropic",
    name: "Claude Code",
    slug: "claude-code",
    type: "cli",
    description: "Claude Code CLI tool",
  },
  {
    providerSlug: "anthropic",
    name: "Claude Apps",
    slug: "claude-apps",
    type: "chat",
    description: "Claude web and mobile applications",
  },

  // ==================== Google ====================
  {
    providerSlug: "google",
    name: "Gemini API",
    slug: "gemini-api",
    type: "api",
    description: "Gemini API for developers",
  },
  {
    providerSlug: "google",
    name: "Gemini Apps",
    slug: "gemini-apps",
    type: "chat",
    description: "Gemini web application",
  },
  {
    providerSlug: "google",
    name: "Gemini CLI",
    slug: "gemini-cli",
    type: "cli",
    description: "Gemini command-line interface",
  },
  {
    providerSlug: "google",
    name: "Gemini Code Assist",
    slug: "gemini-code-assist",
    type: "ide",
    description: "Gemini Code Assist IDE extension",
  },
  {
    providerSlug: "google",
    name: "Vertex AI",
    slug: "vertex-ai",
    type: "api",
    description: "Google Cloud Vertex AI",
  },
  {
    providerSlug: "google",
    name: "Gemini for Cloud",
    slug: "gemini-cloud",
    type: "api",
    description: "Gemini for Google Cloud",
  },
  {
    providerSlug: "google",
    name: "Gemini Enterprise",
    slug: "gemini-enterprise",
    type: "api",
    description: "Gemini for Enterprise",
  },

  // ==================== xAI ====================
  {
    providerSlug: "xai",
    name: "xAI API",
    slug: "xai-api",
    type: "api",
    description: "xAI Developer API",
  },
  {
    providerSlug: "xai",
    name: "Grok",
    slug: "grok",
    type: "chat",
    description: "Grok chat interface",
  },
  {
    providerSlug: "xai",
    name: "xAI News",
    slug: "xai-news",
    type: "api",
    description: "xAI announcements and news",
  },

  // ==================== Mistral ====================
  {
    providerSlug: "mistral",
    name: "Mistral API",
    slug: "mistral-api",
    type: "api",
    description: "Mistral AI API",
  },
  {
    providerSlug: "mistral",
    name: "Mistral News",
    slug: "mistral-news",
    type: "api",
    description: "Mistral AI announcements",
  },
  {
    providerSlug: "mistral",
    name: "mistral-common",
    slug: "mistral-common",
    type: "cli",
    description: "Mistral common utilities library",
  },

  // ==================== Cohere ====================
  {
    providerSlug: "cohere",
    name: "Cohere API",
    slug: "cohere-api",
    type: "api",
    description: "Cohere API",
  },

  // ==================== Meta ====================
  {
    providerSlug: "meta",
    name: "Meta AI",
    slug: "meta-ai",
    type: "api",
    description: "Meta AI research and releases",
  },
  {
    providerSlug: "meta",
    name: "llama.cpp",
    slug: "llama-cpp",
    type: "cli",
    description: "LLaMA.cpp inference engine",
  },
  {
    providerSlug: "meta",
    name: "Llama Models",
    slug: "llama-models",
    type: "api",
    description: "Llama model releases on Hugging Face",
  },

  // ==================== DeepSeek ====================
  {
    providerSlug: "deepseek",
    name: "DeepSeek API",
    slug: "deepseek-api",
    type: "api",
    description: "DeepSeek API",
  },
  {
    providerSlug: "deepseek",
    name: "DeepSeek News",
    slug: "deepseek-news",
    type: "api",
    description: "DeepSeek announcements",
  },

  // ==================== Perplexity ====================
  {
    providerSlug: "perplexity",
    name: "Perplexity App",
    slug: "perplexity-app",
    type: "chat",
    description: "Perplexity search app",
  },
  {
    providerSlug: "perplexity",
    name: "Perplexity API",
    slug: "perplexity-api",
    type: "api",
    description: "Perplexity API",
  },

  // ==================== Amazon ====================
  {
    providerSlug: "amazon",
    name: "Amazon Bedrock",
    slug: "amazon-bedrock",
    type: "api",
    description: "Amazon Bedrock",
  },
  {
    providerSlug: "amazon",
    name: "Amazon Q",
    slug: "amazon-q",
    type: "ide",
    description: "Amazon Q Developer assistant",
  },

  // ==================== Groq ====================
  {
    providerSlug: "groq",
    name: "Groq API",
    slug: "groq-api",
    type: "api",
    description: "Groq inference API",
  },

  // ==================== Together AI ====================
  {
    providerSlug: "together",
    name: "Together API",
    slug: "together-api",
    type: "api",
    description: "Together AI API",
  },

  // ==================== Replicate ====================
  {
    providerSlug: "replicate",
    name: "Replicate Platform",
    slug: "replicate-platform",
    type: "api",
    description: "Replicate platform",
  },
  {
    providerSlug: "replicate",
    name: "Replicate JS SDK",
    slug: "replicate-js",
    type: "api",
    description: "Replicate JavaScript SDK",
  },

  // ==================== AI21 ====================
  {
    providerSlug: "ai21",
    name: "AI21 API",
    slug: "ai21-api",
    type: "api",
    description: "AI21 Labs API",
  },

  // ==================== Stability AI ====================
  {
    providerSlug: "stability",
    name: "Stability Platform",
    slug: "stability-platform",
    type: "api",
    description: "Stability AI Platform",
  },

  // ==================== Cursor ====================
  {
    providerSlug: "cursor",
    name: "Cursor Editor",
    slug: "cursor-editor",
    type: "ide",
    description: "Cursor AI code editor",
  },

  // ==================== Windsurf ====================
  {
    providerSlug: "windsurf",
    name: "Windsurf Editor",
    slug: "windsurf-editor",
    type: "ide",
    description: "Windsurf AI code editor",
  },
  {
    providerSlug: "windsurf",
    name: "Windsurf JetBrains",
    slug: "windsurf-jetbrains",
    type: "ide",
    description: "Windsurf JetBrains plugin",
  },
  {
    providerSlug: "windsurf",
    name: "Windsurf VS Code",
    slug: "windsurf-vscode",
    type: "ide",
    description: "Windsurf VS Code extension",
  },
  {
    providerSlug: "windsurf",
    name: "Windsurf Next",
    slug: "windsurf-next",
    type: "ide",
    description: "Windsurf Next preview",
  },
  {
    providerSlug: "windsurf",
    name: "Windsurf JetBrains Pre",
    slug: "windsurf-jetbrains-pre",
    type: "ide",
    description: "Windsurf JetBrains prerelease",
  },

  // ==================== Aider ====================
  {
    providerSlug: "aider",
    name: "Aider",
    slug: "aider-cli",
    type: "cli",
    description: "Aider AI pair programming",
  },

  // ==================== GitHub ====================
  {
    providerSlug: "github",
    name: "GitHub Copilot",
    slug: "github-copilot",
    type: "ide",
    description: "GitHub Copilot",
  },
  {
    providerSlug: "github",
    name: "GitHub Copilot CLI",
    slug: "github-copilot-cli",
    type: "cli",
    description: "GitHub Copilot CLI",
  },
  {
    providerSlug: "github",
    name: "Copilot Chat",
    slug: "copilot-chat",
    type: "ide",
    description: "Copilot Chat extension",
  },

  // ==================== Continue.dev ====================
  {
    providerSlug: "continue",
    name: "Continue",
    slug: "continue-dev",
    type: "ide",
    description: "Continue.dev IDE extension",
  },

  // ==================== Tabnine ====================
  {
    providerSlug: "tabnine",
    name: "Tabnine",
    slug: "tabnine-ide",
    type: "ide",
    description: "Tabnine AI assistant",
  },

  // ==================== Sourcegraph ====================
  {
    providerSlug: "sourcegraph",
    name: "Cody",
    slug: "sourcegraph-cody",
    type: "ide",
    description: "Sourcegraph Cody AI assistant",
  },
];

const seedSources: SeedSource[] = [
  // ==================== OpenAI Sources ====================
  {
    productSlug: "openai-api",
    url: "https://developers.openai.com/changelog/",
    scrapeMethod: "static",
    selectorConfig: {
      // OpenAI changelog: entries are li elements with inline date text (YYYY-MM-DD format)
      // Dates are embedded in entry text after product name, e.g. "Codex 2026-01-22"
      entrySelector: "ul > li",
      titleSelector: "strong, b",
      contentSelector: "li",
      // Note: dates are inline text - parseDate will extract from content
    },
  },
  {
    productSlug: "openai-codex",
    url: "https://developers.openai.com/codex/changelog/",
    scrapeMethod: "static",
    selectorConfig: {
      // Codex changelog: entries are <li data-product="codex"> with <time>, <h3>, and <article>
      entrySelector: "li[data-product='codex']",
      dateSelector: "time",
      titleSelector: "h3",
      contentSelector: "article",
    },
  },
  {
    productSlug: "openai-codex",
    url: "https://github.com/openai/codex/releases",
    scrapeMethod: "github_api",
    selectorConfig: {
      type: "releases",
      repo: "openai/codex",
    },
  },
  {
    productSlug: "chatgpt",
    url: "https://help.openai.com/en/articles/6825453-chatgpt-release-notes",
    scrapeMethod: "playwright",
    isActive: false, // Disabled: Intercom bot detection blocks scraping
    selectorConfig: {
      waitForSelector: ".intercom-article-content",
      contentSelector: ".intercom-article-content",
    },
  },
  {
    productSlug: "chatgpt-macos",
    url: "https://help.openai.com/en/articles/9703738-chatgpt-macos-app-release-notes",
    scrapeMethod: "playwright",
    isActive: false, // Disabled: Intercom bot detection blocks scraping
    selectorConfig: {
      waitForSelector: ".intercom-article-content",
      contentSelector: ".intercom-article-content",
    },
  },
  {
    productSlug: "chatgpt-windows",
    url: "https://help.openai.com/en/articles/10003026-windows-app-release-notes",
    scrapeMethod: "playwright",
    isActive: false, // Disabled: Intercom bot detection blocks scraping
    selectorConfig: {
      waitForSelector: ".intercom-article-content",
      contentSelector: ".intercom-article-content",
    },
  },
  {
    productSlug: "chatgpt-enterprise",
    url: "https://help.openai.com/en/articles/10128477-chatgpt-enterprise-edu-release-notes",
    scrapeMethod: "playwright",
    isActive: false, // Disabled: Intercom bot detection blocks scraping
    selectorConfig: {
      waitForSelector: ".intercom-article-content",
      contentSelector: ".intercom-article-content",
    },
  },
  {
    productSlug: "openai-models",
    url: "https://help.openai.com/en/articles/9624314-model-release-notes",
    scrapeMethod: "playwright",
    isActive: false, // Disabled: Intercom bot detection blocks scraping
    selectorConfig: {
      waitForSelector: ".intercom-article-content",
      contentSelector: ".intercom-article-content",
    },
  },

  // ==================== Anthropic Sources ====================
  {
    productSlug: "claude-api",
    url: "https://platform.claude.com/docs/en/release-notes/overview",
    scrapeMethod: "static",
    selectorConfig: {
      // Anthropic docs use h3 for dates with ul lists for content
      entrySelector: "h3",
      dateSelector: "h3",
      contentSelector: "h3 ~ ul, h3 ~ p",
    },
  },
  {
    productSlug: "claude-code",
    url: "https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md",
    scrapeMethod: "github_api",
    selectorConfig: {
      type: "raw_markdown",
      repo: "anthropics/claude-code",
      path: "CHANGELOG.md",
    },
  },
  {
    productSlug: "claude-code",
    url: "https://github.com/anthropics/claude-code/releases",
    scrapeMethod: "github_api",
    selectorConfig: {
      type: "releases",
      repo: "anthropics/claude-code",
    },
  },
  {
    productSlug: "claude-apps",
    url: "https://support.claude.com/en/articles/12138966-release-notes",
    scrapeMethod: "static",
    selectorConfig: {
      // Claude Help Center article structure
      entrySelector: "article",
      dateSelector: "h3, h2",
      contentSelector: "article p, article ul",
    },
  },

  // ==================== Google Sources ====================
  {
    productSlug: "gemini-api",
    url: "https://ai.google.dev/gemini-api/docs/changelog",
    scrapeMethod: "static",
    selectorConfig: {
      // Google uses h2 for dates (e.g., "January 22, 2026") followed by ul content
      // Using h2 as entry selector so date is self-contained in the entry text
      entrySelector: "h2",
      dateSelector: "h2",
      titleSelector: "h2",
      contentSelector: "h2 ~ ul:first-of-type",
    },
  },
  {
    productSlug: "gemini-apps",
    url: "https://gemini.google/release-notes/",
    scrapeMethod: "static",
    selectorConfig: {
      entrySelector: "article, section",
      dateSelector: "time, h2",
      contentSelector: "p, ul li",
    },
  },
  {
    productSlug: "gemini-cli",
    url: "https://geminicli.com/docs/changelogs/",
    scrapeMethod: "static",
    selectorConfig: {
      entrySelector: "h2, h3",
      dateSelector: "h2",
      contentSelector: "ul li, p",
    },
  },
  {
    productSlug: "gemini-cli",
    url: "https://github.com/google-gemini/gemini-cli/releases",
    scrapeMethod: "github_api",
    selectorConfig: {
      type: "releases",
      repo: "google-gemini/gemini-cli",
    },
  },
  {
    productSlug: "gemini-code-assist",
    url: "https://developers.google.com/gemini-code-assist/resources/release-notes",
    scrapeMethod: "static",
    selectorConfig: {
      // Google developers docs structure
      entrySelector: "section, h2",
      dateSelector: "h2",
      contentSelector: "p, ul li",
    },
  },
  {
    productSlug: "vertex-ai",
    url: "https://cloud.google.com/vertex-ai/generative-ai/docs/release-notes",
    scrapeMethod: "static",
    selectorConfig: {
      // Google Cloud release notes structure
      entrySelector: "section.release-note, article section",
      dateSelector: "h2",
      contentSelector: "p, ul li",
    },
  },
  {
    productSlug: "gemini-cloud",
    url: "https://cloud.google.com/gemini/docs/release-notes",
    scrapeMethod: "static",
    selectorConfig: {
      entrySelector: "section.release-note, article section",
      dateSelector: "h2",
      contentSelector: "p, ul li",
    },
  },
  {
    productSlug: "gemini-enterprise",
    url: "https://cloud.google.com/gemini/enterprise/docs/release-notes",
    scrapeMethod: "static",
    selectorConfig: {
      entrySelector: "section.release-note, article section",
      dateSelector: "h2",
      contentSelector: "p, ul li",
    },
  },

  // ==================== xAI Sources ====================
  {
    productSlug: "xai-api",
    url: "https://docs.x.ai/docs/release-notes",
    scrapeMethod: "static",
    selectorConfig: {
      // xAI docs use headings for dates with paragraphs and lists
      entrySelector: "h1, h2, h3",
      dateSelector: "h1, h2",
      titleSelector: "h3",
      contentSelector: "p, ul li",
    },
  },
  {
    productSlug: "grok",
    url: "https://grok.com/changelog",
    scrapeMethod: "playwright",
    isActive: false, // Disabled: Bot detection causes navigation timeout
    selectorConfig: {
      waitForSelector: "main",
      entrySelector: ".changelog-entry",
      contentSelector: ".content",
    },
  },
  {
    productSlug: "xai-news",
    url: "https://x.ai/news",
    scrapeMethod: "static",
    selectorConfig: {
      entrySelector: "article",
      dateSelector: "time",
      titleSelector: "h2",
      contentSelector: ".content",
    },
  },

  // ==================== Mistral Sources ====================
  {
    productSlug: "mistral-api",
    url: "https://docs.mistral.ai/getting-started/changelog",
    scrapeMethod: "static",
    selectorConfig: {
      // Mistral uses div.changelog-content with dates like "December 18"
      // Entries in ul.list-none > li with badge types for model/api/other
      entrySelector: "div.changelog-content, section",
      dateSelector: "h2, h3",
      titleSelector: "h3",
      contentSelector: "ul li, p",
    },
  },
  {
    productSlug: "mistral-news",
    url: "https://mistral.ai/news",
    scrapeMethod: "static",
    selectorConfig: {
      entrySelector: "article, a[href*='/news/']",
      dateSelector: "time, span",
      titleSelector: "h2, h3",
      contentSelector: "p",
    },
  },
  {
    productSlug: "mistral-common",
    url: "https://github.com/mistralai/mistral-common/releases",
    scrapeMethod: "github_api",
    selectorConfig: {
      type: "releases",
      repo: "mistralai/mistral-common",
    },
  },

  // ==================== Cohere Sources ====================
  {
    productSlug: "cohere-api",
    url: "https://docs.cohere.com/changelog",
    scrapeMethod: "static",
    isActive: false, // Disabled: URL returns 404 - needs URL update
    selectorConfig: {
      // Cohere docs structure
      entrySelector: "article, section",
      dateSelector: "time, h2, h3",
      contentSelector: "p, ul li",
    },
  },
  {
    productSlug: "cohere-api",
    url: "https://docs.cohere.com/docs/deprecations",
    scrapeMethod: "static",
    isActive: false, // Disabled: URL returns 404 - needs URL update
    selectorConfig: {
      entrySelector: "section, article",
      dateSelector: "h2, h3",
      contentSelector: "p, ul li, table",
    },
  },

  // ==================== Meta Sources ====================
  {
    productSlug: "meta-ai",
    url: "https://ai.meta.com/blog/",
    scrapeMethod: "static",
    selectorConfig: {
      // Meta AI blog structure
      entrySelector: "article, a[href*='/blog/']",
      dateSelector: "time, span",
      titleSelector: "h2, h3",
      linkSelector: "a[href*='/blog/']",
      contentSelector: "p, span",
    },
  },
  {
    productSlug: "llama-cpp",
    url: "https://github.com/ggml-org/llama.cpp/releases",
    scrapeMethod: "github_api",
    selectorConfig: {
      type: "releases",
      repo: "ggml-org/llama.cpp",
    },
  },
  {
    productSlug: "llama-models",
    url: "https://huggingface.co/meta-llama",
    scrapeMethod: "static",
    selectorConfig: {
      // Hugging Face model listing
      entrySelector: "article, a[href*='/meta-llama/']",
      dateSelector: "time, span",
      titleSelector: "h4, h3",
      linkSelector: "a[href*='/meta-llama/']",
      contentSelector: "p, span",
    },
  },

  // ==================== DeepSeek Sources ====================
  {
    productSlug: "deepseek-api",
    url: "https://api-docs.deepseek.com/updates",
    scrapeMethod: "static",
    selectorConfig: {
      // DeepSeek uses h2 with "Date: YYYY-MM-DD" format as entry headers
      // e.g., <h2 id="date-2025-12-01">Date: 2025-12-01</h2>
      entrySelector: "h2[id^='date-']",
      dateSelector: "h2",
      titleSelector: "h3",
      contentSelector: "ul li, p",
    },
  },
  {
    productSlug: "deepseek-news",
    url: "https://api-docs.deepseek.com/news/",
    scrapeMethod: "static",
    isActive: false, // Disabled: URL returns 404 Not Found
    selectorConfig: {
      entrySelector: "article, a[href*='/news/']",
      dateSelector: "time, span",
      contentSelector: "p, ul li",
    },
  },

  // ==================== Perplexity Sources ====================
  {
    productSlug: "perplexity-app",
    url: "https://www.perplexity.ai/changelog",
    scrapeMethod: "playwright",
    isActive: false, // Disabled: 403 Forbidden - bot detection blocks even playwright
    selectorConfig: {
      waitForSelector: "main",
      entrySelector: "article, section",
      dateSelector: "time, h3",
      contentSelector: "p, ul li",
    },
  },
  {
    productSlug: "perplexity-api",
    url: "https://docs.perplexity.ai/changelog/changelog",
    scrapeMethod: "static",
    selectorConfig: {
      // Uses custom <Update label="Jan 9" description="/endpoint"> components
      // Monthly headings use h2, individual updates have label attribute with date
      entrySelector: "h2",
      dateSelector: "h2",
      titleSelector: "strong, b",
      contentSelector: "ul li, p",
    },
  },

  // ==================== Amazon Sources ====================
  {
    productSlug: "amazon-bedrock",
    url: "https://docs.aws.amazon.com/bedrock/latest/userguide/doc-history.html",
    scrapeMethod: "static",
    selectorConfig: {
      // AWS docs use tables for doc history
      entrySelector: "table tbody tr",
      dateSelector: "td:last-child",
      titleSelector: "td:first-child a",
      contentSelector: "td:first-child",
    },
  },
  {
    productSlug: "amazon-q",
    url: "https://aws.amazon.com/developer/generative-ai/amazon-q/change-log/",
    scrapeMethod: "static",
    selectorConfig: {
      // AWS marketing pages structure
      entrySelector: "article, section, div[class*='changelog']",
      dateSelector: "time, h3, span",
      contentSelector: "p, ul li",
    },
  },

  // ==================== Groq Sources ====================
  {
    productSlug: "groq-api",
    url: "https://console.groq.com/docs/changelog",
    scrapeMethod: "static",
    selectorConfig: {
      // Groq uses hr separators between entries, dates are plain text like "Dec 1, 2025"
      // Structure: <hr> -> date text -> ### Added -> content
      // Using hr + adjacent sibling selectors is unreliable; fall back to h3 headers
      entrySelector: "h3",
      dateSelector: "h3",
      titleSelector: "h3",
      contentSelector: "ul li, p",
    },
  },
  {
    productSlug: "groq-api",
    url: "https://github.com/groq/groq-changelog",
    scrapeMethod: "github_api",
    selectorConfig: {
      type: "raw_markdown",
      repo: "groq/groq-changelog",
      path: "README.md",
    },
  },

  // ==================== Together AI Sources ====================
  {
    productSlug: "together-api",
    url: "https://docs.together.ai/docs/changelog",
    scrapeMethod: "static",
    selectorConfig: {
      // Together AI uses <Update label="Jan 9"> components with h2 for monthly sections
      // Monthly h2 headers like "## January, 2026" provide temporal context
      entrySelector: "h2",
      dateSelector: "h2",
      titleSelector: "strong, b",
      contentSelector: "ul li, p",
    },
  },

  // ==================== Replicate Sources ====================
  {
    productSlug: "replicate-platform",
    url: "https://replicate.com/changelog",
    scrapeMethod: "static",
    selectorConfig: {
      // Replicate: entries are <a href="/changelog/[date-slug]"> with date as text
      // Title and date both within the anchor, date follows title
      entrySelector: "a[href^='/changelog/']",
      dateSelector: "time, p",
      titleSelector: "h2, h3, strong",
      linkSelector: "a[href^='/changelog/']",
      contentSelector: "p",
    },
  },
  {
    productSlug: "replicate-js",
    url: "https://github.com/replicate/replicate-javascript/releases",
    scrapeMethod: "github_api",
    selectorConfig: {
      type: "releases",
      repo: "replicate/replicate-javascript",
    },
  },

  // ==================== AI21 Sources ====================
  {
    productSlug: "ai21-api",
    url: "https://docs.ai21.com/changelog",
    scrapeMethod: "static",
    selectorConfig: {
      // AI21 docs structure
      entrySelector: "section, article, h2",
      dateSelector: "time, h2, h3",
      contentSelector: "p, ul li",
    },
  },

  // ==================== Stability AI Sources ====================
  {
    productSlug: "stability-platform",
    url: "https://platform.stability.ai/docs/release-notes",
    scrapeMethod: "static",
    selectorConfig: {
      // Stability docs structure
      entrySelector: "section, h2",
      dateSelector: "h2, h3",
      contentSelector: "p, ul li",
    },
  },

  // ==================== Cursor Sources ====================
  {
    productSlug: "cursor-editor",
    url: "https://cursor.com/changelog",
    scrapeMethod: "static",
    selectorConfig: {
      // Cursor uses article elements with <time dateTime="ISO"> for dates
      // Good structure: date is within each article entry
      entrySelector: "article",
      dateSelector: "time[dateTime]",
      titleSelector: "h1",
      contentSelector: "div.prose, div[class*='prose']",
    },
  },

  // ==================== Windsurf Sources ====================
  {
    productSlug: "windsurf-editor",
    url: "https://windsurf.com/changelog",
    scrapeMethod: "playwright", // Next.js app - requires JS rendering
    selectorConfig: {
      waitForSelector: "main h2",
      entrySelector: "h2",
      dateSelector: "h2",
      titleSelector: "h2",
      contentSelector: "ul li",
    },
  },
  {
    productSlug: "windsurf-jetbrains",
    url: "https://windsurf.com/changelog/jetbrains",
    scrapeMethod: "playwright",
    selectorConfig: {
      waitForSelector: "main h2",
      entrySelector: "h2",
      dateSelector: "h2",
      titleSelector: "h2",
      contentSelector: "ul li",
    },
  },
  {
    productSlug: "windsurf-vscode",
    url: "https://windsurf.com/changelog/vscode",
    scrapeMethod: "playwright",
    selectorConfig: {
      waitForSelector: "main h2",
      entrySelector: "h2",
      dateSelector: "h2",
      titleSelector: "h2",
      contentSelector: "ul li",
    },
  },
  {
    productSlug: "windsurf-next",
    url: "https://windsurf.com/changelog/windsurf-next",
    scrapeMethod: "playwright",
    selectorConfig: {
      waitForSelector: "main h2",
      entrySelector: "h2",
      dateSelector: "h2",
      titleSelector: "h2",
      contentSelector: "ul li",
    },
  },
  {
    productSlug: "windsurf-jetbrains-pre",
    url: "https://windsurf.com/changelog/jetbrains-prerelease",
    scrapeMethod: "playwright",
    selectorConfig: {
      waitForSelector: "main h2",
      entrySelector: "h2",
      dateSelector: "h2",
      titleSelector: "h2",
      contentSelector: "ul li",
    },
  },

  // ==================== Aider Sources ====================
  {
    productSlug: "aider-cli",
    url: "https://aider.chat/HISTORY.html",
    scrapeMethod: "static",
    selectorConfig: {
      // Aider uses simple HTML with h2 for versions
      entrySelector: "h2, section",
      dateSelector: "h2",
      titleSelector: "h2",
      contentSelector: "ul li, p",
    },
  },

  // ==================== GitHub Copilot Sources ====================
  {
    productSlug: "github-copilot",
    url: "https://github.blog/changelog/label/copilot/",
    scrapeMethod: "static",
    selectorConfig: {
      // GitHub blog uses wp-block-list with anchor-wrapped entries
      entrySelector: ".wp-block-list li, article",
      dateSelector: ".entry-date, time",
      titleSelector: "h3, .entry-title",
      linkSelector: "a[href*='/changelog/']",
      contentSelector: "p, .entry-content",
    },
  },
  {
    productSlug: "github-copilot-cli",
    url: "https://raw.githubusercontent.com/github/copilot-cli/main/changelog.md",
    scrapeMethod: "github_api",
    selectorConfig: {
      type: "raw_markdown",
      repo: "github/copilot-cli",
      path: "changelog.md",
    },
  },
  {
    productSlug: "copilot-chat",
    url: "https://github.com/microsoft/vscode-copilot-chat/releases",
    scrapeMethod: "github_api",
    selectorConfig: {
      type: "releases",
      repo: "microsoft/vscode-copilot-chat",
    },
  },

  // ==================== Continue.dev Sources ====================
  {
    productSlug: "continue-dev",
    url: "https://changelog.continue.dev/",
    scrapeMethod: "static",
    selectorConfig: {
      // Continue.dev changelog structure
      entrySelector: "article, section",
      dateSelector: "time, h2, h3",
      titleSelector: "h2, h3",
      contentSelector: "p, ul li",
    },
  },
  {
    productSlug: "continue-dev",
    url: "https://github.com/continuedev/continue/releases",
    scrapeMethod: "github_api",
    selectorConfig: {
      type: "releases",
      repo: "continuedev/continue",
    },
  },

  // ==================== Tabnine Sources ====================
  {
    productSlug: "tabnine-ide",
    url: "https://docs.tabnine.com/main/administering-tabnine/release-notes",
    scrapeMethod: "static",
    selectorConfig: {
      // Tabnine docs (Mintlify-style)
      entrySelector: "section, h2",
      dateSelector: "h2, h3",
      contentSelector: "p, ul li",
    },
  },
  {
    productSlug: "tabnine-ide",
    url: "https://github.com/codota/tabnine-vscode/releases",
    scrapeMethod: "github_api",
    selectorConfig: {
      type: "releases",
      repo: "codota/tabnine-vscode",
    },
  },

  // ==================== Sourcegraph Cody Sources ====================
  {
    productSlug: "sourcegraph-cody",
    url: "https://sourcegraph.com/changelog",
    scrapeMethod: "static",
    selectorConfig: {
      // Sourcegraph changelog structure
      entrySelector: "article, section",
      dateSelector: "time, h2",
      titleSelector: "h2, h3",
      contentSelector: "p, ul li",
    },
  },
  {
    productSlug: "sourcegraph-cody",
    url: "https://github.com/sourcegraph/cody/releases",
    scrapeMethod: "github_api",
    isActive: false, // Disabled: GitHub API returns 404 (repo likely private/deleted)
    selectorConfig: {
      type: "releases",
      repo: "sourcegraph/cody",
    },
  },
];

// ============================================================================
// Seed Function
// ============================================================================

async function seed() {
  console.log("🌱 Starting database seed...\n");

  // Insert providers
  console.log("📦 Inserting providers...");
  const insertedProviders = await db
    .insert(providers)
    .values(seedProviders)
    .onConflictDoNothing()
    .returning();
  console.log(`   ✓ Inserted ${insertedProviders.length} providers\n`);

  // Create provider slug -> id mapping
  const providerMap = new Map(insertedProviders.map((p) => [p.slug, p.id]));

  // Insert products
  console.log("📦 Inserting products...");
  const productsToInsert = seedProducts.map((product) => ({
    providerId: providerMap.get(product.providerSlug),
    name: product.name,
    slug: product.slug,
    type: product.type,
    description: product.description,
  }));

  const insertedProducts = await db
    .insert(products)
    .values(productsToInsert)
    .onConflictDoNothing()
    .returning();
  console.log(`   ✓ Inserted ${insertedProducts.length} products\n`);

  // Create product slug -> id mapping
  const productMap = new Map(insertedProducts.map((p) => [p.slug, p.id]));

  // Insert sources
  console.log("📦 Inserting sources...");
  const sourcesToInsert = seedSources.map((source) => ({
    productId: productMap.get(source.productSlug),
    url: source.url,
    scrapeMethod: source.scrapeMethod,
    selectorConfig: source.selectorConfig,
    isActive: source.isActive ?? true, // Default to active if not specified
  }));

  const insertedSources = await db
    .insert(sources)
    .values(sourcesToInsert)
    .onConflictDoNothing()
    .returning();
  console.log(`   ✓ Inserted ${insertedSources.length} sources\n`);

  // Summary
  console.log("✅ Seed complete!");
  console.log(`   Providers: ${insertedProviders.length}`);
  console.log(`   Products:  ${insertedProducts.length}`);
  console.log(`   Sources:   ${insertedSources.length}`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
