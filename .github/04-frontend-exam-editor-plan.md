# Plan 03: Frontend, Exam Flow, and Question Editor Plan

## Goal

Build a React frontend that supports simple user entry, statistics, exam practice, review reports, question editing, drafts, and import/export.

## Frontend stack

Recommended stack:

- React.
- TypeScript.
- React Router.
- TanStack Query.
- Zustand or Redux Toolkit.
- React Hook Form.
- Zod.
- A component library such as MUI, Mantine, Chakra UI, or shadcn/ui.
- Vite for development and build.

## App layout

Recommended source structure:

```text
frontend/src/
  app/
    App.tsx
    router.tsx
    providers.tsx
  api/
    graphqlClient.ts
    queries/
    mutations/
  components/
    layout/
    forms/
    tables/
    exam/
    questionEditor/
  features/
    users/
    dashboard/
    exams/
    questions/
    importExport/
    statistics/
  hooks/
  utils/
  styles/
```

## Routes

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

## User start page

### Requirements

- Load users from backend.
- Show each user as a tile.
- Show a plus tile for new or returning user entry.
- Ask for first name only.
- Trim whitespace.
- Use case-insensitive matching.
- If name exists, return that user.
- If name does not exist, create a new user.
- No password.

### UI behavior

- Existing user tile click navigates to dashboard.
- Plus tile opens name form.
- Name form calls `upsertUserByName`.
- Successful result navigates to `/users/:userId/dashboard`.

## Dashboard page

Show:

- User greeting.
- Overall average score.
- Last exam score.
- Total exams taken.
- Questions answered.
- Weak topics.
- Strong topics.
- Recent exam history table.
- New exam button.
- Retake button for each old exam.
- Question editor button.

### Exam history table columns

- Exam name.
- Module.
- Status.
- Created date.
- Started date.
- Submitted date.
- Score.
- Actions: review, retake.

## New exam page

User selects:

- Module.
- Optional question count override.
- Optional duration override.
- Optional practice mode or exam mode.

Default values come from the module:

- 65 to 85 questions.
- 90 to 170 minutes.

Backend generates the exam and returns the stored exam id.

After generation, navigate to:

```text
/users/:userId/exams/:examId/instructions
```

## Exam instructions page

Show a realistic certification-style instruction page:

- Exam name.
- Module name.
- Number of questions.
- Total time.
- Passing score if configured.
- Multiple answers may be correct.
- Some questions may require more than one option.
- Read each question carefully.
- You may mark questions for review.
- You may move between questions while time remains.
- Answers are saved automatically.
- The timer starts when Start is pressed.
- Leaving the app does not pause the timer.
- Once submitted, the exam cannot be resumed.

Buttons:

- Start exam.
- Back to dashboard.

Start button calls `startExam` and navigates with `replace` to the first question.

## Active exam page

### Layout

Recommended layout:

- Top bar: exam name, timer, submit button.
- Left or bottom navigation: question numbers, answered status, marked status.
- Main area: question text and options.
- Footer: previous, next, mark for review.

### Answer behavior

- Single correct answer question can use radio buttons.
- Multiple correct answer question must use checkboxes.
- The app should know multiple-answer mode by counting correct options only in admin/review contexts. During active exam, it should show an instruction such as “Select one or more options” only if the question type is configured to reveal that.
- Save on option change with debounce.
- Save when moving next or previous.
- Save before submit.
- Save on route leave.
- Save on app/window blur when possible.

### Navigation behavior

Default behavior:

- User can go to previous question.
- User can go to next question.
- User can jump to question number.
- User can mark for review.

Reason:

AWS-style exams typically use one overall timer. The user should be able to review and change answers before submitting.

Optional future mode:

- Strict per-question timer.
- Automatically moves forward when time ends.
- No returning to previous questions.

## Timer behavior

- Timer is based on backend `started_at` and `expires_at`.
- Frontend displays remaining time.
- Backend enforces expiry.
- If frontend timer reaches zero, call `submitExam`.
- If backend says exam expired, redirect to report.

## Submit behavior

Before final submit:

- Show confirmation modal.
- Warn about unanswered questions.
- Show count of marked-for-review questions.
- Submit button calls `submitExam`.
- Navigate with `replace` to report page.

After submit:

- `/take/*` route must redirect to report.
- Browser back button must not show last active question.
- Backend must reject answer writes for submitted exams.

## Exam report page

Show:

- Exam name.
- Module.
- Score.
- Pass/fail if passing threshold exists.
- Number correct.
- Number incorrect.
- Number unanswered.
- Time used.
- Topic breakdown.
- Question-by-question report.
- User selected answers.
- Correct answers.
- Explanation when available.

Actions:

- Go to dashboard/statistics.
- Review exam.
- Retake exam.

Do not show a button that returns to the active exam page.

## Question editor

### Requirements

The question editor must support:

- Question list with pagination.
- Search.
- Topic filter.
- Module filter.
- Difficulty filter.
- Sort by text, topic, updated date, difficulty, active state.
- Inline editing without pressing an edit button per question.
- Draft saving.
- Review drafts.
- Submit all drafts.
- Submit selected drafts.
- Discard all drafts.
- Discard selected drafts.

### Layout option A

Two-panel layout:

- Left: question list.
- Right: selected question editor.

### Layout option B

Top/bottom layout:

- Top: selected question text and metadata.
- Bottom: options editor.

Recommended: two-panel layout on desktop, stacked layout on narrow screens.

### Question editor fields

- Topic.
- Question text.
- Explanation.
- Duration.
- Difficulty.
- Lock option order.
- Active/inactive.

### Option editor fields

- Option text.
- Correct answer checkbox.
- Display order.
- Delete button.
- Add option button.

Rules:

- At least two options.
- At least one correct option.
- Empty options are invalid.
- If lock order is enabled, show drag handles or order numbers.
- If lock order is disabled, frontend may shuffle options during exam generation.

## Draft behavior

Recommended: backend-persisted drafts.

Reason:

- Drafts survive app restart.
- Drafts are visible across windows.
- Risk of losing edits is lower.

Frontend may also keep a local cache for immediate recovery, but backend draft state should be the source of truth.

### Draft flow

1. User edits a question or option.
2. Frontend creates or updates a draft.
3. UI shows unsaved draft badge.
4. User opens draft review panel.
5. User can compare original and draft.
6. User can submit or discard selected drafts.

### Draft review UI

Show:

- Question id.
- Topic.
- Changed fields.
- Original value.
- Draft value.
- Validation errors.
- Submit checkbox.

## Import/export page

### Markdown import

User can:

- Select one or more `.md` files.
- Preview parsed questions.
- See validation errors.
- Map unknown topics or modules.
- Import only valid questions.
- Create missing topics if allowed.

### Export

User can export:

- All questions.
- Filtered question list.
- One module.
- One topic.
- JSON backup.
- Markdown question bank.

## UI states

Every main screen needs:

- Loading state.
- Empty state.
- Error state.
- Validation state.
- Success notification.

## Accessibility

- Keyboard navigation for exam answers.
- Visible focus states.
- Labels for form fields.
- Timer should not be the only indicator of time urgency.
- Use readable contrast.
- Avoid tiny click targets.

## Frontend tests

Required tests:

- User tile loading.
- New user creation.
- Existing name returns previous user.
- Dashboard renders stats.
- New exam form submits.
- Instruction page starts exam.
- Answer save fires on navigation.
- Submit redirects to report with replace behavior.
- Submitted exam cannot render active page.
- Question editor validates at least one answer.
- Draft submit and discard flows.
- Markdown import preview renders errors.
