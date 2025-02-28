// Modal and instruction functionality

// Functions for help request modal
function openHelpModal() {
  const modal = document.getElementById('help-modal');
  const mobileSidebarButton = document.querySelector('.mobile-sidebar-button');

  // Hide the mobile sidebar button
  if (mobileSidebarButton) {
    mobileSidebarButton.style.display = 'none';
  }

  modal.style.display = 'block';

  // Add a small delay before adding the active class for animation
  setTimeout(() => {
    modal.classList.add('active');
  }, 10);

  // Prevent scrolling of the background content
  document.body.style.overflow = 'hidden';
}

function closeHelpModal() {
  const modal = document.getElementById('help-modal');
  const mobileSidebarButton = document.querySelector('.mobile-sidebar-button');

  modal.classList.remove('active');

  // Add a small delay before hiding the modal to allow for animation
  setTimeout(() => {
    modal.style.display = 'none';

    // Show the mobile sidebar button again if it exists
    if (mobileSidebarButton && window.innerWidth <= 768) {
      mobileSidebarButton.style.display = 'block';
    }
  }, 300);

  // Re-enable scrolling of the background content
  document.body.style.overflow = '';
}

// Functions for help offer modal
function openHelpOfferModal() {
  const modal = document.getElementById('help-offer-modal');
  const mobileSidebarButton = document.querySelector('.mobile-sidebar-button');

  // Hide the mobile sidebar button
  if (mobileSidebarButton) {
    mobileSidebarButton.style.display = 'none';
  }

  modal.style.display = 'block';

  // Add a small delay before adding the active class for animation
  setTimeout(() => {
    modal.classList.add('active');
  }, 10);

  // Prevent scrolling of the background content
  document.body.style.overflow = 'hidden';
}

function closeHelpOfferModal() {
  const modal = document.getElementById('help-offer-modal');
  const mobileSidebarButton = document.querySelector('.mobile-sidebar-button');

  modal.classList.remove('active');

  // Add a small delay before hiding the modal to allow for animation
  setTimeout(() => {
    modal.style.display = 'none';

    // Show the mobile sidebar button again if it exists
    if (mobileSidebarButton && window.innerWidth <= 768) {
      mobileSidebarButton.style.display = 'block';
    }
  }, 300);

  // Re-enable scrolling of the background content
  document.body.style.overflow = '';
}

// Functions for notification modal
function openNotificationModal(btnId) {
  const modal = document.getElementById('notification-modal');
  if (!modal) {
    console.error('Notification modal not found in openNotificationModal');
    return;
  }

  // Ensure the modal has the highest z-index
  modal.style.zIndex = '4000';

  const mobileSidebarButton = document.querySelector('.mobile-sidebar-button');

  // Store the button ID in a data attribute for later use
  modal.setAttribute('data-button-id', btnId);

  // Check if the form exists or has been replaced with success message
  const form = document.getElementById('notification-form');
  if (!form || form.querySelector('.success-message')) {
    // Recreate the form if it doesn't exist or contains success message
    const modalBody = modal.querySelector('.modal-body') || modal;
    modalBody.innerHTML = `
            <form id="notification-form">
                <div class="form-group">
                    <label for="volunteer-name">მოხალისის სახელი</label>
                    <input placeholder="თქვენი სახელი" type="text" id="volunteer-name" name="volunteer-name" required>
                </div>
                <div class="form-group">
                    <label for="phone-number">ტელეფონის ნომერი</label>
                    <input placeholder="თქვენი ტელეფონის ნომერი" type="tel" id="phone-number" name="phone-number" required>
                </div>
                <div class="form-group">
                    <label for="notification-message">შეტყობინება</label>
                    <textarea placeholder="რა სახის დახმარება იგეგმება ან გაეწია დაზარალებულს" id="notification-message" name="notification-message" rows="4" required></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="cancel-btn" onclick="closeNotificationModal()">გაუქმება</button>
                    <button type="submit" class="submit-btn">გაგზავნა</button>
                </div>
            </form>
        `;

    // Re-attach the submit event listener to the new form
    const newForm = document.getElementById('notification-form');
    if (newForm) {
      newForm.addEventListener('submit', submitNotification);
    }
  } else {
    // Reset form fields with null checks
    const volunteerNameField = document.getElementById('volunteer-name');
    const phoneNumberField = document.getElementById('phone-number');
    const messageField = document.getElementById('notification-message');

    if (volunteerNameField) volunteerNameField.value = '';
    if (phoneNumberField) phoneNumberField.value = '';
    if (messageField) messageField.value = '';
  }

  // Hide the mobile sidebar button
  if (mobileSidebarButton) {
    mobileSidebarButton.style.display = 'none';
  }

  modal.style.display = 'block';

  // Add a small delay before adding the active class for animation
  setTimeout(() => {
    modal.classList.add('active');
  }, 10);

  // Prevent scrolling of the background content
  document.body.style.overflow = 'hidden';
}

function closeNotificationModal() {
  const modal = document.getElementById('notification-modal');
  if (!modal) {
    console.error('Notification modal not found in closeNotificationModal');
    return;
  }

  const mobileSidebarButton = document.querySelector('.mobile-sidebar-button');

  modal.classList.remove('active');

  // Add a small delay before hiding the modal completely for animation
  setTimeout(() => {
    modal.style.display = 'none';

    // Re-enable scrolling
    document.body.style.overflow = '';

    // Show the mobile sidebar button again
    if (mobileSidebarButton) {
      mobileSidebarButton.style.display = '';
    }
  }, 300);
}

// Function to send notification to specified API
function sendNotification(btnId) {
  // Check if notification modal exists
  const modal = document.getElementById('notification-modal');
  if (!modal) {
    console.error('Notification modal not found');
    alert('შეტყობინების გაგზავნა ვერ მოხერხდა. გთხოვთ სცადოთ თავიდან.');
    return;
  }

  // Ensure the modal has the highest z-index
  modal.style.zIndex = '4000';

  // Don't close tooltips - we want them to remain visible
  // The notification modal will appear on top due to higher z-index

  // Open the notification modal instead of directly sending the notification
  openNotificationModal(btnId);
}

// Function to submit the notification form
function submitNotification(event) {
  event.preventDefault();

  // Get form fields with null checks
  const volunteerNameField = document.getElementById('volunteer-name');
  const phoneNumberField = document.getElementById('phone-number');
  const messageField = document.getElementById('notification-message');

  // If any field is missing, show an error and return
  if (!volunteerNameField || !phoneNumberField || !messageField) {
    alert('ფორმის ელემენტები ვერ მოიძებნა. გთხოვთ სცადოთ თავიდან.');
    return;
  }

  // Get form values
  const volunteerName = volunteerNameField.value.trim();
  const phoneNumber = phoneNumberField.value.trim();
  const message = messageField.value.trim();

  // Validate inputs
  if (!volunteerName || !phoneNumber || !message) {
    alert('გთხოვთ შეავსოთ ყველა ველი');
    return;
  }

  // Get the button ID from the modal's data attribute
  const modal = document.getElementById('notification-modal');
  if (!modal) {
    alert('მოდალი ვერ მოიძებნა. გთხოვთ სცადოთ თავიდან.');
    return;
  }

  const btnId = modal.getAttribute('data-button-id');
  if (!btnId) {
    alert('ღილაკის ID ვერ მოიძებნა. გთხოვთ სცადოთ თავიდან.');
    return;
  }

  // Extract the instance ID from the button ID
  let instanceId;

  // Handle both types of button IDs
  if (btnId.startsWith('card-notification-btn-')) {
    instanceId = btnId.replace('card-notification-btn-', '');
  } else if (btnId.startsWith('notification-btn-')) {
    instanceId = btnId.replace('notification-btn-', '');
  } else {
    instanceId = btnId; // Fallback
  }

  // Find the data for this instance
  let itemData = null;
  try {
    if (Array.isArray(sampleData)) {
      // Find the item in the array that matches the instanceId
      itemData = sampleData.find(item => item.id === instanceId);

      // If not found by id, try using the index (for backward compatibility)
      if (!itemData && !isNaN(instanceId)) {
        const index = parseInt(instanceId);
        if (index >= 0 && index < sampleData.length) {
          itemData = sampleData[index];
        }
      }
    }
  } catch (error) {
    console.warn('Error accessing sampleData:', error);
  }

  // Use the actual ID from the data if available
  const data = {
    id: itemData && itemData.id ? itemData.id : 'a15522', // Fallback to sample ID if not found
    category: 'ვაპირებ',
    message: volunteerName + ': ' + message,
    phone: phoneNumber,
  };

  // API endpoint
  const apiUrl = 'https://sift.app.n8n.cloud/webhook/9fe92c0c-3ebe-4c4f-9fc4-3bec9e39aa4f';

  // Show loading state on the submit button
  const submitButton = document.querySelector('.submit-btn');
  let originalText = 'გაგზავნა'; // Default text
  if (!submitButton) {
    // If we can't find the button, just proceed with the request
    console.warn('Submit button not found');
  } else {
    originalText = submitButton.textContent;
    submitButton.textContent = 'იგზავნება...';
    submitButton.disabled = true;
  }

  // Disable all form inputs during submission
  const formInputs = document.querySelectorAll(
    '#notification-form input, #notification-form textarea'
  );
  if (formInputs && formInputs.length > 0) {
    formInputs.forEach(input => {
      input.disabled = true;
    });
  }

  // Send the POST request
  fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
    .then(response => {
      console.log('Response status:', response.status);

      // Simplified success check - directly check the status code
      if (response.status === 200 || response.status === 201) {
        // Show success message in the modal
        const form = document.getElementById('notification-form');
        if (form) {
          form.innerHTML = `
                    <div class="success-message">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        <h3>შეტყობინება წარმატებით გაიგზავნა!</h3>
                        <p>გმადლობთ, თქვენი შეტყობინება მიღებულია.</p>
                        <button type="button" class="submit-btn" onclick="closeNotificationModal()">დახურვა</button>
                    </div>
                `;
        }

        // Update the original button
        const button = document.getElementById(btnId);
        if (button) {
          button.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> გაიგზავნა';
          button.style.backgroundColor = '#2ecc71';
        }

        console.log('Notification sent successfully with status:', response.status);

        // Try to parse JSON if available, but don't make success dependent on it
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.indexOf('application/json') !== -1) {
          return response
            .json()
            .then(data => {
              console.log('Response data:', data);
            })
            .catch(err => {
              console.log('Could not parse JSON but request was successful');
            });
        }
      } else {
        // Non-success status code
        throw new Error(`Request failed with status code ${response.status}`);
      }
    })
    .catch(error => {
      // Reset form inputs
      if (formInputs && formInputs.length > 0) {
        formInputs.forEach(input => {
          input.disabled = false;
        });
      }

      // Reset button and show error
      if (submitButton) {
        submitButton.textContent = originalText || 'გაგზავნა';
        submitButton.disabled = false;
      }

      // Show error message
      alert('შეცდომა შეტყობინების გაგზავნისას. გთხოვთ სცადოთ თავიდან.');

      console.error('Error sending notification:', error);
    });
}

// Functions for instructions modal
function openInstructionsModal() {
  const modal = document.getElementById('instructions-modal');
  const mobileSidebarButton = document.querySelector('.mobile-sidebar-button');

  // Hide the mobile sidebar button
  if (mobileSidebarButton) {
    mobileSidebarButton.style.display = 'none';
  }

  modal.style.display = 'block';

  // Add a small delay before adding the active class for animation
  setTimeout(() => {
    modal.classList.add('active');
  }, 10);

  // Prevent scrolling of the background content
  document.body.style.overflow = 'hidden';
}

function closeInstructionsModal() {
  const modal = document.getElementById('instructions-modal');
  const mobileSidebarButton = document.querySelector('.mobile-sidebar-button');

  modal.classList.remove('active');

  // Add a small delay before hiding the modal to allow for animation
  setTimeout(() => {
    modal.style.display = 'none';

    // Show the mobile sidebar button again if it exists
    if (mobileSidebarButton && window.innerWidth <= 768) {
      mobileSidebarButton.style.display = 'block';
    }
  }, 300);

  // Re-enable scrolling of the background content
  document.body.style.overflow = '';
}

// Function to initialize instruction tabs
function initInstructionTabs() {
  const tabs = document.querySelectorAll('.instructions-tab');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs
      tabs.forEach(t => t.classList.remove('active'));

      // Add active class to clicked tab
      tab.classList.add('active');

      // Hide all content sections
      document.querySelectorAll('.instructions-content').forEach(content => {
        content.classList.remove('active');
      });

      // Show the corresponding content section
      const tabId = tab.getAttribute('data-tab');
      document.getElementById(`${tabId}-content`).classList.add('active');
    });
  });
}
