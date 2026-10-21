# User handoff template — produce at candidate readiness

When the automatic work is done, provide exactly ONE succinct request for the user to run live tests. Include:

- fork URL / branch / commit / deb path and SHA256
- test summary (`npm test`, unit regressions, `.deb` build, static/security review)
- what can be verified WITHOUT sign-in vs what needs their Microsoft 365 account
- a single ordered checklist: login/MFA, send approved test mail + attachments, calendar invite/RSVP, contacts, hidden new-mail notification and focus, Teams meeting link, mailto, suspend/resume
- any blocked/unsupported features and proposed priority
- explicit statement that real mailbox workflows are NOT yet verified unless the user performed them

Do not interrupt the user in the middle of development for small questions, opinions about UI colours, branch naming, or micro-decisions.
