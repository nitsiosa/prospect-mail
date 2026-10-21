# Microsoft 365 human handoff

Local candidate source: `2a239ed5cc1fa9673989e4005aa43c93084b30b8` on `feat/outlook-wayland-ubuntu`

Fork: <https://github.com/nitsiosa/prospect-mail>

Draft PR: <https://github.com/nitsiosa/prospect-mail/pull/1>

Artifact: `dist/prospect-mail_1.3.1_amd64.deb`

SHA256: `fd0016add314bd5133279a8ca5313011203382d3995a8ee6596e2399bbdd2008`

## Automatically verified

- 45 Node tests pass, including URL attacks, Teams/mailto, IPC, recovery, notification privacy, filename sanitisation, the Core24 packaging backport and static Electron/package controls.
- Native-Wayland synthetic smoke passes for source and packaged `app.asar`: secure main/popup preferences, no popup IPC, notification IPC, one app window and mailto compose.
- Production dependency audit has 0 vulnerabilities.
- Debian build, control scripts, desktop entry, Wayland/X11 actions, `mailto:` MIME declaration, AppArmor payload, file permissions and packaged archive allowlist pass.
- Security review found no unresolved high-risk issue.
- The remote branch and draft PR exist and are mergeable, but GitHub has not registered the inherited workflows for this new fork. Remote CI remains unverified.

## Not yet verified

No real Microsoft account, mailbox, calendar, contact, attachment, reminder or Teams invitation was used. Installed-package sandbox execution and GNOME interaction also remain unverified because the `.deb` was not installed automatically.

## One live validation session

Follow `docs/outlook/INSTALL_AND_TEST.md` and report PASS/FAIL for:

1. Package hash/install, GNOME Wayland launch, Entra sign-in/MFA and restart persistence.
2. Mail read/search/move/archive/delete and compose/reply/reply-all/forward with one approved attachment.
3. Attachment save dialog plus PDF/Office preview.
4. Calendar views, create/update/delete, invitation RSVP and People search.
5. Hidden/minimised new-mail and calendar notifications; click-to-focus without a duplicate window.
6. Teams meeting Join handoff or HTTPS fallback.
7. Direct `mailto:` compose without changing the current OS default.
8. Lock/suspend-resume and network disconnect/reconnect without draft loss.
9. Launcher, minimise/hide/reopen, tray where the GNOME environment supports it, and clean quit.

Never provide credentials, MFA codes, cookies, tokens, private addresses, message text, subjects, event details or tenant identifiers. A privacy-redacted error code and failing step are sufficient.

The prototype is not accepted or production-approved until these live checks and the organisation's normal security/IT review pass.
