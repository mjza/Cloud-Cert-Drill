# Plan 04: Initializer Plan

## Goal

Build a standalone initializer module that owns database formation, migration, validation, and seed data. This module must run before the backend starts in development, test, and packaged desktop modes.

The backend must not create or migrate the schema. The backend `/db` folder is only for runtime database communication, such as opening connections, running queries, transactions, repositories, and health checks.

## Ownership boundary

### Initializer owns

- Reading the parent project `.env`.
- Resolving `DATABASE_PATH`.
- Creating the `DATABASE_PATH` folder if missing. In dev time it is `/data`.
- Creating `database.sqlite` if missing.
- Applying migrations in order.
- Recording migration history.
- Seeding starter data when requested.
- Validating that required tables and indexes exist.
- Reporting clear errors when setup fails.
- Provide CLI arguments for controlling behaviour from command line. 

### Backend `/db` owns

- Opening SQLite connections.
- Providing query helpers.
- Running transactions.
- Mapping rows to domain models.
- Exposing database health checks.
- Handling read/write errors at runtime.

### Backend `/db` must not own

- Schema creation.
- Migration execution.
- Seed execution.
- Destructive resets.
- Direct knowledge of migration file locations.

## Runtime order

The required startup order is:

```text
1. Load parent .env
2. Run initializer
3. Validate database schema
4. Start backend
5. Start frontend or Electron window
```

In development, the root `dev` script should make this order explicit. Do not rely on the backend to silently create tables.

Recommended root scripts:

```json
{
  "scripts": {
    "init:db": "npm -w initializer run init",
    "migrate:db": "npm -w initializer run migrate",
    "seed:db": "npm -w initializer run seed",
    "validate:db": "npm -w initializer run validate",
    "dev": "npm run init:db && concurrently \"npm -w backend run dev\" \"npm -w frontend run dev\" \"npm -w desktop run dev\"",
    "dev:backend": "npm run init:db && npm -w backend run dev",
    "reset:db:dev": "npm -w initializer run reset:dev"
  }
}
```

## Parent `.env`

The only required runtime `.env` should sit in the parent project folder:

```text
/.env
/.env.example
```

Module-level `.env` files should be avoided unless there is a clear reason. Modules should load the parent `.env` by walking up from their own folder to the repository root.

Recommended `.env.example`:

```env
APP_NAME=CloudCert Drill
APP_ENV=development
DATABASE_PATH=./data/database.sqlite
BACKEND_HOST=127.0.0.1
BACKEND_PORT=4317
SEED_ON_INIT=false
LOG_LEVEL=info
```

Path rules:

- Relative `DATABASE_PATH` values are resolved from the parent project root.
- Absolute `DATABASE_PATH` values are used as provided.
- The initializer must print the resolved database path before modifying anything.
- The backend reads the same parent `.env` and connects to the already prepared database.

## Initializer structure

Recommended structure:

```text
initializer/
  package.json
  tsconfig.json
  src/
    index.ts
    config/
      loadParentEnv.ts
      resolvePaths.ts
    commands/
      init.ts
      migrate.ts
      seed.ts
      resetDev.ts
      validate.ts
      status.ts
    db/
      openInitializerConnection.ts
      migrationRepository.ts
    migrations/
      001_initial_schema.sql
      002_exam_sessions.sql
      003_question_drafts.sql
      004_import_export_metadata.sql
      005_statistics_indexes.sql
    seeds/
      dev.seed.json
      sample-questions.md
    parsers/
      markdownQuestionParser.ts
    utils/
      backupDatabase.ts
      logger.ts
```

## Initializer commands

Recommended `initializer/package.json` scripts:

```json
{
  "scripts": {
    "init": "tsx src/index.ts init",
    "migrate": "tsx src/index.ts migrate",
    "seed": "tsx src/index.ts seed",
    "validate": "tsx src/index.ts validate",
    "status": "tsx src/index.ts status",
    "reset:dev": "tsx src/index.ts reset:dev --seed",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

Command behavior:

| Command     | Purpose                                                           |
| ----------- | ----------------------------------------------------------------- |
| `init`      | Create database if missing, apply migrations, optionally seed.    |
| `migrate`   | Apply pending migrations only.                                    |
| `seed`      | Insert starter data. Must be idempotent where possible.           |
| `validate`  | Confirm tables, indexes, and migration state.                     |
| `status`    | Show database path, current migration version, and table summary. |
| `reset:dev` | Delete and rebuild local dev database after making a backup.      |

## Migration rules

- Migrations are SQL files committed in `initializer/src/migrations` or copied to `initializer/dist/migrations` during build.
- Each migration must have a unique numeric prefix.
- Applied migrations are recorded in a `schema_migrations` table.
- Migrations run in transactions.
- Failed migrations roll back and stop startup.
- Never edit an already applied migration after it has been shared. Add a new migration instead.

Required migration tracking table:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  checksum TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## Initial schema scope

The first migration should create at least:

- `topics`
- `modules`
- `module_topics`
- `questions`
- `options`
- `users`
- `exams`
- `exam_questions`
- `exam_answers`
- `statistics`
- `question_drafts`
- `imports`
- `exports`
- `schema_migrations`

Prefer relationship tables over JSON arrays for query-heavy relationships, but JSON fields can be used for snapshots and display order. For example, `exam_questions` should store the selected question list for an exam, while `option_order_json` can store the shuffled order used during that attempt.

## Seeding rules

Seed data should support development without polluting production.

Recommended seed modes:

```text
dev       sample users, modules, topics, questions
minimal   required settings only
none      no seed data
```

Use `.env` to control default behavior:

```env
SEED_ON_INIT=false
SEED_MODE=dev
```

Seed requirements:

- Seed commands must not create duplicate modules, topics, or questions on repeated runs.
- Seeded questions should be marked with metadata so they can be removed or refreshed in dev.
- Production packaged apps should not seed fake users by default.

## Validation rules

The initializer should fail fast if:

- `DATABASE_PATH` is missing.
- The database directory cannot be created.
- The database file is not writable.
- Required tables are missing.
- The latest migration has not been applied.
- A migration checksum changed after being applied.
- Required indexes are missing.

## Backend integration contract

The backend startup should do only this database check:

```text
1. Load parent .env
2. Resolve DATABASE_PATH
3. Confirm database file exists
4. Confirm schema_migrations contains latest required version
5. Open runtime connection
```

If the database is missing or outdated, the backend should exit with a clear message:

```text
Database is not initialized. Run: npm run init:db
```

This keeps failures clear and avoids hidden backend side effects.

## Development checklist

- `npm run init:db` creates `/data/database.sqlite`.
- `npm run migrate:db` applies pending migrations.
- `npm run seed:db` inserts sample data without duplicates.
- `npm run validate:db` confirms schema readiness.
- `npm run dev:backend` initializes before backend startup.
- Backend fails clearly when database is missing.
- Backend does not import initializer migration files.
- Parent `.env` is the source of truth for `DATABASE_PATH`.

## GitHub issues for initializer

- Create initializer workspace.
- Add parent `.env` loader.
- Add path resolver for `DATABASE_PATH`.
- Add SQLite initializer connection.
- Add migration runner.
- Add `schema_migrations` table.
- Add initial schema migration.
- Add validation command.
- Add seed command.
- Add dev reset with backup.
- Add tests for idempotent init and migration order.

## Core tables

The original tables are:

- topics
- modules
- questions
- options
- users
- exams
- statistics

Recommended schema adds a few supporting tables to make the app reliable.

## Recommended schema

### users

```sql
CREATE TABLE users (
  user_id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### topics

```sql
CREATE TABLE topics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### modules

A module represents an exam type such as `CLF-C02`, `SAA-C03`, or another certification code.

```sql
CREATE TABLE modules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  default_question_count INTEGER NOT NULL DEFAULT 65,
  default_duration_minutes INTEGER NOT NULL DEFAULT 130,
  passing_score REAL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### module_topics

```sql
CREATE TABLE module_topics (
  module_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  percentage REAL NOT NULL,
  PRIMARY KEY (module_id, topic_id),
  FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);
```

### questions

```sql
CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL,
  text TEXT NOT NULL,
  explanation TEXT,
  duration_seconds INTEGER,
  difficulty TEXT,
  lock_orders INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  source TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (topic_id) REFERENCES topics(id)
);
```

### options

```sql
CREATE TABLE options (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  is_answer INTEGER NOT NULL DEFAULT 0,
  text TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (module_id) REFERENCES modules(id),
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);
```

### exams

```sql
CREATE TABLE exams (
  exam_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  duration_minutes INTEGER NOT NULL,
  question_count INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TEXT,
  submitted_at TEXT,
  expires_at TEXT,
  score REAL,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (module_id) REFERENCES modules(id)
);
```

Recommended statuses:

- `draft`
- `ready`
- `in_progress`
- `submitted`
- `expired`
- `completed`

### exam_questions

```sql
CREATE TABLE exam_questions (
  exam_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  option_order_json TEXT,
  marked_for_review INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (exam_id, question_id),
  FOREIGN KEY (exam_id) REFERENCES exams(exam_id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id)
);
```

`option_order_json` stores the option order used for that exam attempt. This is important when `lock_orders = 0` and options are shuffled.

### statistics

Keep the requested table but use it as per-question answer history.

```sql
CREATE TABLE statistics (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  exam_id TEXT,
  question_id TEXT NOT NULL,
  answers_json TEXT NOT NULL,
  score REAL NOT NULL,
  recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (exam_id) REFERENCES exams(exam_id),
  FOREIGN KEY (question_id) REFERENCES questions(id)
);
```

### exam_answers

Use this table for the latest answer inside one exam attempt.

```sql
CREATE TABLE exam_answers (
  exam_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  selected_option_ids_json TEXT NOT NULL,
  score REAL,
  answered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (exam_id, question_id),
  FOREIGN KEY (exam_id) REFERENCES exams(exam_id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id)
);
```

### question_drafts

Backend-persisted drafts are safer than only frontend cache.

```sql
CREATE TABLE question_drafts (
  id TEXT PRIMARY KEY,
  question_id TEXT,
  draft_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (question_id) REFERENCES questions(id)
);
```

Statuses:

- `open`
- `submitted`
- `discarded`

### app_settings

```sql
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## Indexes

```sql
CREATE INDEX idx_questions_topic ON questions(topic_id);
CREATE INDEX idx_options_question ON options(question_id);
CREATE INDEX idx_exams_user ON exams(user_id);
CREATE INDEX idx_exams_module ON exams(module_id);
CREATE INDEX idx_statistics_user_question ON statistics(user_id, question_id);
CREATE INDEX idx_exam_answers_exam ON exam_answers(exam_id);
```