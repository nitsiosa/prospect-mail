# Security review — Outlook Wayland release candidate

Date: 2026-10-21  
Source commit: `997b5517ad2db7353680ea34f4d4a60c5e126bbb`  
Artifact: `dist/prospect-mail_1.3.1_amd64.deb`  
SHA256: `a8d7296628c30038ddeb6848694e2ad926f450014615407cdc48e95fd71aa26c`

## Result

No unresolved high-risk source or packaged-runtime finding was identified. All production dependency advisories are resolved. Real tenant policy, installed-package sandbox behavior, notification display and mailbox workflows remain human validation items; this review does not treat the synthetic Outlook page as Microsoft 365 acceptance.

## Controls verified automatically

- Remote windows explicitly set `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`, `webSecurity: true`, `allowRunningInsecureContent: false` and `webviewTag: false`.
- Detached Outlook/auth windows use an empty preload. The synthetic Wayland smoke confirmed they do not expose `window.electronAPI`.
- Main-renderer IPC is scoped to its `WebContents`, requires the expected main frame and a trusted Microsoft origin, and validates each channel's payload shape/range.
- About-window IPC accepts fixed link identifiers only; its destinations are main-process constants. Its CSP no longer permits inline scripts.
- Navigation, redirects and `window.open` use WHATWG URL parsing, exact host/root checks and explicit scheme handling. Credential-bearing, malformed, `javascript:`, `data:`, `file:` and unknown native schemes are blocked.
- `msteams:` launch is restricted to recognised meeting paths from Outlook origins. Recognised Teams HTTPS links use the installed handler when present and retain an HTTPS browser fallback.
- Federated corporate sign-in may follow a bounded HTTPS redirect chain originating at a Microsoft login page. Dynamically learned IdP origins never pass the Microsoft-origin IPC check.
- `mailto:` parsing is bounded, preserves Unicode/quoted addresses, safely serialises fields with `URLSearchParams`, rejects raw/double-encoded control injection and never invokes a shell.
- External browser configuration uses `spawn(binary, [validatedUrl], { shell: false })`; ordinary links use `shell.openExternal` only after HTTP(S) validation.
- Attachment downloads receive a sanitised basename and Electron save-dialog options. The app does not set a silent save path, execute or auto-open downloads.
- Production logs contain no full URLs, auth query strings, cookie values, subjects, event details, attachment names or profile paths. Calendar notification details are opt-in and off by default.
- The Linux package advertises `mailto:` capability but contains no code that changes the user's default handler.
- The packaged app archive contains required runtime files and MIT license, but excludes tests, smoke harnesses, Cursor instructions, scripts and implementation documents.

## Dependency and package evidence

- `npm audit --omit=dev`: 0 vulnerabilities.
- Full `npm audit`: 8 moderate development-only findings in electron-builder's legacy `global-agent`/`roarr`/`sprintf-js` chain. npm proposes a forced breaking tool downgrade; it was not applied. These modules are not in the packaged app archive.
- Electron remains on upstream's 42.10.1 line.
- Debian control scripts pass `bash -n`; the desktop file passes `desktop-file-validate`.
- Package payload has no pre-set SUID file. Electron-builder's post-install script either uses user namespaces or sets the standard `chrome-sandbox` mode and installs its Ubuntu AppArmor `userns` profile.
- No packaged launcher or source file enables `--no-sandbox` or `ELECTRON_DISABLE_SANDBOX`.

## Test-only sandbox exception

Ubuntu AppArmor prevents Chromium from starting sandboxed from an arbitrary source checkout. The private headless-GNOME smoke script therefore sets `ELECTRON_DISABLE_SANDBOX=1` for that test process only. It verifies native Ozone Wayland behavior, BrowserWindow preferences, preload isolation, notification IPC and mailto routing. It is excluded from `app.asar`; installed-package sandbox execution is still `NEEDS_HUMAN`.

## Residual risks and limitations

- Microsoft's Outlook DOM can change and break unread/reminder observation; core mail/calendar UI remains Microsoft's web app.
- A tenant can deny Electron-based sign-in or require an unsupported IdP flow. Do not bypass Conditional Access; record only a privacy-redacted error.
- GNOME tray visibility depends on the user's shell/AppIndicator setup. No extension is installed automatically.
- Full offline mail/calendar synchronization and native Graph access are intentionally out of scope.
- Package installation and real attachment handling have not been executed automatically because they change the host and require human consent.
