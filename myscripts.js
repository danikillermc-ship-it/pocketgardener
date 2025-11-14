// myscripts.js (cleaned & consolidated)
// NOTE: Move any JSON-LD to your HTML <head> inside a <script type="application/ld+json"> tag

//const API_URL = "http://localhost:4000/api";
const API_URL = "http://192.168.0.232:4000/api";

function authHeader() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };
}

const token = localStorage.getItem('token');
if (!token) {
  window.location.href = 'login.html';
}

// Utility: safe UUID
function makeId() {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e9).toString(36);
  }
}

// -------------------------
// Storage Manager
// -------------------------
const Storage = {
  get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('Storage.get parse error', e);
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage.set error', e);
    }
  },
  remove(key) {
    localStorage.removeItem(key);
  },
  clear() {
    localStorage.clear();
  }
};



// -------------------------
// Data Manager
// -------------------------
const DataManager = {
  plants: [],
  reminders: [],
  swaps: [],
  meta: {},



//Jó

async savePlantToServer(plant) {
    try {
      const response = await fetch(`${API_URL}/plants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify(plant)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const data = await response.json();
      console.log("✅ Plant saved:", data);
      return data;
    } catch (err) {
      console.error("savePlantToServer error:", err);
      alert("Failed to save plant!");
    }
  },


 async init() {
  await this.loadPlantsFromServer();
  await this.loadRemindersFromServer(); // we will create this soon
},

async loadPlantsFromServer() {
  try {
    const res = await fetch('192.168.0.232:4000/api/plants', {
      headers: { "Authorization": `Bearer ${token}` }
    });
    this.plants = await res.json();
  } catch (err) {
    console.error('Error loading plants:', err);
    this.plants = [];
  }
},


async deletePlantFromServer(id) {
  try {
    const res = await fetch(`${API_URL}/plants/${id}`, {
      method: 'DELETE',
      headers: {
        "Authorization": "Bearer " + localStorage.getItem("token")
      }
    });

    if (!res.ok) {
      throw new Error(await res.text());
    }

    console.log("✅ Plant deleted successfully.");
    return true;
  } catch (err) {
    console.error("❌ Error deleting plant:", err);
    alert("Failed to delete plant. Please try again.");
    return false;
  }
},


async addPlant(plant) {
  await this.savePlantToServer(plant);
  await this.loadPlantsFromServer();
  UI.renderPlants();
},
async loadPlantsFromServer() {
  try {
    const response = await fetch(`${API_URL}/plants`, {
      headers: authHeader()
    });
    this.plants = await response.json();
    UI.renderPlants();
  } catch (err) {
    console.error("loadPlantsFromServer error:", err);
  }
},

async loadRemindersFromServer() {
  try {
    const res = await fetch(`${API_URL}/reminders`, {
      headers: {
        "Authorization": "Bearer " + localStorage.getItem("token")
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to load reminders: ${res.status} ${errText}`);
    }

    this.reminders = await res.json();
    console.log("✅ Reminders loaded:", this.reminders);

    UI.renderReminders(); // re-render the reminder list
    if (typeof setupCalendar === "function") {
  setupCalendar();
}
  } catch (err) {
    console.error("❌ loadRemindersFromServer error:", err);
    this.reminders = [];
  }
},

async saveReminderToServer(reminder) {
  try {
    console.log("Sending reminder:", reminder); // 👈 Add this
    const res = await fetch(`${API_URL}/reminders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("token")
      },
      body: JSON.stringify(reminder)
    });

    const data = await res.json();
    console.log("Server response:", data);

    if (!res.ok) throw new Error(data.message || JSON.stringify(data));

    console.log("✅ Reminder saved:", data);
    return data;
  } catch (err) {
    console.error("❌ saveReminderToServer error:", err);
    alert("Failed to save reminder — check console for details.");
  }
},

async addReminder(reminder) {
  await this.saveReminderToServer(reminder);
  await this.loadRemindersFromServer();
  UI.renderReminders();
},

async deleteReminder(id) {
  await fetch(`${API_URL}/reminders/${id}`, {
    method: "DELETE",
    headers: authHeader()
  });
  await this.loadRemindersFromServer();
},



  
  save() {
    Storage.set('plants', this.plants);
    Storage.set('reminders', this.reminders);
    Storage.set('swaps', this.swaps);
    Storage.set('meta', this.meta);
  },


 async deletePlant(id) {
  await this.deletePlantFromServer(id);
  await this.loadPlantsFromServer();
  UI.renderPlants();
  UI.populatePlantSelect(); // ✅ Now updates dropdown instantly
},


 async deleteReminder(id) {
  await fetch(`${API_URL}/reminders/${id}`, {
    method: "DELETE",
    headers: authHeader()
  });
  await this.loadRemindersFromServer();
  UI.renderReminders();
},



  addSwap(swap) {
    swap.id = makeId();
    swap.createdAt = new Date().toISOString();
    swap.bookmarked = !!swap.bookmarked;
    swap.reported = !!swap.reported;
    swap.location = swap.location || '';
    this.swaps.push(swap);
    this.save();
  },

  updateSwap(id, partial) {
    const idx = this.swaps.findIndex(s => s.id === id);
    if (idx === -1) return;
    this.swaps[idx] = Object.assign({}, this.swaps[idx], partial);
    this.save();
  },

  deleteSwap(id) {
    this.swaps = this.swaps.filter(s => s.id !== id);
    this.save();
  },

  exportData() {
    const data = {
      plants: this.plants,
      reminders: this.reminders,
      swaps: this.swaps,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pocketgardener-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  importData(file, onComplete = null) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (Array.isArray(data.plants)) this.plants = data.plants;
        if (Array.isArray(data.reminders)) this.reminders = data.reminders;
        if (Array.isArray(data.swaps)) this.swaps = data.swaps;
        this.save();
        if (typeof onComplete === 'function') onComplete(true);
      } catch (err) {
        console.error('Import error', err);
        if (typeof onComplete === 'function') onComplete(false, err);
      }
    };
    reader.readAsText(file);
  },

 
};

// Load all community listings from backend
async function loadCommunityListings() {
  const res = await fetch(`${API_URL}/community`);
  const listings = await res.json();
  const container = document.getElementById("swapList");
  container.innerHTML = "";

  const currentUserId = localStorage.getItem("user_id"); // Logged-in user's ID

  listings.forEach(item => {
    const div = document.createElement("div");
    div.className = "card community-card";

    div.innerHTML = `
      <h3>${item.title}</h3>
      <p>${item.description || ""}</p>
      ${item.location ? `<p><strong>Location:</strong> ${item.location}</p>` : ""}
      ${item.contact ? `<p><strong>Contact:</strong> ${item.contact}</p>` : ""}
      <p style="font-size: 0.8rem; color: gray;">Posted by: ${item.name || "Anonymous"}</p>
      ${
        item.user_id == currentUserId
          ? `<button class="btn btn-small btn-danger" onclick="deleteCommunityListing(${item.id})">🗑️ Delete</button>`
          : ""
      }
    `;

    container.appendChild(div);
  });
}

async function deleteCommunityListing(id) {
  if (!confirm("Are you sure you want to delete this listing?")) return;

  try {
    const res = await fetch(`${API_URL}/community/${id}`, {
      method: "DELETE",
      headers: {
        "Authorization": "Bearer " + localStorage.getItem("token")
      }
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }

    console.log("✅ Listing deleted:", id);
    await loadCommunityListings(); // reload list
  } catch (err) {
    console.error("❌ Failed to delete listing:", err);
    alert("Failed to delete listing. Please try again.");
  }
}


// -------------------------
// UI Manager
// -------------------------
const UI = {
  currentSection: 'library',
  deleteReminder(id) {
  DataManager.deleteReminder(id);
},


  init() {
    this.setupNavigation();
    this.setupModals();
    this.setupForms();
    this.setupUtilities();
    this.setupCommunityHubEnhancements(); // ensure exists
    this.renderAll();
  },

  // Navigation
  setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const section = btn.dataset.section;
        if (section) this.showSection(section);
      });
    });
  },

  showSection(section) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.section === section);
    });
    document.querySelectorAll('.section').forEach(sec => {
      sec.classList.toggle('active', sec.id === section);
    });
    this.currentSection = section;
  
    // Refresh Community listings when opening the Community tab
    if (section === "swap") {
      loadCommunityListings();
    }
  },
  

  // Modals and basic interactions
  setupModals() {
    // Openers
    const openers = [
      { btn: 'addPlantBtn', modal: 'addPlantModal' },
      { btn: 'addReminderBtn', modal: 'addReminderModal' },
      { btn: 'addSwapBtn', modal: 'addSwapModal' },
    ];
    openers.forEach(o => {
      const b = document.getElementById(o.btn);
      if (b) b.addEventListener('click', () => document.getElementById(o.modal)?.classList.add('active'));
    });

    // Closers
    document.querySelectorAll('.close-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.dataset.modal;
        if (modal) document.getElementById(modal)?.classList.remove('active');
      });
    });

    // Background click to close
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
      });
    });

    // Welcome close
    document.getElementById('closeWelcome')?.addEventListener('click', () => {
      document.getElementById('welcomeModal')?.classList.remove('active');
    });
  },

  // Forms
 setupForms() {
  // Add Plant
  const addPlantForm = document.getElementById('addPlantForm');
  if (addPlantForm) {
    addPlantForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('plantName')?.value?.trim();
      if (!name) return alert('Please provide a plant name.');

      const photoInput = document.getElementById('plantPhoto');
      const file = photoInput?.files?.[0];

      const collect = async (photoData) => {
        const plant = {
          name,
          photo: photoData || '',
          notes: document.getElementById('plantNotes')?.value || '',
          tags: Array.from(document.querySelectorAll('#addPlantForm input[type="checkbox"]:checked')).map(cb => cb.value)
        };

        await DataManager.addPlant(plant);
        UI.populatePlantSelect(); // ✅ Now updates immediately
        document.getElementById('addPlantModal')?.classList.remove('active');
        addPlantForm.reset();
      };

      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => collect(ev.target.result);
        reader.readAsDataURL(file);
      } else {
        await collect('');
      }
    });
  }

  

    // Add Reminder
  // 🌿 Add Reminder form
const addReminderForm = document.getElementById("addReminderForm");
if (addReminderForm) {
  addReminderForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const plant_id = document.getElementById("plantSelect")?.value;
    const type = document.getElementById("taskSelect")?.value || "check"; // ✅ FIXED
    const frequency = document.getElementById("reminderFrequency")?.value || null;
    const reminderDateInput = document.getElementById("dateSelect")?.value;

    if (!plant_id) return alert("Please choose a plant for the reminder.");

    // Convert the chosen date into ISO format for backend
    const remind_at = reminderDateInput
      ? new Date(reminderDateInput + "T00:00:00Z").toISOString()
      : new Date().toISOString();

    console.log("🪴 Sending reminder:", { plant_id, type, frequency, remind_at });

    // ✅ Save reminder to backend
    await DataManager.saveReminderToServer({
      plant_id,
      type,
      frequency,
      remind_at
    });

    // ✅ Reload reminders and update the calendar
    await DataManager.loadRemindersFromServer();
    if (typeof setupCalendar === "function") setupCalendar();

    // ✅ Close modal and reset form
    document.getElementById("addReminderModal")?.classList.remove("active");
    addReminderForm.reset();
  });
}




    // Add Swap


// Add Swap
const addSwapForm = document.getElementById('addSwapForm');
if (addSwapForm) {
  addSwapForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const swap = {
      type: document.getElementById('swapType').value || 'cutting',
      title: document.getElementById('swapItem').value || '(No title)',
      description: document.getElementById('swapDescription').value || '',
      contact: document.getElementById('swapContact').value || '',
      location: document.getElementById('swapLocation').value || ''
    };

    await fetch(`${API_URL}/community`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("token")
      },
      body: JSON.stringify(swap)
    });

    // Refresh shared listings
    loadCommunityListings();

    // Close modal & reset form
    document.getElementById('addSwapModal').classList.remove('active');
    addSwapForm.reset();
  });
}

// Load listings when page opens
  },
  
populatePlantSelect() {
  const select = document.getElementById('plantSelect');
  if (!select) return;

  select.innerHTML = '';

  // Default placeholder
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '-- Select a Plant --';
  select.appendChild(placeholder);

  // Add all plants
  if (DataManager.plants && DataManager.plants.length > 0) {
    DataManager.plants.forEach(plant => {
      const option = document.createElement('option');
      option.value = plant.id;
      option.textContent = plant.name;
      select.appendChild(option);
    });
  } else {
    const none = document.createElement('option');
    none.textContent = '(No plants available)';
    none.disabled = true;
    select.appendChild(none);
  }
},

  deleteReminder(id) {
  DataManager.deleteReminder(id);
},



  // Utilities (timer, light estimator, data import/export)
  setupUtilities() {
    // Timer
    (function () {
      let timerInterval = null;
      let timeLeft = 0;
      let isPaused = false;
      const display = document.getElementById('timerDisplay');
      const minutesInput = document.getElementById('timerMinutes');

      const updateDisplay = () => {
        if (!display) return;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        display.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      };

      document.getElementById('startTimer')?.addEventListener('click', () => {
        if (timerInterval) return;
        if (!isPaused) {
          const minutes = parseInt(minutesInput?.value) || 5;
          timeLeft = minutes * 60;
        }
        isPaused = false;
        timerInterval = setInterval(() => {
          timeLeft--;
          updateDisplay();
          if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            alert('⏰ Timer finished! Time to check your plants.');
          }
        }, 1000);
      });

      document.getElementById('pauseTimer')?.addEventListener('click', () => {
        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
          isPaused = true;
        }
      });

      document.getElementById('resetTimer')?.addEventListener('click', () => {
        clearInterval(timerInterval);
        timerInterval = null;
        isPaused = false;
        timeLeft = (parseInt(minutesInput?.value) || 5) * 60;
        updateDisplay();
      });

      // initial display
      timeLeft = (parseInt(minutesInput?.value) || 5) * 60;
      updateDisplay();
    })();

    // Light estimator
    (function () {
      const slider = document.getElementById('lightSlider');
      if (!slider) return;
      const indicator = document.getElementById('lightIndicator');
      const result = document.getElementById('lightResult');

      const updateLight = (value) => {
        indicator && (indicator.style.left = value + '%');
        let lightLevel, lightDesc, footcandles, plants, tips;
        const val = Number(value);
        if (val < 33) {
          lightLevel = 'Low Light';
          indicator && (indicator.textContent = '🌙');
          lightDesc = 'Minimal natural light, suitable for shade-tolerant plants.';
          footcandles = 'Approximately 50-250 foot-candles';
          plants = ['Snake Plant', 'ZZ Plant', 'Pothos', 'Peace Lily'];
          tips = 'Consider supplementing with grow lights.';
        } else if (val < 67) {
          lightLevel = 'Medium Light';
          indicator && (indicator.textContent = '⛅');
          lightDesc = 'Bright indirect light, perfect for most houseplants.';
          footcandles = 'Approximately 250-1,000 foot-candles';
          plants = ['Monstera', 'Philodendron', 'Spider Plant'];
          tips = 'Rotate plants weekly for even growth.';
        } else {
          lightLevel = 'High/Direct Light';
          indicator && (indicator.textContent = '☀️');
          lightDesc = 'Direct sunlight several hours daily.';
          footcandles = 'Approximately 1,000+ foot-candles';
          plants = ['Succulents', 'Cacti', 'Herbs'];
          tips = 'Ensure adequate watering as plants dry out faster.';
        }

        result && (result.textContent = lightLevel);
        document.getElementById('lightDescription') && (document.getElementById('lightDescription').textContent = lightDesc);
        document.getElementById('lightFootcandles') && (document.getElementById('lightFootcandles').textContent = footcandles);
        document.getElementById('lightPlantRecommendations') && (document.getElementById('lightPlantRecommendations').innerHTML = `<ul style="margin-left:1rem">${plants.map(p=>`<li>${p}</li>`).join('')}</ul>`);
        document.getElementById('lightPlacementTips') && (document.getElementById('lightPlacementTips').textContent = tips);
      };

      slider.addEventListener('input', (e) => updateLight(e.target.value));
      updateLight(slider.value || 50);
    })();

    document.getElementById('viewProfileBtn')?.addEventListener('click', () => {
  // If your app uses UI.showSection to toggle sections:
  if (typeof UI !== 'undefined' && UI.showSection) {
    UI.showSection('settings');
  } else {
    // Fallback: scroll smoothly to the settings section
    document.getElementById('settings')?.scrollIntoView({ behavior: 'smooth' });
  }
    });


    // Data management buttons
    document.getElementById('exportBtn')?.addEventListener('click', () => DataManager.exportData());
    document.getElementById('importBtn')?.addEventListener('click', () => {
      const file = document.getElementById('importFile')?.files?.[0];
      if (!file) return alert('Please select a file to import.');
      DataManager.importData(file, (ok, err) => {
        if (ok) {
          this.renderAll();
          alert('✅ Data imported successfully!');
        } else {
          alert('❌ Error importing data. Please check the file format.');
          console.error(err);
        }
      });
    });
    document.getElementById('clearDataBtn')?.addEventListener('click', () => {
      DataManager.clearAll();
      this.renderAll();
    });
    
    

  },

  

  // Renderers
  renderPlants() {
    const grid = document.getElementById('plantGrid');
    if (!grid) return;
    if (!Array.isArray(DataManager.plants) || DataManager.plants.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🌱</div>
          <p style="font-size: 1.1rem;">No plants yet. Add your first plant to get started!</p>
        </div>`;
      return;
    }

    grid.innerHTML = DataManager.plants.map(plant => `
      <div class="plant-card">
        <img src="${plant.photo || 'https://via.placeholder.com/400x220/95d5b2/2d6a4f?text=🌿+Plant'}"
             alt="${plant.name}" class="plant-image"
             onerror="this.src='https://via.placeholder.com/400x220/95d5b2/2d6a4f?text=🌿+Plant'">
        <div class="plant-content">
          <div class="plant-name">${plant.name}</div>
          <div class="plant-tags">
            ${(plant.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
          </div>
          <p style="color: var(--text-light); font-size: 0.95rem; margin-top: 0.75rem; line-height: 1.5;">
            ${plant.notes ? (plant.notes.length > 100 ? plant.notes.substring(0, 100) + '...' : plant.notes) : 'No care notes yet'}
          </p>
          <div class="plant-actions">
            <button class="btn btn-small" data-plant-id="${plant.id}" onclick="UI.viewPlant('${plant.id}')">View Details</button>
            <button class="btn btn-small btn-danger" onclick="UI.deletePlant('${plant.id}')">Delete</button>
          </div>
        </div>
      </div>
    `).join('');
  },

  viewPlant(id) {
    const plant = DataManager.plants.find(p => p.id === id);
    if (!plant) return alert('Plant not found.');
    document.getElementById('viewPlantName') && (document.getElementById('viewPlantName').textContent = plant.name);
    document.getElementById('viewPlantContent') && (document.getElementById('viewPlantContent').innerHTML = `
      ${plant.photo ? `<img src="${plant.photo}" style="width:100%;border-radius:12px;margin-bottom:1.5rem;" onerror="this.style.display='none'">` : ''}
      <div class="plant-tags" style="margin-bottom:1.5rem;">
        ${(plant.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
      </div>
      <h3 style="color: var(--primary-dark); margin-bottom: 0.75rem;">📝 Care Notes</h3>
      <p style="color: var(--text); white-space: pre-wrap; line-height:1.7; background:var(--bg); padding:1rem; border-radius:8px;">${plant.notes || 'No notes added yet.'}</p>
    `);
    document.getElementById('viewPlantModal')?.classList.add('active');
  },

  async deletePlant(id) {
  if (!confirm('Are you sure you want to delete this plant?')) return;
  await DataManager.deletePlant(id);
  this.renderPlants();
  this.renderReminders();
},


renderReminders() {
  const container = document.getElementById('remindersList');
  if (!container) return;

  container.innerHTML = '<h3>🌿 My Reminders</h3>';

  if (!DataManager.reminders || DataManager.reminders.length === 0) {
    container.innerHTML += '<p class="text-gray">No reminders yet.</p>';
    return;
  }

  DataManager.reminders.forEach(rem => {
    const plant = DataManager.plants.find(p => p.id == rem.plant_id);
    const remindDate = rem.remind_at ? new Date(rem.remind_at).toLocaleDateString() : '—';

    const card = document.createElement('div');
    card.className = 'reminder-item';

    card.innerHTML = `
      <div class="reminder-info">
        <h4>${plant ? plant.name : 'Unknown Plant'}</h4>
        <p>Type: ${UI.formatTask(rem.type)}</p>
        <p>📅 Remind At: ${remindDate}</p>
      </div>
      <button class="btn btn-small btn-danger" onclick="UI.deleteReminder(${rem.id})">Delete</button>
    `;

    container.appendChild(card);
  });
},


  formatTask(task) {
    const tasks = {
      water: '💧 Water',
      fertilize: '🌿 Fertilize',
      prune: '✂️ Prune',
      repot: '🪴 Repot',
      check: '👀 Check Health'
    };
    return tasks[task] || task;
  },

  formatFrequency(freq) {
    const frequencies = {
      'daily': 'Daily',
      'every-2-days': 'Every 2 Days',
      'twice-weekly': 'Twice Weekly',
      'weekly': 'Weekly',
      'bi-weekly': 'Bi-Weekly',
      'monthly': 'Monthly'
    };
    return frequencies[freq] || freq;
  },



  // Community Hub: swaps (search/filter/sort/bookmark/edit/report/message)
  setupCommunityHubEnhancements() {
    // Attach event listeners safely (idempotent)
    ['swapSearch', 'swapFilter', 'swapSort'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => this.renderSwaps());
        el.addEventListener('change', () => this.renderSwaps());
      }
    });

    const previewBtn = document.getElementById('previewSwapBtn');
    const previewBox = document.getElementById('swapPreview');
    const previewContent = document.getElementById('previewContent');

    if (previewBtn && previewContent && previewBox) {
      previewBtn.addEventListener('click', () => {
        const item = document.getElementById('swapItem')?.value || '(No title)';
        const desc = document.getElementById('swapDescription')?.value || 'No description provided.';
        const type = document.getElementById('swapType')?.value || 'cutting';
        const loc = document.getElementById('swapLocation')?.value || 'Not specified';
        const contact = document.getElementById('swapContact')?.value || 'Not provided';
        previewContent.innerHTML = `
          <p><strong>Type:</strong> ${this.formatSwapType(type)}</p>
          <p><strong>Title:</strong> ${item}</p>
          <p><strong>Description:</strong> ${desc}</p>
          <p><strong>Location:</strong> ${loc}</p>
          <p><strong>Contact:</strong> ${contact}</p>
        `;
        previewBox.style.display = 'block';
        previewBox.scrollIntoView({ behavior: 'smooth' });
      });
    }
  },

  renderSwaps() {
    const list = document.getElementById('swapList');
    if (!list) return;
    let swaps = Array.isArray(DataManager.swaps) ? [...DataManager.swaps] : [];

    const query = document.getElementById('swapSearch')?.value?.toLowerCase() || '';
    const filter = document.getElementById('swapFilter')?.value || 'all';
    const sort = document.getElementById('swapSort')?.value || 'newest';

    if (filter !== 'all') swaps = swaps.filter(s => (s.type || '').toLowerCase() === filter.toLowerCase());
    if (query) {
      swaps = swaps.filter(s =>
        (s.item || '').toLowerCase().includes(query) ||
        (s.description || '').toLowerCase().includes(query) ||
        (s.location || '').toLowerCase().includes(query)
      );
    }

    if (sort === 'newest') swaps.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (sort === 'oldest') swaps.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    if (sort === 'az') swaps.sort((a, b) => (a.item || '').localeCompare(b.item || ''));

    if (swaps.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🌿</div>
          <p>No listings found. Create one to get started!</p>
        </div>`;
      return;
    }

    list.innerHTML = swaps.map(swap => `
      <div class="swap-card ${swap.reported ? 'reported' : ''}">
        <div class="swap-card-header">
          <span class="swap-type-badge ${this.getBadgeClass(swap.type)}">${this.formatSwapType(swap.type)}</span>
          <h3>${swap.item}</h3>
        </div>
        <p class="swap-desc">${swap.description || 'No description provided.'}</p>
        ${swap.location ? `<p>📍 ${swap.location}</p>` : ''}
        ${swap.contact ? `<p>📞 ${swap.contact}</p>` : ''}
        <p style="color: var(--text-light); font-size: 0.8rem;">Posted: ${new Date(swap.createdAt).toLocaleString()}</p>
        <div class="swap-actions">
          <button class="btn btn-small" onclick="UI.editSwap('${swap.id}')">✏️ Edit</button>
          <button class="btn btn-small" onclick="UI.bookmarkSwap('${swap.id}')">${swap.bookmarked ? '💚 Saved' : '🤍 Save'}</button>
          <button class="btn btn-small" onclick="UI.messageSwap('${swap.id}')">💬 Message</button>
          <button class="btn btn-small btn-danger" onclick="UI.reportSwap('${swap.id}')">🚩 Report</button>
          <button class="btn btn-small btn-danger" onclick="UI.deleteSwap('${swap.id}')">🗑️ Delete</button>
        </div>
      </div>
    `).join('');
  },

  getBadgeClass(type) {
    const classes = { cutting: 'badge-cutting', seeds: 'badge-seeds', event: 'badge-event', tools: 'badge-tools' };
    return classes[type] || 'badge-cutting';
  },

  formatSwapType(type) {
    const types = { cutting: '🌱 Cutting', seeds: '🌾 Seeds', event: '📅 Event', tools: '🛠️ Tools/Supplies' };
    return types[type] || type;
  },

  bookmarkSwap(id) {
    const swap = DataManager.swaps.find(s => s.id === id);
    if (!swap) return;
    swap.bookmarked = !swap.bookmarked;
    DataManager.save();
    this.renderSwaps();
  },

  editSwap(id) {
    const swap = DataManager.swaps.find(s => s.id === id);
    if (!swap) return alert('Swap not found.');
    const newTitle = prompt('Edit title:', swap.item);
    if (newTitle === null) return; // cancelled
    const newDesc = prompt('Edit description:', swap.description);
    if (newDesc === null) return;
    const newLoc = prompt('Edit location:', swap.location);
    if (newLoc === null) return;
    const newContact = prompt('Edit contact:', swap.contact);
    if (newContact === null) return;
    DataManager.updateSwap(id, { item: newTitle, description: newDesc, location: newLoc, contact: newContact });
    this.renderSwaps();
  },

  messageSwap(id) {
    const swap = DataManager.swaps.find(s => s.id === id);
    if (!swap) return;
    alert(`💬 Message sent to: ${swap.contact || 'anonymous user'}\n\n(This is a simulated offline feature.)`);
  },

  reportSwap(id) {
    const swap = DataManager.swaps.find(s => s.id === id);
    if (!swap) return;
    if (!confirm('Report this listing?')) return;
    swap.reported = true;
    DataManager.save();
    this.renderSwaps();
    alert('Thanks — this listing has been reported.');
  },

  deleteSwap(id) {
    if (!confirm('Are you sure you want to delete this listing?')) return;
    DataManager.deleteSwap(id);
    this.renderSwaps();
  },

  // Lessons (kept concise)
  renderLessons() {
    const lessons = [
      {
        icon: '🌱',
        title: 'Starting Seeds Indoors',
        content: `
          <h3>Quick Guide to Seed Starting</h3>
          <ul>
            <li>Use seed starting mix (lighter and fluffier than regular potting soil for better drainage)</li>
            <li>Plant seeds at a depth of 2-3x their diameter size</li>
            <li>Keep soil consistently moist but not waterlogged - use a spray bottle for gentle watering</li>
            <li>Provide 12-16 hours of light daily (grow lights or bright sunny window)</li>
            <li>Maintain temperature between 65-75°F for most vegetable and herb seeds</li>
            <li>Transplant seedlings after they develop 2-4 true leaves (not the first sprouting leaves)</li>
            <li>Harden off seedlings by gradually exposing them to outdoor conditions before transplanting</li>
          </ul>
          <p><strong>💡 Pro Tip:</strong> Label everything with the plant name and date! It's incredibly easy to forget what you planted where, especially when growing multiple varieties.</p>
        `
      },
      {
        icon: '💧',
        title: 'Proper Watering Techniques',
        content: `
          <h3>Master the Art of Watering</h3>
          <ul>
            <li>Always check soil moisture before watering - stick your finger 1-2 inches deep into the soil</li>
            <li>Water thoroughly until excess drains from the bottom drainage holes</li>
            <li>Empty saucers after 15-30 minutes to prevent root rot and fungus gnats</li>
            <li>Water less frequently in winter months when plant growth slows down</li>
            <li>Use room temperature water when possible - cold water can shock roots</li>
            <li>Bottom watering works great for sensitive plants like African violets and succulents</li>
            <li>Morning watering is best - gives plants time to absorb moisture before evening</li>
          </ul>
          <p><strong>⚠️ Remember:</strong> More plants die from overwatering than underwatering! When in doubt, wait another day. Yellow leaves often indicate overwatering, while brown crispy leaves suggest underwatering.</p>
        `
      },
      {
        icon: '☀️',
        title: 'Understanding Light Requirements',
        content: `
          <h3>Light Levels Explained</h3>
          <ul>
            <li><strong>Low Light:</strong> North-facing windows, 50-250 foot-candles, 4-6 hours of indirect light. Plants survive but grow slowly.</li>
            <li><strong>Medium Light:</strong> East/West windows, 250-1000 foot-candles, bright indirect light. Ideal for most houseplants.</li>
            <li><strong>High Light:</strong> South-facing windows, 1000+ foot-candles, direct sun exposure for 4+ hours. Perfect for succulents and herbs.</li>
            <li>Rotate plants weekly 1/4 turn for even, balanced growth</li>
            <li>Watch for signs: leggy, stretched growth means the plant needs more light</li>
            <li>Burned, bleached, or brown-spotted leaves indicate too much direct sun</li>
            <li>Use sheer curtains to filter intense afternoon sun in summer months</li>
          </ul>
          <p><strong>💡 Quick Test:</strong> If you can comfortably read a book without artificial light, it's medium to high light. If you need a lamp, it's low light.</p>
        `
      },
      {
        icon: '🐛',
        title: 'Common Pest Solutions',
        content: `
          <h3>Natural Pest Control Methods</h3>
          <ul>
            <li><strong>Aphids:</strong> Spray with diluted soapy water (1 tsp dish soap per quart) or neem oil solution</li>
            <li><strong>Spider Mites:</strong> Increase humidity around plants, wipe leaves with damp cloth, apply neem oil weekly</li>
            <li><strong>Fungus Gnats:</strong> Let top 2 inches of soil dry completely between waterings, use yellow sticky traps</li>
            <li><strong>Mealybugs:</strong> Remove with cotton swab dipped in 70% rubbing alcohol, repeat every few days</li>
            <li><strong>Scale:</strong> Scrape off gently with a soft cloth or sponge, treat with neem oil or insecticidal soap</li>
            <li><strong>Whiteflies:</strong> Use yellow sticky traps, spray with insecticidal soap or neem oil</li>
            <li><strong>General Prevention:</strong> Always inspect new plants thoroughly before bringing them near your other plants</li>
            <li>Quarantine affected plants immediately to prevent spread to healthy plants</li>
          </ul>
          <p><strong>🛡️ Prevention:</strong> Regular weekly inspection is your best defense! Catch pests early when they're easier to control. Healthy, well-cared-for plants are naturally more resistant to pests.</p>
        `
      },
      {
        icon: '🌿',
        title: 'Fertilizing Basics',
        content: `
          <h3>Feed Your Plants Right</h3>
          <ul>
            <li>Fertilize during the active growing season (spring and summer months)</li>
            <li>Use diluted liquid fertilizer at half the recommended strength for most houseplants</li>
            <li>Feed every 2-4 weeks during active growth, following package instructions</li>
            <li>Reduce fertilizing frequency in fall, stop completely in winter for most plants</li>
            <li>Flush soil with plain water every 2-3 months to prevent salt buildup</li>
            <li>Look for balanced NPK ratios (like 10-10-10) for general houseplants</li>
            <li>Higher nitrogen (first number) promotes leafy growth, higher phosphorus (second) encourages blooms</li>
          </ul>
          <p><strong>⚠️ Warning:</strong> More is NOT better with fertilizer! Over-fertilizing can burn roots and damage plants. Signs include brown leaf tips, white crust on soil surface, and wilting despite moist soil.</p>
        `
      },
      {
        icon: '✂️',
        title: 'Pruning and Maintenance',
        content: `
          <h3>Keep Plants Healthy with Pruning</h3>
          <ul>
            <li>Remove dead, yellowing, or diseased leaves promptly to prevent disease spread</li>
            <li>Pinch back leggy stems just above a leaf node to encourage bushier, fuller growth</li>
            <li>Always cut just above a leaf node at a 45-degree angle using sharp, clean tools</li>
            <li>Sterilize pruning tools between plants using 70% rubbing alcohol to prevent disease transmission</li>
            <li>Best pruning time: spring and early summer during active growth for most plants</li>
            <li>Never remove more than 25% of the plant at once - too much pruning causes stress</li>
            <li>Dust large leaves monthly with a damp cloth to improve photosynthesis</li>
          </ul>
          <p><strong>🌱 Bonus:</strong> Save healthy stem cuttings for propagation! Many plants root easily in water or moist soil, giving you free new plants to keep or share with friends.</p>
        `
      },
      {
        icon: '🪴',
        title: 'Repotting Essentials',
        content: `
          <h3>When and How to Repot</h3>
          <ul>
            <li><strong>Signs it's time:</strong> Roots growing through drainage holes, water runs straight through, plant is top-heavy and tips over, growth has slowed significantly</li>
            <li>Repot in spring when plants enter active growth phase for best recovery</li>
            <li>Choose a pot only 1-2 inches larger in diameter - too large causes overwatering issues</li>
            <li>Always use pots with drainage holes to prevent root rot</li>
            <li>Gently loosen the root ball and trim any dead, mushy, or circling roots</li>
            <li>Use fresh, appropriate potting mix - don't reuse old soil which may harbor pests or disease</li>
            <li>Water thoroughly after repotting and keep in bright, indirect light for a few weeks</li>
          </ul>
          <p><strong>💡 Pro Tip:</strong> Most houseplants only need repotting every 1-3 years. Don't repot just because it's spring - only repot when the plant actually needs it!</p>
        `
      },
      {
        icon: '🌡️',
        title: 'Temperature & Humidity',
        content: `
          <h3>Creating the Perfect Environment</h3>
          <ul>
            <li><strong>Temperature:</strong> Most houseplants thrive in 65-75°F during the day, 60-70°F at night</li>
            <li>Avoid placing plants near heating vents, air conditioners, or drafty windows</li>
            <li>Keep plants away from extreme temperature fluctuations</li>
            <li><strong>Humidity:</strong> Most tropical houseplants prefer 40-60% humidity</li>
            <li>Increase humidity by grouping plants together, using pebble trays, or running a humidifier</li>
            <li>Mist leaves occasionally, but this provides only temporary humidity relief</li>
            <li>Brown leaf tips and edges often indicate humidity is too low</li>
          </ul>
          <p><strong>🌿 Quick Fix:</strong> Place plants on trays filled with pebbles and water. The water evaporates around the plants, creating a humid microclimate. Just ensure pot bottoms don't sit in water!</p>
        `
      }
    ];
    
    const container = document.getElementById('lessonsList');
    if (!container) return;
    container.innerHTML = lessons.map((lesson, idx) => `
      <div class="lesson-card" onclick="UI.toggleLesson(${idx})">
        <h3><span class="lesson-icon">${lesson.icon}</span> ${lesson.title}</h3>
        <p>Click to expand and learn more →</p>
      </div>
      <div class="lesson-content" id="lesson-${idx}">${lesson.content}</div>
    `).join('');
  },


  toggleLesson(idx) {
    const content = document.getElementById(`lesson-${idx}`);
    if (content) content.classList.toggle('active');
  },

  setLightLevel(value) {
    const slider = document.getElementById('lightSlider');
    if (slider) {
      slider.value = value;
      slider.dispatchEvent(new Event('input'));
    }
  },

  // Master render
  renderAll() {
    this.renderPlants();
    this.renderReminders();
    this.renderSwaps();
    this.renderLessons();
  }
};
async function loadPlantOptions() {
  const res = await fetch(`${API_URL}/plants`, { headers: authHeader() });
  const plants = await res.json();

  const select = document.getElementById("plantSelect");
  select.innerHTML = "";

  plants.forEach(plant => {
    const option = document.createElement("option");
    option.value = plant.id;         // IMPORTANT: use the ID, not the name
    option.textContent = plant.name; // Display name
    select.appendChild(option);
  });
}

// -------------------------
// Calendar & reminders visualization (fully accurate repeating logic)
// -------------------------
function setupCalendar() {
  const toggleBtn = document.getElementById("toggleCalendarBtn");
  const calendarView = document.getElementById("calendarView");
  const calendarGrid = document.getElementById("calendarGrid");
  const calendarMonth = document.getElementById("calendarMonth");
  const prevBtn = document.getElementById("prevMonth");
  const nextBtn = document.getElementById("nextMonth");
  if (!toggleBtn || !calendarView || !calendarGrid || !calendarMonth) {
    console.warn("Calendar elements not found; skipping calendar setup.");
    return;
  }

  let currentDate = new Date();

  // --- Helper: check if two dates fall on the same calendar day
  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth() === b.getMonth() &&
           a.getDate() === b.getDate();
  }

  // --- Frequency matcher ---
  function isReminderForDate(reminder, date) {
  // Use the date the user selected
  const start = new Date(reminder.remind_at);
  start.setHours(0, 0, 0, 0);

  const check = new Date(date);
  check.setHours(0, 0, 0, 0);

  // Calculate difference in days
  const diffDays = Math.floor((check - start) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return false; // Don't show before start date

  const weekday = check
    .toLocaleString("en-US", { weekday: "long" })
    .toLowerCase();

  switch (reminder.frequency) {
    case "daily":
      return true;

    case "every-2-days":
      return diffDays % 2 === 0;

    case "twice-weekly": {
      const days = reminder.days || ["tuesday", "friday"];
      return days.includes(weekday);
    }

    case "weekly": {
      // If user selected a weekday, match that weekday
      if (reminder.day) return weekday === reminder.day.toLowerCase();
      // Otherwise repeat every 7 days from remind_at
      return diffDays % 7 === 0;
    }

    case "bi-weekly":
      return diffDays % 14 === 0;

    case "monthly": {
      const startDay = start.getDate();
      const targetDay = check.getDate();
      const lastDay = new Date(check.getFullYear(), check.getMonth() + 1, 0).getDate();
      return targetDay === Math.min(startDay, lastDay);
    }

    default:
      return false;
  }
}


  // --- Calendar rendering ---
  function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    calendarMonth.textContent = new Date(year, month)
      .toLocaleString("default", { month: "long", year: "numeric" });
    calendarGrid.innerHTML = '';

    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    // Weekday headers
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayRow = document.createElement('div');
    dayRow.className = 'calendar-days';
    weekdays.forEach(d => {
      const el = document.createElement('div');
      el.className = 'calendar-day-name';
      el.textContent = d;
      dayRow.appendChild(el);
    });
    calendarGrid.appendChild(dayRow);

    const datesGrid = document.createElement('div');
    datesGrid.className = 'calendar-dates';

    // Empty cells before the first day
    for (let i = 0; i < firstDay; i++) datesGrid.appendChild(document.createElement('div'));

    // Fill in the days
    for (let d = 1; d <= lastDate; d++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-date';
      cell.textContent = d;

      const date = new Date(year, month, d);
      const today = new Date();
      if (sameDay(date, today)) cell.classList.add('today');

      // Check all reminders for this date
      const remindersToday = (DataManager.reminders || []).filter(r => isReminderForDate(r, date));

      if (remindersToday.length) {
        const dot = document.createElement('div');
        dot.className = 'calendar-dot';
        cell.appendChild(dot);

        // Tooltip info
        cell.title = remindersToday
          .map(r => `${r.plant || 'Plant'}: ${r.task || 'Task'} (${r.frequency || ''})`)
          .join(", ");

        // Highlight upcoming reminders
        if (date > today && (date - today) <= 7 * 24 * 60 * 60 * 1000) {
          cell.classList.add('upcoming');
        }
      }

      // Click to show reminder details
      cell.addEventListener('click', () => {
        if (!remindersToday.length) {
          alert(`📅 ${date.toDateString()} — No reminders for this day.`);
          return;
        }
        const list = remindersToday
          .map(r => `🌿 ${r.plant || 'Plant'} — ${r.task || 'Task'} (${r.frequency || ''})`)
          .join("\n\n");
        alert(`📅 ${date.toDateString()}\n\n${list}`);
      });

      datesGrid.appendChild(cell);
    }

    calendarGrid.appendChild(datesGrid);
  }

  // --- Month navigation ---
  prevBtn?.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });
  nextBtn?.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });

  toggleBtn.addEventListener('click', () => {
    const hidden = calendarView.style.display === 'none' || !calendarView.style.display;
    calendarView.style.display = hidden ? 'block' : 'none';
    if (hidden) renderCalendar();
  });

  // Public render function
  return { renderCalendar };
}


// -------------------------
// Responsive Navigation Toggle (mobile menu)
// -------------------------
const navToggle = document.getElementById('navToggle');
const headerNav = document.querySelector('header nav');

if (navToggle && headerNav) {
  // Give nav an ID for accessibility if missing
  headerNav.id = headerNav.id || 'main-nav';
  navToggle.setAttribute('aria-controls', headerNav.id);
  navToggle.setAttribute('aria-expanded', 'false');

  // Toggle open/close
  navToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = headerNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });

  // Close when clicking outside nav
  document.addEventListener('click', (e) => {
    if (!headerNav.classList.contains('open')) return;
    if (!headerNav.contains(e.target) && e.target !== navToggle) {
      headerNav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && headerNav.classList.contains('open')) {
      headerNav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      navToggle.focus();
    }
  });

  // Close menu automatically when a nav button is clicked (for mobile)
  headerNav.querySelectorAll('.nav-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      if (headerNav.classList.contains('open')) {
        headerNav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    })
  );
}

// -------------------------
// Single DOMContentLoaded initialization
// -------------------------
document.addEventListener('DOMContentLoaded', async () => {
  //DataManager.init();
  UI.init();
  await DataManager.loadPlantsFromServer();
  UI.populatePlantSelect();                 // now dropdown can be filled
  await DataManager.loadRemindersFromServer();

  // Setup calendar
  const cal = setupCalendar();
  // Ensure calendar rerenders when reminders change
  const originalSave = DataManager.save.bind(DataManager);
  DataManager.save = function () {
    originalSave();
    if (cal && typeof cal.renderCalendar === 'function') cal.renderCalendar();
  };

  // Load user profile info from localStorage  

 

  // Simple logout but

  // Ensure initial UI render
  UI.renderAll();

  console.log('✅ myscripts.js initialized (cleaned)');
});

window.addEventListener("DOMContentLoaded", loadCommunityListings);

document.addEventListener("DOMContentLoaded", () => {
  const profileBtn = document.getElementById("profileBtn");
  const dropdown = document.getElementById("profileDropdown");
  const name = localStorage.getItem("user_name");
  const email = localStorage.getItem("user_email");
  const id = localStorage.getItem("user_id");
  // ✅ Edit Profile Modal Functionality
const editProfileBtn = document.getElementById("editProfileBtn");
const editProfileModal = document.getElementById("editProfileModal");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const cancelEditProfileBtn = document.getElementById("cancelEditProfileBtn");

if (editProfileBtn && editProfileModal) {
  editProfileBtn.addEventListener("click", () => {
    // Pre-fill current values
    document.getElementById("editProfileName").value = localStorage.getItem("user_name") || "";
    document.getElementById("editProfileEmail").value = localStorage.getItem("user_email") || "";

    editProfileModal.classList.add("active");
  });
}

cancelEditProfileBtn?.addEventListener("click", () => {
  editProfileModal.classList.remove("active");
});

saveProfileBtn?.addEventListener("click", async () => {
  const name = document.getElementById("editProfileName").value.trim();
  const email = document.getElementById("editProfileEmail").value.trim();

  if (!name || !email) return alert("Please fill in all fields");

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/users/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ name, email })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Failed to update profile");
    }

    const updatedUser = await res.json();

    // ✅ Update localStorage + page display
    localStorage.setItem("user_name", updatedUser.name);
    localStorage.setItem("user_email", updatedUser.email);

    document.getElementById("profileName").textContent = updatedUser.name;
    document.getElementById("profileEmail").textContent = updatedUser.email;

    alert("Profile updated successfully 🌿");
    editProfileModal.classList.remove("active");
  } catch (err) {
    console.error("Error updating profile:", err);
    alert("Failed to update profile");
  }
});


   if (document.getElementById("profileName")) {
    document.getElementById("profileName").textContent = name || "Unknown User";
    document.getElementById("profileEmail").textContent = email || "Not available";
    document.getElementById("profileId").textContent = id || "N/A";
  }

   document.getElementById("logoutBtn2")?.addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "login.html";
  });

  profileBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("open");
  });

  document.addEventListener("click", () => {
    dropdown.classList.remove("open");
  });

  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "login.html";
  });

  document.getElementById("switchAccountBtn").addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "login.html";
  });
});


