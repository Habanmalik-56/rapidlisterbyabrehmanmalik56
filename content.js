// Updated Content Script for Lister Pro

// Helpers
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function typeIntoField(element, text) {
  element.focus();
  
  // React-compatible value setter
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
      await sleep(150);
      
      // Dispatch Enter keys to submit each tag pill
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

function waitForElement(selectorFn, timeoutMs = 10000) {
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

// Resilient Selectors
const getTitleField = () => {
  return document.querySelector('input[aria-label="Title"]') ||
         document.querySelector('input[aria-label="title" i]') ||
         document.querySelector('label[aria-label="Title"] input') ||
         [...document.querySelectorAll('input')].find(el => el.placeholder && /title/i.test(el.placeholder)) ||
         [...document.querySelectorAll('label')].find(el => /title/i.test(el.textContent))?.querySelector('input');
};

const getPriceField = () => {
  return document.querySelector('input[aria-label="Price"]') ||
         document.querySelector('input[aria-label="price" i]') ||
         document.querySelector('input[placeholder*="price" i]') ||
         [...document.querySelectorAll('input')].find(el => /price/i.test(el.placeholder)) ||
         [...document.querySelectorAll('label')].find(el => /price/i.test(el.textContent))?.querySelector('input');
};

const getCategoryDropdown = () => {
  return document.querySelector('[aria-label="Category"]') ||
         document.querySelector('[aria-label="category" i]') ||
         document.querySelector('[role="combobox"][aria-label*="Category" i]') ||
         [...document.querySelectorAll('[role="combobox"]')].find(el => /category/i.test(el.innerText || el.ariaLabel || '')) ||
         [...document.querySelectorAll('label')].find(el => /category/i.test(el.textContent))?.parentElement?.querySelector('[role="combobox"]');
};

const getConditionDropdown = () => {
  return document.querySelector('[aria-label="Condition"]') ||
         document.querySelector('[aria-label="condition" i]') ||
         document.querySelector('[role="combobox"][aria-label*="Condition" i]') ||
         [...document.querySelectorAll('[role="combobox"]')].find(el => /condition/i.test(el.innerText || el.ariaLabel || '')) ||
         [...document.querySelectorAll('label')].find(el => /condition/i.test(el.textContent))?.parentElement?.querySelector('[role="combobox"]');
};

const getDescriptionField = () => {
  return document.querySelector('textarea[aria-label="Description"]') ||
         document.querySelector('textarea[aria-label="description" i]') ||
         [...document.querySelectorAll('textarea')].find(el => /description/i.test(el.placeholder)) ||
         [...document.querySelectorAll('label')].find(el => /description/i.test(el.textContent))?.querySelector('textarea') ||
         document.querySelector('textarea');
};

const getAvailabilityDropdown = () => {
  return document.querySelector('[aria-label="Availability"]') ||
         document.querySelector('[aria-label="availability" i]') ||
         [...document.querySelectorAll('[role="combobox"]')].find(el => /availability/i.test(el.innerText || el.ariaLabel || '')) ||
         [...document.querySelectorAll('label')].find(el => /availability/i.test(el.textContent))?.parentElement?.querySelector('[role="combobox"]');
};

const getProductTagsInput = () => {
  return document.querySelector('input[aria-label="Product tags"]') ||
         document.querySelector('input[placeholder*="Product tags" i]') ||
         document.querySelector('input[aria-label="Tags"]') ||
         [...document.querySelectorAll('input')].find(el => /tags/i.test(el.placeholder || '')) ||
         [...document.querySelectorAll('label')].find(el => /tags/i.test(el.textContent))?.querySelector('input');
};

const getQuantityInput = () => {
  return document.querySelector('input[aria-label="Quantity"]') ||
         document.querySelector('input[placeholder*="quantity" i]') ||
         [...document.querySelectorAll('input')].find(el => /quantity/i.test(el.placeholder || el.ariaLabel || ''));
};

const getFileInput = () => {
  return document.querySelector('input[type="file"][multiple]') ||
         document.querySelector('input[type="file"]') ||
         document.querySelector('input[accept*="image"]');
};

const getLocationField = () => {
  return document.querySelector('input[aria-label="Location"]') ||
         document.querySelector('input[aria-label="location" i]') ||
         document.querySelector('input[placeholder*="location" i]') ||
         document.querySelector('input[placeholder*="city" i]') ||
         document.querySelector('input[placeholder*="zip" i]') ||
         [...document.querySelectorAll('input')].find(el => /location|city|zip/i.test(el.placeholder || ''));
};

const getNextButton = () => {
  return document.querySelector('[aria-label="Next"]') ||
         document.querySelector('[aria-label="Save Draft"]') ||
         [...document.querySelectorAll('[role="button"], button, span')].find(el => {
           const txt = el.textContent.trim();
           return txt === 'Next' || txt === 'Save Draft' || txt === 'Save draft' || txt === 'Save';
         });
};

const getContinueListingBtn = () => {
  return [...document.querySelectorAll('[role="button"], button, span, a')].find(el => {
    const txt = el.textContent.trim().toLowerCase();
    return txt.includes('continue listing') || txt.includes('resume') || txt.includes('draft');
  });
};

// Dropdown selector helper
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

  if (!optionEl) {
    throw new Error(`Option "${optionText}" not found in dropdown`);
  }

  optionEl.click();
  await sleep(800);
}

// Phase Processes
async function runPhase1(data) {
  try {
    if (!window.location.href.includes('/marketplace/create/item')) {
      await chrome.storage.local.set({ pendingAutofill: data });
      window.location.href = 'https://www.facebook.com/marketplace/create/item';
      return;
    }

    console.log("Starting Auto-Fill (Phase 1)...");
    
    // 1. Wait for Title
    const titleField = await waitForElement(getTitleField, 10000).catch(() => {
      throw new Error("Could not find Title field. Ensure you are logged into Facebook.");
    });
    await sleep(600);

    // 2. Click & type Title
    titleField.click();
    typeIntoField(titleField, data.title);
    await sleep(800);

    // 3. Price
    const priceField = await waitForElement(getPriceField, 5000).catch(() => {
      throw new Error("Could not find Price field.");
    });
    priceField.click();
    typeIntoField(priceField, data.price.toString());
    await sleep(800);

    // 4. Category
    if (data.category) {
      const categoryDropdown = await waitForElement(getCategoryDropdown, 5000).catch(() => {
        throw new Error("Could not find Category dropdown.");
      });
      await selectDropdownOption(categoryDropdown, data.category);
    }

    // 5. Condition
    if (data.condition) {
      const conditionDropdown = await waitForElement(getConditionDropdown, 5000).catch(() => {
        throw new Error("Could not find Condition dropdown.");
      });
      await selectDropdownOption(conditionDropdown, data.condition);
    }

    // 6. Availability
    if (data.availability) {
      const availDropdown = getAvailabilityDropdown();
      if (availDropdown) {
        await selectDropdownOption(availDropdown, data.availability);
      }
    }

    // 7. Description
    const descField = await waitForElement(getDescriptionField, 5000).catch(() => {
      throw new Error("Could not find Description textarea.");
    });
    descField.click();
    typeIntoField(descField, data.description);
    await sleep(800);

    // 8. Product Tags
    if (data.productTags) {
      const tagsField = getProductTagsInput();
      if (tagsField) {
        typeTags(tagsField, data.productTags);
        await sleep(1000);
      }
    }

    // 9. Quantity
    if (data.quantity && data.quantity > 1) {
      const qtyField = getQuantityInput();
      if (qtyField) {
        qtyField.click();
        typeIntoField(qtyField, data.quantity.toString());
        await sleep(800);
      }
    }

    // 10. Image Uploads (Automated File Injection)
    if (data.images && data.images.length > 0) {
      const fileInput = getFileInput();
      if (fileInput) {
        console.log(`Converting and uploading ${data.images.length} images...`);
        const filesToUpload = [];
        for (let i = 0; i < data.images.length; i++) {
          const file = await base64ToFile(data.images[i], `image_${i}.png`);
          filesToUpload.push(file);
        }

        const dataTransfer = new DataTransfer();
        filesToUpload.forEach(f => dataTransfer.items.add(f));
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        await sleep(2000); // Allow FB image previews to render
      }
    }

    // 11. Press next
    const nextBtn = getNextButton();
    if (nextBtn) {
      nextBtn.click();
    }

    chrome.runtime.sendMessage({ 
      action: "AUTOFILL_STATUS", 
      payload: { phase: 1, status: "done", message: "Listing data auto-filled successfully!" } 
    });

  } catch (err) {
    chrome.runtime.sendMessage({ 
      action: "AUTOFILL_STATUS", 
      payload: { phase: 1, status: "error", message: err.message } 
    });
  }
}

async function runPhase2() {
  try {
    if (!window.location.href.includes('/marketplace/create/item')) {
      await chrome.storage.local.set({ pendingResumeDraft: true });
      window.location.href = 'https://www.facebook.com/marketplace/create/item';
      return;
    }

    console.log("Detecting Draft (Phase 2)...");
    
    const resumeBtn = getContinueListingBtn();
    if (!resumeBtn) {
      throw new Error("No draft dialog or resume button found on the page.");
    }

    resumeBtn.click();
    await sleep(2000);

    const stored = await chrome.storage.local.get(['draftData']);
    const data = stored.draftData;

    if (data) {
      const titleField = getTitleField();
      if (titleField && !titleField.value) {
        typeIntoField(titleField, data.title);
        await sleep(600);
      }

      const priceField = getPriceField();
      if (priceField && !priceField.value) {
        typeIntoField(priceField, data.price.toString());
        await sleep(600);
      }

      const descField = getDescriptionField();
      if (descField && !descField.value) {
        typeIntoField(descField, data.description);
        await sleep(600);
      }
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

async function runPhase3(location) {
  try {
    console.log("Setting Location (Phase 3)...");

    const locField = await waitForElement(getLocationField, 10000).catch(() => {
      throw new Error("Location text input not found.");
    });
    await sleep(600);

    locField.click();
    typeIntoField(locField, location);
    await sleep(1500);

    const firstOption = await waitForElement(() => {
      const listOptions = [...document.querySelectorAll('[role="option"], [role="listbox"] span, ul li span, div')];
      return listOptions.find(el => {
        if (el.children.length > 0) return false;
        const txt = el.textContent.trim().toLowerCase();
        return txt.length > 0 && !txt.includes('search') && !txt.includes('location');
      });
    }, 5000).catch(() => {
      throw new Error("No suggestions matched this location.");
    });

    firstOption.click();
    await sleep(800);

    chrome.runtime.sendMessage({ 
      action: "AUTOFILL_STATUS", 
      payload: { phase: 3, status: "done", message: "Location changed successfully!" } 
    });

  } catch (err) {
    chrome.runtime.sendMessage({ 
      action: "AUTOFILL_STATUS", 
      payload: { phase: 3, status: "error", message: err.message } 
    });
  }
}

// Message listener
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

// Auto-run on load
(async () => {
  const pending = await chrome.storage.local.get(['pendingAutofill', 'pendingResumeDraft']);
  
  if (pending.pendingAutofill) {
    const data = pending.pendingAutofill;
    await chrome.storage.local.remove('pendingAutofill');
    await sleep(1500);
    runPhase1(data);
  } else if (pending.pendingResumeDraft) {
    await chrome.storage.local.remove('pendingResumeDraft');
    await sleep(1500);
    runPhase2();
  }
})();
