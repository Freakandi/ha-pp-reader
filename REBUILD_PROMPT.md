# Rebuild Prompt: PP Reader as a Home Assistant Add-on with PostgreSQL

Use this prompt in a fresh Claude Code session to start the rebuild project.

---

## The Prompt

```
You are helping me rebuild a Home Assistant HACS integration ("PP Reader") into a standalone Home Assistant Add-on (previously called "Add-on", formerly "Add-ons") backed by PostgreSQL instead of SQLite.

The legacy codebase lives in `_legacy_v1/` in this repo. DO NOT modify anything inside `_legacy_v1/` — it is reference-only.

## What the Legacy Integration Does

PP Reader reads `.portfolio` files from the "Portfolio Performance" desktop app (https://www.portfolio-performance.info/). These are protobuf-serialized archives containing a complete personal finance/investment data model. The integration:

1. **Parses** the `.portfolio` protobuf file into typed Python dataclasses (accounts, portfolios, securities, transactions, plans, watchlists, taxonomies, dashboards, settings).
2. **Ingests** parsed data into a relational database through a staged pipeline (ingestion tables → canonical tables).
3. **Enriches** data with live prices from Yahoo Finance (via `yahooquery`), historical price candles, and FX exchange rates (via Frankfurter API).
4. **Computes metrics** — portfolio/account/security valuations, gain/loss (absolute + percentage), day-changes, TWR/IRR performance, realized trade performance, daily wealth time series.
5. **Serves** a custom dashboard panel in the HA sidebar with a TypeScript/vanilla-JS frontend communicating over WebSocket.

## Database Schema (SQLite Legacy — port to PostgreSQL)

The legacy schema (see `_legacy_v1/custom_components/pp_reader/data/db_schema.py`) has ~30 tables:

### Core Entity Tables
- **accounts** (uuid, name, currency_code, note, is_retired, balance) + account_attributes
- **securities** (uuid, name, isin, wkn, ticker_symbol, feed, type, currency_code, last_price, last_price_date) + historical_prices (security_uuid, date, close, high, low, volume)
- **portfolios** (uuid, name, note, reference_account, is_retired) + portfolio_attributes
- **portfolio_securities** (portfolio_uuid, security_uuid, current_holdings, purchase_value, avg_price [computed], current_value)
- **transactions** (uuid, type, account, portfolio, security, date, currency_code, amount, shares, note) + transaction_units (fees, taxes, FX amounts)

### Supporting Tables
- **plans** (investment plans) + plan_attributes, plan_transactions
- **watchlists** + watchlist_securities
- **taxonomies** + taxonomy_classifications, taxonomy_assignments
- **dashboards** + dashboard_columns, dashboard_widgets, widget_configuration
- **settings_bookmarks**, **settings_attribute_types**, **settings_configuration_sets**
- **client_properties**, **metadata**

### Market Data Tables
- **exchange_rate_series** + **exchange_rates** (base/term currency, date, rate)
- **fx_rates** (date, currency, rate, fetched_at, data_source)
- **price_history_queue** (job queue for fetching historical prices)

### Metrics & Analytics Tables
- **metric_runs** (run_uuid, status, trigger, duration_ms, processed counts)
- **portfolio_metrics** (per-run: current_value, purchase_value, gain_abs, gain_pct)
- **account_metrics** (per-run: balance_native, balance_eur, fx_rate)
- **security_metrics** (per-run: holdings, current_value, purchase_value, gain, day_change)
- **portfolio_snapshots** / **account_snapshots** (human-readable denormalized snapshots)
- **daily_wealth** (date, scope_uuid, scope_type, total_wealth_cents, total_invested_cents)

### Ingestion Staging Tables
- **ingestion_metadata**, **ingestion_accounts**, **ingestion_portfolios**, **ingestion_securities**, **ingestion_transactions**, **ingestion_transaction_units**, **ingestion_historical_prices**

Key conventions: Monetary values in cents (integers), prices in 10^-8 units (integers), shares in 10^-8 units, FX rates in 10^-8 units. UUIDs are text.

## Frontend Dashboard (TypeScript — reuse design & logic)

The frontend is a vanilla TypeScript SPA compiled with Vite, served as a custom panel. Key files in `_legacy_v1/src/`:

### Tabs
1. **Overview** (`tabs/overview.ts`) — Main dashboard showing:
   - Header card with total wealth, performance summary
   - Expandable portfolio table (click to expand → shows individual security positions)
   - Account balances table (EUR + foreign currency accounts separated)
   - Footer with total sums, last-update timestamp
   - Sortable columns, live-update flash animations

2. **Security Detail** (`tabs/security_detail.ts`) — Drill-down for individual securities:
   - Header with security name, price, holdings, market value, average cost
   - Gain/loss metrics (absolute + percentage), day-change
   - SVG line chart with historical prices (1M/6M/1Y/5Y/ALL ranges)
   - Transaction markers on chart (buy = green, sell = red)
   - "Ask AI about this security" button (configurable ChatGPT prompt)

3. **Time Series / Analyse** (`tabs/time_series.ts`) — Wealth over time:
   - Date range picker
   - Multi-line SVG chart showing daily wealth by scope (portfolio/account)
   - Performance breakdown table (start/end value, market gain, realized/unrealized gains, dividends, fees, taxes, TWR, IRR)

4. **Trades** (`tabs/trades.ts`) — Realized performance:
   - Table of all realized trades with result (absolute + percentage)
   - Expandable rows showing individual lots
   - "Since sell" tracking (price movement after selling)

5. **Trade Detail** (`tabs/trade_detail.ts`) — Individual trade drill-down

### Shared Components
- **Charting** (`content/charting.ts`) — Custom SVG line chart with tooltips, focus tracking, area fill, baseline, markers (no external chart library)
- **Elements** (`content/elements.ts`) — Table builder, header cards, sort headers, loading states, number formatting
- **Date Range Picker** (`content/date-range-picker.ts`) — Custom date range selector
- **Navigation** — Dot navigation, swipe support, arrow navigation between tabs

### CSS (reuse fully)
Three CSS files in `_legacy_v1/custom_components/pp_reader/www/pp_reader_dashboard/css/`:
- `base.css` — Panel root, header bar, wrapper, responsive breakpoints
- `cards.css` — Card components, header cards, security detail, chart styling, tables, sortable headers, expandable portfolios, trades layout
- `nav.css` — Navigation arrows, dot navigation

Design follows HA CSS variables (--card-background-color, --primary-text-color, --success-color, --error-color, etc.) for seamless theme integration.

### Data Layer
- `data/api.ts` — WebSocket API client (all data fetched via WS commands like `pp_reader/get_dashboard_data`, `pp_reader/get_portfolio_positions`, etc.)
- `data/updateConfigsWS.ts` — Real-time push updates handler
- `data/positionsCache.ts` — Client-side position caching
- `data/dailyWealthStore.ts` — Daily wealth data store
- `lib/store/portfolioStore.ts` — Portfolio state management
- `lib/api/portfolio/` — Deserializers and type definitions

## WebSocket API (Legacy — convert to REST API or keep WS)

The legacy integration registers these WS commands:
- `pp_reader/get_dashboard_data` — Overview data (accounts + portfolios + positions)
- `pp_reader/get_accounts` — Account snapshots
- `pp_reader/get_last_file_update` — File modification timestamp
- `pp_reader/get_portfolio_data` — Portfolio summaries
- `pp_reader/get_portfolio_positions` — Positions for one portfolio
- `pp_reader/get_security_snapshot` — Single security detail
- `pp_reader/get_security_history` — Historical prices for charting
- `pp_reader/get_news_prompt` — AI prompt template
- `pp_reader/get_daily_wealth` — Wealth time series with optional performance metrics
- `pp_reader/get_trades` — Realized performance data
- `pp_reader/get_performance_breakdown` — Performance attribution by period

## Data Pipeline (Legacy — adapt for Add-on)

1. **File watcher** (coordinator polls every 60s) detects .portfolio file changes
2. **Protobuf parser** decodes the binary file using generated `client_pb2.py` from `client.proto`
3. **Ingestion writer** stages all parsed entities into ingestion_* tables
4. **Canonical sync** promotes ingestion data to canonical tables (accounts, securities, etc.)
5. **Enrichment pipeline** (parallel):
   - FX refresh: Discover active currencies → fetch rates from Frankfurter API → backfill historical rates
   - Price history: Queue missing candles → fetch from Yahoo Finance → persist to historical_prices
6. **Metrics engine** computes portfolio/account/security valuations, gain/loss
7. **Normalization** builds denormalized snapshots for fast frontend delivery
8. **Snapshot writer** persists portfolio_snapshots and account_snapshots
9. **Daily wealth** backdating calculates historical total-wealth time series

## Target Architecture: Home Assistant Add-on

### Key Changes from HACS Integration → Add-on
- **Standalone process**: The add-on runs as its own Docker container, NOT inside HA's Python process
- **Own web server**: Serve the dashboard via Flask/FastAPI/aiohttp (instead of HA's panel system)
- **PostgreSQL on Synology NAS**: Replace all SQLite with PostgreSQL (connection string via add-on config)
- **Communication with HA**: Use HA's REST API or WebSocket API as a CLIENT if needed (e.g., for notifications), rather than being a plugin
- **File access**: The .portfolio file should be accessible to the container (via shared volume or network path)

### What to Reuse
1. **Protobuf parsing** — The `client.proto` schema and `client_pb2.py` generated code, plus all `models/parsed.py` dataclasses
2. **Parser pipeline** — The staged parsing logic (accounts → portfolios → securities → transactions)
3. **Database schema** — Translate SQLite DDL to PostgreSQL DDL (mostly compatible, but fix: AUTOINCREMENT → SERIAL, strftime → NOW(), GENERATED ALWAYS AS → PostgreSQL syntax)
4. **Metrics engine** — All calculation logic (portfolio valuation, gain/loss, day-change, TWR/IRR, realized performance)
5. **FX and price services** — Yahoo Finance provider, Frankfurter API client, rate caching logic
6. **Frontend entirely** — All TypeScript tabs, charting, CSS, navigation. Only change: replace HA WebSocket calls with standard REST/WS calls to the add-on's own API server
7. **CSS fully** — All three CSS files work standalone (HA CSS variables can be provided via a theme wrapper or fallback defaults)

### What to Build New
1. **Add-on infrastructure** — Dockerfile, config.yaml (add-on manifest), run.sh
2. **Web server** — FastAPI or Flask app serving the dashboard + API
3. **PostgreSQL adapter** — Replace all `sqlite3.connect()` calls with asyncpg/psycopg pool
4. **API layer** — REST endpoints (or WS) matching the legacy WS command signatures
5. **Configuration UI** — Add-on options panel (PostgreSQL host/port/db/user/password, portfolio file path, update intervals)
6. **Health monitoring** — Container health checks, connection pool monitoring

## Development Environment Setup

Please set up the project with:
1. **Python 3.12+** with a virtual environment
2. **Node.js 20+** with pnpm for the frontend build
3. **Docker** for add-on containerization and local PostgreSQL
4. **docker-compose.yml** with: PostgreSQL 16, the add-on container, and optionally pgAdmin
5. **pyproject.toml** with dependencies: fastapi, uvicorn, asyncpg, protobuf, pandas, numpy, yahooquery, lxml
6. **Vite** for frontend bundling (keep the existing Vite config pattern)
7. **ruff** for Python linting (keep existing ruff.toml config)
8. **vitest** for frontend tests (preserve existing test patterns)

## Phase Plan

### Phase 1: Skeleton & Infrastructure
- Create add-on directory structure (Dockerfile, config.yaml, rootfs/)
- Set up docker-compose for local dev (PostgreSQL + add-on)
- Create FastAPI app scaffold with health endpoint
- Set up PostgreSQL connection pool (asyncpg)

### Phase 2: Database & Data Models
- Port SQLite schema to PostgreSQL DDL
- Create Alembic migrations
- Port parsed.py dataclasses (reuse as-is)
- Port ingestion writer for PostgreSQL

### Phase 3: Parser Pipeline
- Copy protobuf schema and generated code
- Port parser_pipeline.py (remove HA dependencies, use plain asyncio)
- Port canonical_sync (SQLite → PostgreSQL queries)
- File watcher (watchdog or polling)

### Phase 4: Enrichment Services
- Port FX service (Frankfurter API client)
- Port price service (Yahoo Finance via yahooquery)
- Port history queue manager
- Background task scheduler (APScheduler or plain asyncio)

### Phase 5: Metrics Engine
- Port metrics pipeline (portfolio/account/security calculations)
- Port normalization pipeline
- Port daily wealth computation
- Port realized performance (trades) calculator

### Phase 6: API Layer
- Create REST endpoints matching legacy WS commands
- Port websocket.py query logic to endpoint handlers
- Add WebSocket support for live push updates (optional)

### Phase 7: Frontend Adaptation
- Copy TypeScript source and CSS
- Replace HA WebSocket API calls with fetch() to add-on REST API
- Add standalone HTML shell (replace HA panel wrapper)
- Provide CSS variable defaults for standalone theming
- Build with Vite

### Phase 8: Integration & Polish
- Add-on config UI (PostgreSQL connection, file paths, intervals)
- Container health checks
- Logging configuration
- Documentation

Start with Phase 1. Create the directory structure and get a "Hello World" FastAPI server running in Docker alongside PostgreSQL.
```

---

## Key Reference Files in `_legacy_v1/`

When working on the rebuild, these are the most important files to reference:

| Area | File | Purpose |
|------|------|---------|
| DB Schema | `custom_components/pp_reader/data/db_schema.py` | All table DDL definitions |
| Constants | `custom_components/pp_reader/const.py` | Domain constants, transaction types |
| Data Models | `custom_components/pp_reader/models/parsed.py` | Parsed protobuf dataclasses |
| Parser | `custom_components/pp_reader/services/parser_pipeline.py` | Protobuf → domain model pipeline |
| Protobuf | `custom_components/pp_reader/name/abuchen/portfolio/client.proto` | Portfolio Performance proto schema |
| Coordinator | `custom_components/pp_reader/data/coordinator.py` | Main orchestrator |
| WebSocket API | `custom_components/pp_reader/data/websocket.py` | All data query endpoints |
| DB Access | `custom_components/pp_reader/data/db_access.py` | SQL query helpers |
| Ingestion | `custom_components/pp_reader/data/ingestion_writer.py` | Staged data writer |
| Canonical Sync | `custom_components/pp_reader/data/canonical_sync.py` | Staging → canonical promotion |
| Metrics | `custom_components/pp_reader/metrics/pipeline.py` | Metrics computation orchestrator |
| Metrics Calc | `custom_components/pp_reader/metrics/calculator.py` | Performance/gain calculations |
| FX Service | `custom_components/pp_reader/currencies/fx.py` | Exchange rate fetching |
| Price Service | `custom_components/pp_reader/prices/price_service.py` | Live price updates |
| Yahoo Provider | `custom_components/pp_reader/prices/yahooquery_provider.py` | Yahoo Finance adapter |
| History Queue | `custom_components/pp_reader/prices/history_queue.py` | Historical price job queue |
| Normalization | `custom_components/pp_reader/data/normalization_pipeline.py` | Snapshot denormalization |
| Frontend Entry | `src/dashboard.ts` | Dashboard controller |
| Overview Tab | `src/tabs/overview.ts` | Main portfolio overview |
| Security Tab | `src/tabs/security_detail.ts` | Security drill-down |
| Analyse Tab | `src/tabs/time_series.ts` | Wealth time series |
| Trades Tab | `src/tabs/trades.ts` | Realized performance |
| Charting | `src/content/charting.ts` | SVG chart engine |
| UI Elements | `src/content/elements.ts` | Table/card builders |
| API Client | `src/data/api.ts` | Frontend WS API layer |
| CSS Base | `www/pp_reader_dashboard/css/base.css` | Layout & header |
| CSS Cards | `www/pp_reader_dashboard/css/cards.css` | Cards, tables, charts |
| CSS Nav | `www/pp_reader_dashboard/css/nav.css` | Navigation |
