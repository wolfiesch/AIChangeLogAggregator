import { Octokit } from "@octokit/rest";
import { marked } from "marked";
import type { Source } from "../db/schema.js";
import type { Scraper, ScrapeResult, ParsedEntry } from "./base.js";
import { parseSelectorConfig, type SelectorConfig } from "./base.js";

/**
 * GitHub scraper using Octokit
 * Handles:
 * - GitHub Releases (releases page)
 * - Raw markdown files (CHANGELOG.md, etc.)
 */
export class GitHubScraper implements Scraper {
  readonly name = "GitHubScraper";
  private octokit: Octokit;

  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });
  }

  async scrape(source: Source): Promise<ScrapeResult> {
    const config = parseSelectorConfig(source);

    if (!config.repo) {
      return {
        success: false,
        entries: [],
        error: "Missing repo in selector config",
      };
    }

    try {
      if (config.type === "releases") {
        return await this.scrapeReleases(config);
      } else if (config.type === "raw_markdown") {
        return await this.scrapeRawMarkdown(config);
      } else {
        return {
          success: false,
          entries: [],
          error: `Unknown GitHub scrape type: ${config.type}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        entries: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Scrape GitHub releases with pagination support
   * Fetches up to 200 releases to capture full history for repos with many releases
   */
  private async scrapeReleases(config: SelectorConfig): Promise<ScrapeResult> {
    const [owner, repo] = config.repo!.split("/");

    // Use paginate to handle repos with many releases (like llama.cpp with 2000+)
    const releases = await this.octokit.paginate(
      this.octokit.repos.listReleases,
      { owner, repo, per_page: 100 },
      (response, done) => {
        // Cap at 200 releases to avoid excessive API calls
        if (response.data.length >= 200) done();
        return response.data;
      }
    );

    const entries: ParsedEntry[] = releases.map((release) => {
      // Parse markdown to HTML
      const contentHtml = release.body ? marked.parse(release.body) as string : undefined;

      return {
        externalId: release.id.toString(),
        publishedDate: release.published_at
          ? new Date(release.published_at)
          : undefined,
        title: release.name || release.tag_name,
        content: release.body || "",
        contentHtml,
        url: release.html_url,
        version: release.tag_name.replace(/^v/, ""),
        tags: release.prerelease ? ["prerelease"] : undefined,
      };
    });

    return { success: true, entries };
  }

  /**
   * Scrape raw markdown file (like CHANGELOG.md)
   */
  private async scrapeRawMarkdown(config: SelectorConfig): Promise<ScrapeResult> {
    const [owner, repo] = config.repo!.split("/");
    const path = config.path || "CHANGELOG.md";

    const { data } = await this.octokit.repos.getContent({
      owner,
      repo,
      path,
    });

    if (!("content" in data)) {
      return {
        success: false,
        entries: [],
        error: "File not found or is a directory",
      };
    }

    const content = Buffer.from(data.content, "base64").toString("utf-8");
    const entries = parseMarkdownChangelog(content);

    return { success: true, entries };
  }
}

/**
 * Parse a markdown changelog file into entries
 * Handles common formats like Keep a Changelog
 */
function parseMarkdownChangelog(markdown: string): ParsedEntry[] {
  const entries: ParsedEntry[] = [];

  // Split by version headers (## [1.0.0] or ## 1.0.0 or ## v1.0.0)
  const versionPattern = /^##\s+\[?v?(\d+\.\d+(?:\.\d+)?(?:-[\w.]+)?)\]?(?:\s*[-–—]\s*(.+))?$/gm;

  const sections = markdown.split(versionPattern);

  // sections will be: [preamble, version1, date1, content1, version2, date2, content2, ...]
  for (let i = 1; i < sections.length; i += 3) {
    const version = sections[i];
    const dateStr = sections[i + 1];
    const content = sections[i + 2]?.trim();

    if (!content) continue;

    // Parse date from header or look for date in content
    let publishedDate: Date | undefined;
    if (dateStr) {
      const parsed = new Date(dateStr.trim());
      if (!isNaN(parsed.getTime())) {
        publishedDate = parsed;
      }
    }

    // Parse markdown to HTML
    const contentHtml = marked.parse(content) as string;

    // Extract tags from content (### Added, ### Fixed, etc.)
    const tags: string[] = [];
    const tagMatches = content.matchAll(/^###\s+(\w+)/gm);
    for (const match of tagMatches) {
      const tag = match[1].toLowerCase();
      if (!tags.includes(tag)) {
        tags.push(tag);
      }
    }

    entries.push({
      publishedDate,
      title: `Version ${version}`,
      content,
      contentHtml,
      version,
      tags: tags.length > 0 ? tags : undefined,
    });
  }

  // If no version headers found, treat the whole file as one entry
  if (entries.length === 0 && markdown.trim()) {
    entries.push({
      content: markdown,
      contentHtml: marked.parse(markdown) as string,
    });
  }

  return entries;
}
