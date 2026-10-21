# Outlook Wayland prototype — execution status

**Maintained by Cursor. Update after every phase.**

Project state: `IN_PROGRESS`
Fork: `LOCAL_UPSTREAM_CHECKOUT` (GitHub CLI authentication is currently invalid)
Branch: `feat/outlook-wayland-ubuntu`
Upstream base SHA: `da1c55fa327a9f78ff065c62b4d172db481e8d3a`
Last update: `2026-10-21`
Environment: `Ubuntu 24.04.5 LTS / GNOME Wayland / x86_64 / Node 24.22.0 / npm 11.19.1`

| Workstream | State | Evidence / commit / next action |
|---|---|---|
| A. Baseline and upstream audit | AUTO_PASS | Source/CI inspected; clean install and baseline recorded |
| B. Link routing and mailto | AUTO_PASS | Parsed URL router, strict Teams/mailto handling, command-line activation, attack regression tests |
| C. Mail/calendar/attachments | IN_PROGRESS | OWA retains core UI; save-dialog filename hardening implemented; live workflows remain human-only |
| D. GNOME Wayland integration | AUTO_PASS (synthetic) | Native-Wayland smoke: main/popup security, notification IPC, focus path and mailto compose passed |
| E. Security hardening | AUTO_PASS (code) | Scoped IPC, guarded navigation/popups, private notification default, redacted logging, production audit clean |
| F. Debian build and handoff | NOT_STARTED | .deb path/hash + manual steps |

Automated tests: `AUTO_PASS — 40/40 Node tests plus offline native-Wayland Electron smoke, 2026-10-21`
Security review: `AUTO_PASS (source/runtime boundaries) — npm audit --omit=dev: 0 vulnerabilities; full audit: 8 moderate development-only findings in electron-builder's legacy global-agent chain`
Debian artifact: `NONE`
Ready for human testing: `NO`
Live corporate acceptance: `NOT_RUN`

## NEEDS_HUMAN queue
- Corporate sign-in/MFA and live mailbox/calendar checks are deliberately deferred until the local candidate is complete.
- Remote fork/PR validation cannot run until GitHub CLI authentication is restored. Local work continues independently.

## Recent activity (prepend entries)
- [2026-10-21 implementation] Added parsed URL/deep-link/Safe Links/Teams/mailto routing with hostile-host, userinfo, malformed, encoded-control and length-limit tests.
- [2026-10-21 hardening] Added scoped main-frame/origin IPC validation; explicit sandbox/context isolation/Node/web security preferences; secure popups; guarded navigation/redirects; attachment save-dialog filename sanitization; generic-by-default notifications; fixed About-window IPC/CSP.
- [2026-10-21 Wayland smoke] Synthetic Outlook page ran on a private headless GNOME Wayland compositor. Verified Ozone `wayland`, visible main window, isolated secure popup, exact preload API and initial mailto compose. The source-checkout smoke alone used the documented dev-only sandbox bypass; package config contains no bypass.
- [2026-10-21 dependencies] Non-forced lockfile remediation updated `fast-uri` to 3.1.9 and electron-builder to 26.18.0 within the declared range. Production audit is clean; the forced development-only downgrade was rejected.
- [2026-10-21 baseline] Cloned upstream `main` at `da1c55f`, created the feature branch, copied this implementation kit, inspected all source/package/CI files, and ran the privacy-safe doctor.
- [2026-10-21 baseline] `npm ci` completed with Electron 42.10.1; `npm test` passed 10/10. `npm audit --omit=dev` found one high-severity transitive `fast-uri` advisory with a non-forced fix available.
- [2026-10-21 baseline] Native-Wayland synthetic Electron probe succeeded against a private headless GNOME compositor. Development checkout required the documented dev-only sandbox bypass because Ubuntu AppArmor blocks unprivileged Electron source checkouts; packaged sandbox verification remains pending.
- [bootstrap] Kit created; no upstream source cloned or changed by this pack.

## Remaining risks
- Enterprise sign-in may restrict Electron-based clients. Do not bypass. Record exact non-sensitive error and continue.
- Microsoft Outlook web DOM may change, breaking injected notification observers.
- GNOME tray icons may require a separately installed shell extension; do not install without user permission.
- First phase is web-backed and does not provide full native offline parity.
