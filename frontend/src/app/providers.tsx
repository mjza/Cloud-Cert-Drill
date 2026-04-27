import { ReactNode } from 'react';
import { ApolloProvider } from '@apollo/client';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { apolloClient } from '@api/graphqlClient';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
    },
  },
});

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ApolloProvider client={apolloClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ApolloProvider>
  );
}
