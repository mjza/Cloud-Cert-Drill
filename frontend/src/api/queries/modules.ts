import { gql } from '@apollo/client';

export const GET_MODULES = gql`
  query GetModules {
    modules {
      id
      name
      description
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
`;

export const GET_MODULE = gql`
  query GetModule($id: ID!) {
    module(id: $id) {
      id
      name
      description
      defaultQuestionCount
      defaultDurationMinutes
      passingScore
      topics {
        topic {
          id
          name
          description
        }
        percentage
      }
    }
  }
`;

export const GET_TOPICS = gql`
  query GetTopics {
    topics {
      id
      name
      description
    }
  }
`;
