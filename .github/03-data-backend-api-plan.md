# Plan 02: Data, Backend, and API Plan

## Goal

Build a Node.js backend that owns all database access, exam generation, answer recording, statistics, imports, exports, and validation.

## Database path

The database path must come from the parent `.env` file.

Example:

```env
DATABASE_PATH=./data/database.sqlite
SEED_ON_FIRST_RUN=true
APP_ENV=development
```

In packaged desktop mode, the app should resolve the database path to a writable user data directory unless the user has explicitly configured another path.

## Core tables

The original tables are:

- topics
- modules
- questions
- options
- users
- exams
- statistics

Backend does not need to manage the database creation. It is done in the `/initializer`. Backend just needs to know the schema for making models and developing APIs. 

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

The backend may still expose topics as a JSON array:

```json
[
  { "topic_id": "networking", "percentage": 20 }
]
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
  module_id TEXT,
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

## API style

Recommended: GraphQL.

Reasons:

- React screens need nested data.
- Question editor needs partial draft updates.
- Pagination, filtering, search, and sort are natural with GraphQL query inputs.
- Electron app packaging is simpler than normal gRPC.
- Keep GraphQL as the main frontend contract.

## GraphQL domain model

### Main types

```graphql
type User {
  userId: ID!
  name: String!
  createdAt: DateTime!
}

type Topic {
  id: ID!
  name: String!
  description: String
}

type Module {
  id: ID!
  name: String!
  description: String
  defaultQuestionCount: Int!
  defaultDurationMinutes: Int!
  passingScore: Float
  topics: [ModuleTopic!]!
}

type ModuleTopic {
  topic: Topic!
  percentage: Float!
}

type Question {
  id: ID!
  topic: Topic!
  text: String!
  explanation: String
  durationSeconds: Int
  difficulty: String
  lockOrders: Boolean!
  options: [Option!]!
}

type Option {
  id: ID!
  questionId: ID!
  moduleId: ID
  isAnswer: Boolean!
  text: String!
  displayOrder: Int!
}

type Exam {
  examId: ID!
  userId: ID!
  module: Module!
  name: String!
  status: String!
  durationMinutes: Int!
  questionCount: Int!
  createdAt: DateTime!
  startedAt: DateTime
  submittedAt: DateTime
  score: Float
  questions: [ExamQuestion!]!
}

type ExamQuestion {
  examId: ID!
  question: Question!
  position: Int!
  optionOrder: [ID!]
  markedForReview: Boolean!
}
```

### Queries

```graphql
type Query {
  users: [User!]!
  user(userId: ID!): User
  modules: [Module!]!
  topics: [Topic!]!

  questions(input: QuestionListInput!): QuestionConnection!
  question(id: ID!): Question

  exams(userId: ID!): [Exam!]!
  exam(examId: ID!): Exam
  examReport(examId: ID!): ExamReport!
  userStatistics(userId: ID!): UserStatistics!
}
```

### Mutations

```graphql
type Mutation {
  upsertUserByName(name: String!): User!

  createTopic(input: TopicInput!): Topic!
  updateTopic(id: ID!, input: TopicInput!): Topic!
  deleteTopic(id: ID!): Boolean!

  createModule(input: ModuleInput!): Module!
  updateModule(id: ID!, input: ModuleInput!): Module!
  deleteModule(id: ID!): Boolean!

  createQuestion(input: QuestionInput!): Question!
  updateQuestion(id: ID!, input: QuestionInput!): Question!
  deleteQuestion(id: ID!): Boolean!

  createQuestionDraft(input: QuestionDraftInput!): QuestionDraft!
  submitQuestionDrafts(ids: [ID!]!): [Question!]!
  discardQuestionDrafts(ids: [ID!]!): Boolean!

  generateExam(input: GenerateExamInput!): Exam!
  startExam(examId: ID!): Exam!
  recordAnswer(input: RecordAnswerInput!): ExamAnswer!
  markQuestionForReview(examId: ID!, questionId: ID!, marked: Boolean!): Boolean!
  submitExam(examId: ID!): ExamReport!

  importQuestionsMarkdown(input: ImportMarkdownInput!): ImportResult!
  exportQuestions(input: ExportQuestionsInput!): ExportResult!
}
```

## Exam generation algorithm

### Topic allocation

Example:

- Module has 65 questions.
- Topic A has 20% weight.
- Topic A receives `round(65 * 0.20) = 13` questions.

Rounding rules:

1. Calculate raw counts.
2. Use floor values.
3. Assign remaining questions to topics with the largest decimal remainder.
4. Validate that every topic has enough active questions.

### Weakness weighting

For each candidate question, compute a selection weight:

```text
baseWeight = 1
failureCount = number of times user scored less than 1 on this question
recentFailureBoost = higher if failures are recent
difficultyBoost = optional configured value
weight = baseWeight + failureCount * 0.75 + recentFailureBoost + difficultyBoost
```

Cap the weight to prevent one failed question from appearing too often:

```text
weight = min(weight, 5)
```

### Option order

- If `lock_orders = true`, preserve `display_order`.
- If `lock_orders = false`, shuffle options and store the result in `exam_questions.option_order_json`.

### Scoring

A question score can be:

- `1` for exactly matching all correct answers and no incorrect answers.
- `0` for any mismatch.

Optional future scoring:

- Partial credit for multiple-answer questions.


## Backend database boundary

The backend `/db` folder is only for communication with an already initialized SQLite database. It should contain connection management, query helpers, repositories, transactions, and health checks.

The backend must not:

- Create schema tables.
- Run migrations.
- Seed data.
- Reset the database.
- Own migration SQL files.

Startup behavior:

1. Load the parent project `.env`.
2. Resolve `DATABASE_PATH` from the parent project root.
3. Confirm the database file exists.
4. Confirm `schema_migrations` contains the latest required version.
5. Start API services.

If the database is missing or outdated, the backend should exit with a clear message telling the developer to run `npm run init:db`.

## Backend services

Recommended service files:

```text
backend/src/
  api/graphql/
  config/
  db/                    Runtime DB connection, queries, repositories, health checks only
  modules/users/
  modules/topics/
  modules/modules/
  modules/questions/
  modules/exams/
  modules/statistics/
  modules/importExport/
  utils/
```

## Validation rules

- User name is required, trimmed, and case-insensitive unique.
- Module topic percentages must total 100, allowing minor float tolerance.
- Question must have text and topic.
- Question must have at least two options.
- Question must have at least one correct answer.
- Option text must not be empty.
- Exam cannot start twice.
- Submitted exam cannot be edited.
- Answers cannot be recorded after submit or expiry.
- Import must validate before writing.

## Import/export formats

### Markdown import target format

```md
# Module: CLF-C02
# Topic: Cloud Concepts

## Question
What is the main benefit of elasticity?

- [ ] It removes all costs
- [x] It lets resources scale with demand
- [ ] It requires fixed capacity
- [ ] It disables monitoring

Explanation: Elasticity helps match capacity to demand.
Difficulty: easy
LockOrder: false
```

### Import process

1. Parse markdown.
2. Validate module and topic references.
3. Validate questions and options.
4. Show import preview.
5. Write only after user confirmation.
6. Create backup before import.

### Export formats

- Markdown.
- JSON.
- CSV for question list.

## Tests

Required backend unit tests:

- Schema migration creates all tables.
- User name uniqueness works.
- Question CRUD works.
- Option CRUD works.
- Module topic percentages validate.
- Exam generation respects topic weights.
- Weakness weighting increases failed question probability.
- Locked option order is preserved.
- Unlocked option order is stored after shuffle.
- Answers are recorded automatically.
- Submitted exam blocks further answer writes.
- Report calculation is correct.
- Markdown import validates bad files.

## Documentation

- Reflect the architecture and running instructions in a README file.
- Provide Swagger dosumentation for all API endpoints. 
