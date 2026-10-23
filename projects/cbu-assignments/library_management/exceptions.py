"""Custom exceptions for the library management system."""


class LibraryError(Exception):
    """Base exception for domain-specific library errors."""


class BookNotFoundError(LibraryError):
    """Raised when a book is missing from inventory."""


class BookUnavailableError(LibraryError):
    """Raised when a requested book cannot be borrowed."""


class MemberNotFoundError(LibraryError):
    """Raised when a member record does not exist."""


class ValidationError(LibraryError):
    """Raised when a field fails validation."""
