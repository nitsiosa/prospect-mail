# Security and privacy constraints (mandatory)

This application renders a privileged corporate mailbox via untrusted-by-default web content. Reliability does not excuse weakening Electron security or tenant policy.

## Authentication and data
- The prototype uses Microsoft's existing Outlook web sign-in and session handling; no custom password capture, token interception, reverse-proxy of Entra sign-in or bypass of Conditional Access.
- Do not export or persist Microsoft cookies, auth headers, session storage or refresh tokens outside Electron's ordinary isolated profile store. Keep profile directories private.
- No application-level Graph permissions or OAuth registration unless explicitly justified and approved later.
- `npm` scripts, logging, diagnostics and tests must not exfiltrate mail, contact or calendar content.
- For screenshots, use synthetic pages or redact mailbox/identity data. No test fixtures with real emails.

## Electron hardening
- `nodeIntegration: false` (explicitly set where helpful), `contextIsolation: true`, sandbox enabled in packaged builds. Avoid `webSecurity: false`, `allowRunningInsecureContent`, remote module, unsafe preload APIs.
- IPC allowlist by event, origin/frame identity validation and schema/type validation; avoid open-ended `send` or filesystem access bridges.
- Parse outbound URLs with `new URL`; validate scheme and normalized hostname, not substring/regex matching across a full raw URL. Validate both navigation and new-window paths, including redirects.
- External browser launching must use Electron `shell.openExternal` for validated destinations or `spawn(binary,[url])` with known command/binary if needed; never `exec`, `sh -c`, or interpolate URLs into shell commands.
- `mailto:` and `msteams:` require explicit protocol routing and user gesture/source checks when applicable. Block arbitrary native protocol launches from untrusted pages.
- Avoid disabling certificate checks or altering corporate root-store behaviour. Never instruct user to disable security policy.
- No persistent user-agent impersonation changes purely to defeat tenant access controls. Evaluate compatibility against authorised workflows.

## Logs
- Strip credentials, authentication query parameters, email addresses, profile paths containing usernames, message bodies, subject lines, attachment names, meeting IDs, mailbox/tenant identifiers, full URLs, and contact details.
- Existing upstream `console.log` of URL/settings is a review target; redact without destroying useful telemetry.
- Diagnostics should report only version, build, desktop session type, portal state, error codes and anonymised success/failure states. Opt-in for any detail expansion.

## Local machine and distribution
- Never silently change system default `mailto:` handler; register capability and let user opt in.
- Never auto-install untrusted binaries, remote shell scripts, system extensions, or certificate authorities.
- `ELECTRON_DISABLE_SANDBOX=1` is documented by upstream for local *development* only; forbidden for the `.deb` deliverable. If production sandbox won't work, block release and investigate.
- Preserve upstream MIT copyright/license and third-party notices; avoid proprietary Microsoft assets beyond those already legitimately included upstream.
- Do not publish enterprise-modified builds or logs publicly without review. Upstream contributions should be generic and contain no internal details.

## Security gate questions for Cursor
1. Could arbitrary web content cause a native protocol launch, local file read, command execution, or credential leak?
2. Could navigation to a lookalike hostname keep the trusted app chrome and a privileged preload?
3. Could the app log full URLs/token-bearing query params on auth redirects?
4. Could a setting cause remote content to load with insecure Electron options?
5. Are downloaded files opened automatically or saved to unsafe paths?
Resolve any high-risk issue before saying READY_FOR_HUMAN_TESTING.
