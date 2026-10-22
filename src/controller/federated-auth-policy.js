"use strict";

const {
  isAuthenticationUrl,
  normalizeExternalHttpUrl,
} = require("./url-router");

function httpsHostname(value) {
  const normalized = normalizeExternalHttpUrl(value);
  if (!normalized) return null;
  const parsed = new URL(normalized);
  if (parsed.protocol !== "https:") return null;
  return parsed.hostname.toLowerCase().replace(/\.$/, "");
}

class FederatedAuthPolicy {
  constructor() {
    this.hostsByContents = new Map();
  }

  clear(contentsId) {
    this.hostsByContents.delete(contentsId);
  }

  allows({
    contentsId,
    sourceUrl,
    destinationUrl,
    isRedirect,
  }) {
    const destinationHost = httpsHostname(destinationUrl);
    if (!destinationHost) return false;

    const sourceHost = httpsHostname(sourceUrl);
    const knownHosts = this.hostsByContents.get(contentsId) || new Set();
    const sourceIsKnown =
      isAuthenticationUrl(sourceUrl) ||
      (sourceHost !== null && knownHosts.has(sourceHost));

    if (isRedirect && sourceIsKnown) {
      knownHosts.add(destinationHost);
      this.hostsByContents.set(contentsId, knownHosts);
      return true;
    }

    return (
      sourceIsKnown &&
      sourceHost !== null &&
      knownHosts.has(destinationHost)
    );
  }
}

module.exports = { FederatedAuthPolicy };
