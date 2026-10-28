"""Banking system package.

The Tk GUI is imported lazily. Importing it eagerly made the whole package depend
on a display-less environment having Tk available, which meant the business logic
could not be imported — or tested — on a machine or CI runner without `tkinter`.
`Bank` and the service layer are pure Python and import anywhere.
"""

from bank_system.services import Bank

__all__ = ["Bank", "launch_gui"]


def launch_gui(bank: Bank | None = None) -> None:
    """Start the desktop interface. Imported here so `import bank_system` stays headless."""
    from bank_system.gui import launch_gui as _launch

    _launch(bank)
