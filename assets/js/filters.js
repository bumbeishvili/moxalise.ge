// Filtering and search functionality

// Function to initialize filters based on data
function initializeFilters(data) {
  // Trim whitespace and filter out empty values
  const districts = [...new Set(data.map(item => item['რაიონი']?.trim()).filter(Boolean))];
  const villages = [...new Set(data.map(item => item['სოფელი']?.trim()).filter(Boolean))];
  const priorities = [...new Set(data.map(item => item['პრიორიტეტი']?.trim()).filter(Boolean))];
  const statuses = [
    ...new Set(
      data.map(item => item['სტატუსი\n(მომლოდინე/ დასრულებულია)']?.trim()).filter(Boolean)
    ),
  ];

  const districtSelect = document.getElementById('districtFilter');
  const villageSelect = document.getElementById('villageFilter');
  const prioritySelect = document.getElementById('priorityFilter');
  const statusSelect = document.getElementById('statusFilter');
  const updatesSelect = document.getElementById('updatesFilter');

  // Clear existing options (except the first one)
  while (districtSelect.options.length > 1) {
    districtSelect.remove(1);
  }

  while (villageSelect.options.length > 1) {
    villageSelect.remove(1);
  }

  while (prioritySelect.options.length > 1) {
    prioritySelect.remove(1);
  }

  while (statusSelect.options.length > 1) {
    statusSelect.remove(1);
  }

  while (updatesSelect.options.length > 1) {
    updatesSelect.remove(1);
  }

  // Populate native select elements first (they'll be hidden but still used for values)
  districts.sort().forEach(district => {
    const option = document.createElement('option');
    option.value = district;
    option.textContent = district;
    districtSelect.appendChild(option);
  });

  villages.sort().forEach(village => {
    const option = document.createElement('option');
    option.value = village;
    option.textContent = village;
    villageSelect.appendChild(option);
  });

  priorities.sort().forEach(priority => {
    const option = document.createElement('option');
    option.value = priority;
    option.textContent = priority;
    prioritySelect.appendChild(option);
  });

  // Add special option for empty statuses
  const emptyStatusOption = document.createElement('option');
  emptyStatusOption.value = 'EMPTY_STATUS';
  emptyStatusOption.textContent = 'უცნობი სტატუსი';
  statusSelect.appendChild(emptyStatusOption);

  // Add non-empty statuses
  statuses.sort().forEach(status => {
    const option = document.createElement('option');
    option.value = status;
    option.textContent = status;
    statusSelect.appendChild(option);
  });

  // Add options for updates filter
  const hasUpdatesOption = document.createElement('option');
  hasUpdatesOption.value = 'HAS_UPDATES';
  hasUpdatesOption.textContent = 'აქვს განახლება';
  updatesSelect.appendChild(hasUpdatesOption);

  const noUpdatesOption = document.createElement('option');
  noUpdatesOption.value = 'NO_UPDATES';
  noUpdatesOption.textContent = 'არ აქვს განახლება';
  updatesSelect.appendChild(noUpdatesOption);

  // Calculate counts for each option
  const districtCounts = countFieldValues(data, 'რაიონი');
  const villageCounts = countFieldValues(data, 'სოფელი');
  const priorityCounts = countFieldValues(data, 'პრიორიტეტი');

  // Special handling for status counts including empty status
  const statusCounts = {};
  data.forEach(item => {
    const status = item['სტატუსი\n(მომლოდინე/ დასრულებულია)']?.trim() || '';
    if (status) {
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    } else {
      // Count empty status
      statusCounts['EMPTY_STATUS'] = (statusCounts['EMPTY_STATUS'] || 0) + 1;
    }
  });

  // Count items with and without updates
  const updatesCounts = {
    'აქვს განახლება': 0,
    'არ აქვს განახლება': 0,
  };

  data.forEach(item => {
    const updates = item['განახლებები']?.trim() || '';
    if (updates) {
      updatesCounts['აქვს განახლება']++;
    } else {
      updatesCounts['არ აქვს განახლება']++;
    }
  });

  // Create custom dropdowns
  customDropdowns.district = createCustomDropdown(
    'districtFilter',
    districts,
    districtCounts,
    'ყველა რაიონი'
  );

  customDropdowns.village = createCustomDropdown(
    'villageFilter',
    villages,
    villageCounts,
    'ყველა სოფელი'
  );

  customDropdowns.priority = createCustomDropdown(
    'priorityFilter',
    priorities,
    priorityCounts,
    'ყველა პრიორიტეტი'
  );

  customDropdowns.status = createCustomDropdown(
    'statusFilter',
    [...statuses, 'უცნობი სტატუსი'],
    { ...statusCounts, 'უცნობი სტატუსი': statusCounts['EMPTY_STATUS'] || 0 },
    'ყველა სტატუსი',
    null,
    { 'უცნობი სტატუსი': 'EMPTY_STATUS' } // Add special value mapping
  );

  customDropdowns.updates = createCustomDropdown(
    'updatesFilter',
    ['აქვს განახლება', 'არ აქვს განახლება'],
    updatesCounts,
    'ყველა განახლება',
    null,
    { 'აქვს განახლება': 'HAS_UPDATES', 'არ აქვს განახლება': 'NO_UPDATES' }
  );

  // Add filter change handlers to the native selects (already connected via createCustomDropdown)
  districtSelect.addEventListener('change', applyFilters);
  villageSelect.addEventListener('change', applyFilters);
  prioritySelect.addEventListener('change', applyFilters);
  statusSelect.addEventListener('change', applyFilters);
  updatesSelect.addEventListener('change', applyFilters);
}

// Function to count occurrences of each value in a specific field
function countFieldValues(data, fieldName) {
  const counts = {};
  data.forEach(item => {
    const value = item[fieldName]?.trim() || '';
    if (value) {
      counts[value] = (counts[value] || 0) + 1;
    }
  });
  return counts;
}

// Function to create a custom dropdown with distribution data
function createCustomDropdown(elementId, options, counts, placeholder, onChange, specialMapping) {
  // Get the original select element
  const originalSelect = document.getElementById(elementId);
  if (!originalSelect) return null;

  // Get parent container
  const parentContainer = originalSelect.parentNode;

  // Hide the original select element
  originalSelect.style.display = 'none';

  // Create custom dropdown container
  const dropdownContainer = document.createElement('div');
  dropdownContainer.className = 'custom-dropdown';
  dropdownContainer.setAttribute('data-for', elementId);

  // Create header
  const header = document.createElement('div');
  header.className = 'custom-dropdown-header';

  const selectedText = document.createElement('span');
  selectedText.className = 'custom-dropdown-selected';
  selectedText.textContent = placeholder;

  const icon = document.createElement('span');
  icon.className = 'custom-dropdown-icon';
  icon.textContent = '▼';

  header.appendChild(selectedText);
  header.appendChild(icon);

  // Create dropdown menu
  const menu = document.createElement('div');
  menu.className = 'custom-dropdown-menu';

  // Add search input at the top of the dropdown
  const searchContainer = document.createElement('div');
  searchContainer.className = 'custom-dropdown-search';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'custom-dropdown-search-input';
  searchInput.placeholder = 'ძიება...';

  searchContainer.appendChild(searchInput);
  menu.appendChild(searchContainer);

  // Calculate the maximum count for scaling the distribution bars
  const maxCount = Math.max(...Object.values(counts));

  // Add "All" option at the top
  const allItem = document.createElement('div');
  allItem.className = 'custom-dropdown-item selected';
  allItem.setAttribute('data-value', '');

  const allLabel = document.createElement('span');
  allLabel.className = 'custom-dropdown-item-label';
  allLabel.textContent = placeholder;

  const allCount = document.createElement('span');
  allCount.className = 'custom-dropdown-item-count';
  allCount.textContent = `${Object.values(counts).reduce((a, b) => a + b, 0)}`;

  const allDistribution = document.createElement('div');
  allDistribution.className = 'custom-dropdown-distribution';

  const allBar = document.createElement('div');
  allBar.className = 'custom-dropdown-distribution-bar';
  allBar.style.width = '100%';

  allDistribution.appendChild(allBar);
  allItem.appendChild(allLabel);
  allItem.appendChild(allCount);
  allItem.appendChild(allDistribution);
  menu.appendChild(allItem);

  // Add options to the dropdown
  options.forEach(option => {
    const item = document.createElement('div');
    item.className = 'custom-dropdown-item';
    item.setAttribute('data-value', option);

    // Add checkbox for visual selection
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'custom-dropdown-checkbox';
    checkbox.addEventListener('click', e => {
      // Prevent the click from bubbling to the item
      e.stopPropagation();

      // Simulate clicking on the parent item to handle selection logic
      item.click();
    });

    const label = document.createElement('span');
    label.className = 'custom-dropdown-item-label';
    label.textContent = option;

    const count = document.createElement('span');
    count.className = 'custom-dropdown-item-count';
    count.textContent = counts[option] || 0;

    const distribution = document.createElement('div');
    distribution.className = 'custom-dropdown-distribution';

    const bar = document.createElement('div');
    bar.className = 'custom-dropdown-distribution-bar';
    bar.style.width = `${((counts[option] || 0) / maxCount) * 100}%`;

    distribution.appendChild(bar);
    item.appendChild(checkbox);
    item.appendChild(label);
    item.appendChild(count);
    item.appendChild(distribution);
    menu.appendChild(item);
  });

  // Also add checkbox to the "All" option
  const allCheckbox = document.createElement('input');
  allCheckbox.type = 'checkbox';
  allCheckbox.className = 'custom-dropdown-checkbox';
  allCheckbox.checked = true; // Initially checked
  allCheckbox.addEventListener('click', e => {
    // Prevent the click from bubbling to the item
    e.stopPropagation();

    // Simulate clicking on the parent item to handle selection logic
    allItem.click();
  });
  allItem.insertBefore(allCheckbox, allItem.firstChild);

  // Update label padding since we're now using real checkboxes
  allItem.querySelector('.custom-dropdown-item-label').style.paddingLeft = '5px';

  // Add header click event to toggle menu visibility
  header.addEventListener('click', function (event) {
    event.stopPropagation();
    const isOpen = dropdownContainer.classList.contains('open');

    // Close all other open dropdowns first
    document.querySelectorAll('.custom-dropdown.open').forEach(dropdown => {
      if (dropdown !== dropdownContainer) {
        dropdown.classList.remove('open');
        dropdown.querySelector('.custom-dropdown-menu').style.display = 'none';
      }
    });

    // Toggle this dropdown
    dropdownContainer.classList.toggle('open');
    menu.style.display = isOpen ? 'none' : 'block';

    if (!isOpen) {
      // When opening, focus the search input
      searchInput.focus();
    }
  });

  // Add event listener for dropdown item selection
  menu.addEventListener('click', function (event) {
    let target = event.target;

    // Find the dropdown item that was clicked (or its parent)
    while (target && !target.classList.contains('custom-dropdown-item')) {
      if (target === this) return; // Clicked on menu but not on an item
      target = target.parentNode;
    }

    if (!target) return;

    const value = target.getAttribute('data-value');

    // Implementation for multi-select functionality
    if (value === '') {
      // If "All" option is clicked, deselect everything else
      menu.querySelectorAll('.custom-dropdown-item').forEach(item => {
        if (item !== target) {
          item.classList.remove('selected');
          const itemCheckbox = item.querySelector('.custom-dropdown-checkbox');
          if (itemCheckbox) itemCheckbox.checked = false;
        }
      });
      target.classList.add('selected');
      const targetCheckbox = target.querySelector('.custom-dropdown-checkbox');
      if (targetCheckbox) targetCheckbox.checked = true;

      // Update the original select
      if (originalSelect) {
        originalSelect.value = '';
        originalSelect.setAttribute('data-selected-values', '');

        // Update displayed text
        selectedText.textContent = placeholder;

        // Create and dispatch a change event
        const changeEvent = new Event('change', { bubbles: true });
        originalSelect.dispatchEvent(changeEvent);
      }
    } else {
      // Regular option clicked - handle multi-select

      // First, deselect the "All" option
      const allOption = menu.querySelector('.custom-dropdown-item[data-value=""]');
      if (allOption) {
        allOption.classList.remove('selected');
        const allCheckbox = allOption.querySelector('.custom-dropdown-checkbox');
        if (allCheckbox) allCheckbox.checked = false;
      }

      // Toggle selection for this item
      target.classList.toggle('selected');
      const targetCheckbox = target.querySelector('.custom-dropdown-checkbox');
      if (targetCheckbox) targetCheckbox.checked = !targetCheckbox.checked;

      // Get all selected items
      const selectedItems = Array.from(
        menu.querySelectorAll('.custom-dropdown-item.selected')
      ).filter(item => item.getAttribute('data-value') !== '');

      // If nothing is selected, select the "All" option again
      if (selectedItems.length === 0) {
        if (allOption) {
          allOption.classList.add('selected');
          const allCheckbox = allOption.querySelector('.custom-dropdown-checkbox');
          if (allCheckbox) allCheckbox.checked = true;
        }

        // Update the original select
        if (originalSelect) {
          originalSelect.value = '';
          originalSelect.setAttribute('data-selected-values', '');

          // Update displayed text
          selectedText.textContent = placeholder;

          // Create and dispatch a change event
          const changeEvent = new Event('change', { bubbles: true });
          originalSelect.dispatchEvent(changeEvent);
        }
      } else {
        // Get selected values, accounting for special mapping
        const selectedValues = selectedItems.map(item => {
          const itemValue = item.getAttribute('data-value');
          return specialMapping && specialMapping[itemValue]
            ? specialMapping[itemValue]
            : itemValue;
        });

        // Update the original select
        if (originalSelect) {
          // For multi-select, store all values in a data attribute
          originalSelect.setAttribute('data-selected-values', selectedValues.join(','));

          // For backward compatibility, set the value to the first selected item
          originalSelect.value = selectedValues[0] || '';

          // Update displayed text
          if (selectedValues.length > 1) {
            selectedText.textContent = `${selectedValues.length} არჩეული`;
          } else {
            selectedText.textContent = target.querySelector(
              '.custom-dropdown-item-label'
            ).textContent;
          }

          // Create and dispatch a change event
          const changeEvent = new Event('change', { bubbles: true });
          originalSelect.dispatchEvent(changeEvent);
        }
      }
    }

    if (onChange) {
      onChange(value);
    }

    // Don't close the dropdown after selection to allow multiple selections
    event.stopPropagation();
  });

  // Add event listener for search input
  searchInput.addEventListener('input', function () {
    const searchValue = this.value.toLowerCase();
    const items = menu.querySelectorAll('.custom-dropdown-item');
    items.forEach(item => {
      if (item.getAttribute('data-value') === '') {
        // Always show the "All" option
        item.style.display = 'block';
        return;
      }

      const label = item.querySelector('.custom-dropdown-item-label').textContent.toLowerCase();
      if (label.includes(searchValue)) {
        item.style.display = 'block';
      } else {
        item.style.display = 'none';
      }

      // Ensure checkbox state matches selection state
      const checkbox = item.querySelector('.custom-dropdown-checkbox');
      if (checkbox) {
        checkbox.checked = item.classList.contains('selected');
      }
    });
  });

  // Add event listener for document click to close dropdown
  document.addEventListener('click', function (event) {
    if (!dropdownContainer.contains(event.target)) {
      dropdownContainer.classList.remove('open');
      menu.style.display = 'none';
    }
  });

  // Append components to container
  dropdownContainer.appendChild(header);
  dropdownContainer.appendChild(menu);

  // Initially hide the menu
  menu.style.display = 'none';

  // Append dropdown to parent container
  parentContainer.appendChild(dropdownContainer);

  return dropdownContainer;
}

// Function to apply filters to cards and map features
function applyFilters() {
  if (!sampleData.length || !map) return;

  // Get values from the original select elements or their data attributes
  const districtElement = document.getElementById('districtFilter');
  const villageElement = document.getElementById('villageFilter');
  const priorityElement = document.getElementById('priorityFilter');
  const statusElement = document.getElementById('statusFilter');
  const updatesElement = document.getElementById('updatesFilter');

  // Get values from data attributes if available, otherwise use the value property
  const selectedDistrict =
    districtElement.getAttribute('data-selected-values') || districtElement.value;
  const selectedVillage =
    villageElement.getAttribute('data-selected-values') || villageElement.value;
  const selectedPriority =
    priorityElement.getAttribute('data-selected-values') || priorityElement.value;
  const selectedStatus = statusElement.getAttribute('data-selected-values') || statusElement.value;
  const selectedUpdates =
    updatesElement.getAttribute('data-selected-values') || updatesElement.value;

  const searchText = currentSearchText.toLowerCase().trim();

  // Parse comma-separated values for multi-select
  const selectedDistricts = selectedDistrict ? selectedDistrict.split(',') : [];
  const selectedVillages = selectedVillage ? selectedVillage.split(',') : [];
  const selectedPriorities = selectedPriority ? selectedPriority.split(',') : [];
  const selectedStatuses = selectedStatus ? selectedStatus.split(',') : [];
  const selectedUpdateOptions = selectedUpdates ? selectedUpdates.split(',') : [];

  // Filter cards
  let visibleCardCount = 0;
  document.querySelectorAll('.card').forEach(card => {
    const index = card.getAttribute('data-index');
    const item = sampleData[index];

    // Trim values before comparison
    const itemDistrict = item['რაიონი']?.trim() || '';
    const itemVillage = item['სოფელი']?.trim() || '';
    const itemPriority = item['პრიორიტეტი']?.trim() || '';
    const itemStatus = item['სტატუსი\n(მომლოდინე/ დასრულებულია)']?.trim() || '';
    const itemUpdates = item['განახლებები']?.trim() || '';

    // Check if matches any of the selected values or if no values are selected
    const matchesDistrict =
      selectedDistricts.length === 0 || selectedDistricts.includes(itemDistrict);
    const matchesVillage = selectedVillages.length === 0 || selectedVillages.includes(itemVillage);
    const matchesPriority =
      selectedPriorities.length === 0 || selectedPriorities.includes(itemPriority);

    // Special handling for empty status
    const matchesStatus =
      selectedStatuses.length === 0 ||
      (selectedStatuses.includes('EMPTY_STATUS') && itemStatus === '') ||
      selectedStatuses.includes(itemStatus);

    // Special handling for updates filter
    let matchesUpdates = selectedUpdateOptions.length === 0; // Default if no options selected

    if (!matchesUpdates) {
      // Check each selected option
      for (const option of selectedUpdateOptions) {
        if (option === 'HAS_UPDATES' && itemUpdates !== '') {
          matchesUpdates = true;
          break;
        }
        if (option === 'NO_UPDATES' && itemUpdates === '') {
          matchesUpdates = true;
          break;
        }
        // Also check for direct matches with display values (fallback)
        if (option === 'აქვს განახლება' && itemUpdates !== '') {
          matchesUpdates = true;
          break;
        }
        if (option === 'არ აქვს განახლება' && itemUpdates === '') {
          matchesUpdates = true;
          break;
        }
      }
    }

    // Check if the item matches the search text
    const matchesSearch =
      !searchText ||
      Object.values(item).some(value => {
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(searchText);
      });

    // Check if all conditions are met
    const isVisible =
      matchesDistrict &&
      matchesVillage &&
      matchesPriority &&
      matchesStatus &&
      matchesUpdates &&
      matchesSearch;
    card.style.display = isVisible ? 'block' : 'none';

    if (isVisible) {
      visibleCardCount++;
    }
  });

  // Update markers visibility
  let visibleMarkerCount = 0;
  locationMarkers.forEach(({ marker, properties }) => {
    // Trim values before comparison
    const propertyDistrict = properties['რაიონი']?.trim() || '';
    const propertyVillage = properties['სოფელი']?.trim() || '';
    const propertyPriority = properties['პრიორიტეტი']?.trim() || '';
    const propertyStatus = properties['სტატუსი\n(მომლოდინე/ დასრულებულია)']?.trim() || '';
    const propertyUpdates = properties['განახლებები']?.trim() || '';

    // Check if matches any of the selected values or if no values are selected
    const matchesDistrict =
      selectedDistricts.length === 0 || selectedDistricts.includes(propertyDistrict);
    const matchesVillage =
      selectedVillages.length === 0 || selectedVillages.includes(propertyVillage);
    const matchesPriority =
      selectedPriorities.length === 0 || selectedPriorities.includes(propertyPriority);

    // Special handling for empty status
    const matchesStatus =
      selectedStatuses.length === 0 ||
      (selectedStatuses.includes('EMPTY_STATUS') && propertyStatus === '') ||
      selectedStatuses.includes(propertyStatus);

    // Special handling for updates filter
    let matchesUpdates = selectedUpdateOptions.length === 0; // Default if no options selected

    if (!matchesUpdates) {
      // Check each selected option
      for (const option of selectedUpdateOptions) {
        if (option === 'HAS_UPDATES' && propertyUpdates !== '') {
          matchesUpdates = true;
          break;
        }
        if (option === 'NO_UPDATES' && propertyUpdates === '') {
          matchesUpdates = true;
          break;
        }
        // Also check for direct matches with display values (fallback)
        if (option === 'აქვს განახლება' && propertyUpdates !== '') {
          matchesUpdates = true;
          break;
        }
        if (option === 'არ აქვს განახლება' && propertyUpdates === '') {
          matchesUpdates = true;
          break;
        }
      }
    }

    // Check if the properties match the search text
    const matchesSearch =
      !searchText ||
      Object.values(properties).some(value => {
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(searchText);
      });

    const isVisible =
      matchesDistrict &&
      matchesVillage &&
      matchesPriority &&
      matchesStatus &&
      matchesUpdates &&
      matchesSearch;
    marker.getElement().style.display = isVisible ? 'block' : 'none';

    if (isVisible) {
      visibleMarkerCount++;
    }
  });

  // Create a filtered dataset for the map
  const filteredData = sampleData.filter(item => {
    // Skip items without coordinates or with exact location that is a URL
    if (
      !item.lat ||
      !item.lon ||
      (item['ზუსტი ადგილმდებარეობა']?.trim() && containsURL(item['ზუსტი ადგილმდებარეობა']))
    ) {
      return false;
    }

    const itemDistrict = item['რაიონი']?.trim() || '';
    const itemVillage = item['სოფელი']?.trim() || '';
    const itemPriority = item['პრიორიტეტი']?.trim() || '';
    const itemStatus = item['სტატუსი\n(მომლოდინე/ დასრულებულია)']?.trim() || '';
    const itemUpdates = item['განახლებები']?.trim() || '';

    // Check if matches any of the selected values or if no values are selected
    const matchesDistrict =
      selectedDistricts.length === 0 || selectedDistricts.includes(itemDistrict);
    const matchesVillage = selectedVillages.length === 0 || selectedVillages.includes(itemVillage);
    const matchesPriority =
      selectedPriorities.length === 0 || selectedPriorities.includes(itemPriority);

    // Special handling for empty status
    const matchesStatus =
      selectedStatuses.length === 0 ||
      (selectedStatuses.includes('EMPTY_STATUS') && itemStatus === '') ||
      selectedStatuses.includes(itemStatus);

    // Special handling for updates filter
    let matchesUpdates = selectedUpdateOptions.length === 0; // Default if no options selected

    if (!matchesUpdates) {
      // Check each selected option
      for (const option of selectedUpdateOptions) {
        if (option === 'HAS_UPDATES' && itemUpdates !== '') {
          matchesUpdates = true;
          break;
        }
        if (option === 'NO_UPDATES' && itemUpdates === '') {
          matchesUpdates = true;
          break;
        }
        // Also check for direct matches with display values (fallback)
        if (option === 'აქვს განახლება' && itemUpdates !== '') {
          matchesUpdates = true;
          break;
        }
        if (option === 'არ აქვს განახლება' && itemUpdates === '') {
          matchesUpdates = true;
          break;
        }
      }
    }

    // Check if the item matches the search text
    const matchesSearch =
      !searchText ||
      Object.values(item).some(value => {
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(searchText);
      });

    return (
      matchesDistrict &&
      matchesVillage &&
      matchesPriority &&
      matchesStatus &&
      matchesUpdates &&
      matchesSearch
    );
  });

  // Update the features on the map
  const features = updateFeatures(true);

  // Update the source data if it exists
  if (map.getSource('locations')) {
    try {
      map.getSource('locations').setData({
        type: 'FeatureCollection',
        features: features,
      });
    } catch (error) {
      console.error('Error updating map source:', error);
    }
  } else {
    console.warn('Map source "locations" not found');
  }
}

// Function to initialize search functionality
function initializeSearch() {
  const searchInput = document.getElementById('searchInput');
  const clearButton = document.getElementById('clearSearch');

  if (!searchInput || !clearButton) return;

  // Add event listener for input changes
  searchInput.addEventListener('input', function () {
    const searchText = this.value.trim();
    currentSearchText = searchText;

    // Show/hide clear button based on search text
    clearButton.style.display = searchText ? 'block' : 'none';

    // Apply filters with the new search text
    applyFilters();
  });

  // Add event listener for clear button
  clearButton.addEventListener('click', function () {
    searchInput.value = '';
    currentSearchText = '';
    this.style.display = 'none';

    // Apply filters with empty search text
    applyFilters();

    // Focus the search input after clearing
    searchInput.focus();
  });

  // Add event listener for Enter key
  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyFilters();
    }
  });
}

// Function to update features based on current zoom and filters
function updateFeatures(filtered = false) {
  // First filter the data based on the selected criteria
  const districtElement = document.getElementById('districtFilter');
  const villageElement = document.getElementById('villageFilter');
  const priorityElement = document.getElementById('priorityFilter');
  const statusElement = document.getElementById('statusFilter');
  const updatesElement = document.getElementById('updatesFilter');

  // Get values from data attributes if available, otherwise use the value property
  const selectedDistrict =
    districtElement.getAttribute('data-selected-values') || districtElement.value;
  const selectedVillage =
    villageElement.getAttribute('data-selected-values') || villageElement.value;
  const selectedPriority =
    priorityElement.getAttribute('data-selected-values') || priorityElement.value;
  const selectedStatus = statusElement.getAttribute('data-selected-values') || statusElement.value;
  const selectedUpdates =
    updatesElement.getAttribute('data-selected-values') || updatesElement.value;

  const searchText = currentSearchText ? currentSearchText.toLowerCase().trim() : '';

  // Parse comma-separated values for multi-select
  const selectedDistricts = selectedDistrict ? selectedDistrict.split(',') : [];
  const selectedVillages = selectedVillage ? selectedVillage.split(',') : [];
  const selectedPriorities = selectedPriority ? selectedPriority.split(',') : [];
  const selectedStatuses = selectedStatus ? selectedStatus.split(',') : [];
  const selectedUpdateOptions = selectedUpdates ? selectedUpdates.split(',') : [];

  // Count all items with coordinates for debugging
  const itemsWithCoordinates = sampleData.filter(
    item =>
      item.lat &&
      item.lon &&
      (!item['ზუსტი ადგილმდებარეობა']?.trim() || !containsURL(item['ზუსტი ადგილმდებარეობა']))
  ).length;

  // First, filter the data based on criteria
  let filteredItems = [];

  if (filtered) {
    // Create a detailed filter function that logs each step
    filteredItems = sampleData.filter(item => {
      // Skip items without coordinates or with exact location that is a URL
      if (
        !item.lat ||
        !item.lon ||
        (item['ზუსტი ადგილმდებარეობა']?.trim() && containsURL(item['ზუსტი ადგილმდებარეობა']))
      ) {
        return false;
      }

      const itemDistrict = item['რაიონი']?.trim() || '';
      const itemVillage = item['სოფელი']?.trim() || '';
      const itemPriority = item['პრიორიტეტი']?.trim() || '';
      const itemStatus = item['სტატუსი\n(მომლოდინე/ დასრულებულია)']?.trim() || '';
      const itemUpdates = item['განახლებები']?.trim() || '';

      // Check if matches any of the selected values or if no values are selected
      const matchesDistrict =
        selectedDistricts.length === 0 || selectedDistricts.includes(itemDistrict);
      const matchesVillage =
        selectedVillages.length === 0 || selectedVillages.includes(itemVillage);
      const matchesPriority =
        selectedPriorities.length === 0 || selectedPriorities.includes(itemPriority);

      // Special handling for empty status
      const matchesStatus =
        selectedStatuses.length === 0 ||
        (selectedStatuses.includes('EMPTY_STATUS') && itemStatus === '') ||
        selectedStatuses.includes(itemStatus);

      // Special handling for updates filter - fixed logic
      let matchesUpdates = selectedUpdateOptions.length === 0; // Default if no options selected

      if (!matchesUpdates) {
        // Check each selected option
        for (const option of selectedUpdateOptions) {
          if (option === 'HAS_UPDATES' && itemUpdates !== '') {
            matchesUpdates = true;
            break;
          }
          if (option === 'NO_UPDATES' && itemUpdates === '') {
            matchesUpdates = true;
            break;
          }
          // Also check for direct matches with display values (fallback)
          if (option === 'აქვს განახლება' && itemUpdates !== '') {
            matchesUpdates = true;
            break;
          }
          if (option === 'არ აქვს განახლება' && itemUpdates === '') {
            matchesUpdates = true;
            break;
          }
        }
      }

      // Check if the item matches the search text
      const matchesSearch =
        !searchText ||
        Object.values(item).some(value => {
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(searchText);
        });

      return (
        matchesDistrict &&
        matchesVillage &&
        matchesPriority &&
        matchesStatus &&
        matchesUpdates &&
        matchesSearch
      );
    });
  } else {
    // If not filtering, include all items with coordinates
    filteredItems = sampleData.filter(
      item =>
        item.lat &&
        item.lon &&
        (!item['ზუსტი ადგილმდებარეობა']?.trim() || !containsURL(item['ზუსტი ადგილმდებარეობა']))
    );
  }

  // Now group the filtered items by location
  const locationGroups = {};

  filteredItems.forEach((item, i) => {
    // Find the original index in sampleData
    const index = sampleData.findIndex(d => d === item);

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
      color = '#95a5a6'; // Gray for unknown/empty status
    }

    const key = `${item.lat.toFixed(4)},${item.lon.toFixed(4)}`;
    if (!locationGroups[key]) {
      locationGroups[key] = [];
    }

    locationGroups[key].push({
      item,
      index,
      fillColor: color,
      strokeColor: color,
    });
  });

  // Create polygon features
  const features = Object.values(locationGroups).flatMap(group => {
    // For single items, use normal size; for groups make them smaller
    const isGroup = group.length > 1;
    const sizeMultiplier = isGroup ? 0.7 : 1.0; // 30% smaller when in a group

    return group.map((entry, groupIndex) => {
      const { item, index, fillColor, strokeColor } = entry;

      // Only apply offset if we have more than one item at this location
      let offsetLon = parseFloat(item.lon);
      let offsetLat = parseFloat(item.lat);

      if (isGroup && groupIndex > 0) {
        // Use a stable offset pattern based on the item's index
        // This ensures consistent positioning regardless of zoom level
        const baseOffsetDistance = 0.0006; // Fixed offset distance
        const offset = calculatePointOffset(groupIndex, baseOffsetDistance);
        offsetLon = offsetLon + offset.x;
        offsetLat = offsetLat + offset.y;
      }

      // Create GeoJSON feature with polygon geometry
      return {
        type: 'Feature',
        properties: {
          id: index,
          ...item,
          fillColor,
          strokeColor,
          inGroup: isGroup,
          // Store original coordinates to ensure consistent positioning
          originalLng: offsetLon,
          originalLat: offsetLat,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [createPolygonCoordinates(map, offsetLon, offsetLat, 6, sizeMultiplier)],
        },
      };
    });
  });

  return features;
}
