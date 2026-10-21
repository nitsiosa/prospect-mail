"use strict";

const version = new URLSearchParams(window.location.search).get("version");
document.getElementById("version").textContent =
  typeof version === "string" && version.length <= 64
    ? `Version ${version}`
    : "Version unavailable";

document.getElementById("close-btn").addEventListener("click", () => {
  window.electronAPI.closeWindow();
});

for (const [elementId, target] of [
  ["github-link", "github"],
  ["donate-link", "donate"],
  ["report-link", "issues"],
]) {
  document.getElementById(elementId).addEventListener("click", (event) => {
    event.preventDefault();
    window.electronAPI.openExternal(target);
  });
}
