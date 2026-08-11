# Developer Setup

Looking for the full installation walkthrough? See the
**[Installation Manual (PDF)](<Installation Manual.pdf>)**. It is the main guide for installing and
running Human Controller and includes the platform-specific instructions.

This file is a shorter reference for developers who already have the required tools installed.

## Start the app locally

Human Controller uses Node.js 24, Rust, and Tauri. If this is your first time working with Tauri,
check the [official prerequisites](https://v2.tauri.app/start/prerequisites/) before continuing.

```bash
git clone https://github.com/unsw-cse-comp99-3900/capstone-project-26t2-3900-h13a-date.git
cd capstone-project-26t2-3900-h13a-date
npm ci
npm run tauri dev
```

The first launch can be slow because Rust needs to compile the native dependencies. You may also be
asked to allow camera, Accessibility, or Input Monitoring access.

## Run all checks with Docker

If you have Docker Desktop with Docker Compose v2 installed, run:

```bash
docker compose run --build --rm app-checks
```

The first build can take up to around 20 minutes. This runs the same main workflow used by GitHub
Actions, including formatting, linting, builds, frontend and Rust coverage, and desktop E2E tests.

Docker is useful for repeatable automated checks, but it cannot properly test a physical webcam,
real keyboard or mouse input, operating-system permissions, full-screen overlays, or native
installers.

## Useful commands

```bash
# Run the frontend app through Tauri
npm run tauri dev

# Run frontend unit and component tests
npm test

# Run frontend coverage
npm run test:coverage

# Run Rust tests
cargo test --manifest-path src-tauri/Cargo.toml

# Run Rust coverage
cargo llvm-cov --manifest-path src-tauri/Cargo.toml

# Run desktop E2E tests
npm run test:e2e

# Run the complete local check workflow
bash scripts/check.sh
```

The desktop E2E suite builds a debug copy of the Tauri application, so it takes longer than the
unit tests.

## Build an installer

```bash
npm run tauri build
```

Tauri installers are platform-specific. Build and test the Windows installer on Windows and the
macOS installer on macOS.

There is no separate database setup. Human Controller uses an embedded SQLite database and does
not need a database server or internet connection.

For the testing approach, coverage figures, architecture, and known limitations, see
[SOFTWARE_QUALITY.md](SOFTWARE_QUALITY.md).
