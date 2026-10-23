# Banking System Project Report

## 1. Objective

Build a robust Python banking system that showcases OOP principles, validation, exceptions,
polymorphism, testing, and user interfaces.

## 2. Architecture

The application follows a **layered architecture**:

1. **Domain layer** (`bank_system/models.py`)
   - Core entities (`Account`, `Transaction`) and inheritance hierarchy.
   - Polymorphic `calculate_interest()` ensures each account type has its own behavior.

2. **Service layer** (`bank_system/services.py`)
   - `Bank` class orchestrates business logic.
   - Central place for validation and rule enforcement.
   - Raises typed exceptions for predictable error handling.

3. **Presentation layer** (`bank_system/cli.py`, `bank_system/gui.py`)
   - Two front-ends consume the same `Bank` service.
   - Keeps UI concerns separate from business logic.

4. **Application entry point** (`main.py`)
   - Unified launcher that runs as one software package with a mode flag.

### Why this architecture?

- **Maintainability**: UI changes do not break business rules.
- **Testability**: service and model layers can be unit-tested independently.
- **Reusability**: same business core used by both CLI and GUI.
- **Scalability**: easy to add persistence or APIs later without rewriting UI.

## 3. Class Hierarchy and Polymorphism

`Account` is an abstract base class with shared state and behavior. Subclasses:
- `SavingsAccount`
- `CurrentAccount`
- `FixedDepositAccount`

Each subclass overrides:
- `account_type`
- `calculate_interest()`

This demonstrates polymorphism by allowing the service layer to call `apply_interest()` without
knowing which concrete account type it is.

## 4. Validation and Exception Handling

Validation rules:
- Account ID regex (`AA1234`).
- Owner name minimum length.
- Positive numeric amounts.

Custom exceptions:
- `ValidationError`
- `InsufficientFundsError`
- `AccountNotFoundError`

Error handling is implemented in both CLI and GUI to provide clear messages and prevent crashes.

## 5. Testing Strategy

Two frameworks are used:

- **pytest** (`tests/test_bank_pytest.py`)
  - creation/deposit/withdraw flow
  - interest polymorphism checks
  - invalid input and insufficient funds

- **unittest** (`tests/test_bank_unittest.py`)
  - interest application updates balance
  - transaction history checks
  - missing account errors

This mixed strategy demonstrates compatibility with standard Python testing tools.

## 6. Running as One Software

Yes. The scripts run as a single software through:

```bash
python main.py --mode cli
python main.py --mode gui
```

Both modes share the same in-memory bank service implementation.
# Project Report: Library Management System

## 1. Objective
Design and implement a Python-based library management system demonstrating core software engineering concepts:
- Object-oriented design
- Inheritance and encapsulation
- File persistence
- Error handling
- Automated testing (pytest + unittest)
- User interface (GUI)
- Technical documentation

## 2. Requirements Coverage

| Requirement | Implementation |
|---|---|
| OOP design | `Book`, `Person`, `Member`, `LibraryManager`, `JSONStorage` |
| Inheritance | `Member` extends `Person` |
| Encapsulation | Service internals (`_books`, `_members`) are private-like attributes |
| File persistence | `JSONStorage` reads/writes JSON state |
| Error handling | Custom exceptions + handling in CLI/GUI |
| Testing | Pytest and unittest suites in `tests/` |
| GUI | Tkinter application in `gui.py` |
| Documentation | Docstrings, README, this report |
| Inventory | Add/restock books + inventory listing |
| Member registration | `register_member(...)` |
| Borrow/return | `borrow_book(...)`, `return_book(...)` |
| Fine calculation | Based on overdue days and daily rate |
| Search | Case-insensitive match over ID/title/author |

## 3. Architecture Used and Why

### 3.1 Pattern: Layered Architecture
The system follows a **layered architecture** to separate concerns:

1. **Domain Model Layer**
   - Contains plain entities and simple behaviors (`models.py`).
   - Rationale: Keeps data shape and domain methods independent of UI and storage.

2. **Application/Service Layer**
   - `LibraryManager` orchestrates workflows and enforces business rules.
   - Rationale: Centralized logic improves consistency and supports multiple UIs.

3. **Infrastructure/Persistence Layer**
   - `JSONStorage` adapter reads/writes system state.
   - Rationale: Isolates data storage; can later swap JSON with DB with minimal impact.

4. **Presentation Layer**
   - GUI (`gui.py`) and CLI (`main.py`) use the same service layer.
   - Rationale: Demonstrates reusable backend logic and allows “one software” with multiple interfaces.

### 3.2 Why This Architecture Fits
- **Testability:** Service logic tested without GUI dependencies.
- **Maintainability:** UI changes do not affect business rules.
- **Extensibility:** Add web API or database later by replacing only edges.
- **Single Source of Truth:** Borrowing/fine logic exists once in service layer.

## 4. Core Workflows

### 4.1 Borrow Book
1. Validate member exists
2. Validate book exists
3. Validate availability
4. Record due date in member profile
5. Decrement available copies
6. Persist state

### 4.2 Return Book
1. Validate member/book
2. Ensure member borrowed the book
3. Increment available copies
4. Compute overdue fine
5. Update member outstanding balance
6. Persist state

## 5. Error Handling Strategy
- Domain exceptions (`LibraryError` subclasses) represent predictable business errors.
- UI layers catch these exceptions and provide user-friendly messages.
- Input conversion errors (e.g., non-numeric quantity) are also handled.

## 6. Testing Strategy
- **Pytest:** behavior-driven checks for search, borrow/return, error cases.
- **Unittest:** classic test cases for persistence and fine payment behavior.
- Tests run against temporary files for isolation.

## 7. Running as One Software
Yes. `main.py` is the single executable entry point:
- `python main.py` → GUI
- `python main.py --mode cli` → CLI

Both modes use the same backend service and persistence, so they are two interfaces of one software system.

## 8. Future Improvements
- Role-based staff accounts
- Reservation queue and notifications
- SQL database backend
- Export reports (CSV/PDF)
- Web interface (Flask/FastAPI + frontend)
