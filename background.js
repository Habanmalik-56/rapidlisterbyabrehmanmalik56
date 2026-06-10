// Background script for FB Marketplace Auto Lister

// Track bulk tab IDs so we clean up pendingAutofill ONLY after ALL tabs are done
let bulkTabIds = new Set();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "OPEN_TAB") {
    chrome.tabs.create({ url: message.url }, (tab) => {
      sendResponse({ status: "success", tabId: tab.id });
    });
    return true;
  }

  if (message.action === "OPEN_BULK_TABS") {
    const { count, url, payload } = message;
    
    // Reset bulk tracking
    bulkTabIds.clear();
    
    // Store the payload for all tabs to read on load
    chrome.storage.local.set({ pendingAutofill: payload, bulkImageIndex: 0 }, () => {
      let tabsCreated = 0;
      for (let i = 0; i < count; i++) {
        chrome.tabs.create({ url: url }, (tab) => {
          bulkTabIds.add(tab.id);
          tabsCreated++;
          if (tabsCreated === count) {
            sendResponse({ status: "success", count });
          }
        });
      }
    });
    return true;
  }

  if (message.action === "GET_ACTIVE_TAB") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({ tab: tabs && tabs.length > 0 ? tabs[0] : null });
    });
    return true;
  }

  if (message.action === "CLOSE_CURRENT_TAB") {
    if (sender.tab && sender.tab.id) {
      const tabId = sender.tab.id;
      chrome.tabs.remove(tabId);
      
      // Remove from bulk tracking
      bulkTabIds.delete(tabId);
      
      // If ALL bulk tabs are now closed, clean up pendingAutofill
      if (bulkTabIds.size === 0) {
        chrome.storage.local.remove(['pendingAutofill', 'bulkImageIndex']);
        console.log("All bulk tabs closed. Cleaned up pendingAutofill.");
      }
    }
    sendResponse({ status: "success" });
    return true;
  }

  if (message.action === "SAVE_PHASE_PROGRESS") {
    chrome.storage.local.set({ phaseProgress: message.data }, () => {
      sendResponse({ status: "success" });
    });
    return true;
  }
});

// Also listen for tabs being closed externally (user manually closes them)
chrome.tabs.onRemoved.addListener((tabId) => {
  if (bulkTabIds.has(tabId)) {
    bulkTabIds.delete(tabId);
    
    if (bulkTabIds.size === 0) {
      chrome.storage.local.remove(['pendingAutofill', 'bulkImageIndex']);
      console.log("All bulk tabs closed (external). Cleaned up pendingAutofill.");
    }
  }
});
