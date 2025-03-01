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

  // Only call setRTLTextPlugin if it hasn't been called yet
  if (!maplibregl.getRTLTextPluginStatus || maplibregl.getRTLTextPluginStatus() !== 'loaded') {
    try {
      maplibregl.setRTLTextPlugin(
        'https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js'
      );
    } catch (e) {
      console.warn('RTL Text Plugin already loaded or error loading:', e);
    }
  }

  map = new maplibregl.Map({
    container: 'map',
    style: {
      version: 8,
      sources: {
        topographic: {
          type: 'raster',
          // Using Esri's World Topographic Map which has good English labels globally
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256,
          attribution:
            '© <a href="https://www.esri.com/">Esri</a>',
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
      customAttribution: '© <a href="https://moxalise.ge">moxalise.ge</a>'
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

    // We're using CSS for legend positioning now, so we don't need to set inline styles
    // Only ensure the hidden class is properly set
    if (legendElement && !legendElement.classList.contains('hidden')) {
      legendElement.classList.add('hidden');
    }

    console.log('Map is now fully initialized and ready for highlighting');

    // Dispatch the map_initialized event
    window.dispatchEvent(new Event('map_initialized'));

    // Setup initial markers - from existing code
    setupMarkers();

    // Add volunteer location markers
    setupVolunteerMarkers();

    // Start periodic refresh of volunteer markers
    startVolunteerMarkersRefresh();
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

        // Show toast notification when pin is clicked (limited to once per 20 clicks)
        showVictimAssistanceToast();

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

        // Show toast notification when pin is opened (limited to once per 20 clicks)
        showVictimAssistanceToast();
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

  // Clear volunteer markers refresh interval
  if (volunteerMarkersInterval) {
    clearInterval(volunteerMarkersInterval);
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

  // Also clean up volunteer markers
  if (volunteerMarkers && volunteerMarkers.length > 0) {
    console.log(`Removing ${volunteerMarkers.length} volunteer markers`);
    volunteerMarkers.forEach(marker => {
      if (marker) {
        marker.remove();
      }
    });
    // Clear the volunteer markers array
    volunteerMarkers = [];
  }

  // Define the map styles
  const standardStyle = {
    version: 8,
    sources: {
      'raster-tiles': {
        type: 'raster',
        tiles: ['https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution:
          '© <a href="https://carto.com">CARTO</a> & <a href="https://osm.org">OSM</a>',
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
        attribution:
          '© <a href="https://www.esri.com/">Esri</a>',
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
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution:
          '© <a href="https://www.esri.com/">Esri</a>',
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

  // When map style is done loading, set up markers again
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

    // Recreate volunteer markers after style change
    setupVolunteerMarkers();

    // Restart volunteer markers refresh interval
    startVolunteerMarkersRefresh();
  });
}

// Alias the old function name to the new one for backwards compatibility
function toggleSatellite() {
  toggleMapStyle('satellite');
}

// Check if the map is ready with all necessary layers and sources
function isMapReady(map) {
  if (!map) {
    console.log('Map is not defined');
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
      console.log(
        `Map not ready: layers=${hasPolygonLayer && hasOutlineLayer}, source=${!!hasSource}, data=${!!hasData}`
      );
    }

    return isReady;
  } catch (error) {
    console.log(`Error checking map readiness: ${error.message}`);
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
      console.log('Required layers not found, attempting to add them');

      // Check if the source exists
      const hasSource = map.getSource('locations');

      if (!hasSource) {
        console.log("Source 'locations' not found, attempting to add it");

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

  // Get all keys except internal ones and those containing 'დისკუსია'
  const keys = Object.keys(data).filter(
    key =>
      !['id', 'fillColor', 'strokeColor', 'lat', 'lon', 'inGroup'].includes(key) &&
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
  html += `</div>`;

  // Add directions link if lat and lon are available
  if (data.lat && data.lon) {
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${data.lat},${data.lon}`;
    html += `<div class="directions-container">
            <a href="${directionsUrl}" target="_blank" style="position: relative; z-index: 3500;">ნავიგაცია</a>
            ${data.id ? `<button id="notification-btn-${instanceId}" onclick="sendNotification('notification-btn-${instanceId}')" style="position: relative; z-index: 3500;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>განაახლე ინფორმაცია!</button>` : ''}
        </div>`;
  }

  html += `</div>`;
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

// Global variables
let MIN_ZOOM_LEVEL = 5;
let mapClickedFeatureId = null;
let currentMapStyle = 'standard'; // Default style
let volunteerMarkers = []; // Track volunteer markers
let volunteerMarkersInterval; // Interval for refreshing volunteer markers

// Maps library reference fix - ensure we use maplibregl consistently
const mapboxgl = maplibregl; // Alias for compatibility

// Function to setup volunteer markers on the map
function setupVolunteerMarkers() {
  console.log('Setting up volunteer markers');

  // Remove existing volunteer markers
  if (volunteerMarkers && volunteerMarkers.length > 0) {
    console.log(`Cleaning up ${volunteerMarkers.length} volunteer markers`);
    volunteerMarkers.forEach(marker => {
      if (marker) {
        marker.remove();
      }
    });
    volunteerMarkers = [];
  }

  if (!volunteerData || volunteerData.length === 0) {
    console.log('No volunteer data available to display');
    return;
  }

  // Get current time for age calculations
  const now = new Date();

  // Filter out volunteer locations older than 6 hours
  const recentVolunteers = volunteerData.filter(volunteer => {
    const ageInMinutes = (now - volunteer.timestamp) / (1000 * 60);
    return ageInMinutes <= MAX_VOLUNTEER_AGE_MINUTES;
  });

  console.log(`Creating ${recentVolunteers.length} volunteer markers (filtered from ${volunteerData.length} total)`);

  // Create a marker for each volunteer location
  recentVolunteers.forEach((volunteer, index) => {
    // Ensure coordinates are valid numbers
    const lat = parseFloat(volunteer.lat);
    const lon = parseFloat(volunteer.lon);

    // Skip if coordinates are invalid
    if (isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0) {
      console.warn(`Skipping marker with invalid coordinates: [${lat}, ${lon}]`);
      return;
    }

    // Calculate how old this location data is (in minutes)
    const ageInMinutes = (now - volunteer.timestamp) / (1000 * 60);

    // Determine marker color and pulse based on age
    const { color, shouldPulse } = getVolunteerMarkerStyle(ageInMinutes);

    // Create a simple marker element
    const el = document.createElement('div');
    el.className = 'volunteer-marker';
    el.dataset.volunteerId = volunteer.phone_number || index;

    // Create SVG for the marker
    const svgSize = 40;
    const innerRadius = 6;
    const middleRadius = 12;
    const outerRadius = 16;

    // Create SVG markup
    let svg = `
      <svg width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}" xmlns="http://www.w3.org/2000/svg">
        <!-- Outer circle -->
        <circle 
          cx="${svgSize / 2}" 
          cy="${svgSize / 2}" 
          r="${outerRadius}" 
          fill="rgba(255,255,255,0.2)" 
          stroke="${color}" 
          stroke-width="2" 
          opacity="0.4"
          ${shouldPulse ? 'class="volunteer-outer-pulse"' : ''}
        />
        
        <!-- Middle circle -->
        <circle 
          cx="${svgSize / 2}" 
          cy="${svgSize / 2}" 
          r="${middleRadius}" 
          fill="rgba(255,255,255,0.6)" 
          stroke="${color}" 
          stroke-width="2"
          ${shouldPulse ? 'class="volunteer-middle-pulse"' : ''}
        />
        
        <!-- Inner circle -->
        <circle 
          cx="${svgSize / 2}" 
          cy="${svgSize / 2}" 
          r="${innerRadius}" 
          fill="${color}" 
          stroke="white" 
          stroke-width="2" 
        />
    `;

    // Add direction arrow if heading is available
    if (volunteer.heading && !isNaN(volunteer.heading)) {
      svg += `
        <!-- Direction indicator -->
        <polygon 
          points="${svgSize / 2},5 ${svgSize / 2 - 5},15 ${svgSize / 2 + 5},15" 
          fill="${color}" 
          transform="rotate(${volunteer.heading} ${svgSize / 2} ${svgSize / 2})"
        />
      `;
    }

    // Close SVG
    svg += `</svg>`;

    // Set the SVG content
    el.innerHTML = svg;

    // Create the marker with MapLibre
    try {
      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'center'
      })
        .setLngLat([lon, lat])
        .addTo(map);

      // Log the creation for debugging
      console.log(`Created volunteer marker at [${lon}, ${lat}]`);

      // Add tooltip with volunteer info
      createVolunteerTooltip(marker, volunteer, ageInMinutes);

      // Store marker reference for later cleanup
      volunteerMarkers.push(marker);
    } catch (error) {
      console.error(`Error creating volunteer marker at [${lon}, ${lat}]:`, error);
    }
  });

  // Make sure the SVG animations are properly added
  ensureVolunteerMarkerCSS();
}

// Function to determine volunteer marker style based on age
function getVolunteerMarkerStyle(ageInMinutes) {
  // Calculate relative age as a percentage of the maximum age
  const agePercentage = ageInMinutes / MAX_VOLUNTEER_AGE_MINUTES;

  // Recent updates (< 15 minutes): Blue and pulsing
  if (ageInMinutes < 15) {
    return { color: '#4285F4', shouldPulse: true }; // Google Maps blue, pulsing
  }
  // Between 15-60 minutes: Blue, no pulse
  else if (ageInMinutes < 60) {
    return { color: '#4285F4', shouldPulse: false }; // Google Maps blue, no pulse
  }
  // Between 1-3 hours: Blue gradually becoming light blue
  else if (ageInMinutes < MAX_VOLUNTEER_AGE_MINUTES / 2) { // Half of max age (3 hours)
    // Calculate color between blue and light blue based on age
    const blueValue = Math.max(66, Math.floor(66 + (1 - (ageInMinutes / (MAX_VOLUNTEER_AGE_MINUTES / 2))) * 189));
    return {
      color: `rgb(66, ${blueValue}, 244)`,
      shouldPulse: false
    };
  }
  // Between 3-6 hours: Light blue to gray
  else if (ageInMinutes < MAX_VOLUNTEER_AGE_MINUTES) {
    // Calculate color between light blue and gray based on age
    const relativeAge = (ageInMinutes - (MAX_VOLUNTEER_AGE_MINUTES / 2)) / (MAX_VOLUNTEER_AGE_MINUTES / 2);
    const blueComponent = Math.max(128, Math.floor(128 + (1 - relativeAge) * 127));
    const greenComponent = Math.min(180, Math.floor(120 + relativeAge * 60));
    const redComponent = Math.min(158, Math.floor(98 + relativeAge * 60));
    return {
      color: `rgb(${redComponent}, ${greenComponent}, ${blueComponent})`,
      shouldPulse: false
    };
  }
  // This case should never be reached with our filter, but keeping as a fallback
  else {
    return { color: '#9E9E9E', shouldPulse: false }; // Gray for older markers
  }
}

// Function to ensure CSS for volunteer markers is added
function ensureVolunteerMarkerCSS() {
  if (!document.querySelector('style#volunteer-marker-style')) {
    const style = document.createElement('style');
    style.id = 'volunteer-marker-style';
    style.textContent = `
      .volunteer-marker {
        cursor: pointer;
      }
      
      @keyframes pulse-outer {
        0% { r: 16; opacity: 0.4; }
        50% { r: 19; opacity: 0.2; }
        100% { r: 16; opacity: 0.4; }
      }
      
      @keyframes pulse-middle {
        0% { r: 12; opacity: 0.6; }
        50% { r: 14; opacity: 0.4; }
        100% { r: 12; opacity: 0.6; }
      }
      
      .volunteer-marker:hover circle:nth-child(3) {
        transform-origin: center;
        transform: scale(1.2);
        transition: transform 0.2s;
      }
      
      .volunteer-outer-pulse {
        animation: pulse-outer 2s infinite;
      }
      
      .volunteer-middle-pulse {
        animation: pulse-middle 2s infinite;
      }
    `;
    document.head.appendChild(style);
  }
}

// Function to create tooltip for volunteer markers
function createVolunteerTooltip(marker, volunteer, ageInMinutes) {
  // Format the age for display
  const ageText = formatTimeAgo(ageInMinutes);

  // Create tooltip content
  const tooltipContent = `
    <div class="volunteer-tooltip">
      <div class="tooltip-header">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>
        Live Volunteer Location
      </div>
      <div class="tooltip-content">
        <p><strong>Updated:</strong> ${ageText}</p>
        <p><strong>Phone:</strong> ${volunteer.phone_number || 'N/A'}</p>
        ${volunteer.altitude ? `<p><strong>Altitude:</strong> ${Math.round(volunteer.altitude)}m</p>` : ''}
        ${volunteer.heading ? `<p><strong>Direction:</strong> ${formatHeading(volunteer.heading)}</p>` : ''}
        ${volunteer.speed ? `<p><strong>Speed:</strong> ${formatSpeed(volunteer.speed)}</p>` : ''}
      </div>
    </div>
  `;

  // Create tooltip using Tippy.js
  const tooltipInstance = tippy(marker.getElement(), {
    content: tooltipContent,
    allowHTML: true,
    interactive: true,
    placement: 'top',
    trigger: 'click',
    theme: 'light',
    appendTo: document.body,
    maxWidth: 300,
    animation: 'scale',
  });

  // Add reference to instance for cleanup
  const instanceId = `volunteer-${volunteer.phone_number}-${Date.now()}`;
  if (typeof tippyInstances !== 'undefined') {
    tippyInstances[instanceId] = tooltipInstance;
  }
}

// Helper function to format time ago text
function formatTimeAgo(minutes) {
  if (minutes < 1) {
    return 'Just now';
  } else if (minutes < 60) {
    return `${Math.floor(minutes)} minutes ago`;
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(minutes / 1440);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}

// Helper function to format heading in a more user-friendly way
function formatHeading(heading) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
  const index = Math.round(heading / 45) % 8;
  return `${Math.round(heading)}° (${directions[index]})`;
}

// Helper function to format speed in a more user-friendly way
function formatSpeed(speedMps) {
  const speedKmh = speedMps * 3.6; // Convert m/s to km/h
  return `${Math.round(speedKmh)} km/h`;
}

// Function to start periodic refresh of volunteer markers
function startVolunteerMarkersRefresh() {
  // Clear any existing interval
  if (volunteerMarkersInterval) {
    clearInterval(volunteerMarkersInterval);
  }

  // Refresh volunteer markers every minute to update colors based on timestamp
  volunteerMarkersInterval = setInterval(() => {
    console.log('Refreshing volunteer markers');

    // Fetch fresh volunteer data from API
    loadVolunteerData()
      .then(newData => {
        // Process the new data
        processVolunteerData(newData);
        // Update markers with fresh data
        setupVolunteerMarkers();
      })
      .catch(error => {
        console.error('Error refreshing volunteer data:', error);
        // Still try to update markers with existing data
        setupVolunteerMarkers();
      });
  }, 60000); // Update every minute
}

// Define the max age constant globally so it can be used in multiple functions
const MAX_VOLUNTEER_AGE_MINUTES = 360; // 6 hours

// Function to process volunteer location data
function processVolunteerData(data) {
  if (!data || !data.length) {
    console.log('No volunteer data to process');
    volunteerData = [];
    return;
  }

  console.log('Processing volunteer location data');

  // Process each volunteer location entry
  volunteerData = data.map(entry => {
    // Handle both API JSON format and CSV format
    // API format has data directly in the expected format
    // CSV format has strings that need to be parsed

    // Parse timestamp to Date object (handle both string and Date object)
    let timestamp;
    if (typeof entry.timestamp === 'string') {
      timestamp = new Date(entry.timestamp);
    } else if (entry.timestamp instanceof Date) {
      timestamp = entry.timestamp;
    } else if (entry.created_at) { // API might use different field name
      timestamp = new Date(entry.created_at);
    } else {
      timestamp = new Date(); // Fallback to current date if no timestamp
    }

    return {
      timestamp: timestamp,
      lat: parseFloat(entry.lat || entry.latitude || 0),
      lon: parseFloat(entry.lon || entry.longitude || 0),
      accuracy: parseFloat(entry.accuracy || 0),
      altitude: parseFloat(entry.altitude || 0),
      altitude_accuracy: parseFloat(entry.altitude_accuracy || 0),
      heading: parseFloat(entry.heading || 0),
      speed: parseFloat(entry.speed || 0),
      phone_number: entry.phone_number || entry.phoneNumber || '',
      message: entry.message || '',
      user_agent: entry.user_agent || entry.userAgent || '',
      ip_hash: entry.ip_hash || entry.ipHash || ''
    };
  });

  // Filter out entries with invalid coordinates
  volunteerData = volunteerData.filter(entry =>
    !isNaN(entry.lat) && !isNaN(entry.lon) &&
    entry.lat !== null && entry.lon !== null &&
    entry.lat !== 0 && entry.lon !== 0
  );

  console.log(`Processed ${volunteerData.length} valid volunteer location entries`);

  // Expose the function to the global scope
  window.processVolunteerData = processVolunteerData;
}
