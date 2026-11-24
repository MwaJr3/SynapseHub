#!/usr/bin/env bash
# Install Stockfish from the distro package (Debian/Ubuntu). Prefer this over
# compiling: it is fast and the binary lands on PATH (/usr/games/stockfish).
# ChessScope discovers it automatically, or set STOCKFISH_PATH explicitly.
set -euo pipefail
if command -v stockfish >/dev/null 2>&1 || [ -x /usr/games/stockfish ]; then
  echo "Stockfish already installed: $(command -v stockfish || echo /usr/games/stockfish)"
  exit 0
fi
SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo"
$SUDO apt-get update -qq
$SUDO apt-get install -y --no-install-recommends stockfish
echo "uci" | timeout 5 "$(command -v stockfish || echo /usr/games/stockfish)" | grep -m1 "id name" || true
