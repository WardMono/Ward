---
name: ward-dependency-check
description: >-
  Vets an npm library before install for Ward: current official docs, exact
  version pin, license, maintenance, native rebuild, bundle cost, and proof
  it makes no network calls. Use before adding any dependency, when the PRD
  names a package, or when docs disagree with the PRD.
---

# Ward dependency check

Nothing new is installed until this card is PASS. The PRD names the stack. It does not prove the current API.

## When to run

Before `npm install <pkg>`, before adding a packages field, and when a phase prompt says to verify a library's docs.

## When not to run

The package is already in `package.json` at an exact version and this step does not upgrade it. Say "already pinned" and cite the version.

## Rejected without a card

Do not add these. They are already decided in §1.4, §2.3, and §4.7.

- Any CDN script, font, or stylesheet
- Analytics, crash reporting, auto-update, breach-check, or telemetry clients
- A second crypto library, or a "simpler" crypto helper
- `Math.random` wrappers sold as token generators
- A Python or other sidecar server
- Remote favicon or avatar fetching

If he asks for one of these, stop and point at the PRD section. Do not install it.

## Check, in order

1. Find the official docs URL this session (the project site or the npm page's repository docs). Read the API you will call. Quote the function names you will use.
2. Confirm the PRD allows this package, or he named it in the current step.
3. License. Permissive licenses are fine. A word list or other bundled data needs a license that allows shipping it inside the app. Record the license name and where you read it.
4. Maintenance. Note the latest version and its publish date from the registry. A stale native module is a risk, not an automatic fail. Say so.
5. Runtime network. Read the README enough to answer: does import or init open a socket, phone home, or download data? If yes, FAIL. Ward is offline.
6. Electron. If the module is native, record the rebuild story (`electron-rebuild` or the package's Electron guidance) and that `electron-builder` must unpack it from asar. Phase 0 Spike C has to prove that. Do not assume.
7. Bundle. If it ships to the renderer, say whether it is large enough to matter. Prefer the PRD's already chosen library over a second one that does the same job.
8. API conflict. If the docs disagree with the PRD, write the conflict. Docs win for the call. The PRD wins for behavior and security. A conflict that would weaken §4 is not yours to resolve. Stop and ask.

## Install rule

After a PASS card, install with npm and pin the exact version that landed in `package.json` (`1.2.3`, not `^1.2.3`). If the installer wrote a range, change it to the exact version you installed.

Do not add a package "for later".

## Card

```text
# Dependency card — <name>

- Verdict: PASS | FAIL
- PRD: section that names it, or "not in PRD — asked by Miguel on <date>"
- Docs: URL read this session
- API that will be called: names, as the docs spell them
- Version to pin: x.y.z
- License: name — source URL
- Latest publish: version and date
- Network at runtime: none | FAIL (why)
- Native: no | yes — unpack/rebuild note
- Renderer bundle: no | yes — note
- Conflict with PRD: none | described
- Rejected option you did not pick:

## Awaiting
Continue the current step, or stop if FAIL
```

A FAIL card means you do not install. Tell him the reason in one sentence.
