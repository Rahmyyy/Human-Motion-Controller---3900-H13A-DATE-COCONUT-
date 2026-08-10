#!/usr/bin/env bash

set -euo pipefail

npm run check:frontend:static

cargo fmt \
  --manifest-path src-tauri/Cargo.toml \
  --all \
  -- \
  --check

cargo clippy \
  --manifest-path src-tauri/Cargo.toml \
  --all-targets \
  -- \
  -D warnings

cargo llvm-cov \
  --manifest-path src-tauri/Cargo.toml

npm run test:coverage

bash scripts/e2e.sh
