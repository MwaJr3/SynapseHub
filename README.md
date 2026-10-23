# Python Banking System

A complete banking system project in Python demonstrating:
- data validation
- exception handling and error handling
- polymorphism and class hierarchy
- transaction history and interest calculation
- multiple account types
- GUI and CLI interfaces
- automated testing using both `pytest` and `unittest`

## Features

- Account creation (`Savings`, `Current`, `Fixed Deposit`)
- Deposit and withdrawal with validation
- Transaction history per account
- Interest calculation using polymorphism (`calculate_interest` implemented by each account type)
- Friendly error reporting in CLI and GUI

## Project Structure

- `main.py`: single software entry point; choose CLI or GUI mode.
- `bank_system/models.py`: `Account` abstract base class + account subclasses + transaction model.
- `bank_system/services.py`: bank operations, validation, and business rules.
- `bank_system/exceptions.py`: custom exception types.
- `bank_system/cli.py`: terminal UI.
- `bank_system/gui.py`: Tkinter GUI.
- `tests/test_bank_pytest.py`: pytest test suite.
- `tests/test_bank_unittest.py`: unittest test suite.
- `PROJECT_REPORT.md`: architecture explanation and design rationale.

## Run the Software

### CLI mode
```bash
python main.py --mode cli
```

### GUI mode
```bash
python main.py --mode gui
```

## Run Tests

```bash
pytest -q
python -m unittest discover -s tests -p "test_bank_unittest.py"
```

## Notes on Validation and Error Handling

- Account IDs must match format `AA1234`.
- Amounts must be numeric and greater than zero.
- Withdrawal beyond balance raises `InsufficientFundsError`.
- Unknown account references raise `AccountNotFoundError`.

All these exceptions are shown to users in both interfaces.
# Library Management System (Python)

A complete **Library Management System** implemented in Python with:
- OOP design (classes, inheritance, encapsulation)
- File persistence (JSON storage)
- Error handling with custom exceptions
- Testing with both **pytest** and **unittest**
- GUI (Tkinter desktop interface)
- Documentation (docstrings + this README + project report)

## Features
- Book inventory management (add/restock/list books)
- Member registration
- Borrow and return workflows
- Fine calculation for overdue returns
- Search functionality by book ID, title, or author

## Project Structure

```text
.
├── library_management/
│   ├── __init__.py
│   ├── exceptions.py
│   ├── gui.py
│   ├── models.py
│   ├── persistence.py
│   └── service.py
├── tests/
│   ├── test_service_pytest.py
│   └── test_service_unittest.py
├── data/
├── main.py
├── README.md
└── PROJECT_REPORT.md
```

## Architecture (high level)
The system uses a layered architecture:
1. **Model Layer** (`models.py`): entities like `Book`, `Person`, `Member`
2. **Service Layer** (`service.py`): business rules (borrow, return, fine logic)
3. **Persistence Layer** (`persistence.py`): JSON read/write
4. **Presentation Layer** (`gui.py`, CLI in `main.py`): user interaction

This architecture is chosen because it separates concerns, improves testability, and allows the same logic to power both GUI and CLI modes.

## OOP Concepts Demonstrated
- **Inheritance**: `Member(Person)`
- **Encapsulation**: internal state (`_books`, `_members`, `_storage`) managed through methods
- **Abstraction**: service methods expose workflows while hiding implementation details
- **Polymorphism (practical)**: entities sharing serialization behavior via `LibraryEntity`

## Run as One Software
Yes. The project runs through a single entry point `main.py`.

### Run GUI mode (default)
```bash
python main.py
```

### Run CLI mode
```bash
python main.py --mode cli
```

### Custom data file
```bash
python main.py --data-file data/library_data.json
```

## Tests
### Pytest
```bash
pytest -q
```

### Unittest
```bash
python -m unittest discover -s tests -p 'test_service_unittest.py' -v
```

## Error Handling
Domain-specific exceptions are defined in `exceptions.py` and raised by the service layer. GUI and CLI catch exceptions and display user-friendly messages.

## Dependencies
- Python 3.10+
- `pytest` (for pytest suite)
- Tkinter (usually bundled with Python)

## Notes
- Default fine rate is `$1.00/day`.
- Data is persisted in JSON; this is simple and portable for assignment/demo purposes.
