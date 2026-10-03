#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*)
    exec powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(cygpath -w "$SCRIPT_DIR/run.ps1")" "$@"
    ;;
  *)
    if [[ ! -x .venv/bin/python ]]; then
      python3 -m venv .venv
    fi
    exec .venv/bin/python scripts/dev.py "$@"
    ;;
esac
