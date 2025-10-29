import puppeteer from "puppeteer";
import type { JobPosting } from "@shared/schema";

export class ScraperService {
  /**
   * Scrape job posting details from a URL
   */
  async scrapeJobPosting(url: string): Promise<{
    company: string;
    role: string;
    location: string | null;
    description: string;
    rawHtml: string;
  }> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });

      // Extract text content and HTML
      const data = await page.evaluate(() => {
        // Common selectors for job postings
        const getTextBySelectors = (selectors: string[]): string => {
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent) {
              return element.textContent.trim();
            }
          }
          return "";
        };

        // Try to find company name
        const company = getTextBySelectors([
          '[class*="company"]',
          '[class*="employer"]',
          '[data-testid*="company"]',
          'h1 + div',
          'meta[property="og:site_name"]',
        ]) || document.querySelector('meta[property="og:site_name"]')?.getAttribute('content') || "";

        // Try to find role/title
        const role = getTextBySelectors([
          'h1',
          '[class*="title"]',
          '[class*="job-title"]',
          '[data-testid*="title"]',
          'meta[property="og:title"]',
        ]) || document.querySelector('meta[property="og:title"]')?.getAttribute('content') || "";

        // Try to find location
        const location = getTextBySelectors([
          '[class*="location"]',
          '[class*="city"]',
          '[data-testid*="location"]',
        ]);

        // Get main content - try to find job description
        const description = getTextBySelectors([
          '[class*="description"]',
          '[class*="job-description"]',
          '[class*="content"]',
          'main',
          'article',
          'body',
        ]) || document.body.textContent || "";

        return {
          company,
          role,
          location,
          description: description.substring(0, 10000), // Limit to 10k chars
          rawHtml: document.documentElement.innerHTML,
        };
      });

      // Clean up the extracted data
      const cleanText = (text: string) => text.replace(/\s+/g, " ").trim();

      return {
        company: cleanText(data.company) || "Unknown Company",
        role: cleanText(data.role) || "Unknown Role",
        location: data.location ? cleanText(data.location) : null,
        description: cleanText(data.description),
        rawHtml: data.rawHtml,
      };
    } finally {
      await browser.close();
    }
  }
}

export const scraper = new ScraperService();
