"""Comparative financial time-series analysis toolkit."""

from .config import AnalysisConfig
from .data_loader import DownloadResult, download_stock_data, load_local_stock_data
from .data_validation import ValidationReport, validate_stock_data
from .metrics import calculate_performance_metrics, create_summary_table
from .time_series import calculate_moving_averages, resample_ohlcv

__all__ = [
    "AnalysisConfig",
    "DownloadResult",
    "ValidationReport",
    "calculate_moving_averages",
    "calculate_performance_metrics",
    "create_summary_table",
    "download_stock_data",
    "load_local_stock_data",
    "resample_ohlcv",
    "validate_stock_data",
]

__version__ = "2.0.0"
