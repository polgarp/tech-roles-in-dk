const { chromium } = require('playwright');

// Platform-specific scraping strategies
const platformScrapers = {
  // Teamtailor job boards (careers.*.com, jobs.*.app)
  teamtailor: async (page, keyword) => {
    await page.waitForSelector('[class*="job"], [class*="position"], [data-testid*="job"]', { timeout: 10000 }).catch(() => {});

    return await page.evaluate((kw) => {
      const jobs = [];
      const keyword = kw.toLowerCase();

      // Common Teamtailor selectors
      const jobElements = document.querySelectorAll(
        '[class*="job-item"], [class*="position-item"], li[class*="job"], ' +
        'a[href*="/jobs/"], div[data-testid*="job"]'
      );

      jobElements.forEach(el => {
        const titleEl = el.querySelector('h2, h3, [class*="title"], [class*="name"]');
        const linkEl = el.tagName === 'A' ? el : el.querySelector('a');

        if (titleEl && linkEl) {
          const title = titleEl.textContent.trim();
          const url = linkEl.href;

          if (title.toLowerCase().includes(keyword) || keyword === '') {
            jobs.push({ title, url });
          }
        }
      });

      return jobs;
    }, keyword);
  },

  // Lever job boards (jobs.lever.co)
  lever: async (page, keyword) => {
    await page.waitForSelector('.posting', { timeout: 10000 }).catch(() => {});

    return await page.evaluate((kw) => {
      const jobs = [];
      const keyword = kw.toLowerCase();

      document.querySelectorAll('.posting').forEach(el => {
        const titleEl = el.querySelector('.posting-title h5, .posting-title');
        const linkEl = el.querySelector('a.posting-title, a');

        if (titleEl) {
          const title = titleEl.textContent.trim();
          const url = linkEl ? linkEl.href : '';

          if (title.toLowerCase().includes(keyword) || keyword === '') {
            jobs.push({ title, url });
          }
        }
      });

      return jobs;
    }, keyword);
  },

  // Workable job boards (apply.workable.com)
  workable: async (page, keyword) => {
    await page.waitForSelector('[data-ui="job"]', { timeout: 10000 }).catch(() => {});

    return await page.evaluate((kw) => {
      const jobs = [];
      const keyword = kw.toLowerCase();

      document.querySelectorAll('[data-ui="job"], li[class*="job"]').forEach(el => {
        const titleEl = el.querySelector('h3, [data-ui="job-title"], [class*="title"]');
        const linkEl = el.querySelector('a');

        if (titleEl) {
          const title = titleEl.textContent.trim();
          const url = linkEl ? linkEl.href : '';

          if (title.toLowerCase().includes(keyword) || keyword === '') {
            jobs.push({ title, url });
          }
        }
      });

      return jobs;
    }, keyword);
  },

  // Greenhouse job boards
  greenhouse: async (page, keyword) => {
    await page.waitForSelector('.opening, [class*="job"]', { timeout: 10000 }).catch(() => {});

    return await page.evaluate((kw) => {
      const jobs = [];
      const keyword = kw.toLowerCase();

      document.querySelectorAll('.opening, [class*="job-post"], [class*="job-listing"]').forEach(el => {
        const titleEl = el.querySelector('a, h3, h4, [class*="title"]');
        const linkEl = el.querySelector('a');

        if (titleEl) {
          const title = titleEl.textContent.trim();
          const url = linkEl ? linkEl.href : '';

          if (title.toLowerCase().includes(keyword) || keyword === '') {
            jobs.push({ title, url });
          }
        }
      });

      return jobs;
    }, keyword);
  },

  // Ashby job boards
  ashby: async (page, keyword) => {
    await page.waitForSelector('[class*="ashby"], [class*="job"]', { timeout: 10000 }).catch(() => {});

    return await page.evaluate((kw) => {
      const jobs = [];
      const keyword = kw.toLowerCase();

      document.querySelectorAll('a[href*="/jobs/"], [class*="job-posting"], [class*="position"]').forEach(el => {
        const titleEl = el.querySelector('h3, h4, [class*="title"]') || el;
        const linkEl = el.tagName === 'A' ? el : el.querySelector('a');

        if (titleEl && titleEl.textContent) {
          const title = titleEl.textContent.trim();
          const url = linkEl ? linkEl.href : '';

          if (title.toLowerCase().includes(keyword) || keyword === '') {
            jobs.push({ title, url });
          }
        }
      });

      return jobs;
    }, keyword);
  },

  // Recruitee job boards
  recruitee: async (page, keyword) => {
    await page.waitForSelector('.job-item, [class*="vacancy"]', { timeout: 10000 }).catch(() => {});

    return await page.evaluate((kw) => {
      const jobs = [];
      const keyword = kw.toLowerCase();

      document.querySelectorAll('.job-item, [class*="vacancy"], [class*="job-offer"]').forEach(el => {
        const titleEl = el.querySelector('h2, h3, [class*="title"], a');
        const linkEl = el.querySelector('a');

        if (titleEl) {
          const title = titleEl.textContent.trim();
          const url = linkEl ? linkEl.href : '';

          if (title.toLowerCase().includes(keyword) || keyword === '') {
            jobs.push({ title, url });
          }
        }
      });

      return jobs;
    }, keyword);
  },

  // Generic/custom scraper - tries multiple common patterns
  custom: async (page, keyword) => {
    // Wait for any job-like content to load
    await page.waitForTimeout(3000);

    return await page.evaluate((kw) => {
      const jobs = [];
      const keyword = kw.toLowerCase();
      const seenUrls = new Set();

      // Try multiple common selectors
      const selectors = [
        // Job listing containers
        '[class*="job-item"]', '[class*="job-listing"]', '[class*="job-post"]',
        '[class*="position-item"]', '[class*="vacancy"]', '[class*="opening"]',
        '[class*="career-item"]', '[class*="role-item"]',
        // Links that look like jobs
        'a[href*="/job"]', 'a[href*="/position"]', 'a[href*="/career"]',
        'a[href*="/vacancy"]', 'a[href*="/opening"]', 'a[href*="/apply"]',
        // List items in career sections
        '.careers li', '.jobs li', '.positions li', '.openings li',
        // Data attributes
        '[data-job]', '[data-position]', '[data-role]'
      ];

      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          let title = '';
          let url = '';

          // Try to extract title
          const titleEl = el.querySelector('h1, h2, h3, h4, [class*="title"], [class*="name"]');
          if (titleEl) {
            title = titleEl.textContent.trim();
          } else if (el.tagName === 'A') {
            title = el.textContent.trim();
          }

          // Try to extract URL
          const linkEl = el.tagName === 'A' ? el : el.querySelector('a');
          if (linkEl && linkEl.href) {
            url = linkEl.href;
          }

          // Filter and deduplicate
          if (title && url && !seenUrls.has(url) && title.length > 3 && title.length < 200) {
            if (title.toLowerCase().includes(keyword) || keyword === '') {
              seenUrls.add(url);
              jobs.push({ title, url });
            }
          }
        });
      });

      return jobs;
    }, keyword);
  }
};

class JobScraper {
  constructor() {
    this.browser = null;
  }

  async init() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async scrapeCompany(company, keyword) {
    const context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    try {
      console.log(`Scraping ${company.name}...`);

      await page.goto(company.careerUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      // Get the appropriate scraper for this platform
      const scraper = platformScrapers[company.platform] || platformScrapers.custom;
      const jobs = await scraper(page, keyword);

      // Add company name to each job
      return jobs.map(job => ({
        ...job,
        company: company.name,
        careerPageUrl: company.careerUrl
      }));

    } catch (error) {
      console.error(`Error scraping ${company.name}:`, error.message);
      return [];
    } finally {
      await context.close();
    }
  }

  async scrapeAll(companies, keyword, batchSize = 5, onProgress = null) {
    await this.init();

    const allJobs = [];
    const batches = [];

    // Split companies into batches
    for (let i = 0; i < companies.length; i += batchSize) {
      batches.push(companies.slice(i, i + batchSize));
    }

    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      // Scrape batch in parallel
      const batchResults = await Promise.all(
        batch.map(company => this.scrapeCompany(company, keyword))
      );

      // Flatten and collect results
      const batchJobs = batchResults.flat();
      allJobs.push(...batchJobs);

      // Report progress
      if (onProgress) {
        onProgress({
          completedBatches: i + 1,
          totalBatches: batches.length,
          completedCompanies: Math.min((i + 1) * batchSize, companies.length),
          totalCompanies: companies.length,
          jobsFound: allJobs.length,
          latestJobs: batchJobs
        });
      }
    }

    return allJobs;
  }
}

module.exports = { JobScraper };
