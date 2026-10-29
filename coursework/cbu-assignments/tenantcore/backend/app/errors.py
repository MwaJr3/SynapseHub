from typing import Any


class AppError(Exception):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details


class NotFoundError(AppError):
    def __init__(self, resource: str = "Resource") -> None:
        super().__init__(404, "NOT_FOUND", f"{resource} was not found")


class PermissionDeniedError(AppError):
    def __init__(self, message: str = "You do not have permission to perform this action") -> None:
        super().__init__(403, "PERMISSION_DENIED", message)
