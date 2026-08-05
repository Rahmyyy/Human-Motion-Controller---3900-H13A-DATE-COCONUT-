# Feature Implementation Guide

This is the general pattern I follow when adding a feature to Human Controller. Not every feature
needs every layer, but the responsibilities should stay in the same places.

## TLDR

For a feature that reads or writes native data, follow this structure:

```text
React page and UI
        ↓
Frontend feature module
        ↓
Tauri adapter
        ↓
TypeScript command contract and DTOs
        ↓
Tauri command
        ↓
Rust service
        ↓
Rust repository
        ↓
SQLite
```

Data returns through the same layers in reverse. Each layer has one responsibility:

- `src/features/`: pages, dialogs, loading states, navigation, and presentation.
- `src/modules/`: the frontend interface, models, adapters, and testable feature logic.
- `src/contracts/native/`: the exact command names, arguments, results, and DTOs crossing Tauri.
- `src-tauri/src/<feature>/commands.rs`: exposes the native interface and maps errors.
- `src-tauri/src/<feature>/service.rs`: owns validation and business rules.
- `src-tauri/src/<feature>/repository.rs`: owns SQL and database mapping.
- `src-tauri/src/db.rs`: owns the production SQLite schema.
- `src-tauri/src/test_support.rs`: mirrors the schema used by Rust tests.

The Rust DTOs and TypeScript DTOs form a shared contract and must change together. React should
call the frontend module, not SQL, Tauri, or a Rust command directly. After implementing the slice,
test the rules at their owning layer and run `./scripts/check.sh`.

## 1. Understand the existing flow

Before changing code, look for:

- The page or workflow that starts the feature.
- The existing frontend module that owns related behaviour.
- The Tauri commands and DTOs already used by that area.
- The Rust implementation and SQLite tables involved.
- Existing tests that demonstrate the project conventions.

## 2. Define the feature interface

I decide what callers actually need to do and what result they need back. The goal is a small
interface that hides validation, storage, and transport details.

For example:

```ts
createThing(input): Promise<Thing>
getThingSummary(filter): Promise<ThingSummary>
```

The page should not need to know SQL, Tauri command names, serialised field names, or backend
validation rules.

Before implementing, decide on:

- Required and optional input.
- Validation rules.
- Empty, loading, and failure behaviour.
- Navigation after success.
- What is explicitly outside the feature's scope.

## 3. Add native persistence when required

Skip this section for a frontend-only feature.

### Database schema

Add new tables or indexes in `src-tauri/src/db.rs` using additive statements such as
`CREATE TABLE IF NOT EXISTS`. Enable foreign keys and define cascade behaviour deliberately.

Mirror schema changes in `src-tauri/src/test_support.rs` so Rust tests use the same structure.

### Rust module

Create a focused module under `src-tauri/src/<feature>/`:

```text
<feature>/
├── mod.rs
├── commands.rs
├── service.rs
├── repository.rs
└── service_tests.rs
```

Responsibilities:

- `repository.rs`: SQL only, including inserts, updates, joins, and queries.
- `service.rs`: validation and business rules; calls the repository.
- `commands.rs`: locks database state, calls the implementation, and maps errors and DTOs.
- `service_tests.rs`: tests the feature through its business interface.
- `mod.rs`: declares the module and its visibility.

Keep validation in Rust even when the UI also validates. Frontend validation improves the user
experience; native validation protects the actual stored data.

Register new modules and commands in `src-tauri/src/lib.rs`.

### Native DTOs

Add serialisable Rust DTOs in `src-tauri/src/native/contract.rs`. DTOs should contain only the data
that needs to cross into the frontend.

Rust fields use snake case and serialize to camel case:

```text
patient_id -> patientId
created_at_ms -> createdAtMs
```

Use stable error codes in commands so callers do not have to identify failures by parsing an error
message.

## 4. Update the TypeScript native contract

Keep the TypeScript side synchronized with Rust:

- Add DTO shapes to `src/contracts/native/dtos.ts`.
- Add command arguments and results to `src/contracts/native/commands.ts`.
- Export new contract types from `src/contracts/native/index.ts`.

All frontend calls should go through `invokeNative()`. Avoid calling Tauri directly from pages or
React UI files.

## 5. Add a frontend module

Create a module under `src/modules/<feature>/` when the feature has behaviour or data shared beyond
one visual element:

```text
<feature>/
├── adapters/
│   └── tauri<Feature>.ts
├── types.ts
├── featureLogic.ts
├── featureLogic.test.ts
└── index.ts
```

- `types.ts` defines frontend-facing models.
- The Tauri adapter calls `invokeNative()` and maps DTOs into frontend models.
- Pure calculations and transformations live outside React so they are easy to test.
- `index.ts` exposes the small public interface used by the rest of the application.

Do not make pages depend directly on DTOs if the feature has its own domain model. Keeping the
adapter at this seam makes later native contract changes local.

## 6. Build the UI

The page should coordinate data loading, navigation, and layout. Extract self-contained forms,
dialogs, cards, and panels into `src/features/<feature>/components/`.

As a general guideline, keep handwritten files near or below 200 lines. This is not a strict rule
for generated shadcn files or cases where splitting would make the flow harder to understand.

A useful split is:

```text
FeaturePage
├── FeatureHeader
├── CreateFeatureDialog
├── FeatureSummary
└── FeatureList
```

Pass narrow callbacks such as `onCreated()` or `onSelect(item)` instead of passing all page state
through every UI file.

Prefer existing shadcn UI elements. Add missing ones through the configured shadcn CLI rather than
reimplementing common controls:

```bash
npx shadcn@latest add <name>
```

After installation, check generated imports against the project's existing UI files before making
manual adjustments.

## 7. Handle data and failures deliberately

For each independent request, represent:

- Loading state.
- Successful data.
- Empty state.
- Failure state.

Independent requests should usually fail independently. For example, if summary data fails, an
unrelated list should still be allowed to render.

After a mutation, refresh only the affected data. A create action should also prevent duplicate
submission and show a useful error without closing the form.

## 8. Test the feature

Rust tests should cover:

- Successful persistence and retrieval.
- Validation failures.
- Missing related records.
- Query boundaries and ordering.
- Foreign-key or cascade behaviour where relevant.

Frontend tests should focus on pure calculations, mapping, and orchestration behaviour. Manually
verify interactive layout, keyboard behaviour, navigation, and native integration.

Run the complete check before handing work over:

```bash
./scripts/check.sh
```

This checks formatting, linting, TypeScript, the production build, Rust formatting, Clippy, and all
automated tests.
