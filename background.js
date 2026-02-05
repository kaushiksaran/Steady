// Background Service Worker
chrome.runtime.onInstalled.addListener(() => {
    console.log("Stability Assist Installed");
    // Set default mode
    chrome.storage.local.set({ mode: 1 });
});

// Listen for mode changes and relay to content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_MODE') {
        chrome.storage.local.get('mode', (result) => {
            sendResponse({ mode: result.mode || 1 });
        });
        return true; // Keep channel open for async response
    }
});
