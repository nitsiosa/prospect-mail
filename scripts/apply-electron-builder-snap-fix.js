#!/usr/bin/env node
"use strict";

// Backport electron-builder PR #10176 (merged as 5f6c32a, not yet included in
// the v26 package line): Core24 already writes a desktop entry to snap/gui,
// which Snapcraft copies to meta/gui. The duplicate apps.<name>.desktop mapping
// makes Snapcraft 9.2 look for the final path too early and fail every Snap
// build. Remove that mapping and mirror the upstream Exec-name corrections.
// https://github.com/electron-userland/electron-builder/pull/10176

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");

function replaceExact(source, before, after) {
  if (after && source.includes(after)) return source;

  const first = source.indexOf(before);
  if (first === -1) {
    // A later electron-builder release may already contain the upstream fix.
    return source;
  }
  if (source.indexOf(before, first + before.length) !== -1) {
    throw new Error("electron-builder Snap fix marker was not unique");
  }
  return `${source.slice(0, first)}${after}${source.slice(first + before.length)}`;
}

function patchFile(relativePath, replacements) {
  const filename = path.join(ROOT, relativePath);
  const original = fs.readFileSync(filename, "utf8");
  const patched = replacements.reduce(
    (source, [before, after]) => replaceExact(source, before, after),
    original
  );
  if (patched !== original) fs.writeFileSync(filename, patched);
  return patched !== original;
}

function applySnapFix() {
  const core24Changed = patchFile(
    "node_modules/app-builder-lib/out/targets/snap/core24.js",
    [
      [
        'this.packager.executableName + " %U"',
        'snap.name + " %U"',
      ],
      [
        "effectiveOptionComputed({ snap, ...buildMode })",
        "effectiveOptionComputed({ snap, desktopFile: desktopFilePath, ...buildMode })",
      ],
      [
        "            desktop: `meta/gui/${desktopBaseName}.desktop`,\n",
        "",
      ],
    ]
  );
  const legacyChanged = patchFile(
    "node_modules/app-builder-lib/out/targets/snap/coreLegacy.js",
    [
      [
        'this.packager.executableName + " %U"',
        'snap.name + " %U"',
      ],
    ]
  );

  const core24 = fs.readFileSync(
    path.join(
      ROOT,
      "node_modules/app-builder-lib/out/targets/snap/core24.js"
    ),
    "utf8"
  );
  if (core24.includes("desktop: `meta/gui/${desktopBaseName}.desktop`")) {
    throw new Error("electron-builder Core24 desktop mapping is still present");
  }

  if (core24Changed || legacyChanged) {
    console.log("Applied electron-builder Snap Core24 desktop fix");
  } else {
    console.log("electron-builder Snap Core24 desktop fix already present");
  }
}

if (require.main === module) applySnapFix();

module.exports = { applySnapFix, replaceExact };
