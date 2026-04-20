# Tasker

Tasker is a local desktop task manager built as a focused MVP for personal work planning.

The app runs on the user computer, stores tasks locally in SQLite, supports a task table, kanban board, calendar, local reminders, and tray/background behavior.

## Features

- Create, edit, delete, pin, search, filter, and sort tasks.
- Task fields: title, description, due date, priority, status, assigner, assignee, checklist, tags, reminder time, and notes.
- Table view for tasks.
- Kanban board with custom columns, column colors, and drag-and-drop.
- Calendar month and week views with drag-and-drop due date changes.
- Local SQLite storage.
- Local desktop notifications for upcoming and overdue tasks.
- Tray/background mode: closing the window hides it, while the app can continue sending reminders.

## Stack

- Electron
- electron-vite
- React
- TypeScript
- SQLite
- Prisma
- dnd-kit
- electron-builder

## Project Structure

```text
Tasker-desktop/
  electron-builder.yml       # Release packaging config
  prisma/
    schema.prisma            # Development DB schema
  resources/
    tasker-icon.ico          # Windows app icon
    tasker-icon.png          # UI/macOS fallback icon
    tasker-icon.svg          # Source icon
  src/
    main/                    # Electron main process, IPC, DB, notifications, tray
    preload/                 # Safe preload bridge
    renderer/                # React UI
    shared/                  # Shared types and constants
```

## Install

```bash
npm install
```

## Prepare the Development Database

```bash
npm run prisma:generate
npm run db:push
```

In development, SQLite is stored at:

```text
prisma/tasker.db
```

The database file is ignored by Git.

## Run in Development

```bash
npm run dev
```

## Production Build

```bash
npm run build
```

This creates the Electron/Vite output in:

```text
out/
```

## Build a Windows Release

```bash
npm run release:win
```

The Windows release artifacts are written to:

```text
release/
```

The current configuration prepares:

- NSIS installer `.exe`
- Portable `.exe`

The Windows release build applies the Tasker checkmark icon to the packaged app executable before installer and portable artifacts are created.

The first MVP release is unsigned. Code signing, publisher certificate setup, and notarization are intentionally left for a later production hardening step.

For a portable-only build:

```bash
npm run release:win:portable
```

## macOS Release Preparation

The project includes a macOS packaging target:

```bash
npm run release:mac
```

Important: macOS builds should be produced on a Mac. From Windows we can prepare the configuration and shared assets, but the real macOS app signing/notarization flow and final `.dmg` build must be handled on macOS.

For a polished public macOS release, generate a proper `.icns` icon from the existing Tasker checkmark logo and update `electron-builder.yml` to point `mac.icon` to that `.icns` file.

## Runtime SQLite Path

Tasker uses different SQLite locations for development and packaged builds:

- Development: `prisma/tasker.db`
- Packaged app: Electron `userData` directory, for example on Windows:

```text
%APPDATA%/Tasker/tasker.db
```

This keeps installed builds from writing next to the application executable.

You can override the runtime database location with:

```bash
TASKER_DATABASE_PATH=path/to/tasker.db
```

## Notifications and Tray Mode

Tasker checks reminders locally while the Electron app process is running.

- When the window is open, reminders appear as desktop notifications.
- When the window is minimized or inactive, reminders continue to work.
- When the window is closed, Tasker hides to tray and continues running in the background.
- To fully exit the app, use the tray menu item `Exit`.
- If the app process is fully quit, notifications cannot be delivered without a separate OS service/autostart helper. That is intentionally outside this MVP.

## GitHub Readiness

The repository ignores:

- `node_modules/`
- `out/`
- `dist/`
- `release/`
- local SQLite files
- local environment files
- OS/system noise files
- package manager debug logs

Do not commit local database files or release artifacts.

## Current MVP Limitations

- No server sync.
- No authentication.
- No team or multi-user mode.
- No cloud push notifications.
- No auto-update flow yet.
- No code signing or notarization configuration yet.
- Runtime DB initialization is pragmatic for the MVP; future releases should use a formal migration flow.
