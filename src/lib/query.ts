import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
    },
  },
});

// Query key factories for consistent invalidation
export const queryKeys = {
  characters: {
    all: ['characters'] as const,
    list: () => [...queryKeys.characters.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.characters.all, 'detail', id] as const,
  },
  chats: {
    all: ['chats'] as const,
    list: () => [...queryKeys.chats.all, 'list'] as const,
    byCharacter: (characterId: string) => [...queryKeys.chats.all, 'character', characterId] as const,
    detail: (id: string) => [...queryKeys.chats.all, 'detail', id] as const,
  },
  messages: {
    all: ['messages'] as const,
    byChat: (chatId: string) => [...queryKeys.messages.all, 'chat', chatId] as const,
    detail: (id: string) => [...queryKeys.messages.all, 'detail', id] as const,
  },
  assets: {
    all: ['assets'] as const,
    list: () => [...queryKeys.assets.all, 'list'] as const,
    byOwner: (ownerType: string, ownerId: string) => [...queryKeys.assets.all, 'owner', ownerType, ownerId] as const,
    detail: (id: string) => [...queryKeys.assets.all, 'detail', id] as const,
  },
  settings: {
    all: ['settings'] as const,
    key: (key: string) => [...queryKeys.settings.all, key] as const,
  },
  apiKeys: {
    all: ['apiKeys'] as const,
    list: () => [...queryKeys.apiKeys.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.apiKeys.all, 'detail', id] as const,
  },
} as const;