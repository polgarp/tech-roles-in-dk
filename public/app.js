// DOM Elements
const searchForm = document.getElementById('search-form');
const keywordInput = document.getElementById('keyword-input');
const searchButton = document.getElementById('search-button');
const companyFilter = document.getElementById('company-filter');
const companyCount = document.getElementById('company-count');
const progressSection = document.getElementById('progress-section');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const resultsSection = document.getElementById('results-section');
const resultsCount = document.getElementById('results-count');
const resultsContainer = document.getElementById('results-container');
const companiesList = document.getElementById('companies-list');

// State
let companies = [];
let currentSearch = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadCompanies();
  searchForm.addEventListener('submit', handleSearch);
});

// Load companies from API
async function loadCompanies() {
  try {
    const response = await fetch('/api/companies');
    const data = await response.json();
    companies = data.companies;

    // Update company filter dropdown
    companyFilter.innerHTML = '<option value="">All companies</option>';
    companies.forEach(company => {
      const option = document.createElement('option');
      option.value = company.name;
      option.textContent = company.name;
      companyFilter.appendChild(option);
    });

    // Update count
    companyCount.textContent = `${companies.length} companies`;

    // Render company cards
    renderCompanies();

  } catch (error) {
    console.error('Failed to load companies:', error);
    companiesList.innerHTML = '<p class="error-message">Failed to load companies</p>';
  }
}

// Render company cards
function renderCompanies() {
  companiesList.innerHTML = companies.map(company => `
    <a href="${escapeHtml(company.careerUrl)}" target="_blank" rel="noopener" class="company-card">
      ${escapeHtml(company.name)}
    </a>
  `).join('');
}

// Handle search
async function handleSearch(event) {
  event.preventDefault();

  const keyword = keywordInput.value.trim();
  const company = companyFilter.value;

  // Show progress, hide results
  progressSection.classList.remove('hidden');
  resultsSection.classList.remove('hidden');
  resultsContainer.innerHTML = '';
  resultsCount.textContent = '0 jobs found';
  progressFill.style.width = '0%';
  progressText.textContent = 'Starting search...';
  searchButton.disabled = true;

  // Cancel previous search if any
  if (currentSearch) {
    currentSearch.close();
  }

  try {
    // Build search URL
    const params = new URLSearchParams();
    if (keyword) params.set('q', keyword);
    if (company) params.set('company', company);

    // Use Server-Sent Events for progress
    const eventSource = new EventSource(`/api/search?${params}`);
    currentSearch = eventSource;

    const allJobs = [];

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'start') {
        progressText.textContent = `Searching ${data.totalCompanies} companies...`;
      }

      if (data.type === 'progress') {
        const percent = Math.round((data.completedCompanies / data.totalCompanies) * 100);
        progressFill.style.width = `${percent}%`;
        progressText.textContent = `Searched ${data.completedCompanies}/${data.totalCompanies} companies (${data.jobsFound} jobs found)`;

        // Add new jobs to results
        if (data.latestJobs && data.latestJobs.length > 0) {
          allJobs.push(...data.latestJobs);
          renderJobs(allJobs);
        }
      }

      if (data.type === 'complete') {
        progressFill.style.width = '100%';
        progressText.textContent = 'Search complete!';
        resultsCount.textContent = `${data.totalJobs} jobs found`;

        if (data.jobs.length === 0) {
          resultsContainer.innerHTML = `
            <div class="no-results">
              No jobs found for "${escapeHtml(keyword || 'all positions')}".
              Try a different keyword or browse the career pages below.
            </div>
          `;
        }

        eventSource.close();
        currentSearch = null;
        searchButton.disabled = false;

        // Hide progress after a moment
        setTimeout(() => {
          progressSection.classList.add('hidden');
        }, 2000);
      }

      if (data.type === 'error') {
        resultsContainer.innerHTML = `
          <div class="error-message">
            Search failed: ${escapeHtml(data.message)}
          </div>
        `;
        eventSource.close();
        currentSearch = null;
        searchButton.disabled = false;
        progressSection.classList.add('hidden');
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      currentSearch = null;
      searchButton.disabled = false;
      progressSection.classList.add('hidden');
    };

  } catch (error) {
    console.error('Search error:', error);
    resultsContainer.innerHTML = `
      <div class="error-message">
        Search failed: ${escapeHtml(error.message)}
      </div>
    `;
    searchButton.disabled = false;
    progressSection.classList.add('hidden');
  }
}

// Render jobs
function renderJobs(jobs) {
  resultsCount.textContent = `${jobs.length} jobs found`;

  resultsContainer.innerHTML = jobs.map(job => `
    <div class="job-item">
      <div class="job-info">
        <a href="${escapeHtml(job.url)}" target="_blank" rel="noopener" class="job-title">
          ${escapeHtml(job.title)}
        </a>
        <div class="job-company">${escapeHtml(job.company)}</div>
      </div>
      <div class="job-actions">
        <a href="${escapeHtml(job.url)}" target="_blank" rel="noopener" class="job-link">
          View Job
        </a>
        <a href="${escapeHtml(job.careerPageUrl)}" target="_blank" rel="noopener" class="job-link">
          All Jobs
        </a>
      </div>
    </div>
  `).join('');
}

// Utility: Escape HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
