"""Command-line interface for the banking system."""

from __future__ import annotations

from bank_system.exceptions import BankingError
from bank_system.services import Bank


def run_cli(bank: Bank | None = None) -> None:
    """Interactive CLI for quick operations."""
    bank = bank or Bank()
    menu = (
        "\n1. Create account\n"
        "2. Deposit\n"
        "3. Withdraw\n"
        "4. Apply interest\n"
        "5. Show history\n"
        "6. List accounts\n"
        "0. Exit\n"
    )

    while True:
        print(menu)
        choice = input("Choose an option: ").strip()
        try:
            if choice == "1":
                account_type = input("Type (Savings/Current/Fixed Deposit): ")
                account_id = input("Account ID (AA1234): ").strip().upper()
                owner = input("Owner name: ").strip()
                initial = float(input("Initial deposit: "))
                account = bank.create_account(account_type, account_id, owner, initial)
                print(f"Created {account.account_type} account for {owner}.")
            elif choice == "2":
                acc_id = input("Account ID: ").strip().upper()
                amount = float(input("Amount to deposit: "))
                balance = bank.deposit(acc_id, amount)
                print(f"New balance: ${balance:.2f}")
            elif choice == "3":
                acc_id = input("Account ID: ").strip().upper()
                amount = float(input("Amount to withdraw: "))
                balance = bank.withdraw(acc_id, amount)
                print(f"New balance: ${balance:.2f}")
            elif choice == "4":
                acc_id = input("Account ID: ").strip().upper()
                interest = bank.apply_interest(acc_id)
                print(f"Interest applied: ${interest:.2f}")
            elif choice == "5":
                acc_id = input("Account ID: ").strip().upper()
                for item in bank.get_transaction_history(acc_id):
                    print(item)
            elif choice == "6":
                for acc in bank.list_accounts():
                    print(f"{acc.account_id} | {acc.owner_name} | {acc.account_type} | ${acc.balance:.2f}")
            elif choice == "0":
                print("Goodbye!")
                break
            else:
                print("Unknown option, please retry.")
        except (ValueError, BankingError) as exc:
            print(f"Error: {exc}")
