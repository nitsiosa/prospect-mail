const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.join(__dirname, "..");
const SCRIPT = path.join(ROOT, ".github", "generate-changelog.js");

test("changelog generation accepts existing tags without a shell", () => {
  const result = spawnSync(
    process.execPath,
    [SCRIPT, "v1.3.1", "v1.3.0"],
    { cwd: ROOT, encoding: "utf8" }
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /###/);
});

test("changelog tag input cannot execute shell syntax", () => {
  const tempDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "prospect-changelog-")
  );
  const marker = path.join(tempDirectory, "executed");
  const payload =
    `v1.3.1;${JSON.stringify(process.execPath)} -e ` +
    `${JSON.stringify(`require("node:fs").writeFileSync(${JSON.stringify(marker)}, "bad")`)};#`;

  try {
    const result = spawnSync(process.execPath, [SCRIPT, payload], {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert.notEqual(result.status, 0);
    assert.equal(fs.existsSync(marker), false);
    assert.match(result.stderr, /does not name an existing tag/);
  } finally {
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
});

test("release workflows do not expose publish credentials during npm ci", () => {
  const buildWorkflow = fs.readFileSync(
    path.join(ROOT, ".github", "workflows", "build-release.yml"),
    "utf8"
  );
  const releaseNotesWorkflow = fs.readFileSync(
    path.join(
      ROOT,
      ".github",
      "workflows",
      "release-notes-from-commits.yml"
    ),
    "utf8"
  );
  const testWorkflow = fs.readFileSync(
    path.join(ROOT, ".github", "workflows", "test.yml"),
    "utf8"
  );
  const globalBuildConfiguration = buildWorkflow.split(/^jobs:/m)[0];

  assert.doesNotMatch(
    globalBuildConfiguration,
    /GH_TOKEN|SNAPCRAFT_STORE_CREDENTIALS|contents:\s*write/
  );
  assert.equal(
    [...buildWorkflow.matchAll(/persist-credentials:\s*false/g)].length,
    3
  );
  assert.doesNotMatch(
    releaseNotesWorkflow,
    /TAG="\$\{\{\s*inputs\.tag\s*\}\}"/
  );
  assert.match(releaseNotesWorkflow, /persist-credentials:\s*false/);
  assert.match(testWorkflow, /persist-credentials:\s*false/);
});
