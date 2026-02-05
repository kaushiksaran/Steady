// Popup script for mode selection
document.addEventListener('DOMContentLoaded', async () => {
    const mode1Btn = document.getElementById('mode1');
    const mode2Btn = document.getElementById('mode2');
    const statusEl = document.getElementById('status');

    // Get current mode from storage
    const { mode = 1 } = await chrome.storage.local.get('mode');
    updateUI(mode);

    // Mode 1 button click
    mode1Btn.addEventListener('click', async () => {
        await setMode(1);
    });

    // Mode 2 button click
    mode2Btn.addEventListener('click', async () => {
        await setMode(2);
    });

    async function setMode(newMode) {
        await chrome.storage.local.set({ mode: newMode });
        updateUI(newMode);

        // Send message to all tabs to update mode
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
            try {
                await chrome.tabs.sendMessage(tab.id, { type: 'MODE_CHANGE', mode: newMode });
            } catch (e) {
                // Tab might not have content script
            }
        }
    }

    function updateUI(mode) {
        mode1Btn.classList.toggle('active', mode === 1);
        mode2Btn.classList.toggle('active', mode === 2);
        statusEl.textContent = mode === 1 ? 'Using Head Gestures' : 'Using Hover to Click';
    }
});
