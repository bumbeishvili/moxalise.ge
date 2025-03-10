// Utility functions for the application

// Function to copy text to clipboard
async function copyToClipboard(text) {
  if (!text) return false;

  try {
    await navigator.clipboard.writeText(text);

    return true;
  } catch (err) {
    console.error('Failed to copy text: ', err);
    return false;
  }
}

// Function to check if a string contains a URL
function containsURL(str) {
  if (!str || typeof str !== 'string') return false;

  // First quick check for common protocol prefixes
  if (str.includes('https://') || str.includes('http://')) return true;

  // Pattern to find URLs within text
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return urlRegex.test(str);
}

// Function to extract URLs from text and format them as links
function formatURLsInText(text) {
  if (!text || typeof text !== 'string') return text;

  // Pattern to find URLs within text
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  // Replace URLs with anchor tags
  return text.replace(urlRegex, url => {
    // Check if it's a Google Maps link
    if (url.includes('google.com/maps') || url.includes('maps.app.goo.gl')) {
      return `<a href="${url}" target="_blank">Google Maps</a>`;
    }
    // Otherwise, use the original URL as the link text
    return `<a href="${url}" target="_blank">${url}</a>`;
  });
}

// Function to format values, converting URLs to links
function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  // Format URLs in text if present
  return formatURLsInText(value);
}

// Function to toggle tabs panel
function toggleTabs() {
  const panel = document.getElementById('tabs-panel');
  const map = document.getElementById('map');
  const isHidden = panel.style.display === 'none' || !panel.style.display;

  panel.style.display = isHidden ? 'block' : 'none';
  map.classList.toggle('panel-visible');

  // Create and load iframe only when showing the panel
  if (isHidden) {
    const placeholder = document.getElementById('iframe-placeholder');

    // Check if iframe already exists
    if (!placeholder.querySelector('iframe')) {
      // Create iframe
      const iframe = document.createElement('iframe');
      iframe.src =
        'https://docs.google.com/spreadsheets/d/1cWGBzYPa93_NZq8ZwtqF94fhwIdovrWkPg6-PRNaVHc/edit?usp=sharing';
      iframe.allow = 'autoplay';
      iframe.sandbox = 'allow-scripts allow-same-origin allow-popups allow-forms';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';

      // Add load event to handle errors
      iframe.onload = function () {
        this.contentWindow.onerror = function () {
          return true;
        };
      };

      // Add iframe to placeholder
      placeholder.appendChild(iframe);
    }
  }

  if (window.map) {
    window.map.resize();
  }
}

// Function to toggle mobile sidebar
function toggleMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('mobile-visible');
}

// Function to toggle the map legend visibility
function toggleLegend() {
  const legend = document.querySelector('.map-legend');
  const toggleButton = document.querySelector('.legend-toggle');

  legend.classList.toggle('hidden');

  // Update toggle button visibility
  if (legend.classList.contains('hidden')) {
    toggleButton.style.display = 'block';
  } else {
    toggleButton.style.display = 'block';
  }
}

// Function to generate a shareable URL for an ID
function generateShareableUrl(id) {
  if (!id) return '';

  // Create a URL based on the current location
  const url = new URL(window.location.href);

  // Set the ID parameter
  url.searchParams.set('id', id);

  // Return the full URL as a string
  return url.toString();
}

// Function to handle copying ID to clipboard with visual feedback
function handleIdCopy(event, id) {
  event.stopPropagation();

  if (!id) return;

  const button = event.currentTarget;
  const shareableUrl = generateShareableUrl(id);

  copyToClipboard(shareableUrl).then(success => {
    if (success) {
      // Visual feedback on button
      button.classList.add('copied');

      // Reset button after delay
      setTimeout(() => {
        button.classList.remove('copied');
      }, 1500);
    }
  });
}

// Function to toggle panel
function togglePanel() {
  const panel = document.getElementById('bottom-panel');
  const map = document.getElementById('map');
  const isHidden = panel.style.display === 'none' || !panel.style.display;

  panel.style.display = isHidden ? 'block' : 'none';
  map.classList.toggle('panel-visible');

  // Trigger map resize to ensure proper rendering
  if (window.map) {
    window.map.resize();
  }
}

// Function to create polygon coordinates around a center point
function createPolygonCoordinates(map, centerLng, centerLat, sides = 6, sizeMultiplier = 1.0) {
  const coordinates = [];

  // Fixed area in square meters (1 square kilometer = 1,000,000 square meters)
  const targetAreaInSquareMeters = 1 * 1000 * 1000; // 1 km²

  // For a regular polygon with n sides, the area is:
  // A = (n/4) * s² * cot(π/n), where s is the side length
  // For a hexagon (n=6): A = (6/4) * s² * cot(π/6) = (6/4) * s² * √3
  // Solving for s: s = √(A / ((6/4) * √3))

  // However, we're creating a polygon from a center point with "radius" r
  // For a regular hexagon, if r is the radius (distance from center to any vertex),
  // then the side length s = r

  // If we want a specific area, we can calculate the required radius:
  // For a regular hexagon: A = (3√3/2) * r²
  // Thus, r = √(A / (3√3/2))

  // Calculate radius in meters to achieve the target area for a hexagon
  const radiusInMeters =
    Math.sqrt(targetAreaInSquareMeters / ((3 * Math.sqrt(3)) / 2)) * sizeMultiplier;

  // console.log(
  //   `Creating polygon with ${radiusInMeters.toFixed(2)}m radius to cover ${targetAreaInSquareMeters}m² area (${targetAreaInSquareMeters / 1000000} km²)`
  // );

  // Earth's radius in meters
  const earthRadius = 6378137;

  // Convert radius from meters to radians
  const radiusRadians = radiusInMeters / earthRadius;

  // Create the polygon points
  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides;

    // Calculate offset in radians
    const dLat = radiusRadians * Math.sin(angle);
    // Apply cosine correction for longitude to maintain circular shape
    const dLng = (radiusRadians * Math.cos(angle)) / Math.cos((centerLat * Math.PI) / 180);

    // Convert to degrees and add to center point
    const lat = centerLat + dLat * (180 / Math.PI);
    const lng = centerLng + dLng * (180 / Math.PI);

    coordinates.push([lng, lat]);
  }

  // Close the polygon by repeating the first point
  coordinates.push([...coordinates[0]]);

  return coordinates;
}

// Function to calculate point offset for clustered points
function calculatePointOffset(index, baseRadius) {
  // Arrange points in a circle
  const angle = (index % 6) * ((Math.PI * 2) / 6);
  const radius = baseRadius * 1.5; // Slightly larger than the polygon radius

  return {
    x: Math.cos(angle) * radius * 0.00005, // Scale down the offset for map coordinates
    y: Math.sin(angle) * radius * 0.00005, // Scale down the offset for map coordinates
  };
}

// Function to highlight a polygon on the map
function highlightPolygon(map, index, force = false) {
  //console.log(`Highlighting polygon with index: ${index}, force: ${force}`);

  if (!force && !isMapReady(map)) {
    console.warn('Map is not ready for highlighting. Will retry in 500ms.');
    // Retry after a delay if the map isn't ready
    setTimeout(() => highlightPolygon(map, index), 500);
    return;
  }

  try {
    // Store the current data
    const currentData = map.getSource('locations')?._data;

    if (!currentData || !currentData.features) {
      console.error('No data available in map source');
      return;
    }

    // If we have a valid index, resize the selected polygon to be 3x bigger
    if (index >= 0 && currentData && currentData.features) {
      // First, restore all polygons to their original size
      restorePolygonSizes(map);

      // Find the feature with the matching id
      const selectedFeature = currentData.features.find(f => f.properties.id === index);

      if (selectedFeature) {
        //console.log(`Found feature with id ${index}, resizing to 3x`);
        // Get the current center of the polygon
        const coordinates = selectedFeature.geometry.coordinates[0];
        const centerLng =
          coordinates.reduce((sum, coord) => sum + coord[0], 0) / coordinates.length;
        const centerLat =
          coordinates.reduce((sum, coord) => sum + coord[1], 0) / coordinates.length;

        // Create new coordinates for the polygon that are 3x bigger
        const newCoordinates = coordinates.map(coord => {
          const dx = coord[0] - centerLng;
          const dy = coord[1] - centerLat;
          return [centerLng + dx * 3, centerLat + dy * 3];
        });

        // Update the coordinates in the feature
        selectedFeature.geometry.coordinates[0] = newCoordinates;

        // Update the source data
        map.getSource('locations').setData(currentData);
      } else {
        //console.log(`Feature with id ${index} not found in the data`);
      }
    } else if (index === -1) {
      // If index is -1, restore all polygons to their original size
      restorePolygonSizes(map);
    }

    // Reset all polygons
    map.setPaintProperty('location-polygons', 'fill-opacity', [
      'interpolate',
      ['linear'],
      ['zoom'],
      5,
      [
        'case',
        ['==', ['get', 'id'], index],
        0.9, // highlighted opacity
        0.01, // default opacity at zoom level 5
      ],
      8,
      [
        'case',
        ['==', ['get', 'id'], index],
        0.9, // highlighted opacity
        0.3, // default opacity at zoom level 8
      ],
      11,
      [
        'case',
        ['==', ['get', 'id'], index],
        0.9, // highlighted opacity
        0.8, // default opacity at zoom level 11
      ],
      13,
      [
        'case',
        ['==', ['get', 'id'], index],
        0.9, // highlighted opacity
        0.3, // default opacity at zoom level 13
      ],
      15,
      [
        'case',
        ['==', ['get', 'id'], index],
        0.9, // highlighted opacity
        0.08, // default opacity at zoom level 15
      ],
    ]);

    // Update stroke color and width for highlighted polygon
    map.setPaintProperty('location-polygons-outline', 'line-color', [
      'case',
      ['==', ['get', 'id'], index],
      '#000000', // black stroke for highlighted
      ['get', 'strokeColor'], // default stroke color
    ]);

    map.setPaintProperty('location-polygons-outline', 'line-width', [
      'case',
      ['==', ['get', 'id'], index],
      8, // highlighted width - increased from 5 to 8
      2, // default width
    ]);

    //console.log(`Successfully updated polygon styles for index ${index}`);
  } catch (error) {
    console.error('Error in highlightPolygon:', error);
  }

  // Remove highlight from all pins
  document.querySelectorAll('.map-pin').forEach(pin => {
    pin.classList.remove('highlighted');
  });

  // Add highlight to the selected pin if it exists
  locationMarkers.forEach(marker => {
    if (marker.id === index) {
      const pinElement = marker.marker.getElement().querySelector('.map-pin');
      if (pinElement) {
        pinElement.classList.add('highlighted');
        //console.log(`Added highlighted class to pin with id ${index}`);
      }
    }
  });

  // Remove highlight from all cards
  document.querySelectorAll('.card').forEach(c => c.classList.remove('highlighted-card'));

  // Add highlight to selected card
  const selectedCard = document.querySelector(`.card[data-index="${index}"]`);
  if (selectedCard) {
    selectedCard.classList.add('highlighted-card');
    //console.log(`Added highlighted-card class to card with data-index ${index}`);

    // Scroll the card into view if it's visible
    if (selectedCard.style.display !== 'none') {
      selectedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
}

// Function to restore all polygons to their original size
function restorePolygonSizes(map) {
  try {
    //console.log('Restoring all polygon sizes');
    // Regenerate features with original sizes
    const features = updateFeatures(true);

    // Update the source data
    map.getSource('locations').setData({
      type: 'FeatureCollection',
      features: features,
    });
  } catch (error) {
    console.error('Error restoring polygon sizes:', error);
  }
}

// Add a simpler direct highlight function that doesn't rely on the map source
function simpleHighlightPolygon(map, index) {
  //console.log(`Simple highlighting polygon with index: ${index}`);

  try {
    // Just highlight the card and pin without touching the map
    // Remove highlight from all pins
    document.querySelectorAll('.map-pin').forEach(pin => {
      pin.classList.remove('highlighted');
    });

    // Add highlight to the selected pin if it exists
    locationMarkers.forEach(marker => {
      if (marker.id === index) {
        const pinElement = marker.marker.getElement().querySelector('.map-pin');
        if (pinElement) {
          pinElement.classList.add('highlighted');
          //console.log(`Added highlighted class to pin with id ${index}`);
        }
      }
    });

    // Remove highlight from all cards
    document.querySelectorAll('.card').forEach(c => c.classList.remove('highlighted-card'));

    // Add highlight to selected card
    const selectedCard = document.querySelector(`.card[data-index="${index}"]`);
    if (selectedCard) {
      selectedCard.classList.add('highlighted-card');
      //console.log(`Added highlighted-card class to card with data-index ${index}`);

      // Scroll the card into view if it's visible
      if (selectedCard.style.display !== 'none') {
        selectedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  } catch (error) {
    console.error('Error in simpleHighlightPolygon:', error);
  }
}

// Direct approach to highlight the polygon without relying on the map source
function directHighlightPolygon(map, index) {
  //console.log(`Direct highlighting polygon with index: ${index}`);

  try {
    // Ensure map has required layers
    const layersEnsured = ensureMapLayers(map);
    if (!layersEnsured) {
      console.error('Could not ensure map layers, aborting direct highlight');
      return;
    }

    // Set the paint properties directly without modifying the source data
    map.setPaintProperty('location-polygons', 'fill-opacity', [
      'interpolate',
      ['linear'],
      ['zoom'],
      5,
      [
        'case',
        ['==', ['get', 'id'], index],
        0.9, // highlighted opacity
        0.01, // default opacity at zoom level 5
      ],
      8,
      [
        'case',
        ['==', ['get', 'id'], index],
        0.9, // highlighted opacity
        0.3, // default opacity at zoom level 8
      ],
      11,
      [
        'case',
        ['==', ['get', 'id'], index],
        0.9, // highlighted opacity
        0.8, // default opacity at zoom level 11
      ],
      13,
      [
        'case',
        ['==', ['get', 'id'], index],
        0.9, // highlighted opacity
        0.3, // default opacity at zoom level 13
      ],
      15,
      [
        'case',
        ['==', ['get', 'id'], index],
        0.9, // highlighted opacity
        0.08, // default opacity at zoom level 15
      ],
    ]);

    // Update stroke color and width for highlighted polygon
    map.setPaintProperty('location-polygons-outline', 'line-color', [
      'case',
      ['==', ['get', 'id'], index],
      '#000000', // black stroke for highlighted
      ['get', 'strokeColor'], // default stroke color
    ]);

    map.setPaintProperty('location-polygons-outline', 'line-width', [
      'case',
      ['==', ['get', 'id'], index],
      8, // highlighted width - increased from 5 to 8
      2, // default width
    ]);

    //console.log(`Successfully updated polygon styles for index ${index}`);

    // Remove highlight from all pins
    document.querySelectorAll('.map-pin').forEach(pin => {
      pin.classList.remove('highlighted');
    });

    // Add highlight to the selected pin if it exists
    locationMarkers.forEach(marker => {
      if (marker.id === index) {
        const pinElement = marker.marker.getElement().querySelector('.map-pin');
        if (pinElement) {
          pinElement.classList.add('highlighted');
          //console.log(`Added highlighted class to pin with id ${index}`);
        }
      }
    });

    // Remove highlight from all cards
    document.querySelectorAll('.card').forEach(c => c.classList.remove('highlighted-card'));

    // Add highlight to selected card
    const selectedCard = document.querySelector(`.card[data-index="${index}"]`);
    if (selectedCard) {
      selectedCard.classList.add('highlighted-card');
      //console.log(`Added highlighted-card class to card with data-index ${index}`);

      // Scroll the card into view if it's visible
      if (selectedCard.style.display !== 'none') {
        selectedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  } catch (error) {
    console.error('Error in directHighlightPolygon:', error);
  }
}

// Check if the map is ready with all necessary layers and sources
function isMapReady(map) {
  if (!map) return false;

  // Check if map style has loaded
  if (!map.isStyleLoaded()) return false;

  // Check for required source
  if (!map.getSource('locations')) return false;

  // Check for required layers
  if (!map.getLayer('location-polygons')) return false;
  if (!map.getLayer('location-polygons-outline')) return false;

  return true;
}

// Ensure map has all necessary layers and sources
function ensureMapLayers(map) {
  if (!map) return false;

  try {
    // Skip if layers already exist
    if (
      map.getLayer('location-polygons') &&
      map.getLayer('location-polygons-outline') &&
      map.getSource('locations')
    ) {
      return true;
    }

    // Add source if it doesn't exist
    if (!map.getSource('locations')) {
      map.addSource('locations', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: updateFeatures(),
        },
      });
    }

    // Add polygon layer
    if (!map.getLayer('location-polygons')) {
      map.addLayer({
        id: 'location-polygons',
        type: 'fill',
        source: 'locations',
        paint: {
          'fill-color': ['get', 'fillColor'],
          'fill-opacity': 0.7,
        },
      });
    }

    // Add polygon outline layer
    if (!map.getLayer('location-polygons-outline')) {
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

    // Verify the layers and source were added successfully
    return (
      map.getLayer('location-polygons') &&
      map.getLayer('location-polygons-outline') &&
      map.getSource('locations')
    );
  } catch (error) {
    console.error('Error ensuring map layers:', error);
    return false;
  }
}
