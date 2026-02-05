# Danish Tech Jobs - Local Scraper

A local web application that scrapes job listings from 140+ Danish tech company career pages on-demand.

## Features

- Search job openings across 140+ Danish tech companies
- On-demand scraping - always get fresh results
- Runs locally on your machine - no API keys or external services
- Clean web UI with real-time progress updates
- Docker support for easy distribution

## Quick Start

### Option 1: Run with Node.js

#### Prerequisites

1. **Install Node.js** (version 18 or higher)
   - **macOS**:
     ```bash
     # Using Homebrew (recommended)
     brew install node

     # Or download from https://nodejs.org/
     ```
   - **Windows**: Download installer from https://nodejs.org/
   - **Linux (Ubuntu/Debian)**:
     ```bash
     curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
     sudo apt-get install -y nodejs
     ```

2. **Verify installation**:
   ```bash
   node --version   # Should show v18.x.x or higher
   npm --version    # Should show 9.x.x or higher
   ```

#### Installation

1. **Clone or download this repository**:
   ```bash
   git clone https://github.com/polgarp/tech-roles-in-dk.git
   cd tech-roles-in-dk
   ```

2. **Install project dependencies**:
   ```bash
   npm install
   ```
   This downloads Express (web server) and Playwright (browser automation) into the `node_modules/` folder.

3. **Install the Chromium browser for Playwright** (first time only):
   ```bash
   npx playwright install chromium
   ```
   This downloads a headless Chromium browser (~150MB) that Playwright uses for scraping.

4. **Start the server**:
   ```bash
   npm start
   ```
   You should see: `Server running at http://localhost:3000`

5. **Open your browser** and go to: http://localhost:3000

#### Stopping the server

Press `Ctrl+C` in the terminal to stop the server.

### Option 2: Run with Docker

If you have Docker installed, this is the simplest option:

```bash
# Build and start
docker-compose up

# Or run in background
docker-compose up -d

# Stop
docker-compose down
```

Open http://localhost:3000 in your browser.

## How It Works

1. Enter a keyword (e.g., "designer", "engineer", "product")
2. Optionally filter by a specific company
3. The app scrapes all career pages in batches of 5
4. Results appear progressively as each batch completes
5. Click any job to view the full listing

**Search time**: ~3-5 minutes for all 140+ companies

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

| Platform | Example URL | Notes |
|----------|-------------|-------|
| `teamtailor` | careers.*.com, jobs.*.app | Danish startups often use this |
| `lever` | jobs.lever.co/* | US-based companies |
| `workable` | apply.workable.com/* | Common in EU |
| `greenhouse` | boards.greenhouse.io/* | Enterprise companies |
| `ashby` | jobs.ashbyhq.com/* | Modern startups |
| `recruitee` | *.recruitee.com | European ATS |
| `custom` | Any other career page | Uses generic selectors |

## Project Structure

```
tech-roles-in-dk/
├── package.json           # Node.js project config and dependencies
├── sites.json             # Company list (name, URL, platform type)
├── server.js              # Express web server and API endpoints
├── scraper.js             # Playwright browser automation and scraping logic
├── public/                # Static frontend files served by Express
│   ├── index.html         # Main HTML page structure
│   ├── styles.css         # CSS styling (Danish flag theme)
│   └── app.js             # Frontend JavaScript (search, SSE handling)
├── Dockerfile             # Docker image build instructions
├── docker-compose.yml     # Docker Compose config for easy startup
└── README.md              # This file
```

### Key Files Explained

#### `sites.json`
The single source of truth for companies to scrape. Each entry has:
- `name`: Display name shown in UI
- `careerUrl`: Direct URL to the company's job listings page
- `platform`: Which scraping strategy to use (affects CSS selectors)

#### `scraper.js`
Contains the `JobScraper` class with:
- `initialize()` / `close()`: Manage Playwright browser lifecycle
- `scrapeCompany(company, keyword)`: Scrape a single company's career page
- `scrapeAll(keyword, options)`: Orchestrate batch scraping with progress callbacks
- Platform-specific methods: `scrapeTeamtailor()`, `scrapeLever()`, etc.

**To add a new platform**: Add a new `scrape[Platform]()` method and update the switch statement in `scrapeCompany()`.

#### `server.js`
Express server with endpoints:
- `GET /api/companies`: Returns `sites.json` content
- `GET /api/search`: Server-Sent Events (SSE) endpoint for real-time progress
- Static file serving from `public/`

**SSE events emitted**: `progress`, `results`, `error`, `complete`

#### `public/app.js`
Frontend JavaScript that:
- Fetches company list on load
- Manages search form submission
- Handles SSE connection for real-time updates
- Renders job results with links

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Browser (localhost:3000)              │
│  ┌─────────────────────────────────────────────────┐   │
│  │  public/index.html + app.js                      │   │
│  │  - Search form                                   │   │
│  │  - Company filter dropdown                       │   │
│  │  - Progress bar (SSE updates)                    │   │
│  │  - Results list                                  │   │
│  └──────────────────────┬──────────────────────────┘   │
└─────────────────────────┼───────────────────────────────┘
                          │ HTTP / Server-Sent Events
┌─────────────────────────┼───────────────────────────────┐
│  server.js (Express)    │                               │
│  ┌──────────────────────▼──────────────────────────┐   │
│  │  GET /api/search?q=keyword                       │   │
│  │  - Creates SSE connection                        │   │
│  │  - Calls scraper.scrapeAll()                     │   │
│  │  - Streams progress/results back to client       │   │
│  └──────────────────────┬──────────────────────────┘   │
│                         │                               │
│  ┌──────────────────────▼──────────────────────────┐   │
│  │  scraper.js (JobScraper)                         │   │
│  │  - Launches headless Chromium via Playwright     │   │
│  │  - Batches companies (5 at a time)               │   │
│  │  - Applies platform-specific scraping logic      │   │
│  │  - Returns: { title, company, url, location }    │   │
│  └──────────────────────┬──────────────────────────┘   │
└─────────────────────────┼───────────────────────────────┘
                          │ HTTP requests
                          ▼
            ┌─────────────────────────────┐
            │  Company Career Pages       │
            │  (Greenhouse, Lever, etc.)  │
            └─────────────────────────────┘
```

### Extending the Project

**Add a new scraping platform:**
1. Add a new method in `scraper.js`: `async scrape[Platform](page, keyword) { ... }`
2. Update the switch in `scrapeCompany()` to call your new method
3. Add companies using that platform to `sites.json`

**Improve scraping reliability:**
- Increase timeouts in `scraper.js` for slow-loading pages
- Add retry logic in `scrapeCompany()` for failed requests
- Implement user-agent rotation to avoid bot detection

**Add new features:**
- Location filtering: Parse location from job listings, add filter to UI
- Caching: Store results with TTL to avoid re-scraping recently checked sites
- Export: Add CSV/JSON export button in the UI

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Serves the web UI |
| `/api/companies` | GET | Returns list of all companies (JSON) |
| `/api/search?q=keyword` | GET | Search jobs across all companies (SSE stream) |
| `/api/search?q=keyword&company=Pleo` | GET | Search specific company only |
| `/api/search?q=keyword&batchSize=10` | GET | Customize parallel batch size |

### SSE Response Format

The `/api/search` endpoint returns Server-Sent Events:

```
event: progress
data: {"completed": 5, "total": 143, "currentBatch": ["Pleo", "Lunar", "Unity"]}

event: results
data: {"company": "Pleo", "jobs": [{"title": "Senior Designer", "url": "..."}]}

event: complete
data: {"totalJobs": 42, "companiesSearched": 143}
```

## Troubleshooting

### "Cannot find module 'playwright'"
Run `npm install` to install dependencies.

### "Browser not found" or "Executable doesn't exist"
Run `npx playwright install chromium` to download the browser.

### "EACCES permission denied"
On Linux/macOS, you may need to fix npm permissions:
```bash
sudo chown -R $(whoami) ~/.npm
```

### Some sites return no results
Career pages change their HTML structure. The scraper uses common selectors but may need updates. Check the browser console for errors, or add custom selectors for that site in `scraper.js`.

### Slow search
The app scrapes 5 sites in parallel by default. Increase batch size for faster (but more resource-intensive) searches:
```
/api/search?q=keyword&batchSize=10
```

### "Request blocked" or empty results from some sites
Some sites have bot protection. The scraper includes basic countermeasures, but heavily protected sites may not work. Consider adding delays or user-agent rotation in `scraper.js`.

## Company Categories

The 143 companies in `sites.json` include:

| Category | Examples |
|----------|----------|
| **Danish Unicorns** | Pleo, Trustpilot, Lunar, Too Good To Go |
| **Big Tech (DK offices)** | Microsoft, Google, Meta, Spotify |
| **Gaming Studios** | IO Interactive, SYBO Games, Tactile Games |
| **Pharma/Biotech** | Novo Nordisk, Lundbeck, LEO Pharma, Genmab |
| **Fintech** | Saxo Bank, Danske Bank, Nordea, Flatpay |
| **Design Agencies** | Designit, Kontrapunkt, Signifly, BIG |
| **Consulting** | McKinsey, BCG, Deloitte, Accenture |
| **Robotics (Odense)** | Universal Robots, MiR |
| **Industrial** | Danfoss, Grundfos, Vestas, Maersk |

## License

MIT
