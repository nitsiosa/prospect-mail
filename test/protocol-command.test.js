const test = require("node:test");
const assert = require("node:assert/strict");

const {
  extractMailtoArgument,
} = require("../src/controller/protocol-command");

test("extracts a valid mailto argument from packaged and development argv", () => {
  assert.equal(
    extractMailtoArgument([
      "/opt/Prospect Mail/prospect-mail",
      "--ozone-platform=wayland",
      "mailto:user+tag@example.com?subject=Hello%20World",
    ]),
    "mailto:user+tag@example.com?subject=Hello%20World"
  );
  assert.equal(
    extractMailtoArgument([
      "/path/to/electron",
      ".",
      "MAILTO:test@example.com",
    ]),
    "MAILTO:test@example.com"
  );
});

test("ignores embedded, malformed, and unrelated protocol arguments", () => {
  for (const args of [
    [],
    ["prospect-mail", "https://example.com/?next=mailto:test@example.com"],
    ["prospect-mail", "msteams:/l/meetup-join/id"],
    ["prospect-mail", "mailto:test@example.com?subject=bad%0d%0aBcc:x@y.test"],
    ["prospect-mail", 42],
  ]) {
    assert.equal(extractMailtoArgument(args), null);
  }
});
