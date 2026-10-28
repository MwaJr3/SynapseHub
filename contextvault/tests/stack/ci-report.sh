#!/usr/bin/env bash
# Surface the end of a failed disposable-stack command as CI annotations.
set -o pipefail
output=$(mktemp)
trap 'rm -f "$output"' EXIT
set +e
"$@" 2>&1 | tee "$output"
status=${PIPESTATUS[0]}
set -e
if [ "$status" -ne 0 ]; then
  while IFS= read -r line; do
    # Escape workflow-command metacharacters; this workflow uses disposable credentials only.
    line=${line//'%'/'%25'}
    line=${line//$'\r'/'%0D'}
    echo "::error title=Infrastructure check::$line"
  done < <(tail -n 15 "$output")
fi
exit "$status"
