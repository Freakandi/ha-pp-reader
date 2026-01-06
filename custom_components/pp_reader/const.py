"""Constants for the Portfolio Performance Reader integration."""

DOMAIN = "pp_reader"
CONF_FILE_PATH = "file_path"
CONF_DB_PATH = "db_path"
CONF_HISTORY_RETENTION_YEARS = "history_retention_years"
DEFAULT_NAME = "Portfolio Performance"
EVENT_PARSER_PROGRESS = "pp_reader_parser_progress"
SIGNAL_PARSER_PROGRESS = "pp_reader_parser_progress_signal"
SIGNAL_PARSER_COMPLETED = "pp_reader_parser_completed_signal"
EVENT_ENRICHMENT_PROGRESS = "pp_reader_enrichment_progress"
SIGNAL_ENRICHMENT_PROGRESS = "pp_reader_enrichment_progress_signal"
SIGNAL_ENRICHMENT_COMPLETED = "pp_reader_enrichment_completed_signal"
EVENT_METRICS_PROGRESS = "pp_reader_metrics_progress"
SIGNAL_METRICS_PROGRESS = "pp_reader_metrics_progress_signal"
EVENT_NORMALIZATION_PROGRESS = "pp_reader_normalization_progress"
SIGNAL_NORMALIZATION_PROGRESS = "pp_reader_normalization_progress_signal"
CONF_FX_UPDATE_INTERVAL_SECONDS = "fx_update_interval_seconds"
DEFAULT_FX_UPDATE_INTERVAL_SECONDS = 6 * 3600  # 6 hours
MIN_FX_UPDATE_INTERVAL_SECONDS = 900  # 15 minutes
DEFAULT_DB_SUBDIR = "pp_reader_data"
CONFIG_ENTRY_VERSION = 3

SHARE_EPSILON = 1e-9
EIGHT_DECIMAL_SCALE = 10**8


class TransactionType:
    """Enumeration of transaction types."""

    BUY = 0
    SELL = 1
    INBOUND_DELIVERY = 2
    OUTBOUND_DELIVERY = 3
    SECURITY_TRANSFER = 4
    CASH_TRANSFER = 5
    DEPOSIT = 6
    REMOVAL = 7
    DIVIDEND = 8
    INTEREST = 9
    INTEREST_CHARGE = 10
    TAX = 11
    TAX_REFUND = 12
    FEE = 13
    FEE_REFUND = 14


class UnitType:
    """Enumeration of transaction unit types."""

    TAX = 1
    FEE = 2
