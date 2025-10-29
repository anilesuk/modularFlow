import puppeteer from "puppeteer";
import type { JobPosting } from "@shared/schema";
import { execSync } from "child_process";

export class ScraperService {
  private chromiumPath: string;

  constructor() {
    try {
      this.chromiumPath = execSync('which chromium', { encoding: 'utf-8' }).trim();
      console.log(`Found Chromium at: ${this.chromiumPath}`);
    } catch (error) {
      console.error('Failed to find Chromium, will use default Puppeteer browser');
      this.chromiumPath = '';
    }
  }
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

      // Extract text content and HTML using string evaluation to avoid transpilation issues
      const data = await page.evaluate(`(function() {
        function getTextBySelectors(selectors) {
          for (var i = 0; i < selectors.length; i++) {
            var element = document.querySelector(selectors[i]);
            if (element && element.textContent) {
              return element.textContent.trim();
            }
          }
          return "";
        }

        var company = getTextBySelectors([
          '[class*="company"]',
          '[class*="employer"]',
          '[data-testid*="company"]',
          'h1 + div',
          'meta[property="og:site_name"]'
        ]);
        
        if (!company) {
          var metaCompany = document.querySelector('meta[property="og:site_name"]');
          if (metaCompany) {
            company = metaCompany.getAttribute('content') || "";
          }
        }

        var role = getTextBySelectors([
          'h1',
          '[class*="title"]',
          '[class*="job-title"]',
          '[data-testid*="title"]',
          'meta[property="og:title"]'
        ]);
        
        if (!role) {
          var metaRole = document.querySelector('meta[property="og:title"]');
          if (metaRole) {
            role = metaRole.getAttribute('content') || "";
          }
        }

        var location = getTextBySelectors([
          '[class*="location"]',
          '[class*="city"]',
          '[data-testid*="location"]'
        ]);

        var description = getTextBySelectors([
          '[class*="description"]',
          '[class*="job-description"]',
          '[class*="content"]',
          'main',
          'article',
          'body'
        ]);
        
        if (!description && document.body.textContent) {
          description = document.body.textContent;
        }

        return {
          company: company || "",
          role: role || "",
          location: location || "",
          description: description ? description.substring(0, 10000) : "",
          rawHtml: document.documentElement.innerHTML
        };
      })()`);

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
