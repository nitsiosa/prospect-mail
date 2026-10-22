# Product specification — Ubuntu Outlook desktop prototype

## Problem and outcome
Engineering and product staff use Ubuntu (GNOME/Wayland) while their organisation uses Microsoft 365. We want a credible, maintainable Linux Outlook client with a dedicated desktop window, notifications and interop with a separate Teams for Linux client. First deliver a usable prototype; formal enterprise approvals follow a proof of concept. Authorised Microsoft login remains mandatory.

## Architecture decision
Phase 1: fork **Prospect Mail** and retain Microsoft's Outlook web app as the mail/calendar UI and protocol engine. That yields maximal Outlook functionality with no additional Microsoft Graph delegated consent for the core experience. Prospect Mail is not a reimplementation of Outlook's back end. Phase 2, only after phase 1 acceptance: evaluate native features/Graph where there is a concrete gap. Do not spend MVP time designing a new GTK mail engine or inventing offline support.

## User and environment
- Primary OS Ubuntu (version discovered locally), GNOME Wayland (`XDG_SESSION_TYPE=wayland`), x86_64 initially. Browser may be Firefox.
- Microsoft 365 **work/school account** with enterprise Entra SSO and interactive MFA. Don't assume personal Outlook.com support.
- Existing Teams for Linux prototype is a separate program. Integrate via URL/deep-link handling, not a shared secret/token store.

## Must-have P0 behaviours
| ID | Behaviour | Acceptance evidence |
|----|-----------|--------------------|
| OUT-01 | Sign in with corporate Microsoft 365 account and remain signed in through ordinary restarts | Manual sign-in and restart; no token logging |
| OUT-02 | Read/search/move/delete/archive emails and use folders | Manual representative mailbox workflow |
| OUT-03 | Compose/reply/reply-all/forward with attachments | Manually send to approved test recipient, receive and verify |
| OUT-04 | Calendar day/week/month, create/edit events, respond to invitations, scheduling UI | Manually use test calendar/event and delete after test |
| OUT-05 | Outlook People/contact lookup where tenant permits | Manual lookup without leaking identity into diagnostics |
| OUT-06 | Desktop new-mail/reminder notification while hidden; clicking focuses existing window on Wayland | Manual GNOME test; automated controller tests |
| OUT-07 | `mailto:` links trigger compose with safely encoded `to`, `cc`, `subject`, `body` if supported by Outlook; fall back safely | Unit tests + browser/OS manual test; no execution, CRLF injection or URL truncation |
| OUT-08 | Teams meeting invite links open the separately installed Teams client if OS handler configured; HTTPS fallback opens default browser | Automated URL routing tests + manual meeting-invite click |
| OUT-09 | Outlook calendar/mail deep links open correct content, not duplicate uncontrolled windows | Automated routing + manual meeting/email deeplink |
| OUT-10 | Attach and download documents with correct picker, permissions and safe filenames; PDF preview | Manual send/download test; automated path sanitization |
| OUT-11 | GNOME launcher, search, minimise, reopen, tray (where supported) and notification activation operate under Wayland | Manual session test |
| OUT-12 | `.deb` produced for Ubuntu x86_64, install/uninstall without altering other apps' profiles | Build artifact, package metadata and install checklist |
| OUT-13 | Suspend/resume and network recovery do not repeatedly wipe active draft or login | Automated scenarios and manual resume as feasible |

## P1 (only after P0 or in parallel if independent)
- Multiple work accounts via explicit isolated Chromium userData partitions; no mixed cookies or sharing across accounts. Treat this as a design spike until authenticated testing possible.
- Unread counts/notifications that remain correct as Outlook's web DOM evolves.
- Configurable hotkeys and GNOME desktop polish, safe diagnostics bundle, performance profiling.
- Optional `.ics` import flow: prefer system-handler or Outlook web UI. Do NOT claim native calendar-import support without real verification.

## Out of scope for this iteration
- Full offline sync of mailbox or calendar; reliable offline compose/sending; native Exchange/Graph mail engine.
- Microsoft proprietary protocol cloning, scraping auth tokens, reverse-engineering backend services, bypassing corporate policy.
- Rebuilding Teams, integrated VoIP/WebRTC media, remote control.
- Third-party marketplace distribution or production rollout.

## Product quality bar
No login-blocking regressions, no exposed credentials, robust error states, consistent desktop focus/notifications. Prefer upstreamable modules and small, reviewable commits. Document any unavoidable differences from Windows Outlook rather than promising perfect parity.
