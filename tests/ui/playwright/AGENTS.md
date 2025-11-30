# Playwright Screenshot Rules

This directory stores UI evidence captured during the Portfolio Performance Reader auto UI inspection loop.

- Every screenshot saved here **must** use the naming pattern `YY-MM-DD_HH:MM_[before|after].png`, where timestamps are UTC and the suffix indicates whether it was taken before or after fixes were applied.
- Keep the folder limited to the latest before/after evidence pairs for each session so reviewers can track the exact fix context; delete stray captures (`preview.png`, `tmp_*`) or move them under `tmp/` instead.
- When capturing via `npx playwright screenshot`, always wait for `home-assistant-main` (e.g., `--wait-for-selector='home-assistant-main' --wait-for-timeout=4000`) so the panel finishes rendering, then inspect the result with `chafa` and re-take it immediately if it shows only the HA splash screen.
