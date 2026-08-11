# Human Controller

Human Controller is a webcam-based desktop application that maps therapeutic body movements to
keyboard and mouse inputs, allowing patients to control existing PC games during rehabilitation.

## Core capabilities

- Create and manage local patient profiles.
- Calibrate a patient-specific default pose.
- Record static or dynamic therapeutic movements and map them to native inputs.
- Recognise movements from a live webcam feed using MediaPipe pose landmarks.
- Run rehabilitation sessions through a non-intrusive desktop overlay.
- Schedule sessions and review patient history, progress, and threshold changes.
- Import and export complete patient profiles.

## Technology

- React and TypeScript frontend
- Tauri desktop wrapper and typed IPC boundary
- Rust native services
- MediaPipe pose tracking
- Embedded SQLite storage
- Vitest, Testing Library, Rust tests, and WebdriverIO
- Docker-based reproducible verification

## Documentation

- [Installation and testing](INSTALLATION.md) - Docker verification, native setup, application
  execution, builds, and troubleshooting.
- [Software quality evidence](SOFTWARE_QUALITY.md) - requirements traceability, architecture,
  robustness, non-functional quality, testing results, limitations, and manual test records.
- [Feature implementation guide](FEATURE_IMPLEMENTATION_GUIDE.md) - the development pattern used
  across React, Tauri, Rust, and SQLite.

## Verification summary

The following results were reproduced natively on 11 August 2026:

| Check                  | Result                                                             |
| ---------------------- | ------------------------------------------------------------------ |
| Frontend tests         | 1,571 passed across 171 test files                                 |
| Frontend coverage      | 99.11% statements, 96.62% branches, 99.11% functions, 99.83% lines |
| Rust tests             | 225 passed                                                         |
| Rust coverage          | 87.85% regions, 85.71% functions, 93.12% lines                     |
| Static checks          | ESLint, TypeScript, Vite build, rustfmt, and Clippy passed         |
| Desktop E2E definition | 7 critical cross-layer journeys                                    |

The E2E suite, webcam, real native input, operating-system permissions, platform installers, and
overlay behaviour require separate environment-specific verification. See
[Software Quality Evidence](SOFTWARE_QUALITY.md#testing-evidence) for the test strategy, current
evidence, and limitations.

## Quick start

Run the reproducible automated verification workflow:

```bash
docker compose run --build --rm app-checks
```

Run the application natively after installing the platform-specific Tauri prerequisites:

```bash
npm ci
npm run tauri dev
```

Full instructions are in [INSTALLATION.md](INSTALLATION.md).

## Development workflow

`main` contains stable, tested, demonstration-ready code. Feature branches use the associated Jira
ticket, for example `feature/H13ADATE-51-Tauri-Setup`.
