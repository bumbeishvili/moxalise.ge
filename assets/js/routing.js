// URL parameter navigation functions

/**
 * Updates a URL parameter with the given value without refreshing the page
 * @param {string} param - The parameter name
 * @param {string} value - The parameter value
 */
function updateUrlParam(param, value) {
  if (!param || !value) return;

  // Create URLSearchParams object from the current URL
  const url = new URL(window.location.href);
  const searchParams = url.searchParams;

  // Set the parameter
  searchParams.set(param, value);

  // Update URL without page reload
  window.history.replaceState(null, null, `${url.pathname}?${searchParams.toString()}${url.hash}`);

  // Log for debugging
  console.log(`Updated URL parameter ${param}=${value}`);
}

/**
 * Clears a URL parameter without refreshing the page
 * @param {string} param - The parameter name to clear
 */
function clearUrlParam(param) {
  if (!param) return;

  // Create URLSearchParams object from the current URL
  const url = new URL(window.location.href);
  const searchParams = url.searchParams;

  // Delete the parameter
  searchParams.delete(param);

  // Update URL without page reload
  window.history.replaceState(
    null,
    null,
    searchParams.toString() ?
      `${url.pathname}?${searchParams.toString()}${url.hash}` :
      `${url.pathname}${url.hash}`
  );

  console.log(`Cleared URL parameter ${param}`);
}

/**
 * Gets a parameter value from the URL
 * @param {string} param - The parameter name
 * @returns {string|null} The parameter value or null if not present
 */
function getUrlParam(param) {
  if (!param) return null;

  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

/**
 * Finds an item in the sample data by its ID
 * @param {string} id - The ID to find
 * @returns {Object|null} The found item or null if not found
 */
function findItemById(id) {
  if (!id || !sampleData || !sampleData.length) return null;

  // Find the item with the matching ID
  return sampleData.find(item => item.id === id);
}

/**
 * Finds the index of an item in the sample data by its ID
 * @param {string} id - The ID to find
 * @returns {number} The index of the found item or -1 if not found
 */
function findItemIndexById(id) {
  if (!id || !sampleData || !sampleData.length) return -1;

  // Find the index of the item with the matching ID
  return sampleData.findIndex(item => item.id === id);
}

/**
 * Navigate to and highlight an item by its ID
 * @param {string} id - The ID of the item to navigate to
 * @returns {boolean} True if item was found and navigation performed, false otherwise
 */
function navigateToItemById(id) {
  if (!id) return false;

  console.log(`Attempting to navigate to item with ID: ${id}`);

  // Find the item and its index
  const item = findItemById(id);
  const index = findItemIndexById(id);

  if (!item || index === -1) {
    console.log(`Item with ID ${id} not found`);
    return false;
  }

  if (!item.lat || !item.lon) {
    console.log(`Item with ID ${id} doesn't have valid coordinates`);
    return false;
  }

  console.log(`Found item with ID ${id} at index ${index}`, item);

  // Populate the search input with the ID
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.value = id;

    // Trigger input event to activate any search-related logic
    const inputEvent = new Event('input', { bubbles: true });
    searchInput.dispatchEvent(inputEvent);

    // Show the clear search button if it exists
    const clearSearchBtn = document.getElementById('clearSearch');
    if (clearSearchBtn) {
      clearSearchBtn.style.display = 'block';
    }

    console.log(`Set search input value to: ${id}`);
  }

  // Find the corresponding card and highlight it
  const card = document.querySelector(`.card[data-index="${index}"]`);
  if (card) {
    // Expand the card if it's not already expanded
    if (!card.classList.contains('expanded')) {
      card.classList.add('expanded');
    }

    // Scroll the card into view
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Use the MAX_ZOOM_LEVEL constant from map.js
  // Default zoom level is 12, but never exceed the maximum
  const zoomLevel = Math.min(12, MAX_ZOOM_LEVEL);

  // Fly to the location
  map.flyTo({
    center: [item.lon, item.lat],
    zoom: zoomLevel,
  });

  // Give the map time to load before highlighting
  setTimeout(() => {
    // Check if map is ready
    if (isMapReady(map)) {
      console.log(`Highlighting polygon with index ${index}`);
      highlightPolygon(map, index);
    } else {
      console.log('Map not ready, will retry with increasing delays');

      // Try to ensure map has required layers
      const layersEnsured = ensureMapLayers(map);
      console.log(`Map layers ensured: ${layersEnsured}`);

      // If layers were ensured, try the direct highlight approach
      if (layersEnsured) {
        directHighlightPolygon(map, index);
      }

      // Try again after 500ms
      setTimeout(() => {
        if (isMapReady(map)) {
          console.log(`Highlighting polygon with index ${index} on second attempt`);
          highlightPolygon(map, index);
        } else {
          // Final attempt after another 1000ms
          setTimeout(() => {
            try {
              console.log(`Forcing highlight for index ${index}`);
              highlightPolygon(map, index, true); // Force highlight
            } catch (error) {
              console.error('Error in final highlight attempt:', error);
            }
          }, 1000);
        }
      }, 500);
    }
  }, 200);

  return true;
}

/**
 * Check for ID parameter on page load and navigate to the item if found
 */
function handleUrlParamsOnLoad() {
  const id = getUrlParam('id');
  if (id) {
    console.log(`Found ID in URL parameters: ${id}`);

    // We need to wait for data to be loaded first
    if (sampleData && sampleData.length > 0) {
      navigateToItemById(id);
    } else {
      // Data isn't loaded yet, wait for map initialization
      window.addEventListener('map_initialized', function onMapInit() {
        console.log('Map initialized, attempting to navigate to ID from URL parameters');
        navigateToItemById(id);
        // Remove the event listener to prevent multiple navigations
        window.removeEventListener('map_initialized', onMapInit);
      });
    }
  }
}

// Initialize URL parameter handling when the page loads
document.addEventListener('DOMContentLoaded', function () {
  console.log('URL parameter handler initialized');

  // Listen for the data loaded event
  window.addEventListener('map_initialized', function () {
    // Check for URL parameters after data is loaded
    handleUrlParamsOnLoad();
  });
});