# Upstream strategy and maintainer friendliness

Upstream: https://github.com/julian-alarcon/prospect-mail (MIT). Contribute generic bugs and enhancements after internal prototype works and user authorises upstream PRs.

- Split changes into reviewable commits: URL routing/security; mailto; GNOME Wayland; tests/docs; packaging.
- Preserve upstream Node 24/Electron 42 constraints and cross-platform support unless a specific compatibility test demonstrates otherwise.
- Avoid rebranding upstream unnecessarily or copying a complete unrelated mail client.
- Keep tenant-specific configuration, corporate screenshots, auth diagnostics and internal details out of commits and PR descriptions.
- If a bug already has an upstream issue/PR, note it and avoid duplicating the same fix.
- Do not automatically publish the fork, issue comments or PRs to the public upstream project. Obtain user approval first.
