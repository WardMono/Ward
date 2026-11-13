# Source layout

These folders match Ward-PRD.md section 3.2. A file that only says it is a stub has no behavior. The running app still starts from `src/main/index.ts` and `src/renderer/src/App.tsx`.

Do not put SQL outside `src/main/db/repos/`. Do not import Node or DOM from `src/shared/`. Crypto and the database stay in the main process.
