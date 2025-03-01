/**
 * Toast notification system
 * A lightweight, customizable toast notification system for displaying temporary messages.
 */

// Toast configuration defaults
const TOAST_DEFAULTS = {
  duration: 5000,      // Default duration in milliseconds
  position: 'top',     // Default position ('top', 'bottom')
  type: 'info',        // Default type ('info', 'success', 'warning', 'error')
  closable: true       // Whether the toast has a close button
};

// Container for toast notifications
let toastContainer = null;

// Initialize toast container
function initToastContainer() {
  console.log('Initializing toast container');
  try {
    // If container already exists, return it
    if (toastContainer) {
      console.log('Toast container already exists');
      return toastContainer;
    }

    // Create toast container
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      z-index: 9999;
      left: 0;
      right: 0;
      top: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      pointer-events: none;
      width: 100%;
    `;

    // Add to document
    if (document.body) {
      document.body.appendChild(toastContainer);
      console.log('Toast container appended to body');
    } else {
      console.error('Document body not available yet');
      // Attempt to add when body is available
      document.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(toastContainer);
        console.log('Toast container appended on DOMContentLoaded');
      });
    }

    return toastContainer;
  } catch (error) {
    console.error('Error initializing toast container:', error);
    // Create a simple fallback alert function if toast container fails
    window.showSimpleToast = function (message) {
      alert(message);
    };
    return null;
  }
}

/**
 * Display a toast notification
 * @param {Object} options - Toast options
 * @param {string} options.message - The message to display
 * @param {string} [options.type] - Type of toast ('info', 'success', 'warning', 'error')
 * @param {number} [options.duration] - Duration in milliseconds
 * @param {boolean} [options.closable] - Whether the toast can be closed
 */
function showToast(options) {
  // Add debug logs to verify the function is being called
  console.log('showToast function called with options:', options);

  // Initialize container if it doesn't exist
  const container = initToastContainer();
  console.log('Toast container initialized:', container);

  // Merge default options with provided options
  const settings = {
    ...TOAST_DEFAULTS,
    ...options
  };
  console.log('Merged toast settings:', settings);

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${settings.type}`;

  // Make notification buttons pulsate when a toast is shown
  document.querySelectorAll('[id^="notification-btn-"]').forEach(btn => {
    btn.classList.add('pulsing');
  });
  toast.style.cssText = `
    margin: 0.5rem;
    padding: 16px 20px;
    background-color: #333;
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    min-width: 280px;
    max-width: 90%;
    pointer-events: auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 15px;
    font-weight: 500;
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    border-left: 6px solid #333;
  `;

  // Set type-specific styles
  switch (settings.type) {
    case 'success':
      toast.style.backgroundColor = '#00b09b';
      toast.style.borderLeftColor = '#00d1b2';
      break;
    case 'warning':
      toast.style.backgroundColor = '#FF9800';
      toast.style.borderLeftColor = '#FFC107';
      toast.style.color = 'white';
      break;
    case 'error':
      toast.style.backgroundColor = '#e53935';
      toast.style.borderLeftColor = '#f44336';
      break;
    default: // info
      toast.style.backgroundColor = '#1976D2';
      toast.style.borderLeftColor = '#2196F3';
  }

  // Create message element with improved styling
  const messageEl = document.createElement('div');
  messageEl.innerHTML = settings.message;
  messageEl.className = 'toast-message';
  messageEl.style.cssText = `
    flex: 1;
    line-height: 1.4;
    letter-spacing: 0.2px;
    word-break: break-word;
    padding-right: 5px;
  `;

  // Add an icon based on toast type for better visual cues
  const iconEl = document.createElement('div');
  iconEl.className = 'toast-icon';
  iconEl.style.cssText = `
    margin-right: 12px;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
  `;

  // Set icon based on toast type
  switch (settings.type) {
    case 'success':
      iconEl.innerHTML = '✓';
      break;
    case 'warning':
      iconEl.innerHTML = '⚠';
      break;
    case 'error':
      iconEl.innerHTML = '✕';
      break;
    default: // info
      iconEl.innerHTML = 'ℹ';
  }

  // Create a container for icon and message
  const contentEl = document.createElement('div');
  contentEl.style.cssText = `
    display: flex;
    align-items: center;
    flex: 1;
  `;

  contentEl.appendChild(iconEl);
  contentEl.appendChild(messageEl);
  toast.appendChild(contentEl);

  // Add close button if closable
  if (settings.closable) {
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.className = 'toast-close';
    closeBtn.style.cssText = `
      background: rgba(255, 255, 255, 0.15);
      border: none;
      color: inherit;
      font-size: 22px;
      font-weight: bold;
      cursor: pointer;
      margin-left: 15px;
      padding: 0 8px;
      border-radius: 50%;
      width: 28px;
      height: 28px;
      line-height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    `;
    closeBtn.onmouseover = () => {
      closeBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
      closeBtn.style.transform = 'scale(1.1)';
    };
    closeBtn.onmouseout = () => {
      closeBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
      closeBtn.style.transform = 'scale(1)';
    };
    closeBtn.addEventListener('click', () => {
      removeToast(toast);
    });
    toast.appendChild(closeBtn);
  }

  // Add to container
  container.appendChild(toast);

  // Trigger reflow for animation
  void toast.offsetWidth;

  // Show toast with enhanced animation
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0) scale(1)';
  });

  // Set timeout to remove toast
  if (settings.duration > 0) {
    setTimeout(() => {
      removeToast(toast);
    }, settings.duration);
  }

  return toast;
}

/**
 * Remove a toast notification
 * @param {HTMLElement} toast - The toast element to remove
 */
function removeToast(toast) {
  // Add exit animation with enhanced visual effect
  toast.style.opacity = '0';
  toast.style.transform = 'translateY(-20px) scale(0.95)';
  toast.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.1)';

  // Slight grow/shrink animation before disappearing
  setTimeout(() => {
    toast.style.transform = 'translateY(-20px) scale(0.9)';
  }, 50);

  // Remove after animation completes
  setTimeout(() => {
    toast.remove();

    // Check if container is empty
    if (toastContainer && toastContainer.children.length === 0) {
      toastContainer.remove();
      toastContainer = null;

      // When all toasts are gone, remove pulsing from all notification buttons
      document.querySelectorAll('[id^="notification-btn-"]').forEach(btn => {
        btn.classList.remove('pulsing');
      });
    }
  }, 400); // Increased duration to account for two-phase animation
}

/**
 * Show a location access reminder toast
 * Specialized function for reminding users to allow location access
 */
function showLocationAccessToast() {
  console.log('showLocationAccessToast function called');

  // Check if toast functions exist in different contexts
  console.log('showToast availability:', {
    localFunction: typeof showToast === 'function',
    windowFunction: typeof window.showToast === 'function'
  });

  // Add pulse animation to location button and show arrow
  const locationButton = document.querySelector('.location-button');
  const locationArrow = document.getElementById('location-button-arrow');

  if (locationButton) {
    locationButton.classList.add('pulsing');
    console.log('Added pulsing class to location button');

    // Show the arrow pointing to the location button
    if (locationArrow) {
      locationArrow.style.display = 'block';
      console.log('Showing arrow pointing to location button');
    } else {
      console.warn('Location button arrow element not found');
    }
  } else {
    console.warn('Location button not found when trying to add pulsing animation');
  }

  // Add a delay to ensure DOM is ready
  setTimeout(() => {
    try {
      console.log('Attempting to show location access toast');
      const toastElement = showToast({
        message: 'გთხოვთ დაუშვათ ლოკაციის წვდომა ლოკაციის ღილაკზე დაჭერით',
        type: 'info',
        duration: 10000,
        closable: true
      });

      // Add a data-id attribute to the toast for easy identification
      if (toastElement) {
        toastElement.setAttribute('data-id', 'location-consent');
      }

      // Remove pulsing effect after toast closes
      if (toastElement) {
        // Create a function to remove the pulsing class and hide arrow
        const removePulsing = () => {
          if (locationButton) {
            locationButton.classList.remove('pulsing');
            console.log('Removed pulsing class from location button');
          }

          // Hide the arrow pointing to location button
          const locationArrow = document.getElementById('location-button-arrow');
          if (locationArrow) {
            locationArrow.style.display = 'none';
            console.log('Hiding arrow pointing to location button');
          }
        };

        // Remove pulsing after toast duration + animation time
        setTimeout(removePulsing, 10000 + 300);

        // For closable toasts, also remove pulsing when closed manually
        if (toastElement.querySelector('.toast-close')) {
          toastElement.querySelector('.toast-close').addEventListener('click', removePulsing);
        }
      }

      return toastElement;
    } catch (error) {
      console.error('Error showing location access toast:', error);
      // Fallback to alert if toast fails
      alert('გთხოვთ დაუშვათ ლოკაციის წვდომა ლოკაციის ღილაკზე დაჭერით');

      // Remove pulsing if toast fails
      if (locationButton) {
        locationButton.classList.remove('pulsing');
      }
    }
  }, 500);
}

/**
 * Clears a specific toast by ID or clears all toasts if no ID is provided
 * @param {string} [toastId] - Optional ID of the toast to clear
 */
function clearToast(toastId) {
  if (toastContainer) {
    if (toastId) {
      // Look for toast element with data-id attribute
      const toastElements = toastContainer.querySelectorAll('.toast');
      toastElements.forEach(toast => {
        if (toast.getAttribute('data-id') === toastId) {
          removeToast(toast);
        }
      });
    } else {
      // Clear all toasts
      const toastElements = toastContainer.querySelectorAll('.toast');
      toastElements.forEach(toast => {
        removeToast(toast);
      });
    }
  }
}

// Track if this is the first pin/polygon click since page load
let isFirstClickOfSession = true;

/**
 * Counter for tracking pin/polygon clicks
 * Shows the victim assistance reminder toast only once per 20 clicks
 * Also shows on the first click of each page load
 */
function showVictimAssistanceToast() {
  // Get current counter from localStorage, default to 0
  let clickCounter = parseInt(localStorage.getItem('victimAssistanceClickCounter') || '0');

  // Check if this is the first click of the current page session
  const isFirstClick = isFirstClickOfSession;
  isFirstClickOfSession = false;

  // Increment counter
  clickCounter++;

  // Save updated counter to localStorage
  localStorage.setItem('victimAssistanceClickCounter', clickCounter.toString());

  // Show toast if:
  // - It's the first click of this page session, OR
  // - It's the first click ever, OR
  // - It's a multiple of 20
  if (isFirstClick || clickCounter === 1 || clickCounter % 20 === 0) {
    console.log(`Showing victim assistance toast (click #${clickCounter}, first of session: ${isFirstClick})`);

    // Add a delay to allow info-cards to become visible
    console.log('Adding delay to wait for info-cards to be fully visible');

    // Give UI time to update before checking for visible buttons
    setTimeout(() => {
      // Only target VISIBLE notification buttons by their ID pattern
      const allNotificationButtons = document.querySelectorAll('[id^="notification-btn-"]');
      const visibleButtons = Array.from(allNotificationButtons).filter(btn => {
        // Check if button is visible (has a visible parent, isn't hidden, etc.)
        const style = window.getComputedStyle(btn);
        const rect = btn.getBoundingClientRect();
        const isVisible = style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          rect.width > 0 &&
          rect.height > 0;

        // Check if button is within a visible container/card that's currently expanded
        const card = btn.closest('.card');
        const isInExpandedCard = card ? card.classList.contains('expanded') : true;

        // Also check if button is within an info-card that's visible
        const infoCard = btn.closest('.info-card');
        const isInVisibleInfoCard = infoCard ?
          window.getComputedStyle(infoCard).display !== 'none' : true;

        return isVisible && isInExpandedCard && isInVisibleInfoCard;
      });

      console.log(`Found ${allNotificationButtons.length} total notification buttons, ${visibleButtons.length} are currently visible after UI update`);

      // Only add pulsing class to visible buttons and add click handler to remove pulsing
      visibleButtons.forEach(btn => {
        btn.classList.add('pulsing');
        console.log('Added pulsing class to visible button:', btn.id);

        // Add a one-time click event listener to remove pulsing effect when clicked
        // Use a variable to track if listener is already added to prevent duplicates
        if (!btn._hasPulseClickListener) {
          btn._hasPulseClickListener = true;
          btn.addEventListener('click', function removePulsingOnClick() {
            // Remove the pulsing class
            this.classList.remove('pulsing');
            console.log('Removed pulsing class on button click:', this.id);

            // Remove the event listener to prevent memory leaks
            this.removeEventListener('click', removePulsingOnClick);
            btn._hasPulseClickListener = false;
          });
        }
      });
    }, 300); // 300ms delay to wait for UI updates

    const toast = showToast({
      message: 'გთხოვთ, დაზარალებულთან მისვლის შემდეგ, განაახლოთ ინფორმაცია!',
      type: 'warning', // Changed to warning for better visibility
      duration: 7000,  // Increased duration for better visibility
      closable: true
    });

    // When toast is closed or expires, remove pulsing class
    if (toast) {
      const removePulsing = () => {
        // Only remove pulsing class from buttons that have it
        const pulsatingButtons = document.querySelectorAll('[id^="notification-btn-"].pulsing');

        pulsatingButtons.forEach(btn => {
          btn.classList.remove('pulsing');
          console.log('Removed pulsing class from button:', btn.id);
        });
      };

      // Remove pulsing after toast duration + animation time
      setTimeout(removePulsing, 7000 + 400);

      // For closable toasts, also remove pulsing when closed manually
      if (toast.querySelector('.toast-close')) {
        toast.querySelector('.toast-close').addEventListener('click', removePulsing);
      }
    }

    return toast;
  }

  console.log(`Skipping victim assistance toast (click #${clickCounter}, will show again at click #${Math.ceil(clickCounter / 20) * 20})`);
  return null;
}

// Make functions globally available
window.showToast = showToast;
window.removeToast = removeToast;
window.showLocationAccessToast = showLocationAccessToast;
window.clearToast = clearToast;
window.showVictimAssistanceToast = showVictimAssistanceToast;