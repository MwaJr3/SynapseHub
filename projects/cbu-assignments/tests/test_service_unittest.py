"""Unittest coverage for selected manager behaviors."""

import unittest
from datetime import datetime, timedelta
from pathlib import Path
from tempfile import TemporaryDirectory

from library_management.persistence import JSONStorage
from library_management.service import LibraryManager


class TestLibraryManager(unittest.TestCase):
    """Classic unittest suite validating persistence and fine payment."""

    def setUp(self) -> None:
        self.temp_dir = TemporaryDirectory()
        storage_path = Path(self.temp_dir.name) / "state.json"
        self.manager = LibraryManager(JSONStorage(str(storage_path)))
        self.manager.add_book("B10", "Clean Code", "Robert Martin", 2)
        self.manager.register_member("M10", "Nora", "nora@example.com")

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def test_state_persists_after_restart(self):
        self.manager.borrow_book("M10", "B10", due_date=datetime.now() + timedelta(days=1))
        reloaded = LibraryManager(self.manager._storage)
        self.assertEqual(len(reloaded.list_books()), 1)
        self.assertEqual(reloaded.list_books()[0].available_copies, 1)

    def test_pay_fine_reduces_balance(self):
        self.manager.borrow_book("M10", "B10", due_date=datetime.now() - timedelta(days=3))
        fine = self.manager.return_book("M10", "B10")
        remaining = self.manager.pay_fine("M10", fine / 2)
        self.assertAlmostEqual(remaining, fine / 2, delta=0.001)


if __name__ == "__main__":
    unittest.main()
