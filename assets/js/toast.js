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
      top: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      pointer-events: none;
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
  toast.style.cssText = `
    margin: 0.5rem;
    padding: 12px 16px;
    background-color: #333;
    color: white;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    min-width: 250px;
    max-width: 90%;
    pointer-events: auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
    opacity: 0;
    transform: translateY(-20px);
    transition: all 0.3s ease;
  `;

  // Set type-specific styles
  switch (settings.type) {
    case 'success':
      toast.style.backgroundColor = '#4CAF50';
      break;
    case 'warning':
      toast.style.backgroundColor = '#FFC107';
      toast.style.color = '#333';
      break;
    case 'error':
      toast.style.backgroundColor = '#F44336';
      break;
    default: // info
      toast.style.backgroundColor = '#2196F3';
  }

  // Create message element
  const messageEl = document.createElement('div');
  messageEl.innerHTML = settings.message;
  messageEl.className = 'toast-message';
  toast.appendChild(messageEl);

  // Add close button if closable
  if (settings.closable) {
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.className = 'toast-close';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: inherit;
      font-size: 20px;
      font-weight: bold;
      cursor: pointer;
      margin-left: 10px;
      padding: 0 5px;
    `;
    closeBtn.addEventListener('click', () => {
      removeToast(toast);
    });
    toast.appendChild(closeBtn);
  }

  // Add to container
  container.appendChild(toast);

  // Trigger reflow for animation
  void toast.offsetWidth;

  // Show toast with animation
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';

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
  // Add exit animation
  toast.style.opacity = '0';
  toast.style.transform = 'translateY(-20px)';

  // Remove after animation completes
  setTimeout(() => {
    toast.remove();

    // Check if container is empty
    if (toastContainer && toastContainer.children.length === 0) {
      toastContainer.remove();
      toastContainer = null;
    }
  }, 300);
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

// Make functions globally available
window.showToast = showToast;
window.removeToast = removeToast;
window.showLocationAccessToast = showLocationAccessToast;
window.clearToast = clearToast;