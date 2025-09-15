import { QueryClient } from '@tanstack/react-query';

// Create a client for React Query
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Query keys for consistent cache management
export const queryKeys = {
  characters: ['characters'] as const,
  character: (id: string) => ['characters', id] as const,
  chats: ['chats'] as const,
  chat: (id: string) => ['chats', id] as const,
  messages: (chatId: string) => ['messages', chatId] as const,
  assets: ['assets'] as const,
  settings: ['settings'] as const,
  apiKeys: ['apiKeys'] as const,
} as const;