// Rapid Lister Pro - Background Service Worker
// Developed by AB Rehman Malik

const USA_LOCATIONS = [
  "New York, NY", "Los Angeles, CA", "Chicago, IL", "Houston, TX", "Phoenix, AZ",
  "Philadelphia, PA", "San Antonio, TX", "San Diego, CA", "Dallas, TX", "San Jose, CA",
  "Austin, TX", "Jacksonville, FL", "Fort Worth, TX", "Columbus, OH", "Charlotte, NC",
  "Indianapolis, IN", "San Francisco, CA", "Seattle, WA", "Denver, CO", "Washington, DC",
  "Boston, MA", "El Paso, TX", "Nashville, TN", "Detroit, MI", "Oklahoma City, OK"
];

// Queue state
let listingQueue = [];
let activeTabs = new Map(); // tabId -> { index, startTime }
let completedCount = 0;
let totalToList = 0;
let isProcessing = false;
let currentBatchCount = 0;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "OPEN_TAB") {
    chrome.tabs.create({ url: message.url }, (tab) => {
      sendResponse({ status: "success", tabId: tab.id });
    });
    return true;
  }

  if (message.action === "START_BULK_LISTING") {
    const { count, payload } = message;
    totalToList = count;
    completedCount = 0;
    listingQueue = [];
    activeTabs.clear();
    isProcessing = true;

    // Build the queue
    for (let i = 0; i < count; i++) {
      const location = USA_LOCATIONS[i % USA_LOCATIONS.length];
      listingQueue.push({
        index: i,
        payload: {
          ...payload,
          location: location,
          imageIndex: i
        }
      });
    }

    // Save initial progress
    updateProgressStorage();
    
    // Start processing queue
    processNextBatch();

    sendResponse({ status: "success", total: count });
    return true;
  }

  if (message.action === "GET_BULK_PROGRESS") {
    chrome.storage.local.get(["bulkProgress"], (res) => {
      sendResponse(res.bulkProgress || { active: false });
    });
    return true;
  }

  if (message.action === "GET_TAB_ID") {
    sendResponse({ tabId: sender.tab ? sender.tab.id : null });
    return true;
  }

  if (message.action === "DRAFT_SAVED") {
    const tabId = sender.tab ? sender.tab.id : null;
    if (tabId && activeTabs.has(tabId)) {
      activeTabs.delete(tabId);
      completedCount++;
      updateProgressStorage();
      
      // Close the tab
      chrome.tabs.remove(tabId);

      // Check if current batch is done
      checkBatchCompletion();
    }
    sendResponse({ status: "acknowledged" });
    return true;
  }

  if (message.action === "CLOSE_CURRENT_TAB") {
    if (sender.tab && sender.tab.id) {
      const tabId = sender.tab.id;
      if (activeTabs.has(tabId)) {
        activeTabs.delete(tabId);
        // Note: Count it as closed/completed
        completedCount++;
        updateProgressStorage();
      }
      chrome.tabs.remove(tabId);
      checkBatchCompletion();
    }
    sendResponse({ status: "success" });
    return true;
  }

  if (message.action === "REPORT_STATUS") {
    // Forward status from tab to popup for progress bar
    chrome.runtime.sendMessage({
      action: "AUTOFILL_STATUS",
      payload: message.payload
    });
    sendResponse({ status: "ok" });
    return true;
  }
});

// Update progress in storage and notify popup
function updateProgressStorage() {
  const progress = {
    active: isProcessing,
    completed: completedCount,
    total: totalToList,
    percentage: totalToList > 0 ? Math.round((completedCount / totalToList) * 100) : 0
  };
  chrome.storage.local.set({ bulkProgress: progress });
  chrome.runtime.sendMessage({
    action: "BULK_PROGRESS_UPDATE",
    payload: progress
  });
}

// Process the next batch of up to 10 tabs
async function processNextBatch() {
  if (listingQueue.length === 0) {
    isProcessing = false;
    updateProgressStorage();
    console.log("All listing tasks completed!");
    return;
  }

  // Get up to 10 items
  const batch = listingQueue.splice(0, 10);
  currentBatchCount = batch.length;
  console.log(`Starting new batch of ${currentBatchCount} tabs...`);

  // Setup stuck tab alarm
  chrome.alarms.create("stuck_tab_cleanup", { delayInMinutes: 2 });

  for (let i = 0; i < batch.length; i++) {
    const item = batch[i];
    
    // Anti-ban: 2-second delay between opening each tab in the batch
    await new Promise(resolve => setTimeout(resolve, i * 2000));

    chrome.tabs.create({
      url: "https://www.facebook.com/marketplace/create/item",
      active: false // background tabs to save RAM
    }, (tab) => {
      activeTabs.set(tab.id, {
        index: item.index,
        startTime: Date.now(),
        payload: item.payload
      });
      
      // Save info so content script in this tab knows what to fill
      const key = `autofill_${tab.id}`;
      chrome.storage.local.set({ [key]: item.payload });
    });
  }
}

// Check if all tabs in the active batch are done
function checkBatchCompletion() {
  if (activeTabs.size === 0 && isProcessing) {
    // Clear cleanup alarm
    chrome.alarms.clear("stuck_tab_cleanup");

    if (listingQueue.length > 0) {
      console.log("Batch completed. Taking a 30-second anti-ban break...");
      // Anti-ban: 30-second break between batches
      setTimeout(() => {
        processNextBatch();
      }, 30000);
    } else {
      isProcessing = false;
      updateProgressStorage();
      console.log("All batches finished!");
    }
  }
}

// Watch for manual tab closure
chrome.tabs.onRemoved.addListener((tabId) => {
  if (activeTabs.has(tabId)) {
    activeTabs.delete(tabId);
    completedCount++;
    updateProgressStorage();
    checkBatchCompletion();
  }
});

// Stuck tabs alarm handler
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "stuck_tab_cleanup") {
    console.log("Alarm triggered: cleaning up stuck tabs...");
    const now = Date.now();
    for (const [tabId, data] of activeTabs.entries()) {
      if (now - data.startTime > 110000) { // close if running > 110 seconds
        console.warn(`Tab ${tabId} is stuck. Removing.`);
        chrome.tabs.remove(tabId);
      }
    }
  }
});
