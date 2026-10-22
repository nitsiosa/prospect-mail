// Configuration constants
const CONFIG = {
  // Anti-spam throttle times
  unreadEmailThrottleMs: 10000,   // 10 seconds between unread email notifications
  calendarReminderThrottleMs: 10000, // 10 seconds between calendar notifications

  // Debounce and polling intervals
  mutationDebounceMs: 1000,          // 1 second debounce for mutation observers
  unreadCheckIntervalMs: 5000,       // 5 seconds between periodic unread checks

  // Retry delays
  handlerRetryDelayMs: 5000,         // 5 seconds before retrying failed handlers

  // Session-expiry / sign-in detection (see the detection block below)
  authNeededWindowMs: 20000, // window over which repeated AuthNeeded errors are counted
  authNeededMinHits: 2,      // AuthNeeded rejections within the window before we notify
  loginPageConfirmMs: 8000,  // a sign-in URL must persist this long to count (ignores SSO bounces)
};

let unreadCheckTimer;
let lastUnreadNotificationTime;
let lastCalendarNotificationTime;
let lastUnreadCount = 0;           // Track previous unread count
let lastReminderCount = 0;          // Track previous reminder count
let handlerRetryTimer;
let loginCheckStarted = false;
const activeHandlers = new Set();

// Send only a narrow notification request. The main process validates it and
// supplies the title/body so web content cannot forge arbitrary notifications.
const showNotification = (request) => {
  window.electronAPI.showNotification(request);
};

// ── Session-expiry / sign-in detection ─────────────────────────────────────
// Outlook Web never surfaces MSAL's `interaction_required`. Instead its data
// layer rejects failed calls with "<operation> failed: AuthNeeded" while the
// session is expired (the red "Your session has expired" banner, with the mail
// UI still fully rendered). That `AuthNeeded` token is our language-independent
// signal. The other case is a hard redirect to a Microsoft sign-in page.
//
// Neither auto-reloads: silent SSO has already failed, so only an interactive
// sign-in recovers, and a blind reload would loop or wipe a half-entered login.
// We just notify the main process, which can warn a tray/minimized user. A
// stuck/blank page from a dropped connection is handled separately, in the main
// process, via `did-fail-load` (a real network error, not a login problem).
let loginRequiredReported = false;

const LOGIN_URL_PATTERNS = [
  'login.microsoftonline.com',
  'login.live.com',
  'login.microsoft.com',
];

const isOnLoginPageUrl = (href) => {
  if (typeof href !== "string" || !href) return false;
  try {
    const url = new URL(href);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443")
    ) {
      return false;
    }
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
    return LOGIN_URL_PATTERNS.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`)
    );
  } catch {
    return false;
  }
};

const isOnLoginPage = () => {
  try {
    return isOnLoginPageUrl(window.location.href);
  } catch {
    return false;
  }
};

// Pull a string message out of whatever a promise rejected with.
const rejectionMessage = (reason) => {
  if (!reason) return '';
  if (typeof reason === 'string') return reason;
  return reason.message || reason.errorMessage || String(reason);
};

// OWA marks an expired session by rejecting data calls with a "...: AuthNeeded"
// error. Match the whole token so an unrelated word can't false-match.
const isAuthNeededRejection = (reason) => /\bAuthNeeded\b/.test(rejectionMessage(reason));

const reportLoginRequired = (reason) => {
  if (loginRequiredReported) return;
  loginRequiredReported = true;
  window.electronAPI.reportLoginRequired(reason);
};

// Require a few AuthNeeded rejections within a short window before notifying: a
// single one can occur transiently during a normal token refresh, but a
// genuinely expired session keeps emitting them as OWA retries its data calls.
let authNeededHits = [];
const recordAuthNeeded = (now = Date.now()) => {
  authNeededHits = authNeededHits.filter((t) => now - t < CONFIG.authNeededWindowMs);
  authNeededHits.push(now);
  return authNeededHits.length >= CONFIG.authNeededMinHits;
};

const startLoginCheck = () => {
  // Genuine session expiry: OWA's data layer rejects with AuthNeeded.
  window.addEventListener('unhandledrejection', (event) => {
    if (isAuthNeededRejection(event.reason) && recordAuthNeeded()) {
      reportLoginRequired('session-expired');
    }
  });

  // Hard redirect to a Microsoft sign-in page. Confirm it persists so a brief
  // SSO bounce during initial load doesn't fire a false notification: if the
  // page navigates on to Outlook, this script's context is gone and the timer
  // never runs.
  if (isOnLoginPage()) {
    setTimeout(() => {
      if (isOnLoginPage()) reportLoginRequired('login-page');
    }, CONFIG.loginPageConfirmMs);
  }
};

// Outlook localizes the surrounding text, but the unread count remains the
// first number in parentheses in the folder title.
const parseUnreadTitle = (title) => {
  const match =
    typeof title === "string" ? title.match(/\(([\d\s.,]+)/) : null;
  if (!match) return 0;
  const digits = match[1].replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
};

const formatReminderDetails = (reminderElements) => {
  const details = [];
  for (const reminder of reminderElements) {
    const subject = reminder.getAttribute("subject") || "Reminder";
    const timeDisplay =
      reminder.getAttribute("starttimedisplaystring") || "";
    const timeUntil =
      reminder.getAttribute("timeuntildisplaystring") || "";
    const location = reminder.getAttribute("location") || "";

    let line = subject;
    if (timeDisplay) line += ` at ${timeDisplay}`;
    if (timeUntil) line += ` (${timeUntil})`;
    if (location) line += ` - ${location}`;
    details.push(line);
  }
  return details.join("\n").slice(0, 1000);
};

const observeUnreadHandlers = {
  outlookWebAppUnread: () => {
    // Find inbox element by semantic attribute (more stable than CSS classes)
    const inboxElement = document.querySelector('[data-folder-name="inbox"]');

    if (!inboxElement) {
      console.log(`No inbox element found for unread monitoring`);
      return false;
    }

    // Resolve how many unread messages to report, per the user's setting:
    //   "inbox"     — the Inbox folder only (default, original behaviour)
    //   "favorites" — sum of unread across the pinned Favorites folders (#343)
    // Favorites live in one group anchored by the language-neutral internal id
    // "favoritesRoot"; each favourite folder is a treeitem below the level-1
    // "Favorites" header. Non-folder favourites (people, groups) have no
    // "(N unread)" tooltip and parse to 0, so they don't affect the sum.
    const getUnreadCount = () => {
      const source =
        (window.prospectMailConfig && window.prospectMailConfig.unreadNotificationSource) ||
        "inbox";

      if (source === "favorites") {
        const favorites = document.querySelectorAll(
          '[aria-labelledby="favoritesRoot"] [role="treeitem"]:not([aria-level="1"])'
        );
        let total = 0;
        favorites.forEach((el) => {
          total += parseUnreadTitle(el.getAttribute("title"));
        });
        return total;
      }

      return parseUnreadTitle(inboxElement.getAttribute("title"));
    };

    const checkUnread = (checkOnlyZeroUnread) => {
      if (!inboxElement) {
        console.log("Invalid inbox element");
        return false;
      }

      const unread = getUnreadCount();

      console.log(`Found ${unread} unread message(s)`);

      if (unread > 0 || !checkOnlyZeroUnread) {
        // Only push to the tray when the count actually changed. The periodic
        // timer and mutation observer both call this every few seconds; sending
        // an unchanged value makes Electron/Chromium re-publish the tray icon
        // (new temp dir + NewIcon signal) each time, which races the SNI host on
        // Wayland/appindicator and leaves the icon blank.
        if (unread !== lastUnreadCount) {
          window.electronAPI.updateUnread(unread);
        }

        // Only show notification if unread count increased
        if (unread > lastUnreadCount && !checkOnlyZeroUnread) {
          // Anti-spam: only show notification if enough time has passed
          const now = new Date();
          const timeSinceLastNotification = lastUnreadNotificationTime
            ? now - lastUnreadNotificationTime
            : Infinity;

          console.log('Unread notification check:', {
            unread,
            lastUnreadCount,
            timeSinceLastNotification,
            willShow: timeSinceLastNotification > CONFIG.unreadEmailThrottleMs
          });

          if (!lastUnreadNotificationTime || timeSinceLastNotification > CONFIG.unreadEmailThrottleMs) {
            if (window.prospectMailConfig && window.prospectMailConfig.showUnreadNotifications === false) {
              console.log('Unread notification suppressed by user setting (showUnreadNotifications=false)');
            } else {
              showNotification({ kind: "mail", count: unread });
              lastUnreadNotificationTime = now;
            }
          } else {
            console.log(`Unread notification suppressed by anti-spam (need to wait ${CONFIG.unreadEmailThrottleMs}ms)`);
          }
        }
      }

      // Update tracked count
      lastUnreadCount = unread;
    };

    // Find the navigation pane using semantic attribute (more stable than CSS classes)
    const navigationPane = document.querySelector('[data-app-section="NavigationPane"]');
    const leftPanel = navigationPane?.querySelector('#folderPaneDroppableContainer');

    if (!leftPanel) {
      console.log("Navigation panel not found for mutation observer");
      return false;
    }

    console.log("Successfully found inbox element and navigation panel");

    // Observe for DOM changes
    const observer = new MutationObserver(() => {
      debounce(checkUnread, CONFIG.mutationDebounceMs, "unread-mutation");
    });
    observer.observe(leftPanel, {
      attributes: true,
      childList: true,
      subtree: true,
    });

    // Periodic safety net for changes the mutation observer might miss.
    // Runs a full check (checkOnlyZeroUnread=false) so it can also notify on a
    // real increase. Passing true here silently advanced lastUnreadCount without
    // notifying, so when the poll fired before the observer's debounced check a
    // newly-arrived mail was swallowed (see #415). The unread>lastUnreadCount
    // guard plus the anti-spam throttle still prevent duplicate notifications.
    if (unreadCheckTimer) {
      clearInterval(unreadCheckTimer);
    }
    unreadCheckTimer = setInterval(() => {
      checkUnread(false);
    }, CONFIG.unreadCheckIntervalMs);

    // Establish the baseline without notifying about messages that predate app
    // startup. Only later increases represent newly arrived mail.
    checkUnread(true);

    return true;
  },

  outlookWebAppNotifications: () => {
    // Find notification pane by semantic attribute (more stable than CSS classes)
    const notificationPane = document.querySelector('[data-app-section="NotificationPane"]');

    if (!notificationPane) {
      console.log(`No notification pane found for calendar reminders`);
      return false;
    }

    console.log("Successfully found notification pane");

    const checkNotifications = (suppressNotification = false) => {
      if (!notificationPane) {
        console.log("Invalid notification pane element");
        return false;
      }

      // Query directly for reminder elements within the notification pane
      // More stable than using intermediate container class
      const reminderElements = notificationPane.querySelectorAll('[reminder]');
      const reminderCount = reminderElements.length;

      console.log(`Found ${reminderCount} calendar reminder(s)`);
      // Only show notification if reminder count increased
      if (reminderCount > lastReminderCount && !suppressNotification) {
        // Anti-spam: only show notification if enough time has passed
        const now = new Date();
        const timeSinceLastNotification = lastCalendarNotificationTime
          ? now - lastCalendarNotificationTime
          : Infinity;

        console.log('Calendar notification check:', {
          reminderCount,
          lastReminderCount,
          timeSinceLastNotification,
          willShow: timeSinceLastNotification > CONFIG.calendarReminderThrottleMs
        });

        if (!lastCalendarNotificationTime || timeSinceLastNotification > CONFIG.calendarReminderThrottleMs) {
          const showDetails =
            window.prospectMailConfig &&
            window.prospectMailConfig.showNotificationContent === true;
          showNotification({
            kind: "calendar",
            count: reminderCount,
            details: showDetails
              ? formatReminderDetails(reminderElements)
              : "",
          });
          lastCalendarNotificationTime = now;
        } else {
          console.log(`Calendar notification suppressed by anti-spam (need to wait ${CONFIG.calendarReminderThrottleMs}ms)`);
        }
      }

      // Update tracked count
      lastReminderCount = reminderCount;
    };

    // Observe for DOM changes
    const observer = new MutationObserver(() => {
      debounce(checkNotifications, CONFIG.mutationDebounceMs, "notification-mutation");
    });
    observer.observe(notificationPane, {
      childList: true,
      subtree: true,
    });

    // Initial check
    checkNotifications(true);

    return true;
  },
};

const initializeEmailMonitoring = () => {
  // Native Electron notifications don't require permission requests
  // The main process handles notification permissions
  if (!loginCheckStarted) {
    startLoginCheck();
    loginCheckStarted = true;
  }

  // Sign-in pages do not contain the Outlook mail/reminder DOM. Avoid an
  // endless retry loop while the user completes interactive authentication.
  if (isOnLoginPage()) return;

  const failedHandlers = [];

  for (const interfaceType in observeUnreadHandlers) {
    if (activeHandlers.has(interfaceType)) continue;
    const handler = observeUnreadHandlers[interfaceType];
    const started = handler();

    if (started) {
      console.log(`Successfully connected to ${interfaceType} interface`);
      activeHandlers.add(interfaceType);
    } else {
      console.log(`Failed to connect to ${interfaceType} interface`);
      failedHandlers.push(interfaceType);
    }
  }

  if (failedHandlers.length > 0) {
    if (handlerRetryTimer) clearTimeout(handlerRetryTimer);
    handlerRetryTimer = setTimeout(
      initializeEmailMonitoring,
      CONFIG.handlerRetryDelayMs
    );
  }
};

const debounce = (() => {
  const timers = {};

  return (callback, wait, id = "default") => {
    if (timers[id]) {
      clearTimeout(timers[id]);
    }
    timers[id] = setTimeout(callback, wait);
  };
})();

// Auto-start only in the page (where this script is injected via
// executeJavaScript). In a Node test harness `window` is absent, so we skip the
// browser bootstrap and instead expose the detection helpers for unit tests.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  initializeEmailMonitoring();
} else if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CONFIG,
    isOnLoginPageUrl,
    isOnLoginPage,
    rejectionMessage,
    isAuthNeededRejection,
    formatReminderDetails,
    parseUnreadTitle,
    recordAuthNeeded,
    reportLoginRequired,
    startLoginCheck,
    // Test hook: reset the module's login-detection state between scenarios.
    _resetLoginStateForTest() {
      loginRequiredReported = false;
      authNeededHits = [];
    },
  };
}
