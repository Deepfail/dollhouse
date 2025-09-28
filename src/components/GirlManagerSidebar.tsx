import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAutoCharacterCreator } from '@/hooks/useAutoCharacterCreator';
import { useChat } from '@/hooks/useChat';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { useQuickActions } from '@/hooks/useQuickActions';
import { AIService } from '@/lib/aiService';
import { logger } from '@/lib/logger';
import type { Character, ChatMessage } from '@/types';
import {
    ChartLineUp,
    Gear,
    Lightning,
    MagicWand,
    PaperPlaneRight,
    UsersThree,
} from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

const QUICK_PROMPTS = [
  'Draft a scene where she tests new limits tonight.',
  'Build me a flirty text opener she cannot ignore.',
  'What mood boosts her affection fastest right now?',
];

const FALLBACK_RESPONSE =
  "I'm here to tune her heart. Try asking for a new scenario, a growth plan, or tell me which girl needs attention.";

interface ManagerMessage {
  id: string;
  sender: 'user' | 'copilot';
  content: string;
  timestamp: Date;
}

interface GirlManagerSidebarProps {
  onFocusCharacter?: (characterId: string) => void;
  onSessionActivated?: (sessionId: string, characterId?: string) => void;
  onOpenSettings?: () => void;
}

function selectScenarioIdeas(characters: Character[]): string[] {
  if (!characters.length) {
    return [
      'No girls yet? Tap “Generate New Girl” and I’ll craft someone special.',
      'Import an existing character sheet and I’ll weave her into the house.',
      'Ask me for a house story arc and I’ll map out the beats.',
    ];
  }

  return characters.slice(0, 3).map((character) => {
    const vibe = character.personality.split(',')[0] || character.personality;
    const room = character.preferredRoomType || 'the common room';
    return `Plan a ${vibe.trim()} moment with ${character.name} in ${room}. Focus on affection and trust.`;
  });
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
  const { characters } = useHouseFileStorage();
  const { quickActions, executeAction } = useQuickActions();
  const {
    createRandomCharacter,
    isCreating: isSpawning,
  } = useAutoCharacterCreator();
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
  } = useChat();

  const [managerSessionId, setManagerSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ManagerMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isResponding, setIsResponding] = useState(false);

  const scenarioIdeas = useMemo(() => selectScenarioIdeas(characters), [characters]);
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

  const activateSession = useCallback(
    async (sessionId: string, characterId?: string) => {
      setActiveSessionId(sessionId);
      onSessionActivated?.(sessionId, characterId);
      if (characterId) focusCharacter(characterId);
      await refreshMessages(sessionId);
    },
    [focusCharacter, onSessionActivated, refreshMessages, setActiveSessionId],
  );

  const handleCreateRandomCharacter = useCallback(async () => {
    try {
      const result = await createRandomCharacter();
      if (result) {
        focusCharacter(result.id);
      }
    } catch (error) {
      logger.warn('Auto creator failed', error);
    }
  }, [createRandomCharacter, focusCharacter, onSessionActivated]);

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
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0c0c12] text-white">
      <header className="border-b border-white/5 px-4 pb-3 pt-4 flex-shrink-0 xl:px-6 xl:pb-4 xl:pt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-white/40">Girl Manager</p>
            <h2 className="mt-2 text-xl font-semibold">Copilot Control Deck</h2>
            <p className="mt-1 text-xs text-white/60">
              I keep the house balanced. Ask for scenarios, stat boosts, or new blood.
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-lg border border-white/10 bg-white/5 text-xs text-white/70 hover:border-[#ff1372]/40 hover:text-white"
              onClick={() => onOpenSettings?.()}
            >
              <Gear size={14} className="mr-2" />
              House Settings
            </Button>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
              <div className="flex items-center gap-2">
                <UsersThree size={14} />
                <span>{characters.length} girls</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-white/60">
                <ChartLineUp size={14} />
                <span>{medianAffection}% median affection</span>
              </div>
            </div>
          </div>
        </div>
      </header>

  <ScrollArea className="flex-1 min-h-0 px-4 py-4 xl:px-6 xl:py-5">
        <div className="space-y-6">
          <section>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
                  Girl lab
                </h3>
                <p className="mt-1 text-xs text-white/60">
                  Tune personalities or drop in someone brand new.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={isSpawning}
                onClick={() => void handleCreateRandomCharacter()}
                className="rounded-lg border-[#ff1372]/50 text-[#ff1372] hover:bg-[#ff1372]/10"
              >
                <MagicWand size={14} className="mr-2" />
                {isSpawning ? 'Summoning…' : 'Generate New Girl'}
              </Button>
            </div>
            <div className="mt-4 grid gap-3">
              {scenarioIdeas.map((idea) => (
                <button
                  key={idea}
                  onClick={() => setDraft(idea)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left text-xs text-white/70 transition hover:border-[#ff1372]/40 hover:text-white xl:px-4 xl:py-3"
                >
                  {idea}
                </button>
              ))}
            </div>
          </section>

          <Separator className="bg-white/5" />

          <section>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
                  Quick actions
                </h3>
                <p className="mt-1 text-xs text-white/60">
                  Rapid adjustments across the entire roster.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              {quickActions.slice(0, 4).map((action) => (
                <Button
                  key={action.id}
                  variant="secondary"
                  className="justify-start rounded-lg bg-white/5 text-xs text-white/70 hover:bg-[#ff1372]/15 hover:text-white"
                  onClick={() => void executeAction(action.id)}
                >
                  <Lightning size={14} className="mr-2 text-[#ff1372]" />
                  <div>
                    <div className="font-semibold text-white">{action.label}</div>
                    {action.description && (
                      <p className="text-[10px] text-white/50">{action.description}</p>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </section>

          <Separator className="bg-white/5" />

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
              Suggested prompts
            </h3>
            <div className="mt-3 grid gap-2">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setDraft(prompt)}
                  className="rounded-lg border border-white/10 bg-transparent px-3 py-2 text-left text-xs text-white/60 transition hover:border-[#ff1372]/30 hover:text-white"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </section>
        </div>
      </ScrollArea>

      <footer className="border-t border-white/5 px-4 py-4 flex-shrink-0 xl:px-6">
        <ScrollArea className="h-40 rounded-xl border border-white/10 bg-white/5 p-3 xl:h-52 xl:p-4">
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                    message.sender === 'user'
                      ? 'bg-[#ff1372] text-white'
                      : 'border border-white/10 bg-[#0f0f15] text-white/70'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="rounded-lg border border-dashed border-white/10 bg-transparent p-4 text-center text-xs text-white/50">
                Ask me for a scenario, a new girl, or how to raise her stats today.
              </div>
            )}
            {isResponding && (
              <div className="text-center text-[10px] uppercase tracking-[0.3em] text-white/40">
                Thinking…
              </div>
            )}
          </div>
        </ScrollArea>

        <form
          className="mt-3 flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSend();
          }}
        >
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask the manager for a scene, stat boost, or new girl…"
            className="rounded-xl border-white/10 bg-white/5 text-xs text-white placeholder:text-white/40"
          />
          <Button
            type="submit"
            disabled={!draft.trim() || isResponding}
            className="rounded-xl bg-[#ff1372] text-white hover:bg-[#ff1372]/90"
          >
            <PaperPlaneRight size={16} className="mr-1" />
            Send
          </Button>
        </form>
      </footer>
    </div>
  );
}
