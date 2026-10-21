# Prototype build, install and live validation

## Candidate

- Source commit: `2a239ed5cc1fa9673989e4005aa43c93084b30b8`
- Branch: `feat/outlook-wayland-ubuntu`
- Fork: <https://github.com/nitsiosa/prospect-mail>
- Draft PR: <https://github.com/nitsiosa/prospect-mail/pull/1>
- Debian package: `dist/prospect-mail_1.3.1_amd64.deb`
- Package name/version/architecture: `prospect-mail` / `1.3.1` / `amd64`
- SHA256: `fd0016add314bd5133279a8ca5313011203382d3995a8ee6596e2399bbdd2008`
- Node tests: 45 passed, 0 failed
- Production dependency audit: 0 vulnerabilities
- Packaged archive native-Wayland smoke: passed with a synthetic Outlook page
- Installed sandbox runtime: `NEEDS_HUMAN` (static package/AppArmor checks passed)

No package was installed while producing this candidate, no OS default was changed, and no Microsoft account was used.

## Reproduce the build

Use Node 24:

```bash
npm ci
npm test
npm audit --omit=dev
npm run dist:linux:deb:x64 -- --publish never
scripts/check-deb.sh
```

Review without installation:

```bash
dpkg-deb --info dist/prospect-mail_1.3.1_amd64.deb
dpkg-deb --contents dist/prospect-mail_1.3.1_amd64.deb
echo 'fd0016add314bd5133279a8ca5313011203382d3995a8ee6596e2399bbdd2008  dist/prospect-mail_1.3.1_amd64.deb' | sha256sum -c -
```

## Install on Ubuntu

First record the current mail handler; installation registers Prospect Mail as a choice but must not change this value:

```bash
xdg-mime query default x-scheme-handler/mailto
sudo apt install ./dist/prospect-mail_1.3.1_amd64.deb
xdg-mime query default x-scheme-handler/mailto
```

If version 1.3.1 is already installed, use `sudo apt install --reinstall ./dist/prospect-mail_1.3.1_amd64.deb`.

Launch “Prospect Mail” from GNOME. Its primary desktop entry explicitly uses native Wayland. CLI equivalents:

```bash
prospect-mail --ozone-platform=wayland
prospect-mail --ozone-platform=x11   # diagnostic fallback only
```

Do not add `--no-sandbox` to an installed launch. On Ubuntu 24.04 the package post-install script supplies the AppArmor/user-namespace integration needed by Chromium.

## Consolidated Microsoft 365 validation

Use only an approved test recipient, expendable test message/event and non-sensitive attachment.

1. Confirm `echo "$XDG_SESSION_TYPE"` returns `wayland`, verify the package hash above, launch from GNOME and complete the normal Entra/MFA flow.
2. Quit and relaunch. Confirm the authorised session persists and no login loop appears.
3. Open/search mail; archive, move and delete an expendable test message.
4. Compose, reply, reply-all and forward to the approved test recipient. Attach one benign test file; receive/download a test PDF or Office attachment and verify the save dialog and preview.
5. Open Calendar in day/week/month views. Create and update a test event, respond to a test invitation, delete the event if appropriate, and open People/contact search.
6. Hide or minimise the app. Receive a test message and calendar reminder; confirm a GNOME notification appears and one click focuses the existing window without a duplicate or “app is ready” prompt. Notification text should remain generic unless “Show Notification Details” was enabled.
7. Click Join in a Teams invitation. Confirm the installed Teams handler opens; if unavailable, confirm the HTTPS meeting page opens in the default browser.
8. Without changing the OS default, test compose directly:

   ```bash
   prospect-mail 'mailto:test-recipient@example.invalid?subject=Prospect%20Mail%20test&body=Line%201%0ALine%202'
   ```

   Replace the placeholder with an approved address and confirm one existing app window shows correctly populated fields.
9. Start a harmless draft, then test lock/suspend-resume and network disconnect/reconnect. Avoid closing the draft until its contents are confirmed intact.
10. Confirm GNOME launcher reopen, hide/show, quit and tray behavior. Absence of a tray icon on stock GNOME without AppIndicator support is an environment limitation, not permission to install an extension automatically.

Record only PASS/FAIL, package hash, Ubuntu version and privacy-redacted error codes. Do not capture credentials, cookies, tokens, tenant identifiers, mailbox content, addresses, subjects or event details.

## Optional `mailto:` default selection

Only if desired after the direct test:

```bash
previous_mail_handler="$(xdg-mime query default x-scheme-handler/mailto)"
xdg-mime default prospect-mail.desktop x-scheme-handler/mailto
xdg-open 'mailto:test-recipient@example.invalid?subject=Prospect%20Mail%20handler%20test'
```

Restore the previous handler in the same shell with:

```bash
xdg-mime default "$previous_mail_handler" x-scheme-handler/mailto
```

## Uninstall and rollback

```bash
sudo apt remove prospect-mail
```

Removal unloads/removes the package AppArmor profile and executable alternative. It intentionally preserves `~/.config/prospect-mail`, including the ordinary Electron session/profile, so uninstall does not destroy account data. Do not delete that directory unless the user separately decides to remove the local profile and understands that sign-in/session data will be lost.
