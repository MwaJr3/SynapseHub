"""Domain-specific exceptions with actionable failure messages."""


class StockAnalysisError(Exception):
    """Base class for project errors."""


class ConfigurationError(StockAnalysisError, ValueError):
    """Raised when tickers, dates, or analysis settings are invalid."""


class DataDownloadError(StockAnalysisError):
    """Raised when requested market data cannot be retrieved or loaded."""


class DataValidationError(StockAnalysisError, ValueError):
    """Raised when market data violates required quality rules."""


class InsufficientDataError(DataValidationError):
    """Raised when a calculation does not have enough observations."""
