#!/usr/bin/env bash

set -euo pipefail

npm run check:frontend:static

cargo fmt \
  --manifest-path src-tauri/Cargo.toml \
  --all \
  -- \
  --check

CARGO_INCREMENTAL=0 \
CARGO_PROFILE_DEV_DEBUG=0 \
CARGO_PROFILE_TEST_DEBUG=0 \
cargo clippy \
  --manifest-path src-tauri/Cargo.toml \
  --all-targets \
  -- \
  -D warnings

cargo llvm-cov \
  --manifest-path src-tauri/Cargo.toml

npm run test:coverage

# Coverage uses its own instrumented target directory. Once the report is complete, those
# artifacts are no longer needed and retaining them can exhaust GitHub's runner disk while the
# native E2E application is linked.
cargo llvm-cov clean \
  --manifest-path src-tauri/Cargo.toml \
  --workspace

CARGO_INCREMENTAL=0 \
CARGO_PROFILE_DEV_DEBUG=0 \
bash scripts/e2e.sh
