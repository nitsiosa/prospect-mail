const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  replaceExact,
} = require("../scripts/apply-electron-builder-snap-fix");

test("Snap backport replaces one exact marker and is idempotent", () => {
  assert.equal(replaceExact("before marker after", "marker", "fixed"), "before fixed after");
  assert.equal(replaceExact("before fixed after", "marker", "fixed"), "before fixed after");
  assert.throws(
    () => replaceExact("marker and marker", "marker", "fixed"),
    /not unique/
  );
});

test("installed electron-builder has the merged Core24 desktop fix", () => {
  const core24 = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "node_modules",
      "app-builder-lib",
      "out",
      "targets",
      "snap",
      "core24.js"
    ),
    "utf8"
  );

  assert.doesNotMatch(
    core24,
    /desktop: `meta\/gui\/\$\{desktopBaseName\}\.desktop`/
  );
  assert.match(core24, /writeDesktopEntry\(this\.options, snap\.name \+ " %U"/);
});
