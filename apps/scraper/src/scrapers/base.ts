import type { Source } from "../db/schema.js";

/**
 * Represents a parsed changelog entry from a source
 */
export interface ParsedEntry {
  externalId?: string;
  publishedDate?: Date;
  title?: string;
  content: string;
  contentHtml?: string;
  url?: string;
  version?: string;
  tags?: string[];
}

/**
 * Result of a scrape operation
 */
export interface ScrapeResult {
  success: boolean;
  entries: ParsedEntry[];
  error?: string;
}

/**
 * Base interface for all scraper implementations
 */
export interface Scraper {
  /**
   * Scrape changelog entries from a source
   */
  scrape(source: Source): Promise<ScrapeResult>;

  /**
   * Name of the scraper for logging
   */
  readonly name: string;
}

/**
 * Configuration for selector-based scraping
 */
export interface SelectorConfig {
  // For static HTML scraping
  entrySelector?: string;
  dateSelector?: string;
  titleSelector?: string;
  contentSelector?: string;
  linkSelector?: string;
  versionSelector?: string;
  waitForSelector?: string;
  // When date is a sibling rather than descendant of entry (e.g., <h2>Date</h2><h3>Title</h3>)
  siblingDateSelector?: string;
  // When content is a sibling rather than descendant of entry (e.g., <h2>Title</h2><ul>content</ul>)
  siblingContentSelector?: string;

  // For GitHub scraping
  type?: "releases" | "raw_markdown";
  repo?: string;
  path?: string;
}

/**
 * Parse selector config from source
 */
export function parseSelectorConfig(source: Source): SelectorConfig {
  if (!source.selectorConfig) {
    return {};
  }
  return source.selectorConfig as SelectorConfig;
}
