# Danish Tech Jobs - Local Scraper

A local web application that scrapes job listings from Danish tech company career pages on-demand.

## Features

- 🔍 Search job openings across 50+ Danish tech companies
- ⚡ On-demand scraping - always get fresh results
- 🏠 Runs locally on your machine - no API keys or external services
- 📱 Clean web UI with progress updates
- 🐳 Docker support for easy distribution

## Quick Start

### Option 1: Run with Node.js

```bash
# Install dependencies
npm install

# Install Playwright browser (first time only)
npx playwright install chromium

# Start the server
npm start
```

Open http://localhost:3000 in your browser.

### Option 2: Run with Docker

```bash
docker-compose up
```

Open http://localhost:3000 in your browser.

## How It Works

1. Enter a keyword (e.g., "designer", "engineer", "product")
2. Optionally filter by a specific company
3. The app scrapes all career pages in batches of 5
4. Results appear progressively as each batch completes
5. Click any job to view the full listing

**Search time**: ~2-3 minutes for all 50 companies

## Adding Companies

Edit `sites.json` to add or remove companies:

```json
{
  "companies": [
    {
      "name": "Company Name",
      "careerUrl": "https://company.com/careers",
      "platform": "teamtailor"
    }
  ]
}
```

### Supported Platforms

| Platform | Example URL |
|----------|-------------|
| `teamtailor` | careers.*.com, jobs.*.app |
| `lever` | jobs.lever.co/* |
| `workable` | apply.workable.com/* |
| `greenhouse` | boards.greenhouse.io/* |
| `ashby` | jobs.ashbyhq.com/* |
| `recruitee` | *.recruitee.com |
| `custom` | Any other career page |

## Project Structure

```
danish-tech-jobs/
├── package.json      # Dependencies
├── sites.json        # Company list
├── server.js         # Express server
├── scraper.js        # Playwright scraping logic
├── public/
│   ├── index.html    # Web UI
│   ├── styles.css    # Styling
│   └── app.js        # Frontend JavaScript
├── Dockerfile        # Docker build
└── docker-compose.yml
```

## API Endpoints

- `GET /` - Web UI
- `GET /api/companies` - List all companies (JSON)
- `GET /api/search?q=keyword` - Search jobs (Server-Sent Events)
- `GET /api/search?q=keyword&company=Pleo` - Search specific company

## Troubleshooting

### "Cannot find module 'playwright'"
Run `npm install` first.

### "Browser not found"
Run `npx playwright install chromium` to install the browser.

### Some sites return no results
Career pages change their HTML structure. The scraper uses common selectors but may need updates for specific sites.

### Slow search
The app scrapes 5 sites in parallel by default. Increase batch size for faster (but more resource-intensive) searches:
`/api/search?q=keyword&batchSize=10`

## License

MIT
