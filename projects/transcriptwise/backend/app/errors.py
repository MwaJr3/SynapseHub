from fastapi import HTTPException


class AppError(HTTPException):
    def __init__(self, status: int, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(status_code=status, detail={"code": code, "message": message})


class ServiceError(Exception):
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)
