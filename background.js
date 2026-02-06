// Background Service Worker
chrome.runtime.onInstalled.addListener(() => {
    console.log("Steady Extension Installed");
    // Set default mode
    chrome.storage.local.set({ mode: 1 });
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_MODE') {
        chrome.storage.local.get('mode', (result) => {
            sendResponse({ mode: result.mode !== undefined ? result.mode : 1 });
        });
        return true; // Keep channel open for async response
    }

    if (message.type === 'SET_MODE') {
        chrome.storage.local.set({ mode: message.mode });
        // Broadcast to all tabs
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { type: 'MODE_CHANGE', mode: message.mode }).catch(() => { });
            });
        });
    }

    if (message.type === 'CLOSE_TAB') {
        if (sender.tab) {
            chrome.tabs.remove(sender.tab.id);
        } else {
            // Fallback for extension pages (like New Tab) where sender.tab is undefined
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) chrome.tabs.remove(tabs[0].id);
            });
        }
    }

    if (message.type === 'NEW_TAB') {
        chrome.tabs.create({ url: 'chrome://newtab' });
    }
});
