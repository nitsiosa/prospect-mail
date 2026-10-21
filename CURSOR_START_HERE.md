# Cursor: Ubuntu Outlook Desktop — autonomous implementation assignment

**You are the implementation owner. Start coding, do not stop after planning.**

## Outcome
Deliver an installable, usable Ubuntu/Wayland Microsoft 365 Outlook desktop client by forking and incrementally enhancing **Prospect Mail** (`julian-alarcon/prospect-mail`). The client must support corporate Microsoft 365 mail, calendar, contacts/people, attachments, meeting invitations, GNOME notifications, `mailto:` and Teams meeting links. Use the existing Outlook web application for phase 1. Native Microsoft Graph implementation is out of MVP scope.

Read in this order: `AGENTS.md`, `.cursor/rules/outlook-wayland.mdc`, `docs/outlook/PRODUCT_SPEC.md`, `docs/outlook/IMPLEMENTATION_PLAN.md`, `docs/outlook/ACCEPTANCE_TESTS.md`, `docs/outlook/SECURITY.md`. Then inspect the actual upstream code; the plan is a starting map, not a substitute for repository inspection.

## Execution contract
1. At session start examine `docs/outlook/STATUS.md` and `git status`. Resume unfinished phase. Make small changes in a feature branch; never work on upstream's `main` or overwrite unrelated user changes.
2. Establish baseline first (`npm ci`, `npm test`, `npm start` as available); record actual results, including any failures already present upstream. Inspect actual scripts and source before proposing modifications.
3. Implement in priority order. Write tests for each functional improvement. Run relevant tests after each step and full suite before each commit; build a Linux `deb` before marking release candidate.
4. For decisions not requiring credentials, payment, destructive actions or security exceptions, decide yourself and log in `DECISIONS.md`. Avoid waiting for confirmation. If a task is blocked by live sign-in, MFA, tenant permissions or human UI verification, mark it `NEEDS_HUMAN` in `STATUS.md` with precise instructions and continue with remaining independent tasks.
5. Keep `STATUS.md` up to date after each phase (commits, tests, percent complete, next action, blockers, artifact path). Do not claim user acceptance based on mocks, CI or screenshots.
6. Do NOT ask for review of every commit, configuration option, refactor or phase. Minimize interactions. The user will do one consolidated real-session validation when the candidate is ready.
7. Push to the user's fork when git credentials permit. Opening a **draft** PR to the user's fork is allowed if the repository has appropriate permissions. Do not open an upstream PR, merge, publish releases or publish packages on registries without explicit authorisation.
8. Leave user account data, local system defaults and global application settings unchanged unless the user explicitly approves the change. Never execute destructive resets or send real emails on behalf of the user without approval.

## Current upstream facts (verify again after cloning)
- Repository: https://github.com/julian-alarcon/prospect-mail ; default branch `main`; MIT.
- `package.json` on inspected `main`: version `1.3.1` (latest published release at inspection was `1.3.0`), Node 24, Electron 42.x, entry `src/main.js`.
- `src/controller/mail-window-controller.js`: Outlook BrowserWindow, auth recovery, URL routing, injected observer.
- `src/settings.js`: default Outlook host `https://outlook.cloud.microsoft/mail` and URL/settings configuration.
- `src/controller/preload.js`: renderer-to-main IPC bridge.
- `src/controller/tray-controller.js`: notifications/tray/startup settings.
- `public/`: injected client scripts.
- `npm test` (Node built-in test runner), `npm run dist:linux:deb:x64` (Debian packaging on x86_64).
- `CONTRIBUTING.md` describes Linux builds and release rules; preserve Node/Electron pins unless an upgrade is justified and tested.

## Scope guardrails
**P0: mail, calendar, contacts, mailto, links, notifications, deep links, Wayland, .deb packaging.**
**P1: account profiles, better diagnostics and optional integration polish.**
**Deferred: a native Graph backend, full offline synchronization, creating a Teams calling stack, remote-control capability, proprietary auth/protocol bypass and Windows/macOS redesign.**

## First actions (immediate)
- Run `bash scripts/doctor.sh`, capture *sanitized* output in `STATUS.md`.
- Audit package scripts, tests, window navigation, auth, IPC, permissions, sandbox, security, and mailto handling. Mark implemented vs missing features; don't duplicate upstream features.
- Create a failing automated test for the first reproducible gap and implement the smallest robust fix.
- Repeat through `IMPLEMENTATION_PLAN.md`, building and validating after each milestone.

## Definition of done
Every automatable P0 test green or explicitly justified; release-candidate `.deb` built; security checks documented; no private mailbox data in logs; real-session checks listed accurately as passed / failed / not yet executed; concise handoff showing the exact next human actions.
