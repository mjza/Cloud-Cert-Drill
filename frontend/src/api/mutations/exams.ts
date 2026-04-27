import { gql } from '@apollo/client';

export const GENERATE_EXAM = gql`
  mutation GenerateExam($input: GenerateExamInput!) {
    generateExam(input: $input) {
      examId
      userId
      module {
        id
        name
      }
      name
      status
      durationMinutes
      questionCount
      createdAt
      startedAt
      submittedAt
      expiresAt
      score
    }
  }
`;

export const START_EXAM = gql`
  mutation StartExam($examId: ID!) {
    startExam(examId: $examId) {
      examId
      userId
      module {
        id
        name
      }
      name
      status
      durationMinutes
      questionCount
      createdAt
      startedAt
      expiresAt
      questions {
        examId
        question {
          id
          topic {
            id
            name
          }
          text
          explanation
          durationSeconds
          difficulty
          lockOrders
          options {
            id
            questionId
            text
            displayOrder
          }
        }
        position
        optionOrder
        markedForReview
      }
    }
  }
`;

export const RECORD_ANSWER = gql`
  mutation RecordAnswer($input: RecordAnswerInput!) {
    recordAnswer(input: $input) {
      examId
      questionId
      selectedOptionIds
      score
      answeredAt
    }
  }
`;

export const MARK_QUESTION_FOR_REVIEW = gql`
  mutation MarkQuestionForReview($examId: ID!, $questionId: ID!, $marked: Boolean!) {
    markQuestionForReview(examId: $examId, questionId: $questionId, marked: $marked)
  }
`;

export const SUBMIT_EXAM = gql`
  mutation SubmitExam($examId: ID!) {
    submitExam(examId: $examId) {
      examId
      userId
      moduleName
      examName
      score
      passingScore
      passed
      totalQuestions
      correctAnswers
      incorrectAnswers
      unansweredQuestions
      timeUsedSeconds
      topicBreakdown {
        topicId
        topicName
        questionsAsked
        questionsCorrect
        averageScore
      }
    }
  }
`;
