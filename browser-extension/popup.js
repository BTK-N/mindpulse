/**
 * MindPulse Screen Time Companion - Popup Script
 * Reads local tracking stats, renders domain breakdown, handles pairing & sync,
 * and manages user notification preferences.
 */

const APP_URL = 'http://127.0.0.1:5173';

const DEFAULT_NOTIFICATION_SETTINGS = {
  siteThresholdMinutes: 45,        // 30 | 45 | 60 | 90 | 0 (0 = disabled)
  dailyThresholdMinutes: 180,       // 120 | 180 | 240 | 300 | 0 (0 = disabled)
  behavioralEnabled: false,         // opt-in
  behavioralOpensPerHour: 10,       // fixed at 10, not user-configurable
  quietHoursStart: '22:00',         // 24h format
  quietHoursEnd: '08:00',           // 24h format
  quietHoursEnabled: true
};

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

/**
 * Formats seconds into human-readable duration according to editorial rules:
 * - Under 60s -> "Ns" (e.g., "45s")
 * - Under 60min -> "Nm Ns" (e.g., "12m 30s")
 * - Over 60min -> "Nh Nm" (e.g., "2h 14m")
 * Never displays raw seconds for anything >= 60.
 * @param {number} seconds
 * @returns {string}
 */
function formatDuration(seconds) {
  const s = Math.max(0, Math.round(seconds || 0));
  if (s < 60) {
    return `${s}s`;
  }
  const minutes = Math.floor(s / 60);
  const remainingSec = s % 60;
  if (minutes < 60) {
    return `${minutes}m ${remainingSec}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMin = minutes % 60;
  return `${hours}h ${remainingMin}m`;
}

/**
 * Formats ISO timestamp into relative time string:
 * "just now", "2m ago", "3h ago", "2d ago", or "Never"
 * @param {string|null} isoString
 * @returns {string}
 */
function formatRelativeTime(isoString) {
  if (!isoString) return 'Never';
  try {
    let s = String(isoString).trim();
    if (!s.endsWith('Z') && !s.includes('+')) {
      s = s.replace(' ', 'T') + 'Z';
    }
    const then = new Date(s).getTime();
    const now = Date.now();
    const diffSec = Math.max(0, Math.floor((now - then) / 1000));
    if (diffSec < 45) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return 'Never';
  }
}

/**
 * Updates stored notification preferences in chrome.storage.local.
 * @param {(current: typeof DEFAULT_NOTIFICATION_SETTINGS) => typeof DEFAULT_NOTIFICATION_SETTINGS} updater
 */
async function updateNotificationSettings(updater) {
  try {
    const data = await chrome.storage.local.get(['notification_settings']);
    const current = Object.assign({}, DEFAULT_NOTIFICATION_SETTINGS, data.notification_settings);
    const updated = updater(current);
    await chrome.storage.local.set({ notification_settings: updated });
  } catch (err) {
    console.error('[MindPulse Companion] Failed to save notification settings:', err);
  }
}

/**
 * Reads local storage and updates popup DOM elements.
 */
async function render() {
  const totalTimeEl = document.getElementById('total-time');
  const siteCountEl = document.getElementById('site-count');
  const domainListEl = document.getElementById('domain-list');
  const emptyStateEl = document.getElementById('empty-state');
  const toggleEl = document.getElementById('toggle-enabled');

  const unpairedSec = document.getElementById('sync-unpaired');
  const pairedSec = document.getElementById('sync-paired');
  const statusBadge = document.getElementById('sync-status-badge');
  const metaTimeEl = document.getElementById('sync-meta-time');
  const repairPrompt = document.getElementById('sync-repair-prompt');

  // Notification controls
  const toggleNotifSite = document.getElementById('toggle-notif-site');
  const selectSiteThreshold = document.getElementById('select-site-threshold');
  const siteThresholdSubrow = document.getElementById('site-threshold-subrow');
  const toggleNotifDaily = document.getElementById('toggle-notif-daily');
  const selectDailyThreshold = document.getElementById('select-daily-threshold');
  const dailyThresholdSubrow = document.getElementById('daily-threshold-subrow');
  const toggleNotifBehavioral = document.getElementById('toggle-notif-behavioral');
  const toggleNotifQuiet = document.getElementById('toggle-notif-quiet');
  const inputQuietStart = document.getElementById('input-quiet-start');
  const inputQuietEnd = document.getElementById('input-quiet-end');
  const quietHoursSubrow = document.getElementById('quiet-hours-subrow');

  try {
    const data = await chrome.storage.local.get([
      'screen_time',
      'settings',
      'pairing_token',
      'last_sync_at',
      'last_sync_status',
      'notification_settings'
    ]);

    const settings = data.settings || { enabled: true, idleThresholdSeconds: 60 };
    const screenTime = data.screen_time || {};
    const today = getLocalDateString();
    const todayData = screenTime[today] || {};

    // 1. Master tracking toggle switch
    if (toggleEl) {
      toggleEl.checked = settings.enabled !== false;
    }

    // 2. Compute today's total seconds and site count
    const activeEntries = Object.entries(todayData)
      .filter(([_, sec]) => typeof sec === 'number' && sec > 0)
      .sort((a, b) => b[1] - a[1]);

    const totalSeconds = activeEntries.reduce((acc, [_, sec]) => acc + sec, 0);
    const siteCount = activeEntries.length;

    // 3. Render summary header
    if (totalTimeEl) {
      totalTimeEl.textContent = `${formatDuration(totalSeconds)} today`;
    }
    if (siteCountEl) {
      siteCountEl.textContent = `on ${siteCount} ${siteCount === 1 ? 'site' : 'sites'}`;
    }

    // 4. Render Top 5 domains
    const top5 = activeEntries.slice(0, 5);

    if (top5.length === 0) {
      if (domainListEl) domainListEl.style.display = 'none';
      if (emptyStateEl) emptyStateEl.style.display = 'block';
    } else {
      if (emptyStateEl) emptyStateEl.style.display = 'none';
      if (domainListEl) {
        domainListEl.style.display = 'flex';
        domainListEl.innerHTML = '';

        for (const [domain, seconds] of top5) {
          const li = document.createElement('li');
          li.className = 'domain-item';

          const nameSpan = document.createElement('span');
          nameSpan.className = 'domain-name';
          nameSpan.textContent = domain;
          nameSpan.title = domain;

          const durationSpan = document.createElement('span');
          durationSpan.className = 'domain-duration';
          durationSpan.textContent = formatDuration(seconds);

          li.appendChild(nameSpan);
          li.appendChild(durationSpan);
          domainListEl.appendChild(li);
        }
      }
    }

    // 5. Render Sync State (Phase 2)
    const pairingToken = data.pairing_token;
    const lastSyncAt = data.last_sync_at;
    const lastSyncStatus = data.last_sync_status || 'never';

    if (!pairingToken) {
      if (unpairedSec) unpairedSec.style.display = 'flex';
      if (pairedSec) pairedSec.style.display = 'none';
    } else {
      if (unpairedSec) unpairedSec.style.display = 'none';
      if (pairedSec) pairedSec.style.display = 'flex';

      // Meta time text
      if (metaTimeEl) {
        metaTimeEl.textContent = `Last sync: ${formatRelativeTime(lastSyncAt)}`;
      }

      // Status badge and repair box
      if (statusBadge) {
        statusBadge.className = 'sync-status-badge';
        if (lastSyncStatus === 'ok') {
          statusBadge.classList.add('ok');
          statusBadge.innerHTML = `Synced ${formatRelativeTime(lastSyncAt)} &check;`;
          if (repairPrompt) repairPrompt.style.display = 'none';
        } else if (lastSyncStatus === 'unauthorized') {
          statusBadge.classList.add('unauthorized');
          statusBadge.textContent = 'Token expired — re-pair needed';
          if (repairPrompt) repairPrompt.style.display = 'flex';
        } else if (lastSyncStatus === 'error') {
          statusBadge.classList.add('error');
          statusBadge.textContent = 'Sync failed, will retry';
          if (repairPrompt) repairPrompt.style.display = 'none';
        } else {
          statusBadge.textContent = 'Connected (awaiting sync)';
          if (repairPrompt) repairPrompt.style.display = 'none';
        }
      }
    }

    // 6. Render Notification Settings (Phase 1)
    const notifSettings = Object.assign({}, DEFAULT_NOTIFICATION_SETTINGS, data.notification_settings);

    // Row A: Site time alert
    const siteThreshold = Number(notifSettings.siteThresholdMinutes);
    const siteEnabled = !isNaN(siteThreshold) && siteThreshold > 0;
    if (toggleNotifSite) {
      toggleNotifSite.checked = siteEnabled;
    }
    if (selectSiteThreshold && siteEnabled) {
      selectSiteThreshold.value = String(siteThreshold);
    }
    if (siteThresholdSubrow) {
      siteThresholdSubrow.style.display = siteEnabled ? 'flex' : 'none';
    }

    // Row B: Daily total alert
    const dailyThreshold = Number(notifSettings.dailyThresholdMinutes);
    const dailyEnabled = !isNaN(dailyThreshold) && dailyThreshold > 0;
    if (toggleNotifDaily) {
      toggleNotifDaily.checked = dailyEnabled;
    }
    if (selectDailyThreshold && dailyEnabled) {
      selectDailyThreshold.value = String(dailyThreshold);
    }
    if (dailyThresholdSubrow) {
      dailyThresholdSubrow.style.display = dailyEnabled ? 'flex' : 'none';
    }

    // Row C: Repeat open alert
    if (toggleNotifBehavioral) {
      toggleNotifBehavioral.checked = Boolean(notifSettings.behavioralEnabled);
    }

    // Row D: Quiet hours
    const quietEnabled = notifSettings.quietHoursEnabled !== false;
    if (toggleNotifQuiet) {
      toggleNotifQuiet.checked = quietEnabled;
    }
    if (inputQuietStart) {
      inputQuietStart.value = notifSettings.quietHoursStart || '22:00';
    }
    if (inputQuietEnd) {
      inputQuietEnd.value = notifSettings.quietHoursEnd || '08:00';
    }
    if (quietHoursSubrow) {
      quietHoursSubrow.style.display = quietEnabled ? 'flex' : 'none';
    }
  } catch (error) {
    console.error('[MindPulse Companion] Render error:', error);
  }
}

// Attach event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  render();

  // 1. Master toggle switch change handler
  const toggleEl = document.getElementById('toggle-enabled');
  if (toggleEl) {
    toggleEl.addEventListener('change', async () => {
      try {
        const enabled = toggleEl.checked;
        const data = await chrome.storage.local.get('settings');
        const currentSettings = data.settings || { enabled: true, idleThresholdSeconds: 60 };
        currentSettings.enabled = enabled;
        await chrome.storage.local.set({ settings: currentSettings });
      } catch (err) {
        console.error('[MindPulse Companion] Failed to update toggle:', err);
      }
    });
  }

  // 2. Open MindPulse web application link
  const openLinkEl = document.getElementById('open-app-link');
  if (openLinkEl) {
    openLinkEl.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: APP_URL });
    });
  }

  // 3. Show pairing input form button
  const btnShowPair = document.getElementById('btn-show-pair');
  const pairForm = document.getElementById('pair-form');
  const inputToken = document.getElementById('input-token');
  if (btnShowPair && pairForm) {
    btnShowPair.addEventListener('click', () => {
      btnShowPair.style.display = 'none';
      pairForm.style.display = 'flex';
      if (inputToken) inputToken.focus();
    });
  }

  // 4. Connect pairing token button
  const btnConnect = document.getElementById('btn-connect');
  const pairFeedback = document.getElementById('pair-feedback');
  if (btnConnect) {
    btnConnect.addEventListener('click', async () => {
      const tokenVal = inputToken ? inputToken.value.trim() : '';
      if (!tokenVal) {
        if (pairFeedback) {
          pairFeedback.className = 'pair-feedback error';
          pairFeedback.style.display = 'block';
          pairFeedback.textContent = 'Please paste a pairing token.';
        }
        return;
      }

      btnConnect.disabled = true;
      if (pairFeedback) {
        pairFeedback.className = 'pair-feedback info';
        pairFeedback.style.display = 'block';
        pairFeedback.textContent = 'Checking token…';
      }

      try {
        await chrome.storage.local.set({
          pairing_token: tokenVal,
          sync_enabled: true,
          sync_paused_until_repair: false
        });

        // Trigger immediate verification sync
        const res = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: 'TRIGGER_SYNC', force: true }, (response) => {
            resolve(response || { success: false, status: 'error' });
          });
        });

        if (res && (res.status === 'ok' || res.status === 'empty')) {
          if (pairFeedback) {
            pairFeedback.className = 'pair-feedback success';
            pairFeedback.textContent = 'Connected ✓';
          }
          setTimeout(() => {
            render();
          }, 800);
        } else if (res && res.status === 'unauthorized') {
          await chrome.storage.local.remove('pairing_token');
          if (pairFeedback) {
            pairFeedback.className = 'pair-feedback error';
            pairFeedback.textContent = 'Invalid token, try again.';
          }
          btnConnect.disabled = false;
        } else {
          if (pairFeedback) {
            pairFeedback.className = 'pair-feedback error';
            pairFeedback.textContent = 'Could not reach server. Check backend.';
          }
          btnConnect.disabled = false;
        }
      } catch (err) {
        if (pairFeedback) {
          pairFeedback.className = 'pair-feedback error';
          pairFeedback.textContent = 'Connection error.';
        }
        btnConnect.disabled = false;
      }
    });
  }

  // 5. Manual Sync Now action link
  const linkSyncNow = document.getElementById('link-sync-now');
  if (linkSyncNow) {
    linkSyncNow.addEventListener('click', async (e) => {
      e.preventDefault();
      const statusBadge = document.getElementById('sync-status-badge');
      if (statusBadge) {
        statusBadge.textContent = 'Syncing…';
      }
      try {
        await new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: 'TRIGGER_SYNC', force: true }, () => resolve());
        });
        render();
      } catch (err) {
        console.error('Manual sync failed:', err);
        render();
      }
    });
  }

  // 6. Disconnect action link
  const linkDisconnect = document.getElementById('link-disconnect');
  if (linkDisconnect) {
    linkDisconnect.addEventListener('click', async (e) => {
      e.preventDefault();
      await chrome.storage.local.remove([
        'pairing_token',
        'last_sync_at',
        'last_sync_status',
        'sync_paused_until_repair'
      ]);
      render();
    });
  }

  // 7. Get token helper links
  const linkGetToken = document.getElementById('link-get-token');
  const linkGetNewToken = document.getElementById('link-get-new-token');
  const handleNavToAssessment = (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: `${APP_URL}` });
  };
  if (linkGetToken) linkGetToken.addEventListener('click', handleNavToAssessment);
  if (linkGetNewToken) linkGetNewToken.addEventListener('click', handleNavToAssessment);

  // 8. Notification settings event handlers
  const toggleNotifSite = document.getElementById('toggle-notif-site');
  const selectSiteThreshold = document.getElementById('select-site-threshold');
  const siteThresholdSubrow = document.getElementById('site-threshold-subrow');
  if (toggleNotifSite && selectSiteThreshold) {
    toggleNotifSite.addEventListener('change', () => {
      const isChecked = toggleNotifSite.checked;
      if (siteThresholdSubrow) {
        siteThresholdSubrow.style.display = isChecked ? 'flex' : 'none';
      }
      const val = isChecked ? (Number(selectSiteThreshold.value) || 45) : 0;
      updateNotificationSettings((s) => ({ ...s, siteThresholdMinutes: val }));
    });

    selectSiteThreshold.addEventListener('change', () => {
      const val = Number(selectSiteThreshold.value) || 45;
      updateNotificationSettings((s) => ({ ...s, siteThresholdMinutes: val }));
    });
  }

  const toggleNotifDaily = document.getElementById('toggle-notif-daily');
  const selectDailyThreshold = document.getElementById('select-daily-threshold');
  const dailyThresholdSubrow = document.getElementById('daily-threshold-subrow');
  if (toggleNotifDaily && selectDailyThreshold) {
    toggleNotifDaily.addEventListener('change', () => {
      const isChecked = toggleNotifDaily.checked;
      if (dailyThresholdSubrow) {
        dailyThresholdSubrow.style.display = isChecked ? 'flex' : 'none';
      }
      const val = isChecked ? (Number(selectDailyThreshold.value) || 180) : 0;
      updateNotificationSettings((s) => ({ ...s, dailyThresholdMinutes: val }));
    });

    selectDailyThreshold.addEventListener('change', () => {
      const val = Number(selectDailyThreshold.value) || 180;
      updateNotificationSettings((s) => ({ ...s, dailyThresholdMinutes: val }));
    });
  }

  const toggleNotifBehavioral = document.getElementById('toggle-notif-behavioral');
  if (toggleNotifBehavioral) {
    toggleNotifBehavioral.addEventListener('change', () => {
      updateNotificationSettings((s) => ({ ...s, behavioralEnabled: toggleNotifBehavioral.checked }));
    });
  }

  const toggleNotifQuiet = document.getElementById('toggle-notif-quiet');
  const quietHoursSubrow = document.getElementById('quiet-hours-subrow');
  if (toggleNotifQuiet) {
    toggleNotifQuiet.addEventListener('change', () => {
      const isChecked = toggleNotifQuiet.checked;
      if (quietHoursSubrow) {
        quietHoursSubrow.style.display = isChecked ? 'flex' : 'none';
      }
      updateNotificationSettings((s) => ({ ...s, quietHoursEnabled: isChecked }));
    });
  }

  const inputQuietStart = document.getElementById('input-quiet-start');
  if (inputQuietStart) {
    const handleStartChange = () => {
      const val = inputQuietStart.value || '22:00';
      updateNotificationSettings((s) => ({ ...s, quietHoursStart: val }));
    };
    inputQuietStart.addEventListener('change', handleStartChange);
    inputQuietStart.addEventListener('blur', handleStartChange);
  }

  const inputQuietEnd = document.getElementById('input-quiet-end');
  if (inputQuietEnd) {
    const handleEndChange = () => {
      const val = inputQuietEnd.value || '08:00';
      updateNotificationSettings((s) => ({ ...s, quietHoursEnd: val }));
    };
    inputQuietEnd.addEventListener('change', handleEndChange);
    inputQuietEnd.addEventListener('blur', handleEndChange);
  }

  // 9. Test notification button handler
  const linkTestNotif = document.getElementById('link-test-notification');
  const testFeedback = document.getElementById('test-notif-feedback');
  if (linkTestNotif) {
    linkTestNotif.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.sendMessage({ type: 'TEST_NOTIFICATION' }, () => {
        if (testFeedback) {
          testFeedback.style.display = 'inline';
          setTimeout(() => {
            testFeedback.style.display = 'none';
          }, 2500);
        }
      });
    });
  }
});

// Dynamic storage change listener
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      render();
    }
  });
}
