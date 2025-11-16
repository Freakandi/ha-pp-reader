# Normalized Adapter GA – Release Announcement (v0.15.0)

Use this script when announcing the normalized adapter General Availability across internal channels and the public HACS release note. It summarizes the rollout, the breaking changes, and the concrete actions operators must take when upgrading.

## Internal Maintainer Briefing (Slack / Teams)

```
Portfolio Performance Reader v0.15.0 is live in dev and ready for promotion. The normalized ingestion → metrics → dashboard adapter stack is now the only code path: coordinator payload shims, DOM overrides, and `_normalize_portfolio_row` have been removed. Normalized adapters are no longer behind feature flags.

Regression gates are green (pytest + coverage, websocket/enrichment matrix, npm lint/typecheck/test/build) and the release bundles were rebuilt after clearing `node_modules/.vite`. Diagnostics capture the serialized normalization payload, and the dashboard stores consume the same schema documented in `pp_reader_dom_reference.md`.

Next steps before tagging `main`:
1. `npm run build && node scripts/update_dashboard_module.mjs`
2. `scripts/prepare_main_pr.sh dev main`
3. Push the generated worktree and open the release PR referencing CHANGELOG 0.15.0 + this announcement.

Maintainers running local dashboards must rebuild (`npm run build`) or pull the hashed bundles from `main` to avoid stale adapters. Ping @Freakandi if you hit schema drift—there is no legacy fallback anymore.
```

## HACS / Community Announcement (Release Notes, Forum, Discord)

```
Portfolio Performance Reader 0.15.0 ships the normalized adapter GA. Every sensor, websocket payload, and the bundled dashboard now reads from the canonical normalization snapshots persisted in SQLite. The normalized ingestion/adapter path is always enabled—legacy DOM adapters have been removed.

What’s new:
- Rebuilt dashboard API helpers and stores consume the normalized `PortfolioSnapshot` / `AccountSnapshot` schema one-to-one; coverage, provenance, metric-run UUIDs, and diagnostics match backend data.
- Config-entry migration v2 enforces the normalized flags and stores the same defaults in diagnostics—reload the entry if you ever need to reapply them.
- `CHANGELOG.md` details the cleanup of the coordinator caches, DOM overrides, and temporary metric shims that were only needed during the rollout.

Breaking changes & required actions:
1. Rebuild dashboard assets after upgrading (`npm run build`, then copy the hashed bundles or install through HACS). Custom forks must clear `node_modules/.vite` before building.
2. Reload the Portfolio Performance Reader config entry after upgrading so it picks up the rebuilt assets and refreshed diagnostics.
3. If you posted automation scripts or custom widgets that read legacy `avg_price_*` or `gain_*` fields, switch to the structured `average_cost` and `performance` blocks documented in `pp_reader_dom_reference.md`.

Need help? File an issue with diagnostics attached (they now include the serialized `normalized_payload`) or join the HA forum thread linked from the repository README.
```

## Operator Checklist

- **Before rollout**
  - Verify dev/test builds by running `./scripts/lint`, full `pytest --cov`, and the websocket/enrichment matrix (`tests/test_event_push.py`, `tests/test_ws_portfolios_live.py`, `tests/test_ws_portfolio_positions.py`, `tests/prices/test_history_queue.py`, `tests/currencies/test_fx_async.py`).
  - For frontend parity, run `npm run lint:ts && npm run typecheck && npm test && npm run build` with a clean `.vite` cache.
- **During upgrade**
  - Publish 0.15.0 through HACS once the release PR (with rebuilt bundles) has been merged into `main`.
  - Post the community announcement above in the release discussion, Discord, and any internal ops channel.
- **After upgrade**
- Ask operators to reload the config entry once and confirm diagnostics show the normalized payload bundle.
  - Remind custom dashboard users to rebuild assets or pull the shipped `custom_components/pp_reader/www/pp_reader_dashboard/js/*.js` hashes.

## Timeline & Owners

| Step | Owner | Deadline |
| --- | --- | --- |
| Internal announcement | @Freakandi | After dev deploy validation |
| Release PR to `main` | Maintainer on duty | Same day |
| HACS/community post | Release owner | Immediately after PR merge |
| Post-upgrade verification (config reload + diagnostics) | QA pairing | < 24h after announcement |

Keep this document with the release PR so reviewers can confirm messaging went out before toggling defaults or promoting the tag.
