import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChat } from '@/hooks/useChat';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { useQuickActions } from '@/hooks/useQuickActions';
import { logger } from '@/lib/logger';
import type { Character, ChatMessage, ChatSession } from '@/types';
import {
    Barbell,
    Camera,
    CaretRight,
    ChatCircleDots,
    ChatsCircle,
    DoorOpen,
    Gear,
    Heart,
    ImageSquare,
    LockSimple,
    MagnifyingGlass,
    PaperPlaneTilt,
    Paperclip,
    Plus,
    Robot,
    Smiley,
    Sparkle,
    User,
    UserCircle,
} from '@phosphor-icons/react';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CharacterAutoCreateInline } from './CharacterAutoCreateDialog';
import { CharacterCard } from './CharacterCard';
import { GirlManagerSidebar } from './GirlManagerSidebar';
import { HouseSettings } from './HouseSettings';

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
  onRequestCreate: (gender: 'female' | 'male') => void;
  sessions: ChatSession[];
  onViewProfile?: (character: Character) => void;
}

function CharacterRoster({
  characters,
  selectedId,
  onSelect,
  onStartChat,
  onRequestCreate,
  sessions,
  onViewProfile,
}: CharacterRosterProps) {
  const [activeTab, setActiveTab] = useState<'girls' | 'men'>('girls');
  const [searchTerm, setSearchTerm] = useState('');

  const detectIsMale = useCallback((character: Character) => {
    if (character.gender) return character.gender === 'male';
    const haystack = `${character.personality ?? ''} ${character.description ?? ''} ${character.role ?? ''}`.toLowerCase();
    return /\b(male|man|boy|guy|him|he)\b/.test(haystack);
  }, []);

  const normalizedQuery = searchTerm.trim().toLowerCase();

  const roster = useMemo(() => {
    return characters
      .filter((character) => {
        const isMale = detectIsMale(character);
        if (activeTab === 'men') return isMale;
        return !isMale;
      })
      .filter((character) => {
        if (!normalizedQuery) return true;
        const haystack = [
          character.name,
          character.personality,
          character.description,
          character.role,
          ...(character.personalities ?? []),
          ...(character.features ?? []),
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .sort((a, b) => {
        const affectionA = a.progression?.affection ?? a.stats?.love ?? 0;
        const affectionB = b.progression?.affection ?? b.stats?.love ?? 0;
        return affectionB - affectionA;
      });
  }, [characters, activeTab, normalizedQuery, detectIsMale]);

  const onlineCount = useMemo(
    () =>
      characters.filter((character) => {
        const happiness = character.stats?.happiness ?? 0;
        const hasSession = sessions.some((session) => session.participantIds.includes(character.id));
        return happiness >= 65 || hasSession;
      }).length,
    [characters, sessions],
  );

  const toTitleCase = useCallback((value: string) => {
    return value
      .replace(/[_-]/g, ' ')
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }, []);

  const handleCreateCharacterClick = useCallback(() => {
    onRequestCreate(activeTab === 'men' ? 'male' : 'female');
  }, [activeTab, onRequestCreate]);

  const handleCardActivate = useCallback(
    (character: Character) => {
      onSelect(character.id);
      onViewProfile?.(character);
    },
    [onSelect, onViewProfile],
  );

  const resetFilters = useCallback(() => {
    setActiveTab('girls');
    setSearchTerm('');
  }, []);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-r border-white/5 bg-gradient-to-b from-[#141121] via-[#0d0b14] to-[#05040b] text-white">
      <div className="flex-shrink-0 px-4 pb-4 pt-5 xl:px-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-white/40">Roster</p>
            <h2 className="mt-1 text-xl font-semibold text-white">My Girls</h2>
            <p className="mt-1 text-xs text-white/55">Curate tonight’s lineup and jump back into any scene.</p>
          </div>
          <button
            type="button"
            onClick={handleCreateCharacterClick}
            className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#ff4fa3] via-[#ff1372] to-[#7c3aed] text-white shadow-[0_18px_45px_-18px_rgba(255,79,163,0.85)] transition hover:shadow-[0_22px_55px_-18px_rgba(255,79,163,1)] focus-visible:ring-2 focus-visible:ring-[#ff4fa3] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05040b]"
            aria-label="Create new character"
          >
            <span className="pointer-events-none absolute inset-[-8px] rounded-full bg-[#ff1372]/30 blur-lg" aria-hidden />
            <Plus weight="bold" size={16} className="relative" />
          </button>
        </div>

        <div className="mt-4">
          <label className="sr-only" htmlFor="roster-search">
            Search roster
          </label>
          <div className="relative">
            <MagnifyingGlass size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <Input
              id="roster-search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search girls..."
              className="h-10 rounded-full border border-white/10 bg-black/30 pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus-visible:ring-[#ff4fa3]"
            />
          </div>
        </div>

        <div className="mt-4 inline-flex rounded-full bg-white/5 p-1">
          {([
            { label: 'Girls', value: 'girls' as const, icon: <UserCircle size={14} className="mr-2" /> },
            { label: 'Men', value: 'men' as const, icon: <User size={14} className="mr-2" /> },
          ]).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setActiveTab(option.value)}
              className={`flex items-center rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                activeTab === option.value
                  ? 'bg-[#ff1372] text-white shadow-[0_16px_35px_-22px_rgba(255,19,114,0.9)]'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {option.icon}
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-3 px-4 pb-6">
          {roster.map((character) => {
            const isSelected = selectedId === character.id;
            const affection = Math.round(character.progression?.affection ?? character.stats?.love ?? 0);
            const ageLabel = character.age ? `${character.age} years old` : 'Age unknown';
            const activeSessions = sessions.filter((session) => session.participantIds.includes(character.id));
            const hasActiveChat = activeSessions.length > 0;
            const isOnline = hasActiveChat || (character.stats?.happiness ?? 0) >= 65;

            const baseChips: Array<{ label: string; className: string }> = [];
            const statusLabel = hasActiveChat ? 'In Use' : isOnline ? 'Available' : 'Offline';
            const statusClass = hasActiveChat
              ? 'bg-amber-500/15 text-amber-200 border-amber-400/40'
              : isOnline
                ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/40'
                : 'bg-slate-500/10 text-slate-300 border-slate-500/30';
            baseChips.push({ label: statusLabel, className: statusClass });

            const personalityChips = [
              character.personalities?.[0],
              character.personalities?.[1],
              character.role,
              character.rarity,
            ].filter(Boolean) as string[];

            const palette = [
              'bg-pink-500/15 text-pink-200 border-pink-400/40',
              'bg-violet-500/15 text-violet-200 border-violet-400/40',
              'bg-sky-500/15 text-sky-200 border-sky-400/40',
            ];

            personalityChips
              .map((label) => toTitleCase(label))
              .filter((label, index, array) => label && array.indexOf(label) === index)
              .slice(0, 2)
              .forEach((label, index) => {
                baseChips.push({ label, className: palette[index % palette.length] });
              });

            return (
              <button
                key={character.id}
                type="button"
                onClick={() => handleCardActivate(character)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleCardActivate(character);
                  }
                }}
                className={`group relative w-full rounded-2xl border bg-white/[0.04] p-3 text-left transition hover:border-[#ff4fa3]/45 hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4fa3] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05040b] ${
                  isSelected
                    ? 'border-[#ff4fa3]/70 bg-gradient-to-b from-[#251129]/85 via-[#160a1c]/80 to-[#090910]/90 shadow-[0_25px_65px_-35px_rgba(255,79,163,0.75)]'
                    : 'border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-11 w-11 rounded-lg border border-white/15">
                      <AvatarImage src={character.avatar} alt={character.name} />
                      <AvatarFallback>
                        {character.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border border-black/70 ${
                        isOnline ? 'bg-emerald-400' : 'bg-slate-600'
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{character.name}</p>
                        <p className="mt-0.5 text-[11px] text-white/60">{ageLabel} • {affection}%</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#ff4fa3]/40 bg-[#ff1372]/25 text-[#ffd3ea] shadow-[0_16px_35px_-20px_rgba(255,19,114,0.9)] transition hover:bg-[#ff1372]/40"
                          onClick={(event) => {
                            event.stopPropagation();
                            void onStartChat(character.id);
                          }}
                          aria-label={`Continue chat with ${character.name}`}
                        >
                          <ChatCircleDots size={16} weight="fill" />
                        </button>
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/70 transition hover:text-white"
                          onClick={(event) => {
                            event.stopPropagation();
                            onViewProfile?.(character);
                          }}
                          aria-label={`Open ${character.name}'s profile`}
                        >
                          <LockSimple size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {baseChips.map((chip) => (
                        <span
                          key={chip.label}
                          className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/85 ${chip.className}`}
                        >
                          {chip.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}

          {roster.length === 0 && (
            <div className="space-y-3">
              {EMPTY_STATE_TIPS.map((tip) => (
                <div
                  key={tip}
                  className="rounded-xl border border-dashed border-white/15 bg-white/5 p-4 text-xs text-white/60"
                >
                  {tip}
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-[11px] text-white/60">
        <span>
          {onlineCount} online • {characters.length} total
        </span>
        <button
          type="button"
          onClick={resetFilters}
          className="text-xs font-semibold text-[#ff84c0] transition hover:text-white"
        >
          View all
        </button>
      </div>
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
  onQuickAction: (actionId: string, context?: { characterId?: string }) => Promise<void>;
  onOpenManager: () => void;
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
  onQuickAction,
  onOpenManager,
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
      .filter(
        (session) =>
          session.type !== 'assistant' &&
          session.participantIds.includes(character.id),
      )
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }, [character, sessions]);
  const affection = character
    ? Math.round(character.progression?.affection ?? character.stats?.love ?? 0)
    : null;
  const happiness = character?.stats?.happiness ?? 0;
  const hasActiveSession = character
    ? characterSessions.some((session) => session.id === activeSessionId)
    : false;
  const isOnline = Boolean(character) && (happiness >= 65 || hasActiveSession);
  const locationLabel = character?.preferredRoomType
    ? character.preferredRoomType
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
    : 'Private Room';

  const quickActionButtons: Array<{ id: string; label: string; danger?: boolean }> = [
    { id: 'compliment', label: 'Compliment' },
    { id: 'gift', label: 'Gift' },
    { id: 'flirt', label: 'Flirt' },
    { id: 'ask-question', label: 'Ask Question' },
    { id: 'punish', label: 'Punish', danger: true },
  ];

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const value = draft.trim();
      if (!value || !canChat) return;
      void onSend(value).then(() => setDraft(''));
    },
    [draft, canChat, onSend],
  );

  const handleQuickActionClick = useCallback(
    (actionId: string) => {
      void onQuickAction(actionId, { characterId: character?.id ?? undefined });
    },
    [character?.id, onQuickAction],
  );

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      }),
    [],
  );

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-gradient-to-b from-[#121226] via-[#0b0b17] to-[#05040b] text-white">
      <header className="flex flex-shrink-0 items-center justify-between border-b border-white/5 px-5 py-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-12 w-12 rounded-full border-2 border-pink-400/60">
              <AvatarImage src={character?.avatar} alt={character?.name} />
              <AvatarFallback>
                {character?.name?.slice(0, 2).toUpperCase() ?? '??'}
              </AvatarFallback>
            </Avatar>
            <span
              className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border border-black/70 ${
                isOnline ? 'bg-emerald-400' : 'bg-slate-500'
              }`}
            />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.32em] text-white/40">Tonight's Connection</p>
            <h1 className="mt-1 truncate text-xl font-semibold">
              {character ? character.name : 'Pick a girl to begin'}
            </h1>
            {character && (
              <p className="mt-1 text-sm text-white/60">
                {isOnline ? 'Online' : 'Offline'} • {locationLabel}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenManager}
          className="inline-flex items-center gap-2 rounded-full border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white hover:border-[#ff54a6]/60 hover:bg-[#ff54a6]/20"
        >
          <Plus size={14} weight="bold" />
          Invite
        </Button>
      </header>
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <div className="absolute inset-0 flex flex-col overflow-hidden">
          {characterSessions.length > 0 && (
            <div className="flex-shrink-0 border-b border-white/5 px-5 py-2">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px] text-white/70">
                <ChatsCircle size={14} className="text-[#ff1372]" />
                <span className="text-white/50">Sessions</span>
                {characterSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => void onSwitchSession(session.id)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      activeSessionId === session.id
                        ? 'border-[#ff1372] bg-[#ff1372]/15 text-white'
                        : 'border-white/10 text-white/60 hover:border-[#ff1372]/40 hover:text-white'
                    }`}
                  >
                    {session.type === 'group' ? 'Group date' : 'Private chat'}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 pb-40">
            <div className="space-y-6">
              {character && (
                <div className="flex flex-col items-center gap-4 text-xs uppercase tracking-[0.3em] text-white/40">
                  <span>Today</span>
                  {affection !== null && (
                    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-[11px] font-medium lowercase tracking-normal text-white/75">
                      <Sparkle size={12} className="text-pink-400" />
                      <span>{`${character.name}'s affection is at ${affection}%`}</span>
                    </div>
                  )}
                </div>
              )}
              {!canChat && !isLoadingMessages && (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-white/70">
                  <p>Warm up the connection by starting a conversation. She's waiting for your move.</p>
                  <Button
                    className="mt-4 rounded-full bg-[#ff1372] px-6 text-xs font-semibold uppercase tracking-[0.28em] text-white hover:bg-[#ff1372]/90"
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
                const timestamp =
                  message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp);
                const formattedTime = timeFormatter.format(timestamp);
                if (message.type === 'system') {
                  return (
                    <div
                      key={message.id}
                      className="flex justify-center text-[11px] uppercase tracking-[0.28em] text-white/40"
                    >
                      {message.content}
                    </div>
                  );
                }
                const isUser = !message.characterId;
                const imageUrl =
                  (typeof message.metadata?.imageUrl === 'string' && message.metadata.imageUrl) ||
                  (message.type === 'image' ? message.content : undefined);
                const textContent =
                  imageUrl && message.content === imageUrl ? '' : (message.content ?? '');
                return (
                  <div key={message.id} className="space-y-2">
                    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse text-right' : ''}`}>
                      <Avatar className="h-9 w-9 border border-white/10">
                        <AvatarImage src={isUser ? undefined : character?.avatar} alt={character?.name} />
                        <AvatarFallback>{isUser ? 'You' : character?.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div
                        className={`max-w-[70%] rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow transition ${
                          isUser
                            ? 'border-[#ff54a6]/60 bg-[#ff54a6]/25 text-white'
                            : 'border-white/10 bg-white/5 text-white/85'
                        }`}
                      >
                        {textContent && <p className="whitespace-pre-wrap">{textContent}</p>}
                        {imageUrl && (
                          <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
                            <img
                              src={imageUrl}
                              alt={`${character?.name ?? 'Character'} attachment`}
                              className="h-auto w-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={`text-xs text-white/40 ${isUser ? 'text-right' : 'text-left'}`}>{formattedTime}</div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 px-5 pb-4">
          <div className="pointer-events-auto rounded-2xl border border-white/10 bg-[#10101b]/95 p-4 shadow-[0_22px_65px_-35px_rgba(255,19,114,0.65)] backdrop-blur-xl">
            <form className="flex items-center gap-3" onSubmit={handleSubmit}>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:text-white"
                onClick={() => onOpenManager()}
              >
                <Plus size={16} weight="bold" />
              </button>
              <button
                type="button"
                className="hidden h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:text-white sm:flex"
              >
                <Paperclip size={16} />
              </button>
              <button
                type="button"
                className="hidden h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:text-white sm:flex"
              >
                <ImageSquare size={16} />
              </button>
              <button
                type="button"
                className="hidden h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:text-white sm:flex"
              >
                <Smiley size={18} />
              </button>
              <Input
                value={draft}
                disabled={!canChat}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={
                  canChat ? 'Type your message...' : 'Select a girl and start a chat first'
                }
                className="h-10 flex-1 rounded-full border-white/10 bg-white/[0.07] text-sm text-white placeholder:text-white/40"
              />
              <Button
                type="submit"
                disabled={!canChat || !draft.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ff1372] text-white hover:bg-[#ff1372]/90"
              >
                <PaperPlaneTilt size={16} weight="fill" />
              </Button>
            </form>
            <div className="mt-4 flex flex-wrap gap-2">
              {quickActionButtons.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => handleQuickActionClick(action.id)}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
                    action.danger
                      ? 'border-red-500/40 bg-red-500/10 text-red-300 hover:border-red-400/70 hover:bg-red-500/20'
                      : 'border-[#ff54a6]/30 bg-[#ff1372]/10 text-[#ffb6dd] hover:border-[#ff54a6]/60 hover:bg-[#ff1372]/20'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type WingmanShortcut = 'gift' | 'train' | 'photo-shoot' | 'visit';

interface WingmanPanelProps {
  selectedCharacter: Character | null;
  onShortcut: (shortcut: WingmanShortcut) => void;
  onOpenSettings: () => void;
  onOpenManager: () => void;
}

function WingmanPanel({ selectedCharacter, onShortcut, onOpenSettings, onOpenManager }: WingmanPanelProps) {
  const affection = selectedCharacter?.progression?.affection ?? selectedCharacter?.stats?.love ?? 0;
  const happiness = selectedCharacter?.stats?.happiness ?? 0;
  const trust = selectedCharacter?.progression?.trust ?? 0;
  const statusLine = selectedCharacter
    ? `Watching ${selectedCharacter.name}${selectedCharacter.preferredRoomType ? ` • ${selectedCharacter.preferredRoomType}` : ''}`
    : 'House idle • no active scene';

  const shortcuts = [
    { id: 'gift', label: 'Send Gift', icon: Heart },
    { id: 'train', label: 'Train', icon: Barbell },
    { id: 'photo-shoot', label: 'Photo Shoot', icon: Camera },
    { id: 'visit', label: 'Visit', icon: DoorOpen },
  ] as const;

  const tips = useMemo(() => {
    if (!selectedCharacter) {
      return [
        {
          id: 'no-selection',
          title: 'Pick tonight’s focus',
          detail: 'Highlight a girl from the roster to get live intel and mood reads here.',
        },
        {
          id: 'warm-up',
          title: 'Prime the room first',
          detail: 'Use quick actions to send a gift or flirt before you dive into the main chat.',
        },
      ];
    }

    const narrative: { id: string; title: string; detail: string }[] = [];

    if (affection < 60) {
      narrative.push({
        id: 'affection-low',
        title: `${selectedCharacter.name} perks up with appearance praise`,
        detail: 'Compliments and gifts land harder than usual—stack a few before escalating.',
      });
    } else {
      narrative.push({
        id: 'affection-high',
        title: `${selectedCharacter.name} is feeling close tonight`,
        detail: 'Lean into more intimate prompts; she’ll mirror your energy quickly.',
      });
    }

    if (happiness < 55) {
      narrative.push({
        id: 'happiness',
        title: 'She needs a pick-me-up',
        detail: 'A small gift or gentle visit will lift her vibe before you push anything heavier.',
      });
    }

    if (trust < 50) {
      narrative.push({
        id: 'trust',
        title: 'Ask questions before commands',
        detail: 'Curious check-ins build the trust she’s missing—keep the tone warm and patient.',
      });
    }

    return narrative;
  }, [affection, happiness, trust, selectedCharacter]);

  return (
    <div className="flex min-w-0 flex-col overflow-hidden border-l border-white/5 bg-[#0d0e17] text-white">
      <header className="flex items-center justify-between border-b border-white/5 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#ff5ab9] to-[#7748ff]">
            <Robot size={20} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Wingman</p>
            <p className="text-xs text-emerald-300/80">{statusLine}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:text-white"
            aria-label="Open settings"
          >
            <Gear size={18} weight="bold" />
          </button>
          <button
            type="button"
            onClick={onOpenManager}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:text-white"
            aria-label="Open full manager"
          >
            <CaretRight size={18} weight="bold" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-white">Girl Tips</h3>
          {tips.map((tip) => (
            <div
              key={tip.id}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <Sparkle size={18} className="mt-1 shrink-0 text-pink-300" />
              <div>
                <p className="text-sm font-semibold text-white">{tip.title}</p>
                <p className="mt-1 text-sm text-white/65">{tip.detail}</p>
              </div>
            </div>
          ))}
          {tips.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-white/60">
              I’ll surface fresh plays here as soon as we learn more about her tonight.
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-white/5 px-5 py-5">
        <div className="grid grid-cols-2 gap-3">
          {shortcuts.map((shortcut) => (
            <button
              key={shortcut.id}
              type="button"
              onClick={() => onShortcut(shortcut.id as WingmanShortcut)}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white/80 transition hover:border-[#ff54a6]/40 hover:bg-[#ff1372]/15 hover:text-white"
            >
              <div>
                <span className="text-[10px] uppercase tracking-[0.26em] text-white/35">Shortcut</span>
                <p className="mt-1 text-sm font-semibold text-white">{shortcut.label}</p>
              </div>
              <shortcut.icon size={20} className="text-pink-300" />
            </button>
          ))}
        </div>

        <form
          className="mt-4 flex items-center"
          onSubmit={(event) => {
            event.preventDefault();
            onOpenManager();
          }}
        >
          <div className="relative w-full">
            <Input
              readOnly
              onFocus={onOpenManager}
              placeholder="Ask your wingman..."
              className="h-10 w-full cursor-pointer rounded-full border-white/10 bg-white/[0.06] text-sm text-white placeholder:text-white/40"
            />
            <button
              type="submit"
              className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#ff1372] text-white hover:bg-[#ff1372]/90"
              aria-label="Submit wingman prompt"
            >
              <PaperPlaneTilt size={14} weight="fill" />
            </button>
          </div>
        </form>
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
    updateCharacter,
  } = useHouseFileStorage();
  const {
    sessions,
    getSessionMessages,
    sendMessage,
    ensureIndividualSession,
    switchToSession,
    setActiveSessionId: setChatActiveId,
  } = useChat();
  const { executeAction } = useQuickActions();

  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [profileCharacterId, setProfileCharacterId] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createDialogGender, setCreateDialogGender] = useState<'female' | 'male'>('female');

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

  const handleSaveCharacterProfile = useCallback(
    (characterId: string, updates: Partial<Character>) => updateCharacter(characterId, updates),
    [updateCharacter],
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

  const handleOpenCreateDialog = useCallback((defaultGender: 'female' | 'male') => {
    setCreateDialogGender(defaultGender);
    setIsCreateDialogOpen(true);
  }, []);

  const handleCharacterCreatedFromDialog = useCallback(
    (character: Character) => {
      setSelectedCharacterId(character.id);
      setIsCreateDialogOpen(false);
    },
    [],
  );

  const handleQuickAction = useCallback(
    (actionId: string, context?: { characterId?: string }) => executeAction(actionId, context),
    [executeAction],
  );

  const handleWingmanShortcut = useCallback(
    async (shortcut: WingmanShortcut) => {
      if (!selectedCharacter) {
        toast.error('Pick a girl to direct the wingman.');
        return;
      }

      if (shortcut === 'visit') {
        await handleStartChat(selectedCharacter.id);
        return;
      }

      await handleQuickAction(shortcut, { characterId: selectedCharacter.id });
    },
    [handleQuickAction, handleStartChat, selectedCharacter],
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
    <div className="relative flex h-screen min-h-0 w-full overflow-hidden bg-[#05050d] text-white">
      <div className="mx-auto flex h-full w-full max-w-[1600px] flex-1 min-h-0 flex-col overflow-hidden px-6 py-4 sm:px-8 lg:px-12">
  <div className="grid flex-1 min-h-0 gap-4 overflow-hidden rounded-3xl border border-white/5 bg-[#090912]/95 shadow-[0_40px_120px_-60px_rgba(255,19,114,0.45)] backdrop-blur-sm grid-cols-[minmax(248px,300px)_minmax(0,1fr)_minmax(260px,340px)] lg:grid-cols-[minmax(264px,320px)_minmax(0,1fr)_minmax(300px,380px)]">
          <CharacterRoster
            characters={characters}
            selectedId={selectedCharacterId}
            onSelect={(characterId: string) => setSelectedCharacterId(characterId)}
            onStartChat={handleStartChat}
            onRequestCreate={handleOpenCreateDialog}
            sessions={sessions}
            onViewProfile={handleViewProfile}
          />
          <div
            data-middle-pane-root
            className="relative flex h-full min-h-0 w-full"
          >
            <div className="flex h-full min-h-0 flex-1 flex-col">
              {isCreateDialogOpen ? (
                <CharacterAutoCreateInline
                  active={isCreateDialogOpen}
                  onClose={() => setIsCreateDialogOpen(false)}
                  onCharacterCreated={handleCharacterCreatedFromDialog}
                  initialGender={createDialogGender}
                />
              ) : (
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
                  onQuickAction={handleQuickAction}
                  onOpenManager={() => setIsManagerOpen(true)}
                />
              )}
            </div>
            <div
              data-middle-pane-overlay
              className="pointer-events-none absolute inset-0 z-[70]"
            />
          </div>
          <WingmanPanel
            selectedCharacter={selectedCharacter}
            onShortcut={handleWingmanShortcut}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenManager={() => setIsManagerOpen(true)}
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
            onSaveCharacter={handleSaveCharacterProfile}
            onDelete={async (characterId: string) => {
              await handleDeleteCharacter(characterId);
              setIsProfileOpen(false);
              setProfileCharacterId(null);
            }}
            onOpenChange={(open) => {
              setIsProfileOpen(open);
              if (!open) {
                setProfileCharacterId(null);
              }
            }}
          />
        )}

        <Dialog open={isManagerOpen} onOpenChange={setIsManagerOpen}>
          <DialogContent className="max-w-5xl w-[92vw] overflow-hidden border border-white/10 bg-[#080811] p-0 text-white">
            <div className="h-[80vh] min-h-[540px]">
              <GirlManagerSidebar
                onFocusCharacter={(characterId: string) => {
                  setSelectedCharacterId(characterId);
                  setIsManagerOpen(false);
                }}
                onSessionActivated={handleSidebarSessionActivated}
                onOpenSettings={() => {
                  setIsSettingsOpen(true);
                  setIsManagerOpen(false);
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
        <HouseSettings open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
      </div>
    </div>
  );
}
