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
CONF_FX_UPDATE_INTERVAL_SECONDS = "fx_update_interval_seconds"
DEFAULT_FX_UPDATE_INTERVAL_SECONDS = 6 * 3600  # 6 hours
MIN_FX_UPDATE_INTERVAL_SECONDS = 900  # 15 minutes
