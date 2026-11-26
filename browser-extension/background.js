/**
 * MindPulse Screen Time Companion - Background Service Worker (MV3)
 * Tracks the active tab's domain locally, syncs with MindPulse backend ingest,
 * and delivers calm, bounded screen time notifications.
 */

const ALARM_NAME = 'tick';
const SYNC_ALARM_NAME = 'sync';
const RETENTION_DAYS = 30;
const MIND_PULSE_API_BASE = 'http://127.0.0.1:8000';
const MIND_PULSE_APP_URL = 'http://127.0.0.1:5173';

const DEFAULT_NOTIFICATION_SETTINGS = {
  siteThresholdMinutes: 45,        // 30 | 45 | 60 | 90 | 0 (0 = disabled)
  dailyThresholdMinutes: 180,       // 120 | 180 | 240 | 300 | 0 (0 = disabled)
  behavioralEnabled: false,         // opt-in
  behavioralOpensPerHour: 10,       // fixed at 10, not user-configurable
  quietHoursStart: '22:00',         // 24h format
  quietHoursEnd: '08:00',           // 24h format
  quietHoursEnabled: true
};

let isProcessing = false;
let pendingRun = false;

// Module-level deduplication state (survives across events during a session)
let lastOpenedHostname = null;
let lastOpenedAt = 0;
const DEDUPE_WINDOW_MS = 30_000; // 30s dedupe window to prevent inflated open counts

/**
 * Returns today's date formatted as YYYY-MM-DD in the local timezone.
 * @param {Date} date
 * @returns {string}
 */
function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function clearTodaysNotificationOpens() {
  try {
    const today = getLocalDateString();
    const data = await chrome.storage.local.get(['notification_opens']);
    const opens = data.notification_opens || {};
    if (opens[today]) {
      delete opens[today];
      await chrome.storage.local.set({ notification_opens: opens });
      console.log('[MindPulse Companion] Cleared stale Type C data for', today);
    }
  } catch (err) {
    console.error('[MindPulse Companion] Failed to clear stale opens:', err);
  }
}

/**
 * Validates whether a hostname should be tracked.
 * Filters out localhost, private IP addresses, loopbacks, and dotless names.
 * @param {string} hostname
 * @returns {boolean}
 */
function isTrackableHostname(hostname) {
  if (!hostname) return false;
  // Reject localhost, loopback, and private IPs — dev environments, not real screen time
  const privatePatterns = [
    /^localhost$/i,
    /^127\.\d+\.\d+\.\d+$/,
    /^0\.0\.0\.0$/,
    /^10\.\d+\.\d+\.\d+$/,
    /^192\.168\.\d+\.\d+$/,
    /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/,
    /^\[::1\]$/,
    /^::1$/,
    /\.local$/i,
    /^.*\.localhost$/i,
  ];
  for (const p of privatePatterns) {
    if (p.test(hostname)) return false;
  }
  // Reject hostnames without a dot
  if (!hostname.includes('.')) return false;
  return true;
}

/**
 * Normalizes URL and extracts clean hostname.
 * Strips "www." and rejects browser-internal / file / non-web schemes.
 * @param {string} urlString
 * @returns {string|null}
 */
function cleanHostname(urlString) {
  if (!urlString || typeof urlString !== 'string') return null;
  try {
    const parsed = new URL(urlString);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    let hostname = parsed.hostname.toLowerCase();
    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4);
    }
    hostname = hostname.trim();
    if (!isTrackableHostname(hostname)) {
      return null;
    }
    return hostname.length > 0 ? hostname : null;
  } catch {
    return null;
  }
}

/**
 * Extracts the base domain from a hostname (e.g. drive.google.com -> google.com, news.bbc.co.uk -> bbc.co.uk).
 * Handles multi-part country code TLDs.
 * @param {string} hostname
 * @returns {string|null}
 */
function getBaseDomain(hostname) {
  if (!hostname) return null;
  let h = hostname.toLowerCase().replace(/^www\./, '');
  const parts = h.split('.');
  if (parts.length <= 2) return h;
  const twoPartTlds = ['co.uk','co.jp','co.in','co.nz','co.za','com.au','com.br','com.mx','com.tr','com.pk','com.sg','com.hk','co.kr','co.id','com.ar','com.tw','co.il','com.cn'];
  const lastTwo = parts.slice(-2).join('.');
  if (twoPartTlds.includes(lastTwo) && parts.length >= 3) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
}

/**
 * Checks idle state and retrieves the currently focused tab's hostname.
 * Returns null if user is idle, locked, or no focused window/active web tab exists.
 * @param {number} idleThreshold
 * @returns {Promise<string|null>}
 */
async function getActiveTabHostname(idleThreshold = 60) {
  try {
    const state = await chrome.idle.queryState(idleThreshold);
    if (state === 'idle' || state === 'locked') {
      return null;
    }

    const focusedWindow = await chrome.windows.getLastFocused({ populate: false }).catch(() => null);
    if (!focusedWindow || !focusedWindow.focused || focusedWindow.id === undefined) {
      return null;
    }

    const tabs = await chrome.tabs.query({ active: true, windowId: focusedWindow.id }).catch(() => []);
    if (!tabs || tabs.length === 0 || !tabs[0].url) {
      return null;
    }

    return cleanHostname(tabs[0].url);
  } catch {
    return null;
  }
}

/**
 * Removes records older than RETENTION_DAYS from screen_time storage.
 * @param {Record<string, Record<string, number>>} screenTime
 * @returns {boolean} True if any keys were pruned
 */
function pruneOldEntries(screenTime) {
  if (!screenTime || typeof screenTime !== 'object') return false;
  const dates = Object.keys(screenTime);
  if (dates.length === 0) return false;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cutoffStr = getLocalDateString(cutoff);

  let pruned = false;
  for (const dateKey of dates) {
    if (dateKey < cutoffStr) {
      delete screenTime[dateKey];
      pruned = true;
    }
  }
  return pruned;
}

/**
 * Prunes notification data older than 3 days.
 * @param {Record<string, any>} log
 * @param {Record<string, any>} dismissals
 * @param {Record<string, any>} opens
 * @returns {boolean} True if any keys were pruned
 */
function pruneNotificationData(log, dismissals, opens) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 3);
  const cutoffStr = getLocalDateString(cutoff);
  let pruned = false;

  const pruneDict = (dict) => {
    if (!dict || typeof dict !== 'object') return;
    for (const dateKey of Object.keys(dict)) {
      if (dateKey < cutoffStr) {
        delete dict[dateKey];
        pruned = true;
      }
    }
  };

  pruneDict(log);
  pruneDict(dismissals);
  pruneDict(opens);
  return pruned;
}

/**
 * Checks whether current local time falls into quiet hours.
 * Handles overnight span (e.g. 22:00 to 08:00).
 * @param {string} startStr
 * @param {string} endStr
 * @returns {boolean}
 */
function isQuietHours(startStr, endStr) {
  if (!startStr || !endStr) return false;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = startStr.split(':').map(Number);
  const [endH, endM] = endStr.split(':').map(Number);
  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return false;
  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;
  if (startTotal <= endTotal) {
    return currentMinutes >= startTotal && currentMinutes < endTotal;
  } else {
    // Overnight span (e.g. 22:00 to 08:00)
    return currentMinutes >= startTotal || currentMinutes < endTotal;
  }
}

/**
 * Records domain open timestamp for behavioral pattern detection.
 * Deduplicated with a 30-second window across events and sessions,
 * aggregated at the base-domain level (e.g. drive.google.com -> google.com),
 * and capped at 200 entries per domain per day.
 * @param {string} hostname
 */
async function recordDomainOpen(hostname) {
  if (!hostname || !isTrackableHostname(hostname)) return;
  const targetDomain = getBaseDomain(hostname) || hostname;
  const now = Date.now();

  // In-memory dedupe check within DEDUPE_WINDOW_MS
  if (targetDomain === lastOpenedHostname && (now - lastOpenedAt) < DEDUPE_WINDOW_MS) {
    return;
  }

  try {
    const today = getLocalDateString();
    const data = await chrome.storage.local.get(['notification_opens']);
    const opens = data.notification_opens || {};
    if (!opens[today]) opens[today] = {};
    if (!Array.isArray(opens[today][targetDomain])) {
      opens[today][targetDomain] = [];
    }

    // Secondary check against last stored timestamp (protects against SW restarts)
    const timestamps = opens[today][targetDomain];
    if (timestamps.length > 0) {
      const lastRecorded = timestamps[timestamps.length - 1];
      if ((now - lastRecorded) < DEDUPE_WINDOW_MS) {
        lastOpenedHostname = targetDomain;
        lastOpenedAt = now;
        return;
      }
    }

    lastOpenedHostname = targetDomain;
    lastOpenedAt = now;

    timestamps.push(now);
    if (timestamps.length > 200) {
      opens[today][targetDomain] = timestamps.slice(-200);
    }
    await chrome.storage.local.set({ notification_opens: opens });
  } catch (err) {
    console.error('[MindPulse Companion] Failed to record open:', err);
  }
}

globalThis.recordDomainOpen = recordDomainOpen;
globalThis.getBaseDomain = getBaseDomain;
globalThis.getLocalDateString = getLocalDateString;
globalThis.clearTodaysNotificationOpens = clearTodaysNotificationOpens;

/**
 * Evaluates thresholds and triggers notifications if criteria are met.
 * Strictly respects quiet hours, window focus, idle state, and per-day deduplication.
 */
async function evaluateNotifications() {
  try {
    const data = await chrome.storage.local.get([
      'screen_time',
      'notification_settings',
      'notification_log',
      'notification_dismissals',
      'notification_opens'
    ]);

    const settings = Object.assign({}, DEFAULT_NOTIFICATION_SETTINGS, data.notification_settings);
    const today = getLocalDateString();
    const todayScreenTime = (data.screen_time && data.screen_time[today]) || {};
    const log = data.notification_log || {};
    if (!log[today]) log[today] = {};
    const dismissals = data.notification_dismissals || {};
    if (!dismissals[today]) dismissals[today] = {};
    const opens = data.notification_opens || {};
    if (!opens[today]) opens[today] = {};

    let storageModified = pruneNotificationData(log, dismissals, opens);

    // 1. Quiet hours check
    if (settings.quietHoursEnabled && isQuietHours(settings.quietHoursStart, settings.quietHoursEnd)) {
      if (storageModified) {
        await chrome.storage.local.set({
          notification_log: log,
          notification_dismissals: dismissals,
          notification_opens: opens
        });
      }
      return;
    }

    // 2. Focus check: browser must be currently focused
    const focusedWindow = await chrome.windows.getLastFocused({ populate: false }).catch(() => null);
    if (!focusedWindow || !focusedWindow.focused || focusedWindow.id === undefined) {
      if (storageModified) {
        await chrome.storage.local.set({
          notification_log: log,
          notification_dismissals: dismissals,
          notification_opens: opens
        });
      }
      return;
    }

    // 3. Idle check: user must not be idle or locked
    const idleState = await chrome.idle.queryState(60).catch(() => 'unknown');
    if (idleState === 'idle' || idleState === 'locked') {
      if (storageModified) {
        await chrome.storage.local.set({
          notification_log: log,
          notification_dismissals: dismissals,
          notification_opens: opens
        });
      }
      return;
    }

    const nowIso = new Date().toISOString();

    // 4. Type A — Single-site threshold
    const siteThresholdMin = Number(settings.siteThresholdMinutes) || 0;
    if (siteThresholdMin > 0) {
      for (const [domain, seconds] of Object.entries(todayScreenTime)) {
        if (!isTrackableHostname(domain)) continue;
        const minutes = Math.floor(seconds / 60);
        if (minutes >= siteThresholdMin) {
          const key = `${domain}:site`;
          const alreadyFired = Boolean(log[today][key]);
          const dismissed = Boolean(dismissals[today][domain]);
          if (!alreadyFired && !dismissed) {
            chrome.notifications.create(`mindpulse-site-${domain}-${Date.now()}`, {
              type: 'basic',
              iconUrl: 'icons/icon-128-notification.png',
              title: 'MindPulse Screen Time',
              message: `You've been on ${domain} for ${minutes} minutes today. Tap to see where the rest went.`,
              priority: 0,
              requireInteraction: false,
              silent: false,
              buttons: [
                { title: 'View breakdown' },
                { title: 'Dismiss for today' }
              ]
            });
            log[today][key] = nowIso;
            storageModified = true;
            break; // Fire at most one notification per evaluation pass to remain quiet
          }
        }
      }
    }

    // 5. Type B — Daily total threshold
    const dailyThresholdMin = Number(settings.dailyThresholdMinutes) || 0;
    if (dailyThresholdMin > 0) {
      let totalSeconds = 0;
      let siteCount = 0;
      for (const [domain, seconds] of Object.entries(todayScreenTime)) {
        if (isTrackableHostname(domain) && seconds > 0) {
          totalSeconds += seconds;
          siteCount += 1;
        }
      }
      const totalMinutes = Math.floor(totalSeconds / 60);
      if (totalMinutes >= dailyThresholdMin) {
        const alreadyFired = Boolean(log[today]['daily']);
        const dismissed = Boolean(dismissals[today]['daily']);
        if (!alreadyFired && !dismissed) {
          const hours = (totalMinutes / 60).toFixed(1).replace('.0', '');
          chrome.notifications.create(`mindpulse-daily-daily-${Date.now()}`, {
            type: 'basic',
            iconUrl: 'icons/icon-128-notification.png',
            title: 'MindPulse Screen Time',
            message: `You've spent ${hours} hours on screens today across ${siteCount} ${siteCount === 1 ? 'site' : 'sites'}. Tap to see the breakdown.`,
            priority: 0,
            requireInteraction: false,
            silent: false,
            buttons: [
              { title: 'View breakdown' },
              { title: 'Dismiss for today' }
            ]
          });
          log[today]['daily'] = nowIso;
          storageModified = true;
        }
      }
    }

    // 6. Type C — Behavioral pattern (opt-in)
    if (settings.behavioralEnabled) {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const opensToday = opens[today] || {};
      for (const [domain, timestamps] of Object.entries(opensToday)) {
        if (!isTrackableHostname(domain) || !Array.isArray(timestamps)) continue;
        const recentCount = timestamps.filter(ts => ts >= oneHourAgo).length;
        if (recentCount >= (settings.behavioralOpensPerHour || 10)) {
          const key = `${domain}:behavioral`;
          const alreadyFired = Boolean(log[today][key]);
          const dismissed = Boolean(dismissals[today][domain]);
          if (!alreadyFired && !dismissed) {
            chrome.notifications.create(`mindpulse-behavioral-${domain}-${Date.now()}`, {
              type: 'basic',
              iconUrl: 'icons/icon-128-notification.png',
              title: 'MindPulse Screen Time',
              message: `You've opened ${domain} ${recentCount} times in the last hour. Tap for a gentle nudge.`,
              priority: 0,
              requireInteraction: false,
              silent: false,
              buttons: [
                { title: 'See tips' },
                { title: 'Dismiss for today' }
              ]
            });
            log[today][key] = nowIso;
            storageModified = true;
            break;
          }
        }
      }
    }

    if (storageModified) {
      await chrome.storage.local.set({
        notification_log: log,
        notification_dismissals: dismissals,
        notification_opens: opens
      });
    }
  } catch (err) {
    console.error('[MindPulse Companion] Notification evaluation error:', err);
  }
}

/**
 * Parses target domain or 'daily' from notification ID string.
 * @param {string} notificationId
 * @returns {{type: string, target: string}|null}
 */
function extractTargetFromId(notificationId) {
  if (!notificationId || typeof notificationId !== 'string' || !notificationId.startsWith('mindpulse-')) {
    return null;
  }
  const parts = notificationId.split('-');
  if (parts.length >= 4) {
    const type = parts[1];
    const target = parts.slice(2, -1).join('-');
    return { type, target };
  }
  return null;
}

/**
 * Records dismissal for target for the rest of today.
 * @param {string} notificationId
 */
async function recordDismissal(notificationId) {
  const parsed = extractTargetFromId(notificationId);
  if (!parsed || !parsed.target) return;
  try {
    const today = getLocalDateString();
    const data = await chrome.storage.local.get(['notification_dismissals']);
    const dismissals = data.notification_dismissals || {};
    if (!dismissals[today]) dismissals[today] = {};
    dismissals[today][parsed.target] = true;
    await chrome.storage.local.set({ notification_dismissals: dismissals });
  } catch (err) {
    console.error('[MindPulse Companion] Dismissal recording error:', err);
  }
}

/**
 * Core tracking routine. Measures elapsed active time, credits previous tab,
 * and updates active tracking session state in storage.
 * @param {string} reason
 */
async function recordScreenTime(reason = 'tick') {
  if (isProcessing) {
    pendingRun = true;
    return;
  }
  isProcessing = true;

  try {
    const data = await chrome.storage.local.get(['screen_time', 'settings', '_activeSession']);
    const settings = data.settings || { enabled: true, idleThresholdSeconds: 60 };
    if (!settings.enabled) {
      if (data._activeSession) {
        await chrome.storage.local.remove('_activeSession');
      }
      return;
    }

    const idleThreshold = settings.idleThresholdSeconds || 60;
    const currentHostname = await getActiveTabHostname(idleThreshold);
    const now = Date.now();
    const screenTime = data.screen_time || {};
    const today = getLocalDateString();
    let modified = false;

    if (!screenTime[today]) {
      screenTime[today] = {};
      modified = true;
    }

    const session = data._activeSession;
    if (session && session.hostname && session.timestamp) {
      const elapsedSeconds = Math.round((now - session.timestamp) / 1000);
      if (elapsedSeconds >= 1 && elapsedSeconds <= 180) {
        screenTime[today][session.hostname] = (screenTime[today][session.hostname] || 0) + elapsedSeconds;
        modified = true;
      }
    } else if (reason === 'tick' && currentHostname) {
      screenTime[today][currentHostname] = (screenTime[today][currentHostname] || 0) + 60;
      modified = true;
    }

    if (pruneOldEntries(screenTime)) {
      modified = true;
    }

    const nextSession = currentHostname ? { hostname: currentHostname, timestamp: now } : null;

    const toStore = { _activeSession: nextSession };
    if (modified) {
      toStore.screen_time = screenTime;
    }
    await chrome.storage.local.set(toStore);
  } catch (error) {
    console.error('[MindPulse Companion] Tracking error:', error);
  } finally {
    isProcessing = false;
    if (pendingRun) {
      pendingRun = false;
      recordScreenTime('queued');
    }
  }
}

// -------------------------------------------------------------
// SYNC LOGIC (PHASE 2)
// -------------------------------------------------------------

/**
 * Builds array of absolute daily domain records from screen_time storage.
 * Values are absolute daily totals, making ingest idempotent.
 * @param {Record<string, Record<string, number>>} screenTime
 * @returns {Array<{date: string, domain: string, seconds: number}>}
 */
function buildSyncRecords(screenTime) {
  if (!screenTime || typeof screenTime !== 'object') return [];
  const records = [];
  for (const [dateStr, domains] of Object.entries(screenTime)) {
    if (!domains || typeof domains !== 'object') continue;
    for (const [domain, seconds] of Object.entries(domains)) {
      if (!isTrackableHostname(domain)) continue;
      if (typeof seconds === 'number' && seconds > 0) {
        records.push({
          date: dateStr,
          domain: domain,
          seconds: Math.round(seconds)
        });
      }
    }
  }
  return records;
}

/**
 * Syncs local tracking records with MindPulse backend ingest endpoint.
 * @param {boolean} force - If true, bypasses pause lock (e.g. initial token connect or manual Sync now)
 * @returns {Promise<{success: boolean, status: string, count?: number, error?: string}>}
 */
async function syncScreenTime(force = false) {
  try {
    const data = await chrome.storage.local.get([
      'pairing_token',
      'sync_enabled',
      'screen_time',
      'sync_paused_until_repair'
    ]);

    const pairingToken = data.pairing_token;
    if (!pairingToken) {
      return { success: false, status: 'no_token' };
    }

    if (data.sync_enabled === false) {
      return { success: false, status: 'disabled' };
    }

    if (!force && data.sync_paused_until_repair) {
      return { success: false, status: 'unauthorized' };
    }

    const records = buildSyncRecords(data.screen_time);
    if (records.length === 0 && !force) {
      return { success: true, status: 'empty' };
    }

    // Ingest payload (capped at 500 records on backend; send latest 500 if larger)
    const payloadRecords = records.slice(-500);

    const response = await fetch(`${MIND_PULSE_API_BASE}/api/screentime/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pairingToken}`
      },
      body: JSON.stringify({ records: payloadRecords })
    });

    if (response.ok) {
      const nowIso = new Date().toISOString();
      await chrome.storage.local.set({
        last_sync_at: nowIso,
        last_sync_status: 'ok',
        sync_paused_until_repair: false
      });
      const resJson = await response.json();
      return { success: true, status: 'ok', count: resJson.synced };
    } else if (response.status === 401) {
      await chrome.storage.local.set({
        last_sync_status: 'unauthorized',
        sync_paused_until_repair: true
      });
      return { success: false, status: 'unauthorized' };
    } else {
      await chrome.storage.local.set({
        last_sync_status: 'error'
      });
      return { success: false, status: 'error' };
    }
  } catch (err) {
    console.error('[MindPulse Companion] Sync network error:', err);
    await chrome.storage.local.set({
      last_sync_status: 'error'
    });
    return { success: false, status: 'error', error: err.message };
  }
}

// -------------------------------------------------------------
// Lifecycle & Event Listeners
// -------------------------------------------------------------

// On extension install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details && details.reason === 'update') {
    clearTodaysNotificationOpens();
  }
  try {
    const data = await chrome.storage.local.get([
      'screen_time',
      'settings',
      'lastSync',
      'sync_enabled',
      'last_sync_status',
      'notification_settings'
    ]);
    const init = {};
    if (!data.screen_time) init.screen_time = {};
    if (!data.settings) init.settings = { enabled: true, idleThresholdSeconds: 60 };
    if (!data.lastSync) init.lastSync = new Date().toISOString();
    if (data.sync_enabled === undefined) init.sync_enabled = true;
    if (!data.last_sync_status) init.last_sync_status = 'never';
    if (!data.notification_settings) init.notification_settings = DEFAULT_NOTIFICATION_SETTINGS;

    if (Object.keys(init).length > 0) {
      await chrome.storage.local.set(init);
    }

    // Set up periodic tracking alarm (every 1 min)
    await chrome.alarms.clear(ALARM_NAME);
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });

    // Set up periodic sync alarm (every 5 mins)
    await chrome.alarms.clear(SYNC_ALARM_NAME);
    chrome.alarms.create(SYNC_ALARM_NAME, { periodInMinutes: 5 });
  } catch (error) {
    console.error('[MindPulse Companion] Install error:', error);
  }
});

// On extension / browser startup
chrome.runtime.onStartup.addListener(async () => {
  clearTodaysNotificationOpens();
  try {
    await chrome.storage.local.remove('_activeSession');
    
    // Recreate alarms (alarms do not persist across browser restarts)
    await chrome.alarms.clear(ALARM_NAME);
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });

    await chrome.alarms.clear(SYNC_ALARM_NAME);
    chrome.alarms.create(SYNC_ALARM_NAME, { periodInMinutes: 5 });
  } catch (error) {
    console.error('[MindPulse Companion] Startup error:', error);
  }
});

// Periodic alarms listener
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    recordScreenTime('tick').then(() => {
      evaluateNotifications();
    });
  } else if (alarm.name === SYNC_ALARM_NAME) {
    syncScreenTime(false);
  }
});

// Tab switch listener
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  recordScreenTime('tab_activated');
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId).catch(() => null);
    if (tab && tab.url) {
      const host = cleanHostname(tab.url);
      if (host) {
        recordDomainOpen(host);
      }
    }
  } catch {}
});

// URL / navigation change listener
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    recordScreenTime('tab_updated');
    if (changeInfo.url) {
      const host = cleanHostname(changeInfo.url);
      if (host) {
        recordDomainOpen(host);
      }
    }
  }
});

// Window focus change
chrome.windows.onFocusChanged.addListener(() => {
  recordScreenTime('window_focus_changed');
});

// Idle state change
chrome.idle.onStateChanged.addListener(() => {
  recordScreenTime('idle_state_changed');
});

// Notification click & button handlers
chrome.notifications.onClicked.addListener((notificationId) => {
  if (!notificationId || !notificationId.startsWith('mindpulse-')) return;
  const parsed = extractTargetFromId(notificationId);
  const targetUrl = (parsed && parsed.type === 'behavioral')
    ? `${MIND_PULSE_APP_URL}/chat`
    : `${MIND_PULSE_APP_URL}/report#screentime`;
  chrome.tabs.create({ url: targetUrl });
  chrome.notifications.clear(notificationId);
});

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (!notificationId || !notificationId.startsWith('mindpulse-')) return;
  if (buttonIndex === 0) {
    // Primary action button (View breakdown / See tips)
    const parsed = extractTargetFromId(notificationId);
    const targetUrl = (parsed && parsed.type === 'behavioral')
      ? `${MIND_PULSE_APP_URL}/chat`
      : `${MIND_PULSE_APP_URL}/report#screentime`;
    chrome.tabs.create({ url: targetUrl });
    chrome.notifications.clear(notificationId);
  } else if (buttonIndex === 1) {
    // "Dismiss for today"
    recordDismissal(notificationId);
    chrome.notifications.clear(notificationId);
  }
});

chrome.notifications.onClosed.addListener((notificationId, byUser) => {
  if (!notificationId || !notificationId.startsWith('mindpulse-')) return;
  // If user closed the notification manually (clicked X), count as dismissal for today
  if (byUser) {
    recordDismissal(notificationId);
  }
});

// Communication listener for popup commands (manual Sync Now, Token Connect, Test Notification)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'TRIGGER_SYNC') {
    syncScreenTime(Boolean(message.force)).then((result) => {
      sendResponse(result);
    });
    return true; // Keep channel open for async response
  }
  if (message && message.type === 'TEST_NOTIFICATION') {
    chrome.notifications.create(`mindpulse-test-${Date.now()}`, {
      type: 'basic',
      iconUrl: 'icons/icon-128-notification.png',
      title: 'MindPulse Screen Time',
      message: 'This is a test notification from MindPulse.',
      priority: 0,
      requireInteraction: false,
      silent: false
    }, (notifId) => {
      sendResponse({ success: Boolean(notifId) });
    });
    return true;
  }
});
