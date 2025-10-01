import { CharacterCard } from '@/components/CharacterCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { Character, ChatMessage, ChatSession } from '@/types';
import { ArrowRight, ChatCircle, ChatsCircle, Heart, Plus, Trash, User, UserCircle, Users, Warning } from '@phosphor-icons/react';
import { useAutoCharacterCreator } from '@/hooks/useAutoCharacterCreator';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { useChat } from '@/hooks/useChat';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

interface CharacterRosterProps {
  characters: Character[];
  selectedId: string | null;
  onSelect: (characterId: string) => void;
  onStartChat: (characterId: string) => Promise<void>;
  onDeleteCharacter: (characterId: string) => Promise<void>;
  onCreateCharacter: (gender: 'female' | 'male') => Promise<void>;
  sessions: ChatSession[];
  onViewProfile?: (character: Character) => void;
}

const EMPTY_STATE_TIPS = [
  'Use the copilot to craft your first girl instantly.',
  'Import a character profile to seed the house.',
  'Ask the copilot for a drama arc and follow her lead.',
];

function CharacterRoster({
  characters,
  selectedId,
  onSelect,
  onStartChat,
  onDeleteCharacter,
  onCreateCharacter,
  sessions,
  onViewProfile,
}: CharacterRosterProps) {
  const [genderFilter, setGenderFilter] = useState<'all' | 'female' | 'male'>('all');

  const filteredCharacters = characters.filter((character) => {
    if (genderFilter === 'all') return true;
    const info = `${character.personality ?? ''} ${character.description ?? ''}`.toLowerCase();
    if (genderFilter === 'male') {
      return info.includes('male') || info.includes('man') || info.includes('boy') || info.includes('guy');
    }
    return !info.includes('male') && !info.includes('man') && !info.includes('boy') && !info.includes('guy');
  });

  const handleKeyActivate = useCallback((event: ReactKeyboardEvent, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  }, []);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-[rgba(18,18,32,0.95)] shadow-[0_35px_120px_-60px_rgba(255,19,114,0.55)]">
      <div className="flex flex-shrink-0 flex-col gap-3 border-b border-white/5 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-white/40">Roster</p>
            <h2 className="mt-1 text-lg font-semibold text-white">Girls of the House</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={genderFilter === 'female' ? 'default' : 'outline'}
              className="h-8 rounded-full text-xs"
              onClick={() => setGenderFilter('female')}
            >
              <UserCircle size={12} className="mr-1" />
              Girls
            </Button>
            <Button
              size="sm"
              variant={genderFilter === 'male' ? 'default' : 'outline'}
              className="h-8 rounded-full text-xs"
              onClick={() => setGenderFilter('male')}
            >
              <User size={12} className="mr-1" />
              Men
            </Button>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="rounded-full border-white/10 text-xs uppercase tracking-[0.25em] text-white/70 hover:border-[#ff1372]/50 hover:text-white"
          onClick={() => void onCreateCharacter(genderFilter === 'male' ? 'male' : 'female')}
        >
          <Plus size={12} className="mr-1" />
          Summon New {genderFilter === 'male' ? 'Guy' : 'Girl'}
        </Button>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-3 px-4 py-4">
          {filteredCharacters.map((character) => {
            const activeSessions = sessions.filter((session) => session.participantIds.includes(character.id));
            return (
              <div
                key={character.id}
                className={`group relative w-full rounded-2xl border px-4 pb-4 pt-3 text-left transition-all ${
                  selectedId === character.id
                    ? 'border-[#ff1372] bg-[#ff1372]/10 shadow-[0_12px_40px_-25px_rgba(255,19,114,0.85)]'
                    : 'border-white/10 bg-white/5/30 hover:border-[#ff1372]/35 hover:bg-[#ff1372]/5'
                }`}
                role="button"
                tabIndex={0}
                onClick={() => {
                  onSelect(character.id);
                  onViewProfile?.(character);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(character.id);
                    onViewProfile?.(character);
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border border-white/10">
                    <AvatarImage src={character.avatar} alt={character.name} />
                    <AvatarFallback>{character.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="truncate text-sm font-semibold text-white">{character.name}</h3>
                      <Badge variant="outline" className="border-white/10 text-[10px] uppercase tracking-[0.25em]">
                        {character.rarity}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-white/60">{character.personality}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-white/60">
                  <span className="flex items-center gap-1">
                    <Heart size={12} className="text-[#ff91d0]" />
                    Affection {character.progression?.affection ?? 0}%
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={12} />
                    {activeSessions.length === 0 ? 'No chats yet' : `${activeSessions.length} active chat${activeSessions.length > 1 ? 's' : ''}`}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label="Continue chat"
                    className={cn(
                      buttonVariants({ size: 'sm' }),
                      'flex-1 rounded-full border-0 bg-[#ff1372] text-xs uppercase tracking-[0.25em] text-white transition-colors hover:bg-[#ff1372]/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff1372]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0c1c]'
                    )}
                    onClick={(event) => {
                      event.stopPropagation();
                      void onStartChat(character.id);
                    }}
                    onKeyDown={(event) => {
                      event.stopPropagation();
                      handleKeyActivate(event, () => {
                        void onStartChat(character.id);
                      });
                    }}
                  >
                    Continue
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label="Continue chat"
                    className={cn(
                      buttonVariants({ size: 'icon', variant: 'ghost' }),
                      'rounded-full border border-white/10 text-white/60 transition-colors hover:text-white'
                    )}
                    onClick={(event) => {
                      event.stopPropagation();
                      void onStartChat(character.id);
                    }}
                    onKeyDown={(event) => {
                      event.stopPropagation();
                      handleKeyActivate(event, () => {
                        void onStartChat(character.id);
                      });
                    }}
                  >
                    <ArrowRight size={14} />
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label="Delete character"
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-red-400/50 bg-red-500/10 text-white opacity-0 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0c1c] group-hover:opacity-100"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => {
                        event.stopPropagation();
                        handleKeyActivate(event, () => {
                          (event.currentTarget as HTMLElement).click();
                        });
                      }}
                    >
                      <Trash size={12} />
                    </div>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Character?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This removes {character.name} and all memories tied to her. Continue?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={() => void onDeleteCharacter(character.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            );
          })}
          {filteredCharacters.length === 0 && (
            <div className="space-y-3 rounded-2xl border border-dashed border-white/15 bg-white/5/40 p-5 text-sm text-white/60">
              {EMPTY_STATE_TIPS.map((tip) => (
                <div key={tip} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  {tip}
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface ChatPanelProps {
  character: Character | null;
  messages: ChatMessage[];
  onSend: (text: string) => Promise<void>;
  onStartChat: () => Promise<void>;
  isLoadingMessages: boolean;
  sessions: ChatSession[];
  onSwitchSession: (sessionId: string) => Promise<void>;
  activeSessionId: string | null;
}

function ChatPanel({
  character,
  messages,
  onSend,
  onStartChat,
  isLoadingMessages,
  sessions,
  onSwitchSession,
  activeSessionId,
}: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraft('');
  }, [character?.id, activeSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const canChat = Boolean(activeSessionId && character);

  const characterSessions = useMemo(() => {
    if (!character) return [] as ChatSession[];
    return sessions
      .filter((session) => session.type !== 'assistant' && session.participantIds.includes(character.id))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }, [character, sessions]);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-[rgba(11,11,22,0.92)]">
      <header className="flex items-center justify-between gap-4 border-b border-white/5 px-6 py-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/40">Tonight&apos;s Connection</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">
            {character ? character.name : 'Pick someone to start'}
          </h1>
          {character && <p className="mt-1 text-xs text-white/60">{character.description || 'No background set yet.'}</p>}
        </div>
        {character ? (
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60">
            <Avatar className="h-12 w-12 border border-white/10">
              <AvatarImage src={character.avatar} alt={character.name} />
              <AvatarFallback>{character.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="text-right leading-tight">
              <div>Love {character.stats?.love ?? 0}%</div>
              <div>Trust {character.progression?.trust ?? 0}%</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/5 px-3 py-2 text-xs text-white/40">
            <Warning size={16} />
            Choose a girl to unlock the chat.
          </div>
        )}
      </header>
      <div className="relative flex-1 min-h-0">
        <div className="absolute inset-0 z-0 flex flex-col">
          <div className="flex-shrink-0 border-b border-white/5 px-5 py-3">
            {characterSessions.length > 0 ? (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px] text-white/70">
                <ChatsCircle size={14} className="text-[#ff1372]" />
                <span className="text-white/50">Sessions</span>
                {characterSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => void onSwitchSession(session.id)}
                    className={`rounded-full border px-3 py-1 transition-colors ${
                      activeSessionId === session.id ? 'border-[#ff1372] bg-[#ff1372]/20 text-white' : 'border-white/10 text-white/60 hover:border-[#ff1372]/35 hover:text-white'
                    }`}
                  >
                    {session.type === 'group' ? 'Group scene' : 'Private chat'}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 text-xs text-white/50">
                <ChatCircle size={16} />
                <span>No chats yet. Start one?</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 pb-36">
            <div className="space-y-4">
              {!canChat && !isLoadingMessages && (
                <div className="rounded-3xl border border-dashed border-white/12 bg-white/5 p-6 text-center text-sm text-white/70">
                  <p>Warm up the connection by starting a conversation. She&apos;s waiting for your move.</p>
                  <Button className="mt-4 rounded-full bg-[#ff1372] text-white hover:bg-[#ff1372]/85" onClick={() => void onStartChat()} disabled={!character}>
                    Begin chat
                  </Button>
                </div>
              )}
              {isLoadingMessages && (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-center text-sm text-white/50">
                  Syncing memories…
                </div>
              )}
              {messages.map((message) => {
                const isUser = !message.characterId;
                return (
                  <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[70%] rounded-3xl border px-4 py-3 text-sm leading-relaxed shadow transition-colors ${
                        isUser ? 'border-[#ff1372] bg-[#ff1372]/25 text-white' : 'border-white/10 bg-white/5 text-white/80'
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 px-5 pb-4">
          <div className="pointer-events-auto rounded-2xl border border-white/10 bg-[#111122]/95 px-4 py-3 shadow-[0_25px_65px_-35px_rgba(255,19,114,0.6)] backdrop-blur-xl">
            <form
              className="flex items-center gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (!draft.trim() || !canChat) return;
                void onSend(draft.trim()).then(() => setDraft(''));
              }}
            >
              <Input
                value={draft}
                disabled={!canChat}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={canChat ? 'Say something unforgettable…' : 'Select a girl and start a chat first'}
                className="h-11 flex-1 rounded-xl border-white/10 bg-white/[0.08] text-sm text-white placeholder:text-white/40"
              />
              <Button type="submit" disabled={!canChat || !draft.trim()} className="h-11 rounded-full bg-[#ff1372] px-4 text-xs uppercase tracking-[0.3em] text-white hover:bg-[#ff1372]/85">
                Send
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GirlsView() {
  const { characters, isLoading, removeCharacter, updateCharacter } = useHouseFileStorage();
  const { createRandomCharacter } = useAutoCharacterCreator();
  const { sessions, getSessionMessages, sendMessage, ensureIndividualSession, switchToSession, setActiveSessionId: setChatActiveId } = useChat();

  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [profileCharacterId, setProfileCharacterId] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    if (characters.length > 0 && !selectedCharacterId) {
      setSelectedCharacterId(characters[0].id);
    }
  }, [characters, selectedCharacterId]);

  const selectedCharacter = useMemo(() => characters.find((character) => character.id === selectedCharacterId) ?? null, [characters, selectedCharacterId]);
  const profileCharacter = useMemo(() => characters.find((character) => character.id === profileCharacterId) ?? null, [characters, profileCharacterId]);

  const loadMessages = useCallback(
    async (sessionId: string) => {
      setIsLoadingMessages(true);
      try {
        const data = await getSessionMessages(sessionId);
        setMessages(data);
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [getSessionMessages],
  );

  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }
    void loadMessages(activeSessionId);
  }, [activeSessionId, loadMessages]);

  useEffect(() => {
    const handler = () => {
      if (!activeSessionId) return;
      void loadMessages(activeSessionId);
    };
    try {
      globalThis.addEventListener?.('chat-sessions-updated', handler);
    } catch (error) {
      logger.warn('Failed attaching chat session listener', error);
    }
    return () => {
      try {
        globalThis.removeEventListener?.('chat-sessions-updated', handler);
      } catch (error) {
        logger.warn('Failed removing chat session listener', error);
      }
    };
  }, [activeSessionId, loadMessages]);

  const handleStartChat = useCallback(
    async (characterId: string) => {
      const sessionId = await ensureIndividualSession(characterId);
      setActiveSessionId(sessionId);
      setChatActiveId(sessionId);
      setSelectedCharacterId(characterId);
      await loadMessages(sessionId);
    },
    [ensureIndividualSession, setChatActiveId, loadMessages],
  );

  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!activeSessionId) return;
      await sendMessage(activeSessionId, text, 'user');
      await loadMessages(activeSessionId);
    },
    [activeSessionId, sendMessage, loadMessages],
  );

  const handleSwitchSession = useCallback(
    async (sessionId: string) => {
      setActiveSessionId(sessionId);
      setChatActiveId(sessionId);
      const session = sessions.find((row) => row.id === sessionId);
      if (session?.participantIds?.length === 1) {
        const participant = session.participantIds[0];
        if (participant) setSelectedCharacterId(participant);
      }
      await switchToSession(sessionId).catch(() => undefined);
      await loadMessages(sessionId);
    },
    [sessions, setChatActiveId, switchToSession, loadMessages],
  );

  const handleCreateCharacter = useCallback(
    async (_preferredGender: 'female' | 'male') => {
      try {
        void _preferredGender;
        const character = await createRandomCharacter();
        if (character) {
          toast.success(`${character.name} just stepped into the house.`);
          setSelectedCharacterId(character.id);
        }
      } catch (error) {
        logger.error('Failed to create character:', error);
        toast.error('Failed to create character');
      }
    },
    [createRandomCharacter],
  );

  const handleDeleteCharacter = useCallback(
    async (characterId: string) => {
      try {
        const character = characters.find((c) => c.id === characterId);
        await removeCharacter(characterId);
        toast.success(`${character?.name ?? 'Character'} has left the house.`);
        if (selectedCharacterId === characterId) {
          setSelectedCharacterId(null);
          setActiveSessionId(null);
          setMessages([]);
        }
      } catch (error) {
        logger.error('Failed to delete character:', error);
        toast.error('Failed to delete character');
      }
    },
    [characters, removeCharacter, selectedCharacterId],
  );

  const handleViewProfile = useCallback((character: Character) => {
    setSelectedCharacterId(character.id);
    setProfileCharacterId(character.id);
    setIsProfileOpen(true);
  }, []);

  useEffect(() => {
    if (!profileCharacter && isProfileOpen) {
      setIsProfileOpen(false);
    }
  }, [profileCharacter, isProfileOpen]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-sm text-white/60">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-[#ff1372]" />
          Syncing the house…
        </div>
      </div>
    );
  }

  const handleSaveCharacterProfile = useCallback(
    (characterId: string, updates: Partial<Character>) => updateCharacter(characterId, updates),
    [updateCharacter],
  );

  return (
    <div className="mx-auto grid h-full min-h-0 w-full max-w-[1600px] grid-cols-[minmax(260px,340px)_minmax(0,1fr)] gap-6 overflow-hidden px-6 lg:px-12">
      <CharacterRoster
        characters={characters}
        selectedId={selectedCharacterId}
        onSelect={(characterId: string) => setSelectedCharacterId(characterId)}
        onStartChat={handleStartChat}
        onDeleteCharacter={handleDeleteCharacter}
        onCreateCharacter={handleCreateCharacter}
        sessions={sessions}
        onViewProfile={handleViewProfile}
      />
      <ChatPanel
        character={selectedCharacter}
        messages={messages}
        onSend={handleSendMessage}
        onStartChat={() => (selectedCharacter ? handleStartChat(selectedCharacter.id) : Promise.resolve())}
        isLoadingMessages={isLoadingMessages}
        sessions={sessions}
        onSwitchSession={handleSwitchSession}
        activeSessionId={activeSessionId}
      />
      {profileCharacter && (
        <CharacterCard
          character={profileCharacter}
          onStartChat={(characterId: string) => {
            void handleStartChat(characterId);
            setIsProfileOpen(false);
            setProfileCharacterId(characterId);
          }}
          compact
          hideTrigger
          open={isProfileOpen}
          onSaveCharacter={handleSaveCharacterProfile}
          onOpenChange={(open) => {
            setIsProfileOpen(open);
            if (!open) {
              setProfileCharacterId(null);
            }
          }}
        />
      )}
    </div>
  );
}
