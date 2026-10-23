"""Business services for managing accounts and operations."""

from __future__ import annotations

import re
from typing import Dict, List

from bank_system.exceptions import AccountNotFoundError, InsufficientFundsError, ValidationError
from bank_system.models import Account, CurrentAccount, FixedDepositAccount, SavingsAccount


class Bank:
    """Facade service that coordinates account operations."""

    ACCOUNT_PATTERN = re.compile(r"^[A-Z]{2}\d{4}$")

    def __init__(self) -> None:
        self._accounts: Dict[str, Account] = {}

    def create_account(
        self, account_type: str, account_id: str, owner_name: str, initial_deposit: float = 0.0
    ) -> Account:
        """Create a new account and store it in the bank registry."""
        self._validate_account_id(account_id)
        self._validate_owner_name(owner_name)
        self._validate_amount(initial_deposit)

        if account_id in self._accounts:
            raise ValidationError(f"Account '{account_id}' already exists.")

        normalized = account_type.strip().lower()
        if normalized == "savings":
            account = SavingsAccount(account_id, owner_name, initial_deposit)
        elif normalized == "current":
            account = CurrentAccount(account_id, owner_name, initial_deposit)
        elif normalized in {"fixed", "fixed deposit", "fixed_deposit"}:
            account = FixedDepositAccount(account_id, owner_name, initial_deposit)
        else:
            raise ValidationError("Unknown account type. Use Savings, Current, or Fixed Deposit.")

        self._accounts[account_id] = account
        return account

    def get_account(self, account_id: str) -> Account:
        """Get account by id or raise an explicit error."""
        try:
            return self._accounts[account_id]
        except KeyError as exc:
            raise AccountNotFoundError(f"Account '{account_id}' was not found.") from exc

    def deposit(self, account_id: str, amount: float) -> float:
        """Deposit money and return the new balance."""
        self._validate_amount(amount)
        account = self.get_account(account_id)
        account.deposit(amount)
        return account.balance

    def withdraw(self, account_id: str, amount: float) -> float:
        """Withdraw money and return the new balance."""
        self._validate_amount(amount)
        account = self.get_account(account_id)
        if amount > account.balance:
            raise InsufficientFundsError(
                f"Cannot withdraw ${amount:.2f}; available balance is ${account.balance:.2f}."
            )
        account.withdraw(amount)
        return account.balance

    def apply_interest(self, account_id: str) -> float:
        """Apply interest on a single account and return interest amount."""
        account = self.get_account(account_id)
        return account.apply_interest()

    def get_transaction_history(self, account_id: str) -> List[str]:
        """Get a human-readable list of transactions for an account."""
        account = self.get_account(account_id)
        return [t.to_readable() for t in account.transactions]

    def list_accounts(self) -> List[Account]:
        """Return all accounts currently stored."""
        return list(self._accounts.values())

    @classmethod
    def _validate_amount(cls, amount: float) -> None:
        if not isinstance(amount, (int, float)):
            raise ValidationError("Amount must be numeric.")
        if amount <= 0:
            raise ValidationError("Amount must be greater than zero.")

    @classmethod
    def _validate_account_id(cls, account_id: str) -> None:
        if not cls.ACCOUNT_PATTERN.match(account_id):
            raise ValidationError("Account ID must match format AA1234.")

    @staticmethod
    def _validate_owner_name(owner_name: str) -> None:
        if not owner_name or len(owner_name.strip()) < 2:
            raise ValidationError("Owner name must contain at least 2 characters.")
