"use strict";

const { parseMailto } = require("./url-router");

function extractMailtoArgument(commandLine) {
  if (!Array.isArray(commandLine)) return null;
  for (const argument of commandLine) {
    if (
      typeof argument === "string" &&
      /^mailto:/i.test(argument) &&
      parseMailto(argument)
    ) {
      return argument;
    }
  }
  return null;
}

module.exports = { extractMailtoArgument };
