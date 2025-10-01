import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAutoCharacterCreator } from '@/hooks/useAutoCharacterCreator';
import { useChat } from '@/hooks/useChat';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { QuickAction, useQuickActions } from '@/hooks/useQuickActions';
import { AIService } from '@/lib/aiService';
import { logger } from '@/lib/logger';
import type { Character, ChatMessage, House } from '@/types';
import {
  ChartLineUp,
  ChatCircle,
  Gear,
  PaperPlaneRight,
  Plus,
  Robot,
  Trash,
  UsersThree,
} from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const FALLBACK_RESPONSE =
  "I'm here to tune her heart. Try asking for a new scenario, a growth plan, or tell me which girl needs attention.";

interface ManagerMessage {
  id: string;
  sender: 'user' | 'copilot';
  content: string;
  timestamp: Date;
}

interface ScenarioIdea {
  id: string;
  title: string;
  description: string;
  characterId?: string;
}

interface ManagerSuggestion {
  id: string;
  title: string;
  detail: string;
}

interface GirlManagerSidebarProps {
  onFocusCharacter?: (characterId: string) => void;
  onSessionActivated?: (sessionId: string, characterId?: string) => void;
  onOpenSettings?: () => void;
}

function selectScenarioIdeas(characters: Character[]): ScenarioIdea[] {
  if (!characters.length) {
    return [
      {
        id: 'teaser-empty-1',
        title: 'No roster yet',
        description: 'Spin up your first girl from the left sidebar so I can start staging tonight’s drama.'
      },
      {
        id: 'teaser-empty-2',
        title: 'Import a legend',
        description: 'Drop in an existing character JSON and I’ll map her into the house schedule.'
      },
      {
        id: 'teaser-empty-3',
        title: 'Blueprint the house arc',
        description: 'Ask me for a season outline and I’ll script the milestones for your first saga.'
      }
    ];
  }

  const sceneLabels = ['In Trouble', 'After Hours', 'On Display', 'Heat Check'];

  return characters.slice(0, 4).map((character, index) => {
    const label = sceneLabels[index % sceneLabels.length];
    const title = `${character.name?.toUpperCase() || 'HER'} ${label}`;
    const room = character.preferredRoomType || 'the private suite';
    const tension = (character.stats?.love ?? 50) > 70
      ? `${character.name} can barely keep it together while the guests push for more.`
      : `${character.name} is begging for backup before the guests strip away her last line of defense.`;

    return {
      id: `teaser-${character.id}`,
      characterId: character.id,
      title,
      description: `${tension} Slide into ${room} and take control of where this goes.`
    } satisfies ScenarioIdea;
  });
}

function buildSuggestions(house: Partial<House> | undefined, characters: Character[]): ManagerSuggestion[] {
  const pool: ManagerSuggestion[] = [];
  const rosterSize = characters.length;
  const worldFocus = [house?.worldPrompt, house?.copilotPrompt].filter(Boolean).join(' ').toLowerCase();

  pool.push({
    id: 'suggestion-tracker',
    title: 'Track every encounter',
    detail: "Let’s build a heat-map of each girl’s sexual activity. I can log positions, locations, and partners so you always know who’s overdue for attention."
  });

  if (rosterSize > 3) {
    pool.push({
      id: 'suggestion-social',
      title: 'Cross-over story arcs',
      detail: 'We could ship a social calendar that auto-mixes girls into duos and trios. Think rotating events, jealousy triggers, and weekly house scandals.'
    });
  }

  if (!rosterSize) {
    pool.push({
      id: 'suggestion-hiring',
      title: 'Recruitment drive',
      detail: 'Spin up a casting pipeline that scrapes your favorite tags and auto-populates candidates ready for your approval.'
    });
  }

  if (worldFocus.includes('school') || worldFocus.includes('academy')) {
    pool.push({
      id: 'suggestion-campus',
      title: 'Campus life simulator',
      detail: 'Let’s prototype class schedules, dorm rivalries, and grade pressure that spill directly into their nightly scenes.'
    });
  }

  pool.push({
    id: 'suggestion-market',
    title: 'Scene marketplace',
    detail: 'Imagine a workshop where the community drops in new scene presets, house events, and toys. Curate the best and inject them straight into your timeline.'
  });

  return pool.slice(0, 5);
}

function mapMessages(raw: ChatMessage[]): ManagerMessage[] {
  return raw.map((message) => ({
    id: message.id,
    sender: message.characterId ? 'copilot' : 'user',
    content: message.content,
    timestamp: message.timestamp,
  }));
}

export function GirlManagerSidebar({
  onFocusCharacter,
  onSessionActivated,
  onOpenSettings,
}: GirlManagerSidebarProps) {
  const { characters, house } = useHouseFileStorage();
  const { quickActions, executeAction, addQuickAction } = useQuickActions();
  const { createRandomCharacter } = useAutoCharacterCreator();
  const {
    sessions,
    sessionsLoaded,
    createSession,
    ensureIndividualSession,
    createGroupSession,
    createInterviewSession,
    getSessionMessages,
    sendMessage,
    setActiveSessionId,
    deleteSession,
  } = useChat();

  const [managerSessionId, setManagerSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ManagerMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isResponding, setIsResponding] = useState(false);
  const [isCreateActionOpen, setIsCreateActionOpen] = useState(false);
  const [newActionLabel, setNewActionLabel] = useState('');
  const [newActionDetail, setNewActionDetail] = useState('');
  const [activeTab, setActiveTab] = useState<'manager' | 'chat'>('chat');

  const scenarioIdeas = useMemo(() => selectScenarioIdeas(characters), [characters]);
  const suggestions = useMemo(() => buildSuggestions(house, characters), [house, characters]);
  const enabledActions = useMemo(
    () => quickActions.filter((action) => action.enabled),
    [quickActions]
  );
  const totalAffection = useMemo(
    () =>
      characters.reduce((sum, character) => sum + (character.progression?.affection ?? 0), 0),
    [characters],
  );
  const medianAffection = characters.length
    ? Math.round(totalAffection / characters.length)
    : 0;

  const ensureManagerSession = useCallback(async () => {
    if (managerSessionId) {
      return managerSessionId;
    }

    const existing = sessions.find((session) => session.type === 'assistant');
    if (existing) {
      setManagerSessionId(existing.id);
      return existing.id;
    }

    const newId = await createSession('assistant', [], { assistantOnly: true });
    setManagerSessionId(newId);
    return newId;
  }, [managerSessionId, sessions, createSession]);

  const refreshMessages = useCallback(
    async (sessionId: string) => {
      const history = await getSessionMessages(sessionId);
      const cleaned = history.map((row) => ({
        ...row,
        characterId: row.characterId === 'copilot' ? 'copilot' : undefined,
      }));
      setMessages(mapMessages(cleaned));
    },
    [getSessionMessages],
  );

  useEffect(() => {
    if (!sessionsLoaded) return;
    void ensureManagerSession().then((sessionId) => {
      void refreshMessages(sessionId).then(async () => {
        if (messages.length === 0) {
          try {
            await sendMessage(
              sessionId,
              "I'm dialed in. Tell me who to optimise or what fantasy to stage tonight.",
              'copilot',
              { copilot: true },
            );
            await refreshMessages(sessionId);
          } catch (error) {
            logger.warn('Failed to seed manager greeting', error);
          }
        }
      });
    });
  }, [sessionsLoaded, ensureManagerSession, refreshMessages, sendMessage]);

  useEffect(() => {
    if (!managerSessionId) return;
    void refreshMessages(managerSessionId);
  }, [managerSessionId, refreshMessages]);

  const focusCharacter = useCallback(
    (characterId: string) => {
      if (!characterId) return;
      onFocusCharacter?.(characterId);
    },
    [onFocusCharacter],
  );

  const handleQuickActionPress = useCallback(
    (action: QuickAction) => {
      if (action.description) {
        setDraft(action.description);
      }
      void executeAction(action.id);
    },
    [executeAction],
  );

  const handleCreateQuickAction = useCallback(() => {
    const label = newActionLabel.trim();
    const detail = newActionDetail.trim();
    if (!label) {
      toast.error('Name your action first.');
      return;
    }

    addQuickAction({
      label,
      icon: 'Sparkle',
      action: 'customCommand',
      enabled: true,
      customizable: true,
      description: detail || undefined,
      isCustom: true
    });

    toast.success(`Created action “${label}”.`);
    setIsCreateActionOpen(false);
    setNewActionLabel('');
    setNewActionDetail('');
  }, [addQuickAction, newActionDetail, newActionLabel]);

  const activateSession = useCallback(
    async (sessionId: string, characterId?: string) => {
      setActiveSessionId(sessionId);
      onSessionActivated?.(sessionId, characterId);
      if (characterId) focusCharacter(characterId);
      await refreshMessages(sessionId);
    },
    [focusCharacter, onSessionActivated, refreshMessages, setActiveSessionId],
  );

  const handleSceneTeaser = useCallback(
    async (idea: ScenarioIdea) => {
      if (idea.characterId) {
        try {
          const sessionId = await createGroupSession([idea.characterId]);
          await activateSession(sessionId, idea.characterId);
          toast.success('Scene staged—jump in.');
        } catch (error) {
          logger.warn('Failed to launch scene teaser', error);
          toast.error('Could not open that scene.');
        }
      }
      setDraft(idea.description);
    },
    [activateSession, createGroupSession],
  );

  const findCharacterByName = useCallback(
    (nameFragment: string): Character | undefined => {
      const normalized = nameFragment.trim().toLowerCase();
      return characters.find((character) => character.name.toLowerCase() === normalized);
    },
    [characters],
  );

  const handleCommand = useCallback(
    async (text: string): Promise<string | null> => {
      const lowered = text.toLowerCase();

      const chatMatch = lowered.match(/(?:chat|talk|text|message|date) with ([a-z\s]+)$/i);
      if (chatMatch?.[1]) {
        const character = findCharacterByName(chatMatch[1]);
        if (character) {
          const sessionId = await ensureIndividualSession(character.id);
          await activateSession(sessionId, character.id);
          return `Opening a private line with ${character.name}. I’ll keep her warmed up until you jump in.`;
        }
        return "I can't find her—double-check the spelling of her name.";
      }

      if (lowered.includes('new girl') || lowered.includes('generate') || lowered.includes('create')) {
        try {
          const created = await createRandomCharacter();
          if (created) {
            focusCharacter(created.id);
            return `${created.name} just arrived. ${created.personality || 'She has her own magnetic energy.'}`;
          }
        } catch (error) {
          logger.warn('Command create girl failed', error);
        }
        return 'I tried to craft someone, but your auto-creator hit a snag. Check your settings.';
      }

      const sceneMatch = lowered.match(/(?:scene|scenario|setup) with ([a-z\s]+)/i);
      if (sceneMatch?.[1]) {
        const character = findCharacterByName(sceneMatch[1]);
        if (character) {
          const sessionId = await createGroupSession([character.id]);
          await activateSession(sessionId, character.id);
          return `Scene staged with ${character.name}. Set the tone, and I’ll track her objectives.`;
        }
        return "I can't prep a scene without a matching girl.";
      }

      const interviewMatch = lowered.match(/(?:interview) ([a-z\s]+)/i);
      if (interviewMatch?.[1]) {
        const character = findCharacterByName(interviewMatch[1]);
        if (character) {
          const sessionId = await createInterviewSession(character.id);
          await activateSession(sessionId, character.id);
          return `Interview room ready. ${character.name} will open up if you push in the right direction.`;
        }
      }

      return null;
    },
    [
      activateSession,
      createGroupSession,
      createInterviewSession,
      createRandomCharacter,
      ensureIndividualSession,
      findCharacterByName,
      focusCharacter,
    ],
  );

  const handleSend = useCallback(async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;

    setActiveTab('chat');
    const sessionId = await ensureManagerSession();
    setDraft('');
    setIsResponding(true);

    try {
      await sendMessage(sessionId, trimmed, 'user', { copilot: true });

      const commandResponse = await handleCommand(trimmed);
      if (commandResponse) {
        await sendMessage(sessionId, commandResponse, 'copilot', { copilot: true });
        await refreshMessages(sessionId);
        return;
      }

      let reply = FALLBACK_RESPONSE;
      try {
        if (typeof AIService.copilotRespond === 'function') {
          const formatted = [...messages, { id: 'temp', sender: 'user', content: trimmed, timestamp: new Date() }].map((message) => ({
            role: message.sender === 'user' ? ('user' as const) : ('assistant' as const),
            content: message.content,
          }));
          reply = await AIService.copilotRespond({
            threadId: 'girl-manager',
            messages: formatted,
            sessionId,
            characters,
          });
        } else if (typeof AIService.generateAssistantReply === 'function') {
          reply = await AIService.generateAssistantReply(trimmed);
        }
      } catch (error) {
        logger.warn('AIService manager response failed', error);
      }

      await sendMessage(sessionId, reply || FALLBACK_RESPONSE, 'copilot', { copilot: true });
      await refreshMessages(sessionId);
    } finally {
      setIsResponding(false);
    }
  }, [
    draft,
    ensureManagerSession,
    handleCommand,
    messages,
    refreshMessages,
    sendMessage,
    characters,
    setActiveTab,
  ]);

  // State for managing chat history deletion
  const [showDeleteChatDialog, setShowDeleteChatDialog] = useState(false);

  const handleDeleteChatHistory = useCallback(async () => {
    if (!managerSessionId) return;

    try {
      await deleteSession(managerSessionId);
      setManagerSessionId(null);
      setMessages([]);

      const freshSessionId = await createSession('assistant', [], { assistantOnly: true });
      setManagerSessionId(freshSessionId);

      await sendMessage(
        freshSessionId,
        "I'm dialed in. Tell me who to optimise or what fantasy to stage tonight.",
        'copilot',
        { copilot: true },
      );

      await refreshMessages(freshSessionId);
      setShowDeleteChatDialog(false);
      toast.success('Manager chat cleared');
      logger.log('🗑️ Manager chat history cleared');
    } catch (error) {
      logger.error('Failed to clear chat history:', error);
      toast.error('Could not clear manager chat');
    }
  }, [managerSessionId, deleteSession, createSession, sendMessage, refreshMessages]);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[#0c0c12] text-white">
      <header className="flex-shrink-0 border-b border-white/5 px-3 py-2 xl:px-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em]">Godmode</h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:border-[#ff1372]/50 hover:text-white"
            onClick={() => onOpenSettings?.()}
            aria-label="Open settings"
          >
            <Gear size={14} />
          </Button>
        </div>
      </header>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'chat' | 'manager')}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="grid w-full grid-cols-2 rounded-none border-b border-white/5 bg-transparent p-0">
          <TabsTrigger
            value="chat"
            className="rounded-none border-b-2 border-transparent text-xs uppercase tracking-[0.25em] data-[state=active]:border-[#ff1372] data-[state=active]:bg-transparent data-[state=active]:text-white"
          >
            <ChatCircle size={14} className="mr-2" />
            Chat
          </TabsTrigger>
          <TabsTrigger
            value="manager"
            className="rounded-none border-b-2 border-transparent text-xs uppercase tracking-[0.25em] data-[state=active]:border-[#ff1372] data-[state=active]:bg-transparent data-[state=active]:text-white"
          >
            <Robot size={14} className="mr-2" />
            Manager
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="relative mt-0 flex flex-1 min-h-0 flex-col">
          <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 text-xs uppercase tracking-[0.25em] text-white/50 xl:px-6">
              <span>Copilot Chat</span>
              <AlertDialog open={showDeleteChatDialog} onOpenChange={setShowDeleteChatDialog}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] uppercase tracking-[0.25em] text-white/60 hover:border-red-400/60 hover:bg-red-500/10 hover:text-white"
                  >
                    <Trash size={12} className="mr-1" />
                    Clear
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset the feed?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will wipe every message in the copilot chat. You can’t undo it.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => void handleDeleteChatHistory()}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      Clear History
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 pb-44 xl:px-4 xl:py-4">
              <div className="mb-3 text-center text-[10px] uppercase tracking-[0.35em] text-white/35">
                Copilot Chat
              </div>
              <div className="space-y-2 pb-2">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                        message.sender === 'user'
                          ? 'bg-[#ff1372] text-white shadow-[0_25px_40px_-35px_rgba(255,19,114,0.7)]'
                          : 'border border-white/10 bg-white/5 text-white/70'
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-transparent p-6 text-center text-xs text-white/50">
                    <ChatCircle size={24} className="mx-auto mb-2 opacity-50" />
                    <p>Talk to me about growth plans, drama ideas, or who needs a stat boost.</p>
                  </div>
                )}
                {isResponding && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
                      <div className="flex items-center gap-2">
                        <div className="flex space-x-1">
                          <div className="h-1 w-1 animate-bounce rounded-full bg-white/60" />
                          <div className="h-1 w-1 animate-bounce rounded-full bg-white/60" style={{ animationDelay: '0.1s' }} />
                          <div className="h-1 w-1 animate-bounce rounded-full bg-white/60" style={{ animationDelay: '0.2s' }} />
                        </div>
                        <span>Calibrating...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 px-3 pb-3 pt-2 xl:px-4 xl:pb-4">
            <div className="pointer-events-auto rounded-xl border border-white/10 bg-[#14141f]/95 px-3 pb-3 pt-2 shadow-[0_22px_65px_-35px_rgba(255,19,114,0.65)] backdrop-blur-xl sm:px-4 sm:pb-4">
              <form
                className="flex items-center gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSend();
                }}
              >
                <Input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Copilot chat — tell her what to stage next…"
                  className="h-9 flex-1 rounded-lg border-white/10 bg-white/[0.08] text-sm text-white placeholder:text-white/40"
                />
                <Button
                  type="submit"
                  disabled={!draft.trim() || isResponding}
                  className="h-9 rounded-lg bg-[#ff1372] px-3 text-xs font-semibold uppercase tracking-[0.2em] text-white hover:bg-[#ff1372]/90"
                >
                  <PaperPlaneRight size={12} className="mr-1" />
                  Send
                </Button>
              </form>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="manager" className="relative mt-0 flex flex-1 min-h-0 flex-col overflow-hidden">
          <div className="absolute inset-0 z-0 flex flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 pb-40 xl:px-4 xl:py-3">
              <div className="space-y-4">
                <section>
                  <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/5 bg-white/5 p-3 text-[11px] text-white/70">
                    <div className="flex items-center gap-2">
                      <UsersThree size={14} />
                      <span>{characters.length} girls online</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ChartLineUp size={14} />
                      <span>{medianAffection}% median affection</span>
                    </div>
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
                      Girl Feed
                    </h3>
                  </div>
                  <div className="mt-4 space-y-2">
                    {scenarioIdeas.slice(0, 2).map((idea) => (
                      <div
                        key={idea.id}
                        className="group cursor-pointer rounded-xl border border-white/10 bg-white/5 p-3 transition hover:border-[#ff1372]/40 hover:bg-white/10"
                        onClick={() => handleSceneTeaser(idea)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 pr-2">
                            <p className="text-xs font-semibold text-[#ff1372] leading-tight">
                              {idea.title}
                            </p>
                            <p className="mt-0.5 line-clamp-1 text-[11px] leading-tight text-white/60">
                              {idea.description.split('.')[0]}.
                            </p>
                          </div>
                          <Button
                            size="sm"
                            className="h-6 px-2 text-[10px] font-semibold uppercase tracking-[0.15em] bg-[#ff1372] text-white opacity-0 transition-opacity hover:bg-[#ff1372]/85 group-hover:opacity-100"
                          >
                            Go
                          </Button>
                        </div>
                      </div>
                    ))}
                    {scenarioIdeas.length > 2 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-full text-[10px] text-white/50 hover:text-white/70"
                        onClick={() => {
                          /* TODO: Show more scenarios */
                        }}
                      >
                        +{scenarioIdeas.length - 2} more scenarios
                      </Button>
                    )}
                  </div>
                </section>

                <Separator className="bg-white/5" />

                <section>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
                      Quick Actions
                    </h3>
                    <Dialog open={isCreateActionOpen} onOpenChange={setIsCreateActionOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg border-white/20 px-3 text-xs uppercase tracking-[0.2em] text-white/70 hover:border-[#ff1372]/50 hover:text-white"
                        >
                          <Plus size={12} className="mr-1" />
                          Create Action
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>New quick action</DialogTitle>
                          <DialogDescription>
                            Give it a title and optional tooltip. I’ll surface it in the manager feed.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs font-medium uppercase tracking-[0.2em] text-white/50">
                              Title
                            </label>
                            <Input
                              value={newActionLabel}
                              onChange={(event) => setNewActionLabel(event.target.value)}
                              placeholder="Ex: Warm up the lounge"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-medium uppercase tracking-[0.2em] text-white/50">
                              Tooltip (optional)
                            </label>
                            <Textarea
                              value={newActionDetail}
                              onChange={(event) => setNewActionDetail(event.target.value)}
                              placeholder="Describe what you expect me to do when this fires."
                              rows={3}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="ghost" onClick={() => setIsCreateActionOpen(false)}>
                            Cancel
                          </Button>
                          <Button
                            onClick={handleCreateQuickAction}
                            className="bg-[#ff1372] text-white hover:bg-[#ff1372]/85"
                          >
                            Save Action
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {enabledActions.map((action) => {
                      const trigger = (
                        <Button
                          key={action.id}
                          variant="secondary"
                          className="h-10 w-full justify-center rounded-lg bg-white/5 text-xs font-semibold uppercase tracking-[0.2em] text-white hover:bg-[#ff1372]/15 hover:text-white"
                          onClick={() => handleQuickActionPress(action)}
                        >
                          {action.label}
                        </Button>
                      );

                      return action.description ? (
                        <Tooltip key={action.id}>
                          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs text-white/80">
                            {action.description}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        trigger
                      );
                    })}
                  </div>
                </section>

                <Separator className="bg-white/5" />

                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
                    Suggestions
                  </h3>
                  <div className="mt-3 space-y-3 pb-6">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        onClick={() => setDraft(suggestion.detail)}
                        className="w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-left text-xs text-white/70 transition hover:border-[#ff1372]/40 hover:text-white"
                      >
                        <div className="text-sm font-semibold text-white">{suggestion.title}</div>
                        <p className="mt-1 text-xs text-white/60">{suggestion.detail}</p>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </TabsContent>

        
      </Tabs>
    </div>
  );
}
