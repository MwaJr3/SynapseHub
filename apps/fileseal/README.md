# FileSeal — file encryption & decryption (CLI)

Cybersecurity catalogue **Project 4** (Beginner–Intermediate).

## Overview
Encrypt and decrypt files with **AES-256-GCM** (authenticated encryption) and
**scrypt** key derivation from a passphrase. Cryptography comes from the
maintained `cryptography` library — no invented ciphers.

## Format (documented)
`MAGIC("FSEAL1") | version(1) | salt_len(1) | salt(16) | nonce(12) | ciphertext+tag`
The header is bound as AEAD associated data, so header tampering is detected.

## Security design
- Wrong passphrase and tampered ciphertext fail the same way (by design).
- Passphrases come from a hidden prompt or env var — **never** CLI arguments.
- Originals are preserved by default; writes are atomic (temp + rename), so an
  interrupted write never leaves output that looks like a successful encryption.
- Nonces are random 12-byte values, never reused deliberately; each file gets a
  fresh salt and nonce.

## Usage
```bash
export FILESEAL_PASSPHRASE='choose-a-strong-passphrase'
python3 -m app.cli encrypt secret.txt secret.txt.fseal
python3 -m app.cli decrypt secret.txt.fseal restored.txt
```

## Testing
`python3 -m pytest tests/ -q` — round trip, wrong key, tampered ciphertext,
truncated/foreign files, unsupported version, overwrite refusal, original
preservation, no-partial-output-on-failure.

## Limitations (honest)
- **Losing the passphrase makes recovery impossible** — there is no backdoor.
- Not a key-management system; the passphrase's strength governs security.
- Large-file support reads files into memory (documented limit; streaming is a
  roadmap item).

## Future improvements
Versioned format evolution, key-file support, streaming for large files,
documented recovery procedure.
