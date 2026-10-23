"""Domain models for the banking system.

This module demonstrates class hierarchy and polymorphism through account
subclasses that implement account-specific interest calculation behavior.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import List


@dataclass
class Transaction:
    """Represents a movement of money on an account."""

    kind: str
    amount: float
    timestamp: datetime = field(default_factory=datetime.now)

    def to_readable(self) -> str:
        """Return a human-readable transaction string for UI and reports."""
        return f"{self.timestamp:%Y-%m-%d %H:%M:%S} - {self.kind}: ${self.amount:.2f}"


class Account(ABC):
    """Base class for all bank account types."""

    def __init__(self, account_id: str, owner_name: str, initial_deposit: float = 0.0) -> None:
        self.account_id = account_id
        self.owner_name = owner_name
        self.balance = initial_deposit
        self.transactions: List[Transaction] = []
        if initial_deposit > 0:
            self.transactions.append(Transaction("Initial Deposit", initial_deposit))

    @property
    @abstractmethod
    def account_type(self) -> str:
        """Concrete account type name."""

    def deposit(self, amount: float) -> None:
        """Increase balance and record a deposit."""
        self.balance += amount
        self.transactions.append(Transaction("Deposit", amount))

    def withdraw(self, amount: float) -> None:
        """Decrease balance and record a withdrawal."""
        self.balance -= amount
        self.transactions.append(Transaction("Withdrawal", amount))

    @abstractmethod
    def calculate_interest(self) -> float:
        """Calculate interest for this account type."""

    def apply_interest(self) -> float:
        """Apply calculated interest and return the amount."""
        interest = self.calculate_interest()
        if interest > 0:
            self.balance += interest
            self.transactions.append(Transaction("Interest", interest))
        return interest


class SavingsAccount(Account):
    """Savings account with a fixed annualized interest rate."""

    INTEREST_RATE = 0.04

    @property
    def account_type(self) -> str:
        return "Savings"

    def calculate_interest(self) -> float:
        return self.balance * self.INTEREST_RATE


class CurrentAccount(Account):
    """Current account with little/no interest."""

    INTEREST_RATE = 0.01

    @property
    def account_type(self) -> str:
        return "Current"

    def calculate_interest(self) -> float:
        return self.balance * self.INTEREST_RATE


class FixedDepositAccount(Account):
    """Fixed deposit account with higher interest and no overdraft allowed."""

    INTEREST_RATE = 0.06

    @property
    def account_type(self) -> str:
        return "Fixed Deposit"

    def calculate_interest(self) -> float:
        return self.balance * self.INTEREST_RATE
