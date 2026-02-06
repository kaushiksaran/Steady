# Steady - Accessibility Extension

Steady is a Chrome extension designed to help users with motor impairments (such as tremors) navigate the web more easily. It simplifies interactions through cursor stabilization, smart zooming, and alternative input methods like head gestures and dwell clicking.

## 🚀 How to Install and Enable

To run this extension locally for judging and evaluation:

1.  **Download/Clone** this repository to your local machine.
2.  **Extract** the zipped folder (if downloaded as zip).
3.  Open Google Chrome and navigate to `chrome://extensions/`.
4.  **Enable "Developer mode"** using the toggle in the top-right corner.
5.  Click the **"Load unpacked"** button in the top-left.
6.  Select the **root folder** of this project (the one containing `manifest.json`).
7.  The **Steady icon** will appear in your toolbar. Ensure it is enabled.

> **Important:** Refresh any open tabs to allow the content scripts to inject.

---

## ✨ Features

### 1. 🖱️ Dwell Click Mode
- **Hands-free Clicking:** Automatically triggers a click when you hold the cursor still for 1.5 seconds.
- **Visual Feedback:** A loading ring shows dwell progress.
- **Stationary Support:** Works even if the mouse stops moving completely.

### 2. 🤕 Head Gesture Mode
- **Gesture Control:** Turn your head to the **right** to trigger a click.
- **Camera Integration:** Uses your webcam to track head movements (permissions required).
- **Privacy First:** Processing happens locally; no video is sent to the cloud.

### 3. 🎯 Smart Zoom & Stabilization
- **Jitter Detection:** Detects erratic mouse movements and stabilizes the cursor.
- **Auto-Zoom:** Automatically enlarges buttons and links when the cursor hovers nearby, making them easier to click.
- **Magnetism:** Gently guides the cursor toward clickable elements.

### 4. 🏠 Custom New Tab Dashboard
- **Accessible Design:** Replaces the default New Tab page with a large-button interface.
- **Quick Controls:** Change modes, open new tabs, or close tabs via the sidebar.
- **Voice Search:** Integrated voice search shortcut.
- **Universal Sync:** Mode settings persist across all open tabs and restarts.

### 5. 🛠️ Universal Sidebar
- **Always Available:** Hover the **left edge** of the screen to reveal the control menu.
- **Color-Coded Actions:**
    - 🔴 **Close Tab**
    - 🟢 **New Tab**
    - 🟡 **Voice Search**
- **Mode Switching:** Instantly toggle between Gesture, Dwell, and Disabled modes.
