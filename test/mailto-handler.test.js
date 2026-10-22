const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  HANDLER_DESKTOP_ID,
  buildMailtoDesktopEntry,
  isSafeDesktopId,
} = require("../src/controller/mailto-handler");

const ROOT = path.join(__dirname, "..");

test("builds a fixed user-level Harbour Mail mailto desktop entry", () => {
  const entry = buildMailtoDesktopEntry(
    "/opt/Harbour Mail/prospect-mail"
  );
  assert.match(entry, /^\[Desktop Entry\]$/m);
  assert.match(entry, /^Name=Harbour Mail \(Mail Links\)$/m);
  assert.match(
    entry,
    /^Exec="\/opt\/Harbour Mail\/prospect-mail" --ozone-platform=wayland %U$/m
  );
  assert.match(entry, /^NoDisplay=true$/m);
  assert.match(entry, /^MimeType=x-scheme-handler\/mailto;$/m);
  assert.equal(HANDLER_DESKTOP_ID, "harbour-mail-mailto.desktop");
});

test("mailto desktop entry rejects unsafe executable paths", () => {
  assert.throws(
    () => buildMailtoDesktopEntry("prospect-mail"),
    /safe absolute executable path/
  );
  assert.throws(
    () => buildMailtoDesktopEntry("/opt/bad\u0000name"),
    /safe absolute executable path/
  );
});

test("previous desktop handler IDs are tightly validated", () => {
  assert.equal(isSafeDesktopId("thunderbird.desktop"), true);
  assert.equal(isSafeDesktopId("org.gnome.Evolution.desktop"), true);
  assert.equal(isSafeDesktopId("../evil.desktop"), false);
  assert.equal(isSafeDesktopId("bad name.desktop"), false);
  assert.equal(isSafeDesktopId("not-a-desktop"), false);
});

test("system package does not advertise mailto before explicit opt-in", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(ROOT, "package.json"), "utf8")
  );
  const handlerSource = fs.readFileSync(
    path.join(ROOT, "src", "controller", "mailto-handler.js"),
    "utf8"
  );

  assert.equal(packageJson.build.linux.mimeTypes, undefined);
  assert.match(handlerSource, /showMessageBox/);
  assert.match(handlerSource, /execFileAsync\("\/usr\/bin\/xdg-mime"/);
  assert.doesNotMatch(handlerSource, /\bexec(?:Sync)?\(/);
});
