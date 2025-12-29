---
description: Verify code quality, build assets, update changelog, and push to remote.
---

1. Ensure Python Code Quality (Iterative Cycle):
   - Run `ruff check . --fix`
   - Run `ruff format .`
   - Run `ruff check .` (verify no errors remain)
   - *Repeat this cycle if `ruff check --fix` or `ruff format` made changes that triggered new issues, until the code is stable and clean.*

3. Verify TypeScript linting:
   `npm run lint:ts -- --fix`

4. Run TypeScript type checking:
   `npm run typecheck`

5. Build the frontend bundles:
// turbo
   `npm run build`

6. Update the Changelog:
   - Read `CHANGELOG.md` to identify the 'Unreleased' section.
   - Ask the user for the specific changes to record (categorized by Added, Changed, Deprecated, Removed, Fixed, Security).
   - Insert the new entries into the 'Unreleased' section of `CHANGELOG.md`.

7. Commit and Push:
   - Stage all changes: `git add .`
   - Draft a concise commit message based on the changelog.
   - Commit the changes: `git commit -m "<message>"`
   - Push to the remote: `git push`