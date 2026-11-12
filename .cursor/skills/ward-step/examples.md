# Step examples

These are the turn boundaries. Copy the shape, not the file names, if the repo has moved on.

## GO PHASE 0

The phase prompt in §8 has several numbered items. Do item 1 only.

Plan: scaffold with the current `electron-vite` React + TypeScript command, after reading that package's docs.

Do not install Tailwind, do not write the window hardening, do not run the spikes.

Report ends with `Awaiting GO 0.2`.

## GO 0.2 after that report

Configure strict TypeScript, ESLint with `eslint-plugin-security`, Prettier, Vitest, and the npm scripts from the phase. Pin versions after the install, and only after a dependency card for each package you add.

Stop. Do not create the folder stubs. That is the next item.

## GATE

Do not use `ward-step`. The user is closing the phase. Switch to `ward-phase-gate`.

## A failing test mid-step

Stay on this step. Use `ward-debug` if the failure is not obvious. The step report stays FAIL until the command is green or you have written the real error. Do not open the next number.
