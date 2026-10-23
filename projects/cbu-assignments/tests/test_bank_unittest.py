import unittest

from bank_system.exceptions import AccountNotFoundError
from bank_system.services import Bank


class TestBankWithUnittest(unittest.TestCase):
    def setUp(self) -> None:
        self.bank = Bank()
        self.bank.create_account("Fixed Deposit", "IJ5678", "Nora", 500)

    def test_apply_interest_updates_balance(self) -> None:
        interest = self.bank.apply_interest("IJ5678")
        self.assertAlmostEqual(interest, 30.0)
        account = self.bank.get_account("IJ5678")
        self.assertAlmostEqual(account.balance, 530.0)

    def test_transaction_history_populated(self) -> None:
        self.bank.deposit("IJ5678", 100)
        history = self.bank.get_transaction_history("IJ5678")
        self.assertGreaterEqual(len(history), 2)

    def test_unknown_account_raises(self) -> None:
        with self.assertRaises(AccountNotFoundError):
            self.bank.get_account("ZZ9999")


if __name__ == "__main__":
    unittest.main()
