"use strict";

const DEFAULT_OUTLOOK_URL = "https://outlook.cloud.microsoft/mail";
const MAX_URL_LENGTH = 16 * 1024;
const MAX_MAILTO_LENGTH = 8 * 1024;
const MAX_ADDRESS_FIELD_LENGTH = 2048;
const MAX_SUBJECT_LENGTH = 998;
const MAX_BODY_LENGTH = 6000;
const MAX_MAILTO_FIELDS = 50;

const ROUTE_ACTIONS = Object.freeze({
  BLOCK: "block",
  EXTERNAL: "external",
  INTERNAL: "internal",
  INTERNAL_POPUP: "internal-popup",
  MAILTO: "mailto",
  TEAMS: "teams",
});

const OUTLOOK_HOSTS = new Set([
  "outlook.cloud.microsoft",
  "outlook.office.com",
  "outlook.office365.com",
  "outlook.office365.us",
  "outlook.office.de",
  "outlook.live.com",
]);

const LOGIN_HOST_ROOTS = [
  "login.microsoftonline.com",
  "login.microsoft.com",
  "login.live.com",
  "account.live.com",
  "login.windows.net",
  "login.microsoftonline.us",
  "login.microsoftonline.de",
  "login.partner.microsoftonline.cn",
  "login.chinacloudapi.cn",
];

const OTHER_TRUSTED_APP_HOSTS = new Set(["to-do.office.com"]);
const TEAMS_HOSTS = new Set([
  "teams.microsoft.com",
  "teams.live.com",
  "teams.cloud.microsoft",
]);

const RAW_CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const NON_BODY_CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const BODY_CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const ENCODED_CONTROL_CHARACTERS = /%(?:00|0a|0d|7f)/i;

function normalizedHostname(url) {
  return url.hostname.toLowerCase().replace(/\.$/, "");
}

function hostMatchesRoot(hostname, root) {
  return hostname === root || hostname.endsWith(`.${root}`);
}

function parseAbsoluteUrl(value) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_URL_LENGTH ||
    value !== value.trim() ||
    RAW_CONTROL_CHARACTERS.test(value)
  ) {
    return null;
  }

  try {
    const parsed = new URL(value);
    if (parsed.username || parsed.password) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isSecureWebUrl(parsed) {
  return (
    parsed &&
    parsed.protocol === "https:" &&
    (parsed.port === "" || parsed.port === "443")
  );
}

function isOutlookHost(hostname) {
  return OUTLOOK_HOSTS.has(hostname);
}

function isLoginHost(hostname) {
  return LOGIN_HOST_ROOTS.some((root) => hostMatchesRoot(hostname, root));
}

function isTrustedRendererUrl(value) {
  const parsed = parseAbsoluteUrl(value);
  if (!isSecureWebUrl(parsed)) return false;

  const hostname = normalizedHostname(parsed);
  return (
    isOutlookHost(hostname) ||
    isLoginHost(hostname) ||
    OTHER_TRUSTED_APP_HOSTS.has(hostname)
  );
}

function isOutlookUrl(value) {
  const parsed =
    value instanceof URL
      ? value
      : parseAbsoluteUrl(value);
  return (
    isSecureWebUrl(parsed) && isOutlookHost(normalizedHostname(parsed))
  );
}

function isAuthenticationUrl(value) {
  const parsed =
    value instanceof URL
      ? value
      : parseAbsoluteUrl(value);
  return (
    isSecureWebUrl(parsed) && isLoginHost(normalizedHostname(parsed))
  );
}

function isOutlookDeepLink(parsed) {
  if (!isSecureWebUrl(parsed) || !isOutlookHost(normalizedHostname(parsed))) {
    return false;
  }

  return /^\/(?:mail|calendar)(?:\/\d+)?\/deeplink(?:\/|$)/i.test(
    parsed.pathname
  );
}

function isSafeLink(parsed) {
  if (!isSecureWebUrl(parsed)) return false;

  const hostname = normalizedHostname(parsed);
  if (hostMatchesRoot(hostname, "safelinks.protection.outlook.com")) {
    return true;
  }

  return (
    isOutlookHost(hostname) &&
    /^\/mail(?:\/\d+)?\/safelink\.html$/i.test(parsed.pathname)
  );
}

function isTeamsMeetingPath(parsed) {
  if (
    /^\/(?:meet|l\/meetup-join)(?:\/|$)/i.test(parsed.pathname)
  ) {
    return true;
  }

  if (/^\/v2\/?$/i.test(parsed.pathname)) {
    return [...parsed.searchParams.keys()].some(
      (key) => key.toLowerCase() === "meetingjoin"
    );
  }

  return false;
}

function isTeamsHttpsUrl(value) {
  const parsed =
    value instanceof URL
      ? value
      : parseAbsoluteUrl(value);
  return (
    isSecureWebUrl(parsed) &&
    TEAMS_HOSTS.has(normalizedHostname(parsed)) &&
    isTeamsMeetingPath(parsed)
  );
}

function isTeamsProtocolUrl(value) {
  const parsed =
    value instanceof URL
      ? value
      : parseAbsoluteUrl(value);
  if (!parsed || parsed.protocol !== "msteams:") return false;

  const hostname = normalizedHostname(parsed);
  if (hostname && !TEAMS_HOSTS.has(hostname)) return false;
  return isTeamsMeetingPath(parsed);
}

function toTeamsProtocolUrl(value) {
  const parsed = parseAbsoluteUrl(value);
  if (!isTeamsHttpsUrl(parsed)) return null;
  return `msteams://${normalizedHostname(parsed)}${parsed.pathname}${parsed.search}${parsed.hash}`;
}

function teamsHttpsFallback(value) {
  const parsed = parseAbsoluteUrl(value);
  if (isTeamsHttpsUrl(parsed)) return parsed.href;
  if (!isTeamsProtocolUrl(parsed)) return null;

  const hostname = normalizedHostname(parsed) || "teams.cloud.microsoft";
  return `https://${hostname}${parsed.pathname}${parsed.search}${parsed.hash}`;
}

function isTrustedBlobUrl(parsed) {
  if (!parsed || parsed.protocol !== "blob:") return false;
  return isTrustedRendererUrl(parsed.origin);
}

function decodeMailtoComponent(value) {
  try {
    const decoded = decodeURIComponent(value);
    if (ENCODED_CONTROL_CHARACTERS.test(decoded)) return null;
    return decoded;
  } catch {
    return null;
  }
}

function isValidAddressField(value) {
  return (
    value.length <= MAX_ADDRESS_FIELD_LENGTH &&
    !NON_BODY_CONTROL_CHARACTERS.test(value)
  );
}

function parseMailto(value) {
  if (
    typeof value !== "string" ||
    value.length > MAX_MAILTO_LENGTH ||
    !/^mailto:/i.test(value) ||
    value !== value.trim() ||
    RAW_CONTROL_CHARACTERS.test(value)
  ) {
    return null;
  }

  const schemeEnd = value.indexOf(":") + 1;
  const remainder = value.slice(schemeEnd);
  if (remainder.includes("#")) return null;

  const queryIndex = remainder.indexOf("?");
  const rawPath =
    queryIndex === -1 ? remainder : remainder.slice(0, queryIndex);
  const rawQuery =
    queryIndex === -1 ? "" : remainder.slice(queryIndex + 1);
  if (rawPath.startsWith("//")) return null;

  const pathRecipient = decodeMailtoComponent(rawPath);
  if (pathRecipient === null || !isValidAddressField(pathRecipient)) return null;

  const recipients = {
    to: pathRecipient ? [pathRecipient] : [],
    cc: [],
    bcc: [],
  };
  let subject = "";
  let body = "";

  if (rawQuery) {
    const fields = rawQuery.split("&");
    if (fields.length > MAX_MAILTO_FIELDS) return null;

    for (const field of fields) {
      const equalsIndex = field.indexOf("=");
      const rawKey = equalsIndex === -1 ? field : field.slice(0, equalsIndex);
      const rawValue = equalsIndex === -1 ? "" : field.slice(equalsIndex + 1);
      const key = decodeMailtoComponent(rawKey);
      if (key === null || NON_BODY_CONTROL_CHARACTERS.test(key)) return null;

      const normalizedKey = key.toLowerCase();
      if (!["to", "cc", "bcc", "subject", "body"].includes(normalizedKey)) {
        continue;
      }

      const decoded = decodeMailtoComponent(rawValue);
      if (decoded === null) return null;

      if (["to", "cc", "bcc"].includes(normalizedKey)) {
        if (!isValidAddressField(decoded)) return null;
        if (decoded) recipients[normalizedKey].push(decoded);
      } else if (normalizedKey === "subject" && subject === "") {
        if (
          decoded.length > MAX_SUBJECT_LENGTH ||
          NON_BODY_CONTROL_CHARACTERS.test(decoded)
        ) {
          return null;
        }
        subject = decoded;
      } else if (normalizedKey === "body" && body === "") {
        if (
          decoded.length > MAX_BODY_LENGTH ||
          BODY_CONTROL_CHARACTERS.test(decoded)
        ) {
          return null;
        }
        body = decoded.replace(/\r\n?/g, "\n");
      }
    }
  }

  const result = {
    to: recipients.to.join(", "),
    cc: recipients.cc.join(", "),
    bcc: recipients.bcc.join(", "),
    subject,
    body,
  };

  if (
    !isValidAddressField(result.to) ||
    !isValidAddressField(result.cc) ||
    !isValidAddressField(result.bcc)
  ) {
    return null;
  }

  return result;
}

function normalizeOutlookMainUrl(value) {
  const parsed = parseAbsoluteUrl(value);
  if (!isSecureWebUrl(parsed) || !isOutlookHost(normalizedHostname(parsed))) {
    return null;
  }
  return parsed.href;
}

function normalizeExternalHttpUrl(value) {
  const parsed = parseAbsoluteUrl(value);
  if (!parsed || !["http:", "https:"].includes(parsed.protocol)) return null;
  return parsed.href;
}

function buildOutlookComposeUrl(fields, mainUrl = DEFAULT_OUTLOOK_URL) {
  const normalizedMainUrl = normalizeOutlookMainUrl(mainUrl);
  if (!normalizedMainUrl || !fields || typeof fields !== "object") return null;

  const expectedFields = ["to", "cc", "bcc", "subject", "body"];
  if (expectedFields.some((field) => typeof fields[field] !== "string")) {
    return null;
  }
  if (
    !isValidAddressField(fields.to) ||
    !isValidAddressField(fields.cc) ||
    !isValidAddressField(fields.bcc) ||
    fields.subject.length > MAX_SUBJECT_LENGTH ||
    NON_BODY_CONTROL_CHARACTERS.test(fields.subject) ||
    fields.body.length > MAX_BODY_LENGTH ||
    BODY_CONTROL_CHARACTERS.test(fields.body)
  ) {
    return null;
  }

  const main = new URL(normalizedMainUrl);
  const compose = new URL("/mail/deeplink/compose", main.origin);
  for (const field of expectedFields) {
    if (fields[field]) compose.searchParams.set(field, fields[field]);
  }
  return compose.href;
}

function classifyUrl(value, { sourceUrl = "" } = {}) {
  const sourceTrusted = isTrustedRendererUrl(sourceUrl);
  const sourceIsOutlook = isOutlookUrl(sourceUrl);
  const parsed = parseAbsoluteUrl(value);
  if (!parsed) return { action: ROUTE_ACTIONS.BLOCK };

  if (parsed.protocol === "about:") {
    return {
      action:
        sourceTrusted && parsed.href === "about:blank"
          ? ROUTE_ACTIONS.INTERNAL_POPUP
          : ROUTE_ACTIONS.BLOCK,
      url: parsed.href,
    };
  }

  if (parsed.protocol === "blob:") {
    return {
      action:
        sourceTrusted && isTrustedBlobUrl(parsed)
          ? ROUTE_ACTIONS.INTERNAL_POPUP
          : ROUTE_ACTIONS.BLOCK,
      url: parsed.href,
    };
  }

  if (parsed.protocol === "mailto:") {
    const fields = sourceIsOutlook ? parseMailto(value) : null;
    return fields
      ? { action: ROUTE_ACTIONS.MAILTO, fields }
      : { action: ROUTE_ACTIONS.BLOCK };
  }

  if (parsed.protocol === "msteams:") {
    return {
      action:
        sourceIsOutlook && isTeamsProtocolUrl(parsed)
          ? ROUTE_ACTIONS.TEAMS
          : ROUTE_ACTIONS.BLOCK,
      url: parsed.href,
    };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { action: ROUTE_ACTIONS.BLOCK };
  }

  if (isSafeLink(parsed)) {
    return { action: ROUTE_ACTIONS.EXTERNAL, url: parsed.href };
  }

  if (isTeamsHttpsUrl(parsed)) {
    return {
      action: sourceIsOutlook ? ROUTE_ACTIONS.TEAMS : ROUTE_ACTIONS.EXTERNAL,
      url: parsed.href,
    };
  }

  if (isOutlookDeepLink(parsed)) {
    return { action: ROUTE_ACTIONS.INTERNAL_POPUP, url: parsed.href };
  }

  if (isTrustedRendererUrl(parsed.href)) {
    return { action: ROUTE_ACTIONS.INTERNAL, url: parsed.href };
  }

  return { action: ROUTE_ACTIONS.EXTERNAL, url: parsed.href };
}

module.exports = {
  DEFAULT_OUTLOOK_URL,
  ROUTE_ACTIONS,
  buildOutlookComposeUrl,
  classifyUrl,
  isAuthenticationUrl,
  isOutlookUrl,
  isTeamsHttpsUrl,
  isTeamsProtocolUrl,
  isTrustedRendererUrl,
  normalizeExternalHttpUrl,
  normalizeOutlookMainUrl,
  parseMailto,
  teamsHttpsFallback,
  toTeamsProtocolUrl,
};
