const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(ROOT, relativePath));

test("Harbour Mail is the user-visible application name", () => {
  const packageJson = JSON.parse(read("package.json").toString("utf8"));
  const visibleSources = [
    "src/about.html",
    "src/controller/about-window.js",
    "src/controller/ipc-validation.js",
    "src/controller/mail-window-controller.js",
    "src/controller/tray-controller.js",
  ].map((filename) => read(filename).toString("utf8"));

  assert.equal(packageJson.productName, "Harbour Mail");
  assert.equal(packageJson.build.linux.desktop.entry.Name, "Harbour Mail");
  assert.match(packageJson.build.linux.synopsis, /^Harbour Mail,/);
  assert.equal(packageJson.name, "prospect-mail");
  assert.equal(packageJson.desktopName, "prospect-mail");
  assert.equal(visibleSources.some((source) => source.includes("Prospect Mail")), false);
  assert.equal(visibleSources.every((source) => source.includes("Harbour Mail")), true);
});

test("package and runtime icons use the supplied Harbour Tide artwork", () => {
  const packageJson = JSON.parse(read("package.json").toString("utf8"));
  const png = read("build/icon.png");
  const runtimePng = read("assets/harbour_mail.png");
  const icns = read("build/icon.icns");
  const svg = read("misc/harbour-logo.svg").toString("utf8");

  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
  assert.equal(png.readUInt32BE(16), 512);
  assert.equal(png.readUInt32BE(20), 512);
  assert.equal(runtimePng.readUInt32BE(16), 64);
  assert.equal(runtimePng.readUInt32BE(20), 64);
  assert.equal(icns.subarray(0, 4).toString("ascii"), "icns");
  assert.match(svg, /#16233f/);
  assert.match(svg, /#4f8cff/);
  assert.match(svg, /#ff8a5b/);

  assert.ok(packageJson.build.files.includes("assets/harbour_mail*.png"));
  assert.ok(packageJson.build.files.includes("misc/harbour-logo.svg"));
  assert.equal(
    packageJson.build.files.some((entry) =>
      /outlook_(?:linux|macOS)|prospect-logo/.test(entry)
    ),
    false
  );
});
