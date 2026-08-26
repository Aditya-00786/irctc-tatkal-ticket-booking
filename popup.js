const STORAGE_KEY = "tatkalTicketBookingFormData";

let formData = {};
let originalData = {};
let hasUnsavedChanges = false;

// DOM Elements
const settingsBtn = document.getElementById('settings-btn');
const autoToggle = document.getElementById('automation-toggle');
const autoStatusText = document.getElementById('automation-status-text');
const statusInfo = document.getElementById('status-info');
const fromInput = document.getElementById('from');
const fromList = document.getElementById('from-list');
const toInput = document.getElementById('to');
const toList = document.getElementById('to-list');
const dateInput = document.getElementById('date');
const trainNumberInput = document.getElementById('trainNumber');
const trainList = document.getElementById('train-list');
const quotaTypeSelect = document.getElementById('quotaType');
const classSelect = document.getElementById('accommodationClass');
const autoUpgradeCb = document.getElementById('autoUpgradation');
const noFoodCb = document.getElementById('noFoodAndBeverages');
const confirmBerthsCb = document.getElementById('confirmBerthsOnly');
const passengersContainer = document.getElementById('passengers-list');
const saveBtn = document.getElementById('save-btn');
const warningText = document.getElementById('unsaved-warning');

// Setup redirect
settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

// Load initial data
chrome.storage.local.get(STORAGE_KEY, (result) => {
  if (result[STORAGE_KEY]) {
    formData = result[STORAGE_KEY];
    originalData = JSON.parse(JSON.stringify(formData));
    
    // Check if required data is missing
    const hasPassengerList = formData.passengerList && formData.passengerList.some(p => p.isSelected);
    const hasMasterData = formData.masterData && formData.passengerNames && formData.passengerNames.some(p => p.isSelected);
    
    if (!hasPassengerList && !hasMasterData) {
      chrome.runtime.openOptionsPage();
      window.close();
      return;
    }
    
    initializeUI();
  } else {
    // No data at all, redirect to options
    chrome.runtime.openOptionsPage();
    window.close();
  }
});

function initializeUI() {
  // Toggle
  autoToggle.checked = !!formData.automationStatus;
  updateStatusDisplay();

  // Inputs
  fromInput.value = formData.fromDisplay || formData.fromName || formData.from || '';
  toInput.value = formData.toDisplay || formData.toName || formData.to || '';
  if (formData.dateString) {
    // Format YYYY-MM-DD
    try {
      const d = new Date(formData.dateString);
      dateInput.value = d.toISOString().split('T')[0];
    } catch(e) {}
  }
  trainNumberInput.value = formData.trainDisplay || formData.trainName || formData.trainNumber || '';
  
  if (formData.quotaType) quotaTypeSelect.value = formData.quotaType;
  if (formData.accommodationClass) classSelect.value = formData.accommodationClass;
  
  autoUpgradeCb.checked = !!formData.autoUpgradation;
  noFoodCb.checked = !!formData.noFoodBeverages;
  confirmBerthsCb.checked = !!formData.confirmberths;

  
  // Passengers
  renderPassengers();

  // Add listeners
  autoToggle.addEventListener('change', handleInputChange);
  fromInput.addEventListener('input', handleFromInput);
  fromInput.addEventListener('change', handleFromChange);
  toInput.addEventListener('input', handleToInput);
  toInput.addEventListener('change', handleToChange);
  dateInput.addEventListener('change', (e) => {
    handleInputChange();
    fetchTrains(true);
  });
  trainNumberInput.addEventListener('input', handleTrainInput);
  trainNumberInput.addEventListener('change', handleTrainChange);
  quotaTypeSelect.addEventListener('change', handleInputChange);
  classSelect.addEventListener('change', handleInputChange);
  autoUpgradeCb.addEventListener('change', handleInputChange);
  noFoodCb.addEventListener('change', handleInputChange);
  confirmBerthsCb.addEventListener('change', handleInputChange);
  
  saveBtn.addEventListener('click', saveChanges);
  
  // Background fetch to auto-expand the train number to its full name
  fetchTrains(true);
}

function renderPassengers() {
  passengersContainer.innerHTML = '';
  
  let selected = [];
  if (formData.masterData) {
      selected = (formData.passengerNames || []).filter(p => p.isSelected);
  } else {
      selected = (formData.passengerList || []).filter(p => p.isSelected);
  }
  
  if (selected.length > 0) {
    selected.forEach(p => {
      const badge = document.createElement('div');
      badge.className = 'passenger-badge';
      badge.textContent = p.name || p.passengerName || 'Unknown';
      passengersContainer.appendChild(badge);
    });
  } else {
    passengersContainer.textContent = 'No passengers selected.';
  }
}

function updateStatusDisplay() {
  if (autoToggle.checked) {
    autoStatusText.textContent = 'ON';
    autoStatusText.classList.add('on');
    
    // Calculate display info
    let summary = [formData.trainNumber, formData.from, formData.to].filter(Boolean).join(' ');
    let timeStr = '';
    if (formData.scheduleDate && formData.targetTime) {
       const loginTime = new Date(new Date(`${formData.scheduleDate}T${formData.targetTime}+05:30`).getTime() - (formData.loginMinutesBefore||0)*60*1000);
       timeStr = ` at ${loginTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true})}`;
    }
    statusInfo.textContent = `Opening IRCTC for ${summary || 'your booking'}${timeStr}`;
  } else {
    autoStatusText.textContent = 'OFF';
    autoStatusText.classList.remove('on');
    statusInfo.textContent = 'Automation disabled';
  }
}

function markUnsaved() {
  hasUnsavedChanges = true;
  warningText.classList.remove('hidden');
  saveBtn.disabled = false;
}

function handleInputChange() {
  updateStatusDisplay();
  markUnsaved();
}

// APIs and formatting
let fromTimeout, toTimeout, trainTimeout;

function handleFromInput(e) {
  const val = e.target.value;
  clearTimeout(fromTimeout);
  if (val.length >= 2 && !val.includes('(')) {
    fromTimeout = setTimeout(() => fetchStations(val, fromList), 300);
  } else {
    fromList.classList.remove('active');
  }
}

function handleFromChange(e) {
  const match = e.target.value.match(/\(([A-Z0-9]+)\)$/);
  if (match) {
    markUnsaved();
  }
}

function handleToInput(e) {
  const val = e.target.value;
  clearTimeout(toTimeout);
  if (val.length >= 2 && !val.includes('(')) {
    toTimeout = setTimeout(() => fetchStations(val, toList), 300);
  } else {
    toList.classList.remove('active');
  }
}

function handleToChange(e) {
  const match = e.target.value.match(/\(([A-Z0-9]+)\)$/);
  if (match) {
    markUnsaved();
  }
}

async function fetchStations(query, listEl) {
  try {
    const res = await fetch(`https://travel.paytm.com/api/trains/v3/station/${query}?isH5=true&client=web&deviceIdentifier=test`);
    const data = await res.json();
    listEl.innerHTML = '';
    if (data.body && data.body.length > 0) {
      let found = false;
      data.body.forEach(item => {
        if (item.stations) {
          item.stations.forEach(st => {
            if (st.data) {
              found = true;
              const li = document.createElement('li');
              li.className = 'autocomplete-item';
              li.innerHTML = `<div class="autocomplete-item-title">${st.data.name} (${st.data.code})</div>`;
              li.addEventListener('click', () => {
                const inputId = listEl.id.replace('-list', '');
                document.getElementById(inputId).value = `${st.data.name} (${st.data.code})`;
                listEl.classList.remove('active');
                markUnsaved();
                if (inputId !== 'trainNumber') fetchTrains(true);
              });
              listEl.appendChild(li);
            }
          });
        }
      });
      if (found) {
        listEl.classList.add('active');
      } else {
        listEl.classList.remove('active');
      }
    } else {
        listEl.classList.remove('active');
    }
  } catch (e) {}
}

function handleTrainInput(e) {
  const val = e.target.value;
  clearTimeout(trainTimeout);
  if (val.length >= 2 && !val.includes('(')) {
    trainTimeout = setTimeout(() => fetchTrains(false), 500);
  } else if (val.trim() === '') {
    classSelect.value = '';
    updateClassDropdown([]);
  }
}

function handleTrainChange(e) {
  // Keep the full name in the input box
  markUnsaved();
}

async function fetchTrainData(fromCode, toCode, dateStr) {
  return new Promise((resolve) => {
    chrome.storage.local.get(["irctc_train_cache"], async (result) => {
      const cache = result.irctc_train_cache;
      if (cache && cache.fromCode === fromCode && cache.toCode === toCode && cache.dateStr === dateStr) {
        resolve(cache.trains);
      } else {
        try {
          const res = await fetch(`https://travel.paytm.com/api/trains/v5/search?departureDate=${dateStr}&destination=${toCode}&isAscOfferEligible=false&isH5=true&is_new_user=null&quota=GN&show_empty=true&source=${fromCode}&client=web&deviceIdentifier=test`);
          const data = await res.json();
          if (data.body && data.body.trains) {
            const trains = data.body.trains.map(tr => {
              const coaches = [];
              if (tr.availability) {
                tr.availability.forEach(avail => {
                  coaches.push({ code: avail.code });
                });
              }
              return {
                trainName: tr.trainName,
                trainNumber: tr.trainNumber,
                departure: tr.departure,
                arrival: tr.arrival,
                duration: tr.duration,
                source: tr.source,
                destination: tr.destination,
                availability: tr.availability,
                coaches: coaches
              };
            });
            chrome.storage.local.set({
              irctc_train_cache: {
                fromCode, toCode, dateStr, trains
              }
            });
            resolve(trains);
          } else {
            resolve([]);
          }
        } catch (e) {
          resolve([]);
        }
      }
    });
  });
}

async function fetchTrains(validateTrain = false) {
  const fVal = fromInput.value;
  const fMatch = fVal.match(/\(([A-Z0-9]+)\)$/);
  const fromCode = fMatch ? fMatch[1] : fVal;

  const toVal = toInput.value;
  const toMatch = toVal.match(/\(([A-Z0-9]+)\)$/);
  const toCode = toMatch ? toMatch[1] : toVal;
  const dt = dateInput.value;
  
  if (!fromCode || !toCode || !dt) return;
  const dateStr = dt.replace(/-/g, '');
  
  try {
    const cachedTrains = await fetchTrainData(fromCode, toCode, dateStr);
    
    if (validateTrain && trainNumberInput.value) {
      const tVal = trainNumberInput.value;
      const tMatch = tVal.match(/\(([0-9]+)\)$/);
      const tNum = tMatch ? tMatch[1] : tVal;
      const found = (cachedTrains || []).find(tr => tr.trainNumber === tNum);
      if (!found) {
        trainNumberInput.value = '';
        classSelect.value = '';
        markUnsaved();
      }
    }

    trainList.innerHTML = '';
    if (cachedTrains && cachedTrains.length > 0) {
      const seen = new Set();
      const searchTerm = trainNumberInput.value.toLowerCase().trim();
      let hasVisible = false;

      cachedTrains.forEach(t => {
        if (!seen.has(t.trainNumber)) {
          const fullTrainString = `${t.trainName} (${t.trainNumber})`;
          
          if (searchTerm && !fullTrainString.toLowerCase().includes(searchTerm)) {
            // Check if it's an exact match before skipping, just in case
            if (trainNumberInput.value !== t.trainNumber) {
                return;
            }
          }
          
          seen.add(t.trainNumber);
          hasVisible = true;
          
          const li = document.createElement('li');
          li.className = 'autocomplete-item';
          li.innerHTML = `<div class="autocomplete-item-title">${fullTrainString}</div>`;
          li.addEventListener('click', () => {
              trainNumberInput.value = fullTrainString;
              trainList.classList.remove('active');
              markUnsaved();
              updateClassDropdown(cachedTrains);
          });
          trainList.appendChild(li);
          
          // Auto-expand train number to full name if it's currently just the code
          if (trainNumberInput.value === t.trainNumber) {
            trainNumberInput.value = fullTrainString;
          }
        }
      });
      if (hasVisible && document.activeElement === trainNumberInput) {
        trainList.classList.add('active');
      } else {
        trainList.classList.remove('active');
      }
      updateClassDropdown(cachedTrains);
    } else {
        trainList.classList.remove('active');
        updateClassDropdown([]);
    }
  } catch(e) {}
}

function updateClassDropdown(cachedTrains) {
  const tVal = trainNumberInput.value;
  const tMatch = tVal.match(/\(([0-9]+)\)$/);
  const tNum = tMatch ? tMatch[1] : tVal;
  
  const currentTrain = (cachedTrains || []).find(tr => tr.trainNumber === tNum);
  const availableCoaches = currentTrain ? (currentTrain.coaches || []).map(c => c.code) : [];
  
  const warningEl = document.getElementById('train-warning');
  if (warningEl) {
    const toVal = toInput.value;
    const toMatch = toVal.match(/\(([A-Z0-9]+)\)$/);
    const toCode = toMatch ? toMatch[1] : toVal;
    
    if (currentTrain && toCode && currentTrain.destination && currentTrain.destination !== toCode) {
      warningEl.textContent = `Warning: Train destination (${currentTrain.destination}) differs from your selected "To" station (${toCode})`;
      warningEl.classList.remove('hidden');
    } else {
      warningEl.classList.add('hidden');
    }
  }

  Array.from(classSelect.options).forEach(opt => {
    if (opt.value === "") {
      // Keep placeholder as is
    } else if (!tNum) {
      opt.disabled = true;
      opt.hidden = true;
    } else if (availableCoaches.length === 0 || availableCoaches.includes(opt.value)) {
      opt.disabled = false;
      opt.hidden = false;
    } else {
      opt.disabled = true;
      opt.hidden = true;
    }
  });
  
  // If the currently selected option is hidden/disabled, reset to placeholder
  if (classSelect.value !== '' && classSelect.selectedIndex >= 0 && classSelect.options[classSelect.selectedIndex].disabled) {
    classSelect.value = '';
    markUnsaved();
  }
}

function saveChanges() {
  formData.automationStatus = autoToggle.checked;
  // Extract codes but save display names
  const fVal = fromInput.value;
  const fMatch = fVal.match(/\(([A-Z0-9]+)\)$/);
  formData.from = fMatch ? fMatch[1] : fVal;
  formData.fromDisplay = fVal;

  const toVal = toInput.value;
  const toMatch = toVal.match(/\(([A-Z0-9]+)\)$/);
  formData.to = toMatch ? toMatch[1] : toVal;
  formData.toDisplay = toVal;
  
  if (dateInput.value) {
    formData.dateString = dateInput.value;
  }
  
  // Extract just the train number code for storage, but keep the full name
  const tVal = trainNumberInput.value;
  const tMatch = tVal.match(/\(([0-9]+)\)$/);
  formData.trainNumber = tMatch ? tMatch[1] : tVal;
  formData.trainDisplay = tVal;
  
  formData.quotaType = quotaTypeSelect.value;
  formData.accommodationClass = classSelect.value;
  
  formData.autoUpgradation = autoUpgradeCb.checked;
  formData.noFoodBeverages = noFoodCb.checked;
  formData.confirmberths = confirmBerthsCb.checked;
  
  // Update TargetTime and scheduleDate logic based on Quota type
  const targetTime = getTargetTime(formData.quotaType, formData.accommodationClass, formData.isOpeningDayBooking);
  formData.targetTime = targetTime;
  
  if (['GENERAL','LADIES','SENIOR_CITIZEN'].includes(formData.quotaType) && formData.dateString) {
    formData.scheduleDate = parseScheduleDate(formData.dateString);
    formData.isOpeningDayBooking = false; // or maintain existing
  }

  const newObj = {};
  newObj[STORAGE_KEY] = formData;
  chrome.storage.local.set(newObj, () => {
    hasUnsavedChanges = false;
    warningText.classList.add('hidden');
    saveBtn.disabled = true;
    
    // Update original
    originalData = JSON.parse(JSON.stringify(formData));
    saveBtn.textContent = 'Saved!';
    
    // Force sync: Broadcast message to any open options pages to reload
    chrome.runtime.sendMessage({action: "reloadOptions"}).catch(() => {});

    setTimeout(() => { saveBtn.textContent = 'Save Booking Details'; }, 2000);
  });
}

function getTargetTime(quota, cls, isOpening) {
  if (quota === "TATKAL" || quota === "PREMIUM TATKAL") {
    if (["1A", "2A", "3A", "3E", "CC", "EC", "VC"].includes(cls)) return "09:59:53";
    return "10:59:53";
  }
  if (isOpening) return "07:59:53";
  return "";
}

function parseScheduleDate(dString) {
  try {
    const d = new Date(dString);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } catch(e) {
    return "";
  }
}

// Close dropdowns on click outside
document.addEventListener('click', (e) => {
    if (fromList && !e.target.closest('#from') && !e.target.closest('#from-list')) {
        fromList.classList.remove('active');
    }
    if (toList && !e.target.closest('#to') && !e.target.closest('#to-list')) {
        toList.classList.remove('active');
    }
    if (trainList && !e.target.closest('#trainNumber') && !e.target.closest('#train-list')) {
        trainList.classList.remove('active');
    }
});
