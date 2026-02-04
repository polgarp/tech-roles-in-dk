// =============================================================================
// Danish Tech Jobs - Site List Loader
// Search is handled by Google Programmable Search Engine embed widget
// =============================================================================

const sitesList = document.getElementById('sites-list');

// =============================================================================
// INITIALIZATION
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  loadSites();
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
// UTILITIES
// =============================================================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
