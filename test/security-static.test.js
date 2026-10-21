const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(ROOT, relativePath), "utf8");

test("remote BrowserWindows explicitly enable Electron security boundaries", () => {
  const mailWindow = read("src/controller/mail-window-controller.js");
  const aboutWindow = read("src/controller/about-window.js");

  for (const source of [mailWindow, aboutWindow]) {
    assert.match(source, /contextIsolation:\s*true/);
    assert.match(source, /nodeIntegration:\s*false/);
    assert.match(source, /sandbox:\s*true/);
    assert.match(source, /webSecurity:\s*true/);
    assert.match(source, /allowRunningInsecureContent:\s*false/);
    assert.match(source, /webviewTag:\s*false/);
  }
  assert.doesNotMatch(mailWindow, /webSecurity:\s*false/);
  assert.doesNotMatch(mailWindow, /nodeIntegration:\s*true/);
});

test("packaged launch never disables the Chromium sandbox", () => {
  const packageSource = read("package.json");
  const packageJson = JSON.parse(packageSource);
  const mainSource = read("src/main.js");
  assert.doesNotMatch(
    packageSource,
    /--no-sandbox|ELECTRON_DISABLE_SANDBOX/
  );
  assert.doesNotMatch(mainSource, /--no-sandbox|ELECTRON_DISABLE_SANDBOX/);
  assert.ok(packageJson.build.files.includes("src/**/*"));
  assert.ok(packageJson.build.files.includes("public/**/*"));
  assert.equal(
    packageJson.build.files.some((entry) =>
      /^(?:test|testing|docs|scripts)(?:\/|$)/.test(entry)
    ),
    false
  );
});

test("mailto is advertised without silently changing the OS default", () => {
  const packageJson = JSON.parse(read("package.json"));
  const mainSource = read("src/main.js");

  assert.deepEqual(packageJson.build.linux.mimeTypes, [
    "x-scheme-handler/mailto",
  ]);
  assert.equal(packageJson.build.linux.category, "Network;Email");
  assert.deepEqual(packageJson.build.linux.executableArgs, [
    "--ozone-platform=wayland",
  ]);
  assert.equal(packageJson.desktopName, "prospect-mail");
  assert.equal(
    packageJson.build.linux.desktop.entry.Actions,
    "X11;"
  );
  assert.equal(
    packageJson.build.linux.desktop.desktopActions.X11.Exec,
    "prospect-mail --ozone-platform=x11 %U"
  );
  assert.doesNotMatch(mainSource, /setAsDefaultProtocolClient/);
});

test("renderer preload exposes only the allowlisted narrow IPC facade", () => {
  const preload = read("src/controller/preload.js");
  const channels = [
    ...preload.matchAll(/ipcRenderer\.send\("([^"]+)"/g),
  ].map((match) => match[1]);

  assert.deepEqual(channels.sort(), [
    "report-login-required",
    "show",
    "show-notification",
    "updateUnread",
  ]);
  assert.doesNotMatch(preload, /ipcRenderer\.(?:invoke|on|sendSync)/);
});

test("downloads use a save dialog and are never auto-opened", () => {
  const mailWindow = read("src/controller/mail-window-controller.js");
  assert.match(mailWindow, /setSaveDialogOptions/);
  assert.doesNotMatch(mailWindow, /item\.setSavePath|item\.open|shell\.openPath/);
});

test("production logs do not include full URLs or reminder content", () => {
  const mailWindow = read("src/controller/mail-window-controller.js");
  const observer = read("public/unread-number-observer.js");

  assert.doesNotMatch(mailWindow, /console\.(?:log|warn|error)\(url/);
  assert.doesNotMatch(mailWindow, /Loaded settings/);
  assert.doesNotMatch(observer, /console\.(?:log|warn|error).*reminderDetails/);
  assert.doesNotMatch(observer, /console\.(?:log|warn|error).*subject/);
});

test("the local About page does not allow inline script execution", () => {
  const about = read("src/about.html");
  assert.match(about, /script-src 'self'/);
  assert.doesNotMatch(about, /script-src[^"]*'unsafe-inline'/);
  assert.doesNotMatch(about, /<script>(?:.|\n)*<\/script>/);
});
