"use strict";

const { isTrustedRendererUrl } = require("./url-router");

const MAX_UNREAD_COUNT = 1_000_000;
const MAX_REMINDER_COUNT = 100;
const MAX_NOTIFICATION_DETAILS_LENGTH = 1000;
const NOTIFICATION_CONTROL_CHARACTERS =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const LOGIN_REASONS = new Set(["session-expired", "login-page"]);

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isTrustedIpcEvent(event, expectedWebContents) {
  if (
    !event ||
    !expectedWebContents ||
    event.sender !== expectedWebContents ||
    !event.senderFrame ||
    event.senderFrame !== expectedWebContents.mainFrame
  ) {
    return false;
  }

  return isTrustedRendererUrl(event.senderFrame.url);
}

function validateInteger(value, minimum, maximum) {
  return Number.isInteger(value) && value >= minimum && value <= maximum
    ? value
    : null;
}

function validateUnreadCount(value) {
  return validateInteger(value, 0, MAX_UNREAD_COUNT);
}

function validateLoginReason(value) {
  return typeof value === "string" && LOGIN_REASONS.has(value) ? value : null;
}

function validateNotificationRequest(value) {
  if (!isPlainObject(value)) return null;

  const keys = Object.keys(value);
  if (keys.some((key) => !["kind", "count", "details"].includes(key))) {
    return null;
  }

  if (value.kind === "mail") {
    const count = validateInteger(value.count, 1, MAX_UNREAD_COUNT);
    if (count === null || (value.details !== undefined && value.details !== "")) {
      return null;
    }
    return { kind: "mail", count, details: "" };
  }

  if (value.kind === "calendar") {
    const count = validateInteger(value.count, 1, MAX_REMINDER_COUNT);
    const details = value.details === undefined ? "" : value.details;
    if (
      count === null ||
      typeof details !== "string" ||
      details.length > MAX_NOTIFICATION_DETAILS_LENGTH ||
      NOTIFICATION_CONTROL_CHARACTERS.test(details)
    ) {
      return null;
    }
    return { kind: "calendar", count, details };
  }

  return null;
}

function buildNotificationContent(request, showDetails) {
  if (request.kind === "mail") {
    return {
      title: "Prospect Mail: New Messages",
      body: `There are ${request.count} unread messages.`,
    };
  }

  const plural = request.count === 1 ? "Reminder" : "Reminders";
  const genericPlural = request.count === 1 ? "reminder" : "reminders";
  return {
    title: `Prospect Mail: ${request.count} Calendar ${plural}`,
    body:
      showDetails && request.details
        ? request.details
        : `Open Prospect Mail to view the ${genericPlural}.`,
  };
}

module.exports = {
  buildNotificationContent,
  isTrustedIpcEvent,
  validateLoginReason,
  validateNotificationRequest,
  validateUnreadCount,
};
