import { gql } from 'graphql-tag';

export const typeDefs = gql`
  scalar DateTime

  enum ExamStatus {
    DRAFT
    READY
    IN_PROGRESS
    SUBMITTED
    EXPIRED
    COMPLETED
  }

  enum QuestionDraftStatus {
    OPEN
    SUBMITTED
    DISCARDED
  }

  enum DifficultyLevel {
    EASY
    MEDIUM
    HARD
  }

  type User {
    userId: ID!
    name: String!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Topic {
    id: ID!
    name: String!
    description: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ModuleTopic {
    topic: Topic!
    percentage: Float!
  }

  type Module {
    id: ID!
    name: String!
    description: String
    defaultQuestionCount: Int!
    defaultDurationMinutes: Int!
    passingScore: Float
    topics: [ModuleTopic!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Option {
    id: ID!
    questionId: ID!
    isAnswer: Boolean!
    text: String!
    displayOrder: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Question {
    id: ID!
    topicId: ID!
    topic: Topic!
    text: String!
    explanation: String
    durationSeconds: Int
    difficulty: DifficultyLevel
    lockOrders: Boolean!
    isActive: Boolean!
    source: String
    options: [Option!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ExamQuestion {
    examId: ID!
    question: Question!
    position: Int!
    optionOrder: [ID!]
    markedForReview: Boolean!
  }

  type Exam {
    examId: ID!
    userId: ID!
    user: User!
    moduleId: ID!
    module: Module!
    name: String!
    status: ExamStatus!
    durationMinutes: Int!
    questionCount: Int!
    createdAt: DateTime!
    startedAt: DateTime
    submittedAt: DateTime
    expiresAt: DateTime
    score: Float
    questions: [ExamQuestion!]!
  }

  type ExamAnswer {
    examId: ID!
    questionId: ID!
    selectedOptionIds: [ID!]!
    score: Float
    answeredAt: DateTime!
  }

  type QuestionDraft {
    id: ID!
    questionId: ID
    draftJson: String!
    status: QuestionDraftStatus!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type HealthCheck {
    status: String!
    database: String!
    timestamp: DateTime!
  }

  # Queries
  type Query {
    health: HealthCheck!
    users: [User!]!
    user(userId: ID!): User
    userByName(name: String!): User
    modules: [Module!]!
    module(id: ID!): Module
    topics: [Topic!]!
    topic(id: ID!): Topic
    question(id: ID!): Question
    questions(limit: Int, offset: Int, topicId: ID): [Question!]!
    exams(userId: ID!): [Exam!]!
    exam(examId: ID!): Exam
  }

  # Mutations
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
    generateExam(input: GenerateExamInput!): Exam!
    startExam(examId: ID!): Exam!
    recordAnswer(input: RecordAnswerInput!): ExamAnswer!
    markQuestionForReview(examId: ID!, questionId: ID!, marked: Boolean!): Boolean!
    submitExam(examId: ID!): Exam!
  }

  # Input types
  input TopicInput {
    name: String!
    description: String
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

  input QuestionInput {
    topicId: ID!
    text: String!
    explanation: String
    durationSeconds: Int
    difficulty: DifficultyLevel
    lockOrders: Boolean
    isActive: Boolean
    source: String
    options: [OptionInput!]!
  }

  input OptionInput {
    id: ID
    text: String!
    isAnswer: Boolean!
    displayOrder: Int
  }

  input GenerateExamInput {
    userId: ID!
    moduleId: ID!
    questionCount: Int
    durationMinutes: Int
  }

  input RecordAnswerInput {
    examId: ID!
    questionId: ID!
    selectedOptionIds: [ID!]!
  }

  input QuestionDraftInput {
    questionId: ID
    draftJson: String!
  }
`;
