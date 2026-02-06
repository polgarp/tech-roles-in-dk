const express = require('express');
const path = require('path');
const fs = require('fs');
const { JobScraper } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Load companies from sites.json (handles both flat and categorized formats)
function loadCompanies() {
  const sitesPath = path.join(__dirname, 'sites.json');
  const data = fs.readFileSync(sitesPath, 'utf8');
  const json = JSON.parse(data);

  // Support categorized format
  if (json.categories) {
    const companies = [];
    json.categories.forEach(category => {
      category.companies.forEach(company => {
        companies.push({
          ...company,
          category: category.name
        });
      });
    });
    return companies;
  }

  // Fallback to flat format
  return json.companies;
}

// Load categories from sites.json
function loadCategories() {
  const sitesPath = path.join(__dirname, 'sites.json');
  const data = fs.readFileSync(sitesPath, 'utf8');
  const json = JSON.parse(data);
  return json.categories || null;
}

// API: Get list of companies
app.get('/api/companies', (req, res) => {
  try {
    const companies = loadCompanies();
    const categories = loadCategories();
    res.json({
      count: companies.length,
      companies: companies.map(c => ({
        name: c.name,
        careerUrl: c.careerUrl,
        platform: c.platform,
        category: c.category
      })),
      categories: categories
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load companies' });
  }
});

// API: Search jobs (Server-Sent Events for progress updates)
app.get('/api/search', async (req, res) => {
  const keyword = req.query.q || '';
  const companyFilter = req.query.company || '';
  const batchSize = parseInt(req.query.batchSize) || 5;

  // Set up Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const scraper = new JobScraper();

  try {
    let companies = loadCompanies();

    // Filter by company if specified
    if (companyFilter) {
      companies = companies.filter(c =>
        c.name.toLowerCase().includes(companyFilter.toLowerCase())
      );
    }

    // Send initial info
    res.write(`data: ${JSON.stringify({
      type: 'start',
      totalCompanies: companies.length,
      keyword,
      companyFilter
    })}\n\n`);

    // Scrape with progress updates
    const allJobs = await scraper.scrapeAll(companies, keyword, batchSize, (progress) => {
      res.write(`data: ${JSON.stringify({
        type: 'progress',
        ...progress
      })}\n\n`);
    });

    // Send final results
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      jobs: allJobs,
      totalJobs: allJobs.length
    })}\n\n`);

  } catch (error) {
    res.write(`data: ${JSON.stringify({
      type: 'error',
      message: error.message
    })}\n\n`);
  } finally {
    await scraper.close();
    res.end();
  }
});

// API: Quick search (returns all at once, no streaming)
app.get('/api/search-sync', async (req, res) => {
  const keyword = req.query.q || '';
  const companyFilter = req.query.company || '';
  const batchSize = parseInt(req.query.batchSize) || 5;

  const scraper = new JobScraper();

  try {
    let companies = loadCompanies();

    if (companyFilter) {
      companies = companies.filter(c =>
        c.name.toLowerCase().includes(companyFilter.toLowerCase())
      );
    }

    const jobs = await scraper.scrapeAll(companies, keyword, batchSize);

    res.json({
      keyword,
      companyFilter,
      totalJobs: jobs.length,
      jobs
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await scraper.close();
  }
});

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   🇩🇰 Danish Tech Jobs - Local Scraper                  ║
║                                                        ║
║   Server running at: http://localhost:${PORT}             ║
║                                                        ║
║   Open this URL in your browser to start searching!    ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
  `);
});
