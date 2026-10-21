# Acceptance and regression matrix

States must be one of: `AUTO_PASS`, `HUMAN_PASS`, `FAIL`, `BLOCKED`, `NOT_RUN`. Recorded evidence: timestamp, test environment, commit, command/steps, result, and any privacy-redacted error. Never label a mock as live acceptance.

| ID | Test | Automation | Human 365 sign-in required? |
|----|------|------------|-----------------------------|
| T01 | Build starts with sandbox, contextIsolation enabled and no renderer Node integration | static + unit | No |
| T02 | Corporate account sign-in, MFA, mail visible | checklist | Yes |
| T03 | Restart preserves session without repeated prompts | checklist | Yes |
| T04 | Read/search/archive/move/delete test email | checklist | Yes |
| T05 | Compose/reply/reply-all/forward with attachment to approved test recipient | checklist | Yes |
| T06 | Inbox and PDF/Office attachment download, save path, file preview | mock + checklist | Yes |
| T07 | Calendar create/modify/RSVP test event; People search | checklist | Yes |
| T08 | GNOME new-mail and meeting reminders when app hidden | unit + checklist | Yes |
| T09 | Click notification focuses existing Wayland window (not second window/phantom prompt) | unit + checklist | Yes |
| T10 | `mailto:` to/cc/subject/body compose with safe escaping | pure unit + checklist | Yes for real compose |
| T11 | Outlook mail + calendar deep link opens expected item | routing unit + checklist | Yes |
| T12 | Teams invitation HTTPS link / msteams URI opens OS-registered handler if installed; otherwise default browser | routing unit + checklist | Yes for installed-handler UX |
| T13 | Unexpected URLs and lookalike hostnames safely delegated or blocked; `javascript:`, `file:`, `data:` blocked | unit | No |
| T14 | Deep link not auto-launched from untrusted frame, malformed URI or redirect | unit + integration | No |
| T15 | Download manager does not execute or auto-open files | static + unit + checklist | Some |
| T16 | Suspend/resume and disconnected/reconnected network without mail draft loss | unit + checklist | Yes |
| T17 | Window minimize/hide/restore, single instance, tray available depending on GNOME extension | unit + checklist | Some |
| T18 | .deb builds; control metadata and .desktop file match app ID; safe uninstall | build/static + optional install | No for build, yes for machine install |
| T19 | Existing upstream Node test suite passes | automated | No |
| T20 | No secrets, mailbox content or full auth URLs logged in production | static review + focused test | No |

## Current candidate evidence

Recorded 2026-10-21 on Ubuntu 24.04.5 GNOME Wayland x86_64, source commit `2a239ed5cc1fa9673989e4005aa43c93084b30b8`, package SHA256 `fd0016add314bd5133279a8ca5313011203382d3995a8ee6596e2399bbdd2008`.

`AUTO_PASS`:

- T01: explicit secure BrowserWindow preferences and packaged no-bypass checks pass; synthetic source and packaged-archive smoke reports sandboxed renderers. Installed Chromium sandbox launch remains part of T18's human install check.
- T13: scheme, lookalike, userinfo, malformed and encoded attack cases pass.
- T14: trusted-source native-protocol rules, secure popup isolation and federated redirect policy pass.
- T19: `npm test` passes 45/45, including the original upstream tests.
- T20: focused log/static checks pass; no secret-like material was found in changed source/fixtures.

Automated portions pass, but the end-to-end test remains `NOT_RUN` until live validation:

- T06: filename/path sanitisation and no-auto-open static check pass; real save/preview is not run.
- T08–T09: notification schema/privacy and single focus-action tests pass; GNOME delivery/click is not run.
- T10–T12: mailto, Outlook deep-link and Teams routing tests pass; real Outlook/handler behavior is not run.
- T15: save-dialog/no-execution checks pass; real attachments are not run.
- T16: auth/network reload policy tests pass; suspend/network draft preservation is not run.
- T17: single-instance/focus paths and a private native-Wayland smoke pass; installed launcher/tray behavior is not run.
- T18: `.deb` build, metadata, desktop validation, control-script syntax, payload permissions and archive allowlist pass; install/uninstall and installed sandbox runtime are not run.

T02–T05 and T07 are `NOT_RUN` because they require the user's authorised Microsoft 365 session. No test is marked `HUMAN_PASS`.

## Attack-oriented URL tests (do not require Outlook login)
- `https://outlook.cloud.microsoft.attacker.invalid/mail`, `https://outlook.cloud.microsoft@evil.invalid`, `https://evil.invalid/?redirect=https://outlook.cloud.microsoft/mail` **are not Microsoft hosts**.
- `javascript:alert(1)`, `file:///etc/passwd`, `data:text/html,...`, `shell:...` should be blocked by external-link router.
- `msteams:` must not be an arbitrary web-to-native launch from untrusted origins; verify user gesture and approved source when possible.
- `mailto:` subject/body CRLF, `%0d%0a`, huge bodies, Unicode, separators and repeated recipients should never become command arguments or malformed unescaped query params.
- Safe Links and Outlook deep links should resolve using parsed URL hostnames, not regex matching on arbitrary URL strings.
- `about:blank` and blob attachment/compose workflows are accepted only in expected Outlook web context; do not allow unbounded popup spawning.
- `window.open` from untrusted frame does not navigate app to phishing lookalike host in privileged window.

## Human validation script — use a test mailbox or approved messages
1. Confirm environment `echo "$XDG_SESSION_TYPE"` prints `wayland`; note Ubuntu version and installed `.deb` hash.
2. Launch, sign in via usual Entra flow and MFA yourself. Never paste credentials, cookies, tokens or mailbox captures into Cursor.
3. Test inbox search, open mail, move/delete an expendable test message, compose/reply to an approved recipient, attach one test file, download one test attachment.
4. Create calendar event with a test participant, update it, respond to invitation and delete it if appropriate; open People/contact UI.
5. Minimise/hide. Have test sender deliver a message. Confirm notification, unread indicator, click-to-focus on Wayland. Test a calendar reminder.
6. From a Teams meeting invitation, click Join: ensure current Teams for Linux or browser handles it; no remote-control functionality needed.
7. Open a real `mailto:` link (from terminal `xdg-open 'mailto:...'` only *after* user opts in to handler selection); verify recipient, subject, optional body and no duplicate windows.
8. Suspend/resume or lock/unlock, and disconnect/reconnect network; confirm usable session. Avoid causing data loss in a real unsaved draft.
9. Record PASS/FAIL for each ID in STATUS; attach redacted logs only (no sender/recipient, subject, body, tenant, token or private event metadata).

## Exit gates
- `READY_FOR_HUMAN_TESTING`: all automatable P0 tests passing or documented pre-existing unrelated fails, no high-risk security findings, `.deb` exists, human steps ready.
- `PROTOTYPE_ACCEPTED`: the human verified all P0 live workflows on their Ubuntu Wayland machine and any limitation is explicitly accepted.
- `PRODUCTION_APPROVED`: separate corporate security, IT, application consent and deployment processes (never automatic).
