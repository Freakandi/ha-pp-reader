# db_schema.py

ACCOUNT_SCHEMA = [
    """
    CREATE TABLE IF NOT EXISTS accounts (
        uuid TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        currency_code TEXT NOT NULL,
        note TEXT,
        is_retired INTEGER,
        updated_at TEXT
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS account_attributes (
        account_uuid TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT,
        FOREIGN KEY (account_uuid) REFERENCES accounts(uuid)
    );
    """
]

SECURITIES_SCHEMA = [
    """
    CREATE TABLE IF NOT EXISTS securities (
        uuid TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        currency_code TEXT NOT NULL,
        note TEXT,
        isin TEXT,
        wkn TEXT,
        ticker_symbol TEXT,
        retired INTEGER DEFAULT 0,
        updated_at TEXT
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS latest_prices (
        security_uuid TEXT PRIMARY KEY,
        value INTEGER NOT NULL,  -- Preis in 10^-8 Einheiten
        date INTEGER NOT NULL,   -- Unix Timestamp wie im Protobuf
        FOREIGN KEY (security_uuid) REFERENCES securities(uuid)
    );
    """
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
        fx_amount INTEGER,             -- Cent-Betrag
        fx_currency_code TEXT,
        fx_rate_to_base REAL NOT NULL, -- Immer positiver Float
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
    """
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
        amount REAL,
        fees REAL,
        taxes REAL,
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
        rate REAL NOT NULL,
        PRIMARY KEY (base_currency, term_currency, date)
    );
    \"""
]
"""

FX_SCHEMA = ["""
CREATE TABLE IF NOT EXISTS fx_rates (
    date TEXT NOT NULL,
    currency TEXT NOT NULL,
    rate REAL NOT NULL,
    PRIMARY KEY (date, currency)
);
"""]


ALL_SCHEMAS = [
    *ACCOUNT_SCHEMA,
    *SECURITIES_SCHEMA,
    *PORTFOLIO_SCHEMA,
    *TRANSACTION_SCHEMA,
    *FX_SCHEMA
]
