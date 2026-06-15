// Rapid Lister Pro - Content Script
// Developed by AB Rehman Malik

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// React-compatible value setter - CRITICAL for Facebook
function typeIntoField(element, text) {
  element.focus();
  const prototype = element.tagName === 'TEXTAREA' 
    ? HTMLTextAreaElement.prototype 
    : HTMLInputElement.prototype;
  const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
  
  // Clear first
  nativeSetter.call(element, '');
  element.dispatchEvent(new Event('input', { bubbles: true }));
  
  // Type character by character (human-like)
  let val = '';
  for (const char of String(text)) {
    val += char;
    nativeSetter.call(element, val);
    element.dispatchEvent(new InputEvent('input', { 
      bubbles: true, 
      data: char, 
      inputType: 'insertText' 
    }));
  }
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

// Wait for element with timeout
function waitForElement(selectorFn, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const el = selectorFn();
    if (el) return resolve(el);
    
    const observer = new MutationObserver(() => {
      const found = selectorFn();
      if (found) { 
        observer.disconnect(); 
        clearTimeout(timeout); 
        resolve(found); 
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    
    const timeout = setTimeout(() => { 
      observer.disconnect(); 
      reject(new Error("Timeout")); 
    }, timeoutMs);
  });
}

// Convert base64 to File object
async function base64ToFile(base64Data, filename) {
  const res = await fetch(base64Data);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type });
}

// Selectors
const getTitleField = () =>
  document.querySelector('input[aria-label="Title"]') ||
  document.querySelector('input[placeholder*="title" i]') ||
  [...document.querySelectorAll('input[type="text"]')].find(el => {
    const rect = el.getBoundingClientRect();
    return rect.width > 100 && rect.height > 0 && el.offsetParent !== null;
  });

const getPriceField = () =>
  document.querySelector('input[aria-label="Price"]') ||
  document.querySelector('input[aria-label="price" i]') ||
  document.querySelector('input[placeholder*="price" i]') ||
  [...document.querySelectorAll('input')].find(el => 
    /price/i.test(el.getAttribute('aria-label') || el.placeholder || ''));

const getCategoryDropdown = () =>
  document.querySelector('[aria-label="Category"]') ||
  [...document.querySelectorAll('[role="combobox"]')].find(el =>
    /category/i.test(el.getAttribute('aria-label') || el.innerText || ''));

const getConditionDropdown = () =>
  document.querySelector('[aria-label="Condition"]') ||
  [...document.querySelectorAll('[role="combobox"]')].find(el =>
    /condition/i.test(el.getAttribute('aria-label') || el.innerText || ''));

const getDescriptionField = () =>
  document.querySelector('textarea[aria-label="Description"]') ||
  document.querySelector('textarea[placeholder*="description" i]') ||
  document.querySelector('textarea');

const getAvailabilityDropdown = () =>
  document.querySelector('[aria-label="Availability"]') ||
  [...document.querySelectorAll('[role="combobox"]')].find(el =>
    /availability/i.test(el.getAttribute('aria-label') || el.innerText || ''));

const getProductTagsInput = () =>
  document.querySelector('input[aria-label="Product tags"]') ||
  document.querySelector('input[placeholder*="tags" i]');

const getQuantityInput = () =>
  document.querySelector('input[aria-label="Quantity"]') ||
  document.querySelector('input[placeholder*="quantity" i]');

const getFileInput = () =>
  document.querySelector('input[type="file"][multiple]') ||
  document.querySelector('input[type="file"]') ||
  document.querySelector('input[accept*="image"]');

const getLocationField = () =>
  document.querySelector('input[aria-label="Location"]') ||
  document.querySelector('input[placeholder*="location" i]') ||
  document.querySelector('input[placeholder*="city" i]');

const getSaveDraftButton = () =>
  document.querySelector('[aria-label*="Save draft" i]') ||
  [...document.querySelectorAll('div[role="button"], button')].find(b =>
    b.textContent.trim().toLowerCase().includes('save draft'));

const getPublishButton = () =>
  document.querySelector('[aria-label="Publish"]') ||
  [...document.querySelectorAll('div[role="button"]')].find(b =>
    b.textContent.trim().toLowerCase() === 'publish');

// Tags helper
function typeTags(element, tagsText) {
  if (!tagsText) return;
  element.focus();
  const tags = tagsText.split(',').map(t => t.trim()).filter(Boolean);
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  
  (async () => {
    for (const tag of tags) {
      nativeInputValueSetter.call(element, tag);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(200);
      element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter', code: 'Enter', keyCode: 13 }));
      element.dispatchEvent(new KeyboardEvent('keypress', { bubbles: true, key: 'Enter', code: 'Enter', keyCode: 13 }));
      element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Enter', code: 'Enter', keyCode: 13 }));
      await sleep(300);
    }
  })();
}

async function selectDropdownOption(dropdownEl, optionText) {
  if (!dropdownEl || !optionText) return;
  
  // Click to open dropdown
  dropdownEl.click();
  await sleep(1000); // Wait for dropdown to open
  
  // Find option
  const findOption = () => {
    const allElements = [
      ...document.querySelectorAll('[role="option"]'),
      ...document.querySelectorAll('[role="menuitem"]'),
      ...document.querySelectorAll('ul li'),
      ...document.querySelectorAll('div[role="listbox"] div'),
      ...document.querySelectorAll('span'),
      ...document.querySelectorAll('div')
    ];
    
    // Exact match first
    const exact = allElements.find(el => 
      el.children.length === 0 && 
      el.textContent.trim().toLowerCase() === optionText.toLowerCase()
    );
    if (exact) return exact;
    
    // Partial match
    const partial = allElements.find(el =>
      el.children.length === 0 &&
      el.textContent.trim().toLowerCase().includes(optionText.toLowerCase()) &&
      el.textContent.trim().length < 50
    );
    return partial;
  };
  
  const optionEl = await waitForElement(findOption, 5000).catch(() => null);
  
  if (optionEl) {
    optionEl.click();
    console.log("Selected:", optionText);
    await sleep(500);
  } else {
    console.log("Option not found:", optionText);
  }
}

// Injected styling for status panels
const style = document.createElement("style");
style.textContent = `
  .rl-panel {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 320px;
    background: #0f0f18 !important;
    border: 1px solid #222235 !important;
    border-radius: 12px !important;
    box-shadow: 0 0 15px rgba(139, 92, 246, 0.4) !important;
    font-family: 'Inter', system-ui, sans-serif !important;
    color: #f8fafc !important;
    padding: 16px !important;
    z-index: 999999999 !important;
  }
  .rl-title {
    font-size: 13px !important;
    font-weight: 800 !important;
    text-transform: uppercase !important;
    background: linear-gradient(135deg, #8b5cf6, #06b6d4) !important;
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
    margin-bottom: 10px !important;
  }
  .rl-status {
    font-size: 11px !important;
    color: #94a3b8 !important;
    margin-bottom: 12px !important;
  }
  .rl-progress-bg {
    width: 100% !important;
    height: 6px !important;
    background: #151522 !important;
    border-radius: 3px !important;
    overflow: hidden !important;
  }
  .rl-progress-fill {
    height: 100% !important;
    width: 0%;
    background: linear-gradient(90deg, #8b5cf6, #06b6d4) !important;
    box-shadow: 0 0 6px #06b6d4 !important;
    transition: width 0.3s ease !important;
  }
  .rl-btn {
    width: 100% !important;
    padding: 8px !important;
    background: linear-gradient(135deg, #8b5cf6, #06b6d4) !important;
    color: white !important;
    border: none !important;
    border-radius: 6px !important;
    font-weight: 700 !important;
    font-size: 12px !important;
    cursor: pointer !important;
    margin-top: 10px !important;
  }
`;
document.head.appendChild(style);

let rlPanel = null;
function showPanel(title, status, progressPct) {
  if (!rlPanel) {
    rlPanel = document.createElement("div");
    rlPanel.className = "rl-panel";
    document.body.appendChild(rlPanel);
  }
  rlPanel.innerHTML = `
    <div class="rl-title">${title}</div>
    <div class="rl-status">${status}</div>
    <div class="rl-progress-bg">
      <div class="rl-progress-fill" style="width: ${progressPct}%;"></div>
    </div>
  `;
}

// THE CRITICAL FUNCTION: runPhase1() - EXACT ORDER
async function runPhase1(data) {
  try {
    if (!window.location.href.includes('/marketplace/create/item')) {
      await chrome.storage.local.set({ pendingAutofill: data });
      window.location.href = 'https://www.facebook.com/marketplace/create/item';
      return;
    }
    
    showPanel("Lister Pro: Autofill", "Initializing builder...", 5);
    console.log("[PHASE 1] Starting - EXACT ORDER: Photo → Fields → Save Draft");
    await sleep(2000); // Initial page load wait
    
    // ============================================
    // STEP 1: PHOTO UPLOAD (ABSOLUTELY FIRST)
    // ============================================
    if (data.images && data.images.length > 0) {
      showPanel("Lister Pro: Autofill", "Step 1: Injecting photo uploader...", 15);
      console.log("[STEP 1] Uploading photo...");
      
      const fileInput = await waitForElement(getFileInput, 15000).catch(() => null);
      if (fileInput) {
        const state = await chrome.storage.local.get(['bulkImageIndex']);
        let indexToPick = state.bulkImageIndex || 0;
        const targetImageBase64 = data.images[indexToPick % data.images.length];
        await chrome.storage.local.set({ bulkImageIndex: indexToPick + 1 });
        
        const file = await base64ToFile(targetImageBase64, `image_${indexToPick}.png`);
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        fileInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        console.log("[STEP 1] Waiting for photo to process...");
        showPanel("Lister Pro: Autofill", "Processing photo rendering...", 25);
        
        // Wait up to 30 seconds for the photo thumbnail to appear in Facebook's UI
        const isPhotoRendered = () => {
          // Check for common Facebook media rendering containers/thumbnails
          const imgs = [...document.querySelectorAll('img')];
          return imgs.some(img => {
            const src = img.src || '';
            const rect = img.getBoundingClientRect();
            // Look for blob URLs or small rendered preview elements in the listing panel
            return (src.startsWith('blob:') || src.includes('safe_image') || src.includes('fna')) && rect.width > 30 && rect.height > 30;
          });
        };
        
        let photoUploaded = false;
        for (let attempt = 0; attempt < 30; attempt++) {
          if (isPhotoRendered()) {
            photoUploaded = true;
            console.log("[STEP 1] Rendered photo detected!");
            break;
          }
          await sleep(1000);
        }
        
        if (!photoUploaded) {
          console.log("[STEP 1] Photo element not found in DOM yet, waiting extra 4 seconds...");
          await sleep(4000);
        } else {
          await sleep(2000); // Wait 2 more seconds to let it settle fully
        }
        console.log("[STEP 1] Photo uploaded successfully!");
      }
    }
    
    // ============================================
    // STEP 2: TITLE (After photo is done)
    // ============================================
    showPanel("Lister Pro: Autofill", "Step 2: Typing Title...", 35);
    console.log("[STEP 2] Filling title...");
    await sleep(500);
    
    let titleField = null;
    for (let i = 0; i < 5; i++) {
      titleField = getTitleField();
      if (titleField) break;
      await sleep(500);
    }
    if (!titleField) throw new Error("Title field not found");
    
    titleField.click();
    await sleep(300);
    typeIntoField(titleField, data.title);
    await sleep(800);
    
    // ============================================
    // STEP 3: PRICE (After title)
    // ============================================
    showPanel("Lister Pro: Autofill", "Step 3: Typing Price...", 45);
    console.log("[STEP 3] Filling price...");
    
    const priceField = await waitForElement(getPriceField, 8000).catch(() => null);
    if (priceField) {
      priceField.click();
      await sleep(200);
      typeIntoField(priceField, String(data.price));
      await sleep(800);
    }
    
    // ============================================
    // STEP 4: CATEGORY (After price)
    // ============================================
    if (data.category) {
      showPanel("Lister Pro: Autofill", "Step 4: Selecting Category...", 55);
      console.log("[STEP 4] Selecting category...");
      const catDD = await waitForElement(getCategoryDropdown, 8000).catch(() => null);
      if (catDD) {
        await selectDropdownOption(catDD, data.category);
      }
    }
    
    // ============================================
    // STEP 5: CONDITION (After category)
    // ============================================
    if (data.condition) {
      showPanel("Lister Pro: Autofill", "Step 5: Selecting Condition...", 65);
      console.log("[STEP 5] Selecting condition...");
      const condDD = await waitForElement(getConditionDropdown, 8000).catch(() => null);
      if (condDD) {
        await selectDropdownOption(condDD, data.condition);
      }
    }
    
    // ============================================
    // STEP 6: DESCRIPTION (After condition)
    // ============================================
    showPanel("Lister Pro: Autofill", "Step 6: Typing Description...", 75);
    console.log("[STEP 6] Filling description...");
    const descField = await waitForElement(getDescriptionField, 8000).catch(() => null);
    if (descField) {
      descField.click();
      await sleep(200);
      typeIntoField(descField, data.description);
      await sleep(800);
    }
    
    // ============================================
    // STEP 7: AVAILABILITY (After description)
    // ============================================
    if (data.availability) {
      showPanel("Lister Pro: Autofill", "Step 7: Selecting Availability...", 85);
      console.log("[STEP 7] Selecting availability...");
      const availDD = getAvailabilityDropdown();
      if (availDD) {
        await selectDropdownOption(availDD, data.availability);
      }
    }
    
    // ============================================
    // STEP 8: PRODUCT TAGS (After availability)
    // ============================================
    if (data.productTags) {
      showPanel("Lister Pro: Autofill", "Step 8: Adding Product Tags...", 90);
      console.log("[STEP 8] Adding tags...");
      const tagsField = getProductTagsInput();
      if (tagsField) {
        typeTags(tagsField, data.productTags);
        await sleep(1000);
      }
    }
    
    // ============================================
    // STEP 9: QUANTITY (After tags)
    // ============================================
    if (data.quantity && data.quantity > 1) {
      showPanel("Lister Pro: Autofill", "Step 9: Setting Quantity...", 95);
      console.log("[STEP 9] Setting quantity...");
      const qtyField = getQuantityInput();
      if (qtyField) {
        qtyField.click();
        await sleep(200);
        typeIntoField(qtyField, String(data.quantity));
        await sleep(500);
      }
    }
    
    // ============================================
    // STEP 10: SAVE DRAFT (ABSOLUTELY LAST!)
    // ============================================
    showPanel("Lister Pro: Autofill", "Step 10: Clicking Save Draft...", 98);
    console.log("[STEP 10] ALL FIELDS COMPLETE - Clicking Save Draft...");
    await sleep(1000);
    await clickSaveDraft();
    
  } catch (err) {
    console.error("[PHASE 1] ERROR:", err.message);
    showPanel("Lister Pro: Error", err.message, 100);
    chrome.runtime.sendMessage({
      action: "AUTOFILL_STATUS",
      payload: { phase: 1, status: "error", message: err.message }
    });
  }
}

async function clickSaveDraft() {
  let btn = getSaveDraftButton();
  if (!btn) {
    showPanel("Lister Pro: Save Failed", "Save Draft button not found!", 100);
    return;
  }
  btn.click();
  showPanel("Lister Pro: Saved", "Draft saved! Tab closing...", 100);
  await sleep(3000);
  chrome.runtime.sendMessage({ action: "DRAFT_SAVED" });
}

// Phase 2: Location Setter Dashboard (Selling dashboard)
async function startAutoLocation() {
  const allDrafts = [...document.querySelectorAll('a')].filter(a => 
    a.href.includes('/marketplace/edit') || a.innerText.toLowerCase().includes('resume')
  );
  
  if (allDrafts.length === 0) {
    showPanel("Auto Location AI", "No drafts detected to relocate.", 100);
    return;
  }

  showPanel("Auto Location AI", `Relocating ${allDrafts.length} drafts...`, 0);
  
  for (let i = 0; i < allDrafts.length; i++) {
    const draft = allDrafts[i];
    showPanel("Auto Location AI", `Opening draft ${i + 1}/${allDrafts.length}...`, Math.round((i / allDrafts.length) * 100));
    draft.click();
    await sleep(5000); // Wait for draft editor to load
    
    // Set location logic in draft editor
    const locField = await waitForElement(getLocationField, 10000).catch(() => null);
    if (locField) {
      const state = await chrome.storage.local.get(["listingQueue", "totalListings", "completedListings"]);
      const locations = [
        "New York, NY", "Los Angeles, CA", "Chicago, IL", "Houston, TX", "Phoenix, AZ"
      ];
      const targetLoc = locations[i % locations.length];
      
      locField.click();
      await sleep(300);
      typeIntoField(locField, targetLoc);
      await sleep(1500);
      
      const firstOption = await waitForElement(() => {
        const options = [...document.querySelectorAll('[role="option"], ul li span, div')];
        return options.find(el => {
          if (el.children.length > 0) return false;
          const txt = el.textContent.trim().toLowerCase();
          return txt.length > 0 && !txt.includes('search') && !txt.includes('location');
        });
      }, 5000).catch(() => null);
      
      if (firstOption) {
        firstOption.click();
        await sleep(1000);
      }
      
      const saveBtn = getSaveDraftButton();
      if (saveBtn) {
        saveBtn.click();
        await sleep(3000);
      }
    }
  }
  
  showPanel("Auto Location AI", "All drafts successfully relocated!", 100);
}

// Check location and run tasks
chrome.runtime.sendMessage({ action: "GET_TAB_ID" }, (res) => {
  const tabId = res?.tabId;
  const url = window.location.href;
  
  if (url.includes("/marketplace/create/item")) {
    chrome.storage.local.get("pendingAutofill", (data) => {
      if (data.pendingAutofill) {
        chrome.storage.local.remove("pendingAutofill");
        runPhase1(data.pendingAutofill);
      }
    });
  } else if (url.includes("/marketplace/you/selling")) {
    chrome.storage.local.get("currentPhase", (data) => {
      if (data.currentPhase === 2) {
        // Phase 2: Inject Auto Location Panel UI
        const panel = document.createElement("div");
        panel.className = "rl-panel";
        document.body.appendChild(panel);
        panel.innerHTML = `
          <div class="rl-title">Auto Location AI</div>
          <div class="rl-status">Ready to bulk relocate draft listings.</div>
          <button class="rl-btn" id="rl-start-loc">START AUTO LOCATION</button>
        `;
        document.getElementById("rl-start-loc").addEventListener("click", () => {
          startAutoLocation();
        });
      }
    });
  }
});
