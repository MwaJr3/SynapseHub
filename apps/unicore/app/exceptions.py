"""Domain exception hierarchy."""


class UnicoreError(ValueError):
    """Base class for user-facing rule violations."""


class DuplicateIdentifierError(UnicoreError):
    pass


class NotFoundError(UnicoreError):
    pass


class EnrolmentRuleError(UnicoreError):
    pass


class InvalidGradeError(UnicoreError):
    pass
