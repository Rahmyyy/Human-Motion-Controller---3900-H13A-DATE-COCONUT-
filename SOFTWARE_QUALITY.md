# Software Quality

Human Controller is a desktop application that lets clinicians map a patient's therapeutic
movements to keyboard and mouse controls for rehabilitation games. This document gives a short
overview of what we built, how it is structured, how it was tested, and what still needs to be
checked manually.

The original proposal and client meeting notes are not stored in this repository, so the
requirements below are inferred from the finished system. We should compare them with those records
before the final submission.

## Completed features

| Area             | What is implemented                                                             | Evidence                                                 |
| ---------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Patients         | Create, edit, delete, import, and export patient profiles                       | Frontend, Rust, SQLite, and E2E tests                    |
| Presets          | Create, calibrate, duplicate, and delete patient-specific presets               | Component, service, repository, and E2E tests            |
| Movement mapping | Record static or dynamic movements and assign keyboard or mouse actions         | Recording, validation, mapping, and native-input tests   |
| Recognition      | Recognise patient-specific movements and prevent repeated or ambiguous triggers | Recognition unit, acceptance, runtime, and gating tests  |
| Live sessions    | Run sessions through an overlay and record trigger statistics                   | Session, overlay, summary, and backend tests             |
| Scheduling       | Schedule future rehabilitation sessions                                         | Frontend, validation, repository, and E2E tests          |
| History          | Review completed sessions, metrics, filters, and threshold changes              | Domain, component, loading, and E2E tests                |
| Local storage    | Store application data in embedded SQLite without a separate server             | Schema, constraint, cascade, rollback, and failure tests |

## Architecture

The application is split into a few clear layers:

1. React pages and components display the interface.
2. TypeScript modules handle frontend business rules such as pose capture, recognition, movement
   mapping, scheduling, and live sessions.
3. Typed Tauri adapters send requests to the Rust backend.
4. Rust commands, services, and repositories validate requests and store data in SQLite.
5. Native adapters handle desktop windows and keyboard or mouse input.

Keeping these responsibilities separate makes the code easier to understand and test. Business
logic can be tested without opening a real camera, window, or database file, while native effects
can be replaced with safe test versions.

MediaPipe provides the pose landmarks, but the team implemented the patient calibration,
normalisation, movement comparison, confidence checks, trigger gating, session tracking, native
integration, persistence, and application workflows around it.

## Technical quality

- SQLite constraints, foreign keys, indexes, transactions, and cascade rules protect stored data.
- Structured TypeScript and Rust contracts are used across the Tauri boundary.
- Invalid input and operational failures return controlled errors instead of crashing the app.
- Recognition uses visibility checks, normalisation, confidence thresholds, stability checks, and
  default-pose rearming to reduce accidental inputs.
- Camera processing and patient records stay on the local device, with no server required.
- GitHub Actions runs the Docker verification workflow on pushes and pull requests.

## Testing evidence

The following results were reproduced on macOS on 11 August 2026:

| Check             | Result                                                             |
| ----------------- | ------------------------------------------------------------------ |
| Frontend tests    | 1,571 tests passed across 171 files                                |
| Frontend coverage | 99.11% statements, 96.62% branches, 99.11% functions, 99.83% lines |
| Rust tests        | 225 tests passed                                                   |
| Rust coverage     | 87.85% regions, 85.71% functions, 93.12% lines                     |
| Static checks     | ESLint, TypeScript, Vite, rustfmt, and Clippy passed               |

The tests include:

- Unit tests for recognition, pose recording, validation, scheduling, history, and session rules.
- React tests for component rendering, user interactions, loading, and error states.
- Rust integration tests using real isolated SQLite databases.
- Tauri mock-runtime tests for startup, IPC, input, and overlay behaviour.
- Seven desktop E2E journeys covering the main patient, preset, scheduling, history, and navigation
  workflows.

External behaviour is mocked where using the real dependency would be unsafe or unreliable. For
example, automated tests do not send real keyboard input. SQLite is not mocked because its real
constraints and transaction behaviour are important to the application.

Run the complete automated workflow with:

```bash
docker compose run --build --rm app-checks
```

More setup and testing commands are available in [INSTALLATION.md](INSTALLATION.md).

## Manual testing

Some behaviour needs a real desktop and cannot be verified properly in headless automated tests.
Before submission, we should record pass/fail results for:

- Webcam access, pose tracking, and denied camera permission.
- Real keyboard and mouse actions in a text editor and a game.
- Accessibility or Input Monitoring permission failures.
- Overlay positioning, focus, full-screen games, and multiple monitors.
- Windows and macOS installer build, installation, launch, and removal.
- Basic camera FPS, recognition latency, CPU, and memory observations.
- Keyboard navigation, focus visibility, contrast, and clinician usability feedback.

## User experience

The main workflow follows how a clinician would use the system: select a patient, create or choose a
preset, calibrate movements, start a session, and review the result. The interface includes
validation messages, empty states, confirmation dialogs, recording feedback, session summaries,
and patient-specific thresholds.

Automated component tests cover the interface behaviour, but formal usability and accessibility
testing with clinicians and patients has not yet been recorded.

## Known limitations

- Proposal and client requirements still need to be checked against records outside the repository.
- Webcam accuracy depends on lighting, framing, occlusion, hardware, and patient movement.
- Native input and overlay behaviour depend on operating-system permissions.
- Windows and macOS installers need to be tested separately on their target platforms.
- Performance, accessibility, and user-testing results still need to be recorded.
- Patient data is local but is not protected by application-level encryption or authentication.
- The Content Security Policy is currently disabled.
- The frontend bundle triggers Vite's default size warning.
