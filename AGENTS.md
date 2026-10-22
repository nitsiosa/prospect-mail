# Agent execution rules — Outlook on Ubuntu/Wayland

This file is the repository-level implementation contract for Cursor and other coding agents.

- **Own the implementation:** inspect, implement, test, repair, commit, repeat until the defined milestone is actually complete. Never stop at a plan.
- **Routine autonomy:** pick sensible defaults using upstream conventions; ask no speculative questions. Log material choices in `docs/outlook/DECISIONS.md`.
- **Priority:** reliable corporate Outlook mail + calendar on Ubuntu Wayland; prefer targeted improvements to Prospect Mail; preserve compatibility upstream.
- **Evidence:** distinguish `verified automatically`, `verified manually`, `not tested`, and `blocked`; never turn one into another. `npm test` alone is not Microsoft 365 acceptance.
- **Live-user boundary:** user signs in, performs MFA, approves consent where needed, sends test messages, and confirms real mail/calendar results. Never request, read, log or export credentials, session cookies, tokens or message contents.
- **Safety:** no `--no-sandbox` in packaged builds; do not bypass Conditional Access, security policy, SSL certificate checks, or application consent. Do not disable web security, node integration isolation or Electron security defaults as a shortcut.
- **Scoped writes:** feature branch only, no destructive cleanup of user data, no modifying OS-default mail client without opt-in, no package publishing, no upstream PR without consent.
- **Small commits:** conventional commit messages; validate relevant tests and node tooling before every commit; update `STATUS.md`.
- **Upstream:** preserve project MIT notices, follow `CONTRIBUTING.md`, keep patches narrowly scoped and upstreamable.
- **When blocked:** record a concise `NEEDS_HUMAN` entry in `STATUS.md` (exact action needed, why, what has been tested); move immediately to another independent item.
- **No arbitrary time/budget cap:** use sufficient tests and agent iterations for a high-quality working candidate; nevertheless avoid unnecessary rewrites.
- **Avoid fragile DOM hacks:** prefer existing Outlook web behaviour and Electron APIs; use injected DOM observers only for gaps not available elsewhere, always feature-gated and covered by regression tests.
