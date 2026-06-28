import puppeteer from "puppeteer";
import type { JobPosting } from "@shared/schema";
import { resolveBrowserExecutablePath } from "./browser";

export class ScraperService {
  private chromiumPath?: string;

  constructor() {
    this.chromiumPath = resolveBrowserExecutablePath();
  }
  /**
   * Scrape raw text content from a job posting URL
   * No parsing or structuring - just extract the raw text for AI to process
   */
  async scrapeJobPosting(url: string): Promise<{
    rawText: string;
    url: string;
    rawHtml: string;
  }> {
    const launchOptions: any = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
      ],
    };

    if (this.chromiumPath) {
      launchOptions.executablePath = this.chromiumPath;
    }

    const browser = await puppeteer.launch(launchOptions);

    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });

      // Extract raw text and HTML - let the AI do the parsing
      const data = await page.evaluate(`(function() {
        var bodyText = document.body.textContent || "";
        var htmlContent = document.documentElement.innerHTML;

        return {
          rawText: bodyText,
          rawHtml: htmlContent
        };
      })()`);

      // Type assertion for evaluated data
      const scrapedData = data as { rawText: string; rawHtml: string };

      // Clean up excessive whitespace while preserving structure
      const cleanText = (text: string) => text.replace(/\s+/g, " ").trim();

      // Limit to 15,000 characters to stay within AI context limits
      // This is sufficient for most job postings while preventing overflow
      const limitedText = cleanText(scrapedData.rawText).substring(0, 15000);

      return {
        rawText: limitedText,
        url: url,
        rawHtml: scrapedData.rawHtml,
      };
    } finally {
      await browser.close();
    }
  }
}

export const scraper = new ScraperService();
