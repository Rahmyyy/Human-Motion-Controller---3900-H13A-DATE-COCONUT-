#!/usr/bin/env bash

set -euo pipefail

if command -v Xvfb >/dev/null 2>&1 && [[ -z "${DISPLAY:-}" ]]; then
  Xvfb :99 -screen 0 1280x1024x24 -nolisten tcp -ac &
  e2e_xvfb_pid=$!

  cleanup_e2e_xvfb() {
    if kill -0 "${e2e_xvfb_pid}" 2>/dev/null; then
      kill "${e2e_xvfb_pid}"
      wait "${e2e_xvfb_pid}" 2>/dev/null || true
    fi
  }
  trap cleanup_e2e_xvfb EXIT

  export DISPLAY=:99
  sleep 1
fi

npm run test:e2e
