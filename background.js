const CONFIG = {
  BATCH_SIZE: 10,
  TAB_OPEN_DELAY: 2000,
  BATCH_BREAK: 30000,
  DRAFT_CLOSE_DELAY: 3000,
  USA_LOCATIONS: [
    "New York, NY", "Los Angeles, CA", "Chicago, IL", "Houston, TX",
    "Phoenix, AZ", "Philadelphia, PA", "San Antonio, TX", "San Diego, CA",
    "Dallas, TX", "San Jose, CA", "Austin, TX", "Jacksonville, FL",
    "Fort Worth, TX", "Columbus, OH", "Charlotte, NC", "Indianapolis, IN",
    "San Francisco, CA", "Seattle, WA", "Denver, CO", "Washington, DC",
    "Boston, MA", "El Paso, TX", "Nashville, TN", "Detroit, MI",
    "Oklahoma City, OK", "Portland, OR", "Las Vegas, NV", "Louisville, KY",
    "Baltimore, MD", "Milwaukee, WI", "Albuquerque, NM", "Tucson, AZ",
    "Fresno, CA", "Sacramento, CA", "Mesa, AZ", "Kansas City, MO",
    "Atlanta, GA", "Long Beach, CA", "Colorado Springs, CO", "Raleigh, NC"
  ]
};

let masterQueue = [];
let activeTabIds = new Set();
let completedCount = 0;
let totalCount = 0;
let isProcessing = false;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "GET_TAB_ID") {
    sendResponse({ tabId: sender.tab ? sender.tab.id : null });
    return true;
  }

  if (message.action === "START_BULK_LISTING") {
    const { count, payload } = message;
    totalCount = count;
    completedCount = 0;
    
    masterQueue = [];
    for (let i = 0; i < count; i++) {
      masterQueue.push({
        ...payload,
        location: CONFIG.USA_LOCATIONS[i % CONFIG.USA_LOCATIONS.length],
        tabIndex: i
      });
    }
    
    chrome.storage.local.set({
      listingQueue: masterQueue,
      totalListings: totalCount,
      completedListings: 0,
      currentPhase: 1
    });
    
    isProcessing = true;
    processBatches();
    
    sendResponse({ 
      status: "success", 
      totalQueued: count,
      batches: Math.ceil(count / CONFIG.BATCH_SIZE)
    });
    return true;
  }
  
  if (message.action === "DRAFT_SAVED") {
    const tabId = sender.tab?.id;
    if (tabId) {
      activeTabIds.delete(tabId);
      completedCount++;
      chrome.storage.local.set({ completedListings: completedCount });
      
      // Notify popups
      chrome.runtime.sendMessage({
        action: "BULK_PROGRESS_UPDATE",
        payload: {
          active: isProcessing,
          completed: completedCount,
          total: totalCount,
          percentage: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
        }
      });

      setTimeout(() => {
        chrome.tabs.remove(tabId).catch(() => {});
      }, CONFIG.DRAFT_CLOSE_DELAY);
    }
    sendResponse({ status: "ok" });
    return true;
  }
  
  if (message.action === "STOP_ALL") {
    isProcessing = false;
    masterQueue = [];
    activeTabIds.forEach(id => chrome.tabs.remove(id).catch(() => {}));
    activeTabIds.clear();
    chrome.storage.local.set({ currentPhase: 0 });
    sendResponse({ status: "stopped" });
    return true;
  }

  if (message.action === "GET_BULK_PROGRESS") {
    sendResponse({
      active: isProcessing,
      completed: completedCount,
      total: totalCount,
      percentage: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
    });
    return true;
  }
});

async function processBatches() {
  while (masterQueue.length > 0 && isProcessing) {
    const currentBatch = masterQueue.splice(0, CONFIG.BATCH_SIZE);
    console.log(`[BATCH] Starting ${currentBatch.length} tabs`);
    
    for (const item of currentBatch) {
      if (!isProcessing) break;
      
      await chrome.storage.local.set({ 
        pendingAutofill: item,
        currentTabIndex: item.tabIndex 
      });
      
      const tab = await chrome.tabs.create({ 
        url: "https://www.facebook.com/marketplace/create/item",
        active: false
      });
      
      activeTabIds.add(tab.id);
      await sleep(CONFIG.TAB_OPEN_DELAY);
    }
    
    // Watchdog wait loop (wait up to 5 minutes)
    let waitTime = 0;
    while (activeTabIds.size > 0 && waitTime < 300000 && isProcessing) {
      await sleep(2000);
      waitTime += 2000;
    }
    
    for (const tabId of activeTabIds) {
      chrome.tabs.remove(tabId).catch(() => {});
    }
    activeTabIds.clear();
    
    if (masterQueue.length > 0 && isProcessing) {
      console.log(`[BATCH] Break ${CONFIG.BATCH_BREAK/1000}s`);
      await sleep(CONFIG.BATCH_BREAK);
    }
  }
  
  if (isProcessing) {
    isProcessing = false;
    console.log("[ALL BATCHES COMPLETE] Starting Phase 2...");
    chrome.storage.local.set({ currentPhase: 2 });
    setTimeout(startPhase2, 5000);
  }
}

async function startPhase2() {
  const tab = await chrome.tabs.create({
    url: "https://www.facebook.com/marketplace/you/selling",
    active: true
  });
  
  setTimeout(() => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: injectAutoLocationUI
    });
  }, 5000);
}

function injectAutoLocationUI() {
  console.log("[Lister Pro] Injecting Auto Location dashboard UI");
  // The content script on the page will automatically pick up phase 2 and display it.
}
