"use strict";

const NETWORK_RELOAD_MIN_INTERVAL_MS = 5 * 1000;
const AUTH_RECOVERY_COOLDOWN_MS = 3 * 60 * 1000;

const RECOVERABLE_NET_ERRORS = new Set([
  -2, // ERR_FAILED
  -21, // ERR_NETWORK_CHANGED
  -100, // ERR_CONNECTION_CLOSED
  -101, // ERR_CONNECTION_RESET
  -102, // ERR_CONNECTION_REFUSED
  -104, // ERR_CONNECTION_FAILED
  -105, // ERR_NAME_NOT_RESOLVED
  -106, // ERR_INTERNET_DISCONNECTED
  -109, // ERR_ADDRESS_UNREACHABLE
  -118, // ERR_CONNECTION_TIMED_OUT
  -130, // ERR_PROXY_CONNECTION_FAILED
  -137, // ERR_NAME_RESOLUTION_FAILED
]);

function shouldReloadForNetworkFailure({
  errorCode,
  isMainFrame,
  isFocused,
  recoveryPending,
  now,
  lastReloadAt,
}) {
  return (
    isMainFrame === true &&
    isFocused !== true &&
    recoveryPending !== true &&
    RECOVERABLE_NET_ERRORS.has(errorCode) &&
    now - lastReloadAt >= NETWORK_RELOAD_MIN_INTERVAL_MS
  );
}

function decideAuthRecovery({
  reason,
  isFocused,
  isVisible,
  now,
  lastReloadAt,
}) {
  if (
    reason !== "session-expired" ||
    isFocused ||
    isVisible ||
    now - lastReloadAt < AUTH_RECOVERY_COOLDOWN_MS
  ) {
    return { action: "notify", lastReloadAt };
  }

  return { action: "reload", lastReloadAt: now };
}

module.exports = {
  AUTH_RECOVERY_COOLDOWN_MS,
  NETWORK_RELOAD_MIN_INTERVAL_MS,
  decideAuthRecovery,
  shouldReloadForNetworkFailure,
};
