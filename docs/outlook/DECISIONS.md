# Engineering decision log

Cursor should add short dated records: context, options considered, selected approach, effect on testing, references to relevant commit. Routine choices do NOT require human review.

## D-001: Reuse Prospect Mail
Decision: Fork `julian-alarcon/prospect-mail` (MIT), use Outlook web UI/identity stack for first working Ubuntu Wayland client. Do not start a new GTK or Microsoft Graph implementation.
Rationale: provides existing mail/calendar functionality, corporate sign-in, notifications, tray, Electron `.deb` build and Linux fixes.

## D-002: Link interoperability
Decision: Use OS protocol handlers and safe validated URI routing for Outlook ↔ Teams, not a shared token store or custom Microsoft protocol implementation.

## D-003: Scope of native/offline implementation
Decision: Native Graph API, full offline sync and additional delegated consent are future work after a demonstrated prototype; not P0.

## D-004: Publication boundary
Decision: Push ordinary work to user's fork after verification, but do not create public upstream PRs, merge or publish releases without the user's explicit go-ahead.
