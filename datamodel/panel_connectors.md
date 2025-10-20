# Panel connector matrix

The table below links every dashboard websocket command and push event to its initiator, handler, payload, and UI usage.

| Event type | Initiating function | Event name | Receiving/handling function | Data contained | Distribution of the data in the frontend |
| --- | --- | --- | --- | --- | --- |
| Websocket call | `fetchFullOverviewWS()` | `pp_reader/get_full_overview` | `ws_get_full_overview()` | Bundles `accounts[]` (each entry supplies `name`, `currency_code`, `orig_balance`, `balance`, `fx_unavailable`), `last_file_update` (ISO timestamp string), and `portfolios[]` (every row exposes `uuid`, `name`, `current_value`, `purchase_sum`, `position_count`, `missing_value_positions`, and `performance.gain_abs`, `performance.gain_pct`, `performance.total_change_eur`, `performance.total_change_pct`, `performance.source`, `performance.coverage_ratio`, `performance.day_change.price_change_native`, `performance.day_change.price_change_eur`, `performance.day_change.change_pct`, `performance.day_change.source`, `performance.day_change.coverage_ratio`). | `renderDashboard()` consumes the unified snapshot for full renders, hydrating the account tables, timestamp footer, wealth headline, and overview portfolio table in one roundtrip. |
| Websocket call | `fetchPortfolioPositionsWS()` | `pp_reader/get_portfolio_positions` | `ws_get_portfolio_positions()` | Returns `{portfolio_uuid, positions[], error?}`; each position supplies `security_uuid`, `name`, `current_holdings`, `purchase_value`, `current_value`, `average_cost.native`, `average_cost.security`, `average_cost.account`, `average_cost.eur`, `average_cost.source`, `average_cost.coverage_ratio`, `performance.gain_abs`, `performance.gain_pct`, `performance.total_change_eur`, `performance.total_change_pct`, `performance.source`, `performance.coverage_ratio`, `performance.day_change.price_change_native`, `performance.day_change.price_change_eur`, `performance.day_change.change_pct`, `performance.day_change.source`, `performance.day_change.coverage_ratio`, `aggregation.total_holdings`, `aggregation.positive_holdings`, `aggregation.purchase_value_cents`, `aggregation.purchase_value_eur`, `aggregation.security_currency_total`, `aggregation.account_currency_total`, `aggregation.purchase_total_security`, `aggregation.purchase_total_account`, plus optional mirrors `gain_abs`/`gain_pct`. | Lazy loads position tables on expansion; rendered rows power per-security detail links, cached data, sortable columns, and downstream `pp-reader:portfolio-positions-updated` consumers. |
| Websocket call | `fetchSecuritySnapshotWS()` | `pp_reader/get_security_snapshot` | `ws_get_security_snapshot()` | Provides `{security_uuid, snapshot}` with holdings totals, EUR valuations, last/close prices, aggregation breakdown, average-cost, performance metrics, and `source`. | `renderSecurityDetail()` builds the security header, meta section, info bar, and valuation breakdown from the snapshot (including cache/fallback notices). |
| Websocket call | `fetchSecurityHistoryWS()` | `pp_reader/get_security_history` | `ws_get_security_history()` | Returns `{security_uuid, prices[]}` with each point exposing `date`, `close`, and optional `close_raw`, alongside `start_date`/`end_date` echoes. | The security detail tab fetches the selected range, normalises the series, and feeds the chart plus day-change statistics. |
| Push event | `_emit_account_updates()` | `accounts` | `handleAccountUpdate()` | Emits `accounts[]` entries with `name`, `currency_code`, `orig_balance`, `balance`, and `fx_unavailable` flags. | Updates the EUR and FX account tables, recalculates totals, and refreshes the overall wealth figure used in the header card. |
| Push event | `_emit_last_file_update()` | `last_file_update` | `handleLastFileUpdate()` | Sends the formatted ISO timestamp string for the last portfolio file import. | Writes the status into `.last-file-update` nodes in both footer and header/meta sections. |
| Push event | `_emit_portfolio_updates()`<br>`_run_price_cycle()` | `portfolio_values` | `handlePortfolioUpdate()` | Delivers portfolio aggregates as `portfolios[]`, each containing `uuid`, `name`, `current_value`, `purchase_sum`, `position_count`, `missing_value_positions`, `performance.gain_abs`, `performance.gain_pct`, `performance.total_change_eur`, `performance.total_change_pct`, `performance.source`, `performance.coverage_ratio`, `performance.day_change.price_change_native`, `performance.day_change.price_change_eur`, `performance.day_change.change_pct`, `performance.day_change.source`, `performance.day_change.coverage_ratio`; payloads may also carry `error`. | Patches the expandable portfolio table cells, refreshes gain/percentage badges, and recalculates footer totals plus the wealth headline. |
| Push event | `_emit_portfolio_updates()`<br>`_run_price_cycle()` | `portfolio_positions` | `handlePortfolioPositionsUpdate()` | Supplies per-portfolio payloads with `portfolio_uuid`, `positions[]`, and optional `error`; each position includes `security_uuid`, `name`, `current_holdings`, `purchase_value`, `current_value`, `average_cost.native`, `average_cost.security`, `average_cost.account`, `average_cost.eur`, `average_cost.source`, `average_cost.coverage_ratio`, `performance.gain_abs`, `performance.gain_pct`, `performance.total_change_eur`, `performance.total_change_pct`, `performance.source`, `performance.coverage_ratio`, `performance.day_change.price_change_native`, `performance.day_change.price_change_eur`, `performance.day_change.change_pct`, `performance.day_change.source`, `performance.day_change.coverage_ratio`, `aggregation.total_holdings`, `aggregation.positive_holdings`, `aggregation.purchase_value_cents`, `aggregation.purchase_value_eur`, `aggregation.security_currency_total`, `aggregation.account_currency_total`, `aggregation.purchase_total_security`, `aggregation.purchase_total_account`, with optional mirrors `gain_abs`/`gain_pct`. | Applies live deltas to expanded position tables, updates the cached dataset, and dispatches `pp-reader:portfolio-positions-updated` so other tabs (e.g. security detail) can react. |

```mermaid
flowchart LR
  subgraph Frontend
    FOverview["fetchFullOverviewWS()"]
    FPositions["fetchPortfolioPositionsWS()"]
    FSnapshot["fetchSecuritySnapshotWS()"]
    FHistory["fetchSecurityHistoryWS()"]
    FHandlers["Dashboard event handlers"]
  end
  subgraph Backend
    BOverview["ws_get_full_overview()"]
    BPositions["ws_get_portfolio_positions()"]
    BSnapshot["ws_get_security_snapshot()"]
    BHistory["ws_get_security_history()"]
    BPush["_emit_* & price cycle"]
    Bus["EVENT_PANELS_UPDATED"]
  end
  FOverview -- "pp_reader/get_full_overview" --> BOverview
  BOverview -- "accounts + last_file_update + portfolio aggregates" --> FOverview
  FPositions -- "pp_reader/get_portfolio_positions" --> BPositions
  BPositions -- "positions payload" --> FPositions
  FSnapshot -- "pp_reader/get_security_snapshot" --> BSnapshot
  BSnapshot -- "security snapshot" --> FSnapshot
  FHistory -- "pp_reader/get_security_history" --> BHistory
  BHistory -- "price history" --> FHistory
  BPush -- "accounts / last_file_update / portfolio_values / portfolio_positions" --> Bus
  Bus -- "panels_updated" --> FHandlers
```
