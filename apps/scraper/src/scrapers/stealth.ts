import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer";
import type { Source } from "../db/schema.js";
import type { Scraper, ScrapeResult, ParsedEntry } from "./base.js";
import { parseSelectorConfig, type SelectorConfig } from "./base.js";

// Apply stealth plugin to evade bot detection
const puppeteer = puppeteerExtra.default || puppeteerExtra;
puppeteer.use(StealthPlugin());

/**
 * Stealth scraper using puppeteer-extra-plugin-stealth
 * Used for sites with aggressive bot detection:
 * - Intercom-powered pages (help.openai.com)
 * - Next.js apps with bot detection (grok.com)
 */
export class StealthScraper implements Scraper {
  readonly name = "StealthScraper";
  private browser: Browser | null = null;

  async scrape(source: Source): Promise<ScrapeResult> {
    const config = parseSelectorConfig(source);

    try {
      // Initialize browser with stealth settings
      if (!this.browser) {
        this.browser = await puppeteer.launch({
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-blink-features=AutomationControlled",
            "--disable-infobars",
            "--window-size=1920,1080",
          ],
        });
      }

      const page = await this.browser!.newPage();

      try {
        // Set viewport and user agent
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent(
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        );

        // Extra evasions for Intercom and other detection systems
        await page.evaluateOnNewDocument(() => {
          // Hide webdriver property
          Object.defineProperty(navigator, "webdriver", {
            get: () => undefined,
          });

          // Fake plugins array
          Object.defineProperty(navigator, "plugins", {
            get: () => [1, 2, 3, 4, 5],
          });

          // Fake languages
          Object.defineProperty(navigator, "languages", {
            get: () => ["en-US", "en"],
          });

          // Fake chrome runtime
          (window as unknown as Record<string, unknown>).chrome = {
            runtime: {},
          };
        });

        // Navigate with extended timeout
        await page.goto(source.url, {
          waitUntil: "networkidle2",
          timeout: 45000,
        });

        // Wait for content selector if specified
        if (config.waitForSelector) {
          await page.waitForSelector(config.waitForSelector, {
            timeout: 15000,
          });
        }

        // Allow time for JavaScript hydration
        await new Promise((r) => setTimeout(r, 2000));

        // Extract entries
        const entries = await this.extractEntries(page, config, source.url);

        return { success: true, entries };
      } finally {
        await page.close();
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
   * Extract changelog entries from the page
   */
  private async extractEntries(
    page: Page,
    config: SelectorConfig,
    baseUrl: string
  ): Promise<ParsedEntry[]> {
    // If no entry selector, extract main content as single entry
    if (!config.entrySelector) {
      const contentSelector = config.contentSelector || "main, article, body";

      const result = await page.evaluate((selector: string) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        return {
          content: el.textContent?.trim() || "",
          contentHtml: el.innerHTML,
        };
      }, contentSelector);

      if (!result || !result.content) {
        return [];
      }

      return [
        {
          content: result.content,
          contentHtml: result.contentHtml,
          url: baseUrl,
        },
      ];
    }

    // Extract multiple entries using selectors
    const entries = await page.evaluate(
      (cfg: SelectorConfig, base: string) => {
        const results: Array<{
          publishedDate?: string;
          title?: string;
          content: string;
          contentHtml?: string;
          url?: string;
        }> = [];

        const entryElements = document.querySelectorAll(
          cfg.entrySelector || "body"
        );

        entryElements.forEach((el) => {
          // Extract date
          let publishedDate: string | undefined;
          if (cfg.dateSelector) {
            const dateEl = el.querySelector(cfg.dateSelector);
            if (dateEl) {
              publishedDate =
                dateEl.getAttribute("datetime") ||
                dateEl.textContent?.trim() ||
                undefined;
            }
          }

          // Extract title
          let title: string | undefined;
          if (cfg.titleSelector) {
            const titleEl = el.querySelector(cfg.titleSelector);
            if (titleEl) {
              title = titleEl.textContent?.trim() || undefined;
            }
          }

          // Extract content
          let content = "";
          let contentHtml: string | undefined;
          if (cfg.contentSelector) {
            const contentEl = el.querySelector(cfg.contentSelector);
            if (contentEl) {
              content = contentEl.textContent?.trim() || "";
              contentHtml = contentEl.innerHTML;
            }
          } else {
            content = el.textContent?.trim() || "";
            contentHtml = el.innerHTML;
          }

          // Extract link
          let url: string | undefined;
          if (cfg.linkSelector) {
            const linkEl = el.querySelector(cfg.linkSelector) as HTMLAnchorElement;
            if (linkEl?.href) {
              try {
                url = new URL(linkEl.href, base).toString();
              } catch {
                // Invalid URL, skip
              }
            }
          }

          // Skip empty entries
          if (content) {
            results.push({
              publishedDate,
              title,
              content,
              contentHtml,
              url,
            });
          }
        });

        return results;
      },
      config,
      baseUrl
    );

    // Parse dates from strings
    return entries.map((entry) => ({
      ...entry,
      publishedDate: entry.publishedDate
        ? this.parseDate(entry.publishedDate)
        : undefined,
    }));
  }

  /**
   * Parse date string to Date object
   */
  private parseDate(dateStr: string): Date | undefined {
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? undefined : parsed;
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
