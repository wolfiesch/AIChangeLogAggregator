import { chromium, type Browser, type Page } from "playwright";
import type { Source } from "../db/schema.js";
import type { Scraper, ScrapeResult, ParsedEntry } from "./base.js";
import { parseSelectorConfig } from "./base.js";

/**
 * Parse various date formats including YYYY.MM.DD (Gemini style)
 */
function parseDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;

  // Try "YYYY.MM.DD" format (e.g., "2026.01.20" used by Gemini)
  const dotMatch = dateStr.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  if (dotMatch) {
    const [, year, month, day] = dotMatch;
    const parsed = new Date(`${year}-${month}-${day}`);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  // Try standard Date constructor
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed;

  return undefined;
}

/**
 * Playwright scraper for JavaScript-rendered pages
 * Used for ~8 sources that require browser rendering:
 * - Grok Changelog (Next.js)
 * - OpenAI Help Center articles (Intercom)
 */
export class PlaywrightScraper implements Scraper {
  readonly name = "PlaywrightScraper";
  private browser: Browser | null = null;

  async scrape(source: Source): Promise<ScrapeResult> {
    const config = parseSelectorConfig(source);

    try {
      // Initialize browser if not already running
      if (!this.browser) {
        this.browser = await chromium.launch({
          headless: true,
        });
      }

      const context = await this.browser.newContext({
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      });

      const page = await context.newPage();

      try {
        // Navigate to page (60s timeout for slow Next.js sites like Windsurf)
        await page.goto(source.url, {
          waitUntil: "networkidle",
          timeout: 60000,
        });

        // Wait for content to load
        if (config.waitForSelector) {
          await page.waitForSelector(config.waitForSelector, {
            timeout: 15000,
          });
        }

        // Small delay for any remaining JS execution
        await page.waitForTimeout(1000);

        // Extract entries
        const entries = await this.extractEntries(page, source);

        return { success: true, entries };
      } finally {
        await context.close();
      }
    } catch (error) {
      return {
        success: false,
        entries: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async extractEntries(
    page: Page,
    source: Source
  ): Promise<ParsedEntry[]> {
    const config = parseSelectorConfig(source);

    // If no entry selector, extract the main content as a single entry
    if (!config.entrySelector) {
      const contentSelector = config.contentSelector || "main, article, body";
      const element = await page.$(contentSelector);

      if (!element) {
        return [];
      }

      const content = await element.textContent();
      const contentHtml = await element.innerHTML();

      return content?.trim()
        ? [
            {
              content: content.trim(),
              contentHtml,
              url: source.url,
            },
          ]
        : [];
    }

    // Extract multiple entries using selectors
    const entryElements = await page.$$(config.entrySelector);
    const entries: ParsedEntry[] = [];

    for (const el of entryElements) {
      // Extract date
      let publishedDate: Date | undefined;
      if (config.dateSelector) {
        let dateStr = "";

        // Handle "entry-as-date" pattern: when entrySelector === dateSelector,
        // the entry element itself contains the date (e.g., <h2>January 15, 2025</h2>)
        if (config.entrySelector === config.dateSelector) {
          const dateAttr = await el.getAttribute("datetime");
          const dateText = await el.textContent();
          dateStr = dateAttr || dateText?.trim() || "";
        } else {
          // Standard case: date is a descendant of the entry
          const dateEl = await el.$(config.dateSelector);
          if (dateEl) {
            const dateAttr = await dateEl.getAttribute("datetime");
            const dateText = await dateEl.textContent();
            dateStr = dateAttr || dateText?.trim() || "";
          }
        }

        if (dateStr) {
          publishedDate = parseDate(dateStr);
        }
      }

      // Fallback: check for sibling-based date via page evaluation
      if (!publishedDate && config.siblingDateSelector) {
        const siblingDateStr = await el.evaluate(
          (element, selector) => {
            let sibling = element.previousElementSibling;
            while (sibling) {
              if (sibling.matches(selector)) {
                return (
                  sibling.getAttribute("datetime") ||
                  sibling.textContent?.trim() ||
                  ""
                );
              }
              sibling = sibling.previousElementSibling;
            }
            return "";
          },
          config.siblingDateSelector
        );
        if (siblingDateStr) {
          publishedDate = parseDate(siblingDateStr);
        }
      }

      // Extract title
      let title: string | undefined;
      if (config.titleSelector) {
        const titleEl = await el.$(config.titleSelector);
        if (titleEl) {
          title = (await titleEl.textContent())?.trim() || undefined;
        }
      }

      // Extract content
      let content = "";
      let contentHtml: string | undefined;
      if (config.contentSelector) {
        const contentEl = await el.$(config.contentSelector);
        if (contentEl) {
          content = (await contentEl.textContent())?.trim() || "";
          contentHtml = await contentEl.innerHTML();
        }
      }

      // Fallback: check for sibling-based content (e.g., <h2>Title</h2><ul>content</ul>)
      if (!content && config.siblingContentSelector) {
        const siblingContent = await el.evaluate(
          (element, selector) => {
            // Look for following siblings that match the selector
            let sibling = element.nextElementSibling;
            const contentParts: string[] = [];
            const htmlParts: string[] = [];

            while (sibling) {
              // Stop if we hit another entry element (prevents grabbing next entry's content)
              if (
                sibling.tagName === element.tagName &&
                sibling.className === element.className
              ) {
                break;
              }

              if (sibling.matches(selector)) {
                contentParts.push(sibling.textContent?.trim() || "");
                htmlParts.push(sibling.outerHTML);
              }
              sibling = sibling.nextElementSibling;
            }

            return {
              text: contentParts.join("\n"),
              html: htmlParts.join("\n"),
            };
          },
          config.siblingContentSelector
        );

        if (siblingContent.text) {
          content = siblingContent.text;
          contentHtml = siblingContent.html;
        }
      }

      // Final fallback: use entry element itself
      if (!content) {
        content = (await el.textContent())?.trim() || "";
        contentHtml = await el.innerHTML();
      }

      // Extract link
      let url: string | undefined;
      if (config.linkSelector) {
        const linkEl = await el.$(config.linkSelector);
        if (linkEl) {
          const href = await linkEl.getAttribute("href");
          if (href) {
            url = new URL(href, source.url).toString();
          }
        }
      }

      // Skip empty entries
      if (!content) continue;

      entries.push({
        publishedDate,
        title,
        content,
        contentHtml,
        url,
      });
    }

    return entries;
  }

  /**
   * Close the browser instance
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
