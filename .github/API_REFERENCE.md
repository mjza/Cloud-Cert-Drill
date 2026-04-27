# Backend API Reference

## GraphQL API Documentation

### Scalar Types

#### DateTime
ISO 8601 formatted date-time string

### Enum Types

#### ExamStatus
- `DRAFT` - Exam created, not yet ready
- `READY` - Exam ready to start
- `IN_PROGRESS` - Exam in active session
- `SUBMITTED` - Exam completed and submitted
- `EXPIRED` - Exam time limit exceeded
- `COMPLETED` - Exam session ended

#### QuestionDraftStatus
- `OPEN` - Draft is being edited
- `SUBMITTED` - Draft converted to question
- `DISCARDED` - Draft deleted

#### DifficultyLevel
- `EASY`
- `MEDIUM`
- `HARD`

### Object Types

#### User
```graphql
type User {
  userId: ID!              # Unique user identifier
  name: String!            # User name (case-insensitive unique)
  createdAt: DateTime!     # Account creation timestamp
  updatedAt: DateTime!     # Last update timestamp
}
```

#### Topic
```graphql
type Topic {
  id: ID!                  # Topic identifier
  name: String!            # Topic name (must be unique)
  description: String      # Optional description
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

#### ModuleTopic
```graphql
type ModuleTopic {
  topic: Topic!            # Topic reference
  percentage: Float!       # Weight in module (0-100)
}
```

#### Module
```graphql
type Module {
  id: ID!                          # Module identifier
  name: String!                    # Module name (certification code)
  description: String              # Optional description
  defaultQuestionCount: Int!       # Questions per exam (default: 65)
  defaultDurationMinutes: Int!     # Time limit per exam (default: 130)
  passingScore: Float              # Passing threshold percentage
  topics: [ModuleTopic!]!          # Topics and their weights
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

#### Option
```graphql
type Option {
  id: ID!                # Option identifier
  questionId: ID!        # Parent question
  isAnswer: Boolean!     # Is this a correct answer
  text: String!          # Option text
  displayOrder: Int!     # Position in option list
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

#### Question
```graphql
type Question {
  id: ID!                      # Question identifier
  topicId: ID!                 # Topic ID
  topic: Topic!                # Topic reference
  text: String!                # Question text
  explanation: String          # Why answer is correct
  durationSeconds: Int         # Suggested time per question
  difficulty: DifficultyLevel  # Difficulty level
  lockOrders: Boolean!         # Keep option order fixed
  isActive: Boolean!           # Is question available
  source: String               # Question origin/source
  options: [Option!]!          # Answer options (shuffled if needed)
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

#### ExamQuestion
```graphql
type ExamQuestion {
  examId: ID!                 # Parent exam
  question: Question!         # Question reference
  position: Int!              # Order in exam (1-based)
  optionOrder: [ID!]          # Shuffled option IDs (null if locked)
  markedForReview: Boolean!   # User flagged for review
}
```

#### Exam
```graphql
type Exam {
  examId: ID!                  # Exam attempt identifier
  userId: ID!                  # Test taker
  user: User!                  # User reference
  moduleId: ID!                # Certification module
  module: Module!              # Module reference
  name: String!                # Funny exam name
  status: ExamStatus!          # Current exam state
  durationMinutes: Int!        # Total time allowed
  questionCount: Int!          # Number of questions
  createdAt: DateTime!         # When exam was generated
  startedAt: DateTime          # When exam started
  submittedAt: DateTime        # When exam was submitted
  expiresAt: DateTime          # When exam time runs out
  score: Float                 # Final percentage (0-100)
  questions: [ExamQuestion!]!  # Exam questions with state
}
```

#### ExamAnswer
```graphql
type ExamAnswer {
  examId: ID!                    # Exam attempt
  questionId: ID!                # Question answered
  selectedOptionIds: [ID!]!      # Chosen options
  score: Float                   # 1.0 if correct, 0.0 if incorrect
  answeredAt: DateTime!          # When answer was recorded
}
```

#### QuestionDraft
```graphql
type QuestionDraft {
  id: ID!                      # Draft identifier
  questionId: ID               # Target question (null if new)
  draftJson: String!           # Serialized question data
  status: QuestionDraftStatus! # Draft state
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

#### HealthCheck
```graphql
type HealthCheck {
  status: String!              # "healthy" or "unhealthy"
  database: String!            # "connected" or "disconnected"
  timestamp: DateTime!
}
```

### Query Operations

#### health
```graphql
query {
  health: HealthCheck!
}
```
Health check for backend and database.

#### users
```graphql
query {
  users: [User!]!
}
```
Get all users, ordered by name.

#### user
```graphql
query {
  user(userId: ID!): User
}
```
Get single user by ID, returns null if not found.

#### userByName
```graphql
query {
  userByName(name: String!): User
}
```
Get user by name (case-insensitive), returns null if not found.

#### modules
```graphql
query {
  modules: [Module!]!
}
```
Get all modules with topics, ordered by name.

#### module
```graphql
query {
  module(id: ID!): Module
}
```
Get single module with topics, returns null if not found.

#### topics
```graphql
query {
  topics: [Topic!]!
}
```
Get all topics, ordered by name.

#### topic
```graphql
query {
  topic(id: ID!): Topic
}
```
Get single topic, returns null if not found.

#### question
```graphql
query {
  question(id: ID!): Question
}
```
Get single question with options, returns null if not found.

#### questions
```graphql
query {
  questions(limit: Int, offset: Int, topicId: ID): [Question!]!
}
```
Get questions with optional filtering.
- `limit`: Maximum results (default: no limit)
- `offset`: Skip this many results (default: 0)
- `topicId`: Filter by topic (optional)

#### exams
```graphql
query {
  exams(userId: ID!): [Exam!]!
}
```
Get all exams for a user, most recent first.

#### exam
```graphql
query {
  exam(examId: ID!): Exam
}
```
Get single exam with questions and answers, returns null if not found.

### Mutation Operations

#### upsertUserByName
```graphql
mutation {
  upsertUserByName(name: String!): User!
}
```
Get existing user or create if name doesn't exist. Trimmed, case-insensitive.

#### createTopic
```graphql
mutation {
  createTopic(input: TopicInput!): Topic!
}

input TopicInput {
  name: String!
  description: String
}
```
Create new topic. Name must be unique and 2-255 characters.

#### updateTopic
```graphql
mutation {
  updateTopic(id: ID!, input: TopicInput!): Topic!
}
```
Update topic name and/or description.

#### deleteTopic
```graphql
mutation {
  deleteTopic(id: ID!): Boolean!
}
```
Delete topic (fails if used in modules).

#### createModule
```graphql
mutation {
  createModule(input: ModuleInput!): Module!
}

input ModuleInput {
  name: String!
  description: String
  defaultQuestionCount: Int
  defaultDurationMinutes: Int
  passingScore: Float
  topics: [ModuleTopicInput!]!
}

input ModuleTopicInput {
  topicId: ID!
  percentage: Float!
}
```
Create module with topic distribution. Percentages must sum to 100 (±0.5).

#### updateModule
```graphql
mutation {
  updateModule(id: ID!, input: ModuleInput!): Module!
}
```
Update module configuration.

#### deleteModule
```graphql
mutation {
  deleteModule(id: ID!): Boolean!
}
```
Delete module (fails if has exams).

#### generateExam
```graphql
mutation {
  generateExam(input: GenerateExamInput!): Exam!
}

input GenerateExamInput {
  userId: ID!
  moduleId: ID!
  questionCount: Int
  durationMinutes: Int
}
```
Generate new exam. Uses module defaults if not specified. Questions selected with weakness weighting.

#### startExam
```graphql
mutation {
  startExam(examId: ID!): Exam!
}
```
Start exam (changes status to IN_PROGRESS, sets expiry time).

#### recordAnswer
```graphql
mutation {
  recordAnswer(input: RecordAnswerInput!): ExamAnswer!
}

input RecordAnswerInput {
  examId: ID!
  questionId: ID!
  selectedOptionIds: [ID!]!
}
```
Record answer. Automatically scored (1 if correct, 0 if incorrect).

#### markQuestionForReview
```graphql
mutation {
  markQuestionForReview(
    examId: ID!
    questionId: ID!
    marked: Boolean!
  ): Boolean!
}
```
Mark or unmark question for review.

#### submitExam
```graphql
mutation {
  submitExam(examId: ID!): Exam!
}
```
Submit completed exam (calculates final score, locks answers).

### Error Responses

All mutations and queries return errors in GraphQL format:

```json
{
  "errors": [
    {
      "message": "Error description",
      "extensions": {
        "code": "INTERNAL_SERVER_ERROR"
      }
    }
  ]
}
```

Common error messages:
- "User name cannot be empty"
- "Cannot delete topic that is used in modules"
- "Topic percentages must sum to 100 (got X.XX)"
- "Question must have at least 2 options"
- "Module {id} not found"
- "Database health check failed"
- "Cannot start exam" (invalid status)

## Response Examples

### User Query
```json
{
  "data": {
    "users": [
      {
        "userId": "user-123abc-xyz",
        "name": "Alice",
        "createdAt": "2024-04-26T10:30:00Z",
        "updatedAt": "2024-04-26T10:30:00Z"
      }
    ]
  }
}
```

### Module Query
```json
{
  "data": {
    "module": {
      "id": "module-saa-c03",
      "name": "AWS Solutions Architect Associate",
      "defaultQuestionCount": 65,
      "defaultDurationMinutes": 130,
      "passingScore": 72.0,
      "topics": [
        {
          "topic": {
            "id": "topic-ec2",
            "name": "EC2"
          },
          "percentage": 25
        },
        {
          "topic": {
            "id": "topic-s3",
            "name": "S3"
          },
          "percentage": 25
        }
      ]
    }
  }
}
```

### Exam Query
```json
{
  "data": {
    "exam": {
      "examId": "exam-abc123-def",
      "userId": "user-xxx",
      "moduleName": "AWS Solutions Architect",
      "name": "Cloud Goblin Trial",
      "status": "IN_PROGRESS",
      "score": null,
      "questionCount": 65,
      "durationMinutes": 130,
      "createdAt": "2024-04-26T10:30:00Z",
      "startedAt": "2024-04-26T10:35:00Z",
      "expiresAt": "2024-04-26T12:45:00Z"
    }
  }
}
```

## Rate Limiting

No rate limiting currently implemented. Add in future if needed.

## CORS

CORS is enabled for development. Configure in production if needed.

## Authentication

No authentication in this version. All data is publicly accessible.

## Pagination

Implement via `limit` and `offset` parameters on `questions` query:

```graphql
query {
  questions(limit: 10, offset: 20) {
    id
    text
  }
}
```

## Batch Operations

For bulk creates/updates, use multiple mutations in a single request:

```graphql
mutation {
  q1: createTopic(input: { name: "Topic A" }) { id }
  q2: createTopic(input: { name: "Topic B" }) { id }
  q3: createTopic(input: { name: "Topic C" }) { id }
}
```
