import pytest

from bank_system.exceptions import InsufficientFundsError, ValidationError
from bank_system.services import Bank


def test_create_and_deposit_and_withdraw_flow():
    bank = Bank()
    bank.create_account("Savings", "AB1234", "Alice", 100)

    assert bank.deposit("AB1234", 50) == pytest.approx(150)
    assert bank.withdraw("AB1234", 20) == pytest.approx(130)


def test_interest_polymorphism_differs_by_account_type():
    bank = Bank()
    savings = bank.create_account("Savings", "CD2345", "Bob", 1000)
    current = bank.create_account("Current", "EF3456", "Eve", 1000)

    assert savings.calculate_interest() == pytest.approx(40)
    assert current.calculate_interest() == pytest.approx(10)


def test_withdraw_insufficient_funds_raises_error():
    bank = Bank()
    bank.create_account("Savings", "GH4567", "John", 100)

    with pytest.raises(InsufficientFundsError):
        bank.withdraw("GH4567", 999)


def test_invalid_account_id_raises_validation_error():
    bank = Bank()

    with pytest.raises(ValidationError):
        bank.create_account("Savings", "invalid", "Owner", 50)
