// Background script for FB Marketplace Auto Lister

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "OPEN_TAB") {
    chrome.tabs.create({ url: message.url }, (tab) => {
      sendResponse({ status: "success", tabId: tab.id });
    });
    return true; // Keeps the messaging channel open for asynchronous reply
  }

  if (message.action === "OPEN_BULK_TABS") {
    const { count, url, payload } = message;
    
    // Store the payload for the pending tabs
    chrome.storage.local.set({ pendingAutofill: payload }, () => {
      for (let i = 0; i < count; i++) {
        chrome.tabs.create({ url: url });
      }
      sendResponse({ status: "success", count });
    });
    return true;
  }

  if (message.action === "GET_ACTIVE_TAB") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({ tab: tabs && tabs.length > 0 ? tabs[0] : null });
    });
    return true;
  }

  if (message.action === "SAVE_PHASE_PROGRESS") {
    chrome.storage.local.set({ phaseProgress: message.data }, () => {
      sendResponse({ status: "success" });
    });
    return true;
  }
});
