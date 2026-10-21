# Outlook Wayland prototype — execution status

**Maintained by Cursor. Update after every phase.**

Project state: `LOCAL_CANDIDATE_READY_REMOTE_BLOCKED`
Fork: `https://github.com/nitsiosa/prospect-mail`
Draft PR: `https://github.com/nitsiosa/prospect-mail/pull/1`
Branch: `feat/outlook-wayland-ubuntu`
Upstream base SHA: `da1c55fa327a9f78ff065c62b4d172db481e8d3a`
Last update: `2026-10-21`
Environment: `Ubuntu 24.04.5 LTS / GNOME Wayland / x86_64 / Node 24.22.0 / npm 11.19.1`

| Workstream | State | Evidence / commit / next action |
|---|---|---|
| A. Baseline and upstream audit | AUTO_PASS | Source/CI inspected; clean install and baseline recorded |
| B. Link routing and mailto | AUTO_PASS | Parsed URL router, strict Teams/mailto handling, command-line activation, attack regression tests |
| C. Mail/calendar/attachments | AUTO_PASS (code) / NEEDS_HUMAN (live) | OWA supplies core UI; save-dialog filename hardening passes; real mailbox workflows not run |
| D. GNOME Wayland integration | AUTO_PASS (synthetic) | Native-Wayland smoke: main/popup security, notification IPC, focus path and mailto compose passed |
| E. Security hardening | AUTO_PASS (code) | Scoped IPC, guarded navigation/popups, private notification default, redacted logging, production audit clean |
| F. Debian build and handoff | AUTO_PASS (build) / NEEDS_HUMAN (install) | Debian package built/inspected; install and live checks not run |

Automated tests: `AUTO_PASS — 43/43 Node tests plus source and packaged-archive native-Wayland synthetic smoke, 2026-10-21`
Security review: `AUTO_PASS (source/runtime boundaries) — npm audit --omit=dev: 0 vulnerabilities; full audit: 8 moderate development-only findings in electron-builder's legacy global-agent chain`
Debian artifact: `dist/prospect-mail_1.3.1_amd64.deb — SHA256 a8d7296628c30038ddeb6848694e2ad926f450014615407cdc48e95fd71aa26c`
Ready for human testing: `YES LOCALLY — remote CI is unavailable; live acceptance is not implied`
Live corporate acceptance: `NOT_RUN`

## NEEDS_HUMAN queue
- GitHub Actions workflows exist in the fork's files but are not registered by GitHub for this new fork; the draft PR has zero check runs. Enabling fork Actions changes CI configuration and requires separate explicit approval. Remote validation remains unverified.
- Install the exact hashed `.deb` and confirm its sandboxed GNOME Wayland launch.
- Complete the single consolidated Microsoft 365 checklist in `INSTALL_AND_TEST.md`: sign-in/MFA/session persistence; mail/attachments; calendar/RSVP/People; notifications/focus; Teams; mailto; suspend/network recovery; launcher/tray/quit.
- Do not provide credentials, tokens, cookies, tenant IDs or private mailbox/calendar content.

## Recent activity (prepend entries)
- [2026-10-21 remote] Created `nitsiosa/prospect-mail`, pushed all four commits and opened draft PR #1 against the fork's `main`. The PR is mergeable/clean with no comments or reviews, but GitHub reports zero workflows/check runs, so remote CI is not green or verified.
- [2026-10-21 release candidate] Built `prospect-mail_1.3.1_amd64.deb`; desktop/control/AppArmor/permissions/archive checks pass. Final SHA256: `a8d7296628c30038ddeb6848694e2ad926f450014615407cdc48e95fd71aa26c`.
- [2026-10-21 packaged smoke] Loaded the final packaged `app.asar` against a synthetic Outlook origin on native Ozone Wayland; main/popup isolation, notification IPC and mailto compose passed. Test/development material is absent from the archive.
- [2026-10-21 auth compatibility] Added bounded federated HTTPS redirect handling for tenant IdPs while retaining Microsoft-origin-only IPC.
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
- Full dependency audit retains 8 moderate development-only findings in electron-builder's legacy `global-agent` chain; production audit is clean and npm's only proposed fix is a forced breaking tool downgrade.
- First phase is web-backed and does not provide full native offline parity.
