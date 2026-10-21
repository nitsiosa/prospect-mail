"use strict";

const path = require("path");

const MAX_FILENAME_LENGTH = 180;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g;
const BIDI_CONTROL_CHARACTERS = /[\u202a-\u202e\u2066-\u2069]/g;
const WINDOWS_RESERVED_NAMES =
  /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;

function sanitizeDownloadFilename(value) {
  if (typeof value !== "string") return "download";

  let filename = value
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    .replace(CONTROL_CHARACTERS, "")
    .replace(BIDI_CONTROL_CHARACTERS, "")
    .trim()
    .replace(/^\.+/, "");

  if (!filename || filename === "." || filename === "..") {
    return "download";
  }

  if (WINDOWS_RESERVED_NAMES.test(filename)) {
    filename = `download-${filename}`;
  }

  if (filename.length > MAX_FILENAME_LENGTH) {
    const extension = path.extname(filename).slice(0, 20);
    const stemLength = Math.max(1, MAX_FILENAME_LENGTH - extension.length);
    filename = `${filename.slice(0, stemLength)}${extension}`;
  }

  return filename || "download";
}

module.exports = { sanitizeDownloadFilename };
