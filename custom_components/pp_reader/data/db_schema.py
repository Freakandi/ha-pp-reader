"""
Database schema definitions for the pp_reader component.

This module contains SQL schema definitions for various entities such as accounts,
securities, portfolios, transactions, and more. These schemas are used to create
and manage the database structure for the pp_reader application.
"""

from contextlib import suppress

# db_schema.py

ACCOUNT_SCHEMA = [
    """
    CREATE TABLE IF NOT EXISTS accounts (
        uuid TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        currency_code TEXT NOT NULL,
        note TEXT,
        is_retired INTEGER,
        updated_at TEXT,
        balance INTEGER DEFAULT 0  -- Kontostand in Cent
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS account_attributes (
        account_uuid TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT,
        FOREIGN KEY (account_uuid) REFERENCES accounts(uuid)
    );
    """,
]

SECURITY_SCHEMA = [
    """
    CREATE TABLE IF NOT EXISTS securities (
        uuid TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        isin TEXT,
        wkn TEXT,
        ticker_symbol TEXT,
        feed TEXT,
        type TEXT,
        currency_code TEXT,
        retired INTEGER,
        updated_at TEXT,
        last_price INTEGER,           -- Letzter Preis in 10^-8 Einheiten
        last_price_date INTEGER,      -- Datum des letzten Preises (Unix-Timestamp)
        last_price_source TEXT,       -- Quelle des zuletzt geholten Preises
                                      -- (z.B. 'yahoo')
        last_price_fetched_at TEXT    -- UTC Zeitstempel (YYYY-MM-DDTHH:MM:SSZ)
                                      -- des letzten Fetch
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS historical_prices (
        security_uuid TEXT NOT NULL,  -- UUID des Wertpapiers
        date INTEGER NOT NULL,        -- Unix-Timestamp (epoch day)
        close INTEGER NOT NULL,       -- Schlusskurs in 10^-8 Einheiten
        -- Close-Werte aktiver Wertpapiere werden vollständig gehalten, um
        -- Zeitreihen ohne Lücken bereitzustellen. Retentionsregeln für
        -- archivierte Wertpapiere können in zukünftigen Migrationen folgen.
        high INTEGER,                 -- Höchstkurs in 10^-8 Einheiten
        low INTEGER,                  -- Tiefstkurs in 10^-8 Einheiten
        volume INTEGER,               -- Handelsvolumen
        fetched_at TEXT,              -- ISO8601 Zeitpunkt des Abrufs
        data_source TEXT,             -- Quelle der Historien-Daten (z.B. 'yahoo')
        provider TEXT,                -- Upstream-Providerkennung
        provenance TEXT,              -- Optionale JSON-Metadaten
        PRIMARY KEY (security_uuid, date),
        FOREIGN KEY (security_uuid) REFERENCES securities(uuid)
    );
    """,
]

PORTFOLIO_SCHEMA = [
    """
    CREATE TABLE IF NOT EXISTS portfolios (
        uuid TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        note TEXT,
        reference_account TEXT,
        is_retired INTEGER,
        updated_at TEXT
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS portfolio_attributes (
        portfolio_uuid TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT,
        FOREIGN KEY (portfolio_uuid) REFERENCES portfolios(uuid)
    );
    """,
]

PORTFOLIO_SECURITIES_SCHEMA = [
    """
    CREATE TABLE IF NOT EXISTS portfolio_securities (
        portfolio_uuid TEXT NOT NULL,       -- UUID des Depots
        security_uuid TEXT NOT NULL,        -- UUID des Wertpapiers
        current_holdings INTEGER DEFAULT 0, -- Bestand in 10^-8 Einheiten
        purchase_value INTEGER DEFAULT 0,  -- Gesamter Kaufpreis des Bestands in Cent
        avg_price INTEGER GENERATED ALWAYS AS (
            CASE
                WHEN current_holdings > 0 THEN
                    CAST(
                        ROUND(
                            (purchase_value / 100.0) * 100000000.0
                            / (current_holdings / 100000000.0)
                        ) AS INTEGER
                    )
                ELSE NULL
            END
        ) STORED,                          -- Durchschnittlicher Kaufpreis (10^-8)
        avg_price_native INTEGER,          -- Kaufpreis in nativer Währung (10^-8)
        avg_price_security INTEGER,        -- Durchschnittspreis in WP-Währung (10^-8)
        avg_price_account INTEGER,         -- Durchschnittspreis in Kontowährung (10^-8)
        security_currency_total INTEGER DEFAULT 0, -- Kaufwert in WP-Währung (10^-8)
        account_currency_total INTEGER DEFAULT 0,  -- Kaufwert in Kontowährung (10^-8)
        current_value INTEGER DEFAULT 0,   -- Aktueller Wert in 10^-8 Einheiten
        PRIMARY KEY (portfolio_uuid, security_uuid),
        FOREIGN KEY (portfolio_uuid) REFERENCES portfolios(uuid),
        FOREIGN KEY (security_uuid) REFERENCES securities(uuid)
    );
    """
]

TRANSACTION_SCHEMA = [
    """
    CREATE TABLE IF NOT EXISTS transactions (
        uuid TEXT PRIMARY KEY,
        type INTEGER NOT NULL,  -- Explizit INTEGER für Enum-Werte
        account TEXT,
        portfolio TEXT,
        other_account TEXT,
        other_portfolio TEXT,
        other_uuid TEXT,
        other_updated_at TEXT,
        date TEXT NOT NULL,     -- ISO8601 Format
        currency_code TEXT,
        amount INTEGER,         -- Cent-Betrag
        shares INTEGER,         -- *10^8 für Genauigkeit
        note TEXT,
        security TEXT,
        source TEXT,
        updated_at TEXT,
        FOREIGN KEY (account) REFERENCES accounts(uuid),
        FOREIGN KEY (portfolio) REFERENCES portfolios(uuid),
        FOREIGN KEY (security) REFERENCES securities(uuid)
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS transaction_units (
        transaction_uuid TEXT NOT NULL,
        type INTEGER NOT NULL,         -- Explizit INTEGER
        amount INTEGER,                -- Cent-Betrag
        currency_code TEXT,
        fx_amount INTEGER,             -- Optional: Cent-Betrag
        fx_currency_code TEXT,         -- Optional
        fx_rate_to_base INTEGER,      -- Optional: 10^-8 skaliert
        FOREIGN KEY (transaction_uuid) REFERENCES transactions(uuid)
    );
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_transactions_security
    ON transactions(security);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_transaction_units_currency
    ON transaction_units(fx_currency_code);
    """,
]

"""
PLAN_SCHEMA = [
    \"""
    CREATE TABLE IF NOT EXISTS plans (
        name TEXT PRIMARY KEY,
        note TEXT,
        security TEXT,
        portfolio TEXT,
        account TEXT,
        amount_str TEXT,
        amount INTEGER,               -- Betrag in 10^-8 Einheiten
        fees INTEGER,                 -- Gebühren in 10^-8 Einheiten
        taxes INTEGER,                -- Steuern in 10^-8 Einheiten
        auto_generate INTEGER,
        date TEXT,
        interval INTEGER,
        type TEXT
    );
    \""",
    \"""
    CREATE TABLE IF NOT EXISTS plan_attributes (
        plan_name TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT,
        FOREIGN KEY (plan_name) REFERENCES plans(name)
    );
    \""",
    \"""
    CREATE TABLE IF NOT EXISTS plan_transactions (
        plan_name TEXT NOT NULL,
        transaction_uuid TEXT NOT NULL,
        FOREIGN KEY (plan_name) REFERENCES plans(name)
    );
    \"""
]

WATCHLIST_SCHEMA = [
    \"""
    CREATE TABLE IF NOT EXISTS watchlists (
        name TEXT PRIMARY KEY
    );
    \""",
    \"""
    CREATE TABLE IF NOT EXISTS watchlist_securities (
        watchlist_name TEXT NOT NULL,
        security_uuid TEXT NOT NULL,
        FOREIGN KEY (watchlist_name) REFERENCES watchlists(name),
        FOREIGN KEY (security_uuid) REFERENCES securities(uuid)
    );
    \"""
]

TAXONOMY_SCHEMA = [
    \"""
    CREATE TABLE IF NOT EXISTS taxonomies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        source TEXT
    );
    \""",
    \"""
    CREATE TABLE IF NOT EXISTS taxonomy_dimensions (
        taxonomy_id TEXT NOT NULL,
        dimension TEXT NOT NULL,
        FOREIGN KEY (taxonomy_id) REFERENCES taxonomies(id)
    );
    \""",
    \"""
    CREATE TABLE IF NOT EXISTS taxonomy_classifications (
        id TEXT PRIMARY KEY,
        taxonomy_id TEXT NOT NULL,
        parent_id TEXT,
        name TEXT,
        note TEXT,
        color TEXT,
        weight INTEGER,
        rank INTEGER,
        FOREIGN KEY (taxonomy_id) REFERENCES taxonomies(id)
    );
    \""",
    \"""
    CREATE TABLE IF NOT EXISTS taxonomy_assignments (
        classification_id TEXT NOT NULL,
        investment_vehicle TEXT NOT NULL,
        weight INTEGER,
        rank INTEGER,
        FOREIGN KEY (classification_id) REFERENCES taxonomy_classifications(id)
    );
    \"""
]

DASHBOARD_SCHEMA = [
    \"""
    CREATE TABLE IF NOT EXISTS dashboards (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
    );
    \""",
    \"""
    CREATE TABLE IF NOT EXISTS dashboard_configuration (
        dashboard_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT,
        FOREIGN KEY (dashboard_id) REFERENCES dashboards(id)
    );
    \""",
    \"""
    CREATE TABLE IF NOT EXISTS dashboard_columns (
        dashboard_id TEXT NOT NULL,
        column_index INTEGER,
        weight INTEGER,
        FOREIGN KEY (dashboard_id) REFERENCES dashboards(id)
    );
    \""",
    \"""
    CREATE TABLE IF NOT EXISTS dashboard_widgets (
        dashboard_id TEXT NOT NULL,
        column_index INTEGER,
        widget_index INTEGER,
        type TEXT,
        label TEXT,
        FOREIGN KEY (dashboard_id) REFERENCES dashboards(id)
    );
    \""",
    \"""
    CREATE TABLE IF NOT EXISTS widget_configuration (
        dashboard_id TEXT NOT NULL,
        column_index INTEGER,
        widget_index INTEGER,
        key TEXT NOT NULL,
        value TEXT
    );
    \"""
]

SETTINGS_SCHEMA = [
    \"""
    CREATE TABLE IF NOT EXISTS settings_bookmarks (
        label TEXT NOT NULL,
        pattern TEXT NOT NULL
    );
    \""",
    \"""
    CREATE TABLE IF NOT EXISTS settings_attribute_types (
        id TEXT PRIMARY KEY,
        name TEXT,
        column_label TEXT,
        source TEXT,
        target TEXT,
        type TEXT,
        converter_class TEXT
    );
    \""",
    \"""
    CREATE TABLE IF NOT EXISTS settings_configuration_sets (
        key TEXT PRIMARY KEY,
        uuid TEXT,
        name TEXT,
        data TEXT
    );
    \"""
]

PROPERTIES_SCHEMA = [
    \"""
    CREATE TABLE IF NOT EXISTS client_properties (
        key TEXT PRIMARY KEY,
        value TEXT
    );
    \"""
]

EXCHANGE_SCHEMA = [
    \"""
    CREATE TABLE IF NOT EXISTS exchange_rate_series (
        base_currency TEXT NOT NULL,
        term_currency TEXT NOT NULL,
        last_modified TEXT
    );
    \""",
    \"""
    CREATE TABLE IF NOT EXISTS exchange_rates (
        base_currency TEXT NOT NULL,
        term_currency TEXT NOT NULL,
        date TEXT NOT NULL,
        rate INTEGER NOT NULL,        -- Wechselkurs in 10^-8 Einheiten
        PRIMARY KEY (base_currency, term_currency, date)
    );
    \"""
]
"""

FX_SCHEMA = [
    """
    CREATE TABLE IF NOT EXISTS fx_rates (
        date TEXT NOT NULL,
        currency TEXT NOT NULL,
        rate INTEGER NOT NULL,       -- Wechselkurs in 10^-8 Einheiten
        fetched_at TEXT,             -- ISO8601 Zeitpunkt des Abrufs
        data_source TEXT,            -- Datenquelle (z.B. 'frankfurter', 'cache')
        provider TEXT,               -- Upstream-Providerkennung
        provenance TEXT,             -- Optionale JSON-Metadaten
        PRIMARY KEY (date, currency)
    );
    """,
]

PRICE_HISTORY_QUEUE_SCHEMA = [
    """
    CREATE TABLE IF NOT EXISTS price_history_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        security_uuid TEXT NOT NULL,     -- UUID des Wertpapiers
        requested_date INTEGER,          -- Gewünschtes Datum (epoch day)
        status TEXT NOT NULL DEFAULT 'pending',
        priority INTEGER NOT NULL DEFAULT 0,
        attempts INTEGER NOT NULL DEFAULT 0,
        scheduled_at TEXT,               -- ISO8601 Zeitpunkt der Planung
        started_at TEXT,                 -- ISO8601 Beginn der Verarbeitung
        finished_at TEXT,                -- ISO8601 Abschluss der Verarbeitung
        last_error TEXT,                 -- Letzte Fehlermeldung für Debugging
        data_source TEXT,                -- Zielquelle der Historien-Daten
        provenance TEXT,                 -- Optionale JSON-Metadaten
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        updated_at TEXT,
        FOREIGN KEY (security_uuid) REFERENCES securities(uuid)
    );
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_price_history_queue_status
    ON price_history_queue (status, priority, scheduled_at);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_price_history_queue_security_date
    ON price_history_queue (security_uuid, requested_date);
    """,
]

METADATA_SCHEMA = [
    """
    CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        date TEXT NOT NULL
    );
    """
]

INGESTION_SCHEMA = [
    """
    CREATE TABLE IF NOT EXISTS ingestion_metadata (
        run_id TEXT PRIMARY KEY,
        file_path TEXT,
        parsed_at TEXT,
        pp_version INTEGER,
        base_currency TEXT,
        properties TEXT
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS ingestion_accounts (
        uuid TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        currency_code TEXT,
        note TEXT,
        is_retired INTEGER,
        attributes TEXT,
        updated_at TEXT
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS ingestion_portfolios (
        uuid TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        note TEXT,
        reference_account TEXT,
        is_retired INTEGER,
        attributes TEXT,
        updated_at TEXT
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS ingestion_securities (
        uuid TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        currency_code TEXT,
        target_currency_code TEXT,
        isin TEXT,
        ticker_symbol TEXT,
        wkn TEXT,
        note TEXT,
        online_id TEXT,
        feed TEXT,
        feed_url TEXT,
        latest_feed TEXT,
        latest_feed_url TEXT,
        latest_date INTEGER,
        latest_close INTEGER,
        latest_high INTEGER,
        latest_low INTEGER,
        latest_volume INTEGER,
        is_retired INTEGER,
        attributes TEXT,
        properties TEXT,
        updated_at TEXT
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS ingestion_transactions (
        uuid TEXT PRIMARY KEY,
        type INTEGER NOT NULL,
        account TEXT,
        portfolio TEXT,
        other_account TEXT,
        other_portfolio TEXT,
        other_uuid TEXT,
        other_updated_at TEXT,
        date TEXT,
        currency_code TEXT,
        amount INTEGER,
        shares INTEGER,
        note TEXT,
        security TEXT,
        source TEXT,
        updated_at TEXT,
        FOREIGN KEY (account) REFERENCES ingestion_accounts(uuid),
        FOREIGN KEY (portfolio) REFERENCES ingestion_portfolios(uuid),
        FOREIGN KEY (security) REFERENCES ingestion_securities(uuid)
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS ingestion_transaction_units (
        transaction_uuid TEXT NOT NULL,
        unit_index INTEGER NOT NULL,
        type INTEGER NOT NULL,
        amount INTEGER,
        currency_code TEXT,
        fx_amount INTEGER,
        fx_currency_code TEXT,
        fx_rate_to_base REAL,
        PRIMARY KEY (transaction_uuid, unit_index),
        FOREIGN KEY (transaction_uuid) REFERENCES ingestion_transactions(uuid)
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS ingestion_historical_prices (
        security_uuid TEXT NOT NULL,
        date INTEGER NOT NULL,
        close INTEGER,
        high INTEGER,
        low INTEGER,
        volume INTEGER,
        fetched_at TEXT,
        data_source TEXT,
        provider TEXT,
        provenance TEXT,
        PRIMARY KEY (security_uuid, date),
        FOREIGN KEY (security_uuid) REFERENCES ingestion_securities(uuid)
    );
    """,
]

METRIC_RUNS_SCHEMA = [
    """
    CREATE TABLE IF NOT EXISTS metric_runs (
        run_uuid TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        trigger TEXT,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        duration_ms INTEGER,
        total_entities INTEGER,
        processed_portfolios INTEGER,
        processed_accounts INTEGER,
        processed_securities INTEGER,
        error_message TEXT,
        provenance TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        updated_at TEXT
    );
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_metric_runs_status
    ON metric_runs (status);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_metric_runs_started_at
    ON metric_runs (started_at);
    """,
]

PORTFOLIO_METRICS_SCHEMA = [
    """
    CREATE TABLE IF NOT EXISTS portfolio_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        metric_run_uuid TEXT NOT NULL,
        portfolio_uuid TEXT NOT NULL,
        valuation_currency TEXT NOT NULL DEFAULT 'EUR',
        current_value_cents INTEGER NOT NULL DEFAULT 0,
        purchase_value_cents INTEGER NOT NULL DEFAULT 0,
        gain_abs_cents INTEGER NOT NULL DEFAULT 0,
        gain_pct REAL,
        total_change_eur_cents INTEGER NOT NULL DEFAULT 0,
        total_change_pct REAL,
        source TEXT,
        coverage_ratio REAL,
        position_count INTEGER DEFAULT 0,
        missing_value_positions INTEGER DEFAULT 0,
        provenance TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        updated_at TEXT,
        UNIQUE(metric_run_uuid, portfolio_uuid),
        FOREIGN KEY (metric_run_uuid)
            REFERENCES metric_runs(run_uuid)
            ON DELETE CASCADE,
        FOREIGN KEY (portfolio_uuid)
            REFERENCES portfolios(uuid)
            ON DELETE CASCADE
    );
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_portfolio_metrics_portfolio
    ON portfolio_metrics (portfolio_uuid);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_portfolio_metrics_run
    ON portfolio_metrics (metric_run_uuid);
    """,
]

ACCOUNT_METRICS_SCHEMA = [
    """
    CREATE TABLE IF NOT EXISTS account_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        metric_run_uuid TEXT NOT NULL,
        account_uuid TEXT NOT NULL,
        currency_code TEXT NOT NULL,
        valuation_currency TEXT NOT NULL DEFAULT 'EUR',
        balance_native_cents INTEGER NOT NULL DEFAULT 0,
        balance_eur_cents INTEGER,
        fx_rate REAL,
        fx_rate_source TEXT,
        fx_rate_timestamp TEXT,
        coverage_ratio REAL,
        provenance TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        updated_at TEXT,
        UNIQUE(metric_run_uuid, account_uuid),
        FOREIGN KEY (metric_run_uuid)
            REFERENCES metric_runs(run_uuid)
            ON DELETE CASCADE,
        FOREIGN KEY (account_uuid)
            REFERENCES accounts(uuid)
            ON DELETE CASCADE
    );
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_account_metrics_account
    ON account_metrics (account_uuid);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_account_metrics_run
    ON account_metrics (metric_run_uuid);
    """,
]

SECURITY_METRICS_SCHEMA = [
    """
    CREATE TABLE IF NOT EXISTS security_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        metric_run_uuid TEXT NOT NULL,
        portfolio_uuid TEXT NOT NULL,
        security_uuid TEXT NOT NULL,
        valuation_currency TEXT NOT NULL DEFAULT 'EUR',
        security_currency_code TEXT NOT NULL,
        holdings_raw INTEGER NOT NULL DEFAULT 0,
        current_value_cents INTEGER NOT NULL DEFAULT 0,
        purchase_value_cents INTEGER NOT NULL DEFAULT 0,
        purchase_security_value_raw INTEGER,
        purchase_account_value_cents INTEGER,
        gain_abs_cents INTEGER NOT NULL DEFAULT 0,
        gain_pct REAL,
        total_change_eur_cents INTEGER NOT NULL DEFAULT 0,
        total_change_pct REAL,
        source TEXT,
        coverage_ratio REAL,
        day_change_native REAL,
        day_change_eur REAL,
        day_change_pct REAL,
        day_change_source TEXT,
        day_change_coverage REAL,
        last_price_native_raw INTEGER,
        last_close_native_raw INTEGER,
        provenance TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        updated_at TEXT,
        UNIQUE(metric_run_uuid, portfolio_uuid, security_uuid),
        FOREIGN KEY (metric_run_uuid)
            REFERENCES metric_runs(run_uuid)
            ON DELETE CASCADE,
        FOREIGN KEY (portfolio_uuid)
            REFERENCES portfolios(uuid)
            ON DELETE CASCADE,
        FOREIGN KEY (security_uuid)
            REFERENCES securities(uuid)
            ON DELETE CASCADE
    );
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_security_metrics_security
    ON security_metrics (security_uuid);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_security_metrics_portfolio
    ON security_metrics (portfolio_uuid);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_security_metrics_run
    ON security_metrics (metric_run_uuid);
    """,
]

PORTFOLIO_SNAPSHOT_SCHEMA = [
    """
    CREATE TABLE IF NOT EXISTS portfolio_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        metric_run_uuid TEXT NOT NULL,
        portfolio_uuid TEXT NOT NULL,
        snapshot_at TEXT NOT NULL,
        name TEXT NOT NULL,
        currency_code TEXT NOT NULL DEFAULT 'EUR',
        current_value REAL NOT NULL DEFAULT 0.0,
        purchase_sum REAL NOT NULL DEFAULT 0.0,
        gain_abs REAL NOT NULL DEFAULT 0.0,
        gain_pct REAL,
        total_change_eur REAL,
        total_change_pct REAL,
        position_count INTEGER NOT NULL DEFAULT 0,
        missing_value_positions INTEGER NOT NULL DEFAULT 0,
        has_current_value INTEGER NOT NULL DEFAULT 1,
        coverage_ratio REAL,
        performance_source TEXT,
        performance_provenance TEXT,
        provenance TEXT,
        payload TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        updated_at TEXT,
        UNIQUE(metric_run_uuid, portfolio_uuid),
        FOREIGN KEY (metric_run_uuid)
            REFERENCES metric_runs(run_uuid)
            ON DELETE CASCADE,
        FOREIGN KEY (portfolio_uuid)
            REFERENCES portfolios(uuid)
            ON DELETE CASCADE
    );
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_run
    ON portfolio_snapshots (metric_run_uuid);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_portfolio
    ON portfolio_snapshots (portfolio_uuid);
    """,
]

ACCOUNT_SNAPSHOT_SCHEMA = [
    """
    CREATE TABLE IF NOT EXISTS account_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        metric_run_uuid TEXT NOT NULL,
        account_uuid TEXT NOT NULL,
        snapshot_at TEXT NOT NULL,
        name TEXT NOT NULL,
        currency_code TEXT NOT NULL,
        orig_balance REAL NOT NULL DEFAULT 0.0,
        balance REAL,
        fx_unavailable INTEGER NOT NULL DEFAULT 0,
        fx_rate REAL,
        fx_rate_source TEXT,
        fx_rate_timestamp TEXT,
        coverage_ratio REAL,
        provenance TEXT,
        payload TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        updated_at TEXT,
        UNIQUE(metric_run_uuid, account_uuid),
        FOREIGN KEY (metric_run_uuid)
            REFERENCES metric_runs(run_uuid)
            ON DELETE CASCADE,
        FOREIGN KEY (account_uuid)
            REFERENCES accounts(uuid)
            ON DELETE CASCADE
    );
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_account_snapshots_run
    ON account_snapshots (metric_run_uuid);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_account_snapshots_account
    ON account_snapshots (account_uuid);
    """,
]

ALL_SCHEMAS = [
    *ACCOUNT_SCHEMA,
    *SECURITY_SCHEMA,
    *PORTFOLIO_SCHEMA,
    *PORTFOLIO_SECURITIES_SCHEMA,
    *TRANSACTION_SCHEMA,
    *FX_SCHEMA,
    *PRICE_HISTORY_QUEUE_SCHEMA,
    *METADATA_SCHEMA,
    *INGESTION_SCHEMA,
    *METRIC_RUNS_SCHEMA,
    *PORTFOLIO_METRICS_SCHEMA,
    *ACCOUNT_METRICS_SCHEMA,
    *SECURITY_METRICS_SCHEMA,
    *PORTFOLIO_SNAPSHOT_SCHEMA,
    *ACCOUNT_SNAPSHOT_SCHEMA,
]

# Performance Index für On-Demand Portfolio Aggregation:
# fetch_live_portfolios greift häufig nach portfolio_securities per portfolio_uuid zu.
# Der Index reduziert Lookup-/Aggregationszeit ohne bestehende Abfragen zu beeinflussen.
SCHEMA_LIVE_AGGREGATION_INDEX = """
CREATE INDEX IF NOT EXISTS idx_portfolio_securities_portfolio
ON portfolio_securities (portfolio_uuid)
"""

# Aufnahme des neuen Index in ALL_SCHEMAS (additiv, idempotent)
# Fallback: Falls ALL_SCHEMAS hier noch nicht definiert war (unwahrscheinlich),
# würde dies ein Entwicklungsproblem anzeigen.
with suppress(NameError):
    ALL_SCHEMAS.append(SCHEMA_LIVE_AGGREGATION_INDEX)  # type: ignore[attr-defined]
