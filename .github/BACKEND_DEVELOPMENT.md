# Backend Development Guide

## Overview

The CloudCert Drill backend is a GraphQL API service built with Express, Apollo Server, and TypeScript. It manages all business logic including exam generation, answer recording, user management, and statistics.

## Architecture Principles

1. **Database Ownership**: The initializer owns all schema creation, migrations, and seeding. The backend only performs runtime database queries.
2. **GraphQL API**: All client communication goes through GraphQL, providing type safety and flexible querying.
3. **Layered Services**: Database layer → Business logic → GraphQL resolvers
4. **Error Handling**: Graceful shutdown and comprehensive error logging

## Starting the Backend

### Development Mode (with hot reload)

```bash
npm -w backend run dev
```

This starts the server at `http://localhost:4317` with Apollo GraphQL at `/graphql`

### Production Mode

```bash
npm -w backend run build
npm -w backend run start
```

### With Database Initialization

```bash
npm run dev:backend
```

This runs `npm run init:db` first, then starts the backend.

## GraphQL Endpoints

### Main Endpoint
- **URL**: `http://localhost:4317/graphql`
- **Method**: POST
- **Headers**: `Content-Type: application/json`

### Health Check Endpoint
- **URL**: `http://localhost:4317/health`
- **Method**: GET
- **Response**: `{ status: "healthy", timestamp: "..." }`

## Core Queries

### Get All Users
```graphql
query {
  users {
    userId
    name
    createdAt
    updatedAt
  }
}
```

### Get Single User
```graphql
query {
  user(userId: "user-xxx") {
    userId
    name
  }
}
```

### Get or Create User by Name
```graphql
query {
  userByName(name: "Alice") {
    userId
    name
  }
}
```

### Get All Topics
```graphql
query {
  topics {
    id
    name
    description
  }
}
```

### Get All Modules with Topics
```graphql
query {
  modules {
    id
    name
    defaultQuestionCount
    defaultDurationMinutes
    passingScore
    topics {
      topic {
        id
        name
      }
      percentage
    }
  }
}
```

### Get Questions
```graphql
query {
  questions(limit: 10, offset: 0, topicId: "topic-1") {
    id
    topicId
    text
    explanation
    difficulty
    options {
      id
      text
      isAnswer
      displayOrder
    }
  }
}
```

### Get User's Exams
```graphql
query {
  exams(userId: "user-xxx") {
    examId
    name
    status
    score
    createdAt
    questions {
      question {
        id
        text
      }
      position
      markedForReview
    }
  }
}
```

## Core Mutations

### Create/Get User
```graphql
mutation {
  upsertUserByName(name: "Bob") {
    userId
    name
  }
}
```

### Create Topic
```graphql
mutation {
  createTopic(input: {
    name: "Networking"
    description: "AWS networking services"
  }) {
    id
    name
  }
}
```

### Create Module
```graphql
mutation {
  createModule(input: {
    name: "AWS Solutions Architect"
    defaultQuestionCount: 65
    defaultDurationMinutes: 130
    passingScore: 72
    topics: [
      { topicId: "topic-1", percentage: 25 }
      { topicId: "topic-2", percentage: 25 }
      { topicId: "topic-3", percentage: 20 }
      { topicId: "topic-4", percentage: 20 }
      { topicId: "topic-5", percentage: 10 }
    ]
  }) {
    id
    name
    topics {
      topic { name }
      percentage
    }
  }
}
```

### Generate Exam
```graphql
mutation {
  generateExam(input: {
    userId: "user-xxx"
    moduleId: "module-saa-c03"
    questionCount: 65
    durationMinutes: 130
  }) {
    examId
    name
    questionCount
    durationMinutes
    status
  }
}
```

### Start Exam
```graphql
mutation {
  startExam(examId: "exam-xxx") {
    examId
    status
    startedAt
    expiresAt
  }
}
```

### Record Answer
```graphql
mutation {
  recordAnswer(input: {
    examId: "exam-xxx"
    questionId: "q-xxx"
    selectedOptionIds: ["opt-1", "opt-2"]
  }) {
    examId
    questionId
    score
    answeredAt
  }
}
```

### Submit Exam
```graphql
mutation {
  submitExam(examId: "exam-xxx") {
    examId
    status
    score
    submittedAt
  }
}
```

### Mark Question for Review
```graphql
mutation {
  markQuestionForReview(
    examId: "exam-xxx"
    questionId: "q-xxx"
    marked: true
  )
}
```

## Project Structure

```
backend/
├── src/
│   ├── index.ts                 # Server entry point
│   ├── config/
│   │   └── env.ts              # Environment loading
│   ├── db/
│   │   └── connection.ts        # SQLite connection and queries
│   ├── graphql/
│   │   ├── typeDefs.ts         # GraphQL schema
│   │   ├── resolvers.ts        # Query resolvers
│   │   └── mutations.ts        # Mutation resolvers
│   ├── services/
│   │   └── examGeneration.ts   # Exam generation logic
│   └── utils/
│       ├── id.ts               # ID generation
│       ├── logger.ts           # Structured logging
│       └── validation.ts       # Input validation
├── package.json
├── tsconfig.json
└── .gitignore
```

## Database Connection Model

The backend uses a **runtime-only** connection pattern:

```typescript
// Open connection
const db = await openRuntimeConnection({ databasePath: config.databasePath });

// Use for queries only
const users = await queryAll(db, 'SELECT * FROM users');
const user = await queryOne(db, 'SELECT * FROM users WHERE user_id = ?', [userId]);

// Run transactions
await transaction(db, async (txDb) => {
  await runSQL(txDb, 'INSERT INTO ...');
  await runSQL(txDb, 'UPDATE ...');
});

// Close connection
await closeDatabase(db);
```

The initializer handles all schema creation and migrations. The backend never:
- Creates tables
- Runs migrations
- Seeds data
- Resets the database

## Exam Generation Algorithm

The `examGeneration.ts` service implements:

1. **Topic Allocation** - Questions distributed per topic weight
   ```
   questions_for_topic = round(total_questions * topic_percentage)
   ```

2. **Weakness Scoring** - Failed questions get higher selection weight
   ```
   weight = 1 + (failures * 0.75) [capped at 5]
   ```

3. **Weighted Random Selection** - Probabilistic selection by weight

4. **Option Shuffling** - Randomized per exam if `lock_orders = 0`

5. **Funny Names** - Generated exam names for user engagement

## Validation Rules

### User
- Name required, 2-100 characters
- Unique (case-insensitive)

### Topic
- Name required, 2-255 characters
- Description optional, max 1000 chars

### Module
- Topic percentages must sum to 100 (±0.5 tolerance)
- Name unique

### Question
- Text required, 5-5000 characters
- 2-10 options
- At least 1 correct answer
- Options: 2-500 characters

### Exam
- Cannot start twice
- Cannot edit after submission
- Answers only recorded in `in_progress` status
- Respects expiry timestamp

## Error Handling

All resolvers catch errors and log them:

```typescript
try {
  // operation
} catch (error) {
  logger.error('Operation failed:', error);
  throw error;  // GraphQL will format as error response
}
```

## Logging

Structured logging with levels: debug, info, warn, error

```typescript
logger.debug('Detailed info');
logger.info('General info');
logger.warn('Warning');
logger.error('Error', error);
logger.section('Section title');
logger.success('Success message');
```

## Configuration

Environment variables (from parent `.env`):

```env
APP_ENV=development              # development, production
APP_NAME=CloudCert Drill         # Application name
DATABASE_PATH=./data/database.sqlite
BACKEND_HOST=127.0.0.1
BACKEND_PORT=4317
LOG_LEVEL=info                   # debug, info, warn, error
```

## Testing Workflow

1. **Initialize**: `npm run init:db`
2. **Start backend**: `npm -w backend run dev`
3. **Open GraphQL**: Visit `http://localhost:4317/graphql`
4. **Create user**: Run mutation `upsertUserByName`
5. **View topics**: Run query `topics`
6. **View modules**: Run query `modules`
7. **Generate exam**: Run mutation `generateExam`
8. **Start exam**: Run mutation `startExam`
9. **Record answers**: Run mutation `recordAnswer` for each question
10. **Submit exam**: Run mutation `submitExam`

## Development Tips

### Apollo Studio
In development mode, open Apollo Studio at `http://localhost:4317/graphql` for:
- Automatic schema exploration
- Query/mutation building with autocomplete
- Request history
- Performance metrics

### Database Inspection
To inspect the database directly:
```bash
sqlite3 ./data/database.sqlite
> .schema
> SELECT * FROM users;
```

### Resetting for Development
```bash
npm run reset:db:dev  # Deletes old DB (with backup), reinitializes
```

### Debugging
Set `LOG_LEVEL=debug` in `.env` for detailed SQL logging:
```env
LOG_LEVEL=debug
```

## Performance Considerations

- Indexes on foreign key columns (created by initializer)
- Weighted random selection capped at 5x to prevent skew
- Option shuffling stored in exam record to avoid recalculation
- Connection reuse within request context

## Next Steps

- Add pagination helpers for large result sets
- Implement caching layer for static data
- Add batch operations for bulk imports
- Implement soft deletes for audit trails
- Add export functionality (markdown, JSON, CSV)
