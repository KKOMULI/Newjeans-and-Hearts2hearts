// Background service worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('Newjeans and Hearts2hearts extension installed!');
  chrome.storage.local.set({ clickCount: 0 });
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStatus') {
    sendResponse({ status: 'Extension is active' });
  }
});

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    console.log('Tab updated:', tab.url);
  }
});
