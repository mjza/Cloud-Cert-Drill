# Plan 05: Electron Desktop, Packaging, and DevOps Plan

## Goal

Build an Electron desktop shell that starts the app safely, respects the required initializer-before-backend order, and packages the frontend, backend, initializer, and required resources into a desktop application.

## Desktop startup order

Electron must start the app in this order:

```text
1. Resolve desktop runtime paths
2. Load parent .env in development or packaged defaults in production
3. Run initializer or packaged initializer command
4. Validate database readiness
5. Start backend
6. Wait for backend health check
7. Open frontend window
```

The backend should never create or migrate the database. Electron is responsible for invoking the initializer before backend startup.

## Desktop structure

Recommended structure:

```text
desktop/
  package.json
  electron-builder.yml
  tsconfig.json
  src/
    main.ts
    preload.ts
    paths.ts
    env.ts
    initializerProcess.ts
    backendProcess.ts
    window.ts
    healthCheck.ts
    logs.ts
```

## Runtime path rules

Development:

```text
repo root/.env
repo root/data/database.sqlite
frontend dev server
backend dev server
initializer source command
```

Packaged app:

```text
resources/app.asar                  read-only app code
resources/app.asar.unpacked         unpacked backend and initializer runtime files if needed
userData/database.sqlite            writable database
userData/logs/                      writable logs
userData/backups/                   writable backups
```

Do not write inside `app.asar`.

## Production database handling

In packaged mode, use Electron `app.getPath("userData")` as the default writable base path unless the user explicitly configures another path.

Recommended production default:

```text
<userData>/database.sqlite
```

Packaged defaults can be equivalent to:

```env
APP_ENV=production
DATABASE_PATH=<userData>/database.sqlite
BACKEND_HOST=127.0.0.1
BACKEND_PORT=0
SEED_ON_INIT=false
LOG_LEVEL=info
```

Use a random local backend port in packaged mode when possible. Pass the selected port to the frontend through preload or generated runtime config.

## Initializer execution from Electron

Electron main process should run initializer before backend.

Recommended behavior:

- In development, run `npm -w initializer run init` from the repository root.
- In packaged mode, run the compiled initializer entry file from packaged resources.
- Pass environment variables explicitly to the initializer process.
- Capture stdout and stderr into desktop logs.
- Stop startup if initializer fails.
- Show a clear error screen with the database path and log location.

## Backend execution from Electron

Recommended approach:

- Run backend as a local child process.
- Bind backend to `127.0.0.1`.
- Use GraphQL over local HTTP unless gRPC-web is later justified.
- Wait for a `/health` endpoint before loading the frontend.
- Shut down backend when Electron exits.

Backend startup checks:

- Database file exists.
- Latest migration is applied.
- SQLite can open the database.
- API server can bind to the selected port.

## Frontend loading

Development:

- Load Vite or React dev server URL.
- Use preload to expose backend URL.

Packaged:

- Load built frontend files from packaged resources.
- Inject backend URL through preload or a generated config file.

Do not hardcode the backend port in frontend code.

## Electron security settings

Use these defaults:

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true` where practical
- `enableRemoteModule: false`
- No remote content
- Strict Content Security Policy
- Preload exposes only required APIs

Frontend should not receive direct filesystem access.

## Packaging rules

Package these artifacts:

- Frontend static build.
- Backend compiled build.
- Initializer compiled build.
- Migration SQL files.
- Optional seed files.
- Desktop compiled main and preload files.

Native dependencies such as SQLite drivers may need to be unpacked. Packaging config must include them correctly.

Example packaging resource rules:

```yaml
extraResources:
  - from: ../backend/dist
    to: backend/dist
  - from: ../backend/package.json
    to: backend/package.json
  - from: ../initializer/dist
    to: initializer/dist
  - from: ../initializer/package.json
    to: initializer/package.json
  - from: ../frontend/dist
    to: frontend/dist
asarUnpack:
  - "**/*.node"
  - "**/migrations/*.sql"
```

Adjust the paths to match the final build output.

## Root workspace scripts

Recommended root scripts:

```json
{
  "scripts": {
    "init:db": "npm -w initializer run init",
    "validate:db": "npm -w initializer run validate",
    "dev": "npm run init:db && concurrently \"npm -w backend run dev\" \"npm -w frontend run dev\" \"npm -w desktop run dev\"",
    "build": "npm -ws run build",
    "package": "npm run build && npm -w desktop run package"
  }
}
```

## GitHub project files

Recommended `.github` structure:

```text
.github/
  plans/
    01-product-architecture-plan.md
    02-data-backend-api-plan.md
    03-frontend-exam-editor-plan.md
    04-initializer-plan.md
    05-electron-desktop-devops-plan.md
  ISSUE_TEMPLATE/
    bug_report.yml
    feature_request.yml
    task.yml
  workflows/
    ci.yml
    package-desktop.yml
  pull_request_template.md
```

## CI workflow

`.github/workflows/ci.yml` should run:

- Install dependencies.
- Type check all modules.
- Lint all modules.
- Run tests.
- Build all modules.
- Run initializer validation against a temporary database.

Example:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build
      - run: DATABASE_PATH=./data/ci.sqlite npm run init:db
      - run: DATABASE_PATH=./data/ci.sqlite npm run validate:db
```

## Desktop package workflow

`.github/workflows/package-desktop.yml` should:

- Install dependencies.
- Build initializer.
- Build backend.
- Build frontend.
- Build desktop.
- Package Electron app.
- Upload artifacts.

Start with Linux packaging. Add Windows and macOS after the app is stable.

## Logging

Desktop logs should include:

- App version.
- Runtime mode.
- Resolved database path.
- userData path.
- Initializer command and result.
- Backend startup command.
- Backend health check result.
- Frontend load path.

Backend logs should include:

- Database path.
- Migration version found at startup.
- API startup port.
- Exam generation id.
- Import/export summary.
- Errors with stack traces in development.

## Backup strategy

Before destructive operations initiated by desktop or initializer:

- Copy database to `data/backups/` in development.
- Copy database to `<userData>/backups/` in packaged mode.
- Include timestamp in file name.
- Keep the latest N backups.

Suggested backup filename:

```text
cloudcert-drill-YYYYMMDD-HHmmss.sqlite
```

## Release checklist

- Version updated.
- Fresh install tested.
- Upgrade install tested from an older schema.
- Initializer runs before backend in packaged app.
- Backend fails clearly if database is missing.
- Packaged app can write to database path.
- Migration files are available in packaged resources.
- Import/export tested.
- Exam resume after crash tested.
- Submitted exam lock tested.
- App shuts down backend cleanly.
