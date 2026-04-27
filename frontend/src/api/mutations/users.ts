import { gql } from '@apollo/client';

export const UPSERT_USER_BY_NAME = gql`
  mutation UpsertUserByName($name: String!) {
    upsertUserByName(name: $name) {
      userId
      name
      createdAt
    }
  }
`;
