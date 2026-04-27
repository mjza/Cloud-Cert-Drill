import { gql } from '@apollo/client';

export const GET_USERS = gql`
  query GetUsers {
    users {
      userId
      name
      createdAt
    }
  }
`;

export const GET_USER = gql`
  query GetUser($userId: ID!) {
    user(userId: $userId) {
      userId
      name
      createdAt
    }
  }
`;

export const GET_USER_STATISTICS = gql`
  query GetUserStatistics($userId: ID!) {
    userStatistics(userId: $userId) {
      totalExams
      averageScore
      lastExamScore
      questionsAnswered
      weakTopics {
        topicId
        topicName
        averageScore
      }
      strongTopics {
        topicId
        topicName
        averageScore
      }
    }
  }
`;
