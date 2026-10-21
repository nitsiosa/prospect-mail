# Harbour Mail

<img src="build/icon.png" alt="Harbour Mail logo" height="80" align="center" />

[![Build & Release](https://github.com/nitsiosa/prospect-mail/actions/workflows/build-release.yml/badge.svg)](https://github.com/nitsiosa/prospect-mail/actions/workflows/build-release.yml)

Harbour Mail is an unofficial Microsoft Outlook desktop client based on the
MIT-licensed Prospect Mail project. It uses the
[Web App](https://www.microsoft.com/en-us/microsoft-365/outlook/web-email-login-for-outlook)
and wraps it as a standalone application using Electron. This only works for
Microsoft/Office 365 accounts, don't use it for personal Outlook.com accounts.

Available for Linux, Windows (10+) and macOS.

> [!IMPORTANT]
> This project has NO DIRECT AFFILIATION with Microsoft, Microsoft 365 or any
> product made by Microsoft.

## Build artifacts

This Harbour Mail fork is currently distributed as a tested prototype build.
Build from this repository and select the appropriate artifact for your OS:

- Windows: `.exe` file or `.msi` file
- macOS: `.dmg` file
- Linux: Multiple artifacts are available, please choose your needed one
(`AppImage`, `deb`, `flatpak`, `pacman`, `rpm`, `snap`, `tar.gz`) depending on
your Linux Distribution.

## Installation

### Windows

Just double-click and follow the Installer steps.

### macOS

Double-click the `dmg` file and drag the Harbour Mail icon to the App
folder

### Linux

Install the locally built `.deb`, AppImage, Flatpak, RPM, pacman, Snap or
tarball artifact. The technical package/executable name remains
`prospect-mail` for upgrade and profile compatibility.

## Screenshots

![screenshot-linux](misc/prospect-mail.png)

![screenshot-calendar-view](misc/calendar-view.png)

## Features

- Check your Outlook Microsoft 365 emails/calendar from the desktop app
- Close to minimize
- Start minimized: toggle via tray icon Settings menu, or use command-line
flag `prospect-mail --minimized`
- Dock tray support
- System notification
- Privacy-first calendar notifications (details are opt-in)
- Safe `mailto:` compose with explicit desktop-handler opt-in, plus Teams meeting-link handoff
- Native Wayland launcher with an explicit X11 fallback
- Connect to standard or custom Outlook URL
- Spellcheck using native Outlook MS Editor
- Visualize files (pdf) in emails
- Automatic session recovery: expired auth cookies are cleaned at startup and
  on wake-from-sleep; if the Outlook session expires, the app auto-reloads to
  silently re-authenticate via SSO, and falls back to a desktop notification if
  re-login is still needed

## Settings

Via tray menu `settings.json` can be opened and edited. After every save you
need to click in "Reload settings" to apply changes.

On installed Linux packages, **Settings → Use Harbour Mail for Mail Links…**
offers an explicit, reversible `mailto:` default-handler choice. Installing the
package alone does not register or change the desktop mail handler.

### Available Settings

```json
{
  "urlMainWindow": "https://outlook.cloud.microsoft/mail",
  "showWindowFrame": true,
  "hideOnClose": true,
  "hideOnMinimize": false,
  "startupWindowState": "normal",
  "showUnreadNotifications": true,
  "showNotificationContent": false,
  "unreadNotificationSource": "inbox",
  "customBrowserPath": "microsoft-edge"
}
```

#### Setting Descriptions

| Setting             | Description                                                                                  | Default                           |
| ------------------- | -------------------------------------------------------------------------------------------- | --------------------------------- |
| `urlMainWindow`     | Supported HTTPS Outlook service URL to load; the host must be a known Microsoft Outlook host | `https://outlook.cloud.microsoft/mail` |
| `showWindowFrame`   | Show/hide window frame and title bar                                                         | `true`                            |
| `hideOnClose`       | Minimize to tray instead of quitting when closing window                                     | `true`                            |
| `hideOnMinimize`    | Hide to tray when minimizing (off by default: minimize stays in the taskbar; restore via tray → Show if enabled) | `false`     |
| `startupWindowState`| Window state on startup: `"normal"`, `"minimized"`, or `"maximized"` (also available via tray menu; `--minimized` flag forces minimized) | `"normal"`     |
| `showUnreadNotifications` | Show the "new messages" desktop notification (calendar reminders are unaffected; also available via tray menu) | `true`                  |
| `showNotificationContent` | Include calendar subject/time/location in desktop notification bodies; off by default for lock-screen privacy | `false` |
| `unreadNotificationSource` | Which folders drive the unread badge and new-mail notifications: `"inbox"` (Inbox only) or `"favorites"` (sum of unread across your Outlook Favorites) | `"inbox"`     |
| `customBrowserPath` | Custom browser for external links. Use command name (e.g., `"firefox"`) or full path        | System default                    |

> [!NOTE]
> Settings from before 1.3.0 are migrated automatically on first launch:
> `startMinimized`/`startMaximized` become `startupWindowState`, and
> `disableUnreadNotifications` becomes `showUnreadNotifications` (inverted). No
> manual action is needed.

> [!NOTE]
> `outlook.cloud.microsoft` is Microsoft's unified-domain Outlook host and is
> now the default. The legacy `office.com` / `office365.com` / `live.com` hosts
> still work. Existing installs keep their saved `urlMainWindow`; use "Restore
> Default Settings" in the tray menu to adopt the new default.

> [!NOTE]
> Older `urlsInternal`, `urlsExternal`, and `safelinksUrls` settings are ignored.
> Routing now uses parsed URLs and a fixed Microsoft host/scheme allowlist so a
> configuration typo cannot make an unrelated site a privileged app page.

### Example Configuration for Personal Outlook

This configuration will let you use Harbour Mail with a personal Outlook.com account:

> [!WARNING]
> Please notice that Harbour Mail is only tested in Work/Educational accounts
> and no issues will be reviewed on use for personal accounts.

```json
{
  "urlMainWindow": "https://outlook.live.com/mail/"
}
```

### Architecture components

The main software architecture components and their versions are this:

- [Node.js](https://nodejs.org/en/about/previous-releases#release-schedule)
version: 24.x LTS
- [npm](https://docs.npmjs.com/) (comes with Node.js)
- [electron](https://www.electronjs.org/docs/latest/tutorial/electron-timelines)
version: 42.x (pinned)
- [electron-builder](https://www.electron.build/) version: 26.x
- [electron-store](https://github.com/sindresorhus/electron-store)
  version: 8.2.0

## Build

Clone the repository and run in development mode.
(You need to have [git](https://git-scm.com/) and node installed)

```shell
git clone https://github.com/nitsiosa/prospect-mail.git
cd prospect-mail
npm install
npm start
```

**Note:** If you encounter a sandbox error on Linux, run:
`ELECTRON_DISABLE_SANDBOX=1 npm start`. See
[CONTRIBUTING.md](CONTRIBUTING.md#troubleshooting-sandbox-issues) for details.

Build the application for Linux

```shell
npm run dist:linux
```

This will build AppImage, deb, pacman, rpm, flatpak, snap and tar.gz files in
the dist folder. These files can be run in most popular Linux distributions.

You can specify a specific build type:

```shell
npm run dist:linux:snap
npm run dist:linux:flatpak
npm run dist:linux:appimage
```

Build the application for macOS (arm64 and x64)

```shell
npm run dist:mac
```

Build it for windows:

```shell
npm run dist:windows
```

### Install developer artifact

Once it has been built, or using the release files available, you can install
the files using:

- AppImage: Follow the [AppImage
  process](https://docs.appimage.org/user-guide/faq.html#question-how-do-i-run-an-appimage)
- Deb: `sudo dpkg -i prospect-mail_x.y.z_arch.deb`
- Snap: `sudo snap install dist/prospect-mail_x.y.z_arch.snap --dangerous`
- Flatpak: `flatpak install --user dist/prospect-mail_x.y.z_arch.flatpak`

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for
guidelines on how to contribute to this project, including development setup,
coding standards, and the release process.

## License

[MIT](LICENSE). Harbour Mail retains the original Prospect Mail copyright and
attribution by [Julian Alarcon](https://desentropia.com), based on
[electron-outlook](https://github.com/eNkru/electron-outlook) by
[Howard J](https://enkru.github.io/)
