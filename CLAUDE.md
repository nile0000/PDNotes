# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

PD Notes is a Parkinson's Disease tracking Android app built with Kotlin + Jetpack Compose.

## Build & Run

### Android

All Gradle commands run from the `PDNotesAndroid/` directory and require Java from Android Studio:

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
cd PDNotesAndroid

# Build debug APK
./gradlew assembleDebug

# Install on running emulator/device
./gradlew installDebug

# List available emulators
/Users/ebenweinman/Library/Android/sdk/emulator/emulator -list-avds
```

## Architecture

### Android (MainActivity.kt)

The entire Android app lives in a single file: `PDNotesAndroid/app/src/main/java/com/example/pdnotes/MainActivity.kt`.

**Navigation** is a manual state machine in `PDNotesApp()` — a `currentScreen` string variable switches between top-level screens ("tracker", "meds", "notes", "contacts"), and `medsForDate`/`appointmentForDate` strings trigger drill-down screens (returning `null` goes back). There is no Jetpack Navigation component.

**Persistence** uses `EncryptedSharedPreferences` (AES256-GCM) initialized in `PDNotesApp()`. All four data collections — `medicationSchedules`, `dayStatuses`, `appointments`, `contacts` — are serialized to JSON and written back via `LaunchedEffect` whenever the list/map changes.

**Data model:**
- `MedicationSchedule` — a medication with a `startDate` and optional `endDate` (null = ongoing). `schedulesForDate()` filters which schedules apply on a given day.
- `DayStatus` — per-day state: `taken` (bool), `rating` (GOOD/NORMAL/BAD), `note` (String), `isRead` (bool).
- `Appointment` — a dated event with optional time/location/notes.
- `Contact` — a healthcare contact with role, phone, email, address.

Date keys are always `"yyyy-MM-dd"` strings used as map keys and for date range comparisons.

**Screen structure:**
- `TrackerScreen` — weekly list view (default) or monthly `CalendarView`, with per-day medication toggle, rating, note, and appointment count
- `DayMedicationScreen` — medications active on a specific day; add via `AddMedicationForm`
- `DayAppointmentScreen` — appointments for a specific day; inline add/edit via `AppointmentForm`
- `MedicationsScreen` — all schedules split into active/past
- `NotesSummaryScreen` — all days with notes, filterable by read/unread and bad-day rating
- `ContactsScreen` — CRUD contacts via inline `ContactForm`

