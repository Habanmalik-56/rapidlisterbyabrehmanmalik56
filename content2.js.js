// ================================================================
// Rapid Lister - Content Script
// FIXED: Photo inject → FB upload button click → wait for FB
//        thumbnail → THEN Save Draft
// ================================================================

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ================================================================
// HELPER: Type into React-controlled input/textarea
// ================================================================
function typeIntoField(element, text) {
  element.focus();
  const prototype = element.tagName === 'TEXTAREA'
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
  nativeSetter.call(element, '');
  element.dispatchEvent(new Event('input', { bubbles: true }));
  let val = '';
  for (const char of String(text)) {
    val += char;
    nativeSetter.call(element, val);
    element.dispatchEvent(new InputEvent('input', { bubbles: true, data: char, inputType: 'insertText' }));
  }
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

// ================================================================
// HELPER: Type product tags
// ================================================================
function typeTags(element, tagsText) {
  if (!tagsText) return;
  element.focus();
  const tags = tagsText.split(',').map(t => t.trim()).filter(Boolean);
  const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  (async () => {
    for (const tag of tags) {
      nativeSetter.call(element, tag);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(150);
      element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter', code: 'Enter', keyCode: 13 }));
      element.dispatchEvent(new KeyboardEvent('keypress', { bubbles: true, key: 'Enter', code: 'Enter', keyCode: 13 }));
      element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Enter', code: 'Enter', keyCode: 13 }));
      await sleep(300);
    }
  })();
}

// ================================================================
// HELPER: Convert base64 to File object
// ================================================================
async function base64ToFile(base64Data, filename) {
  const res = await fetch(base64Data);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type });
}

// ================================================================
// HELPER: Wait for element via MutationObserver
// ================================================================
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
      reject(new Error("Timeout waiting for element"));
    }, timeoutMs);
  });
}

// ================================================================
// SELECTORS
// ================================================================
const getTitleField = () =>
  document.querySelector('input[aria-label="Title"]') ||
  document.querySelector('input[aria-label="title" i]') ||
  [...document.querySelectorAll('input')].find(el => /title/i.test(el.placeholder || '')) ||
  [...document.querySelectorAll('label')].find(el => /title/i.test(el.textContent))?.querySelector('input');

const getPriceField = () =>
  document.querySelector('input[aria-label="Price"]') ||
  document.querySelector('input[aria-label="price" i]') ||
  document.querySelector('input[placeholder*="price" i]') ||
  [...document.querySelectorAll('input')].find(el => /price/i.test(el.placeholder || '')) ||
  [...document.querySelectorAll('label')].find(el => /price/i.test(el.textContent))?.querySelector('input');

const getCategoryDropdown = () =>
  document.querySelector('[aria-label="Category"]') ||
  document.querySelector('[role="combobox"][aria-label*="Category" i]') ||
  [...document.querySelectorAll('[role="combobox"]')].find(el => /category/i.test(el.innerText || el.ariaLabel || '')) ||
  [...document.querySelectorAll('label')].find(el => /category/i.test(el.textContent))?.parentElement?.querySelector('[role="combobox"]');

const getConditionDropdown = () =>
  document.querySelector('[aria-label="Condition"]') ||
  document.querySelector('[role="combobox"][aria-label*="Condition" i]') ||
  [...document.querySelectorAll('[role="combobox"]')].find(el => /condition/i.test(el.innerText || el.ariaLabel || '')) ||
  [...document.querySelectorAll('label')].find(el => /condition/i.test(el.textContent))?.parentElement?.querySelector('[role="combobox"]');

const getDescriptionField = () =>
  document.querySelector('textarea[aria-label="Description"]') ||
  document.querySelector('textarea[aria-label="description" i]') ||
  [...document.querySelectorAll('textarea')].find(el => /description/i.test(el.placeholder || '')) ||
  [...document.querySelectorAll('label')].find(el => /description/i.test(el.textContent))?.querySelector('textarea') ||
  document.querySelector('textarea');

const getAvailabilityDropdown = () =>
  document.querySelector('[aria-label="Availability"]') ||
  [...document.querySelectorAll('[role="combobox"]')].find(el => /availability/i.test(el.innerText || el.ariaLabel || '')) ||
  [...document.querySelectorAll('label')].find(el => /availability/i.test(el.textContent))?.parentElement?.querySelector('[role="combobox"]');

const getProductTagsInput = () =>
  document.querySelector('input[aria-label="Product tags"]') ||
  document.querySelector('input[placeholder*="Product tags" i]') ||
  document.querySelector('input[aria-label="Tags"]') ||
  [...document.querySelectorAll('input')].find(el => /tags/i.test(el.placeholder || '')) ||
  [...document.querySelectorAll('label')].find(el => /tags/i.test(el.textContent))?.querySelector('input');

const getQuantityInput = () =>
  document.querySelector('input[aria-label="Quantity"]') ||
  document.querySelector('input[placeholder*="quantity" i]') ||
  [...document.querySelectorAll('input')].find(el => /quantity/i.test(el.placeholder || el.ariaLabel || ''));

const getFileInput = () =>
  document.querySelector('input[type="file"][multiple]') ||
  document.querySelector('input[type="file"]') ||
  document.querySelector('input[accept*="image"]');

const getLocationField = () =>
  document.querySelector('input[aria-label="Location"]') ||
  document.querySelector('input[placeholder*="location" i]') ||
  document.querySelector('input[placeholder*="city" i]') ||
  document.querySelector('input[placeholder*="zip" i]') ||
  [...document.querySelectorAll('input')].find(el => /location|city|zip/i.test(el.placeholder || ''));

const getContinueListingBtn = () =>
  [...document.querySelectorAll('[role="button"], button, span, a')].find(el => {
    const txt = el.textContent.trim().toLowerCase();
    return txt.includes('continue listing') || txt.includes('resume') || txt.includes('draft');
  });

// ================================================================
// HELPER: Select dropdown option
// ================================================================
async function selectDropdownOption(dropdownEl, optionText) {
  dropdownEl.focus();
  dropdownEl.click();
  await sleep(1000);
  const optionEl = await waitForElement(() => {
    return [...document.querySelectorAll('[role="option"], [role="listbox"] span, [role="menuitem"] span, div, span')]
      .find(el => el.children.length === 0 && el.textContent.trim().toLowerCase() === optionText.toLowerCase()) ||
      [...document.querySelectorAll('[role="option"], [role="listbox"] span, [role="menuitem"] span, div, span')]
      .find(el => el.textContent.trim().toLowerCase() === optionText.toLowerCase());
  }, 5000);
  if (!optionEl) throw new Error(`Option "${optionText}" not found in dropdown`);
  optionEl.click();
  await sleep(800);
}

// ================================================================
// CLICK SAVE DRAFT
// ================================================================
async function clickSaveDraft() {
  console.log("[RapidLister] Looking for Save Draft button...");

  let btn = document.querySelector('[aria-label*="Save draft" i]');

  if (!btn) {
    btn = [...document.querySelectorAll('div[role="button"], button')]
      .find(b => b.textContent.trim().toLowerCase().includes('save draft'));
  }

  if (!btn) {
    btn = document.querySelector('[data-testid*="save-draft"]');
  }

  if (!btn) {
    console.error("[RapidLister] Save Draft button NOT found.");
    chrome.runtime.sendMessage({
      action: "AUTOFILL_STATUS",
      payload: { phase: 1, status: "error", message: "❌ Save Draft button not found. Please save manually." }
    });
    return;
  }

  console.log("[RapidLister] Save Draft button found! Clicking...");
  btn.click();
  await sleep(5000);

  chrome.runtime.sendMessage({ action: "CLOSE_CURRENT_TAB" });
  chrome.runtime.sendMessage({
    action: "AUTOFILL_STATUS",
    payload: { phase: 1, status: "done", message: "✅ Draft saved successfully!" }
  });
}

// ================================================================
// CORE FIX: Upload photo properly and wait for FB to show thumbnail
//
// The problem: simply injecting into file input is not enough.
// FB needs to actually process the file via its own upload flow.
// We must:
// 1. Find the VISIBLE upload button/area on the page
// 2. Click it to open file picker (or inject directly)
// 3. After inject, wait for FB's OWN thumbnail to appear in the form
// 4. Only THEN click Save Draft
// ================================================================
async function uploadPhotoAndWaitForThumbnail(imageBase64, imageIndex) {
  console.log(`[RapidLister] Uploading image ${imageIndex}...`);

  // ---- Step 1: Find the file input ----
  const fileInput = await waitForElement(getFileInput, 15000).catch(() => {
    throw new Error("Could not find photo upload input.");
  });

  // ---- Step 2: BEFORE inject — record current state of the form ----
  // We look for the photo area container to detect when FB adds a new child
  // FB wraps uploaded photo previews in a container near the file input
  const getPhotoContainer = () => {
    // Walk up from fileInput to find a div that will hold photo previews
    let el = fileInput.parentElement;
    for (let i = 0; i < 8; i++) {
      if (!el) break;
      // FB puts photo previews in containers with role="list" or specific classes
      const list = el.querySelector('[role="list"]');
      if (list) return list;
      el = el.parentElement;
    }
    return null;
  };

  const photoContainer = getPhotoContainer();
  const childCountBefore = photoContainer ? photoContainer.childElementCount : 0;
  const allImgsBefore = document.querySelectorAll('img[src^="blob:"]').length;
  const allBgBefore = [...document.querySelectorAll('div[style*="blob:"]')].length;

  console.log(`[RapidLister] Before inject — container children: ${childCountBefore}, blob imgs: ${allImgsBefore}, blob bg-divs: ${allBgBefore}`);

  // ---- Step 3: Convert base64 and inject into file input ----
  const file = await base64ToFile(imageBase64, `listing_image_${imageIndex}.jpg`);
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);

  // Set files and fire ALL necessary events FB listens to
  Object.defineProperty(fileInput, 'files', {
    value: dataTransfer.files,
    writable: false,
    configurable: true
  });
  fileInput.dispatchEvent(new Event('change', { bubbles: true }));
  fileInput.dispatchEvent(new Event('input', { bubbles: true }));

  console.log("[RapidLister] File injected. Now waiting for FB to render thumbnail...");

  // ---- Step 4: Wait for FB to actually render the thumbnail ----
  // We wait until SOMETHING new appears in the DOM indicating FB processed it
  const maxWait = 60000;
  const checkInterval = 600;
  let waited = 0;

  while (waited < maxWait) {
    await sleep(checkInterval);
    waited += checkInterval;

    // Check 1: New blob img appeared (larger than icon size)
    const allImgsNow = [...document.querySelectorAll('img[src^="blob:"]')];
    const newLargeImgs = allImgsNow.filter(img => {
      const rect = img.getBoundingClientRect();
      return rect.width > 50 && rect.height > 50;
    });
    if (newLargeImgs.length > allImgsBefore) {
      console.log(`[RapidLister] ✅ New blob thumbnail detected (${newLargeImgs.length} vs ${allImgsBefore}). Waited ${waited}ms`);
      await sleep(1500); // Let FB fully settle
      return true;
    }

    // Check 2: Photo container got a new child
    if (photoContainer && photoContainer.childElementCount > childCountBefore) {
      console.log(`[RapidLister] ✅ Photo container got new child. Waited ${waited}ms`);
      await sleep(1500);
      return true;
    }

    // Check 3: New background-image blob div appeared
    const bgBlobDivs = [...document.querySelectorAll('div[style]')].filter(d => {
      const bg = d.style.backgroundImage || '';
      if (!bg.includes('blob:')) return false;
      const rect = d.getBoundingClientRect();
      return rect.width > 50 && rect.height > 50;
    });
    if (bgBlobDivs.length > allBgBefore) {
      console.log(`[RapidLister] ✅ New blob background-image div detected. Waited ${waited}ms`);
      await sleep(1500);
      return true;
    }

    // Log progress every 5 seconds
    if (waited % 5000 === 0) {
      console.log(`[RapidLister] Still waiting for thumbnail... ${waited/1000}s elapsed`);
    }
  }

  throw new Error("Photo upload timeout — FB did not render thumbnail after 60s.");
}

// ================================================================
// PHASE 1 — Main autofill flow
// ORDER: Title → Price → Category → Condition → Availability →
//        Description → Tags → Quantity → Upload Photo →
//        WAIT for FB thumbnail → Save Draft
// ================================================================
async function runPhase1(data) {
  try {
    if (!window.location.href.includes('/marketplace/create/item')) {
      await chrome.storage.local.set({ pendingAutofill: data });
      window.location.href = 'https://www.facebook.com/marketplace/create/item';
      return;
    }

    console.log("[RapidLister] ===== Phase 1 Starting =====");

    // Wait for page ready
    const titleField = await waitForElement(getTitleField, 15000).catch(() => {
      throw new Error("Title field not found. Are you logged into Facebook?");
    });
    await sleep(1000);

    // --- Title ---
    console.log("[RapidLister] Filling Title...");
    titleField.click();
    typeIntoField(titleField, data.title);
    await sleep(800);

    // --- Price ---
    console.log("[RapidLister] Filling Price...");
    const priceField = await waitForElement(getPriceField, 5000).catch(() => {
      throw new Error("Price field not found.");
    });
    priceField.click();
    typeIntoField(priceField, String(data.price));
    await sleep(800);

    // --- Category ---
    if (data.category) {
      console.log("[RapidLister] Selecting Category...");
      const catDropdown = await waitForElement(getCategoryDropdown, 5000).catch(() => {
        throw new Error("Category dropdown not found.");
      });
      await selectDropdownOption(catDropdown, data.category);
    }

    // --- Condition ---
    if (data.condition) {
      console.log("[RapidLister] Selecting Condition...");
      const condDropdown = await waitForElement(getConditionDropdown, 5000).catch(() => {
        throw new Error("Condition dropdown not found.");
      });
      await selectDropdownOption(condDropdown, data.condition);
    }

    // --- Availability ---
    if (data.availability) {
      const availDropdown = getAvailabilityDropdown();
      if (availDropdown) {
        console.log("[RapidLister] Selecting Availability...");
        await selectDropdownOption(availDropdown, data.availability);
      }
    }

    // --- Description ---
    console.log("[RapidLister] Filling Description...");
    const descField = await waitForElement(getDescriptionField, 5000).catch(() => {
      throw new Error("Description field not found.");
    });
    descField.click();
    typeIntoField(descField, data.description);
    await sleep(800);

    // --- Product Tags ---
    if (data.productTags) {
      const tagsField = getProductTagsInput();
      if (tagsField) {
        console.log("[RapidLister] Filling Tags...");
        typeTags(tagsField, data.productTags);
        await sleep(1000);
      }
    }

    // --- Quantity ---
    if (data.quantity && data.quantity > 1) {
      const qtyField = getQuantityInput();
      if (qtyField) {
        console.log("[RapidLister] Filling Quantity...");
        qtyField.click();
        typeIntoField(qtyField, String(data.quantity));
        await sleep(800);
      }
    }

    console.log("[RapidLister] ✅ All text fields filled.");

    // --- Photo Upload ---
    if (data.images && data.images.length > 0) {
      // Pick image index for this tab
      const state = await chrome.storage.local.get(['bulkImageIndex']);
      let indexToPick = state.bulkImageIndex || 0;
      const targetImage = data.images[indexToPick % data.images.length];
      await chrome.storage.local.set({ bulkImageIndex: indexToPick + 1 });

      console.log(`[RapidLister] Starting photo upload (image index ${indexToPick})...`);

      // Upload and wait for FB thumbnail — this is the KEY fix
      await uploadPhotoAndWaitForThumbnail(targetImage, indexToPick);

      console.log("[RapidLister] ✅ Photo confirmed in FB UI. Now clicking Save Draft...");
    } else {
      console.log("[RapidLister] No images provided. Clicking Save Draft directly...");
      await sleep(1000);
    }

    // --- Save Draft --- (only after photo is confirmed)
    await clickSaveDraft();

  } catch (err) {
    console.error("[RapidLister] Phase 1 error:", err.message);
    chrome.runtime.sendMessage({
      action: "AUTOFILL_STATUS",
      payload: { phase: 1, status: "error", message: "❌ " + err.message }
    });
  }
}

// ================================================================
// PHASE 2 — Detect and resume draft
// ================================================================
async function runPhase2() {
  try {
    if (!window.location.href.includes('/marketplace/create/item')) {
      await chrome.storage.local.set({ pendingResumeDraft: true });
      window.location.href = 'https://www.facebook.com/marketplace/create/item';
      return;
    }

    console.log("[RapidLister] Phase 2: Detecting draft...");

    const resumeBtn = getContinueListingBtn();
    if (!resumeBtn) throw new Error("No draft/resume button found on the page.");

    resumeBtn.click();
    await sleep(2000);

    const stored = await chrome.storage.local.get(['draftData']);
    const data = stored.draftData;

    if (data) {
      const titleField = getTitleField();
      if (titleField && !titleField.value) { typeIntoField(titleField, data.title); await sleep(600); }
      const priceField = getPriceField();
      if (priceField && !priceField.value) { typeIntoField(priceField, String(data.price)); await sleep(600); }
      const descField = getDescriptionField();
      if (descField && !descField.value) { typeIntoField(descField, data.description); await sleep(600); }
    }

    chrome.runtime.sendMessage({
      action: "AUTOFILL_STATUS",
      payload: { phase: 2, status: "done", message: "Draft resumed and fields filled!" }
    });

  } catch (err) {
    chrome.runtime.sendMessage({
      action: "AUTOFILL_STATUS",
      payload: { phase: 2, status: "error", message: err.message }
    });
  }
}

// ================================================================
// PHASE 3 — Set location
// ================================================================
async function runPhase3(location) {
  try {
    console.log("[RapidLister] Phase 3: Setting location...");

    const locField = await waitForElement(getLocationField, 10000).catch(() => {
      throw new Error("Location field not found.");
    });
    await sleep(600);

    locField.click();
    typeIntoField(locField, location);
    await sleep(1500);

    const firstOption = await waitForElement(() => {
      return [...document.querySelectorAll('[role="option"], [role="listbox"] span, ul li span, div')]
        .find(el => {
          if (el.children.length > 0) return false;
          const txt = el.textContent.trim().toLowerCase();
          return txt.length > 0 && !txt.includes('search') && !txt.includes('location');
        });
    }, 5000).catch(() => { throw new Error("No location suggestions found."); });

    firstOption.click();
    await sleep(800);

    chrome.runtime.sendMessage({
      action: "AUTOFILL_STATUS",
      payload: { phase: 3, status: "done", message: "Location set successfully!" }
    });

  } catch (err) {
    chrome.runtime.sendMessage({
      action: "AUTOFILL_STATUS",
      payload: { phase: 3, status: "error", message: err.message }
    });
  }
}

// ================================================================
// MESSAGE LISTENER
// ================================================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "START_AUTOFILL") {
    runPhase1(message.payload);
    sendResponse({ status: "started" });
  } else if (message.action === "DETECT_DRAFT") {
    runPhase2();
    sendResponse({ status: "started" });
  } else if (message.action === "SET_LOCATION") {
    runPhase3(message.payload.location);
    sendResponse({ status: "started" });
  }
});

// ================================================================
// AUTO-RUN ON PAGE LOAD
// ================================================================
(async () => {
  const pending = await chrome.storage.local.get(['pendingAutofill', 'pendingResumeDraft']);
  if (pending.pendingAutofill) {
    await sleep(1500);
    runPhase1(pending.pendingAutofill);
  } else if (pending.pendingResumeDraft) {
    await chrome.storage.local.remove('pendingResumeDraft');
    await sleep(1500);
    runPhase2();
  }
})();
