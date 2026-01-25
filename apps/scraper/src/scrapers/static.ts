import * as cheerio from "cheerio";
import type { Source } from "../db/schema.js";
import type { Scraper, ScrapeResult, ParsedEntry } from "./base.js";
import { parseSelectorConfig } from "./base.js";

/**
 * Static HTML scraper using Cheerio
 * Used for ~45 sources that don't require JavaScript rendering
 */
export class StaticScraper implements Scraper {
  readonly name = "StaticScraper";

  async scrape(source: Source): Promise<ScrapeResult> {
    try {
      const response = await fetch(source.url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; AIChangelogBot/1.0; +https://aichangelog.dev)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      if (!response.ok) {
        return {
          success: false,
          entries: [],
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const config = parseSelectorConfig(source);

      const entries: ParsedEntry[] = [];

      // If no entry selector, treat the whole page as one entry
      if (!config.entrySelector) {
        const content = $(config.contentSelector || "body").text().trim();
        if (content) {
          entries.push({
            content,
            contentHtml: $(config.contentSelector || "body").html() || undefined,
            url: source.url,
          });
        }
        return { success: true, entries };
      }

      // Parse entries using selectors
      $(config.entrySelector).each((_, element) => {
        const $entry = $(element);

        // Extract date
        let publishedDate: Date | undefined;
        if (config.dateSelector) {
          let dateText: string | undefined;
          let dateAttr: string | undefined;

          // Handle "entry-as-date" pattern: when entrySelector === dateSelector,
          // the entry element itself contains the date (e.g., <h2>January 15, 2025</h2>)
          if (config.entrySelector === config.dateSelector) {
            dateText = $entry.text().trim();
            dateAttr = $entry.attr("datetime");
          } else {
            // Standard case: date is a descendant of the entry
            const $dateEl = $entry.find(config.dateSelector);
            if ($dateEl.length) {
              dateText = $dateEl.text().trim();
              dateAttr = $dateEl.attr("datetime");
            }
          }

          const parsedDate = parseDate(dateAttr || dateText || "");
          if (parsedDate) {
            publishedDate = parsedDate;
          }
        }

        // Fallback: check for sibling-based date (e.g., <h2>Date</h2><h3>Title</h3>)
        if (!publishedDate && config.siblingDateSelector) {
          const $siblingDate = $entry.prevAll(config.siblingDateSelector).first();
          if ($siblingDate.length) {
            const siblingDateText = $siblingDate.text().trim();
            const siblingDateAttr = $siblingDate.attr("datetime");
            const parsedSiblingDate = parseDate(siblingDateAttr || siblingDateText);
            if (parsedSiblingDate) {
              publishedDate = parsedSiblingDate;
            }
          }
        }

        // Extract title
        let title: string | undefined;
        if (config.titleSelector) {
          title = $entry.find(config.titleSelector).text().trim() || undefined;
        }

        // Extract content
        let content = "";
        let contentHtml: string | undefined;
        if (config.contentSelector) {
          const $content = $entry.find(config.contentSelector);
          content = $content.text().trim();
          contentHtml = $content.html() || undefined;
        }

        // Fallback: check for sibling-based content (e.g., <h2>Title</h2><ul>content</ul>)
        if (!content && config.siblingContentSelector) {
          const contentParts: string[] = [];
          const htmlParts: string[] = [];
          let $sibling = $entry.next();

          while ($sibling.length) {
            // Stop if we hit another entry element (prevents grabbing next entry's content)
            if ($sibling.is(config.entrySelector!)) {
              break;
            }

            if ($sibling.is(config.siblingContentSelector)) {
              contentParts.push($sibling.text().trim());
              htmlParts.push($.html($sibling) || "");
            }
            $sibling = $sibling.next();
          }

          if (contentParts.length) {
            content = contentParts.join("\n");
            contentHtml = htmlParts.join("\n");
          }
        }

        // Final fallback: use entry element itself
        if (!content) {
          content = $entry.text().trim();
          contentHtml = $entry.html() || undefined;
        }

        // Extract link
        let url: string | undefined;
        if (config.linkSelector) {
          const href = $entry.find(config.linkSelector).attr("href");
          if (href) {
            url = new URL(href, source.url).toString();
          }
        }

        // Extract version from title or content
        let version: string | undefined;
        if (config.versionSelector) {
          version = $entry.find(config.versionSelector).text().trim() || undefined;
        } else {
          // Try to extract version from title
          const versionMatch = (title || content).match(
            /v?(\d+\.\d+(?:\.\d+)?(?:-[\w.]+)?)/i
          );
          if (versionMatch) {
            version = versionMatch[1];
          }
        }

        // Skip empty entries
        if (!content) return;

        entries.push({
          publishedDate,
          title,
          content,
          contentHtml,
          url,
          version,
        });
      });

      return { success: true, entries };
    } catch (error) {
      return {
        success: false,
        entries: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * Parse various date formats
 */
function parseDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;

  // Try ISO format first
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }

  // Try common formats
  const patterns = [
    // "January 15, 2025" or "Jan 15, 2025"
    /(\w+)\s+(\d{1,2}),?\s+(\d{4})/,
    // "15 January 2025" or "15 Jan 2025"
    /(\d{1,2})\s+(\w+)\s+(\d{4})/,
    // "2025-01-15"
    /(\d{4})-(\d{2})-(\d{2})/,
    // "01/15/2025"
    /(\d{2})\/(\d{2})\/(\d{4})/,
  ];

  for (const pattern of patterns) {
    const match = dateStr.match(pattern);
    if (match) {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }

  return undefined;
}
