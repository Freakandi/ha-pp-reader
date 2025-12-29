---
description: Verify code quality, build assets, update changelog, and push to remote.
---


1. Cleanup Environment:
   - Identify any running instances of Home Assistant or Vite using `pgrep -fl hass` and `pgrep -fl vite`.
   - If found, ask the user or automatically kill them if appropriate (e.g. `pkill -f hass`, `pkill -f vite`).
   - *Ensure the environment is clean before starting builds to avoid file locks or resource contention.*

2. Ensure Python Code Quality (Iterative Cycle):
   - Run `ruff check . --fix`
   - Run `ruff format .`
   - Run `ruff check .` (verify no errors remain)
   - *Repeat this cycle if `ruff check --fix` or `ruff format` made changes that triggered new issues, until the code is stable and clean.*

4. Verify TypeScript linting:
   `npm run lint:ts -- --fix`

5. Run TypeScript type checking:
   `npm run typecheck`

6. Build the frontend bundles:
// turbo
   `npm run build`

7. Update the Changelog:
   - Read `CHANGELOG.md` to identify the 'Unreleased' section.
   - Ask the user for the specific changes to record (categorized by Added, Changed, Deprecated, Removed, Fixed, Security).
   - Insert the new entries into the 'Unreleased' section of `CHANGELOG.md`.

8. Commit and Push:
   - Stage all changes: `git add .`
   - Draft a concise commit message based on the changelog.
   - Commit the changes: `git commit -m "<message>"`
   - Push to the remote: `git push`