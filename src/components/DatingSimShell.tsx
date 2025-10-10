import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChat } from "@/hooks/useChat";
import { useHouseFileStorage } from "@/hooks/useHouseFileStorage";
import { useQuickActions } from "@/hooks/useQuickActions";
import { repositoryStorage } from "@/hooks/useRepositoryStorage";
import { AIService } from "@/lib/aiService";
import { logger } from "@/lib/logger";
import { WingmanSceneDirector, type SceneSetup } from "@/lib/wingmanSceneDirector";
import type { Character, ChatMessage, ChatSession } from "@/types";
import {
  Barbell,
  Camera,
  CaretRight,
  ChatCircle,
  ChatsCircle,
  CheckCircle,
  DoorOpen,
  Gear,
  Heart,
  ImageSquare,
  LockSimple,
  MagnifyingGlass,
  PaperPlaneTilt,
  Paperclip,
  PencilSimple,
  Play,
  Plus,
  Robot,
  Smiley,
  Sparkle,
  Trash,
  User,
  UserCircle,
} from "@phosphor-icons/react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { CharacterAutoCreateInline } from "./CharacterAutoCreateDialog";
import { CharacterCard } from "./CharacterCard";
import { GirlsView } from "./GirlsView";
import { HouseSettings } from "./HouseSettings";

const EMPTY_STATE_TIPS = [
  "Use the Girl Manager to auto-create your first companion.",
  "Bring in your own character JSON to instantly populate the roster.",
  "Ask the copilot for scene ideas and she will build the setup for you.",
];

interface CharacterRosterProps {
  characters: Character[];
  selectedId: string | null;
  onSelect: (characterId: string) => void;
  onStartChat: (characterId: string) => Promise<void>;
  onRequestCreate: (gender: "female" | "male") => void;
  sessions: ChatSession[];
  onViewProfile?: (character: Character) => void;
  activeSessionId: string | null;
  onToggleCharacterInChat: (characterId: string) => void;
}

function CharacterRoster({
  characters,
  selectedId,
  onSelect,
  onRequestCreate,
  sessions,
  onViewProfile,
  activeSessionId,
  onToggleCharacterInChat,
}: CharacterRosterProps) {
  const [activeTab, setActiveTab] = useState<"girls" | "men">("girls");
  const [searchTerm, setSearchTerm] = useState("");

  const detectIsMale = useCallback((character: Character) => {
    if (character.gender) return character.gender === "male";
    const haystack =
      `${character.personality ?? ""} ${character.description ?? ""} ${character.role ?? ""}`.toLowerCase();
    return /\b(male|man|boy|guy|him|he)\b/.test(haystack);
  }, []);

  const normalizedQuery = searchTerm.trim().toLowerCase();

  const roster = useMemo(() => {
    return characters
      .filter((character) => {
        const isMale = detectIsMale(character);
        if (activeTab === "men") return isMale;
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
          .join(" ")
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
        const hasSession = sessions.some((session) =>
          session.participantIds.includes(character.id)
        );
        return happiness >= 65 || hasSession;
      }).length,
    [characters, sessions]
  );

  const handleCreateCharacterClick = useCallback(() => {
    onRequestCreate(activeTab === "men" ? "male" : "female");
  }, [activeTab, onRequestCreate]);

  const handleCardActivate = useCallback(
    (character: Character) => {
      onSelect(character.id);
      onViewProfile?.(character);
    },
    [onSelect, onViewProfile]
  );

  const resetFilters = useCallback(() => {
    setActiveTab("girls");
    setSearchTerm("");
  }, []);

  return (
    <div className="hidden md:flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-r border-white/5 bg-gradient-to-b from-[#141121] via-[#0d0b14] to-[#05040b] text-white">
      <div className="flex-shrink-0 px-4 pb-4 pt-5 xl:px-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-white/40">
              Roster
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">My Girls</h2>
            <p className="mt-1 text-xs text-white/55">
              Curate tonight’s lineup and jump back into any scene.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCreateCharacterClick}
            className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#ff4fa3] via-[#ff1372] to-[#7c3aed] text-white shadow-[0_18px_45px_-18px_rgba(255,79,163,0.85)] transition hover:shadow-[0_22px_55px_-18px_rgba(255,79,163,1)] focus-visible:ring-2 focus-visible:ring-[#ff4fa3] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05040b]"
            aria-label="Create new character"
          >
            <span
              className="pointer-events-none absolute inset-[-8px] rounded-full bg-[#ff1372]/30 blur-lg"
              aria-hidden
            />
            <Plus weight="bold" size={16} className="relative" />
          </button>
        </div>

        <div className="mt-4">
          <label className="sr-only" htmlFor="roster-search">
            Search roster
          </label>
          <div className="relative">
            <MagnifyingGlass
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
            />
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
          {[
            {
              label: "Girls",
              value: "girls" as const,
              icon: <UserCircle size={14} className="mr-2" />,
            },
            {
              label: "Men",
              value: "men" as const,
              icon: <User size={14} className="mr-2" />,
            },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setActiveTab(option.value)}
              className={`flex items-center rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                activeTab === option.value
                  ? "bg-[#ff1372] text-white shadow-[0_16px_35px_-22px_rgba(255,19,114,0.9)]"
                  : "text-white/60 hover:text-white"
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
            const affection = Math.round(
              character.progression?.affection ?? character.stats?.love ?? 0
            );
            const ageLabel = character.age
              ? `${character.age} years old`
              : "Age unknown";
            
            // Check if character is in the current active session
            const activeSession = sessions.find(s => s.id === activeSessionId);
            const isInActiveChat = activeSession?.participantIds.includes(character.id) ?? false;

            return (
              <button
                key={character.id}
                type="button"
                onClick={() => handleCardActivate(character)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleCardActivate(character);
                  }
                }}
                className={`group relative w-full rounded-2xl border bg-white/[0.04] p-3 text-left transition hover:border-[#ff4fa3]/45 hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4fa3] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05040b] ${
                  isSelected
                    ? "border-[#ff4fa3]/70 bg-gradient-to-b from-[#251129]/85 via-[#160a1c]/80 to-[#090910]/90 shadow-[0_25px_65px_-35px_rgba(255,79,163,0.75)]"
                    : "border-white/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-11 w-11 rounded-lg border border-white/15">
                      <AvatarImage
                        src={character.avatar}
                        alt={character.name}
                      />
                      <AvatarFallback>
                        {character.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          {character.name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-white/60">
                          {ageLabel} • {affection}%
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Checkbox toggle for adding to chat */}
                        <button
                          type="button"
                          className={`flex h-8 w-8 items-center justify-center rounded-full border transition ${
                            isInActiveChat
                              ? "border-emerald-400/60 bg-emerald-500/25 text-emerald-300"
                              : "border-white/20 bg-white/5 text-white/40 hover:border-white/40 hover:text-white/70"
                          }`}
                          onClick={(event) => {
                            event.stopPropagation();
                            onToggleCharacterInChat(character.id);
                          }}
                          aria-label={isInActiveChat ? `Remove ${character.name} from chat` : `Add ${character.name} to chat`}
                          title={isInActiveChat ? "Remove from chat" : "Add to chat"}
                        >
                          <CheckCircle size={18} weight={isInActiveChat ? "fill" : "regular"} />
                        </button>
                      </div>
                    </div>

                    {/* Active badge */}
                    {isInActiveChat && (
                      <div className="mt-2">
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                          Active
                        </span>
                      </div>
                    )}
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
  characters: Character[];
  messages: ChatMessage[];
  onSend: (text: string) => Promise<void>;
  onStartChat: () => Promise<void>;
  isLoadingMessages: boolean;
  sessions: ChatSession[];
  onSwitchSession: (sessionId: string) => Promise<void>;
  activeSessionId: string | null;
  onOpenManager: () => void;
  onClearChat?: () => Promise<void>;
  onAnalyzeConversation?: () => Promise<void>;
}

function ChatPanel({
  character,
  characters,
  messages,
  onSend,
  onStartChat,
  isLoadingMessages,
  sessions,
  onSwitchSession,
  activeSessionId,
  onOpenManager,
  onClearChat,
  onAnalyzeConversation,
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const [scenePromptOpen, setScenePromptOpen] = useState(false);
  const [scenePrompt, setScenePrompt] = useState("");
  const [hiddenPromptsOpen, setHiddenPromptsOpen] = useState(false);
  const [characterHiddenPrompts, setCharacterHiddenPrompts] = useState<Record<string, string>>({});
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraft("");
  }, [character?.id, activeSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages]);

  useEffect(() => {
    type SceneMetaDetail = {
      sessionId: string;
      scenePrompt?: string;
      hiddenPrompts?: Record<string, string>;
    };
  const listener = (event: Event) => {
      const custom = event as CustomEvent<SceneMetaDetail>;
      const detail = custom.detail;
      if (!detail || detail.sessionId !== activeSessionId) return;
      if (typeof detail.scenePrompt === "string") {
        setScenePrompt(detail.scenePrompt);
        if (detail.scenePrompt.trim()) {
          setScenePromptOpen(true);
        }
      }
      if (detail.hiddenPrompts) {
        setCharacterHiddenPrompts(detail.hiddenPrompts);
        if (Object.keys(detail.hiddenPrompts).length > 0) {
          setHiddenPromptsOpen(true);
        }
      }
    };

    try {
      globalThis.addEventListener?.("scene-metadata-updated", listener);
    } catch {
      /* ignore */
    }
    return () => {
      try {
        globalThis.removeEventListener?.("scene-metadata-updated", listener);
      } catch {
        /* ignore */
      }
    };
  }, [activeSessionId]);

  const canChat = Boolean(activeSessionId && character);
  const characterSessions = useMemo(() => {
    if (!character) return [] as ChatSession[];
    return sessions
      .filter(
        (session) =>
          session.type !== "assistant" &&
          session.participantIds.includes(character.id)
      )
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }, [character, sessions]);
  
  // Get all participants in the active session
  const activeSession = useMemo(() => {
    return sessions.find(s => s.id === activeSessionId);
  }, [sessions, activeSessionId]);
  
  const sessionParticipants = useMemo(() => {
    if (!activeSession) return [];
    // Get character objects for all participants
    const allChars = activeSession.participantIds.map(id => 
      characters?.find(c => c.id === id)
    ).filter(Boolean) as Character[];
    return allChars;
  }, [activeSession, characters]);
  
  const affection = character
    ? Math.round(character.progression?.affection ?? character.stats?.love ?? 0)
    : null;

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const value = draft.trim();
      if (!value || !canChat) return;
      void onSend(value).then(() => setDraft(""));
    },
    [draft, canChat, onSend]
  );

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }),
    []
  );

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-gradient-to-b from-[#121226] via-[#0b0b17] to-[#05040b] text-white">
      <header className="flex flex-shrink-0 items-center justify-between border-b border-white/5 px-5 py-4">
        <div className="flex items-center gap-4">
          {/* Show all active participants */}
          {sessionParticipants.length > 0 ? (
            <div className="flex items-center gap-3 overflow-x-auto">
              {sessionParticipants.map((participant) => (
                <div key={participant.id} className="flex items-center gap-2 flex-shrink-0">
                  <Avatar className="h-10 w-10 rounded-full border-2 border-pink-400/60">
                    <AvatarImage src={participant.avatar} alt={participant.name} />
                    <AvatarFallback>
                      {participant.name?.slice(0, 2).toUpperCase() ?? "??"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{participant.name}</p>
                    <p className="text-xs text-white/60">{participant.age} years</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.32em] text-white/40">
                Tonight's Connection
              </p>
              <h1 className="mt-1 truncate text-xl font-semibold">
                {character ? character.name : "Pick a girl to begin"}
              </h1>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canChat && activeSessionId && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onClearChat?.()}
                className="inline-flex items-center gap-2 rounded-full border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-orange-300 hover:border-orange-500/60 hover:bg-orange-500/20"
                title="Clear all messages without saving"
              >
                <Trash size={14} weight="bold" />
                Clear
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAnalyzeConversation?.()}
                className="inline-flex items-center gap-2 rounded-full border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-purple-300 hover:border-purple-500/60 hover:bg-purple-500/20"
                title="Analyze this conversation and update her profile"
              >
                <CheckCircle size={14} weight="bold" />
                Analyze
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenManager}
            className="inline-flex items-center gap-2 rounded-full border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white hover:border-[#ff54a6]/60 hover:bg-[#ff54a6]/20"
          >
            <Plus size={14} weight="bold" />
            Invite
          </Button>
        </div>
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
                        ? "border-[#ff1372] bg-[#ff1372]/15 text-white"
                        : "border-white/10 text-white/60 hover:border-[#ff1372]/40 hover:text-white"
                    }`}
                  >
                    {session.type === "group" ? "Group date" : "Private chat"}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div
            className="flex-1 min-h-0 overflow-y-auto px-6 py-6"
            style={{
              paddingBottom: "calc(200px + env(safe-area-inset-bottom))",
            }}
          >
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
                  <p>
                    Warm up the connection by starting a conversation. She's
                    waiting for your move.
                  </p>
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
                  message.timestamp instanceof Date
                    ? message.timestamp
                    : new Date(message.timestamp);
                const formattedTime = timeFormatter.format(timestamp);
                if (message.type === "system") {
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
                  (typeof message.metadata?.imageUrl === "string" &&
                    message.metadata.imageUrl) ||
                  (message.type === "image" ? message.content : undefined);
                const textContent =
                  imageUrl && message.content === imageUrl
                    ? ""
                    : (message.content ?? "");
                return (
                  <div key={message.id} className="space-y-2">
                    <div
                      className={`flex items-start gap-3 ${isUser ? "flex-row-reverse text-right" : ""}`}
                    >
                      <Avatar className="h-9 w-9 border border-white/10">
                        <AvatarImage
                          src={isUser ? undefined : character?.avatar}
                          alt={character?.name}
                        />
                        <AvatarFallback>
                          {isUser
                            ? "You"
                            : character?.name?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`max-w-[70%] rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow transition ${
                          isUser
                            ? "border-[#ff54a6]/60 bg-[#ff54a6]/25 text-white"
                            : "border-white/10 bg-white/5 text-white/85"
                        }`}
                      >
                        {textContent && (
                          <p className="whitespace-pre-wrap">{textContent}</p>
                        )}
                        {imageUrl && (
                          <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
                            <img
                              src={imageUrl}
                              alt={`${character?.name ?? "Character"} attachment`}
                              className="h-auto w-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div
                      className={`text-xs text-white/40 ${isUser ? "text-right" : "text-left"}`}
                    >
                      {formattedTime}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 px-5"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
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
                  canChat
                    ? "Type your message..."
                    : "Select a girl and start a chat first"
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
              {/* Auto Play Button */}
              <button
                type="button"
                onClick={() => {
                  setIsAutoPlaying(!isAutoPlaying);
                  toast.success(isAutoPlaying ? "Auto-play stopped" : "Auto-play started - characters will interact automatically");
                }}
                className={`flex h-9 items-center gap-2 rounded-full border px-4 transition ${
                  isAutoPlaying
                    ? 'border-[#ff1372] bg-[#ff1372]/20 text-white'
                    : 'border-white/10 bg-white/5 text-white/70 hover:border-[#ff54a6]/40 hover:bg-[#ff1372]/10 hover:text-white'
                }`}
              >
                <Play size={16} weight="fill" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Auto</span>
              </button>

              {/* Scene Prompt Tool */}
              <button
                type="button"
                onClick={() => setScenePromptOpen(!scenePromptOpen)}
                className="flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-white/70 transition hover:border-[#ff54a6]/40 hover:bg-[#ff1372]/10 hover:text-white"
              >
                <PencilSimple size={16} />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Scene</span>
              </button>

              {/* Character Hidden Prompts */}
              <button
                type="button"
                onClick={() => setHiddenPromptsOpen(!hiddenPromptsOpen)}
                className="flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-white/70 transition hover:border-[#ff54a6]/40 hover:bg-[#ff1372]/10 hover:text-white"
              >
                <LockSimple size={16} weight="fill" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Secrets</span>
              </button>
            </div>

            {/* Scene Prompt Editor (collapsible) */}
            {scenePromptOpen && (
              <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/70">
                  Scene Prompt
                </label>
                <textarea
                  value={scenePrompt}
                  onChange={(e) => setScenePrompt(e.target.value)}
                  placeholder="Describe the current scene context... (e.g., 'Late night in a dimly lit bar. Tension in the air.')"
                  className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white placeholder:text-white/30 focus:border-[#ff1372] focus:outline-none"
                  rows={3}
                />
                <p className="mt-2 text-xs text-white/40">
                  This prompt sets the mood and context for the current chat session.
                </p>
              </div>
            )}

            {/* Character Hidden Prompts Editor (collapsible) */}
            {hiddenPromptsOpen && character && (
              <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/70">
                  Secret Instructions for {character.name}
                </label>
                <textarea
                  value={characterHiddenPrompts[character.id] || ''}
                  onChange={(e) => setCharacterHiddenPrompts(prev => ({ ...prev, [character.id]: e.target.value }))}
                  placeholder={`Private instructions only ${character.name} knows... (e.g., 'You were told to flirt but act innocent')`}
                  className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white placeholder:text-white/30 focus:border-[#ff1372] focus:outline-none"
                  rows={3}
                />
                <p className="mt-2 text-xs text-white/40">
                  This is secret knowledge only this character has - what they were told privately, their hidden agenda, etc.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type WingmanShortcut = "gift" | "train" | "photo-shoot" | "visit";

interface WingmanPanelProps {
  selectedCharacter: Character | null;
  characters: Character[];
  onShortcut: (shortcut: WingmanShortcut) => void;
  onOpenSettings: () => void;
  onOpenManager: () => void;
  onStartChat?: (character: Character) => void;
  onStartScene?: (scene: SceneSetup) => void; // New callback for starting scenes
}

function WingmanPanel({
  selectedCharacter,
  characters,
  onShortcut,
  onOpenSettings,
  onOpenManager,
  onStartChat,
  onStartScene,
}: WingmanPanelProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "tools">("chat");
  const [chatDraft, setChatDraft] = useState("");
  const [isResponding, setIsResponding] = useState(false);
  const [houseConfig, setHouseConfig] = useState<{ worldPrompt?: string; copilotPersonality?: string; copilotMainPrompt?: string; copilotResponseLength?: string; copilotUseHouseContext?: boolean; copilotContextDetail?: string; copilotMaxTokens?: number } | null>(null);
  const [messages, setMessages] = useState<
    Array<{ id: string; role: "user" | "assistant"; content: string }>
  >([]);
  
  // Scene director instance
  const [sceneDirector, setSceneDirector] = useState<WingmanSceneDirector | null>(null);

  // Initialize scene director when characters or config change
  useEffect(() => {
    if (characters.length > 0) {
      setSceneDirector(new WingmanSceneDirector(characters, houseConfig || undefined));
    }
  }, [characters, houseConfig]);

  // Load house config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await repositoryStorage.get("house_config");
        setHouseConfig(config || {});
      } catch (error) {
        logger.warn("Failed to load house config for wingman", error);
        setHouseConfig({});
      }
    };
    loadConfig();
  }, []);

  // Set initial greeting message
  useEffect(() => {
    if (messages.length === 0 && houseConfig) {
      const greeting = houseConfig.copilotPersonality 
        ? `Hey! I'm your Wingman - ${houseConfig.copilotPersonality}. How can I help?`
        : "Hey! I can help with tips, character insights, or house management. What do you need?";
      setMessages([{
        id: "1",
        role: "assistant",
        content: greeting,
      }]);
    }
  }, [houseConfig, messages.length]);

  const affection =
    selectedCharacter?.progression?.affection ??
    selectedCharacter?.stats?.love ??
    0;
  const happiness = selectedCharacter?.stats?.happiness ?? 0;
  const trust = selectedCharacter?.progression?.trust ?? 0;
  const statusLine = selectedCharacter
    ? `Watching ${selectedCharacter.name}${selectedCharacter.preferredRoomType ? ` • ${selectedCharacter.preferredRoomType}` : ""}`
    : "House idle • no active scene";

  const shortcuts = [
    { id: "gift", label: "Send Gift", icon: Heart },
    { id: "train", label: "Train", icon: Barbell },
    { id: "photo-shoot", label: "Photo Shoot", icon: Camera },
    { id: "visit", label: "Visit", icon: DoorOpen },
  ] as const;

  const tips = useMemo(() => {
    if (!selectedCharacter) {
      return [
        {
          id: "no-selection",
          title: "Pick tonight’s focus",
          detail:
            "Highlight a girl from the roster to get live intel and mood reads here.",
        },
        {
          id: "warm-up",
          title: "Prime the room first",
          detail:
            "Use quick actions to send a gift or flirt before you dive into the main chat.",
        },
      ];
    }

    const narrative: { id: string; title: string; detail: string }[] = [];

    if (affection < 60) {
      narrative.push({
        id: "affection-low",
        title: `${selectedCharacter.name} perks up with appearance praise`,
        detail:
          "Compliments and gifts land harder than usual—stack a few before escalating.",
      });
    } else {
      narrative.push({
        id: "affection-high",
        title: `${selectedCharacter.name} is feeling close tonight`,
        detail:
          "Lean into more intimate prompts; she’ll mirror your energy quickly.",
      });
    }

    if (happiness < 55) {
      narrative.push({
        id: "happiness",
        title: "She needs a pick-me-up",
        detail:
          "A small gift or gentle visit will lift her vibe before you push anything heavier.",
      });
    }

    if (trust < 50) {
      narrative.push({
        id: "trust",
        title: "Ask questions before commands",
        detail:
          "Curious check-ins build the trust she’s missing—keep the tone warm and patient.",
      });
    }

    return narrative;
  }, [affection, happiness, trust, selectedCharacter]);

  // Clear chat handler
  const handleClearChat = useCallback(() => {
    const greeting = houseConfig?.copilotPersonality 
      ? `Hey! I'm your Wingman - ${houseConfig.copilotPersonality}. How can I help?`
      : "Hey! I can help with tips, character insights, or house management. What do you need?";
    setMessages([{
      id: Date.now().toString(),
      role: "assistant",
      content: greeting,
    }]);
    toast.success("Chat cleared");
  }, [houseConfig]);

  // Send chat message with enhanced context, scene director, and quick action detection
  const handleSendChat = useCallback(async () => {
    if (!chatDraft.trim() || isResponding) return;

    const userMessage = chatDraft.trim();
    const newUserMsg = {
      id: Date.now().toString(),
      role: "user" as const,
      content: userMessage,
    };

    // Add user message immediately
    setMessages((prev) => [...prev, newUserMsg]);
    setChatDraft("");
    setIsResponding(true);

    try {
      // Check if scene director should handle this (natural language scene commands)
      console.log('Checking scene director:', { 
        hasDirector: !!sceneDirector, 
        userMessage,
        characters: characters.length 
      });
      
      if (sceneDirector) {
        const sceneKeywords = /send|bring|tell|setup|create|start|scene|arrange|introduce/i;
        const matchesKeywords = sceneKeywords.test(userMessage);
        const isAwaitingAnswer = sceneDirector.getState().awaitingAnswer;
        
        console.log('Scene keyword check:', { 
          matchesKeywords, 
          isAwaitingAnswer,
          shouldProcess: matchesKeywords || isAwaitingAnswer,
          userMessage 
        });
        
        if (matchesKeywords || isAwaitingAnswer) {
          console.log('Processing with scene director...');
          try {
            const result = await sceneDirector.processInput(userMessage);
            
            console.log('Scene Director Result:', result);
            
            if (result.type === 'question') {
              // Wingman is asking a follow-up question
              console.log('Scene Director asking question:', result.message);
              const assistantMsg = {
                id: (Date.now() + 1).toString(),
                role: "assistant" as const,
                content: result.message,
              };
              setMessages((prev) => [...prev, assistantMsg]);
              setIsResponding(false);
              return;
            }
            
            if (result.type === 'scene') {
              if (!result.scene) {
                console.error('Scene Director returned type=scene but no scene object!');
                throw new Error('Scene object missing');
              }
              
              if (!onStartScene) {
                console.error('onStartScene handler is not provided!');
                throw new Error('onStartScene handler missing');
              }
              
              // Scene is ready! Display it in Wingman chat and launch it
              console.log('✅ Launching scene:', result.scene);
              const sceneMsg = {
                id: (Date.now() + 1).toString(),
                role: "assistant" as const,
                content: `**Scene Set:**\n\n${result.message}\n\n*Opening in main chat now...*`,
              };
              setMessages((prev) => [...prev, sceneMsg]);
              setIsResponding(false);
              
              // Start the scene in main chat
              setTimeout(() => {
                console.log('🎬 Calling onStartScene with:', result.scene);
                onStartScene(result.scene!);
              }, 800);
              return;
            }
            
            // If we get here, scene director returned acknowledgment or unknown type
            console.warn('Scene Director returned unexpected type:', result.type, result);
            // Fall through to normal AI
          } catch (sceneError) {
            logger.warn("Scene director failed, falling through to normal AI", sceneError);
            // Fall through to normal AI response
          }
        }
      }

      // Detect quick actions (legacy fallback)
      const bringMatch = userMessage.match(/bring\s+(\w+)\s+to\s+(my\s+)?room/i);
      const setupMatch = userMessage.match(/(?:set\s*up|start|create)\s+(?:a\s+)?(?:scene|scenario)\s+(?:with\s+)?(\w+)/i);
      
      if ((bringMatch || setupMatch) && onStartChat) {
        const targetName = (bringMatch?.[1] || setupMatch?.[1] || "").toLowerCase();
        const targetChar = characters.find(c => c.name.toLowerCase().includes(targetName));
        
        if (targetChar) {
          const actionReply = bringMatch 
            ? `Perfect! I'll bring ${targetChar.name} to your room right now. Setting up the scene...`
            : `Got it! Starting a scenario with ${targetChar.name}...`;
          
          const assistantMsg = {
            id: (Date.now() + 1).toString(),
            role: "assistant" as const,
            content: actionReply,
          };
          setMessages((prev) => [...prev, assistantMsg]);
          setIsResponding(false);
          
          // Start the chat with this character
          setTimeout(() => onStartChat(targetChar), 500);
          return;
        }
      }

      // Get AI response with full context
      let reply = "I'm here to help! Ask me about character tips, house management, or anything else.";

      try {
        if (typeof AIService.copilotRespond === "function") {
          const conversationHistory = [...messages, newUserMsg].map((msg) => ({
            role: msg.role,
            content: msg.content,
          }));

          // Build enhanced copilot prompt
          const mainPrompt = houseConfig?.copilotMainPrompt ||
            "You are Wingman, the Dollhouse assistant. Help manage the house, introduce girls, set up scenarios, and provide tips. Keep responses conversational and engaging. Remember context from our ongoing conversation.";
          
          const personalityNote = houseConfig?.copilotPersonality 
            ? `\n\nPersonality: ${houseConfig.copilotPersonality}`
            : "";
          
          const responseLengthNote = houseConfig?.copilotResponseLength === "brief"
            ? "\n\nKeep responses very brief (1-2 sentences max)."
            : houseConfig?.copilotResponseLength === "detailed"
            ? "\n\nProvide detailed, comprehensive responses."
            : "\n\nKeep responses balanced (2-4 sentences).";

          const enhancedPrompt = mainPrompt + personalityNote + responseLengthNote;

          reply = await AIService.copilotRespond({
            threadId: "wingman-sidebar",
            messages: conversationHistory,
            sessionId: "wingman-persistent",
            characters: characters || [],
            copilotPrompt: enhancedPrompt,
            housePrompt: selectedCharacter
              ? `Currently viewing: ${selectedCharacter.name}`
              : "House overview",
            includeHouseContext: houseConfig?.copilotUseHouseContext !== false,
            contextDetail: (houseConfig?.copilotContextDetail ?? "balanced") as "lite" | "balanced" | "detailed",
            maxTokens: houseConfig?.copilotMaxTokens || 500,
          });
        }
      } catch (error) {
        logger.warn("AIService copilot response failed", error);
        reply = "Sorry, I'm having trouble connecting right now. Try asking me something else!";
      }

      // Add assistant response
      const assistantMsg = {
        id: (Date.now() + 1).toString(),
        role: "assistant" as const,
        content: reply,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      logger.error("Failed to send copilot message:", error);
      toast.error("Could not send message to copilot");
    } finally {
      setIsResponding(false);
    }
  }, [chatDraft, isResponding, messages, selectedCharacter, characters, houseConfig, onStartChat, sceneDirector, onStartScene]);

  return (
    <div className="hidden lg:flex min-w-0 flex-col overflow-hidden border-l border-white/5 bg-[#0d0e17] text-white">
      <header className="flex-shrink-0 border-b border-white/5 px-5 py-4">
        <div className="flex items-center justify-between">
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
              onClick={handleClearChat}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:text-white hover:bg-red-500/20 hover:border-red-500/40"
              aria-label="Clear chat"
              title="Clear conversation"
            >
              <Trash size={16} weight="bold" />
            </button>
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
        </div>
      </header>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "chat" | "tools")}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="flex-shrink-0 grid w-full grid-cols-2 rounded-none border-b border-white/5 bg-transparent p-0">
          <TabsTrigger
            value="chat"
            className="rounded-none border-b-2 border-transparent text-xs uppercase tracking-[0.25em] data-[state=active]:border-[#ff1372] data-[state=active]:bg-transparent data-[state=active]:text-white"
          >
            <ChatCircle size={14} className="mr-2" />
            Chat
          </TabsTrigger>
          <TabsTrigger
            value="tools"
            className="rounded-none border-b-2 border-transparent text-xs uppercase tracking-[0.25em] data-[state=active]:border-[#ff1372] data-[state=active]:bg-transparent data-[state=active]:text-white"
          >
            <Sparkle size={14} className="mr-2" />
            Tools
          </TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent
          value="chat"
          className="relative mt-0 flex flex-1 min-h-0 flex-col"
        >
          <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
              <div className="mb-3 text-center text-[10px] uppercase tracking-[0.35em] text-white/35">
                Copilot Chat
              </div>
              <div className="space-y-2 pb-2">
                {messages.map((message) => {
                  const isUser = message.role === "user";
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                          isUser
                            ? "bg-[#ff1372] text-white shadow-[0_25px_40px_-35px_rgba(255,19,114,0.7)]"
                            : "border border-white/10 bg-white/5 text-white/70"
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  );
                })}
                {messages.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-transparent p-6 text-center text-xs text-white/50">
                    <ChatCircle size={24} className="mx-auto mb-2 opacity-50" />
                    <p>
                      Ask your wingman for tips, shortcuts, or help managing the
                      house.
                    </p>
                  </div>
                )}
                {isResponding && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
                      <div className="flex items-center gap-2">
                        <div className="flex space-x-1">
                          <div className="h-1 w-1 animate-bounce rounded-full bg-white/60" />
                          <div
                            className="h-1 w-1 animate-bounce rounded-full bg-white/60"
                            style={{ animationDelay: "0.1s" }}
                          />
                          <div
                            className="h-1 w-1 animate-bounce rounded-full bg-white/60"
                            style={{ animationDelay: "0.2s" }}
                          />
                        </div>
                        <span>Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div
            className="flex-shrink-0 border-t border-white/5 px-4 pt-3"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <form
              className="flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSendChat();
              }}
            >
              <Input
                value={chatDraft}
                onChange={(e) => setChatDraft(e.target.value)}
                placeholder="Ask your wingman..."
                className="h-10 flex-1 rounded-full border-white/10 bg-white/[0.08] text-sm text-white placeholder:text-white/40"
              />
              <Button
                type="submit"
                disabled={!chatDraft.trim() || isResponding}
                className="h-10 w-10 rounded-full bg-[#ff1372] p-0 text-white hover:bg-[#ff1372]/90"
              >
                <PaperPlaneTilt size={16} weight="fill" />
              </Button>
            </form>
          </div>
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent
          value="tools"
          className="mt-0 flex flex-1 min-h-0 flex-col overflow-hidden"
        >
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
                    <p className="text-sm font-semibold text-white">
                      {tip.title}
                    </p>
                    <p className="mt-1 text-sm text-white/65">{tip.detail}</p>
                  </div>
                </div>
              ))}
              {tips.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-white/60">
                  I’ll surface fresh plays here as soon as we learn more about
                  her tonight.
                </div>
              )}
            </div>
          </div>

          <div
            className="border-t border-white/5 px-5 pt-5"
            style={{
              paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              {shortcuts.map((shortcut) => (
                <button
                  key={shortcut.id}
                  type="button"
                  onClick={() => onShortcut(shortcut.id as WingmanShortcut)}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white/80 transition hover:border-[#ff54a6]/40 hover:bg-[#ff1372]/15 hover:text-white"
                >
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.26em] text-white/35">
                      Shortcut
                    </span>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {shortcut.label}
                    </p>
                  </div>
                  <shortcut.icon size={20} className="text-pink-300" />
                </button>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
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
    clearSessionMessages,
    analyzeAndEndSession,
    createSession,
    updateSessionGoal,
  } = useChat();
  const { executeAction } = useQuickActions();

  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
    null
  );
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [profileCharacterId, setProfileCharacterId] = useState<string | null>(
    null
  );
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRosterOpen, setIsRosterOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createDialogGender, setCreateDialogGender] = useState<
    "female" | "male"
  >("female");

  useEffect(() => {
    type GlobalListener = {
      addEventListener?: (type: string, handler: () => void) => void;
      removeEventListener?: (type: string, handler: () => void) => void;
    };
    const globalLike: GlobalListener = globalThis as unknown as GlobalListener;
    if (!globalLike.addEventListener) return;
    const handleOpenRoster = () => setIsRosterOpen(true);
    globalLike.addEventListener("open-girls-view", handleOpenRoster);
    return () => {
      try {
        globalLike.removeEventListener?.("open-girls-view", handleOpenRoster);
      } catch {
        // ignore cleanup failures
      }
    };
  }, []);

  useEffect(() => {
    if (characters.length > 0 && !selectedCharacterId) {
      setSelectedCharacterId(characters[0].id);
    }
  }, [characters, selectedCharacterId]);

  const selectedCharacter = useMemo(
    () =>
      characters.find((character) => character.id === selectedCharacterId) ??
      null,
    [characters, selectedCharacterId]
  );

  const profileCharacter = useMemo(
    () =>
      characters.find((character) => character.id === profileCharacterId) ??
      null,
    [characters, profileCharacterId]
  );

  const handleViewProfile = useCallback((character: Character) => {
    setSelectedCharacterId(character.id);
    setProfileCharacterId(character.id);
    setIsProfileOpen(true);
  }, []);

  const handleSaveCharacterProfile = useCallback(
    (characterId: string, updates: Partial<Character>) =>
      updateCharacter(characterId, updates),
    [updateCharacter]
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
    [getSessionMessages]
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
      globalThis.addEventListener?.("chat-sessions-updated", handler);
    } catch (error) {
      logger.warn("Failed attaching chat session listener", error);
    }
    return () => {
      try {
        globalThis.removeEventListener?.("chat-sessions-updated", handler);
      } catch (error) {
        logger.warn("Failed removing chat session listener", error);
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
    [ensureIndividualSession, setChatActiveId, loadMessages, onFocusCharacter]
  );

  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!activeSessionId) return;
      await sendMessage(activeSessionId, text, "user");
      await loadMessages(activeSessionId);
    },
    [activeSessionId, sendMessage, loadMessages]
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
    [sessions, setChatActiveId, switchToSession, loadMessages]
  );

  const handleClearChat = useCallback(async () => {
    if (!activeSessionId) return;
    await clearSessionMessages(activeSessionId);
    await loadMessages(activeSessionId);
  }, [activeSessionId, clearSessionMessages, loadMessages]);

  const handleAnalyzeConversation = useCallback(async () => {
    if (!activeSessionId) return;
    const didAnalyze = await analyzeAndEndSession(activeSessionId);
    if (!didAnalyze) {
      return;
    }
    setMessages([]);
    setActiveSessionId(null);
    setChatActiveId(null);
  }, [activeSessionId, analyzeAndEndSession, setChatActiveId]);

  const handleOpenCreateDialog = useCallback(
    (defaultGender: "female" | "male") => {
      setCreateDialogGender(defaultGender);
      setIsCreateDialogOpen(true);
    },
    []
  );

  const handleCharacterCreatedFromDialog = useCallback(
    (character: Character) => {
      setSelectedCharacterId(character.id);
      setIsCreateDialogOpen(false);
    },
    []
  );

  const handleWingmanShortcut = useCallback(
    async (shortcut: WingmanShortcut) => {
      if (!selectedCharacter) {
        toast.error("Pick a girl to direct the wingman.");
        return;
      }

      if (shortcut === "visit") {
        await handleStartChat(selectedCharacter.id);
        return;
      }

      await executeAction(shortcut, { characterId: selectedCharacter.id });
    },
    [executeAction, handleStartChat, selectedCharacter]
  );

  const handleStartScene = useCallback(
    async (scene: SceneSetup) => {
      console.log('handleStartScene called with:', scene);
      try {
        // Create a new session with all participants
        console.log('Creating scene session with participants:', scene.participantIds);
        const sessionId = await createSession('scene', scene.participantIds);
        console.log('Session created:', sessionId);
        
        setActiveSessionId(sessionId);
        setChatActiveId(sessionId);
        
        // Load the session
        await loadMessages(sessionId);
        
        // Send the scene description as a system/narrator message
  const promptText = scene.scenePrompt?.trim() ?? "";
  console.log('Sending scene prompt:', promptText);
  await sendMessage(sessionId, `**Scene Start:**\n\n${promptText}`, 'system');
        
        // If there's an initial message, send it from the character
        if (scene.initialMessage && scene.participantIds.length > 0) {
          const firstCharacterId = scene.participantIds[0];
          console.log('Sending initial message from:', firstCharacterId);
          await sendMessage(sessionId, scene.initialMessage, firstCharacterId);
        }
        
        // Store character hidden prompts as session-scoped secret goals
        console.log('Setting hidden prompts:', scene.characterHiddenPrompts);
        const hiddenEntries = Object.entries(scene.characterHiddenPrompts ?? {}).filter(([charId, hiddenPrompt]) => {
          if (!hiddenPrompt?.trim()) return false;
          return scene.participantIds.includes(charId);
        });
        const hiddenPromptMap = Object.fromEntries(
          hiddenEntries.map(([charId, hiddenPrompt]) => [charId, hiddenPrompt.trim()])
        );
        if (hiddenEntries.length > 0) {
          await Promise.all(
            hiddenEntries.map(([charId, hiddenPrompt]) =>
              updateSessionGoal(sessionId, charId, hiddenPrompt.trim(), 'high')
            )
          );
        }

        // Broadcast scene metadata so interested panels can reflect the update
        try {
          globalThis.dispatchEvent?.(
            new CustomEvent('scene-metadata-updated', {
              detail: {
                sessionId,
                scenePrompt: promptText,
                hiddenPrompts: hiddenPromptMap,
              },
            })
          );
        } catch (eventError) {
          logger.warn('Failed to dispatch scene metadata event', eventError);
        }
        
        // Reload messages to show the scene
        await loadMessages(sessionId);
        
        toast.success("Scene started! Characters are ready.");
      } catch (error) {
        console.error('handleStartScene error:', error);
        logger.error("Failed to start scene", error);
        toast.error("Could not start the scene");
      }
    },
    [characters, sendMessage, setChatActiveId, loadMessages, createSession, updateSessionGoal]
  );

  const handleToggleCharacterInChat = useCallback(
    async (characterId: string) => {
      const activeSession = sessions.find((s) => s.id === activeSessionId);
      if (!activeSession) {
        // No active session, start a new one with this character
        await handleStartChat(characterId);
        return;
      }

      const isInChat = activeSession.participantIds.includes(characterId);
      
      if (isInChat) {
        // Remove character from chat
        const newParticipants = activeSession.participantIds.filter((id) => id !== characterId);
        if (newParticipants.length === 0) {
          // If removing the last character, end the session
          setActiveSessionId(null);
          setChatActiveId(null);
          setMessages([]);
          toast.info("Chat ended");
        } else {
          // Update session with remaining participants
          const newSessionId = await createSession(activeSession.type, newParticipants);
          setActiveSessionId(newSessionId);
          setChatActiveId(newSessionId);
          await loadMessages(newSessionId);
          toast.info(`Removed from chat`);
        }
      } else {
        // Add character to chat
        const newParticipants = [...activeSession.participantIds, characterId];
        const newSessionId = await createSession(activeSession.type, newParticipants);
        setActiveSessionId(newSessionId);
        setChatActiveId(newSessionId);
        await loadMessages(newSessionId);
        toast.success(`Added to chat`);
      }
    },
    [sessions, activeSessionId, handleStartChat, createSession, setChatActiveId, loadMessages]
  );

  const handleDeleteCharacter = useCallback(
    async (characterId: string) => {
      try {
        const character = characters.find((c) => c.id === characterId);
        await removeCharacter(characterId);
        toast.success(`${character?.name || "Character"} has been deleted`);

        // If this was the selected character, clear selection
        if (selectedCharacterId === characterId) {
          setSelectedCharacterId(null);
          setActiveSessionId(null);
          setMessages([]);
        }
      } catch (error) {
        logger.error("Failed to delete character:", error);
        toast.error("Failed to delete character");
      }
    },
    [characters, removeCharacter, selectedCharacterId]
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
    <div
      className="relative flex w-full overflow-hidden bg-[#05050d] text-white"
      style={{ height: "100dvh", minHeight: 0 }}
    >
      <div
        className="mx-auto flex h-full w-full max-w-[1600px] flex-1 min-h-0 flex-col overflow-hidden"
        style={{
          paddingLeft: "max(1.5rem, env(safe-area-inset-left))",
          paddingRight: "max(1.5rem, env(safe-area-inset-right))",
          paddingTop: "max(1rem, env(safe-area-inset-top))",
          paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="grid flex-1 min-h-0 gap-2 overflow-hidden rounded-3xl border border-white/5 bg-[#090912]/95 shadow-[0_40px_120px_-60px_rgba(255,19,114,0.45)] backdrop-blur-sm grid-cols-1 md:grid-cols-[minmax(240px,280px)_minmax(0,1fr)] lg:grid-cols-[minmax(248px,300px)_minmax(0,1fr)_minmax(248px,280px)] xl:grid-cols-[minmax(264px,320px)_minmax(0,1fr)_minmax(264px,300px)]">
          <CharacterRoster
            characters={characters}
            selectedId={selectedCharacterId}
            onSelect={(characterId: string) =>
              setSelectedCharacterId(characterId)
            }
            onStartChat={handleStartChat}
            onRequestCreate={handleOpenCreateDialog}
            sessions={sessions}
            onViewProfile={handleViewProfile}
            activeSessionId={activeSessionId}
            onToggleCharacterInChat={handleToggleCharacterInChat}
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
                  characters={characters}
                  messages={messages}
                  onSend={handleSendMessage}
                  onStartChat={() =>
                    selectedCharacter
                      ? handleStartChat(selectedCharacter.id)
                      : Promise.resolve()
                  }
                  isLoadingMessages={isLoadingMessages}
                  sessions={sessions}
                  onSwitchSession={handleSwitchSession}
                  activeSessionId={activeSessionId}
                  onOpenManager={() => setIsRosterOpen(true)}
                  onClearChat={handleClearChat}
                  onAnalyzeConversation={handleAnalyzeConversation}
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
            characters={characters}
            onShortcut={handleWingmanShortcut}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenManager={() => setIsRosterOpen(true)}
            onStartChat={(character) => {
              void handleStartChat(character.id);
            }}
            onStartScene={(scene) => {
              void handleStartScene(scene);
            }}
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

        <Dialog open={isRosterOpen} onOpenChange={setIsRosterOpen}>
          <DialogContent className="max-w-6xl w-[96vw] overflow-hidden border border-white/10 bg-[#080811] p-0 text-white">
            <div className="h-[82vh] min-h-[560px]">
              <GirlsView />
            </div>
          </DialogContent>
        </Dialog>
        <HouseSettings open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
      </div>
    </div>
  );
}
