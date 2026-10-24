#!/usr/bin/env bash
# Download and compile the Stockfish 11 engine used by ChessScope.
#
# Stockfish 11 is the last official release that needs no external neural-net
# file, so it builds fully offline-safe from source. The compiled binary is
# placed at backend/engine/stockfish and auto-discovered by the app. The binary
# is intentionally NOT committed to git — run this script once per checkout.
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p engine
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

TAG="sf_11"
URL="https://codeload.github.com/official-stockfish/Stockfish/tar.gz/refs/tags/${TAG}"
echo "Downloading Stockfish ${TAG} source..."
curl -fsSL "$URL" -o "$WORK/stockfish.tar.gz"
tar -xzf "$WORK/stockfish.tar.gz" -C "$WORK"

SRC="$WORK/Stockfish-${TAG}/src"
echo "Compiling (this takes a minute or two)..."
make -C "$SRC" build ARCH=x86-64 -j"$(nproc)" >/dev/null

cp "$SRC/stockfish" engine/stockfish
chmod +x engine/stockfish

echo "Installed: $(pwd)/engine/stockfish"
echo "UCI check:"
echo "uci" | timeout 5 ./engine/stockfish | grep -m1 "id name" || true
