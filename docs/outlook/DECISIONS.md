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

## D-005: Parsed, fixed-trust URL policy
Date: 2026-10-21
Decision: Replace configurable substring regular expressions with a pure WHATWG URL router using exact Microsoft host sets, explicit schemes, bounded inputs and trusted-source checks. Legacy `urlsInternal`, `urlsExternal` and `safelinksUrls` values may remain in an existing settings file but no longer expand the privileged renderer trust boundary.
Rationale: Local configuration should not turn an arbitrary remote origin into privileged Outlook content, and substring matching accepted lookalike/userinfo URLs.

## D-006: `mailto:` capability without changing the default
Date: 2026-10-21
Decision: Advertise `x-scheme-handler/mailto` in Linux package metadata, parse bounded RFC 6068-style fields in the main process, and navigate to Outlook's `/mail/deeplink/compose` URL. Do not call APIs or commands that make Prospect Mail the default handler.
Rationale: The desktop can offer Prospect Mail as a choice while leaving the user's current Thunderbird default unchanged.

## D-007: Teams protocol with browser fallback
Date: 2026-10-21
Decision: For recognised meeting URLs clicked from trusted Outlook pages, convert supported HTTPS links to a strictly validated `msteams:` URI when a handler exists. If no handler exists or launch fails, open the original HTTPS meeting URL in the default browser.
Rationale: This integrates with the separately installed Teams client without hardcoding a binary or sharing authentication data.

## D-008: Privacy-first notification content
Date: 2026-10-21
Decision: Keep desktop notification bodies generic by default. Calendar subject/time/location content is sent only after the user enables `showNotificationContent`.
Rationale: Notification bodies can appear on a lock screen and must not expose corporate event details by default.

## D-009: Wayland-first Debian launcher
Date: 2026-10-21
Decision: Package the primary Linux desktop entry with `--ozone-platform=wayland` and provide an explicit X11 desktop action/CLI fallback. The test harness uses a private headless GNOME compositor and a synthetic Outlook page.
Rationale: Native Wayland is the target environment; an explicit fallback preserves recoverability without silently weakening or changing the packaged sandbox.

## D-010: Non-forced dependency remediation
Date: 2026-10-21
Decision: Apply `npm audit fix --package-lock-only --ignore-scripts` without `--force`. This updates electron-builder within the declared compatible range and removes all production audit findings. Do not accept npm's forced downgrade for the remaining development-only `sprintf-js` chain.
Rationale: The production dependency graph is clean; the forced suggestion changes build tooling in a way npm itself labels breaking and does not affect the packaged runtime.

## D-011: Federated corporate identity redirects
Date: 2026-10-21
Decision: Permit a bounded chain of HTTPS hosts learned only from server redirects that begin on a Microsoft login origin. Keep IPC restricted to known Microsoft origins, and do not let ordinary clicks expand the learned chain.
Rationale: Enterprise Entra flows can redirect through tenant IdPs that cannot be pre-enumerated. Blocking all non-Microsoft main-frame redirects breaks legitimate SAML/MFA, while treating them as privileged origins is unnecessary and unsafe.

## D-012: Minimal packaged payload
Date: 2026-10-21
Decision: Package only runtime source/assets, production dependencies and the MIT license. Exclude tests, smoke harnesses, implementation documents, Cursor rules and development scripts from `app.asar`.
Rationale: Test-only sandbox bypasses and engineering material must not ship, and a smaller allowlisted payload is easier to audit.

## D-013: Backport merged Core24 Snap fix
Date: 2026-10-21
Decision: Apply an exact, idempotent postinstall backport of electron-builder PR #10176 to the v26 build dependency. Remove the duplicate Core24 `apps.desktop` mapping and use the snap name in generated desktop `Exec` values.
Rationale: Both remote Linux builds deterministically failed because electron-builder 26.18.0 contains the pre-fix mapping. The fix is already merged upstream but not released on the v26 tag; upgrading all packaging to a v27 alpha has a larger and less controlled blast radius.
