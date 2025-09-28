import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { useChat } from '@/hooks/useChat';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { useAutoCharacterCreator } from '@/hooks/useAutoCharacterCreator';
import { logger } from '@/lib/logger';
import type { Character, ChatMessage, ChatSession } from '@/types';
import {
    ArrowRight,
    ChatCircle,
    ChatsCircle,
    Star,
    Users,
    Trash,
    Plus,
    User,
    UserCircle,
} from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CharacterCard } from './CharacterCard';
import { GirlManagerSidebar } from './GirlManagerSidebar';
import { HouseSettings } from './HouseSettings';
import { toast } from 'sonner';

const EMPTY_STATE_TIPS = [
  'Use the Girl Manager to auto-create your first companion.',
  'Bring in your own character JSON to instantly populate the roster.',
  'Ask the copilot for scene ideas and she will build the setup for you.',
];

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
  
  // Filter characters by gender
  const filteredCharacters = characters.filter(character => {
    if (genderFilter === 'all') return true;
    // Check character gender from description/personality or assume female as default for existing characters
    const characterData = (character.personality || '').toLowerCase() + (character.description || '').toLowerCase();
    if (genderFilter === 'male') {
      return characterData.includes('male') || characterData.includes('man') || characterData.includes('boy') || characterData.includes('guy');
    } else {
      // Default to female if no specific male indicators
      return !characterData.includes('male') && !characterData.includes('man') && !characterData.includes('boy') && !characterData.includes('guy');
    }
  });

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#0f0f15] text-white border-r border-white/5">
      <div className="px-4 py-4 border-b border-white/5 flex-shrink-0 xl:px-5 xl:py-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white tracking-wide uppercase">Characters</h2>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={genderFilter === 'female' ? 'default' : 'outline'}
              onClick={() => setGenderFilter('female')}
              className="text-xs px-2 py-1 h-7"
            >
              <UserCircle size={12} className="mr-1" />
              Girls
            </Button>
            <Button
              size="sm"
              variant={genderFilter === 'male' ? 'default' : 'outline'}
              onClick={() => setGenderFilter('male')}
              className="text-xs px-2 py-1 h-7"
            >
              <User size={12} className="mr-1" />
              Men
            </Button>
          </div>
        </div>
        <p className="text-xs text-white/60">
          Your active roster. Choose who to deepen tonight.
        </p>
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs border-white/10 hover:bg-white/5"
            onClick={() => void onCreateCharacter(genderFilter === 'male' ? 'male' : 'female')}
          >
            <Plus size={12} className="mr-1" />
            Create New {genderFilter === 'male' ? 'Male' : 'Girl'}
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-3 p-3 xl:p-4">
          {filteredCharacters.map((character) => {
            const activeSessions = sessions.filter((session) =>
              session.participantIds.includes(character.id),
            );

            return (
              <div key={character.id} className="relative group">
                <button
                  onClick={() => {
                    onSelect(character.id);
                    onViewProfile?.(character);
                  }}
                  className={`w-full rounded-2xl border transition-all text-left ${
                    selectedId === character.id
                      ? 'border-[#ff1372] bg-[#ff1372]/10 shadow-[0_12px_45px_-20px_rgba(255,19,114,0.8)]'
                      : 'border-white/5 hover:border-[#ff1372]/40 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3 px-3 py-3 xl:px-4">
                    <Avatar className="h-12 w-12 border border-white/10">
                      <AvatarImage src={character.avatar} alt={character.name} />
                      <AvatarFallback>
                        {character.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-white">
                          {character.name}
                        </h3>
                        <Badge variant="outline" className="border-white/10 text-[10px]">
                          {character.rarity}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-white/60 line-clamp-2">
                        {character.personality}
                      </p>
                    </div>
                  </div>
                  <div className="px-3 pb-4 xl:px-4">
                    <div className="flex items-center gap-2 text-[11px] text-white/70">
                      <Star size={12} weight="fill" className="text-[#f4d03f]" />
                      <span>Affection {character.progression?.affection ?? 0}%</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-white/60">
                      <Users size={12} className="text-white/60" />
                      <span>
                        {activeSessions.length === 0
                          ? 'No chats yet'
                          : `${activeSessions.length} ongoing chat${
                              activeSessions.length > 1 ? 's' : ''
                            }`}
                      </span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="rounded-lg bg-[#ff1372] text-white hover:bg-[#ff1372]/90 flex-1"
                        onClick={(event) => {
                          event.stopPropagation();
                          void onStartChat(character.id);
                        }}
                      >
                        Continue chat
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="rounded-lg border-white/10 text-white/70"
                        onClick={(event) => {
                          event.stopPropagation();
                          void onStartChat(character.id);
                        }}
                      >
                        <ArrowRight size={16} />
                      </Button>
                    </div>
                  </div>
                </button>
                
                {/* Delete Button - Only visible on hover */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 bg-red-500/20 hover:bg-red-500/40 border border-red-500/30"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Trash size={12} />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Character</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {character.name}? This action cannot be undone.
                        All chat history with this character will also be removed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => void onDeleteCharacter(character.id)}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            );
          })}
          {filteredCharacters.length === 0 && (
            <div className="space-y-3">
              {EMPTY_STATE_TIPS.map((tip) => (
                <div
                  key={tip}
                  className="rounded-xl border border-dashed border-white/10 bg-white/5 p-4 text-xs text-white/60"
                >
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

  useEffect(() => {
    setDraft('');
  }, [character?.id, activeSessionId]);

  const canChat = Boolean(activeSessionId && character);
  const characterSessions = useMemo(() => {
    if (!character) return [] as ChatSession[];
    return sessions
      .filter(
        (session) =>
          session.type !== 'assistant' &&
          session.participantIds.includes(character.id),
      )
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }, [character, sessions]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#14141f] text-white">
      <header className="flex items-center justify-between border-b border-white/5 px-4 py-4 flex-shrink-0 xl:px-8 xl:py-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/40">
            Tonight's connection
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white">
            {character ? character.name : 'Pick a girl to begin'}
          </h1>
          {character && (
            <p className="mt-1 text-sm text-white/60">
              {character.description || 'No background set yet.'}
            </p>
          )}
        </div>
        {character && (
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14 border border-white/10">
              <AvatarImage src={character.avatar} alt={character.name} />
              <AvatarFallback>
                {character.name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-right text-xs text-white/60">
              <div>Love {character.stats?.love ?? 0}%</div>
              <div>Trust {character.progression?.trust ?? 0}%</div>
            </div>
          </div>
        )}
      </header>

      <div className="grid h-full min-h-0 grid-rows-[auto_1fr_auto]">
  <div className="border-b border-white/5 px-4 py-2 flex-shrink-0 xl:px-8 xl:py-3">
          {characterSessions.length > 0 ? (
            <div className="flex items-center gap-3 overflow-x-auto pb-2 text-xs text-white/70">
              <ChatsCircle size={16} className="text-[#ff1372]" />
              <span className="text-white/50">Sessions</span>
              {characterSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => void onSwitchSession(session.id)}
                  className={`rounded-full border px-3 py-1 transition-colors ${
                    activeSessionId === session.id
                      ? 'border-[#ff1372] bg-[#ff1372]/15 text-white'
                      : 'border-white/10 text-white/60 hover:border-[#ff1372]/40 hover:text-white'
                  }`}
                >
                  {session.type === 'group' ? 'Group date' : 'Private chat'}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 text-xs text-white/50">
              <ChatCircle size={16} />
              <span>No chats yet. Start something special.</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full px-4 py-4 xl:px-8 xl:py-6">
            <div className="space-y-4">
            {!canChat && !isLoadingMessages && (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-white/70">
                <p>
                  Warm up the connection by starting a conversation.
                  She's waiting for your move.
                </p>
                <Button
                  className="mt-4 bg-[#ff1372] text-white hover:bg-[#ff1372]/90"
                  onClick={() => void onStartChat()}
                  disabled={!character}
                >
                  Begin chat
                </Button>
              </div>
            )}
            {isLoadingMessages && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center text-sm text-white/50">
                Pulling memories from the archive—hang tight.
              </div>
            )}
            {messages.map((message) => {
              const isUser = !message.characterId;
              return (
                <div
                  key={message.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow transition-colors ${
                      isUser
                        ? 'border-[#ff1372] bg-[#ff1372]/20 text-white'
                        : 'border-white/10 bg-white/5 text-white/80'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              );
            })}
          </div>
          </ScrollArea>
        </div>

  <div className="border-t border-white/5 px-4 py-4 flex-shrink-0 xl:px-8 xl:py-6">
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
              placeholder={
                canChat
                  ? 'Say something unforgettable...' 
                  : 'Select a girl and start a chat first'
              }
              className="rounded-xl border-white/10 bg-white/5 text-sm text-white placeholder:text-white/40"
            />
            <Button
              type="submit"
              disabled={!canChat || !draft.trim()}
              className="rounded-xl bg-[#ff1372] text-white hover:bg-[#ff1372]/90"
            >
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function DatingSimShell({
  onFocusCharacter,
}: {
  onFocusCharacter?: (characterId: string) => void;
}) {
  const {
    characters,
    isLoading: isLoadingHouse,
    removeCharacter,
  } = useHouseFileStorage();
  const { createRandomCharacter, isCreating } = useAutoCharacterCreator();
  const {
    sessions,
    getSessionMessages,
    sendMessage,
    ensureIndividualSession,
    switchToSession,
    setActiveSessionId: setChatActiveId,
  } = useChat();

  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [profileCharacterId, setProfileCharacterId] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (characters.length > 0 && !selectedCharacterId) {
      setSelectedCharacterId(characters[0].id);
    }
  }, [characters, selectedCharacterId]);

  const selectedCharacter = useMemo(
    () => characters.find((character) => character.id === selectedCharacterId) ?? null,
    [characters, selectedCharacterId],
  );

  const profileCharacter = useMemo(
    () => characters.find((character) => character.id === profileCharacterId) ?? null,
    [characters, profileCharacterId],
  );

  const handleViewProfile = useCallback(
    (character: Character) => {
      setSelectedCharacterId(character.id);
      setProfileCharacterId(character.id);
      setIsProfileOpen(true);
    },
    [],
  );

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
      if (onFocusCharacter) onFocusCharacter(characterId);
      await loadMessages(sessionId);
    },
    [ensureIndividualSession, setChatActiveId, loadMessages, onFocusCharacter],
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
    async (gender: 'female' | 'male') => {
      try {
        // For now, we'll use the random character creator
        // In the future, this could open a character creation dialog
        const character = await createRandomCharacter();
        if (character) {
          toast.success(`${character.name} has been created!`);
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
        const character = characters.find(c => c.id === characterId);
        await removeCharacter(characterId);
        toast.success(`${character?.name || 'Character'} has been deleted`);
        
        // If this was the selected character, clear selection
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

  const handleSidebarSessionActivated = useCallback(
    async (sessionId: string, characterId?: string) => {
      setActiveSessionId(sessionId);
      setChatActiveId(sessionId);
      if (characterId) setSelectedCharacterId(characterId);
      await loadMessages(sessionId);
    },
    [loadMessages, setChatActiveId],
  );

  useEffect(() => {
    if (!profileCharacter && isProfileOpen) {
      setIsProfileOpen(false);
    }
  }, [profileCharacter, isProfileOpen]);

  if (isLoadingHouse) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0f0f15] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-[#ff1372]" />
          <p className="text-sm text-white/60">
            Preparing your house—please wait…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-screen w-full grid-cols-[260px_1fr_280px] overflow-x-hidden bg-[#090912] text-white min-w-[900px] xl:grid-cols-[300px_1fr_320px] 2xl:grid-cols-[320px_1fr_340px]">
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
        onStartChat={() =>
          selectedCharacter ? handleStartChat(selectedCharacter.id) : Promise.resolve()
        }
        isLoadingMessages={isLoadingMessages}
        sessions={sessions}
        onSwitchSession={handleSwitchSession}
        activeSessionId={activeSessionId}
      />
  <div className="border-l border-white/5 bg-[#0f0f15]">
        <GirlManagerSidebar
          onFocusCharacter={(characterId: string) => setSelectedCharacterId(characterId)}
          onSessionActivated={handleSidebarSessionActivated}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      </div>
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
          onOpenChange={(open) => {
            setIsProfileOpen(open);
            if (!open) {
              setProfileCharacterId(null);
            }
          }}
        />
      )}
      <HouseSettings open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </div>
  );
}
