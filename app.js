// =============================================================================
// CONFIGURATION - Update these after setting up Google Programmable Search Engine
// =============================================================================

const CONFIG = {
  // Get your API key from: https://console.cloud.google.com/apis/credentials
  // Enable "Custom Search API" first: https://console.cloud.google.com/apis/library/customsearch.googleapis.com
  API_KEY: 'AIzaSyABUond_k3U0Q6gdrxrr5rxOkIPQNUCwto',

  // Get your Search Engine ID from: https://programmablesearchengine.google.com/
  // It looks like: "a1b2c3d4e5f6g7h8i" or similar
  SEARCH_ENGINE_ID: 'a087d68a8e1ef4449',

  // Number of results per page (max 10 for Google API)
  RESULTS_PER_PAGE: 10
};

// =============================================================================
// STATE
// =============================================================================

let currentQuery = '';
let currentPage = 1;

// =============================================================================
// DOM ELEMENTS
// =============================================================================

const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const resultsSection = document.getElementById('results-section');
const resultsContainer = document.getElementById('results-container');
const paginationContainer = document.getElementById('pagination');
const sitesList = document.getElementById('sites-list');

// =============================================================================
// INITIALIZATION
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  loadSites();
  searchForm.addEventListener('submit', handleSearch);
});

// =============================================================================
// LOAD SITES FROM ANNOTATIONS.XML
// =============================================================================

async function loadSites() {
  try {
    const response = await fetch('annotations.xml');
    if (!response.ok) throw new Error('Failed to load annotations.xml');

    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    const annotations = xmlDoc.querySelectorAll('Annotation');
    const sites = [];

    annotations.forEach(annotation => {
      const displayNameEl = annotation.querySelector('AdditionalData[attribute="display_name"]');
      const hrefEl = annotation.querySelector('AdditionalData[attribute="href"]');

      if (displayNameEl && hrefEl) {
        sites.push({
          name: displayNameEl.getAttribute('value'),
          url: hrefEl.getAttribute('value')
        });
      }
    });

    // Sort alphabetically
    sites.sort((a, b) => a.name.localeCompare(b.name));

    renderSitesList(sites);
  } catch (error) {
    console.error('Error loading sites:', error);
    sitesList.innerHTML = '<li class="error">Failed to load sites. Check console for details.</li>';
  }
}

function renderSitesList(sites) {
  if (sites.length === 0) {
    sitesList.innerHTML = '<li>No sites configured.</li>';
    return;
  }

  sitesList.innerHTML = sites.map(site => `
    <li>
      <a href="${escapeHtml(site.url)}" target="_blank" rel="noopener">
        ${escapeHtml(site.name)}
      </a>
    </li>
  `).join('');
}

// =============================================================================
// SEARCH FUNCTIONALITY
// =============================================================================

async function handleSearch(event) {
  event.preventDefault();

  const query = searchInput.value.trim();
  if (!query) return;

  // Check configuration
  if (CONFIG.API_KEY === 'YOUR_API_KEY_HERE' || CONFIG.SEARCH_ENGINE_ID === 'YOUR_SEARCH_ENGINE_ID_HERE') {
    showError('Please configure your Google API key and Search Engine ID in app.js');
    return;
  }

  currentQuery = query;
  currentPage = 1;
  await performSearch();
}

async function performSearch() {
  showLoading();

  try {
    const startIndex = (currentPage - 1) * CONFIG.RESULTS_PER_PAGE + 1;
    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', CONFIG.API_KEY);
    url.searchParams.set('cx', CONFIG.SEARCH_ENGINE_ID);
    url.searchParams.set('q', currentQuery);
    url.searchParams.set('start', startIndex);
    url.searchParams.set('num', CONFIG.RESULTS_PER_PAGE);

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'Search API error');
    }

    renderResults(data);
  } catch (error) {
    console.error('Search error:', error);
    showError(`Search failed: ${error.message}`);
  }
}

function showLoading() {
  resultsSection.classList.remove('hidden');
  resultsContainer.innerHTML = '<div class="loading-message">Searching...</div>';
  paginationContainer.innerHTML = '';
  searchButton.disabled = true;
}

function showError(message) {
  resultsSection.classList.remove('hidden');
  resultsContainer.innerHTML = `<div class="error-message">${escapeHtml(message)}</div>`;
  paginationContainer.innerHTML = '';
  searchButton.disabled = false;
}

function renderResults(data) {
  searchButton.disabled = false;
  resultsSection.classList.remove('hidden');

  const items = data.items || [];
  const totalResults = data.searchInformation?.totalResults || 0;

  if (items.length === 0) {
    resultsContainer.innerHTML = `
      <div class="no-results">
        No results found for "${escapeHtml(currentQuery)}".
        Try a different search term or browse the career pages below.
      </div>
    `;
    paginationContainer.innerHTML = '';
    return;
  }

  resultsContainer.innerHTML = items.map(item => `
    <div class="result-item">
      <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener">
        ${escapeHtml(item.title)}
      </a>
      <div class="result-url">${escapeHtml(item.displayLink)}</div>
      <p class="result-snippet">${item.htmlSnippet || escapeHtml(item.snippet || '')}</p>
    </div>
  `).join('');

  renderPagination(totalResults);
}

function renderPagination(totalResults) {
  const totalPages = Math.min(Math.ceil(totalResults / CONFIG.RESULTS_PER_PAGE), 10); // Google limits to 100 results

  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }

  let html = '';

  if (currentPage > 1) {
    html += `<button onclick="goToPage(${currentPage - 1})">Previous</button>`;
  }

  html += `<span>Page ${currentPage} of ${totalPages}</span>`;

  if (currentPage < totalPages) {
    html += `<button onclick="goToPage(${currentPage + 1})">Next</button>`;
  }

  paginationContainer.innerHTML = html;
}

async function goToPage(page) {
  currentPage = page;
  await performSearch();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Make goToPage available globally for onclick handlers
window.goToPage = goToPage;

// =============================================================================
// UTILITIES
// =============================================================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
