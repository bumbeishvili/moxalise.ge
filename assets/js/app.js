// Global variables
let map;
let sampleData = [];
let locationMarkers = [];
// userLocationMarker is now declared in tracking.js
let customDropdowns = {};
let currentSearchText = '';
let tippyInstances = {};

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
  // Initialize search functionality
  initializeSearch();

  // Initialize instruction tabs
  initInstructionTabs();

  // Initialize map style toggle
  initMapStyleToggle();

  // Add form submission handler
  const notificationForm = document.getElementById('notification-form');
  if (notificationForm) {
    notificationForm.addEventListener('submit', submitNotification);
  }

  // Load data and initialize map
  loadData();
});

// Function to initialize map style toggle
function initMapStyleToggle() {
  // Set topo as the default active style
  const topoOption = document.querySelector('.map-style-option[data-style="topo"]');
  if (topoOption) {
    topoOption.classList.add('active');
  }

  // Add click handlers to all style options
  document.querySelectorAll('.map-style-option').forEach(option => {
    option.addEventListener('click', function () {
      const style = this.getAttribute('data-style');
      toggleMapStyle(style);
    });
  });
}

// Function to load data from CSV files
function loadData() {
  Promise.all([
    d3.csv(
      'https://docs.google.com/spreadsheets/d/e/2PACX-1vRfK0UcHgAiwmJwTSWe2dxyIwzLFtS2150qbKVVti1uVfgDhwID3Ec6NLRrvX4AlABpxneejy1-lgTF/pub?gid=0&single=true&output=csv'
    ),
    d3.csv('data/villages.csv'),
  ])
    .then(function ([data, villages]) {
      processData(data, villages);
      initializeFilters(sampleData);
      createSidebarCards();
      initializeMap();
    })
    .catch(function (error) {
      console.error('Error loading the data:', error);
    });
}

// Function to process loaded data
function processData(data, villages) {
  // Store data globally with trimmed string values
  sampleData = data.map(d => {
    // Create a new object with all string values trimmed
    const trimmedObj = {};

    // Process each field: trim strings, convert numbers
    Object.keys(d).forEach(key => {
      if (typeof d[key] === 'string') {
        trimmedObj[key] = d[key].trim();
      } else {
        trimmedObj[key] = d[key];
      }
    });

    // Add lat/lon as numbers
    return {
      ...trimmedObj,
      lat: trimmedObj.lat ? +trimmedObj.lat : null, // Convert to number if exists
      lon: trimmedObj.lon ? +trimmedObj.lon : null, // Convert to number if exists
    };
  });

  // Filter out records without proper district and village information
  sampleData = sampleData.filter(item => {
    const district = item['რაიონი']?.trim() || '';
    const village = item['სოფელი']?.trim() || '';
    return district && village && district !== '-' && village !== '-';
  });

  const villageObj = {};
  villages.forEach(v => {
    villageObj[v.name] = v;
  });

  // Fill in missing coordinates from matching villages
  let localCounter = 0;
  let raioni_village_obj = {};
  sampleData.forEach(v => {
    const key = v['რაიონი'] + '_' + v['სოფელი'];
    if (v.lat && v.lon && !raioni_village_obj[key]) {
      raioni_village_obj[key] = v;
    }
  });
  sampleData.forEach(v => {
    const key = v['რაიონი'] + '_' + v['სოფელი'];
    if (raioni_village_obj[key] && !v.lat && !v.lon) {
      localCounter++;
      v.lat = raioni_village_obj[key].lat;
      v.lon = raioni_village_obj[key].lon;
    }
  });

  let counter = 0;
  sampleData.forEach(item => {
    const village = villageObj[item['სოფელი']] || '';

    if (village && village.name && !item.lat && !item.lon) {
      if (+village.lat && +village.long) {
        counter++;
        item.lat = +village.lat;
        item.lon = +village.long;
      }
    }
  });
}

// Function to create sidebar cards
function createSidebarCards() {
  const cardsContainer = document.getElementById('cards-container');
  if (!cardsContainer) return;

  sampleData.forEach((item, index) => {
    const card = document.createElement('div');
    card.setAttribute('data-index', index);

    // Determine status class
    let statusClass = 'empty-status';
    const status = item['სტატუსი\n(მომლოდინე/ დასრულებულია)'];
    const priority = item['პრიორიტეტი']?.trim();

    // Check for priority first
    if (priority && status !== 'აღმოუჩინეს დახმარება') {
      statusClass = 'priority';
    } else if (status === 'მომლოდინე') {
      statusClass = 'pending';
    } else if (status === 'აღმოუჩინეს დახმარება' || status === 'აღმოუჩინეს დახმარება') {
      statusClass = 'completed';
    } else if (status === 'მიდის მოხალისე') {
      statusClass = 'volunteer-going';
    } else if (status === 'მოინახულა მოხალისემ') {
      statusClass = 'volunteer-visited';
    } else if (!status || status.trim() === '') {
      statusClass = 'empty-status';
    }

    card.className = `card ${statusClass}`;

    const needsTitle =
      item[
        `საჭიროება(ები)
(საკვები, მედიკამენტები, ევაკუაცია, ექიმი, საწვავი, დათოლვა, სხვა)    `
      ];

    // Get first item's keys to determine structure
    const keys = Object.keys(item).filter(
      key => !['id', 'fillColor', 'strokeColor', 'lat', 'lon'].includes(key)
    );

    // Filter out keys that contain "@:" or are exactly ":"
    const filteredKeys = keys.filter(key => !key.includes('@:') && key !== ':');

    let cardContent = `
            <div class="card-header">
                <h3 class="card-title">${needsTitle || filteredKeys[0] || ''}</h3>
                <span class="expand-icon">▼</span>
            </div>
            <div class="card-content">
                <p class="id-field">
                    <span class="id-label">ID:</span> <span class="id-value">${item.id || ''}</span>
                </p>
                ${filteredKeys
                  .slice(1)
                  .map(key => {
                    // Skip empty values or values that only contain colons or @:
                    const value = item[key];
                    if (
                      value === undefined ||
                      value === null ||
                      value === '' ||
                      value === ':' ||
                      value === '@:' ||
                      (typeof value === 'string' && value.trim() === '')
                    ) {
                      return '';
                    }
                    return `<p><strong>${key}:</strong> ${formatValue(value)}</p>`;
                  })
                  .join('')}
                ${
                  item.lat && item.lon
                    ? `
                <div class="card-actions">
                    ${item.id ? `<button id="card-notification-btn-${index}" onclick="event.stopPropagation(); sendNotification('card-notification-btn-${index}')" class="card-notification-btn" style="position: relative; z-index: 3500;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>განაახლე ინფორმაცია!</button>` : ''}
                </div>
                `
                    : ''
                }
            </div>`;

    card.innerHTML = cardContent;

    // Add click handlers
    card.addEventListener('click', e => {
      // Check if clicking inside card-content or on a button/link
      if (e.target.closest('.card-content') && !e.target.matches('.card-content')) {
        // Clicked inside card content but not on the container itself
        return;
      }

      // Toggle expansion
      card.classList.toggle('expanded');

      // If has coordinates and isn't clicking to expand
      if (item.lat && item.lon && !e.target.closest('.card-content')) {
        console.log(`Card clicked for item ${index} with coordinates [${item.lon}, ${item.lat}]`);

        // First, use the simple highlight approach that doesn't touch the map
        // This ensures the card and pin are highlighted immediately
        simpleHighlightPolygon(map, index);

        // Use the MAX_ZOOM_LEVEL constant from map.js
        // Default zoom level is 12, but never exceed the maximum
        const zoomLevel = Math.min(12, MAX_ZOOM_LEVEL);

        // Then fly to the location
        map.flyTo({
          center: [item.lon, item.lat],
          zoom: zoomLevel,
        });

        // Log the map state
        console.log('Map state:', {
          zoom: map.getZoom(),
          center: map.getCenter(),
          hasPolygonLayer: map.getLayer('location-polygons') ? true : false,
          hasOutlineLayer: map.getLayer('location-polygons-outline') ? true : false,
          hasSource: map.getSource('locations') ? true : false,
        });

        // Add a longer delay to ensure the map has finished moving and all layers are loaded
        setTimeout(() => {
          // Check if map is ready, if not we'll retry with increasing delays
          const mapReady = isMapReady(map);
          console.log(`Map ready check result: ${mapReady}`);

          if (mapReady) {
            console.log(`Highlighting polygon with index ${index} on first attempt`);
            highlightPolygon(map, index);
          } else {
            console.log('Map not ready on first attempt, will retry with increasing delays');

            // Try to ensure map has required layers
            const layersEnsured = ensureMapLayers(map);
            console.log(`Map layers ensured: ${layersEnsured}`);

            // If layers were ensured, try the direct highlight approach
            if (layersEnsured) {
              directHighlightPolygon(map, index);
            }

            // Try again after 500ms
            setTimeout(() => {
              const mapReadySecondAttempt = isMapReady(map);
              console.log(`Map ready check second attempt: ${mapReadySecondAttempt}`);

              if (mapReadySecondAttempt) {
                console.log(`Highlighting polygon with index ${index} on second attempt`);
                highlightPolygon(map, index);
              } else {
                console.log('Map not ready on second attempt, trying once more');

                // Final attempt after another 1000ms
                setTimeout(() => {
                  console.log('Final attempt to highlight polygon');
                  console.log('Map state:', {
                    zoom: map.getZoom(),
                    center: map.getCenter(),
                    hasPolygonLayer: map.getLayer('location-polygons') ? true : false,
                    hasOutlineLayer: map.getLayer('location-polygons-outline') ? true : false,
                    hasSource: map.getSource('locations') ? true : false,
                  });

                  // Force highlight even if map isn't ready
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
      }
    });

    cardsContainer.appendChild(card);
  });
}
