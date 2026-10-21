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
| A. Baseline and upstream audit | IN_PROGRESS | Source and CI inspected; `npm ci` completed; upstream tests 10/10 pass |
| B. Link routing and mailto | NOT_STARTED | Tests + safe routing |
| C. Mail/calendar/attachments | NOT_STARTED | Verify existing OWA, close gaps |
| D. GNOME Wayland integration | NOT_STARTED | Launcher/tray/notification tests |
| E. Security hardening | IN_PROGRESS | Baseline audit found substring URL routing, unscoped IPC, sensitive URL logging, and one production dependency advisory |
| F. Debian build and handoff | NOT_STARTED | .deb path/hash + manual steps |

Automated tests: `AUTO_PASS — 10/10 upstream tests, npm test, 2026-10-21`
Security review: `IN_PROGRESS — npm audit --omit=dev reports fast-uri high severity; source findings queued for repair`
Debian artifact: `NONE`
Ready for human testing: `NO`
Live corporate acceptance: `NOT_RUN`

## NEEDS_HUMAN queue
- Corporate sign-in/MFA and live mailbox/calendar checks are deliberately deferred until the local candidate is complete.
- Remote fork/PR validation cannot run until GitHub CLI authentication is restored. Local work continues independently.

## Recent activity (prepend entries)
- [2026-10-21 baseline] Cloned upstream `main` at `da1c55f`, created the feature branch, copied this implementation kit, inspected all source/package/CI files, and ran the privacy-safe doctor.
- [2026-10-21 baseline] `npm ci` completed with Electron 42.10.1; `npm test` passed 10/10. `npm audit --omit=dev` found one high-severity transitive `fast-uri` advisory with a non-forced fix available.
- [2026-10-21 baseline] Native-Wayland synthetic Electron probe succeeded against a private headless GNOME compositor. Development checkout required the documented dev-only sandbox bypass because Ubuntu AppArmor blocks unprivileged Electron source checkouts; packaged sandbox verification remains pending.
- [bootstrap] Kit created; no upstream source cloned or changed by this pack.

## Remaining risks
- Enterprise sign-in may restrict Electron-based clients. Do not bypass. Record exact non-sensitive error and continue.
- Microsoft Outlook web DOM may change, breaking injected notification observers.
- GNOME tray icons may require a separately installed shell extension; do not install without user permission.
- First phase is web-backed and does not provide full native offline parity.
