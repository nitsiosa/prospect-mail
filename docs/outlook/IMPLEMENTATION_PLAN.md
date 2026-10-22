# Execution roadmap (do the work, do not stop at analysis)

## P0-A: bootstrap and baseline
1. Verify repo status, Node/npm versions (`node -v` must satisfy repo engines), OS, GNOME Wayland; run `scripts/doctor.sh`. Read README, CONTRIBUTING, package scripts and existing tests.
2. Run `npm ci`, `npm test`, `npm start -- --ozone-platform=wayland` using isolated development profile if practical. Record pass/fail, screenshots only from non-sensitive pages, and crash logs without mailbox data.
3. Map current implementation against PRODUCT_SPEC, including which features are simply provided by Microsoft's web UI. Do not implement what already works.
4. Create work branch if absent; record upstream commit SHA in STATUS. Baseline commit only if new files are staged and tests documented.

## P0-B: routing, deep links, and local integration (highest coding value)
1. Inspect `src/controller/mail-window-controller.js` `setWindowOpenHandler`, window navigation, `openExternalLink`, `preload.js`, `src/settings.js`; identify string/regex matches that can match hostile lookalike domains or embedded paths.
2. Extract a **pure, unit-testable** URL routing/validation function (e.g. `src/controller/url-router.js`) with WHATWG URL parsing, exact hostname allowlists/subdomain rules and explicit schemes. Avoid `RegExp` on arbitrary full URL substrings. Never allow `javascript:`, `data:`, `file:`, shell commands, credentials in destination URLs, or `msteams:` destinations from unrelated/untrusted origins.
3. Define safe behaviour for Outlook mail/calendar deeplinks, Microsoft Safe Links, regular external websites, Teams meeting invite HTTPS URLs and `msteams:` links. Only open Teams deep links when user-initiated and/or originating from an approved Microsoft Outlook origin; block abusive unsolicited launches.
4. Handle `mailto:` on Ubuntu. Prefer Electron's supported `app.setAsDefaultProtocolClient` and/or documented `MimeType=x-scheme-handler/mailto` *without changing the user's default silently*. Parse mailto with standard URL semantics, length limits and field validation. Compose via a verified Outlook web compose deep link if supported (validate actual endpoint); otherwise use safe browser fallback and document gap. Cover quoted addresses, Unicode, subject, body, cc and query encoding. Don't falsely claim complete RFC 6068 compliance unless tested.
5. Add unit tests for URL parsing and origin validation, lookalike hostnames (e.g. outlook.cloud.microsoft.attacker.example), userinfo (`outlook.cloud.microsoft@evil.example`), encoded paths, `mailto:` injection, double URL encoding, malformed URLs, Safe Links and teams protocol handlers.
6. Keep redirects, popups and compose windows working; use an isolated test harness with mock pages, never production credentials.

## P0-C: mail, calendar, contacts, downloads
1. Verify corporate OWA UI already supplies mail/search/folders/contacts/calendar; avoid duplicate native Graph UI.
2. Inspect Outlook attachment downloads and file picker behaviour in Electron. Preserve safe download prompts and default location. Do not auto-open arbitrary attachments. Verify Outlook PDF preview/print.
3. Verify meeting invites (.ics or calendar links) work with existing OWA; implement safe registration/import UX only if supported and needed. Never silently insert calendar events.
4. Avoid auto-sending email in tests. Provide explicit manual recipient/sandbox test steps.
5. Add regression tests for click-to-open calendar and people sections where Electron UI can be mocked; mark real Microsoft 365 validation NEEDS_HUMAN.

## P0-D: GNOME / Wayland polish
1. Confirm `app.setDesktopName` matches packaged `.desktop` basename for `.deb` and that notification-click raises, without GNOME 'app is ready' false positive.
2. Ensure users can open/reopen Outlook after `hideOnClose`, minimise, resume, and browser-link activation; prevent duplicate process/profile windows.
3. Test notification semantics with window hidden; ensure message contents are not logged. Provide privacy-respecting notification setting if necessary.
4. Check tray behaviour under vanilla GNOME, distinguish absent extension from app defect. Never silently install shell extensions.
5. Check native Wayland operation (`--ozone-platform=wayland`) and fallback `--ozone-platform=x11` only if unavoidable, with an actionable diagnostics message.
6. Confirm corporate login in the existing system browser/embedded flow. Do not change user-agent spoofing or cookie expiry behaviour without specific regression evidence; avoid login loops that discard drafts.

## P0-E: hardening
1. Audit renderer IPC request validation; only accept events from trusted frame/origin and expected argument shapes/ranges. Verify renderer has no Node integration and context isolation remains enabled.
2. Audit `setWindowOpenHandler`, `will-navigate`, `shell.openExternal`, download handlers and desktop deep links for unintended command execution or web-to-file exposure.
3. Audit logging (`Loaded settings`, full URL console logs, browser web contents) for PII, auth codes and mailbox data. Redact origin/path as needed. Never log query, hash, cookies, tokens, message subjects/bodies, contact names or email addresses.
4. Run `npm audit --omit=dev` and evaluate findings; do not blindly upgrade Electron major because upstream pins it for tray/Snap compatibility.
5. Do not use `--no-sandbox`/`ELECTRON_DISABLE_SANDBOX` for deliverable. If dev environment needs it temporarily, mark it dev-only and explain; never hide a production sandbox failure.

## P0-F: tests, Debian build and handoff
1. `npm test` pass (document upstream pre-existing failures separately); add focused tests covering URL routing, protocol parsing, notifications, settings and auth recovery.
2. `npm run dist:linux:deb:x64` complete; inspect `dist/*.deb` with `dpkg-deb --info`, `dpkg-deb --contents`, `sha256sum`, permissions and desktop MIME fields.
3. Generate `docs/outlook/INSTALL_AND_TEST.md` with exact filename, commands, rollback/uninstall instructions, Wayland flags, and 10-minute human validation steps.
4. Run static/manual security checklist and tests, record findings; no mailbox credential capture.
5. Record outstanding NEEDS_HUMAN checks in `STATUS.md`, with clear specific instructions. Candidate is READY FOR HUMAN TESTING only if build/test quality bar met; mark ACCEPTED only when end-to-end checks have been confirmed by user.
6. Commit and push focused changes to fork (if credentials available). Do not publish a release, push tags, install globally, open upstream PR or claim production readiness without explicit approval.

## Optional P1 backlog — only after P0 or clearly parallel work
- Account profiles with isolated userData directories, opt-in switcher and complete isolation tests; never mix tenants in a common session.
- Notification deduplication, configurable alerts and keyboard shortcuts.
- More complete GNOME window/launcher integration and keyboard media controls if justified.
- Diagnostic command exporting only platform/build/version/errors with secrets redacted.
- A technical spike for native Graph-backed offline mode; requires separate design, permission review and clear new acceptance criteria.

## Work cadence
No speculative ETA needed. Iterate until all feasible tasks done. If user access is required, batch all live-session questions into ONE consolidated validation handoff, while continuing every other executable task. Update `STATUS.md` with source commit, phase, tests, artifacts, blockers and decisions before ending a Cursor session.
