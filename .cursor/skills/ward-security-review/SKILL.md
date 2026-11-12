---
name: ward-security-review
description: >-
  Audits Ward against PRD section 4 and the Electron hardening checklist,
  with file or test evidence for every item, and writes SECURITY-REVIEW.md.
  Use when crypto, IPC, session, CSP, or backup code changes, or the user
  asks for a security review.
---

# Ward security review

Honest pass or fail against §4. A row with no evidence is FAIL. Do not grade your own intention.

## When to run

- Miguel asks for a security review or `/ward-security-review`.
- Phase 11's security self-review.
- You are about to call a phase done and that phase touched crypto, the session, IPC, CSP, preload, clipboard, or backup.

A review does not replace the phase gate. The gate cites this report.

## Read first

`Ward-PRD.md` §4 in full, §3.4 secrets rule, and §1.4 non-goals. Then the code you are judging. Prefer the file over a summary from earlier in the chat.

## Run

From the repo root:

```text
node .cursor/skills/ward-security-review/scripts/scan.mjs
```

Paste the high findings into the report. Judge each one. A high finding you leave in the tree is a FAIL until you fix it or he accepts it in writing.

Also grep, and record the command:

- `Math.random` under `src/`
- `console.` under `src/main/crypto/`
- `password` fields returned from list handlers
- `dangerouslySetInnerHTML`
- `nodeIntegration`, `contextIsolation`, `sandbox`, `webSecurity`

## Fill the checklist

Copy [checklist.md](checklist.md) into `SECURITY-REVIEW.md` at the repo root when this is the Phase 11 review or he asks for the file. In other phases, put the filled checklist in the chat report and do not overwrite `SECURITY-REVIEW.md` if a signed one already exists. Add a dated section instead.

Every row needs Status and Evidence. Evidence is a test name, a `file:line`, or a manual step you did. Empty evidence is FAIL.

## Threat model honesty

The report must restate, in plain language, what §4.1 puts out of scope: malware or a keylogger as the same OS user, memory forensics on an unlocked process, a weak master password, physical coercion. Do not let the UI or the review say "unhackable".

## Report

```text
# Security review

## Scope
phase or files
## Scan
command, high count, judgment per high finding
## Checklist
see filled rows
## Secrets
fixture used, where you proved it does not appear
## Out of scope (stated, not solved)
## Fixes made this turn
## Verdict
PASS only if no FAIL rows remain
## Awaiting
```

## Hard stops

- Do not "fix" a FAIL by deleting the test that caught it.
- Do not lower KDF parameters to clear a timing complaint. Record the timing and ask.
- Do not print a real vault's secrets while proving a row. Use a temp vault and the fixture password.
- If you believe §4 is wrong, stop. Do not change the primitive and then mark the row PASS.
