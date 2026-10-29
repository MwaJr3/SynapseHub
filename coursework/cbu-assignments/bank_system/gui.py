"""Tkinter GUI for the banking system."""

from __future__ import annotations

import tkinter as tk
from tkinter import messagebox, ttk

from bank_system.exceptions import BankingError
from bank_system.services import Bank


class BankingApp(tk.Tk):
    """Simple GUI wrapper over the bank service."""

    def __init__(self, bank: Bank) -> None:
        super().__init__()
        self.bank = bank
        self.title("Banking System")
        self.geometry("760x520")
        self._build_widgets()

    def _build_widgets(self) -> None:
        form = ttk.LabelFrame(self, text="Account Creation")
        form.pack(fill="x", padx=10, pady=10)

        self.type_var = tk.StringVar(value="Savings")
        self.id_var = tk.StringVar()
        self.owner_var = tk.StringVar()
        self.initial_var = tk.StringVar(value="100")

        ttk.Label(form, text="Type").grid(row=0, column=0, padx=5, pady=5)
        ttk.Combobox(form, values=["Savings", "Current", "Fixed Deposit"], textvariable=self.type_var).grid(
            row=0, column=1, padx=5, pady=5
        )
        ttk.Label(form, text="Account ID").grid(row=0, column=2, padx=5, pady=5)
        ttk.Entry(form, textvariable=self.id_var).grid(row=0, column=3, padx=5, pady=5)
        ttk.Label(form, text="Owner").grid(row=1, column=0, padx=5, pady=5)
        ttk.Entry(form, textvariable=self.owner_var).grid(row=1, column=1, padx=5, pady=5)
        ttk.Label(form, text="Initial Deposit").grid(row=1, column=2, padx=5, pady=5)
        ttk.Entry(form, textvariable=self.initial_var).grid(row=1, column=3, padx=5, pady=5)
        ttk.Button(form, text="Create Account", command=self.create_account).grid(
            row=2, column=0, columnspan=4, pady=6
        )

        actions = ttk.LabelFrame(self, text="Transactions")
        actions.pack(fill="x", padx=10, pady=10)

        self.target_id_var = tk.StringVar()
        self.amount_var = tk.StringVar(value="50")

        ttk.Label(actions, text="Account ID").grid(row=0, column=0, padx=5, pady=5)
        ttk.Entry(actions, textvariable=self.target_id_var).grid(row=0, column=1, padx=5, pady=5)
        ttk.Label(actions, text="Amount").grid(row=0, column=2, padx=5, pady=5)
        ttk.Entry(actions, textvariable=self.amount_var).grid(row=0, column=3, padx=5, pady=5)
        ttk.Button(actions, text="Deposit", command=self.deposit).grid(row=1, column=0, padx=5, pady=5)
        ttk.Button(actions, text="Withdraw", command=self.withdraw).grid(row=1, column=1, padx=5, pady=5)
        ttk.Button(actions, text="Apply Interest", command=self.apply_interest).grid(row=1, column=2, padx=5, pady=5)
        ttk.Button(actions, text="Show History", command=self.show_history).grid(row=1, column=3, padx=5, pady=5)

        self.output = tk.Text(self, height=15)
        self.output.pack(fill="both", expand=True, padx=10, pady=10)

    def create_account(self) -> None:
        try:
            account = self.bank.create_account(
                self.type_var.get(),
                self.id_var.get().strip().upper(),
                self.owner_var.get().strip(),
                float(self.initial_var.get()),
            )
            self._log(f"Created {account.account_type} account for {account.owner_name} ({account.account_id}).")
        except (ValueError, BankingError) as exc:
            self._error(exc)

    def deposit(self) -> None:
        self._run_operation(lambda acc_id, amount: self.bank.deposit(acc_id, amount), "Deposited")

    def withdraw(self) -> None:
        self._run_operation(lambda acc_id, amount: self.bank.withdraw(acc_id, amount), "Withdrew")

    def apply_interest(self) -> None:
        try:
            interest = self.bank.apply_interest(self.target_id_var.get().strip().upper())
            self._log(f"Interest applied: ${interest:.2f}")
        except BankingError as exc:
            self._error(exc)

    def show_history(self) -> None:
        try:
            history = self.bank.get_transaction_history(self.target_id_var.get().strip().upper())
            if not history:
                self._log("No transactions yet.")
                return
            self._log("Transaction history:")
            for item in history:
                self._log(f"  {item}")
        except BankingError as exc:
            self._error(exc)

    def _run_operation(self, operation, label: str) -> None:
        try:
            acc_id = self.target_id_var.get().strip().upper()
            amount = float(self.amount_var.get())
            balance = operation(acc_id, amount)
            self._log(f"{label} ${amount:.2f}. New balance: ${balance:.2f}")
        except (ValueError, BankingError) as exc:
            self._error(exc)

    def _error(self, error: Exception) -> None:
        messagebox.showerror("Banking Error", str(error))
        self._log(f"ERROR: {error}")

    def _log(self, message: str) -> None:
        self.output.insert("end", message + "\n")
        self.output.see("end")


def launch_gui(bank: Bank | None = None) -> None:
    """Run the Tkinter application."""
    app = BankingApp(bank or Bank())
    app.mainloop()
