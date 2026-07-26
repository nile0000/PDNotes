# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

PD Notes is a Parkinson's Disease tracking app that exists as **three separate clients**:

- **`PDNotesAndroid/`** — standalone Kotlin + Jetpack Compose app, purely local storage, no backend.
- **`PDNotesIOS/`** — standalone SwiftUI app, purely local storage, no backend. Independent Swift port of the same data model/UX as Android; not code-shared with it.
- **`PDNotesMobile/`** — newer cross-platform Expo/React Native app that talks to a real backend (**`PDNotesAPI/`**, Express + Supabase) instead of storing data only on-device.

The Android and iOS apps are self-contained, single-user, offline apps with encrypted local storage. The Mobile+API stack is the multi-device, account-based rewrite: Supabase handles auth and Postgres storage (with RLS), and `PDNotesAPI` is a thin, auth-checked REST layer in front of it. All three implement the same conceptual data model (medication schedules, day statuses, day symptoms, appointments, contacts) independently — there is no shared code between the native apps, but the Mobile app and API share Zod schemas/types via `packages/shared`.

Root `package.json` is an npm workspaces root for the JS/TS stack only:
```
workspaces: ["packages/shared", "PDNotesAPI", "PDNotesMobile"]
```
`PDNotesAndroid` (Gradle) and `PDNotesIOS` (Xcode) are **not** part of this workspace and are built with their own native toolchains.

## Build & Run

### Android (`PDNotesAndroid/`)

Requires Java from Android Studio:

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
cd PDNotesAndroid

./gradlew assembleDebug   # build debug APK
./gradlew installDebug    # install on running emulator/device

/Users/ebenweinman/Library/Android/sdk/emulator/emulator -list-avds
```

### iOS (`PDNotesIOS/`)

Open `PDNotesIOS/PDNotes.xcodeproj` in Xcode and run, or use `xcodebuild` from the command line.

### Mobile app (`PDNotesMobile/`, Expo/React Native)

```bash
cd PDNotesMobile
npm install
npm start           # expo start
npm run android     # expo start --android
npm run ios         # expo start --ios
npm run typecheck   # tsc --noEmit
```

Requires `PDNotesMobile/.env` (see `.env.example`): Supabase URL/publishable key, plus `EXPO_PUBLIC_API_BASE_URL` pointing at a running `PDNotesAPI` instance. Use your Mac's LAN IP for `EXPO_PUBLIC_API_BASE_URL` — `10.0.2.2` (Android-emulator loopback alias) does **not** work from iOS.

**Expo has changed significantly across versions** — before writing any Expo/React Native code, check the exact versioned docs for the SDK version in `PDNotesMobile/package.json` (currently `~57`) at `https://docs.expo.dev/versions/vXX.0.0/` rather than relying on general knowledge.

### API (`PDNotesAPI/`, TypeScript + Express + Supabase)

```bash
cd PDNotesAPI
npm install
npm run dev         # tsx watch src/index.ts
npm run build       # tsc -p tsconfig.json
npm run start       # node dist/index.js (after build)
npm run typecheck
```

Requires `PDNotesAPI/.env` (see `.env.example`): `PORT`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_JWKS_URL`. The server binds to `0.0.0.0` explicitly so the Android emulator (`10.0.2.2`) and physical devices on the LAN can reach it.

Supabase schema lives in `PDNotesAPI/supabase/migrations/` (SQL migrations, applied via the Supabase CLI/dashboard — there's no migration-runner script in this repo).

### Shared package (`packages/shared/`)

Pure Zod schemas + inferred TypeScript types, consumed directly via workspace linking (`@pd-notes/shared`), no build step. Edit `src/schemas.ts` first (schemas are the source of truth) — `src/types.ts` just re-derives types with `z.infer`, and `src/index.ts` re-exports both.

## Architecture

### Android (`MainActivity.kt`)

The entire Android app lives in a single file: `PDNotesAndroid/app/src/main/java/com/example/pdnotes/MainActivity.kt`.

**Navigation** is a manual state machine in `PDNotesApp()` — a `currentScreen` string variable switches between top-level screens ("tracker", "meds", "notes", "symptoms", "trends", "contacts"), and `medsForDate`/`appointmentForDate` strings trigger drill-down screens (returning `null` goes back). There is no Jetpack Navigation component.

**Persistence** uses `EncryptedSharedPreferences` (AES256-GCM) initialized in `PDNotesApp()`. Data collections — `medicationSchedules`, `dayStatuses`, `daySymptoms`, `appointments`, `contacts` — are serialized to JSON and written back via `LaunchedEffect` whenever the list/map changes.

**Data model:**
- `MedicationSchedule` — a medication with a `startDate` and optional `endDate` (null = ongoing). `schedulesForDate()` filters which schedules apply on a given day.
- `DayStatus` — per-day state: `taken` (bool), `rating` (GOOD/NORMAL/BAD), `note` (String), `isRead` (bool).
- `DaySymptoms` — per-day severity + free-text note per symptom category (tremors, legs, plumbing, neuropathy, sleep, diet, pain).
- `Appointment` — a dated event with optional time/location/notes.
- `Contact` — a healthcare contact with role, phone, email, address.

Date keys are always `"yyyy-MM-dd"` strings used as map keys and for date range comparisons — this convention holds across all three clients and the API.

**Screen structure:**
- `TrackerScreen` — weekly list view (default) or monthly `CalendarView`, with per-day medication toggle, rating, note, and appointment count
- `DayMedicationScreen` — medications active on a specific day; add via `AddMedicationForm`
- `DayAppointmentScreen` — appointments for a specific day; inline add/edit via `AppointmentForm`
- `MedicationsScreen` — all schedules split into active/past
- `NotesSummaryScreen` — all days with notes, filterable by read/unread and bad-day rating
- `SymptomsScreen` / `SymptomTrendsScreen` — per-day symptom severity entry and trend view over time
- `ContactsScreen` — CRUD contacts via inline `ContactForm`

### iOS (`PDNotesIOS/PDNotes/`)

SwiftUI port of the same app, split one screen per file (`TrackerScreen.swift`, `DayMedicationScreen.swift`, `DayAppointmentScreen.swift`, `MedicationsScreen.swift`, `NotesSummaryScreen.swift`, `SymptomsScreen.swift`, `SymptomTrendsScreen.swift`, `ContactsScreen.swift`, `CalendarScreen.swift`), with shared models in `Models.swift` and app-level state in `AppStore.swift`.

**Persistence** (`Persistence.swift`) mirrors Android's encrypted-at-rest guarantee using the iOS Keychain (`SecItemAdd`/`SecItemCopyMatching`) instead of `EncryptedSharedPreferences`, gated behind `PersistenceQueue` — a **serial** dispatch queue so writes for a given key are ordered and never block the UI thread on Keychain IPC.

### Mobile app (`PDNotesMobile/`)

Cross-platform Expo/React Native app; this is the account-based, server-synced client.

- **Navigation**: real React Navigation, in `src/navigation/` — `RootNavigator` switches between auth screens (`LoginScreen`/`SignUpScreen`) and `AppTabs` (bottom tabs), which nests `TrackerStack` and `CalendarStack` for drill-downs. Screens live under `src/screens/<feature>/`.
- **State**: Zustand. `useAuthStore` holds the Supabase session; `useAppStore` (`src/store/useAppStore.ts`) is the single client-side source of truth for all synced collections (`medicationSchedules`, `dayStatuses`, `daySymptoms`, `appointments`, `contacts`), with `selectors.ts` for derived reads. Mutations optimistically update the store and push to the API through `src/api/resources/*`; per-day status/symptom edits are debounced (`DEBOUNCE_MS = 500`) before syncing so keystroke-level edits don't spam the network.
- **API client** (`src/api/apiClient.ts`): thin `fetch` wrapper that reads the current Supabase session, attaches it as a `Bearer` token, and throws `ApiError` on non-2xx responses. `src/api/supabaseClient.ts` configures the Supabase JS client (used for auth only, not data — data goes through `PDNotesAPI`).
- **Sync**: `GET /sync` (via `src/api/resources/sync.ts`) fetches all five collections in one round trip on load; subsequent CRUD goes through per-resource endpoints.

### API (`PDNotesAPI/`)

Express app assembled in `src/app.ts`; entrypoint `src/index.ts` just creates it and listens.

- **Routing pattern**: one router per resource under `src/routes/` (`medicationSchedules.ts`, `dayStatuses.ts`, `daySymptoms.ts`, `appointments.ts`, `contacts.ts`), each delegating to a matching `src/services/*` module for the actual Supabase queries. `sync.ts` fans out to all five `list*` service functions in parallel and returns a combined `SyncResponse`.
- **Auth boundary** (`src/middleware/auth.ts`): `requireAuth` verifies the caller's Supabase-issued JWT against the project's JWKS (`jose`), then builds a **per-request Supabase client scoped with that user's bearer token** (`req.supabase`). Route handlers never use a service-role/admin client — every query runs through PostgREST as the authenticated user, so **Postgres Row Level Security is the actual authorization boundary**, not application code. Keep this invariant when adding new routes/services: fetch `req.supabase!` per request, never a shared admin client.
- **Validation**: `src/middleware/validate.ts` validates request bodies against the Zod schemas from `@pd-notes/shared` (e.g. `medicationScheduleCreateSchema`) before they reach services.
- **Errors**: centralized `errorHandler` middleware registered last in `app.ts`.

### Shared schemas (`packages/shared/src/schemas.ts`)

Zod is the single source of truth for both the wire format and TypeScript types (via `z.infer` in `types.ts`), consumed by both `PDNotesAPI` and `PDNotesMobile`. Notable conventions:
- `dateKeySchema` — `"yyyy-MM-dd"` strings, same convention as the native apps.
- `severitySchema` — integer 0–5 (0 = unset, 1 = Great … 5 = Terrible), used for each `symptomCategories` entry (tremors/legs/plumbing/neuropathy/sleep/diet/pain) in `daySymptomsSchema`.
- Most resources define a base schema plus `*CreateSchema`/`*UpdateSchema` variants (usually `.omit({ id: true })` or `.omit({ date: true })`) for request validation.
