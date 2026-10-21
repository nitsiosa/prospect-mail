const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildNotificationContent,
  isTrustedIpcEvent,
  validateLoginReason,
  validateNotificationRequest,
  validateUnreadCount,
} = require("../src/controller/ipc-validation");
const {
  sanitizeDownloadFilename,
} = require("../src/controller/download-security");
const {
  AUTH_RECOVERY_COOLDOWN_MS,
  NETWORK_RELOAD_MIN_INTERVAL_MS,
  decideAuthRecovery,
  shouldReloadForNetworkFailure,
} = require("../src/controller/recovery-policy");
const { chooseShowAction } = require("../src/controller/window-state");

test("IPC validation requires the expected main frame on a trusted origin", () => {
  const mainFrame = { url: "https://outlook.cloud.microsoft/mail" };
  const contents = { mainFrame };
  const valid = { sender: contents, senderFrame: mainFrame };

  assert.equal(isTrustedIpcEvent(valid, contents), true);
  assert.equal(
    isTrustedIpcEvent(
      {
        sender: contents,
        senderFrame: { url: "https://outlook.cloud.microsoft/mail" },
      },
      contents
    ),
    false
  );
  assert.equal(
    isTrustedIpcEvent(
      {
        sender: contents,
        senderFrame: { url: "https://evil.invalid" },
      },
      contents
    ),
    false
  );
  assert.equal(isTrustedIpcEvent(valid, { mainFrame }), false);
  assert.equal(isTrustedIpcEvent(null, contents), false);
});

test("unread and login IPC payloads have narrow schemas", () => {
  assert.equal(validateUnreadCount(0), 0);
  assert.equal(validateUnreadCount(42), 42);
  assert.equal(validateUnreadCount(-1), null);
  assert.equal(validateUnreadCount(1.5), null);
  assert.equal(validateUnreadCount("42"), null);
  assert.equal(validateUnreadCount(1_000_001), null);

  assert.equal(validateLoginReason("session-expired"), "session-expired");
  assert.equal(validateLoginReason("login-page"), "login-page");
  assert.equal(validateLoginReason("other"), null);
  assert.equal(validateLoginReason({}), null);
});

test("notification requests reject unexpected shapes and control characters", () => {
  assert.deepEqual(validateNotificationRequest({ kind: "mail", count: 3 }), {
    kind: "mail",
    count: 3,
    details: "",
  });
  assert.deepEqual(
    validateNotificationRequest({
      kind: "calendar",
      count: 2,
      details: "Review at 10:00\nPlanning at 11:00",
    }),
    {
      kind: "calendar",
      count: 2,
      details: "Review at 10:00\nPlanning at 11:00",
    }
  );

  for (const payload of [
    null,
    [],
    { kind: "mail", count: 0 },
    { kind: "mail", count: "3" },
    { kind: "calendar", count: 101 },
    { kind: "calendar", count: 1, details: "bad\u0000value" },
    { kind: "other", count: 1 },
    { kind: "mail", count: 1, title: "forged" },
  ]) {
    assert.equal(validateNotificationRequest(payload), null);
  }
});

test("notification content is generic unless details are enabled", () => {
  const request = {
    kind: "calendar",
    count: 2,
    details: "Private event\nAnother event",
  };
  assert.deepEqual(buildNotificationContent(request, false), {
    title: "Prospect Mail: 2 Calendar Reminders",
    body: "Open Prospect Mail to view the reminders.",
  });
  assert.deepEqual(buildNotificationContent(request, true), {
    title: "Prospect Mail: 2 Calendar Reminders",
    body: "Private event\nAnother event",
  });
  assert.deepEqual(
    buildNotificationContent({ kind: "mail", count: 4, details: "" }, true),
    {
      title: "Prospect Mail: New Messages",
      body: "There are 4 unread messages.",
    }
  );
});

test("download filenames cannot escape the selected directory or hide content", () => {
  assert.equal(sanitizeDownloadFilename("report.pdf"), "report.pdf");
  assert.equal(sanitizeDownloadFilename("../../etc/passwd"), "passwd");
  assert.equal(sanitizeDownloadFilename("..\\..\\invoice.docx"), "invoice.docx");
  assert.equal(sanitizeDownloadFilename(".bashrc"), "bashrc");
  assert.equal(
    sanitizeDownloadFilename("safe\u202Efdp.exe"),
    "safefdp.exe"
  );
  assert.equal(sanitizeDownloadFilename("\u0000\u0001"), "download");
  assert.equal(sanitizeDownloadFilename("CON"), "download-CON");
  assert.ok(sanitizeDownloadFilename(`${"a".repeat(300)}.pdf`).length <= 180);
  assert.ok(sanitizeDownloadFilename(`${"a".repeat(300)}.pdf`).endsWith(".pdf"));
});

test("auth recovery reloads only when hidden and then notifies", () => {
  const now = 1_000_000;
  assert.deepEqual(
    decideAuthRecovery({
      reason: "login-page",
      isFocused: false,
      isVisible: false,
      now,
      lastReloadAt: 0,
    }),
    { action: "notify", lastReloadAt: 0 }
  );
  assert.deepEqual(
    decideAuthRecovery({
      reason: "session-expired",
      isFocused: true,
      isVisible: true,
      now,
      lastReloadAt: 0,
    }),
    { action: "notify", lastReloadAt: 0 }
  );
  assert.deepEqual(
    decideAuthRecovery({
      reason: "session-expired",
      isFocused: false,
      isVisible: false,
      now,
      lastReloadAt: 0,
    }),
    { action: "reload", lastReloadAt: now }
  );
  assert.deepEqual(
    decideAuthRecovery({
      reason: "session-expired",
      isFocused: false,
      isVisible: false,
      now: now + AUTH_RECOVERY_COOLDOWN_MS - 1,
      lastReloadAt: now,
    }),
    { action: "notify", lastReloadAt: now }
  );
  assert.deepEqual(
    decideAuthRecovery({
      reason: "session-expired",
      isFocused: false,
      isVisible: true,
      now: now + AUTH_RECOVERY_COOLDOWN_MS,
      lastReloadAt: now,
    }),
    { action: "notify", lastReloadAt: now }
  );
});

test("network recovery is main-frame, focus, pending, and interval limited", () => {
  const now = 1_000_000;
  assert.equal(
    shouldReloadForNetworkFailure({
      errorCode: -106,
      isMainFrame: true,
      isFocused: false,
      recoveryPending: false,
      now,
      lastReloadAt: 0,
    }),
    true
  );
  assert.equal(
    shouldReloadForNetworkFailure({
      errorCode: -106,
      isMainFrame: false,
      isFocused: false,
      recoveryPending: false,
      now,
      lastReloadAt: 0,
    }),
    false
  );
  assert.equal(
    shouldReloadForNetworkFailure({
      errorCode: -3,
      isMainFrame: true,
      isFocused: false,
      recoveryPending: false,
      now,
      lastReloadAt: 0,
    }),
    false
  );
  assert.equal(
    shouldReloadForNetworkFailure({
      errorCode: -106,
      isMainFrame: true,
      isFocused: false,
      recoveryPending: false,
      now: now + NETWORK_RELOAD_MIN_INTERVAL_MS - 1,
      lastReloadAt: now,
    }),
    false
  );
  assert.equal(
    shouldReloadForNetworkFailure({
      errorCode: -106,
      isMainFrame: true,
      isFocused: true,
      recoveryPending: false,
      now: now + NETWORK_RELOAD_MIN_INTERVAL_MS,
      lastReloadAt: now,
    }),
    false
  );
  assert.equal(
    shouldReloadForNetworkFailure({
      errorCode: -106,
      isMainFrame: true,
      isFocused: false,
      recoveryPending: true,
      now: now + NETWORK_RELOAD_MIN_INTERVAL_MS,
      lastReloadAt: now,
    }),
    false
  );
});

test("window activation chooses exactly one focus operation", () => {
  assert.equal(
    chooseShowAction({ isMinimized: true, isVisible: true }),
    "restore"
  );
  assert.equal(
    chooseShowAction({ isMinimized: false, isVisible: true }),
    "focus"
  );
  assert.equal(
    chooseShowAction({ isMinimized: false, isVisible: false }),
    "show"
  );
});
