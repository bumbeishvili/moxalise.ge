// Location tracking functionality

// Reference to user location marker
let userLocationMarker = null;
let locationUpdateInterval = null;
let lastPhoneNumber = null;

// Add watchPosition ID variable
let watchPositionId = null;
// Expose watchPositionId to window for access from other files
window.watchPositionId = null;

// Session flag to track first update after page load
let isFirstUpdateAfterPageLoad = true;

// Minimum delay between location updates (in milliseconds)
const MIN_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Debug flag for detailed logging
const DEBUG_LOCATION = true;

// Detect Safari browser
function isSafari() {
  const ua = navigator.userAgent;
  // Safari includes "Safari" in user agent and isn't Chrome/Edge/Firefox
  return ua.includes('Safari') && !ua.includes('Chrome') && !ua.includes('Edg') && !ua.includes('Firefox');
}

// Initialize location tracking on page load
document.addEventListener('DOMContentLoaded', function () {
  console.log('DOMContentLoaded event fired in tracking.js');

  // Set a flag to track if we've attempted to start location tracking
  window.locationTrackingAttempted = false;

  // Log the browser details for debugging
  console.log('Browser detection:', {
    userAgent: navigator.userAgent,
    isSafari: isSafari(),
    hasSavedLocation: localStorage.getItem('lastSentLocation') !== null,
    hasGeolocation: 'geolocation' in navigator
  });

  // Check for saved phone number
  const savedPhone = localStorage.getItem('lastPhoneNumber');
  const lastLocation = localStorage.getItem('lastSentLocation');

  console.log('Last phone number from localStorage:', savedPhone);
  console.log('Last location from localStorage:', lastLocation ? 'exists' : 'not found');

  // Check for permission status if possible and auto-start if permission is granted
  if ('permissions' in navigator && savedPhone) {
    navigator.permissions.query({ name: 'geolocation' })
      .then(permissionStatus => {
        console.log('Geolocation permission status:', permissionStatus.state);

        // Set up permission change listener
        permissionStatus.onchange = function () {
          console.log('Geolocation permission changed to:', this.state);

          // If permission changed to granted and we have a phone number, start tracking
          if (this.state === 'granted' && localStorage.getItem('lastPhoneNumber')) {
            console.log('Permission changed to granted, auto-starting location sharing');
            window.locationTrackingAttempted = true;
            autoStartLocationSharing();
          }
        };

        // If permission is already granted and we have a phone number, auto-start location sharing
        if (permissionStatus.state === 'granted' && savedPhone) {
          console.log('Permission already granted and phone number saved, auto-starting location sharing');
          window.locationTrackingAttempted = true;
          autoStartLocationSharing();
        }
      })
      .catch(error => {
        console.error('Error checking geolocation permission:', error);
      });
  } else {
    console.log('Permissions API not supported in this browser or no saved phone number');

    // For browsers without Permissions API but with saved phone number, 
    // try to detect if we can use geolocation
    if (savedPhone && 'geolocation' in navigator) {
      console.log('No Permissions API, but phone number saved. Will test geolocation access...');
      // A brief timeout to ensure browser is ready
      setTimeout(() => {
        // Try to get position with a short timeout to see if permission is granted
        navigator.geolocation.getCurrentPosition(
          function (position) {
            // Success means permission is granted
            console.log('Successfully accessed geolocation without Permissions API, auto-starting');
            window.locationTrackingAttempted = true;
            autoStartLocationSharing();
          },
          function (error) {
            // An error here likely means permission denied or prompt needed
            console.log('Could not auto-start location sharing:', error.code, error.message);
          },
          { timeout: 3000, maximumAge: 60000 } // Short timeout, accept cached position
        );
      }, 1000);
    }
  }

  // If we have a saved location, show it on the map
  if (savedPhone && lastLocation) {
    lastPhoneNumber = savedPhone;

    // Place marker on the map if data exists
    try {
      const locationData = JSON.parse(lastLocation);
      if (locationData.latitude && locationData.longitude) {
        console.log('Placing marker from saved location:', locationData.latitude, locationData.longitude);

        // Create marker element
        const el = document.createElement('div');
        el.className = 'user-location-marker';

        // Add the marker to the map once it's loaded
        if (typeof map !== 'undefined') {
          console.log('Map is defined, placing marker now');
          placeUserMarker(locationData.latitude, locationData.longitude);
        } else {
          console.log('Map is not defined yet, adding event listener for map_initialized');
          // Wait for map to be initialized
          window.addEventListener('map_initialized', function () {
            console.log('map_initialized event fired, placing marker now');
            placeUserMarker(locationData.latitude, locationData.longitude);
          });
        }
      }
    } catch (error) {
      console.error('Error parsing last location:', error);
    }
  } else {
    console.log('No saved phone number or location found, skipping location sharing initialization');
  }
});

/**
 * Auto-starts location sharing using the saved phone number
 * Reuses most of the startLocationSharing logic but without user interaction
 */
function autoStartLocationSharing() {
  console.log('Auto-starting location sharing');

  // Reset the first update flag to ensure we send the initial update
  isFirstUpdateAfterPageLoad = true;

  // If tracking is already active, don't start again
  if (watchPositionId !== null) {
    console.log('Location tracking already active with watchPositionId:', watchPositionId);
    return;
  }

  // Set the flag to indicate we've attempted to start tracking
  window.locationTrackingAttempted = true;

  // Get the saved phone number
  const savedPhone = localStorage.getItem('lastPhoneNumber');
  if (!savedPhone) {
    console.error('No saved phone number found for auto-start');
    return;
  }

  // Set the lastPhoneNumber variable for use in location sending
  lastPhoneNumber = savedPhone;

  // Check if we need to verify permission first
  if ('permissions' in navigator) {
    navigator.permissions.query({ name: 'geolocation' })
      .then(permissionStatus => {
        console.log('Geolocation permission status in autoStartLocationSharing:', permissionStatus.state);

        // Only proceed if permission is granted
        if (permissionStatus.state === 'granted') {
          startActualLocationTracking();
        } else {
          console.log('Permission not granted, cannot auto-start location tracking');
        }
      })
      .catch(error => {
        console.error('Error checking permission in autoStartLocationSharing:', error);
        // Fallback to direct geolocation request
        startActualLocationTracking();
      });
  } else {
    // For browsers without Permissions API, try direct geolocation
    startActualLocationTracking();
  }

  // Inner function to start the actual tracking once permission is confirmed
  function startActualLocationTracking() {
    // Request location with same options as manual tracking
    if ('geolocation' in navigator) {
      const geolocationOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      };

      console.log('Auto-starting location tracking with options:', geolocationOptions);

      navigator.geolocation.getCurrentPosition(
        function (position) {
          console.log('Geolocation success in auto-start:', position.coords);
          // Success callback - got the position
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;

          try {
            // Place marker on the map
            placeUserMarker(userLat, userLng);

            // Fly to the user's location
            if (typeof map !== 'undefined') {
              map.flyTo({
                center: [userLng, userLat],
                zoom: Math.min(13, MAX_ZOOM_LEVEL), // Assuming MAX_ZOOM_LEVEL is defined
                duration: 1500,
              });
            }

            // Send location immediately to the server
            sendLocationToServer(position);

            // Clear any existing watchPosition
            if (watchPositionId !== null) {
              navigator.geolocation.clearWatch(watchPositionId);
            }

            // Set up watchPosition to continuously monitor location changes
            console.log('Setting up watchPosition with options:', geolocationOptions);
            watchPositionId = navigator.geolocation.watchPosition(
              sendLocationToServer,
              function (error) {
                // Use the specialized Safari error handler
                if (isSafari()) {
                  handleSafariGeolocationError(error);
                } else {
                  console.error('watchPosition error:', error.code, error.message);
                  if (error.code === 1) { // PERMISSION_DENIED
                    alert('გთხოვთ ნება დართოთ ლოკაციის გაზიარებას');
                  } else if (error.code === 2) { // POSITION_UNAVAILABLE
                    alert('თქვენი ლოკაციის განსაზღვრა ვერ ხერხდება. გთხოვთ სცადოთ თავიდან.');
                  } else if (error.code === 3) { // TIMEOUT
                    alert('ლოკაციის განსაზღვრის მოთხოვნამ დიდხანს გასტანა. გთხოვთ სცადოთ თავიდან.');
                  }
                }
              },
              geolocationOptions
            );
            console.log('Auto-start watchPosition set up with ID:', watchPositionId);
            // Update window variable for access from other files
            window.watchPositionId = watchPositionId;

            // Display a notification to user that tracking is active

          } catch (error) {
            console.error('Error in auto-start location tracking:', error);
          }
        },
        function (error) {
          console.log('Could not auto-start location tracking:', error.code, error.message);
          // Don't show error to user since this was an automatic attempt
        },
        geolocationOptions
      );
    }
  }
}

/**
 * Places the user location marker on the map
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 */
function placeUserMarker(lat, lng) {
  // If we already have a marker, remove it
  if (userLocationMarker) {
    userLocationMarker.remove();
  }

  // Create marker element
  const el = document.createElement('div');
  el.className = 'user-location-marker';

  // Add the marker to the map
  userLocationMarker = new maplibregl.Marker({
    element: el,
    anchor: 'center',
  })
    .setLngLat([lng, lat])
    .addTo(map);
}

/**
 * Opens the phone number input dialog without immediately requesting location
 */
function showMyLocation() {
  console.log('showMyLocation function called from tracking.js');
  console.log('Current tracking state:', {
    watchPositionId: watchPositionId,
    windowWatchPositionId: window.watchPositionId,
    trackingAttempted: window.locationTrackingAttempted
  });

  // Log Safari-specific information if applicable
  if (isSafari()) {
    console.log('Safari browser detected in showMyLocation');
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' })
        .then(status => {
          console.log('Current geolocation permission state in Safari:', status.state);
        })
        .catch(err => {
          console.error('Error checking permissions in Safari:', err);
        });
    } else {
      console.log('Safari does not support Permissions API');
    }
  }

  // Check location tracking status - use both local and window variables to be safe
  const isTrackingActive = (watchPositionId !== null) || (window.watchPositionId !== null);

  // If location tracking is already active, just open the phone modal to allow changing the number
  if (isTrackingActive) {
    console.log('Location tracking active, opening modal to change number and stopping current tracking');

    // Stop current tracking first
    stopLocationSharing();

    // Open the phone input modal
    setTimeout(() => {
      console.log('Opening phone input modal to change phone number');
      if (typeof openPhoneInputModal === 'function') {
        openPhoneInputModal();

        // Add a delayed check to verify the modal is visible
        setTimeout(() => {
          const modal = document.getElementById('phone-input-modal');
          if (modal) {
            console.log('Modal visibility check (change number):', {
              display: modal.style.display,
              computedDisplay: window.getComputedStyle(modal).display,
              classList: Array.from(modal.classList),
              isActive: modal.classList.contains('active'),
              zIndex: window.getComputedStyle(modal).zIndex,
              isVisible: modal.offsetWidth > 0 && modal.offsetHeight > 0
            });

            // Force ensure visibility if needed
            if (window.getComputedStyle(modal).display === 'none' || !modal.classList.contains('active')) {
              console.log('Modal not properly visible, forcing display');
              modal.style.cssText = 'display: block !important; opacity: 1 !important; visibility: visible !important;';
              modal.classList.add('active');
            }
          } else {
            console.error('Modal element not found in DOM after openPhoneInputModal call');
          }
        }, 500);
      } else {
        console.error('openPhoneInputModal function not found!');
        alert('Error: Could not open phone input form. Please refresh the page and try again.');
      }
    }, 300);

    return;
  }

  // If not tracking, open the phone modal directly
  console.log('No active tracking, opening phone input modal first');
  if (typeof openPhoneInputModal === 'function') {
    openPhoneInputModal();

    // Add a delayed check to verify the modal is visible
    setTimeout(() => {
      const modal = document.getElementById('phone-input-modal');
      if (modal) {
        console.log('Modal visibility check:', {
          display: modal.style.display,
          computedDisplay: window.getComputedStyle(modal).display,
          classList: Array.from(modal.classList),
          isActive: modal.classList.contains('active'),
          zIndex: window.getComputedStyle(modal).zIndex,
          isVisible: modal.offsetWidth > 0 && modal.offsetHeight > 0
        });

        // Force ensure visibility if needed
        if (window.getComputedStyle(modal).display === 'none' || !modal.classList.contains('active')) {
          console.log('Modal not properly visible, forcing display');
          modal.style.cssText = 'display: block !important; opacity: 1 !important; visibility: visible !important;';
          modal.classList.add('active');
        }
      } else {
        console.error('Modal element not found in DOM after openPhoneInputModal call');
      }
    }, 500);
  } else {
    console.error('openPhoneInputModal function not found!');
    alert('Error: Could not open phone input form. Please refresh the page and try again.');
  }
}

/**
 * Validates a Georgian mobile phone number
 * @param {string} phoneNumber - The phone number to validate
 * @return {boolean} Whether the phone number is valid
 */
function validatePhoneNumber(phoneNumber) {
  // Must be 9 digits and start with 5
  const regex = /^5\d{8}$/;
  return regex.test(phoneNumber);
}

/**
 * Starts sharing location after the user has entered their phone number
 * This now handles the actual location request
 */
function startLocationSharing() {
  console.log('startLocationSharing called');

  // Reset the first update flag to ensure we send the initial update
  isFirstUpdateAfterPageLoad = true;

  // Safari-specific debugging
  if (isSafari()) {
    console.log('Safari browser detected in startLocationSharing');
    console.log('Safari details:', {
      isMobile: /iPhone|iPad|iPod/.test(navigator.userAgent),
      iOS: /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream,
      previouslyShared: localStorage.getItem('lastSentLocation') !== null,
      geolocationSupported: 'geolocation' in navigator
    });
  }

  const phoneInput = document.getElementById('phone-input');
  if (!phoneInput) {
    console.error('phone-input element not found!');
    alert('Error: Could not find phone input field. Please refresh the page and try again.');
    return;
  }

  const phoneNumber = phoneInput.value.trim();

  if (!validatePhoneNumber(phoneNumber)) {
    alert('გთხოვთ შეიყვანოთ სწორი მობილურის ნომერი, რომელიც იწყება 5-ით და შედგება 9 ციფრისგან');
    return;
  }

  // Save phone number to local storage and variable
  localStorage.setItem('lastPhoneNumber', phoneNumber);
  lastPhoneNumber = phoneNumber;

  // Show a feedback message that the number was saved
  const saveConfirmation = document.createElement('div');
  saveConfirmation.style.cssText = `
    position: absolute;
    bottom: 15px;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(76, 175, 80, 0.9);
    color: white;
    padding: 8px 15px;
    border-radius: 4px;
    font-size: 14px;
    transition: opacity 0.3s;
    z-index: 1000;
  `;
  saveConfirmation.textContent = 'ნომერი შენახულია';
  document.body.appendChild(saveConfirmation);

  // Remove the confirmation message after 2 seconds
  setTimeout(() => {
    saveConfirmation.style.opacity = '0';
    setTimeout(() => saveConfirmation.remove(), 300);
  }, 2000);

  // Close the modal
  if (typeof closePhoneInputModal === 'function') {
    closePhoneInputModal();
  } else {
    console.error('closePhoneInputModal function not found!');
    // Try direct DOM manipulation as fallback
    const modal = document.getElementById('phone-input-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  // Show loading indication
  const button = document.querySelector('.location-button');
  if (button) {
    const originalText = button.textContent;
    button.textContent = 'იძებნება...';
    button.disabled = true;

    // Request location permissions and get current position
    if ('geolocation' in navigator) {
      console.log('Requesting geolocation permission');

      const geolocationOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      };

      // Log permission status before requesting (if API available)
      if ('permissions' in navigator) {
        navigator.permissions.query({ name: 'geolocation' })
          .then(permissionStatus => {
            console.log('Geolocation permission status before request:', permissionStatus.state);
          })
          .catch(error => {
            console.error('Error checking permission status:', error);
          });
      }

      console.log('About to call getCurrentPosition with options:', geolocationOptions);

      navigator.geolocation.getCurrentPosition(
        function (position) {
          console.log('Geolocation success:', position.coords);
          // Success callback - got the position
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;

          try {
            // Place marker on the map
            placeUserMarker(userLat, userLng);

            // Fly to the user's location
            map.flyTo({
              center: [userLng, userLat],
              zoom: Math.min(13, MAX_ZOOM_LEVEL), // Limit zoom to max 17.3
              duration: 1500,
            });

            // Send location immediately to the server
            sendLocationToServer(position);

            // Clear any existing watchPosition
            if (watchPositionId !== null) {
              navigator.geolocation.clearWatch(watchPositionId);
            }

            // Set up watchPosition to continuously monitor location changes
            console.log('Setting up watchPosition with options:', geolocationOptions);
            watchPositionId = navigator.geolocation.watchPosition(
              sendLocationToServer,
              function (error) {
                // Use the specialized Safari error handler
                if (isSafari()) {
                  handleSafariGeolocationError(error);
                } else {
                  console.error('watchPosition error:', error.code, error.message);
                  if (error.code === 1) { // PERMISSION_DENIED
                    alert('გთხოვთ ნება დართოთ ლოკაციის გაზიარებას');
                  } else if (error.code === 2) { // POSITION_UNAVAILABLE
                    alert('თქვენი ლოკაციის განსაზღვრა ვერ ხერხდება. გთხოვთ სცადოთ თავიდან.');
                  } else if (error.code === 3) { // TIMEOUT
                    alert('ლოკაციის განსაზღვრის მოთხოვნამ დიდხანს გასტანა. გთხოვთ სცადოთ თავიდან.');
                  }
                }
              },
              geolocationOptions
            );
            console.log('watchPosition set up with ID:', watchPositionId);

            // Reset button state if it exists
            if (button) {
              button.textContent = originalText;
              button.disabled = false;
            }

            // Show the stop button
            // const stopButton = document.querySelector('.stop-location-button');
            // if (stopButton) {
            //   stopButton.style.display = 'block';
            // } else {
            //   console.error('stop-location-button not found when trying to show it');
            // }

            // Show status message
            const statusMsg = document.getElementById('location-status-message');
            if (statusMsg) {
              statusMsg.style.display = 'block';
            }
          } catch (error) {
            console.error('Error setting up location tracking:', error);
            if (button) {
              button.textContent = originalText;
              button.disabled = false;
            }
            alert('Error setting up location tracking: ' + error.message);
          }
        },
        function (error) {
          // Use the specialized Safari error handler
          if (isSafari()) {
            handleSafariGeolocationError(error);
          } else {
            console.error('Geolocation error in startLocationSharing:', error.code, error.message);
            if (error.code === 1) { // PERMISSION_DENIED
              alert('გთხოვთ ნება დართოთ ლოკაციის გაზიარებას');
            } else if (error.code === 2) { // POSITION_UNAVAILABLE
              alert('თქვენი ლოკაციის განსაზღვრა ვერ ხერხდება. გთხოვთ სცადოთ თავიდან.');
            } else if (error.code === 3) { // TIMEOUT
              alert('ლოკაციის განსაზღვრის მოთხოვნამ დიდხანს გასტანა. გთხოვთ სცადოთ თავიდან.');
            }
          }

          if (button) {
            button.textContent = originalText;
            button.disabled = false;
          }
        },
        geolocationOptions
      );
    } else {
      console.error('Geolocation is not supported by this browser');
      alert('თქვენი ბრაუზერი ვერ იძლევა ლოკაციის გაზიარების საშუალებას');

      if (button) {
        button.textContent = originalText;
        button.disabled = false;
      }
    }
  } else {
    console.error('location-button not found!');
    // Try to continue without button reference
    startLocationHelper();
  }
}

/**
 * Special function to handle Safari geolocation errors
 * @param {GeolocationPositionError} error - The error object from geolocation API
 * @param {Function} callback - Optional callback to run after logging error details
 */
function handleSafariGeolocationError(error, callback) {
  // Create a detailed error report
  const errorDetails = {
    code: error.code,
    message: error.message,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    isSafari: isSafari(),
    isIOS: /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream,
    hasLocalStorage: localStorage.getItem('lastSentLocation') !== null,
    browserName:
      /Chrome/.test(navigator.userAgent) ? 'Chrome' :
        /Firefox/.test(navigator.userAgent) ? 'Firefox' :
          /Safari/.test(navigator.userAgent) ? 'Safari' :
            /Edge|Edg/.test(navigator.userAgent) ? 'Edge' :
              'Other',
    platform: navigator.platform,
    language: navigator.language
  };

  // Log detailed error information for debugging
  console.error('Detailed geolocation error:', errorDetails);

  // Check for specific Safari issues
  if (isSafari()) {
    console.log('Detected Safari browser with geolocation error');

    // For permission denied in Safari
    if (error.code === 1) {
      console.log('Safari permission denied. Checking settings...');

      // Attempt to check permissions status if available
      if ('permissions' in navigator) {
        navigator.permissions.query({ name: 'geolocation' })
          .then(status => {
            console.log('Current Safari permission status:', status.state);
            errorDetails.permissionState = status.state;

            // Log complete error details after getting permission state
            console.log('Complete Safari error data:', errorDetails);

            if (callback) callback(errorDetails);
          })
          .catch(permError => {
            console.error('Error checking Safari permissions:', permError);
            errorDetails.permissionCheckError = permError.message;

            if (callback) callback(errorDetails);
          });
      } else {
        console.log('Safari permissions API not available');
        errorDetails.permissionsAPIAvailable = false;

        if (callback) callback(errorDetails);
      }

      return errorDetails;
    }

    // For position unavailable in Safari
    if (error.code === 2) {
      console.log('Safari position unavailable. This could be due to:');
      console.log('- Location services disabled system-wide');
      console.log('- Poor GPS signal or indoors');
      console.log('- Safari-specific geolocation bug');

      // Check for location services at the system level (limited detection)
      if ('geolocation' in navigator) {
        errorDetails.geolocationAPIAvailable = true;
      } else {
        errorDetails.geolocationAPIAvailable = false;
      }

      if (callback) callback(errorDetails);
      return errorDetails;
    }

    // For timeout in Safari
    if (error.code === 3) {
      console.log('Safari location request timed out. This could be due to:');
      console.log('- Safari prompt was ignored or dismissed');
      console.log('- Poor network connectivity');
      console.log('- Safari taking too long to determine location');

      if (callback) callback(errorDetails);
      return errorDetails;
    }
  }

  // For non-Safari browsers just return the error details
  if (callback) callback(errorDetails);
  return errorDetails;
}

/**
 * Helper function to request and share location
 */
function requestAndShareLocation() {
  if ('geolocation' in navigator) {
    // Log if this is Safari
    if (isSafari()) {
      console.log('Safari browser detected in requestAndShareLocation');

      // Check permission status if API is available
      if ('permissions' in navigator) {
        navigator.permissions.query({ name: 'geolocation' })
          .then(permissionStatus => {
            console.log('Geolocation permission status before request in helper:', permissionStatus.state);
          })
          .catch(error => {
            console.error('Error checking permission in helper:', error);
          });
      }
    }

    const geolocationOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    };

    console.log('Requesting location in helper function with options:', geolocationOptions);

    navigator.geolocation.getCurrentPosition(
      function (position) {
        console.log('Geolocation success in helper function:', {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp).toISOString()
        });

        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        try {
          // Place marker on the map
          placeUserMarker(userLat, userLng);

          // Fly to the user's location
          map.flyTo({
            center: [userLng, userLat],
            zoom: Math.min(13, MAX_ZOOM_LEVEL),
            duration: 1500,
          });

          // Send location immediately to the server
          sendLocationToServer();

          // Set up interval to send location every 5 minutes
          if (locationUpdateInterval) {
            clearInterval(locationUpdateInterval);
          }

          locationUpdateInterval = setInterval(sendLocationToServer, 5 * 60 * 1000);

          // Show the stop button
          // const stopButton = document.querySelector('.stop-location-button');
          // if (stopButton) {
          //   stopButton.style.display = 'flex';
          // }

          // Show feedback to user in the modal instead of alert
          const statusMessage = document.getElementById('location-status-message');
          if (statusMessage) {
            statusMessage.style.display = 'flex';

            // Hide the form and info text when showing the status
            const phoneForm = document.getElementById('phone-input-form');
            const locationInfo = document.querySelector('.location-info');
            if (phoneForm) phoneForm.style.display = 'none';
            if (locationInfo) locationInfo.style.display = 'none';
          } else {
            // Fallback to alert if status message element not found
            alert('თქვენი ლოკაცია წარმატებით გაზიარდა და გაგრძელდება ყოველ 5 წუთში ერთხელ');
            closePhoneInputModal();
          }
        } catch (e) {
          console.error('Error in location handling:', e);
        }
      },
      function (error) {
        console.error('Geolocation error in requestAndShareLocation:', error.code, error.message);

        // Use the specialized error handler for detailed logging
        const errorInfo = handleSafariGeolocationError(error, (detailedError) => {
          console.log('Completed Safari error handling with details:', detailedError);
        });

        let errorMessage = "მდებარეობის მიღება ვერ მოხერხდა.";

        switch (error.code) {
          case 1: // PERMISSION_DENIED
            errorMessage = "გთხოვთ, დაუშვათ მდებარეობის წვდომა და სცადეთ თავიდან.";

            // Special message for Safari permission denied
            if (isSafari()) {
              errorMessage = "Safari ბრაუზერში მდებარეობის გაზიარება საჭიროებს ნებართვას. გთხოვთ, შეამოწმოთ Safari-ს პარამეტრები და დაუშვათ მდებარეობის გაზიარება ამ საიტისთვის.";
            }
            break;
          case 2: // POSITION_UNAVAILABLE
            errorMessage = "თქვენი მდებარეობის განსაზღვრა ვერ მოხერხდა. გთხოვთ სცადეთ თავიდან.";

            // Special message for Safari POSITION_UNAVAILABLE
            if (isSafari()) {
              errorMessage = "Safari ვერ ახერხებს თქვენი მდებარეობის განსაზღვრას. შეამოწმეთ, ჩართულია თუ არა ლოკაციის სერვისები თქვენს მოწყობილობაზე Settings > Privacy > Location Services.";
            }
            break;
          case 3: // TIMEOUT
            errorMessage = "მდებარეობის მოთხოვნამ ძალიან დიდი დრო წაიღო. გთხოვთ სცადეთ თავიდან.";

            // Special message for Safari timeout
            if (isSafari()) {
              errorMessage = "Safari-ში მდებარეობის მოთხოვნამ ძალიან დიდი დრო წაიღო. შეამოწმეთ თქვენი ინტერნეტ კავშირი და სცადეთ თავიდან.";
            }
            break;
        }

        alert(errorMessage);
      },
      geolocationOptions
    );
  } else {
    console.error('Geolocation is not available in this browser');
    alert('თქვენი ბრაუზერი არ მხარდაჭერს გეოლოკაციას. გთხოვთ სცადეთ სხვა ბრაუზერით.');
  }
}

/**
 * Sends the current location to the server
 */
function sendLocationToServer(position) {
  console.log('Attempting to send location to server');

  // Log if this is Safari
  if (isSafari()) {
    console.log('Safari browser detected in sendLocationToServer');

    // Special debugging for Safari
    console.log('Safari sendLocationToServer details:', {
      isMobileSafari: /iPhone|iPad|iPod/.test(navigator.userAgent),
      hasLastPhoneNumber: !!lastPhoneNumber,
      hasLocalStorage: localStorage.getItem('lastSentLocation') !== null,
      lastUpdateTime: localStorage.getItem('lastLocationUpdateTime') || 'never'
    });

    // Check permission status
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' })
        .then(permissionStatus => {
          console.log('Geolocation permission status in sendLocationToServer:', permissionStatus.state);
        })
        .catch(error => {
          console.error('Error checking permission in sendLocationToServer:', error);
        });
    }
  }

  if (!lastPhoneNumber) {
    console.error('Phone number not available');
    return;
  }

  // If position is passed directly (from watchPosition), use it
  // Otherwise request a new position
  if (position && position.coords) {
    processAndSendPosition(position);
  } else if ('geolocation' in navigator) {
    const geolocationOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    console.log('Requesting location in sendLocationToServer with options:', geolocationOptions);

    navigator.geolocation.getCurrentPosition(
      processAndSendPosition,
      function (error) {
        // Use the specialized Safari error handler
        if (isSafari()) {
          handleSafariGeolocationError(error);
        } else {
          console.error('Geolocation error in sendLocationToServer:', error.code, error.message);
        }
      },
      geolocationOptions
    );
  }
}

// Helper function to process and send position data
function processAndSendPosition(position) {
  console.log('Got current position for server update:',
    position.coords.latitude.toFixed(6),
    position.coords.longitude.toFixed(6),
    'Accuracy:', position.coords.accuracy,
    'Timestamp:', new Date(position.timestamp).toISOString());

  // Always update the user marker on the map for significant changes
  const lastPosition = JSON.parse(localStorage.getItem('lastSentLocation')) || {};
  const hasSignificantChange = !lastPosition.latitude ||
    Math.abs(lastPosition.latitude - position.coords.latitude) > 0.0001 ||
    Math.abs(lastPosition.longitude - position.coords.longitude) > 0.0001;

  if (hasSignificantChange) {
    placeUserMarker(position.coords.latitude, position.coords.longitude);
  }

  // Check if enough time has passed since the last update
  // UNLESS this is the first update after a page refresh
  const lastUpdateTime = localStorage.getItem('lastLocationUpdateTime');
  const now = new Date().getTime();
  let shouldSendUpdate = true;

  if (lastUpdateTime && !isFirstUpdateAfterPageLoad) {
    const lastUpdate = new Date(lastUpdateTime).getTime();
    const elapsedTime = now - lastUpdate;

    if (elapsedTime < MIN_UPDATE_INTERVAL) {
      console.log(`Skipping server update - only ${Math.floor(elapsedTime / 1000)} seconds since last update (minimum interval is ${MIN_UPDATE_INTERVAL / 1000} seconds)`);
      shouldSendUpdate = false; // Skip update if not enough time has passed
    }
  } else if (isFirstUpdateAfterPageLoad) {
    console.log('First update after page load - bypassing time limit check');
  }

  // If we should skip the update, exit early
  if (!shouldSendUpdate) {
    return;
  }

  // This is now a successful update, so clear the first update flag
  isFirstUpdateAfterPageLoad = false;

  // Create the payload
  const payload = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy || 0,
    altitude: position.coords.altitude || 0,
    altitude_accuracy: position.coords.altitudeAccuracy || 0,
    heading: position.coords.heading || 0,
    speed: position.coords.speed || 0,
    phone_number: lastPhoneNumber,
    message: "Location update",
    user_agent: navigator.userAgent,
    ip_hash: "anonymous" // We can't calculate a real IP hash from client-side
  };

  // Save to local storage
  localStorage.setItem('lastSentLocation', JSON.stringify(payload));
  localStorage.setItem('lastLocationUpdateTime', new Date().toISOString());
  console.log('Saved location to localStorage');

  // Send to server
  console.log('Sending location to API...');
  fetch('https://moxalise-api-vk3ygvyuia-ey.a.run.app/api/location/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
    .then(response => {
      console.log('API response status:', response.status);
      if (!response.ok) {
        // Log detailed information about the error
        console.error('API error details:', {
          status: response.status,
          statusText: response.statusText,
          headers: Array.from(response.headers.entries())
        });

        // Try to get the error response body if available
        return response.text().then(errorText => {
          console.error('API error response:', errorText);
          throw new Error('Network response was not ok: ' + response.status);
        });
      }
      return response.json();
    })
    .then(data => {
      console.log('Location update successful');
      console.log('API response:', data);

      // Show the stop sharing button
      // const stopButton = document.querySelector('.stop-location-button');
      // if (stopButton) {
      //   stopButton.style.display = 'block';
      // } else {
      //   console.error('stop-location-button not found when trying to show it');
      // }
    })
    .catch(error => {
      console.error('Location update failed:', error);
      // Try alternative method if standard fetch fails
      tryXMLHttpRequest();
    });

  // Function to try XMLHttpRequest as fallback
  function tryXMLHttpRequest() {
    // Fallback to XMLHttpRequest if fetch fails
    console.log('Trying fallback with XMLHttpRequest');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://moxalise-api-vk3ygvyuia-ey.a.run.app/api/location/', true);
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        console.log('Location sent successfully via XMLHttpRequest');
      } else {
        console.error('XMLHttpRequest failed with status:', xhr.status, xhr.statusText);
        console.error('Response:', xhr.responseText);

        // Final fallback: try webhook with XMLHttpRequest
        const webhookXhr = new XMLHttpRequest();
        webhookXhr.open('POST', 'https://sift.app.n8n.cloud/webhook/9fe92c0c-3ebe-4c4f-9fc4-3bec9e39aa4f', true);
        webhookXhr.setRequestHeader('Content-Type', 'application/json');

        webhookXhr.onload = function () {
          if (webhookXhr.status >= 200 && webhookXhr.status < 300) {
            console.log('Location sent successfully via webhook XMLHttpRequest');
          } else {
            console.error('All attempts to send location failed');
          }
        };

        webhookXhr.onerror = function () {
          console.error('Final webhook XMLHttpRequest network error');
        };

        webhookXhr.send(JSON.stringify(payload));
      }
    };

    xhr.onerror = function () {
      console.error('XMLHttpRequest network error');

      // Final fallback: try webhook with XMLHttpRequest
      const webhookXhr = new XMLHttpRequest();
      webhookXhr.open('POST', 'https://sift.app.n8n.cloud/webhook/9fe92c0c-3ebe-4c4f-9fc4-3bec9e39aa4f', true);
      webhookXhr.setRequestHeader('Content-Type', 'application/json');

      webhookXhr.onload = function () {
        if (webhookXhr.status >= 200 && webhookXhr.status < 300) {
          console.log('Location sent successfully via webhook XMLHttpRequest');
        } else {
          console.error('All attempts to send location failed');
        }
      };

      webhookXhr.onerror = function () {
        console.error('Final webhook XMLHttpRequest network error');
      };

      webhookXhr.send(JSON.stringify(payload));
    };

    xhr.send(JSON.stringify(payload));
  }
}

/**
 * Stops the location sharing process
 * Note: The stop button has been removed from the UI, but this function
 * is still needed for internal use to stop tracking.
 */
function stopLocationSharing() {
  console.log('stopLocationSharing called');

  // Clear watchPosition if active
  if (watchPositionId !== null) {
    console.log('Clearing watchPosition with ID:', watchPositionId);
    navigator.geolocation.clearWatch(watchPositionId);
    watchPositionId = null;
    window.watchPositionId = null; // Also update window variable

    // Reset the tracking attempted flag so user can restart tracking if needed
    window.locationTrackingAttempted = false;
    console.log('Reset locationTrackingAttempted flag to allow future sharing');
  }

  // For backward compatibility, also clear interval if it exists
  if (locationUpdateInterval) {
    console.log('Clearing location update interval');
    clearInterval(locationUpdateInterval);
    locationUpdateInterval = null;
  }

  // Hide the stop button
  // const stopButton = document.querySelector('.stop-location-button');
  // if (stopButton) {
  //   stopButton.style.display = 'none';
  // } else {
  //   console.error('stop-location-button not found when trying to hide it');
  // }

  alert('ლოკაციის გაზიარება შეჩერებულია');
} 