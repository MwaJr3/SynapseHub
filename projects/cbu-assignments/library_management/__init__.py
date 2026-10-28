"""Library Management System package.

`LibraryApp` (Tk) is resolved lazily: importing the GUI eagerly made the service
layer unusable without `tkinter`, which is a system package and is absent from
headless environments. The manager and storage import anywhere.
"""

from .persistence import JSONStorage
from .service import LibraryManager

__all__ = ["LibraryApp", "JSONStorage", "LibraryManager"]


def __getattr__(name: str):
    """Resolve `LibraryApp` on first use, so importing the package needs no display."""
    if name == "LibraryApp":
        from .gui import LibraryApp

        return LibraryApp
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
