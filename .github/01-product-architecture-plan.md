# Plan 01: Product and Architecture Plan

## Project name

**CloudCert Drill**

The app trains users for multiple choice certification exams such as AWS certification exams. The name avoids using AWS as the product name while still making the purpose clear.

## Product goal

CloudCert Drill is a local-first desktop training app for certification exam practice. It lets users import and edit question banks, generate realistic mock exams, record answers automatically, review results, and track long-term performance.

## Repository structure

```text
/
  frontend/      React UI
  backend/       Node.js API service
  initializer/   Standalone database initializer and seeder
  desktop/       Electron shell and packaging
  data/          Local database and optional import/export files
  .github/       Planning, issues, workflows, templates
  package.json   Root scripts and workspace configuration
  .env           Parent-level runtime configuration and database path source
```

Each folder is a separate module of the full app. The root project should use workspaces so modules can share scripts while keeping their own package files.

Recommended root scripts:

```json
{
  "scripts": {
    "dev": "npm run init:db && concurrently \"npm -w backend run dev\" \"npm -w frontend run dev\" \"npm -w desktop run dev\"",
    "init:db": "npm -w initializer run init",
    "seed:db": "npm -w initializer run seed",
    "build": "npm -ws run build",
    "test": "npm -ws run test",
    "package": "npm -w desktop run package"
  }
}
```

## Main modules

### frontend

React application for:

- User selection and creation.
- Dashboard and statistics.
- Exam generation flow.
- Active exam taking.
- Exam report and review.
- Question, option, answer key, module, and topic editing.
- Import and export.

### backend

Node.js service for:

- CRUD APIs.
- Exam generation.
- Question selection logic.
- Automatic answer recording.
- Statistics aggregation.
- Import/export validation.
- Runtime database access through `backend/src/db`. The backend module must not create, migrate, seed, or reset the database.

### initializer

Standalone Node.js project for:

- Loading the parent project `.env`.
- Resolving `DATABASE_PATH`.
- Creating `/data/database.sqlite` if missing.
- Running schema migrations before the first backend starts.
- Seeding initial topics, modules, sample questions, and settings when requested.
- Rebuilding a dev database when requested.

The initializer is the only module allowed to form, migrate, seed, validate, or reset the database schema.

### desktop

Electron project for:

- Running the React app in a desktop window.
- Starting or connecting to the backend service.
- Managing app paths in development and packaged modes.
- Running the initializer before starting the backend.
- Packaging the final desktop app.

### data

Local data folder for:

- `database.sqlite`.
- Import files.
- Export files.
- Optional backups.

The database path must be configurable by `.env` at the parent project level. All modules should read the parent `.env`; module-specific `.env` files should be avoided unless a later issue proves they are needed.

## Recommended technology choices

### Frontend

- React.
- TypeScript.
- React Router.
- TanStack Query for API state.
- Zustand or Redux Toolkit for local UI state.
- React Hook Form for forms.
- Zod for form and import validation.

### Backend

- Node.js.
- TypeScript.
- SQLite.
- Drizzle ORM, Prisma, or Kysely.
- Zod for API validation.
- Vitest or Jest for tests.

### API style

Preferred path:

**Use GraphQL for the frontend/backend API.** It is simpler for React, CRUD screens, filtering, pagination, editing drafts, and nested question/option data.

## User flow

### Start page

- Show existing users as tiles.
- Show one tile with a plus sign to create a new user by entering the user's first name.
- Ask only for first name.
- Name must be unique.
- If the entered name already exists, treat it as the same returning user and do not create a new user.
- No password. No authentication in this version.

### Dashboard page

After clicking a user tile, show the start page which contains:

- Overall score as charts.
- Recent exam history.
- Weak topics.
- Strong topics.
- Failed questions that need practice.
- Taking a new exam button.
- Retake button for previous exams.
- Question editor entry point.

### New exam flow

- User selects a module or certification type.
- Each module covers some topics with different weights (portions). 
- Backend generates a random exam based on module topic weights.
- Questions failed many times by the same user receive higher selection weight for their topic.
- Backend stores selected question ids in the exam record table.
- Frontend shows an instruction page before the exam starts.
- User presses Start.

### Active exam flow

- Show one question at a time.
- Show timer for the full exam.
- Allow marking questions for review.
- Allow returning to previous questions unless a specific timed-per-question mode is enabled.
- Automatically save the answer when the user leaves a question, changes page, or submits.
- When the exam is submitted or time expires, lock the attempt.

AWS-style exams usually use an overall exam timer rather than a strict timer per question. The default behavior should allow navigation between questions during the exam.

### Report flow

At the end:

- Show score.
- Show pass/fail if a passing threshold is configured.
- Show topic breakdown.
- Show incorrect answers.
- Show selected options and correct options.
- Show time spent.
- Provide a button to return to the dashboard/statistics page.
- Do not allow browser back navigation to return to the active final question.

## URL and navigation rules

Recommended routes:

```text
/
/users
/users/new
/users/:userId/dashboard
/users/:userId/exams/new
/users/:userId/exams/:examId/instructions
/users/:userId/exams/:examId/take/:questionIndex
/users/:userId/exams/:examId/report
/users/:userId/exams/:examId/review
/admin/questions
/admin/modules
/admin/topics
/admin/import-export
```

Rules:

- Active exam pages require an exam attempt with status `in_progress`.
- Report pages require status `submitted`, `expired`, or `completed`.
- Once submitted, `/take/*` must redirect to `/report`.
- Use `replace` navigation when moving from final submit to report.
- Keep server-side status checks so URL changes cannot bypass rules.

## Exam instruction page content

Before starting, show:

- Number of questions.
- Total time.
- Whether multiple answers may be correct.
- Whether unanswered questions count as wrong.
- Whether the user may return to earlier questions.
- How marked-for-review works.
- Confirmation that the timer starts after pressing Start.
- Notice that answers are saved automatically.
- Notice that leaving the app may not pause the timer.

## Exam generation rules

Inputs:

- Module topic weights.
- Question pool per topic.
- Target question count.
- Target duration.
- User past performance.
- Optional excluded questions.

Basic algorithm:

1. Determine question count per topic from module topic weights.
2. Load eligible questions per topic.
3. Compute user weakness score per question.
4. Apply weighted random selection.
5. Avoid duplicates.
6. Store selected question ids and generated order in the exam record.
7. Generate a funny exam name.

Funny exam name examples:

- Cloud Goblin Trial
- The S3 Sandwich
- Elastic Brain Sprint
- Lambda Llama Challenge
- Route 53 Rodeo
- IAM Not Ready
- The VPC Volcano

## Missing items to include

- Migrations, not only one schema file.
- Backups before destructive imports.
- Question source metadata.
- Explanation field for correct answers.
- Difficulty field.
- Tags.
- Audit timestamps.
- Soft delete for questions and options.
- Exam attempt status.
- Import validation report.
- Export versioning.
- App settings table.
- Tests for exam generation.
- Tests for import parsing.
- Error boundary in frontend.
- Packaged app path handling.

## Success criteria

- App can start with an empty database.
- Initializer can create and seed the database.
- Existing users appear as tiles.
- A returning user can enter with the same first name.
- User can generate an exam.
- Generated exam stores selected question ids.
- Answers are saved automatically.
- Submitted exam cannot return to the active question screen.
- Report and statistics are available after submission.
- Question editor supports draft review before saving.
- Import/export works for markdown files.
- Desktop package works without requiring a dev server.
