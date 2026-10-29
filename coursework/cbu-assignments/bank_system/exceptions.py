"""Custom exception types for the banking system."""


class BankingError(Exception):
    """Base exception for banking-related failures."""


class ValidationError(BankingError):
    """Raised when user input or business data is invalid."""


class InsufficientFundsError(BankingError):
    """Raised when a withdrawal exceeds available balance."""


class AccountNotFoundError(BankingError):
    """Raised when an account id does not exist in the bank."""
