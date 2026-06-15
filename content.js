// Rapid Lister Pro - Content Script
// Developed by AB Rehman Malik

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Inject Neon Cyberpunk Styles for Floating UIs
const styleElement = document.createElement("style");
styleElement.textContent = `
  .rl-floating-box {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 340px;
    background-color: #0f0f18 !important;
    border: 2px solid #222235 !important;
    border-radius: 12px !important;
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.4) !important;
    font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
    color: #f8fafc !important;
    z-index: 999999 !important;
    padding: 16px !important;
    box-sizing: border-box !important;
  }
  .rl-box-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #222235 !important;
    padding-bottom: 10px !important;
    margin-bottom: 12px !important;
  }
  .rl-box-title {
    font-size: 14px !important;
    font-weight: 900 !important;
    letter-spacing: 1.5px !important;
    background: linear-gradient(135deg, #8b5cf6, #06b6d4) !important;
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
    text-transform: uppercase !important;
  }
  .rl-box-tag {
    font-size: 9px !important;
    background: linear-gradient(135deg, #ef4444, #8b5cf6) !important;
    padding: 2px 6px !important;
    border-radius: 10px !important;
    color: white !important;
    font-weight: 800 !important;
  }
  .rl-status-msg {
    font-size: 12px !important;
    color: #94a3b8 !important;
    margin-bottom: 12px !important;
    line-height: 1.5 !important;
  }
  .rl-step-list {
    list-style: none !important;
    padding: 0 !important;
    margin: 0 0 14px 0 !important;
  }
  .rl-step-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px !important;
    color: #94a3b8 !important;
    margin-bottom: 6px !important;
    text-transform: uppercase;
  }
  .rl-step-item.active {
    color: #06b6d4 !important;
    font-weight: bold !important;
  }
  .rl-step-item.done {
    color: #8b5cf6 !important;
  }
  .rl-step-bullet {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #222235;
  }
  .rl-step-item.active .rl-step-bullet {
    background-color: #06b6d4 !important;
    box-shadow: 0 0 6px #06b6d4 !important;
  }
  .rl-step-item.done .rl-step-bullet {
    background-color: #8b5cf6 !important;
    box-shadow: 0 0 6px #8b5cf6 !important;
  }
  .rl-progress-container {
    margin-top: 10px !important;
  }
  .rl-progress-bar-bg {
    width: 100% !important;
    height: 6px !important;
    background-color: #151522 !important;
    border-radius: 3px !important;
    overflow: hidden !important;
  }
  .rl-progress-bar-fill {
    height: 100% !important;
    width: 0%;
    background: linear-gradient(90deg, #8b5cf6, #06b6d4) !important;
    box-shadow: 0 0 8px #06b6d4 !important;
    transition: width 0.3s ease !important;
  }
  .rl-btn {
    width: 100% !important;
    padding: 8px 12px !important;
    background: linear-gradient(135deg, #8b5cf6, #06b6d4) !important;
    color: white !important;
    border: none !important;
    border-radius: 6px !important;
    font-size: 12px !important;
    font-weight: 700 !important;
    cursor: pointer !important;
    text-align: center !important;
    box-shadow: 0 0 10px rgba(139, 92, 246, 0.3) !important;
    transition: all 0.2s ease !important;
  }
  .rl-btn:hover {
    filter: brightness(1.1) !important;
    box-shadow: 0 0 15px rgba(6, 182, 212, 0.5) !important;
  }
`;
document.head.appendChild(styleElement);

// UI Global Variables
let floatingUIBox = null;

function updateFloatingBox(title, message, progressPct, steps = [], activeStepIndex = -1) {
  if (!floatingUIBox) {
    floatingUIBox = document.createElement("div");
    floatingUIBox.className = "rl-floating-box";
    document.body.appendChild(floatingUIBox);
  }

  let stepsHtml = "";
  if (steps.length > 0) {
    stepsHtml = `<ul class="rl-step-list">`;
    steps.forEach((step, idx) => {
      let stateClass = "";
      if (idx < activeStepIndex) stateClass = "done";
      else if (idx === activeStepIndex) stateClass = "active";
      stepsHtml += `
        <li class="rl-step-item ${stateClass}">
          <span class="rl-step-bullet"></span>
          ${step}
        </li>`;
    });
    stepsHtml += `</ul>`;
  }

  floatingUIBox.innerHTML = `
    <div class="rl-box-header">
      <span class="rl-box-title">${title}</span>
      <span class="rl-box-tag">PRO</span>
    </div>
    <div class="rl-status-msg">${message}</div>
    ${stepsHtml}
    <div class="rl-progress-container">
      <div class="rl-progress-bar-bg">
        <div class="rl-progress-bar-fill" style="width: ${progressPct}%;"></div>
      </div>
    </div>
  `;
}

// React-compatible field filling
function typeIntoField(element, text) {
  element.focus();
  const prototype = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
  
  nativeInputValueSetter.call(element, '');
  element.dispatchEvent(new Event('input', { bubbles: true }));
  
  let currentVal = '';
  for (const char of text) {
    currentVal += char;
    nativeInputValueSetter.call(element, currentVal);
    element.dispatchEvent(new InputEvent('input', { bubbles: true, data: char, inputType: 'insertText' }));
  }
  
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

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

async function base64ToFile(base64Data, filename) {
  const res = await fetch(base64Data);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type });
}

function waitForElement(selectorFn, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const el = selectorFn();
    if (el) return resolve(el);

    const observer = new MutationObserver(() => {
      const el = selectorFn();
      if (el) {
        observer.disconnect();
        clearTimeout(timeout);
        resolve(el);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    const timeout = setTimeout(() => {
      observer.disconnect();
      reject(new Error("Timeout waiting for element"));
    }, timeoutMs);
  });
}

// Dom Selectors
const getTitleField = () => document.querySelector('input[aria-label="Title"]') || document.querySelector('label[aria-label="Title"] input') || [...document.querySelectorAll('input')].find(el => el.placeholder && /title/i.test(el.placeholder));
const getPriceField = () => document.querySelector('input[aria-label="Price"]') || [...document.querySelectorAll('input')].find(el => /price/i.test(el.placeholder));
const getCategoryDropdown = () => document.querySelector('[aria-label="Category"]') || document.querySelector('[role="combobox"][aria-label*="Category" i]') || [...document.querySelectorAll('[role="combobox"]')].find(el => /category/i.test(el.innerText || ''));
const getConditionDropdown = () => document.querySelector('[aria-label="Condition"]') || document.querySelector('[role="combobox"][aria-label*="Condition" i]') || [...document.querySelectorAll('[role="combobox"]')].find(el => /condition/i.test(el.innerText || ''));
const getDescriptionField = () => document.querySelector('textarea[aria-label="Description"]') || document.querySelector('textarea');
const getAvailabilityDropdown = () => document.querySelector('[aria-label="Availability"]') || [...document.querySelectorAll('[role="combobox"]')].find(el => /availability/i.test(el.innerText || ''));
const getProductTagsInput = () => document.querySelector('input[aria-label="Product tags"]') || [...document.querySelectorAll('input')].find(el => /tags/i.test(el.placeholder || ''));
const getQuantityInput = () => document.querySelector('input[aria-label="Quantity"]') || [...document.querySelectorAll('input')].find(el => /quantity/i.test(el.placeholder || ''));
const getFileInput = () => document.querySelector('input[type="file"][multiple]') || document.querySelector('input[type="file"]');
const getLocationField = () => document.querySelector('input[aria-label="Location"]') || document.querySelector('input[placeholder*="location" i]') || document.querySelector('input[placeholder*="city" i]') || [...document.querySelectorAll('input')].find(el => /location|city/i.test(el.placeholder || ''));

// Dropdown Helper
async function selectDropdownOption(dropdownEl, optionText) {
  dropdownEl.focus();
  dropdownEl.click();
  await sleep(600);
  const optionEl = await waitForElement(() => {
    return [...document.querySelectorAll('[role="option"], [role="listbox"] span, [role="menuitem"] span, div, span')]
      .find(el => el.children.length === 0 && el.textContent.trim().toLowerCase() === optionText.toLowerCase()) ||
      [...document.querySelectorAll('[role="option"], [role="listbox"] span, [role="menuitem"] span, div, span')]
      .find(el => el.textContent.trim().toLowerCase() === optionText.toLowerCase());
  }, 4000);

  if (optionEl) {
    optionEl.click();
    await sleep(600);
  }
}

// Detect Photo
function isPhotoUploaded() {
  return !!(document.querySelector('img[src^="blob:"]') || document.querySelector('img[src*="scontent"]') || document.querySelector('div[style*="blob:"]'));
}

// Click Save Draft
async function clickSaveDraft() {
  let btn = document.querySelector('[aria-label*="Save draft" i]') || 
            [...document.querySelectorAll('div[role="button"], button')].find(b => b.textContent.trim().toLowerCase().includes('save draft')) ||
            document.querySelector('[data-testid*="save-draft"]');

  if (!btn) {
    console.error("Save Draft button not found.");
    return false;
  }
  btn.click();
  return true;
}

// Phase 3: Set Location
async function runPhase3(location) {
  try {
    const locField = await waitForElement(getLocationField, 10000);
    locField.click();
    await sleep(400);
    typeIntoField(locField, location);
    await sleep(1500);

    const firstOption = await waitForElement(() => {
      const listOptions = [...document.querySelectorAll('[role="option"], [role="listbox"] span, ul li span, div')];
      return listOptions.find(el => {
        if (el.children.length > 0) return false;
        const txt = el.textContent.trim().toLowerCase();
        return txt.length > 0 && !txt.includes('search') && !txt.includes('location');
      });
    }, 5000);

    firstOption.click();
    await sleep(600);
    return true;
  } catch (err) {
    console.error("Error setting location:", err);
    return false;
  }
}

// Phase 1: Autofill Workflow
async function runPhase1(data) {
  const steps = ["Photo Upload", "Text Fields", "Dropdowns", "Location", "Save Draft"];
  updateFloatingBox("Lister Pro: AI Auto-Filling", "Starting Phase 1 Autofill...", 10, steps, 0);
  
  try {
    await sleep(1500);

    // 1. Photo First
    if (data.images && data.images.length > 0) {
      updateFloatingBox("Lister Pro: AI Auto-Filling", "Uploading listing image...", 20, steps, 0);
      const fileInput = await waitForElement(getFileInput, 15000);
      
      let indexToPick = data.imageIndex !== undefined ? data.imageIndex : 0;
      const targetImageBase64 = data.images[indexToPick % data.images.length];
      
      const file = await base64ToFile(targetImageBase64, `image_${indexToPick}.png`);
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));

      // Wait for photo preview to be visible in DOM
      let photoCheck = 0;
      while (photoCheck < 15 && !isPhotoUploaded()) {
        await sleep(600);
        photoCheck++;
      }
      await sleep(1500); // short stabilization delay
    }

    // 2. Text Fields
    updateFloatingBox("Lister Pro: AI Auto-Filling", "Filling title, price & description...", 40, steps, 1);
    const titleField = await waitForElement(getTitleField, 10000);
    typeIntoField(titleField, data.title);
    await sleep(300);

    const priceField = await waitForElement(getPriceField, 5000);
    typeIntoField(priceField, data.price.toString());
    await sleep(300);

    const descField = await waitForElement(getDescriptionField, 5000);
    typeIntoField(descField, data.description);
    await sleep(400);

    // 3. Dropdowns
    updateFloatingBox("Lister Pro: AI Auto-Filling", "Applying categories & conditions...", 60, steps, 2);
    if (data.category) {
      const catDropdown = await waitForElement(getCategoryDropdown, 5000);
      await selectDropdownOption(catDropdown, data.category);
    }
    if (data.condition) {
      const condDropdown = await waitForElement(getConditionDropdown, 5000);
      await selectDropdownOption(condDropdown, data.condition);
    }
    if (data.availability) {
      const availDropdown = getAvailabilityDropdown();
      if (availDropdown) await selectDropdownOption(availDropdown, data.availability);
    }
    if (data.productTags) {
      const tagsField = getProductTagsInput();
      if (tagsField) {
        typeTags(tagsField, data.productTags);
        await sleep(800);
      }
    }
    if (data.quantity && data.quantity > 1) {
      const qtyField = getQuantityInput();
      if (qtyField) typeIntoField(qtyField, data.quantity.toString());
    }

    // 4. Location
    updateFloatingBox("Lister Pro: AI Auto-Filling", `Setting location to ${data.location || "Default US"}...`, 80, steps, 3);
    if (data.location) {
      await runPhase3(data.location);
    }

    // 5. Save Draft
    // Show AI Publish box after location
    const antiBanDelay = Math.floor(Math.random() * 5000) + 5000; // 5-10 second random delay
    let countdown = antiBanDelay / 1000;
    
    while (countdown > 0) {
      updateFloatingBox("Lister Pro: AI Publish", `Auto-saving draft in ${countdown.toFixed(1)}s (Anti-Ban delay)...`, 90, steps, 4);
      await sleep(500);
      countdown -= 0.5;
    }

    updateFloatingBox("Lister Pro: AI Publish", "Saving Draft and closing...", 98, steps, 4);
    const saveOk = await clickSaveDraft();
    if (saveOk) {
      await sleep(3000);
      chrome.runtime.sendMessage({ action: "DRAFT_SAVED" });
    } else {
      updateFloatingBox("Lister Pro: Save Failed", "Please click Save Draft manually.", 100, steps, 4);
      chrome.runtime.sendMessage({
        action: "REPORT_STATUS",
        payload: { phase: 1, status: "error", message: "Save Draft button missing!" }
      });
    }

  } catch (err) {
    updateFloatingBox("Lister Pro: Error", err.message, 100, steps, -1);
    chrome.runtime.sendMessage({
      action: "REPORT_STATUS",
      payload: { phase: 1, status: "error", message: err.message }
    });
  }
}

// Init Content script
chrome.runtime.sendMessage({ action: "GET_TAB_ID" }, (res) => {
  const tabId = res ? res.tabId : null;
  if (!tabId) return;

  const url = window.location.href;
  
  if (url.includes("/marketplace/create/item")) {
    const key = `autofill_${tabId}`;
    chrome.storage.local.get([key, "pendingAutofill"], (data) => {
      // Priority 1: Batch payload for this tab
      if (data[key]) {
        const payload = data[key];
        chrome.storage.local.remove(key); // clean up
        runPhase1(payload);
      }
      // Priority 2: Single tab pending autofill
      else if (data.pendingAutofill) {
        const payload = data.pendingAutofill;
        chrome.storage.local.remove("pendingAutofill");
        runPhase1(payload);
      }
    });
  } else if (url.includes("/marketplace/selling")) {
    // Inject Auto Location AI box on selling page
    updateFloatingBox(
      "Auto Location AI",
      "Monitoring Selling dashboard. Rapid Lister Pro is active and ready.",
      100
    );
    
    // Add custom buttons or instructions inside selling dashboard box
    if (floatingUIBox) {
      const container = document.createElement("div");
      container.style.marginTop = "12px";
      container.innerHTML = `
        <button class="rl-btn" id="rl-create-btn">⚡ Create New Listing</button>
      `;
      floatingUIBox.appendChild(container);
      
      document.getElementById("rl-create-btn").addEventListener("click", () => {
        window.location.href = "https://www.facebook.com/marketplace/create/item";
      });
    }
  }
});

// Listener for manual commands from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "START_AUTOFILL") {
    runPhase1(message.payload);
    sendResponse({ status: "started" });
  } else if (message.action === "SET_LOCATION") {
    runPhase3(message.payload.location).then(ok => {
      sendResponse({ status: ok ? "success" : "failed" });
    });
    return true;
  }
});
