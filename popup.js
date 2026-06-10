// Updated Popup Logic for Lister Pro

document.addEventListener("DOMContentLoaded", () => {
  // Navigation
  const tabs = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");
  
  // Forms & Inputs
  const titleInput = document.getElementById("title");
  const titleCounter = document.getElementById("title-counter");
  const priceInput = document.getElementById("price");
  const descTextarea = document.getElementById("description");
  const descCounter = document.getElementById("description-counter");
  const categorySelect = document.getElementById("category");
  const conditionSelect = document.getElementById("condition");
  const availabilitySelect = document.getElementById("availability");
  const productTagsInput = document.getElementById("product-tags");
  const quantityInput = document.getElementById("quantity");
  
  // Uploader Elements
  const uploadTriggerBtn = document.getElementById("upload-trigger-btn");
  const productImagesInput = document.getElementById("product-images-input");
  const imageCountLabel = document.getElementById("image-count-label");
  const imagePreviewGrid = document.getElementById("image-preview-grid");

  // Actions
  const saveDraftBtn = document.getElementById("save-draft-btn");
  const startAutofillBtn = document.getElementById("start-autofill-btn");
  const clearAllBtn = document.getElementById("clear-all-btn");
  const detectDraftsBtn = document.getElementById("detect-drafts-btn");
  const draftListContainer = document.getElementById("draft-list-container");
  const continueFillingBtn = document.getElementById("continue-filling-btn");
  
  const locationInput = document.getElementById("location-input");
  const applyLocationBtn = document.getElementById("apply-location-btn");
  const tabsToOpenInput = document.getElementById("tabs-to-open");
  
  const statusDot = document.getElementById("status-dot");
  const statusTextLabel = document.getElementById("status-text-label");
  const statusMessage = document.getElementById("status-message");

  let selectedImages = [];
  let autoSaveTimeout = null;

  // --- Tab Control ---
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tabContents.forEach(tc => tc.classList.remove("active"));
      
      tab.classList.add("active");
      const contentId = tab.getAttribute("data-tab");
      document.getElementById(contentId).classList.add("active");
    });
  });

  // --- Character Counters ---
  titleInput.addEventListener("input", () => {
    titleCounter.textContent = `${titleInput.value.length} / 100`;
    triggerAutoSave();
  });

  descTextarea.addEventListener("input", () => {
    descCounter.textContent = `${descTextarea.value.length} / 5000`;
    triggerAutoSave();
  });

  // --- Image Upload System ---
  uploadTriggerBtn.addEventListener("click", () => {
    productImagesInput.click();
  });

  productImagesInput.addEventListener("change", (e) => {
    const files = Array.from(e.target.files);
    let loadedCount = 0;
    
    files.forEach(file => {
      if (!file.type.startsWith("image/")) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        selectedImages.push(event.target.result);
        loadedCount++;
        if (loadedCount === files.length || selectedImages.length > 50) {
          // Render and save
          renderImagePreviews();
          saveFormData();
        }
      };
      reader.readAsDataURL(file);
    });
    
    // Reset input so user can choose same file again
    productImagesInput.value = "";
  });

  function renderImagePreviews() {
    imagePreviewGrid.innerHTML = "";
    imageCountLabel.textContent = `${selectedImages.length} Images Selected`;
    
    selectedImages.forEach((base64, index) => {
      const wrapper = document.createElement("div");
      wrapper.className = "thumbnail-wrapper";
      
      const img = document.createElement("img");
      img.className = "thumbnail-img";
      img.src = base64;
      
      const delBtn = document.createElement("button");
      delBtn.className = "btn-delete-img";
      delBtn.textContent = "×";
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        selectedImages.splice(index, 1);
        renderImagePreviews();
        saveFormData();
      });
      
      wrapper.appendChild(img);
      wrapper.appendChild(delBtn);
      imagePreviewGrid.appendChild(wrapper);
    });
  }

  // --- Save / Load Drafts ---
  async function loadFormData() {
    try {
      const data = await chrome.storage.local.get(["draftData", "locationData", "tabsToOpen"]);
      
      if (data.draftData) {
        const d = data.draftData;
        titleInput.value = d.title || "";
        priceInput.value = d.price || "";
        descTextarea.value = d.description || "";
        categorySelect.value = d.category || "";
        conditionSelect.value = d.condition || "";
        availabilitySelect.value = d.availability || "List as single item";
        productTagsInput.value = d.productTags || "";
        quantityInput.value = d.quantity || 1;
        selectedImages = d.images || [];
        
        titleCounter.textContent = `${titleInput.value.length} / 100`;
        descCounter.textContent = `${descTextarea.value.length} / 5000`;
        renderImagePreviews();
      }

      if (data.locationData) {
        locationInput.value = data.locationData;
      }

      if (data.tabsToOpen) {
        tabsToOpenInput.value = data.tabsToOpen;
      }
    } catch (e) {
      console.error("Error loading stored data", e);
    }
  }

  function getFormData() {
    return {
      title: titleInput.value,
      price: priceInput.value ? Number(priceInput.value) : 0,
      description: descTextarea.value,
      category: categorySelect.value,
      condition: conditionSelect.value,
      availability: availabilitySelect.value,
      productTags: productTagsInput.value,
      quantity: quantityInput.value ? Number(quantityInput.value) : 1,
      images: selectedImages
    };
  }

  async function saveFormData() {
    const draftData = getFormData();
    await chrome.storage.local.set({ draftData, tabsToOpen: Number(tabsToOpenInput.value || 1) });
  }

  function triggerAutoSave() {
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
      saveFormData();
    }, 500);
  }

  // Auto-save listeners
  [priceInput, categorySelect, conditionSelect, availabilitySelect, productTagsInput, quantityInput, tabsToOpenInput]
    .forEach(input => {
      input.addEventListener("input", triggerAutoSave);
      input.addEventListener("change", triggerAutoSave);
    });

  // Explicit buttons
  saveDraftBtn.addEventListener("click", async () => {
    await saveFormData();
    showStatus("success", "Listing data saved successfully.");
  });

  clearAllBtn.addEventListener("click", async () => {
    titleInput.value = "";
    priceInput.value = "";
    descTextarea.value = "";
    categorySelect.value = "";
    conditionSelect.value = "";
    availabilitySelect.value = "List as single item";
    productTagsInput.value = "";
    quantityInput.value = 1;
    tabsToOpenInput.value = 1;
    selectedImages = [];
    
    titleCounter.textContent = "0 / 100";
    descCounter.textContent = "0 / 5000";
    renderImagePreviews();
    
    await chrome.storage.local.remove(["draftData", "tabsToOpen"]);
    showStatus("success", "Draft data cleared.");
  });

  // --- Message Routing ---
  async function sendMessageToTab(action, payload) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        showStatus("error", "No active browser tab found.");
        return;
      }

      if (action === "START_AUTOFILL") {
        const count = Number(tabsToOpenInput.value || 1);
        // Reset image index counter so the tabs consume images starting from index 0
        await chrome.storage.local.set({ bulkImageIndex: 0 });

        if (count > 1) {
          showStatus("running", `Opening ${count} tabs concurrently for bulk automation...`);
          chrome.runtime.sendMessage({
            action: "OPEN_BULK_TABS",
            count: count,
            url: "https://www.facebook.com/marketplace/create/item",
            payload: payload
          }, (response) => {
            showStatus("success", `Opened ${count} listing creator tabs!`);
            // Clean up the storage key after 8 seconds so future manual page openings do not trigger autofill automatically
            setTimeout(() => {
              chrome.storage.local.remove('pendingAutofill');
            }, 8000);
          });
          return;
        }
      }

      if (!tab.url || !tab.url.includes("facebook.com")) {
        showStatus("error", "Please open Facebook Marketplace first.");
        return;
      }

      chrome.tabs.sendMessage(tab.id, { action, payload }, (response) => {
        if (chrome.runtime.lastError) {
          showStatus("running", "Initializing Marketplace creator tab...");
          if (!tab.url.includes("/marketplace/create/item")) {
            chrome.tabs.update(tab.id, { url: "https://www.facebook.com/marketplace/create/item" });
            if (action === "START_AUTOFILL") {
              chrome.storage.local.set({ pendingAutofill: payload });
            } else if (action === "DETECT_DRAFT") {
              chrome.storage.local.set({ pendingResumeDraft: true });
            }
          }
        } else {
          showStatus("running", "Lister is running automation...");
        }
      });
    } catch (e) {
      showStatus("error", e.message);
    }
  }

  // --- Status Panel ---
  function showStatus(type, msg) {
    statusDot.className = "indicator-dot";
    if (type === "running") {
      statusDot.classList.add("running");
      statusTextLabel.textContent = "Running";
      statusTextLabel.style.color = "var(--neon-cyan)";
    } else if (type === "success") {
      statusDot.classList.add("success");
      statusTextLabel.textContent = "Success";
      statusTextLabel.style.color = "var(--neon-cyan)";
    } else if (type === "error") {
      statusDot.classList.add("error");
      statusTextLabel.textContent = "Error";
      statusTextLabel.style.color = "var(--neon-red)";
    } else {
      statusTextLabel.textContent = "Idle";
      statusTextLabel.style.color = "var(--text-muted)";
    }
    statusMessage.textContent = msg;
  }

  // Event handlers
  startAutofillBtn.addEventListener("click", () => {
    const data = getFormData();
    if (!data.title) {
      showStatus("error", "A Title is required to start.");
      return;
    }
    sendMessageToTab("START_AUTOFILL", data);
  });

  detectDraftsBtn.addEventListener("click", () => {
    sendMessageToTab("DETECT_DRAFT", {});
  });

  continueFillingBtn.addEventListener("click", () => {
    const data = getFormData();
    sendMessageToTab("START_AUTOFILL", data);
  });

  applyLocationBtn.addEventListener("click", async () => {
    const location = locationInput.value;
    if (!location) {
      showStatus("error", "A location (City / ZIP) is required.");
      return;
    }
    await chrome.storage.local.set({ locationData: location });
    sendMessageToTab("SET_LOCATION", { location });
  });

  // Listen for progress reports from content script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "AUTOFILL_STATUS") {
      const { phase, status, message: text } = message.payload;
      showStatus(status, `[Phase ${phase}] ${text}`);
      if (phase === 2 && status === "done") {
        updateDraftListUI();
      }
    }
  });

  async function updateDraftListUI() {
    const data = await chrome.storage.local.get(["draftData"]);
    draftListContainer.innerHTML = "";
    if (data.draftData && data.draftData.title) {
      const item = document.createElement("div");
      item.className = "draft-item";
      item.innerHTML = `
        <div class="draft-info">
          <div class="draft-title">${data.draftData.title}</div>
          <div class="draft-meta">Saved Draft</div>
        </div>
        <button class="btn-resume" id="resume-item-btn">Resume</button>
      `;
      draftListContainer.appendChild(item);
      
      document.getElementById("resume-item-btn").addEventListener("click", () => {
        sendMessageToTab("START_AUTOFILL", data.draftData);
      });
    } else {
      draftListContainer.innerHTML = `<div class="no-drafts">No draft data found.</div>`;
    }
  }

  // Start
  loadFormData();
});
