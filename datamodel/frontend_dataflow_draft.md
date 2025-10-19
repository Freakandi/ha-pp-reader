# Portfolio Performance Reader – Frontend Data Flow (Draft)

This draft consolidates how the Home Assistant dashboard renders backend payloads across all frontend tabs. The mermaid diagram summarises which websocket responses and events supply each UI surface, followed by tables outlining the rendered widgets, primary data, and notable behaviours.

```mermaid
flowchart LR
  subgraph OverviewTab["Overview tab"]
    DashboardSummary["dashboard_summary payload"]
    Accounts["accounts payload"]
    PortfolioValues["portfolio_values payload"]
    PortfolioPositions["portfolio_positions payload"]
    LastFileUpdate["last_file_update payload"]
    PanelsUpdated["panels_updated event"]

    DashboardSummary --> HeaderCard["Header card (total wealth & FX note)"]
    Accounts --> EurTable["Liquidity table (EUR accounts)"]
    Accounts --> FxTable["FX accounts table & warning"]
    PortfolioValues --> PortfolioTable["Investment table (per portfolio)"]
    PortfolioPositions --> ExpandableRows["Expandable holdings rows"]
    PortfolioPositions --> DetailLaunchers["Security detail openers"]
    LastFileUpdate --> FooterCard["Footer metadata card"]

    PanelsUpdated -.routes.-> HeaderCard
    PanelsUpdated -.routes.-> EurTable
    PanelsUpdated -.routes.-> FxTable
    PanelsUpdated -.routes.-> PortfolioTable
    PanelsUpdated -.routes.-> ExpandableRows
  end

  subgraph SecurityTab["Security detail tabs"]
    SecuritySnapshot["security_snapshot payload"]
    SecurityHistory["security_history payload"]
    PanelsUpdatedDetail["panels_updated (portfolio_positions)"]

    SecuritySnapshot --> DetailHeader["Meta grid (price, holdings, gains)"]
    SecuritySnapshot --> DetailInfoBar["Info bar (range context)"]
    SecuritySnapshot --> AverageTooltips["Average cost tooltips"]
    SecurityHistory --> HistoryChart["History chart & placeholder"]

    PanelsUpdatedDetail -.invalidates.-> SecuritySnapshot
    PanelsUpdatedDetail -.invalidates.-> SecurityHistory
  end

  note right of PanelsUpdatedDetail
    *`panels_updated` carries the
    `portfolio_positions` refresh event.
  end
```

## Overview tab surfaces

| UI surface | Consumed data | Key fields | Notes |
| --- | --- | --- | --- |
| Header card ("Übersicht") | `dashboard_summary`, plus local totals | `summary.total_wealth_eur`, `summary.fx_status`, `summary.calculated_at` | `renderDashboard` composes the header card after fetching accounts and portfolios, combining backend totals with computed warnings for missing FX data.【F:src/tabs/overview.ts†L1335-L1387】【F:src/tabs/overview.ts†L1406-L1451】 |
| Investment table | `portfolio_values` | `portfolios[].name`, `current_value`, `purchase_sum`, `performance.*`, `missing_value_positions` | Portfolio aggregates are normalised into expandable table rows, with valuation and performance copied directly from the payload.【F:src/tabs/overview.ts†L1357-L1397】【F:src/tabs/overview.ts†L1471-L1521】 |
| Expandable holdings rows | `portfolio_positions` (lazy loaded per portfolio) | `positions[].security_uuid`, `aggregation.*`, `performance.*`, `average_cost.*` | When a depot expands, the tab fetches positions and injects sortable rows, then wires security-detail launchers for each security UUID.【F:src/tabs/overview.ts†L1522-L1560】【F:src/tabs/overview.ts†L1561-L1613】【F:src/data/updateConfigsWS.ts†L188-L246】 |
| Liquidity table (EUR accounts) | `accounts` | `accounts[].name`, `accounts[].balance`, `accounts[].currency_code` | The renderer splits EUR accounts, renders balances in EUR, and contributes to the total wealth sum before display.【F:src/tabs/overview.ts†L1335-L1392】【F:src/tabs/overview.ts†L1433-L1488】 |
| FX accounts table | `accounts` | `accounts[].orig_balance`, `accounts[].balance`, `accounts[].currency_code`, `accounts[].fx_unavailable` | Non-EUR accounts render a two-column table with native and EUR balances and optional FX warning text when rates are missing.【F:src/tabs/overview.ts†L1433-L1488】 |
| Footer metadata card | `last_file_update` | `last_file_update.ingested_at`, `last_file_update.source` | The footer pulls the latest import timestamp and shows a fallback label when the fetch fails.【F:src/tabs/overview.ts†L1399-L1425】 |
| Live updates queue | `panels_updated` (`accounts`, `portfolio_values`, `portfolio_positions`, `last_file_update`) | `data_type`, `data`, `portfolio_uuid` | `dashboard.ts` routes websocket events into update handlers that refresh the DOM sections without a full re-render.【F:src/dashboard.ts†L1-L120】【F:src/dashboard.ts†L232-L311】 |

## Security detail tabs

| UI surface | Consumed data | Key fields | Notes |
| --- | --- | --- | --- |
| Header card & meta grid | `security_snapshot` | `snapshot.name`, `market_value_eur`, `total_holdings`, `performance.*`, `average_cost.*`, `last_price_*` | `renderSecurityDetail` fetches the snapshot, caches it, and renders an expanded meta grid with holdings, gains, and average cost tooltips derived from the payload.【F:src/tabs/security_detail.ts†L1703-L1799】【F:src/tabs/security_detail.ts†L1189-L1299】 |
| Info bar & range controls | `security_snapshot`, `security_history` | `performance.day_change.*`, `currency_code`, `prices[]` | After loading the snapshot and history, the tab computes day changes for the active range and wires range buttons to refetch history windows on demand.【F:src/tabs/security_detail.ts†L1728-L1810】【F:src/tabs/security_detail.ts†L1430-L1544】【F:src/tabs/security_detail.ts†L1554-L1698】 |
| History chart placeholder | `security_history` | `prices[].date`, `prices[].close_native`, `prices[].close_eur` | The placeholder swaps to a rendered line chart once the requested range loads; empty/error states render informative copy before chart hydration.【F:src/tabs/security_detail.ts†L1728-L1810】【F:src/tabs/security_detail.ts†L1430-L1544】 |
| Cached snapshot notice | `security_snapshot` | `snapshot.source`, cached snapshot state | When a fetch fails, cached data triggers a banner explaining whether the view is stale or sourced from cache-only data.【F:src/tabs/security_detail.ts†L1709-L1740】 |
| Live update invalidation | `portfolio_positions` via `panels_updated` | `securityUuids[]` | Security detail tabs subscribe to `pp-reader:portfolio-positions-updated` events, invalidating cached snapshots and history when the current security changes in the background.【F:src/tabs/security_detail.ts†L300-L384】 |

## Shared behaviours

| Behaviour | Consumed data | Notes |
| --- | --- | --- |
| Initial data fetch | Websocket commands per payload | Both tabs use websocket helpers in `src/data/api.ts` to fetch payloads on demand before rendering markup, ensuring the UI only renders once fresh data is available.【F:src/tabs/overview.ts†L1331-L1399】【F:src/tabs/security_detail.ts†L1710-L1770】【F:src/data/api.ts†L1-L210】 |
| Lazy loading & caching | `portfolio_positions`, `security_snapshot`, `security_history` | Expandable portfolios and security tabs cache data locally, reusing previous responses until a live update invalidates the caches for the relevant portfolio or security.【F:src/tabs/overview.ts†L1490-L1560】【F:src/data/positionsCache.ts†L1-L120】【F:src/tabs/security_detail.ts†L300-L384】 |
| Range selection | `security_history` | Range buttons call `fetchSecurityHistoryWS` with pre-defined windows, update the info bar, and refresh the chart in place without leaving the tab.【F:src/tabs/security_detail.ts†L1554-L1698】 |
