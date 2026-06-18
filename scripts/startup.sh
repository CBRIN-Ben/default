#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PORT="${PORT:-3000}"
HOST="${HOST:-0.0.0.0}"

echo "==> Repo Watch startup"

if [[ ! -f .env.local ]]; then
  bash .cursor/setup-local.sh
fi

set -a
# shellcheck disable=SC1091
source .env.local
set +a

if ! curl -sf "http://127.0.0.1:${PORT}/api/dev/status" >/dev/null 2>&1; then
  echo "==> Starting dev server on port ${PORT}"
  SESSION_NAME="repo-watch-dev"
  if tmux -f /exec-daemon/tmux.portal.conf has-session -t "=${SESSION_NAME}" 2>/dev/null; then
    tmux -f /exec-daemon/tmux.portal.conf kill-session -t "=${SESSION_NAME}" 2>/dev/null || true
  fi
  tmux -f /exec-daemon/tmux.portal.conf new-session -d -s "$SESSION_NAME" -c "$ROOT" -- "${SHELL:-bash}" -lc \
    "set -a && source .env.local && set +a && ./node_modules/.bin/next dev --hostname ${HOST} --port ${PORT}"
  for _ in $(seq 1 30); do
    if curl -sf "http://127.0.0.1:${PORT}/api/dev/status" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
fi

echo "==> Health check"
curl -sf "http://127.0.0.1:${PORT}/api/dev/status" | python3 -m json.tool

echo ""
echo "==> GitHub repos"
curl -sf "http://127.0.0.1:${PORT}/api/dev/repos" | python3 -m json.tool

echo ""
echo "==> Summary ready at http://127.0.0.1:${PORT}/api/dev/summary"
echo "Repo Watch is running."
