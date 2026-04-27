import { gql } from '@apollo/client';

export const CREATE_QUESTION = gql`
  mutation CreateQuestion($input: QuestionInput!) {
    createQuestion(input: $input) {
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

export const UPDATE_QUESTION = gql`
  mutation UpdateQuestion($id: ID!, $input: QuestionInput!) {
    updateQuestion(id: $id, input: $input) {
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

export const DELETE_QUESTION = gql`
  mutation DeleteQuestion($id: ID!) {
    deleteQuestion(id: $id)
  }
`;

export const CREATE_QUESTION_DRAFT = gql`
  mutation CreateQuestionDraft($input: QuestionDraftInput!) {
    createQuestionDraft(input: $input) {
      id
      questionId
      draftJson
      status
      createdAt
      updatedAt
    }
  }
`;

export const SUBMIT_QUESTION_DRAFTS = gql`
  mutation SubmitQuestionDrafts($ids: [ID!]!) {
    submitQuestionDrafts(ids: $ids) {
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

export const DISCARD_QUESTION_DRAFTS = gql`
  mutation DiscardQuestionDrafts($ids: [ID!]!) {
    discardQuestionDrafts(ids: $ids)
  }
`;
