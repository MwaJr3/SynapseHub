# Personal OS Offline Companion

This optional, **separate** Python/Tkinter tool reviews files you choose on your own computer. It is not part of the React browser app and it cannot reach, read, or modify browser local storage.

## What it can do

- Inspect the non-sensitive shape of a full Personal OS JSON backup (v1–v3).
- Normalize a deliberately selected, simple manual CSV statement with `date`, `amount`, and `description` columns (optional `category`) into a review-only JSON file.
- Keep positive signed amounts as `income` and negative signed amounts as `expense`, using a transparent bookkeeping convention.

## What it does **not** do

- connect to a bank, authenticate with a provider, or automatically import a bank feed;
- sync devices or cloud accounts;
- decrypt browser encrypted-export files;
- make financial recommendations, convert currencies, forecast revenue, or calculate tax;
- write a browser backup or overwrite browser data.

The companion has no networking dependency or network code. Review the resulting file before entering any figures in the local browser ledger.

## Run

Python with Tk support is required:

```bash
cd tools/personal_os_companion
python personal_os_companion.py
```

## Test

The deterministic test suite needs pytest; the property-based test activates when Hypothesis is installed:

```bash
python -m pip install -e '.[test]'
python -m pytest
```

Both packages are optional and intentionally isolated from the JavaScript application toolchain.
