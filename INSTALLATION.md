# Developer Internal Installation Guide

Human Controller is a native Tauri desktop application. Docker covers the reproducible build,
linting, and automated test workflow. Running the interactive application requires native host
dependencies because webcam access, desktop windows, keyboard injection, and platform packaging
cannot be fully exercised inside the container.

## Option 1: Run automated checks with Docker **(Does not run the program only checks)**

This option requires only:

- Git
- Docker Desktop with Docker Compose

Clone the repository and run the checks:

```bash
git clone https://github.com/unsw-cse-comp99-3900/capstone-project-26t2-3900-h13a-date.git
cd capstone-project-26t2-3900-h13a-date
docker compose run --build --rm app-checks
```

Docker installs the required Node.js, Rust, Cargo, npm, and Linux Tauri build dependencies inside
the image. It then runs:

- Prettier formatting checks
- ESLint
- TypeScript type-checking
- Vite production build
- Rust formatting checks
- Clippy
- Rust tests with a coverage summary
- Frontend tests with a coverage summary
- Tauri end-to-end journeys against an isolated SQLite database

Docker launches the Tauri application inside a virtual display for the end-to-end journeys. It
does not validate physical webcam access, operating-system permissions, or real keyboard input.

## Option 2: Run the application natively

Native development requires Git, Node.js 24 LTS, npm, Rust, Cargo, Docker Desktop, and the
platform-specific Tauri prerequisites below. Node.js includes npm. Newer Node.js releases may work,
but Node.js 24 is the supported team baseline.

### Windows

Use an Administrator PowerShell terminal rather than WSL. Install Git, Node.js LTS, Rustup, Docker
Desktop, and the Visual Studio Build Tools with the C++ workload:

```powershell
winget install --id Git.Git
winget install --id OpenJS.NodeJS.LTS
winget install --id Rustlang.Rustup

// you need desktop dev with c++ package as well here, see Tauri prereqs guide for windows at bottom of the installation guide.
winget install --id Microsoft.VisualStudio.2022.BuildTools
```

Restart Windows or close and reopen PowerShell after installation. Then select Rust's stable MSVC
toolchain:

```powershell
rustup default stable-msvc
```

### macOS

First install the Xcode Command Line Tools:

```bash
xcode-select --install
```

I use homebrew, but im sure u can downloads these manually with a different manager aswell.

[Homebrew Install Guide](https://brew.sh/)

```bash
brew install git node@24
```

For rust i downloaded this a while back so, i didnt reset this up but

[Rust Install Guide](https://rust-lang.org/tools/install/)

**If you have issues with commands not working:** Remember to update `~/.zshrc` or equivalent with relative export paths, and reload this.

### Start development

After installing the native prerequisites:

```bash
git clone https://github.com/unsw-cse-comp99-3900/capstone-project-26t2-3900-h13a-date.git
cd capstone-project-26t2-3900-h13a-date
npm ci
npm run tauri dev
```

The first Tauri run downloads and compiles Rust dependencies, so it will take longer than later
runs.

## Build a native installer

Run the build on the operating system being targeted:

```bash
npm run tauri build
```

Tauri builds are platform-specific. Windows builds should be produced and tested on Windows, while
macOS builds should be produced and tested on macOS.

## Docker Usage

The project is containerised to the maximum practical extent. Docker provides a reproducible Linux
environment that installs the dependencies needed for automated checks, builds the frontend, and
runs frontend and Rust formatting, linting, compilation, and tests.

The interactive application must run on the native host operating system. Tauri needs direct access
to the desktop windowing system, webcam permissions, and native keyboard APIs used to control
external games. Windows and macOS installers must also be built and integration-tested on their
respective operating systems.

No separate database container is required because the planned SQLite database is embedded in the
desktop application rather than running as an independent database service. This is as the client
wanted with a easy setup for non-technical clinicians, who only want local storage.

## Useful commands

```bash
# Run all checks natively
bash scripts/check.sh

# Run all checks in Docker
docker compose run --build --rm app-checks

# Start the native application in development mode
npm run tauri dev

# Build the native application
npm run tauri build

# Build and run the Tauri E2E journeys with isolated temporary app data
npm run test:e2e
```

For anything I missed it will probably be specific to your install, most likely a Tauri prerequisite that is missing.
[official Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).
