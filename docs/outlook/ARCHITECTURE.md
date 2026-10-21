# Architecture and code map

```text
Ubuntu GNOME / Wayland
  ├── .desktop launcher / xdg-open / MIME handlers
  ├── GNOME notifications, tray (if shell extension available)
  └── Electron application (Prospect Mail)
       ├── src/main.js — startup, userData profile and desktop app-id
       ├── src/settings.js — settings and migration
       ├── src/controller/mail-window-controller.js — window, OWA navigation, SSO recovery, routing
       ├── src/controller/preload.js — strict IPC facade
       ├── src/controller/tray-controller.js — tray/settings/unread state
       └── public/* — minimal injected Outlook UI observer
            └── https://outlook.cloud.microsoft/mail (first-party Outlook web UI)
```

Microsoft Entra login and Outlook back-end stay on Microsoft's side. The Electron main process should never receive browser auth tokens, email bodies, calendar descriptions or attachment contents unless essential for ordinary browser download workflow. Avoid additional Graph registration/permissions for MVP.

## Cross-app links
- Outlook → Teams: recognise known HTTPS Teams invite URLs and supported `msteams:` URLs, then delegate safely to `shell.openExternal` / XDG scheme handler. Use platform's registered handler; do not hardcode the user's Teams binary path or run shell commands with URL interpolation.
- Teams → Outlook: OS-level `mailto:` and documented Outlook web deep links. Only register the handler in desktop metadata and prompt user to select a default; do not silently replace their browser/email defaults.
- Unknown/external links: default browser after validation, with web-content navigation constrained by source-origin and destination policies. Handle `about:blank`/`blob:` Outlook compose flows carefully; do not globally allow every URL.

## Wayland
Use native Ozone Wayland where tested. GNOME xdg-desktop-portal isn't required for Outlook's ordinary email workflow, but remains available for file pickers. Focused notification activation uses correct `.desktop` app ID and **one** activation action. Electron tray visibility depends on GNOME configuration; no forced extension installation.

## Security
Preserve `contextIsolation: true`, sandbox in packaged builds, no Node integration for remote Outlook renderer, restricted IPC, external-link protocol/hostname validation; avoid logging full URLs with user query strings. See SECURITY.md.
