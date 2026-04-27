import { gql } from '@apollo/client';

export const GET_USER_EXAMS = gql`
  query GetUserExams($userId: ID!) {
    exams(userId: $userId) {
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
      score
    }
  }
`;

export const GET_EXAM = gql`
  query GetExam($examId: ID!) {
    exam(examId: $examId) {
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
            isAnswer
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

export const GET_EXAM_REPORT = gql`
  query GetExamReport($examId: ID!) {
    examReport(examId: $examId) {
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
      questionResults {
        questionId
        topicName
        questionText
        userAnswers {
          optionId
          optionText
        }
        correctAnswers {
          optionId
          optionText
        }
        explanation
        score
      }
    }
  }
`;
