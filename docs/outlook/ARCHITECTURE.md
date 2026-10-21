# Architecture and code map

```text
Ubuntu GNOME / Wayland
  ├── .desktop launcher / xdg-open / MIME handlers
  ├── GNOME notifications, tray (if shell extension available)
  └── Electron application (Prospect Mail)
       ├── src/main.js — startup, userData profile and desktop app-id
       ├── src/settings.js — settings and migration
       ├── src/controller/mail-window-controller.js — window, OWA navigation, SSO recovery, routing
       ├── src/controller/url-router.js — pure URL/protocol parsing and routing policy
       ├── src/controller/federated-auth-policy.js — bounded tenant IdP redirect chain
       ├── src/controller/ipc-validation.js — origin/frame/payload IPC validation
       ├── src/controller/download-security.js — safe suggested attachment filenames
       ├── src/controller/recovery-policy.js — pure auth/network reload decisions
       ├── src/controller/preload.js — strict IPC facade
       ├── src/controller/tray-controller.js — tray/settings/unread state
       └── public/* — minimal injected Outlook UI observer
            └── https://outlook.cloud.microsoft/mail (first-party Outlook web UI)
```

Microsoft Entra login and Outlook back-end stay on Microsoft's side. The Electron main process should never receive browser auth tokens, email bodies, calendar descriptions or attachment contents unless essential for ordinary browser download workflow. Avoid additional Graph registration/permissions for MVP.

The main Outlook renderer alone receives the narrow preload API. Every IPC message must come from its current main frame on an approved Microsoft origin and pass a channel-specific schema. Detached Outlook/auth windows use an intentionally empty preload.

Ordinary external pages never remain in the app window. An exception exists for enterprise federation: server redirects beginning at a Microsoft login page can learn a bounded HTTPS IdP chain for that `WebContents`. Those pages are still unprivileged because IPC origin checks remain Microsoft-only.

## Cross-app links
- Outlook → Teams: recognise known HTTPS Teams invite URLs and supported `msteams:` URLs, then delegate safely to `shell.openExternal` / XDG scheme handler. Use platform's registered handler; do not hardcode the user's Teams binary path or run shell commands with URL interpolation.
- Teams → Outlook: OS-level `mailto:` and documented Outlook web deep links. The package advertises the handler in desktop metadata but never silently replaces the user's browser/email defaults.
- Unknown/external links: default browser after validation, with web-content navigation constrained by source-origin and destination policies. Handle `about:blank`/`blob:` Outlook compose flows carefully; do not globally allow every URL.

## Wayland
Use native Ozone Wayland where tested. GNOME xdg-desktop-portal isn't required for Outlook's ordinary email workflow, but remains available for file pickers. Focused notification activation uses correct `.desktop` app ID and **one** activation action. Electron tray visibility depends on GNOME configuration; no forced extension installation.

## Security
Preserve `contextIsolation: true`, sandbox in packaged builds, no Node integration for remote Outlook renderer, restricted IPC, external-link protocol/hostname validation; avoid logging full URLs with user query strings. See SECURITY.md.
