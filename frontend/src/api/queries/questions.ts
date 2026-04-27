import { gql } from '@apollo/client';

export const GET_QUESTIONS = gql`
  query GetQuestions($input: QuestionListInput!) {
    questions(input: $input) {
      edges {
        node {
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
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`;

export const GET_QUESTION = gql`
  query GetQuestion($id: ID!) {
    question(id: $id) {
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
  }
`;
