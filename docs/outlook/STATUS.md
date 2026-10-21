# Harbour Mail Wayland prototype — execution status

**Maintained by Cursor. Update after every phase.**

Project state: `READY_FOR_HUMAN_TESTING`
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
| D. GNOME Wayland integration | AUTO_PASS (installed + synthetic) | Installed Harbour Mail runs native Wayland with AppArmor, renderer sandbox/NoNewPrivs/Seccomp; synthetic focus/IPC/mailto smoke passes |
| E. Security hardening | AUTO_PASS (code) | Scoped IPC, guarded navigation/popups, private notification default, redacted logging, production audit clean |
| F. Debian build and handoff | AUTO_PASS (build/install) / NEEDS_HUMAN (uninstall) | Harbour Mail package built, inspected, upgraded in place and launched; profile/default handler preserved |

Automated tests: `AUTO_PASS — 54/54 local Node tests; source, packaged-archive and installed native-Wayland validation; remote Test and full cross-platform Build & Release matrix green, 2026-10-21`
Security review: `AUTO_PASS (source/runtime boundaries) — npm audit --omit=dev: 0 vulnerabilities; full audit: 8 moderate development-only findings in electron-builder's legacy global-agent chain`
Debian artifact: `dist/prospect-mail_1.3.1_amd64.deb — SHA256 f1521baab78d288bda2a3bf7b69452e96a47a758f54d54180d4f696d5bccec73`
Ready for human testing: `YES — local and remote automated gates green; live acceptance is not implied`
Live corporate acceptance: `NOT_RUN`

## NEEDS_HUMAN queue
- Complete the single consolidated Microsoft 365 checklist in `INSTALL_AND_TEST.md`: sign-in/MFA/session persistence; mail/attachments; calendar/RSVP/People; notifications/focus; Teams; mailto; suspend/network recovery; launcher/tray/quit.
- Do not provide credentials, tokens, cookies, tenant IDs or private mailbox/calendar content.

## Recent activity (prepend entries)
- [2026-10-21 Harbour rebrand] Renamed all user-visible app/package/window/tray/notification/About surfaces to Harbour Mail and replaced package/runtime/macOS artwork with the supplied Harbour Tide icon. Retained `prospect-mail` technical IDs and the existing profile/session.
- [2026-10-21 installed validation] Upgraded the installed package in place to `/opt/Harbour Mail`, confirmed old files were removed, profile mode remained 0700, AppArmor points to the new path, the renderer has sandbox + `NoNewPrivs=1` + `Seccomp=2`, and native Wayland is active.
- [2026-10-21 mailto correction] Real installation showed that a system desktop `MimeType` can alter Ubuntu's fallback mail handler. Removed that association, restored/verified Thunderbird, and added an explicit reversible tray opt-in using a user-level desktop entry.
- [2026-10-21 Harbour artifact] Built and inspected `prospect-mail_1.3.1_amd64.deb`; final SHA256: `f1521baab78d288bda2a3bf7b69452e96a47a758f54d54180d4f696d5bccec73`.
- [2026-10-21 audit follow-up] Scoped publish credentials to tag-only steps, removed unnecessary package-write permission, disabled checkout credential persistence, made changelog Git calls shell-free with existing-tag validation, and added command-injection regressions. Recovery now avoids visible/focused draft reloads and allows only one hidden network reload until a successful load.
- [2026-10-21 audit rebuild] Rebuilt and re-inspected the Debian candidate after audit follow-ups; this artifact was superseded by the Harbour Mail rebrand.
- [2026-10-21 remote green] Draft PR #1 is mergeable/clean. Both Test checks, Linux x64/arm64, standalone ARM64 Snap, Windows x64/arm64 and macOS x64/arm64 builds pass. There are no review comments, inline comments or reviews.
- [2026-10-21 remote repair] Remote unit tests and Windows x64/macOS arm64 builds passed. Both actual failures were the same unreleased electron-builder Core24 desktop-mapping bug; other matrix jobs were fail-fast cancellations. Backported merged upstream PR #10176 exactly, added an idempotence/installed-code regression, and verified the generated Snap descriptor locally.
- [2026-10-21 rebuilt artifact] Rebuilt and re-inspected the Debian candidate after the packaging backport.
- [2026-10-21 remote CI] With explicit approval, enabled inherited GitHub Actions on the new fork. `Test`, `Build & Release`, and the tag/manual-only release-notes workflow are active; the next docs-only push triggers the applicable test/build workflows.
- [2026-10-21 remote] Created `nitsiosa/prospect-mail`, pushed all four commits and opened draft PR #1 against the fork's `main`. The PR is mergeable/clean with no comments or reviews, but GitHub reports zero workflows/check runs, so remote CI is not green or verified.
- [2026-10-21 release candidate] Built `prospect-mail_1.3.1_amd64.deb`; desktop/control/AppArmor/permissions/archive checks pass.
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
