// Map functionality

// Constants
const MAX_ZOOM_LEVEL = 17.3;
// Remove API key as it's not needed for Esri
// const THUNDERFOREST_API_KEY = 'apikey=6170aad10dfd42a38d4d8c709a536f38';

// Map initialization
function initializeMap() {
  // Calculate bounds of all points
  const bounds = sampleData.reduce(
    (bounds, item) => {
      if (item.lat && item.lon) {
        bounds.north = Math.max(bounds.north, item.lat);
        bounds.south = Math.min(bounds.south, item.lat);
        bounds.east = Math.max(bounds.east, item.lon);
        bounds.west = Math.min(bounds.west, item.lon);
      }
      return bounds;
    },
    { north: -90, south: 90, east: -180, west: 180 }
  );

  maplibregl.setRTLTextPlugin(
    'https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js'
  );

  map = new maplibregl.Map({
    container: 'map',
    style: {
      version: 8,
      sources: {
        topographic: {
          type: 'raster',
          // Using Esri's World Topographic Map which has good English labels globally
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
          ],
          tileSize: 256,
          attribution: '© <a href="https://www.esri.com/">Esri</a>',
        },
        /* Alternative if Esri doesn't meet your needs:
        topographic: {
          type: 'raster',
          tiles: ['https://a.tile.opentopomap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution:
            '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
        },
        */
      },
      layers: [
        {
          id: 'topographic-tiles',
          type: 'raster',
          source: 'topographic',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    },
    maxZoom: MAX_ZOOM_LEVEL, // Set maximum zoom limit
    bounds: [
      [bounds.west - 0.1, bounds.south - 0.1], // Add padding to bounds
      [bounds.east + 0.1, bounds.north + 0.1],
    ],
    fitBoundsOptions: {
      padding: 50,
    },
  });

  // Add navigation controls
  const nav = new maplibregl.NavigationControl({
    visualizePitch: true,
    maxZoom: MAX_ZOOM_LEVEL, // Ensure navigation controls respect the max zoom
  });
  map.addControl(nav, 'top-right');

  // Add scale control
  const scale = new maplibregl.ScaleControl({
    maxWidth: 100,
    unit: 'metric',
  });
  map.addControl(scale, 'bottom-left');

  // Add attribution
  map.addControl(
    new maplibregl.AttributionControl({
      compact: true,
      customAttribution: '© <a href="https://moxalise.ge">moxalise.ge</a>',
    })
  );

  // Initialize the style toggle button to reflect topographic as default
  const styleToggleButton = document.querySelector('.satellite-toggle');
  if (styleToggleButton) {
    styleToggleButton.classList.add('active');
    styleToggleButton.setAttribute('data-style', 'topographic');
    styleToggleButton.title = 'Switch to standard view';
    styleToggleButton.textContent = 'Topo';
  }

  // Initialize map with data
  map.on('load', function () {
    setupMarkers();
    setupMapLayers();
    addMapEventHandlers();

    // Add zoom limit check for mouse wheel and touch zoom
    map.on('zoom', function () {
      if (map.getZoom() > MAX_ZOOM_LEVEL) {
        map.setZoom(MAX_ZOOM_LEVEL);
      }
    });

    // Define the legend element variable
    const legendElement = document.querySelector('.map-legend');

    // Add responsiveness for the legend
    function updateLegendPosition() {
      if (window.innerWidth <= 768) {
        // On mobile, move the legend to fixed bottom position
        legendElement.style.bottom = '70px';
        legendElement.style.left = '32%';
        legendElement.style.transform = 'translateX(-50%)';
      } else {
        // On desktop, restore the original position
        legendElement.style.bottom = '80px';
        legendElement.style.left = '10px';
        legendElement.style.transform = 'none';
      }
    }

    // Call it initially
    updateLegendPosition();

    // Update on resize
    window.addEventListener('resize', updateLegendPosition);

    console.log('Map is now fully initialized and ready for highlighting');
  });
}

// Function to create markers on the map
function createMarkers() {
  // We'll use setupMarkers function for marker creation
  setupMarkers();
}

// Function to create tooltips for markers
function createTooltip(marker, content) {
  if (!marker) return null;

  const element = marker.getElement ? marker.getElement() : marker;

  return tippy(element, {
    content: content,
    allowHTML: true,
    interactive: true,
    theme: 'light',
    placement: 'top',
    trigger: 'click', // Change to click instead of hover
    arrow: true,
    maxWidth: 350,
  });
}

// Add interactivity to polygons
function addPolygonInteractivity() {
  // Polygon hover effects
  // Create a popup but don't add it to the map yet
  const popup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false,
    maxWidth: '300px',
    offset: 15,
  });

  // When mouse enters a polygon feature
  map.on('mouseenter', 'location-polygons', function (e) {
    map.getCanvas().style.cursor = 'pointer';

    if (e.features.length > 0) {
      const feature = e.features[0];
      const properties = feature.properties;

      // Create popup content
      const popupContent = `
                <div class="polygon-popup">
                    <h4>${properties['საჭიროება(ები)\n(საკვები, მედიკამენტები, ევაკუაცია, ექიმი, საწვავი, დათოლვა, სხვა)    '] || 'საჭიროება'}</h4>
                    <p><strong>სოფელი:</strong> ${properties['სოფელი'] || '-'}</p>
                    <p><strong>პრიორიტეტი:</strong> ${properties['პრიორიტეტი'] || '-'}</p>
                    <p><strong>სტატუსი:</strong> ${properties['სტატუსი\n(მომლოდინე/ დასრულებულია)'] || 'უცნობი'}</p>
                    <button id="popup-notification-btn-${properties.id}" class="popup-notification-btn" onclick="sendNotification('popup-notification-btn-${properties.id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                        განაახლე ინფორმაცია!
                    </button>
                </div>
            `;

      // Set popup coordinates to click location
      popup.setLngLat(e.lngLat).setHTML(popupContent).addTo(map);

      // Highlight corresponding card
      const cardToHighlight = document.querySelector(`.card[data-index="${properties.id}"]`);
      if (cardToHighlight) {
        cardToHighlight.classList.add('highlighted-card');

        // Scroll the card into view if it's not visible
        cardToHighlight.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      // Highlight this polygon
      highlightPolygon(map, properties.id);
    }
  });

  // When mouse leaves a polygon feature
  map.on('mouseleave', 'location-polygons', function () {
    map.getCanvas().style.cursor = '';
    popup.remove();

    // Remove highlight from all cards
    document.querySelectorAll('.highlighted-card').forEach(card => {
      card.classList.remove('highlighted-card');
    });
  });

  // Click on polygon
  map.on('click', 'location-polygons', function (e) {
    if (e.features.length > 0) {
      const feature = e.features[0];
      const properties = feature.properties;
      const id = properties.id;

      // Find the corresponding card
      const card = document.querySelector(`.card[data-index="${id}"]`);
      if (card) {
        // Toggle expanded state
        card.classList.toggle('expanded');

        // Scroll to card
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  });
}

// Additional map setup
function setupMapInteractivity() {
  // Add map update functionality on zoom or move
  map.on('zoom', updateMapFeatures);
  map.on('moveend', updateMapFeatures);
}

// Update features when map zoom changes
function updateMapFeatures() {
  if (!map.getSource('locations')) return;

  // Create updated features based on current zoom
  const updatedFeatures = updateFeatures();

  // Update the data in the source
  map.getSource('locations').setData({
    type: 'FeatureCollection',
    features: updatedFeatures,
  });
}

// Function to setup markers on the map
function setupMarkers() {
  // First clear any existing markers to prevent duplication
  if (locationMarkers && locationMarkers.length > 0) {
    console.log(`Cleaning up ${locationMarkers.length} markers from previous call`);
    locationMarkers.forEach(markerInfo => {
      if (markerInfo.marker) {
        markerInfo.marker.remove();
      }
    });
    // Reset the markers array
    locationMarkers = [];
  }

  // Group markers by location to detect overlapping pins
  const locationGroups = {};

  // First group pins by location
  sampleData.forEach((item, index) => {
    if (
      item.lat &&
      item.lon &&
      item['ზუსტი ადგილმდებარეობა']?.trim() &&
      isURL(item['ზუსტი ადგილმდებარეობა'])
    ) {
      const key = `${item.lat.toFixed(4)},${item.lon.toFixed(4)}`;
      if (!locationGroups[key]) {
        locationGroups[key] = [];
      }
      locationGroups[key].push({ item, index });
    }
  });

  // Create markers with offsets if needed
  const markers = [];

  // Process each location group
  Object.values(locationGroups).forEach(group => {
    const isGroup = group.length > 1;

    // Process each pin in the group
    group.forEach((entry, groupIndex) => {
      const { item, index } = entry;
      let color;
      const status = item['სტატუსი\n(მომლოდინე/ დასრულებულია)'];
      const priority = item['პრიორიტეტი']?.trim();

      // Check if priority is filled and status is not "აღმოუჩინეს დახმარება"
      if (priority && status !== 'აღმოუჩინეს დახმარება') {
        color = '#000000'; // Black for priority items not completed
      } else if (status === 'მომლოდინე') {
        color = '#e74c3c'; // Red
      } else if (status === 'აღმოუჩინეს დახმარება' || status === 'აღმოუჩინეს დახმარება') {
        color = '#2ecc71'; // Green
      } else if (status === 'მიდის მოხალისე') {
        color = '#3498db'; // Blue
      } else if (status === 'მოინახულა მოხალისემ') {
        color = '#9b59b6'; // Purple
      } else {
        color = '#95a5a6'; // Gray
      }

      // Create container element first
      const container = document.createElement('div');
      container.className = 'map-pin-container';

      // Create pin element
      const el = document.createElement('div');
      el.className = 'map-pin';
      el.style.setProperty('--pin-color', color); // Use CSS variable for color
      el.style.pointerEvents = 'auto'; // Make sure pin receives events

      container.appendChild(el);

      // Add shadow element to the pin
      const shadowEl = document.createElement('div');
      shadowEl.className = 'map-pin-shadow';
      el.appendChild(shadowEl);

      // Add age badge for pending requests
      if (status === 'მომლოდინე') {
        // Get registration date from the item - only use დამატების თარიღი field
        const regDateStr = item['დამატების თარიღი'];

        // Calculate days since registration
        const daysSinceRegistration = calculateDaysPassed(regDateStr);

        // Get last update date if available
        const updatesStr = item['განახლებები'];
        const lastUpdateDate = getLastUpdateDate(updatesStr);

        // Calculate days since last interaction
        let daysSinceLastInteraction = null;
        if (lastUpdateDate) {
          daysSinceLastInteraction = calculateDaysPassed(lastUpdateDate);
        }

        // Use the most recent date for badge display
        let daysPassed = daysSinceRegistration;
        if (daysSinceLastInteraction !== null && daysSinceLastInteraction < daysSinceRegistration) {
          daysPassed = daysSinceLastInteraction;
        }

        // Only add badge if we have valid days
        if (daysPassed > 0) {
          // Create badge element
          const badge = document.createElement('div');
          badge.className = 'age-badge';

          // Format the badge text: show actual number for 1-9, show "9+" for >9
          badge.textContent = daysPassed > 9 ? '9+' : daysPassed;

          // Set badge color based on age
          if (daysPassed <= 3) {
            badge.style.backgroundColor = '#ffeb3b'; // Yellow for 1-3 days
            badge.style.color = '#333'; // Darker text for visibility
          } else if (daysPassed <= 7) {
            badge.style.backgroundColor = '#ff9800'; // Orange for 4-7 days
          } else {
            badge.style.backgroundColor = '#8B0000'; // Dark burgundy red for >7 days (was #e74c3c)
          }

          // Append to pin element instead of container
          el.appendChild(badge);
          el.classList.add('has-badge'); // Add class to pin element
        }
        // No else clause - don't add a badge if no valid days
      }

      // Only apply offset if we have more than one item at this location
      let offsetLon = item.lon;
      let offsetLat = item.lat;

      if (isGroup) {
        // Base the offset calculation on the pin marker size
        const baseRadius = 0.0006; // Adjust this based on your pin size
        const offset = calculatePointOffset(groupIndex, baseRadius);
        offsetLon = parseFloat(item.lon) + offset.x;
        offsetLat = parseFloat(item.lat) + offset.y;
      }

      const marker = new maplibregl.Marker({
        element: container,
        anchor: 'bottom',
        offset: [0, 0], // No offset needed with our new design
      })
        .setLngLat([offsetLon, offsetLat])
        .addTo(map);

      // Add direct click handler to the pin (not the container)
      el.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();

        highlightPolygon(map, index);

        // Get the container's position first
        const containerRect = this.parentNode.getBoundingClientRect();
        const pinRect = this.getBoundingClientRect();

        // Position tooltip above the rotated pin
        const clickX = containerRect.left + containerRect.width / 2;
        const clickY = containerRect.top - 20; // Adjust for the 45-degree rotated pin

        // Create feature-like structure for tooltip
        const feature = {
          properties: item,
        };

        const tooltipContent = document.createElement('div');
        tooltipContent.innerHTML = createTooltipHTML(feature, index);

        // Create or update marker element to attach tooltip to
        let markerEl = document.getElementById(`marker-${index}`);
        if (!markerEl) {
          markerEl = document.createElement('div');
          markerEl.id = `marker-${index}`;
          markerEl.style.position = 'absolute';
          markerEl.style.top = `${clickY}px`;
          markerEl.style.left = `${clickX}px`;
          markerEl.style.width = '1px';
          markerEl.style.height = '1px';
          document.body.appendChild(markerEl);
        } else {
          markerEl.style.top = `${clickY}px`;
          markerEl.style.left = `${clickX}px`;
        }

        // Hide and destroy any existing tooltips
        Object.entries(window.tippyInstances || {}).forEach(([key, instance]) => {
          if (instance) {
            if (instance.hide) {
              instance.hide();
            }
            if (instance.destroy) {
              console.log(`Destroying tippy instance ${key} for pin click`);
              instance.destroy();
              delete window.tippyInstances[key];
            }
          }
        });

        // Create new tooltip instance
        window.tippyInstances = window.tippyInstances || {};
        console.log(`Creating new tippy instance for pin id ${index}`);
        window.tippyInstances[index] = tippy(markerEl, {
          content: tooltipContent,
          allowHTML: true,
          interactive: true,
          theme: 'light',
          placement: 'top',
          trigger: 'manual',
          appendTo: document.body,
          showOnCreate: true,
          hideOnClick: false,
          offset: [0, 15],
          distance: 15,
          arrow: true,
          popperOptions: {
            strategy: 'fixed',
            modifiers: [
              {
                name: 'preventOverflow',
                options: {
                  boundary: 'viewport',
                  padding: 10,
                  altAxis: true,
                },
              },
              {
                name: 'flip',
                options: {
                  fallbackPlacements: ['bottom', 'right', 'left'],
                  padding: 10,
                },
              },
            ],
          },
          interactiveBorder: 30,
          zIndex: 3000,
          maxWidth: 350,
          // Add these properties for scrollable tooltips
          animation: 'shift-away',
          onMount(instance) {
            // Check if tooltip content is taller than viewport
            const box = instance.popper.querySelector('.tippy-box');
            if (box) {
              const viewportHeight = window.innerHeight;
              const tooltipHeight = box.offsetHeight;

              if (tooltipHeight > viewportHeight * 0.8) {
                // If tooltip is too tall, add a class to enable scrolling
                box.classList.add('scrollable-tooltip');
              }
            }
          },
        });

        window.tippyInstances[index].show();
      };

      // Store marker with its metadata for filtering
      markers.push({
        marker,
        id: index,
        properties: item,
      });
    });
  });

  // Store markers globally for later access
  console.log(`Created ${markers.length} markers`);
  locationMarkers = markers;
}

// Function to setup map layers
function setupMapLayers() {
  // Initial features
  const features = updateFeatures();

  // Add source with features
  map.addSource('locations', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: features,
    },
  });

  // Add a layer for the polygons
  map.addLayer({
    id: 'location-polygons',
    type: 'fill',
    source: 'locations',
    paint: {
      'fill-color': ['get', 'fillColor'],
      'fill-opacity': [
        'interpolate',
        ['linear'],
        ['zoom'],
        5,
        0.01, // At zoom level 5, opacity is 1%
        8,
        0.3, // At zoom level 8, opacity is 30%
        11,
        0.8, // At zoom level 11, opacity peaks at 80%
        13,
        0.3, // At zoom level 13, opacity decreases to 30%
        15,
        0.08, // At zoom level 15, opacity is 8%
      ],
    },
  });

  // Add an outline layer for the polygons
  map.addLayer({
    id: 'location-polygons-outline',
    type: 'line',
    source: 'locations',
    paint: {
      'line-color': ['get', 'strokeColor'],
      'line-width': 2,
    },
  });
}

// Helper function to add event handlers to the map
function addMapEventHandlers() {
  // Add click event for polygons
  map.on('click', 'location-polygons', function (e) {
    e.preventDefault(); // Prevent map click from triggering
    if (e.features.length > 0) {
      const feature = e.features[0];
      const id = feature.properties.id;

      console.log(`Polygon clicked with id: ${id}`);

      // Use the same approach as the card click handler
      if (!isMapReady(map)) {
        console.log('Map not ready on polygon click, will retry with increasing delays');

        // Try again after 200ms
        setTimeout(() => {
          highlightPolygon(map, id);

          // Create tooltip after highlighting
          createTooltipForFeature(feature, id, e.point);
        }, 200);
      } else {
        highlightPolygon(map, id);

        // Create tooltip after highlighting
        createTooltipForFeature(feature, id, e.point);
      }
    }
  });

  // Helper function to create tooltip for a feature
  function createTooltipForFeature(feature, id, point) {
    // Get click position - adjust to match similar positioning as the pins
    const clickX = point.x;
    const clickY = point.y - 15; // Position higher to match pin tooltip placement

    // Create tooltip content with the ID for close button reference
    const tooltipContent = document.createElement('div');
    tooltipContent.innerHTML = createTooltipHTML(feature, id);

    // Create marker element to attach tooltip to
    let marker = document.getElementById(`marker-${id}`);
    if (!marker) {
      marker = document.createElement('div');
      marker.id = `marker-${id}`;
      marker.style.position = 'absolute';
      marker.style.top = `${clickY}px`;
      marker.style.left = `${clickX}px`;
      marker.style.width = '1px';
      marker.style.height = '1px';
      document.body.appendChild(marker);
    } else {
      marker.style.top = `${clickY}px`;
      marker.style.left = `${clickX}px`;
    }

    // Hide and destroy any existing tooltips to prevent duplication
    Object.entries(window.tippyInstances || {}).forEach(([key, instance]) => {
      if (instance) {
        if (instance.hide) {
          instance.hide();
        }
        if (instance.destroy) {
          console.log(`Destroying tippy instance ${key}`);
          instance.destroy();
          delete window.tippyInstances[key];
        }
      }
    });

    // Create new instance on the marker element
    setTimeout(() => {
      window.tippyInstances = window.tippyInstances || {};
      console.log(`Creating new tippy instance for id ${id}`);
      window.tippyInstances[id] = tippy(marker, {
        content: tooltipContent,
        allowHTML: true,
        interactive: true,
        theme: 'light',
        placement: 'top',
        trigger: 'manual',
        appendTo: document.body,
        showOnCreate: true,
        hideOnClick: false,
        offset: [0, 15],
        distance: 15,
        arrow: true,
        popperOptions: {
          strategy: 'fixed',
          modifiers: [
            {
              name: 'preventOverflow',
              options: {
                boundary: 'viewport',
                padding: 10,
                altAxis: true,
              },
            },
            {
              name: 'flip',
              options: {
                fallbackPlacements: ['bottom', 'right', 'left'],
                padding: 10,
              },
            },
          ],
        },
        interactiveBorder: 30,
        zIndex: 3000,
        maxWidth: 350,
        // Add these properties for scrollable tooltips
        animation: 'shift-away',
        onMount(instance) {
          // Check if tooltip content is taller than viewport
          const box = instance.popper.querySelector('.tippy-box');
          if (box) {
            const viewportHeight = window.innerHeight;
            const tooltipHeight = box.offsetHeight;

            if (tooltipHeight > viewportHeight * 0.8) {
              // If tooltip is too tall, add a class to enable scrolling
              box.classList.add('scrollable-tooltip');
            }
          }
        },
      });

      // Show the tooltip
      if (window.tippyInstances[id] && window.tippyInstances[id].show) {
        window.tippyInstances[id].show();
      }
    }, 0);
  }

  // Change cursor on polygon hover
  map.on('mouseenter', 'location-polygons', function (e) {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', 'location-polygons', function (e) {
    map.getCanvas().style.cursor = '';
  });

  // Update tooltip positions when map moves
  map.on('move', function () {
    // Hide and destroy click tooltips to prevent accumulation
    Object.entries(window.tippyInstances || {}).forEach(([key, instance]) => {
      if (instance) {
        if (instance.state && instance.state.isVisible) {
          instance.hide();
        }
        // Completely destroy tooltips when map moves to prevent accumulation
        if (instance.destroy) {
          console.log(`Destroying tippy instance ${key} on map move`);
          instance.destroy();
          delete window.tippyInstances[key];
        }
      }
    });
  });

  // Update polygon sizes when zoom changes
  map.on('zoom', function () {
    // Simply log the current zoom level
    const currentZoom = map.getZoom();
    console.log('Zoom level:', currentZoom.toFixed(2));
  });

  // Only update features when zoom ends to prevent continuous redrawing
  map.on('zoomend', function () {
    console.log('Zoom ended, updating features');
    // Update features after zoom completes to maintain fixed area coverage
    const updatedFeatures = updateFeatures(true);

    // Update the source data
    map.getSource('locations').setData({
      type: 'FeatureCollection',
      features: updatedFeatures,
    });
  });

  // Add click handler for map to reset highlights and close tooltips when clicking elsewhere
  map.on('click', e => {
    if (!e.defaultPrevented) {
      // Only if not clicking on a polygon
      // Reset all pin highlights
      document.querySelectorAll('.map-pin').forEach(pin => {
        pin.classList.remove('highlighted');
      });

      highlightPolygon(map, -1); // Pass invalid index to reset all

      // Close any open tooltips
      Object.values(window.tippyInstances || {}).forEach(instance => {
        if (instance && instance.hide) {
          instance.hide();
        }
      });
    }
  });
}

// Function to toggle map styles (standard, satellite, topographic)
function toggleMapStyle(style) {
  // Get the current active style
  const prevActiveButton = document.querySelector('.map-style-option.active');
  if (prevActiveButton) {
    prevActiveButton.classList.remove('active');
  }

  // Set the clicked button as active
  if (style) {
    const clickedButton = document.querySelector(`.map-style-option[data-style="${style}"]`);
    if (clickedButton) {
      clickedButton.classList.add('active');
    }
  }

  // Close any open tooltips before changing the map style
  if (window.tippyInstances) {
    Object.values(window.tippyInstances).forEach(instance => {
      if (instance && instance.hide) {
        instance.hide();
      }
    });
  }

  // Clean up existing markers to prevent duplication
  if (locationMarkers && locationMarkers.length > 0) {
    console.log(`Removing ${locationMarkers.length} existing markers`);
    locationMarkers.forEach(markerInfo => {
      if (markerInfo.marker) {
        markerInfo.marker.remove();
      }
    });
    // Clear the markers array
    locationMarkers = [];
  }

  // Define the map styles
  const standardStyle = {
    version: 8,
    sources: {
      'raster-tiles': {
        type: 'raster',
        tiles: ['https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© <a href="https://carto.com">CARTO</a> & <a href="https://osm.org">OSM</a>',
      },
    },
    layers: [
      {
        id: 'simple-tiles',
        type: 'raster',
        source: 'raster-tiles',
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  };

  const satelliteStyle = {
    version: 8,
    sources: {
      satellite: {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        attribution: '© <a href="https://www.esri.com/">Esri</a>',
      },
    },
    layers: [
      {
        id: 'satellite-tiles',
        type: 'raster',
        source: 'satellite',
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  };

  // Try this alternative if Esri doesn't work well in your region
  const topographicStyle = {
    version: 8,
    sources: {
      topographic: {
        type: 'raster',
        // Using Esri's World Topographic Map which has good English labels globally
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        attribution: '© <a href="https://www.esri.com/">Esri</a>',
      },
    },
    layers: [
      {
        id: 'topographic-tiles',
        type: 'raster',
        source: 'topographic',
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  };

  // ALTERNATIVE STYLE - Uncomment and replace above if Esri doesn't work well
  /*
  const topographicStyle = {
    version: 8,
    sources: {
      topographic: {
        type: 'raster',
        tiles: ['https://a.tile.opentopomap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution:
          '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
      },
    },
    layers: [
      {
        id: 'topographic-tiles',
        type: 'raster',
        source: 'topographic',
        minzoom: 0,
        maxzoom: 17,
      },
    ],
  };
  */

  // Save the current center and zoom
  const currentCenter = map.getCenter();
  const currentZoom = map.getZoom();

  // Set the selected style
  if (style === 'satellite') {
    map.setStyle(satelliteStyle);
  } else if (style === 'topo') {
    map.setStyle(topographicStyle);
  } else {
    // Default to standard style
    map.setStyle(standardStyle);
  }

  // After the style is loaded, restore center and zoom and reapply any custom layers
  map.once('styledata', function () {
    // Restore previous view position
    map.setCenter(currentCenter);
    map.setZoom(Math.min(currentZoom, MAX_ZOOM_LEVEL)); // Respect max zoom limit

    // Re-add data sources and layers if needed
    if (sampleData.length > 0) {
      // Recreate polygon source and layers
      const features = updateFeatures(true);

      if (!map.getSource('locations')) {
        console.log('Adding locations source');
        map.addSource('locations', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: features,
          },
        });
      } else {
        console.log('Updating existing locations source');
        map.getSource('locations').setData({
          type: 'FeatureCollection',
          features: features,
        });
      }

      // Re-add layers if they don't exist
      if (!map.getLayer('location-polygons')) {
        console.log('Adding location-polygons layer');
        map.addLayer({
          id: 'location-polygons',
          type: 'fill',
          source: 'locations',
          paint: {
            'fill-color': ['get', 'fillColor'],
            'fill-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              5,
              0.01, // At zoom level 5, opacity is 1%
              8,
              0.3, // At zoom level 8, opacity is 30%
              11,
              0.8, // At zoom level 11, opacity peaks at 80%
              13,
              0.3, // At zoom level 13, opacity decreases to 30%
              15,
              0.08, // At zoom level 15, opacity is 8%
            ],
          },
        });
      }

      if (!map.getLayer('location-polygons-outline')) {
        console.log('Adding location-polygons-outline layer');
        map.addLayer({
          id: 'location-polygons-outline',
          type: 'line',
          source: 'locations',
          paint: {
            'line-color': ['get', 'strokeColor'],
            'line-width': 2,
          },
        });
      }

      // Reapply any map event handlers
      addMapEventHandlers();
    }

    // Re-add zoom limit check
    map.on('zoom', function () {
      if (map.getZoom() > MAX_ZOOM_LEVEL) {
        map.setZoom(MAX_ZOOM_LEVEL);
      }
    });

    // Now that we've cleared the old markers, create new ones
    console.log('Setting up new markers after style change');
    setupMarkers();
  });
}

// Alias the old function name to the new one for backwards compatibility
function toggleSatellite() {
  toggleMapStyle('satellite');
}

// Check if the map is ready with all necessary layers and sources
function isMapReady(map) {
  if (!map) {
    console.error('Map is not defined');
    return false;
  }

  try {
    // Check if the map has the required layers
    const hasPolygonLayer = map.getLayer('location-polygons');
    const hasOutlineLayer = map.getLayer('location-polygons-outline');

    // Check if the source exists and has data
    const hasSource = map.getSource('locations');
    const hasData = hasSource && hasSource._data && hasSource._data.features;

    const isReady = hasPolygonLayer && hasOutlineLayer && hasSource && hasData;

    if (!isReady) {
      console.error(
        `Map not ready: layers=${hasPolygonLayer && hasOutlineLayer}, source=${!!hasSource}, data=${!!hasData}`
      );
    }

    return isReady;
  } catch (error) {
    console.error(`Error checking map readiness: ${error.message}`);
    return false;
  }
}

// Function to ensure the map has the required layers
function ensureMapLayers(map) {
  if (!map) return false;

  try {
    // Check if the map has the required layers
    const hasPolygonLayer = map.getLayer('location-polygons');
    const hasOutlineLayer = map.getLayer('location-polygons-outline');

    // If layers don't exist, try to add them
    if (!hasPolygonLayer || !hasOutlineLayer) {
      console.error('Required layers not found, attempting to add them');

      // Check if the source exists
      const hasSource = map.getSource('locations');

      if (!hasSource) {
        console.error("Source 'locations' not found, attempting to add it");

        // Create features
        const features = updateFeatures(true);

        // Add source
        map.addSource('locations', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: features,
          },
        });
      }

      // Add polygon layer if it doesn't exist
      if (!hasPolygonLayer) {
        console.log("Adding 'location-polygons' layer");
        map.addLayer({
          id: 'location-polygons',
          type: 'fill',
          source: 'locations',
          paint: {
            'fill-color': ['get', 'fillColor'],
            'fill-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              5,
              0.01, // At zoom level 5, opacity is 1%
              8,
              0.3, // At zoom level 8, opacity is 30%
              11,
              0.8, // At zoom level 11, opacity peaks at 80%
              13,
              0.3, // At zoom level 13, opacity decreases to 30%
              15,
              0.08, // At zoom level 15, opacity is 8%
            ],
          },
        });
      }

      // Add outline layer if it doesn't exist
      if (!hasOutlineLayer) {
        console.log("Adding 'location-polygons-outline' layer");
        map.addLayer({
          id: 'location-polygons-outline',
          type: 'line',
          source: 'locations',
          paint: {
            'line-color': ['get', 'strokeColor'],
            'line-width': 2,
          },
        });
      }

      return true;
    }

    return true;
  } catch (error) {
    console.error('Error ensuring map layers:', error);
    return false;
  }
}

// Function to create HTML content for the tooltip
function createTooltipHTML(feature, instanceId) {
  const data = feature.properties;

  // Create wrapper with a close button - ensure instanceId is properly treated as a string
  let html = `<div class="info-card">
                <button class="close-button" onclick="closeTooltip('${instanceId}')">✕</button>
                <div class="info-card-scrollable">`;

  // Add ID at the top of the tooltip using the CSS classes
  html += `<p class="id-field"><span class="id-label">ID:</span> <span class="id-value">${data.id || ''}</span></p>`;

  // Add waiting days information for pending requests
  const status = data['სტატუსი\n(მომლოდინე/ დასრულებულია)'];
  if (status === 'მომლოდინე' && data._daysPassed > 0) {
    html += `<p class="waiting-days">ლოდინის დღეები: ${data._daysPassed}</p>`;
  }

  // Get all keys except internal ones and those containing 'დისკუსია'
  const keys = Object.keys(data).filter(
    key =>
      !['id', 'fillColor', 'strokeColor', 'lat', 'lon', 'inGroup', '_daysPassed'].includes(key) &&
      !key.includes('დისკუსია')
  );

  // Process all fields
  for (const key of keys) {
    let value = data[key];

    // Log for debugging
    console.log(`Processing field: "${key}" with value type: ${typeof value}`);

    // Convert URLs to links (not making assumptions, just basic URL detection)
    if (value && typeof value === 'string' && isURL(value)) {
      value = `<a href="${value}" target="_blank">${value}</a>`;
    }
    // Handle null or undefined
    else if (value === null || value === undefined) {
      value = '';
    }
    // Special handling for fields that might contain newlines
    else if (typeof value === 'string' && value.includes('\n')) {
      // Replace newlines with HTML line breaks for any field with newlines
      value = value.replace(/\n/g, '<br>');
      console.log(`Applied newline conversion for field: ${key}`);
    }

    // Skip empty values (null, undefined, empty string, or whitespace-only)
    if (value === '' || (typeof value === 'string' && value.trim() === '')) {
      console.log(`Skipping empty field: ${key}`);
      continue;
    }

    // Limit key length to 20 characters
    const displayKey = key.length > 20 ? key.substring(0, 20) + '...' : key;

    html += `<p><span class="info-label">${displayKey}:</span> <span class="info-value">${value}</span></p>`;
  }

  // Close the scrollable div
  html += '</div>';

  // Add directions link if lat and lon are available
  if (data.lat && data.lon) {
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${data.lat},${data.lon}`;
    html += `<div class="directions-container">
            <a href="${directionsUrl}" target="_blank" style="position: relative; z-index: 3500;">ნავიგაცია</a>
            ${data.id ? `<button id="notification-btn-${instanceId}" onclick="sendNotification('notification-btn-${instanceId}')" style="position: relative; z-index: 3500;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>განაახლე ინფორმაცია!</button>` : ''}
        </div>`;
  }

  html += '</div>';
  return html;
}

// Function to close a tooltip
function closeTooltip(id) {
  // Ensure id is treated consistently, whether it's passed as a string or number
  const instanceId = String(id);
  console.log(`Closing tooltip with id: ${instanceId}`);

  if (window.tippyInstances && window.tippyInstances[instanceId]) {
    window.tippyInstances[instanceId].hide();
    // Add proper cleanup by destroying the tooltip instance
    if (window.tippyInstances[instanceId].destroy) {
      console.log(`Destroying tippy instance ${instanceId} from close button`);
      window.tippyInstances[instanceId].destroy();
    }
    // Remove the instance from our tracking object
    delete window.tippyInstances[instanceId];
  }
}
