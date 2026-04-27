import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from '@apollo/client';

const graphqlEndpoint = import.meta.env.VITE_GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql';

const httpLink = new HttpLink({
  uri: graphqlEndpoint,
  credentials: 'include',
});

// Add auth token to headers if needed in future
const authLink = new ApolloLink((operation, forward) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    operation.setContext({
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
  }
  return forward(operation);
});

export const apolloClient = new ApolloClient({
  cache: new InMemoryCache(),
  link: authLink.concat(httpLink),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
});
