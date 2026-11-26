# MindPulse Screen Time Companion (Phase 1)

A lightweight, privacy-first Manifest V3 browser extension for Google Chrome and Microsoft Edge (109+) that tracks your active tab's domain locally so you can understand your genuine screen time habits.

---

## Installation Steps (Load Unpacked)

Follow these steps if you have never loaded an unpacked developer extension before:

1. Open **Google Chrome** or **Microsoft Edge**.
2. Navigate to the extensions manager:
   - In Chrome: `chrome://extensions/`
   - In Edge: `edge://extensions/`
3. Turn on the **"Developer mode"** toggle (located in the top-right corner on Chrome, or in the left sidebar on Edge).
4. Click the **"Load unpacked"** button in the top toolbar.
5. In the file picker dialog, browse to and select the `browser-extension/` directory inside this repository:
   ```
   C:\Users\RAPTOR\.gemini\antigravity\scratch\social-media\browser-extension\
   ```
6. Click the extension puzzle icon in your browser toolbar and click the **Pin** icon next to **MindPulse Screen Time Companion**.
7. Browse a website for about a minute, then click the MindPulse toolbar icon to view your recorded screen time.

---

## How It Tracks

* **Active Domain Observation:** Reads only the hostname of the currently active tab (e.g. `youtube.com`, `instagram.com`).
* **Focus-Aware Pausing:** Automatically pauses tracking whenever the browser window is minimized or not in focus (e.g. when you switch to another desktop app).
* **Idle Detection:** Automatically pauses tracking when the operating system reports no keyboard or mouse activity for more than 60 seconds.
* **100% Local Storage:** Stores tracking aggregates directly in `chrome.storage.local`. In Phase 1, data is never synced to any remote server or Google Account (zero network calls, zero `fetch()` requests).
* **30-Day Auto Retention:** Records older than 30 days are automatically pruned to cap local storage footprint.
* **Zero Content Access:** The extension never inspects page contents, DOM, forms, keystrokes, cookies, browsing history, or search queries.

---

## Permissions We Ask For & Why

| Permission | Technical Need | Why It Is Safe |
| :--- | :--- | :--- |
| `tabs` | Needed to call `chrome.tabs.query({ active: true })` to identify the current tab's hostname. | Does **not** inspect page contents, cookies, or history. Only reads the URL of the focused tab. |
| `idle` | Needed to call `chrome.idle.queryState(60)` to pause time accumulation when you step away from your computer. | Prevents counting screen time when you are not actively using your computer. |
| `alarms` | Needed for `chrome.alarms` to wake the MV3 service worker periodically every 60 seconds. | Manifest V3 service workers terminate when idle; alarms ensure reliable periodic ticks without battery-draining continuous background loops. |
| `storage` | Needed to save daily domain screen time totals in `chrome.storage.local`. | Data stays strictly on your physical machine. |

**No host permissions (`<all_urls>`). No content scripts. No webRequest / webNavigation. No history. No bookmarks.**

---

## Required Manual Test Steps

Since unpacked extensions cannot run automated tests in headless terminal environments, verify the extension using these manual test steps:

1. **Initial Load:** Load `browser-extension/` via `chrome://extensions/` with Developer Mode enabled. Confirm no load errors or manifest warnings appear.
2. **First Visit Accumulation:** Open a real website (e.g. `https://wikipedia.org`), browse or keep the window active for 2 minutes.
3. **Popup Readout Verification:** Click the MindPulse extension icon in your browser toolbar. Confirm that `wikipedia.org` appears with approximately `1m 0s` to `2m 0s` elapsed.
4. **Domain Switching:** Switch to a second website (e.g. `https://github.com`), browse for 1 minute, and reopen the popup. Confirm both domains appear with individual and combined totals.
5. **Tracking Toggle Verification:** In the popup, flip the tracking toggle to OFF. Browse for 2 minutes. Reopen the popup and confirm that no additional time accumulated. Turn the toggle back ON.
6. **Browser Restart Persistence:** Close the browser completely, reopen it, and click the MindPulse icon. Confirm that today's previous screen time totals remain intact.

---

## File Structure

```
browser-extension/
  ├── manifest.json       # Manifest V3 configuration with minimal permissions
  ├── background.js      # MV3 Service worker (alarms, idle, tabs, local storage)
  ├── popup.html         # 320px wide companion popup UI
  ├── popup.css          # Paper aesthetic styling (#FBFBF9, #1F4E42, tabular nums)
  ├── popup.js           # Local storage reader and UI state renderer
  ├── README.md          # User setup and verification documentation
  └── icons/
      ├── icon-16.png    # 16x16 toolbar icon
      ├── icon-48.png    # 48x48 extensions management icon
      └── icon-128.png   # 128x128 web store / details icon
```
