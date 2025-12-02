# Portfolio Performance Reader – History Chart Fix (VS Code / Pi)

You are Codex, working in Andreas' Raspberry Pi 5 VS Code environment on `/home/andreas/coding/repos/ha-pp-reader`. Frontend source lives in `src/`, backend in `custom_components/pp_reader/`, tests in `tests/`. Use the Home Assistant venv `venv-ha/` (`source venv-ha/bin/activate`) and Node 18/20 with `npm` for frontend tasks.

## Goal
Work through `.docs/TODO_history_chart.md` to pinpoint why the security detail history chart shows candles beyond the portfolio file’s last date and why Yahoo DNS warnings appear. Do not assume behaviour—every conclusion must be grounded in reproduction, logs, and data inspection.

Canonical history rules to respect and verify:
- Portfolio file prices are canonical and must be preferred over Yahoo data.
- YahooQuery history fetch should only fill gaps from the last portfolio candle through “yesterday” (day before fetch), never beyond.
- When a refreshed portfolio file is ingested, its historical prices must overwrite any previously written YahooQuery rows for overlapping dates.

## Session hygiene
- Kill stale processes before starting: `pgrep -fl hass` / `kill <pid>` until none; `pgrep -fl vite` or `lsof -i :5173 -i :5174` / `kill <pid>`.
- Start clean instances only when needed:
  - `source venv-ha/bin/activate`
  - `nohup hass --config ~/coding/repos/ha-pp-reader/config --debug > /tmp/ha_pp_reader_hass.log 2>&1 &` (record PID for cleanup)
  - `npm run dev -- --host 127.0.0.1 --port 5173` (record PID)
- Stop any HA/Vite/test runners you start before finishing.

## Non-negotiable rules
- No assumptions. Validate every hypothesis with UI reproduction, DB queries, logs, or targeted tests. If evidence is missing, gather it before proceeding.
- Treat the UI symptom as possibly cross-layer (frontend rendering/state, backend APIs, coordinator, ingest). Trace end-to-end.
- Prefer `rg` for searches; keep edits ASCII; add only necessary comments.
- Never use destructive git commands; do not revert user changes.

## Required workflow
1) Understand the bug description and logs. Identify candidate data paths.  
2) Reproduce with HA+Vite (`http://127.0.0.1:8123/ppreader?pp_reader_dev_server=http://127.0.0.1:5173`, login `dev`/`dev`). Watch HA logs while exercising the detail tab. Capture `/pp_reader/get_security_history` payloads for an affected security.  
3) Inspect code and data:
   - DB: `historical_prices` rows (provider/source, min/max dates) for the tested security; `price_history_queue` provenance and date bounds.  
   - Backend: `prices/history_queue.py`, `prices/history_ingest.py`, `data/normalization_pipeline.py`, `data/websocket.py` (history handler), `data/coordinator.py` scheduling.  
   - Frontend: `src/tabs/security_detail.ts` history handling and caching.  
   - Logs: correlate DNS warnings with job batches.  
4) Determine the precise root cause(s) with evidence (screenshots/log snippets/DB queries). No “likely” language—pin down conclusively.  
5) Implement the minimal, clean fix(es) only after root cause is proven. Keep data contracts backward-compatible.  
6) Add focused tests (Python or TS) when practical to lock the behaviour (e.g., job planning bounds, provider selection, history payload).  
7) Verify manually: rerun reproduction steps, confirm charts and history payloads.  
8) Run relevant checks if touched: `./scripts/lint` (backend), `npm run lint:ts` / `npm run typecheck` / `npm test` (frontend).  
9) Clean up all processes you started.

## Specific ToDos (from `.docs/TODO_history_chart.md`)
- Reproduce in UI; capture history WS payload for an affected security; verify extra candles’ provider/source.  
- Inspect DB for that security: which provider wrote post-2025-10-17 rows; confirm queue overlap behaviour.  
- Trace history scheduling inputs and provenance: why forward-dated fetches were requested.  
- Correlate DNS warnings with job batches; determine if partial fetches/retries truncate series and whether curl-based session causes failures.  
- Propose/validate a guardrail: only enqueue Yahoo history when needed or cap end dates to ingestion coverage; avoid masking DNS issues.  
- If DNS is root cause, prefer a standard requests-based session (supported API) or retry/disable guard without patching yahooquery internals.  
- Add a regression test around job planning/fetched ranges once fix is chosen.

## Output expectations
- Lead with what you fixed and how (root cause + resolution).  
- File-by-file rationale.  
- Commands run and outcomes; highlight remaining verification needs.  
- Call out assumptions/risks/follow-ups.  
