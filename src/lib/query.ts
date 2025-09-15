import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30,   // 30 minutes
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Query key factories (consistent invalidation)
export const queryKeys = {
  characters: {
    all: ['characters'] as const,
    list: () => ['characters', 'list'] as const,
    detail: (id: string) => ['characters', 'detail', id] as const,
  },
  chats: {
    all: ['chats'] as const,
    list: () => ['chats', 'list'] as const,
    byCharacter: (characterId: string) => ['chats', 'character', characterId] as const,
    detail: (id: string) => ['chats', 'detail', id] as const,
  },
  messages: {
    all: ['messages'] as const,
    byChat: (chatId: string) => ['messages', 'chat', chatId] as const,
    detail: (id: string) => ['messages', 'detail', id] as const,
  },
  assets: {
    all: ['assets'] as const,
    list: () => ['assets', 'list'] as const,
    byOwner: (ownerType: string, ownerId: string) => ['assets', 'owner', ownerType, ownerId] as const,
    detail: (id: string) => ['assets', 'detail', id] as const,
  },
  settings: {
    all: ['settings'] as const,
    key: (key: string) => ['settings', key] as const,
  },
  apiKeys: {
    all: ['apiKeys'] as const,
    list: () => ['apiKeys', 'list'] as const,
    detail: (id: string) => ['apiKeys', 'detail', id] as const,
  },
} as const;
