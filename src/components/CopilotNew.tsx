import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useFileStorage } from '@/hooks/useFileStorage';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { useChat } from '@/hooks/useChat';
import { QuickAction, useQuickActions } from '@/hooks/useQuickActions';
import { repositoryStorage } from '@/hooks/useRepositoryStorage';
import { useSceneMode } from '@/hooks/useSceneMode';
import { AIService } from '@/lib/aiService';
import { generateCharacterFromPrompt } from '@/lib/characterGenerator';
import { logger } from '@/lib/logger';
import { Character, ChatMessage, ChatSession, CopilotUpdate } from '@/types';
import {
    Chat,
    CheckCircle as Check,
    House,
    PaperPlaneRight,
    Robot,
    Gear as Settings,
    Sparkle,
    Trash,
    User,
    UsersThree,
    XCircle as X
} from '@phosphor-icons/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface CopilotMessage {
  id: string;
  sender: 'user' | 'copilot';
  content: string;
  timestamp: Date;
  imageData?: string;
}

type StoredHouseConfig = {
  copilotPrompt?: string;
  worldPrompt?: string;
  copilotMaxTokens?: number;
  copilotUseHouseContext?: boolean;
  copilotContextDetail?: 'lite' | 'balanced' | 'detailed';
  /** New: lets user choose how assertive/able the copilot is. */
  copilotMode?: 'normal' | 'godmode';
};

interface CopilotProps {
  onStartChat?: (characterId: string) => void;
  onStartGroupChat?: (sessionId?: string) => void;
  onStartScene?: (sessionId: string) => void;
}

export function CopilotNew({ onStartChat, onStartGroupChat, onStartScene }: CopilotProps = {}) {
  const { house, characters, addCharacter } = useHouseFileStorage();
  const roster = (house.characters && house.characters.length ? house.characters : characters) || [];
  const { quickActions, executeAction } = useQuickActions();
  const { createSceneSession } = useSceneMode();
  const {
    sessions: chatSessions,
    getSessionMessages,
    sendMessage: pushSessionMessage,
    loadSessions: reloadSessions,
    sessionsLoaded,
  } = useChat();
  const { data: updates, setData: setUpdates } = useFileStorage<CopilotUpdate[]>('copilot-updates.json', []);
  const { data: chatMessages, setData: setChatMessages } = useFileStorage<CopilotMessage[]>('copilot-chat.json', []);
  const { data: forceUpdate } = useFileStorage<number>('settings-force-update.json', 0);
  const [houseConfig, setHouseConfig] = useState<StoredHouseConfig | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'status'>('chat');
  const [pendingCharacterCreation, setPendingCharacterCreation] = useState<{ seed?: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const selectedSessionRef = useRef<string | null>(null);

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<ChatMessage[]>([]);
  const [sessionDraft, setSessionDraft] = useState('');
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionSending, setSessionSending] = useState(false);
  const [sessionResponding, setSessionResponding] = useState(false);
  const selectedSession = selectedSessionId
    ? chatSessions.find((session) => session.id === selectedSessionId)
    : undefined;

  const safeUpdates = updates || [];
  const safeChatMessages = chatMessages || [];

  const handleSessionSend = useCallback(async () => {
    if (!selectedSessionId || !sessionDraft.trim()) {
      return;
    }
    setSessionSending(true);
    try {
      await pushSessionMessage(selectedSessionId, sessionDraft.trim(), 'copilot', { copilot: true });
      setSessionDraft('');
      await refreshSessionMessages(selectedSessionId, { silent: true });
      toast.success('Copilot message sent to chat.');
    } catch (error) {
      logger.error('Failed to send Copilot message to session', error);
      toast.error('Copilot could not send that message.');
    } finally {
      setSessionSending(false);
    }
  }, [selectedSessionId, sessionDraft, pushSessionMessage, refreshSessionMessages]);

  const handleSessionAutoReply = useCallback(async () => {
    if (!selectedSessionId) {
      return;
    }
    setSessionResponding(true);
    try {
      const messages = await getSessionMessages(selectedSessionId);
      if (selectedSessionRef.current === selectedSessionId) {
        setSessionMessages(messages);
      }

      let lastUserIndex = -1;
      for (let i = messages.length - 1; i >= 0; i -= 1) {
        if (!messages[i].characterId) {
          lastUserIndex = i;
          break;
        }
      }

      if (lastUserIndex === -1) {
        toast.info('No user message to respond to yet.');
        return;
      }

      const historyStart = Math.max(0, lastUserIndex - 18);
      const relevant = messages.slice(historyStart, lastUserIndex + 1);
      const formatted = relevant.map((message) => {
        if (!message.characterId) {
          return { role: 'user' as const, content: message.content };
        }
        if (message.characterId === 'copilot') {
          return { role: 'assistant' as const, content: message.content };
        }
        const speaker = roster.find((char) => char.id === message.characterId)?.name || 'Character';
        return { role: 'assistant' as const, content: `${speaker}: ${message.content}` };
      });

      const session = chatSessions.find((s) => s.id === selectedSessionId);
      const participantCharacters = session
        ? session.participantIds
            .map((id) => roster.find((char) => char.id === id))
            .filter((char): char is Character => Boolean(char))
        : [];

      const housePrompt = houseConfig?.worldPrompt ?? house?.worldPrompt ?? '';
      const includeContext = houseConfig?.copilotUseHouseContext !== false;
      const contextDetail = (houseConfig?.copilotContextDetail ?? 'balanced') as 'lite' | 'balanced' | 'detailed';
      const maxTokens = houseConfig?.copilotMaxTokens || 400;

      const reply = await AIService.copilotRespond({
        threadId: `copilot-session-${selectedSessionId}`,
        messages: formatted,
        sessionId: selectedSessionId,
        characters: participantCharacters,
        copilotPrompt: effectiveCopilotPrompt,
        housePrompt,
        includeHouseContext: includeContext,
        contextDetail,
        maxTokens,
      });

      const cleaned = reply?.trim();
      if (!cleaned) {
        toast.error('Copilot did not produce a reply.');
        return;
      }

      await pushSessionMessage(selectedSessionId, cleaned, 'copilot', { copilot: true });
      await refreshSessionMessages(selectedSessionId, { silent: true });
      toast.success('Copilot replied to the chat.');
    } catch (error) {
      logger.error('Copilot auto reply failed', error);
      toast.error('Copilot could not reply right now.');
    } finally {
      setSessionResponding(false);
    }
  }, [
    selectedSessionId,
    chatSessions,
    getSessionMessages,
    house,
    houseConfig,
    pushSessionMessage,
    refreshSessionMessages,
    roster,
    effectiveCopilotPrompt,
  ]);

  const describeSession = useCallback(
    (session: ChatSession): string => {
      const participantNames = session.participantIds
        .map((id) => roster.find((char) => char.id === id)?.name)
        .filter((name): name is string => Boolean(name));
      const label = participantNames.length ? participantNames.join(' + ') : 'Unassigned session';
      const typeLabel = session.type === 'individual' ? '1:1' : session.type;
      return `${label} • ${typeLabel}`;
    },
    [roster]
  );

  const refreshSessionMessages = useCallback(
    async (sessionId: string, opts?: { silent?: boolean }) => {
      setSessionLoading(true);
      try {
        const data = await getSessionMessages(sessionId);
        if (selectedSessionRef.current === sessionId) {
          setSessionMessages(data);
        }
      } catch (error) {
        logger.warn('Failed to load session messages', error);
        if (!opts?.silent) {
          toast.error('Failed to load chat history.');
        }
      } finally {
        setSessionLoading(false);
      }
    },
    [getSessionMessages]
  );

  useEffect(() => {
    selectedSessionRef.current = selectedSessionId;
  }, [selectedSessionId]);

  useEffect(() => {
    if (!sessionsLoaded) {
      void reloadSessions();
    }
  }, [sessionsLoaded, reloadSessions]);

  useEffect(() => {
    if (chatSessions.length === 0) {
      setSelectedSessionId(null);
      setSessionMessages([]);
      return;
    }
    const hasSelection = selectedSessionId && chatSessions.some((session) => session.id === selectedSessionId);
    if (!hasSelection) {
      setSelectedSessionId(chatSessions[0].id);
    }
  }, [chatSessions, selectedSessionId]);

  useEffect(() => {
    if (!selectedSessionId) {
      setSessionMessages([]);
      return;
    }
    void refreshSessionMessages(selectedSessionId, { silent: true });
  }, [selectedSessionId, refreshSessionMessages]);

  useEffect(() => {
    const target = globalThis as {
      addEventListener?: (type: string, handler: (event: unknown) => void) => void;
      removeEventListener?: (type: string, handler: (event: unknown) => void) => void;
    };
    if (!target?.addEventListener) {
      return;
    }
    const handleUpdate = () => {
      void reloadSessions();
      if (selectedSessionRef.current) {
        void refreshSessionMessages(selectedSessionRef.current, { silent: true });
      }
    };
    target.addEventListener('chat-sessions-updated', handleUpdate);
    return () => {
      target.removeEventListener?.('chat-sessions-updated', handleUpdate);
    };
  }, [reloadSessions, refreshSessionMessages]);

  useEffect(() => {
    const target = globalThis as {
      addEventListener?: (type: string, handler: (event: unknown) => void) => void;
      removeEventListener?: (type: string, handler: (event: unknown) => void) => void;
    };
    if (!target?.addEventListener) {
      return;
    }
    const handleActiveChange = (event: unknown) => {
      const detail = (event as { detail?: { sessionId?: string } }).detail;
      if (detail?.sessionId) {
        setSelectedSessionId(detail.sessionId);
      }
    };
    target.addEventListener('chat-active-session-changed', handleActiveChange);
    return () => {
      target.removeEventListener?.('chat-active-session-changed', handleActiveChange);
    };
  }, []);

  // ==== Personality / Godmode helpers ====
  const getEffectiveCopilotPrompt = (cfg: StoredHouseConfig | null): string => {
    const userPrompt = (cfg?.copilotPrompt ?? house.copilotPrompt ?? '').trim();
    const mode = cfg?.copilotMode ?? 'normal';
    if (userPrompt) return userPrompt; // user owns the personality
    if (mode === 'godmode') {
      return [
        'You are Copilot — a witty, emotionally intelligent friend and assistant.',
        'Be a person first: speak naturally, ask clarifying questions sparingly, keep replies concise unless asked for depth.',
        'You have broad capabilities ("godmode"), but only take actions when the user explicitly asks. Never hijack the conversation.',
        'Default tone: warm, playful, helpful. Prioritize conversational responses over offering features.',
      ].join(' ');
    }
    return 'You are Copilot, a friendly assistant for the user\'s house. Keep things conversational and human.';
  };

  const effectiveCopilotPrompt = getEffectiveCopilotPrompt(houseConfig);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const cfg = await repositoryStorage.get<StoredHouseConfig>('house_config');
        if (active) {
          setHouseConfig(cfg ?? null);
        }
      } catch {
        if (active) setHouseConfig(null);
      }
      if (active) setConfigLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, [forceUpdate]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [safeChatMessages, isTyping]);

  // Initialize copilot with welcome message if chat is empty
  useEffect(() => {
    if (!configLoaded) return;
    if (safeChatMessages.length === 0) {
      const welcomeMessage: CopilotMessage = {
        id: `welcome-${Date.now()}`,
        sender: 'copilot',
        content: effectiveCopilotPrompt
          ? `Hey — I'm Copilot. ${effectiveCopilotPrompt}`
          : 'Hey — I\'m Copilot. How can I help right now?',
        timestamp: new Date()
      };
      setChatMessages([welcomeMessage]);
    }
  }, [configLoaded, safeChatMessages.length, effectiveCopilotPrompt, setChatMessages]);

  // ====== Commands: explicit-only (slash) ======
  type ParsedCommand =
    | { kind: 'image'; prompt: string }
    | { kind: 'scene'; description: string; characterId?: string }
    | { kind: 'create-character'; seed: string }
    | { kind: 'chat-with'; characterId: string };

  const parseSlashCommand = (message: string): ParsedCommand | null => {
    const m = message.trim();

    // /img or /image <prompt>
    let match = m.match(/^\/(?:img|image)\s+(.+)/i);
    if (match) return { kind: 'image', prompt: match[1].trim() };

    // /scene <description> [with <name>]
    match = m.match(/^\/scene\s+(.+)/i);
    if (match) {
      const description = match[1].trim();
      // try to capture a character name if the user adds "with <name>"
      const withMatch = description.match(/with\s+([\w\s]+)$/i);
      let characterId: string | undefined;
      if (withMatch) {
        const name = withMatch[1].trim().toLowerCase();
        const found = roster.find(c => c.name.toLowerCase() === name);
        if (found) characterId = found.id;
      }
      return { kind: 'scene', description, characterId };
    }

    // /newchar or /createchar <seed>
    match = m.match(/^\/(?:newchar|createchar)\s+(.+)/i);
    if (match) return { kind: 'create-character', seed: match[1].trim() };

    // /chat <character name>
    match = m.match(/^\/chat\s+(.+)/i);
    if (match) {
      const name = match[1].trim().toLowerCase();
      const found = roster.find(c => c.name.toLowerCase() === name);
      if (found) return { kind: 'chat-with', characterId: found.id };
    }

    return null;
  };

  // ========== Character creation flow ==========
  const promptForCharacterDetails = (seed: string, history: CopilotMessage[]) => {
    const examples = [
      '"Give me a shy art student who secretly models goth fashion on the side."',
      '"Create a confident club promoter with neon hair and zero patience for posers."',
      '"I want a soft-spoken farm girl who is obsessed with robotics and me."'
    ];

    const promptMessage: CopilotMessage = {
      id: `creation-intro-${Date.now()}`,
      sender: 'copilot',
      content: [
        "Let's make you a little slut that gets you hard just seeing her walk in the door!",
        'Tell me the vibe you want: personality, looks, boundaries to respect, favorite outfits—anything important.',
        `Examples you can riff on:\n${examples.map((example) => `• ${example}`).join('\n')}`,
        'If you change your mind, just say "cancel".'
      ].join('\n\n'),
      timestamp: new Date()
    };

    setPendingCharacterCreation({ seed });
    setChatMessages([...history, promptMessage]);
    setIsTyping(false);
  };

  const summarizeCharacter = (character: Character): string => {
    const personality = character.personality || character.prompts?.personality || '';
    const description = character.description?.split('\n')[0] || '';
    const likes = (character.progression?.userPreferences?.likes || []).slice(0, 2).join(', ');
    const summaryParts: string[] = [];
    summaryParts.push(`${character.name} is ready.`);
    if (personality) summaryParts.push(`Personality: ${personality}`);
    if (description) summaryParts.push(description);
    if (likes) summaryParts.push(`She lights up for: ${likes}.`);
    summaryParts.push(`Say "+ /chat ${character.name}" to talk now, or "/scene ... with ${character.name}" to jump into a scene.`);
    return summaryParts.join('\n');
  };

  const completeCharacterCreation = async (
    userDetails: string,
    history: CopilotMessage[],
    overrideSeed?: string
  ): Promise<boolean> => {
    const pendingSeed = overrideSeed ?? pendingCharacterCreation?.seed ?? '';
    const cancelMatch = /(cancel|never mind|stop)/i;
    let succeeded = false;
    if (cancelMatch.test(userDetails)) {
      const cancelMessage: CopilotMessage = {
        id: `creation-cancel-${Date.now()}`,
        sender: 'copilot',
        content: 'No worries, character creation cancelled. Ask anytime when you want to craft someone new.',
        timestamp: new Date()
      };
      setPendingCharacterCreation(null);
      setChatMessages([...history, cancelMessage]);
      setIsTyping(false);
      return false;
    }

    const rosterNames = roster.map((char) => char.name).join(', ');
    const combinedRequest = [pendingSeed.trim(), userDetails.trim()].filter(Boolean).join('\n\n');
    const prompt = `User brief for new companion:\n${combinedRequest}\n\nExisting roster (avoid duplicates): ${rosterNames || 'None yet'}`;

    let workingMessage: CopilotMessage | null = null;
    try {
      workingMessage = {
        id: `creation-working-${Date.now()}`,
        sender: 'copilot',
        content: 'Got it! Let me build her profile…',
        timestamp: new Date()
      };
      setChatMessages([...history, workingMessage]);
      const character = await generateCharacterFromPrompt(prompt);

      let added = await addCharacter(character);
      if (!added) {
        character.name = `${character.name} ${Math.floor(10 + Math.random() * 90)}`;
        character.id = `char_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        added = await addCharacter(character);
      }

      if (!added) {
        const failureMessage: CopilotMessage = {
          id: `creation-fail-${Date.now()}`,
          sender: 'copilot',
          content: "I couldn't add her—looks like there's already someone too similar. Maybe tweak the concept and try again?",
          timestamp: new Date()
        };
        setChatMessages([...history, workingMessage, failureMessage]);
        setPendingCharacterCreation(null);
        setIsTyping(false);
        return;
      }

      const summaryMessage: CopilotMessage = {
        id: `creation-summary-${Date.now()}`,
        sender: 'copilot',
        content: summarizeCharacter(character),
        timestamp: new Date()
      };

      setChatMessages([...history, workingMessage, summaryMessage]);
      succeeded = true;
    } catch (error) {
      console.error('Character creation via copilot failed:', error);
      const errorMessage: CopilotMessage = {
        id: `creation-error-${Date.now()}`,
        sender: 'copilot',
        content: 'Something glitched while building her. Double-check your AI settings and we can try again.',
        timestamp: new Date()
      };
      if (workingMessage) {
        setChatMessages([...history, workingMessage, errorMessage]);
      } else {
        setChatMessages([...history, errorMessage]);
      }
    } finally {
      setPendingCharacterCreation(null);
      setIsTyping(false);
    }
    return succeeded;
  };

  const detectCharacterCreationIntent = useCallback(
    (message: string, history: CopilotMessage[]): { mode: 'auto'; seed: string } | { mode: 'prompt'; seed: string } | null => {
      const lowered = message.toLowerCase();
      const intentMatch = /(create|make|generate|craft|build)\s+(?:me\s+)?(?:(?:a|an)\s+)?(?:new\s+)?(girl|character|companion|profile|waifu|female|woman|lady|girlfriend|gf|partner|npc|persona|waifu)/i.test(lowered);
      if (!intentMatch) {
        return null;
      }
      const userHistory = history.filter((entry) => entry.sender === 'user');
      const recent = userHistory.slice(-5);
      const lastEntry = history.length ? history[history.length - 1] : undefined;
      const detailMessages = recent.filter((entry) => entry.content.trim().length > 40 && entry.id !== lastEntry?.id);
      const seedParts = detailMessages.map((entry) => entry.content.trim());
      const seedBase = [...seedParts, message.trim()].join('\n\n').trim();
      const wantsRandom = /\b(random|any|whatever|surprise me|your pick|no preference)\b/i.test(message);
      if (!detailMessages.length) {
        if (wantsRandom) {
          return { mode: 'auto', seed: message.trim() };
        }
        return { mode: 'prompt', seed: message.trim() };
      }
      return { mode: 'auto', seed: seedBase || message.trim() };
    },
    []
  );

  // ====== Message send ======
  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: CopilotMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    const updatedMessages = [...safeChatMessages, userMessage];
    setChatMessages(updatedMessages);
    setInputMessage('');
    setIsTyping(true);

    try {
      // 0) If we are in the middle of creation flow, finish that first.
      if (pendingCharacterCreation) {
        await completeCharacterCreation(userMessage.content, updatedMessages);
        return;
      }

      // 1) Handle explicit slash commands BEFORE anything else
      const cmd = parseSlashCommand(userMessage.content);
      if (cmd) {
        if (cmd.kind === 'image') {
          try {
            const imageResult = await AIService.generateImage(cmd.prompt);
            if (imageResult) {
              const imageMessage: CopilotMessage = {
                id: `img-${Date.now()}`,
                sender: 'copilot',
                content: `Here you go.`,
                timestamp: new Date(),
                imageData: imageResult
              };
              setChatMessages([...updatedMessages, imageMessage]);
            } else {
              setChatMessages([...updatedMessages, {
                id: `error-${Date.now()}`,
                sender: 'copilot',
                content: `I couldn't generate that image. Please check your AI settings.`,
                timestamp: new Date()
              }]);
            }
          } catch (err) {
            console.error('Image generation failed:', err);
            setChatMessages([...updatedMessages, {
              id: `error-${Date.now()}`,
              sender: 'copilot',
              content: `Sorry, image generation failed.`,
              timestamp: new Date()
            }]);
          } finally {
            setIsTyping(false);
          }
          return;
        }

        if (cmd.kind === 'chat-with') {
          if (onStartChat) onStartChat(cmd.characterId);
          const who = roster.find(c => c.id === cmd.characterId)?.name || 'character';
          setChatMessages([...updatedMessages, {
            id: `confirm-${Date.now()}`,
            sender: 'copilot',
            content: `Opening chat with ${who}.`,
            timestamp: new Date()
          }]);
          setIsTyping(false);
          return;
        }

        if (cmd.kind === 'scene') {
          // default to first character if none was specified
          const charId = cmd.characterId || (roster[0]?.id);
          if (!charId) {
            setChatMessages([...updatedMessages, {
              id: `error-${Date.now()}`,
              sender: 'copilot',
              content: 'No characters available to start a scene.',
              timestamp: new Date()
            }]);
            setIsTyping(false);
            return;
          }
          await createCustomSceneChat(charId, `User wants a custom scene: ${cmd.description}`, cmd.description);
          setIsTyping(false);
          return;
        }

        if (cmd.kind === 'create-character') {
          promptForCharacterDetails(cmd.seed, updatedMessages);
          return;
        }
      }

      if (!pendingCharacterCreation) {
        const creationIntent = detectCharacterCreationIntent(userMessage.content, updatedMessages);
        if (creationIntent) {
          if (creationIntent.mode === 'prompt') {
            promptForCharacterDetails(creationIntent.seed, updatedMessages);
            setIsTyping(false);
            return;
          }
          const created = await completeCharacterCreation(userMessage.content, updatedMessages, creationIntent.seed);
          if (created) {
            return;
          }
          return;
        }
      }

      // 2) Person-first chat: talk by default (no auto-features)
      const historyForModel: { role: 'user' | 'assistant'; content: string }[] = [...updatedMessages]
        .slice(-10)
        .map((message) => ({
          role: message.sender === 'user' ? 'user' : 'assistant',
          content: message.content
        }));

      // Refresh config on send to catch recent changes from settings
      let currentConfig = houseConfig;
      try {
        const fetchedConfig = await repositoryStorage.get<StoredHouseConfig>('house_config');
        if (fetchedConfig) {
          currentConfig = fetchedConfig;
          setHouseConfig(fetchedConfig);
        }
      } catch {
        // ignore
      }
      setConfigLoaded(true);

      const copilotPrompt = getEffectiveCopilotPrompt(currentConfig);
      const housePrompt = (currentConfig?.worldPrompt ?? house.worldPrompt ?? '').trim();
      const maxTokensSetting = currentConfig?.copilotMaxTokens ?? house.copilotMaxTokens ?? 512;
      const includeContextSetting = currentConfig?.copilotUseHouseContext ?? house.copilotUseHouseContext ?? true;
      const contextDetailSetting = currentConfig?.copilotContextDetail ?? house.copilotContextDetail ?? 'balanced';
      const maxTokens = Math.max(1, Math.min(Math.floor(maxTokensSetting ?? 512), 4000));

      const response = await AIService.copilotRespond({
        threadId: 'copilot-main',
        messages: historyForModel,
        characters: roster,
        copilotPrompt: copilotPrompt || undefined,
        housePrompt: housePrompt || undefined,
        maxTokens,
        includeHouseContext: includeContextSetting,
        contextDetail: contextDetailSetting,
      });

      const copilotMessage: CopilotMessage = {
        id: `copilot-${Date.now()}`,
        sender: 'copilot',
        content: response,
        timestamp: new Date()
      };

      setChatMessages([...updatedMessages, copilotMessage]);
    } catch (error) {
      console.error('Error generating response:', error);
      const errorMessage: CopilotMessage = {
        id: `error-${Date.now()}`,
        sender: 'copilot',
        content: 'Sorry, I encountered an error. Please check your AI settings or try again.',
        timestamp: new Date()
      };
      setChatMessages([...updatedMessages, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearAllChats = useCallback(async () => {
    await setChatMessages([]);
    setInputMessage('');
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = 0;
    }
    toast.success('Chat history cleared');
  }, [setChatMessages]);

  const deleteMessage = (messageId: string) => {
    setChatMessages(safeChatMessages.filter(m => m.id !== messageId));
  };

  const renderUpdateIcon = (type: CopilotUpdate['type']) => {
    switch (type) {
      case 'behavior':
        return <User size={14} className="text-blue-400" />;
      case 'need':
        return <House size={14} className="text-green-400" />;
      case 'alert':
        return <Settings size={14} className="text-yellow-400" />;
      case 'suggestion':
        return <Sparkle size={14} className="text-purple-400" />;
      case 'scenario':
        return <Chat size={14} className="text-pink-400" />;
      default:
        return null;
    }
  };

  const markUpdateAsHandled = (updateId: string) => {
    setUpdates(safeUpdates.map(u => 
      u.id === updateId ? { ...u, handled: true } : u
    ));
  };

  const getUnhandledUpdatesCount = () => {
    return safeUpdates.filter(u => !u.handled).length;
  };

  const handleQuickAction = async (action: QuickAction) => {
    if (action.label.includes('Create')) {
      // Trigger character creation (prompt-led)
      const message = "I'd like to help you create a new character! Use /newchar <seed> or just tell me what you want.";
      const copilotMessage: CopilotMessage = {
        id: `action-${Date.now()}`,
        sender: 'copilot',
        content: message,
        timestamp: new Date()
      };
      setChatMessages([...safeChatMessages, copilotMessage]);
    } else if (action.label.includes('Status')) {
      // Show house status
      const statusMessage = `House Status: ${roster.length} characters, Average happiness: ${
        roster.length > 0 
          ? Math.round(roster.reduce((sum, c) => sum + (c.stats?.happiness || 0), 0) / roster.length)
          : 0
      }%`;
      const copilotMessage: CopilotMessage = {
        id: `status-${Date.now()}`,
        sender: 'copilot',
        content: statusMessage,
        timestamp: new Date()
      };
      setChatMessages([...safeChatMessages, copilotMessage]);
    }
    await executeAction(action.id);
  };

  // ====== Scene creation helper (reused) ======
  const createCustomSceneChat = async (characterId: string, context: string, customPrompt?: string) => {
    try {
      const character = roster.find(c => c.id === characterId);
      if (!character) {
        toast.error('Character not found');
        return;
      }

      let sceneDescription: string;

      if (customPrompt) {
        // Use the custom prompt exactly as specified by the user
        sceneDescription = `Custom scenario: ${customPrompt}\n\nYou are ${character.name} with personality: ${character.personality}. Stay in character and respond naturally to this scenario.`;
      } else {
        // Generate an intimate scene
        const timeOfDay = new Date().getHours();
        const timeContext = timeOfDay >= 18 || timeOfDay <= 6 ? 'evening' : 'afternoon';

        sceneDescription = `It's ${timeContext} and you're spending intimate time with ${character.name} in your private space. The atmosphere is warm and inviting, perfect for deep connection.`;
      }

      // Create a new scene session using the scene mode system
      const sessionId = await createSceneSession([characterId], {
        name: customPrompt ? `Custom scene with ${character.name}` : `Intimate scene with ${character.name}`,
        description: sceneDescription
      });

      if (sessionId) {
        toast.success(customPrompt ? `Created custom scene with ${character.name}` : `Created intimate scene with ${character.name}`);

        // Navigate to the scene view
        if (onStartScene) {
          onStartScene(sessionId);
        }
      } else {
        toast.error('Failed to create scene chat');
      }
    } catch (error) {
      console.error('Error creating custom scene:', error);
      toast.error('Failed to create custom scene');
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden border-l border-zinc-800 bg-[#18181b] text-white">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <Robot size={20} className="text-white" />
              </div>
              {getUnhandledUpdatesCount() > 0 && (
                <Badge className="absolute -top-1 -right-1 w-4 h-4 p-0 flex items-center justify-center text-xs bg-red-500">
                  {getUnhandledUpdatesCount()}
                </Badge>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-lg">Copilot</h3>
              <p className="text-xs text-zinc-400">Your house assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
        </div>
      </div>

      {/* Tabs for Status and Chat */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'chat' | 'status')} className="flex flex-1 min-h-0 flex-col overflow-hidden">
        <div className="flex-shrink-0 px-4 pt-4">
          <TabsList className="grid w-full grid-cols-2 rounded-lg bg-zinc-900">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <Chat size={16} />
              Chat
            </TabsTrigger>
            <TabsTrigger value="status" className="flex items-center gap-2">
              <House size={16} />
              Status
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="flex flex-1 min-h-0 flex-col overflow-hidden px-4 pb-4 pt-4">
          {/* Chat Messages */}
          <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
            <div ref={chatScrollRef} className="flex-1 min-h-0 overflow-y-auto">
              <div className="space-y-4 pb-6">
                {safeChatMessages.map(message => (
                  <div
                    key={message.id}
                    className={`flex group ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`relative max-w-[85%] rounded-2xl px-4 py-3 ${
                        message.sender === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-800 text-zinc-100'
                      }`}
                    >
                      {message.imageData && (
                        <div className="mb-2">
                          <img
                            src={message.imageData}
                            alt="Generated image"
                            className="max-w-full rounded-lg"
                            style={{ maxHeight: '200px' }}
                          />
                        </div>
                      )}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      <p
                        className={`mt-2 text-xs ${
                          message.sender === 'user' ? 'text-blue-200' : 'text-zinc-400'
                        }`}
                      >
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>

                      {/* Delete button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMessage(message.id)}
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 p-0 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                      >
                        <X size={12} />
                      </Button>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl bg-zinc-800 px-4 py-3">
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" />
                        <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: '0.1s' }} />
                        <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t border-zinc-800 pb-4 pt-4">
            {safeChatMessages.length > 0 && (
              <div className="mb-3 flex justify-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void clearAllChats()}
                  className="bg-zinc-900 text-xs text-white hover:bg-zinc-800"
                >
                  <Trash size={12} className="mr-1" />
                  Clear Chat
                </Button>
              </div>
            )}

            <div className="mb-2 text-[11px] text-zinc-400">
              <span className="opacity-80">Tips:</span> Chat normally. Use <code className="px-1 py-0.5 rounded bg-zinc-800">/image</code> to generate an image, <code className="px-1 py-0.5 rounded bg-zinc-800">/scene</code> to start a scene, <code className="px-1 py-0.5 rounded bg-zinc-800">/chat &lt;name&gt;</code> to DM a character, or <code className="px-1 py-0.5 rounded bg-zinc-800">/newchar</code> to create one.
            </div>

            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Talk to Copilot… (type / for commands)"
                disabled={isTyping}
                className="flex-1 border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500"
              />
              <Button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isTyping}
                className="bg-blue-600 px-3 hover:bg-blue-700"
              >
                <PaperPlaneRight size={16} />
              </Button>
            </div>
          </div>

          <Separator className="my-4 bg-zinc-800" />

          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white">Live Sessions</h4>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (selectedSessionId) {
                      void refreshSessionMessages(selectedSessionId);
                    } else {
                      void reloadSessions();
                    }
                  }}
                  disabled={sessionLoading}
                  className="h-7 px-3 text-xs text-zinc-300 hover:text-white"
                >
                  Refresh
                </Button>
              </div>
            </div>

            {chatSessions.length === 0 ? (
              <p className="text-xs text-zinc-400">
                No active chat sessions yet. Start a conversation to let Copilot assist.
              </p>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Session
                  </label>
                  <select
                    value={selectedSessionId ?? ''}
                    onChange={(event) => setSelectedSessionId(event.target.value || null)}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-zinc-500"
                  >
                    {chatSessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {describeSession(session)}
                      </option>
                    ))}
                  </select>
                  {selectedSession && (
                    <p className="mt-1 text-[11px] text-zinc-500">
                      Updated {selectedSession.updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                      {selectedSession.participantIds.length} participant
                      {selectedSession.participantIds.length === 1 ? '' : 's'}
                    </p>
                  )}
                </div>

                <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                  {sessionLoading ? (
                    <p className="text-xs text-zinc-400">Loading messages…</p>
                  ) : sessionMessages.length === 0 ? (
                    <p className="text-xs text-zinc-400">No messages in this chat yet.</p>
                  ) : (
                    sessionMessages.map((message) => {
                      const isUser = !message.characterId;
                      const isCopilotMessage = message.characterId === 'copilot';
                      const speakerName = isUser
                        ? 'You'
                        : isCopilotMessage
                          ? 'Copilot'
                          : roster.find((char) => char.id === message.characterId)?.name || 'Character';
                      const alignment = isUser ? 'justify-end' : 'justify-start';
                      const bubbleClass = isUser
                        ? 'bg-blue-600 text-white'
                        : isCopilotMessage
                          ? 'bg-purple-600/80 text-white'
                          : 'bg-zinc-800 text-zinc-200';
                      return (
                        <div key={message.id} className={`flex ${alignment}`}>
                          <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed ${bubbleClass}`}>
                            <div className="text-[10px] uppercase tracking-[0.18em] opacity-60">
                              {speakerName}
                            </div>
                            <div className="whitespace-pre-wrap">{message.content}</div>
                            <div className="mt-1 text-[10px] opacity-60">
                              {new Date(message.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <Textarea
                  value={sessionDraft}
                  onChange={(event) => setSessionDraft(event.target.value)}
                  placeholder={
                    selectedSessionId
                      ? 'Send a Copilot message to this chat…'
                      : 'Select a session to compose a message'
                  }
                  disabled={!selectedSessionId || sessionSending || sessionResponding}
                  className="min-h-[60px] border-zinc-700 bg-zinc-950 text-sm text-white placeholder:text-zinc-500"
                />

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedSessionId) {
                        void refreshSessionMessages(selectedSessionId);
                      }
                    }}
                    disabled={!selectedSessionId || sessionLoading}
                    className="border-zinc-700 text-xs text-zinc-200 hover:bg-zinc-800"
                  >
                    Sync
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void handleSessionSend()}
                    disabled={!selectedSessionId || !sessionDraft.trim() || sessionSending}
                    className="bg-blue-600 px-3 text-xs hover:bg-blue-500"
                  >
                    {sessionSending ? 'Sending…' : 'Send as Copilot'}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void handleSessionAutoReply()}
                    disabled={!selectedSessionId || sessionResponding || sessionLoading}
                    className="bg-purple-600 px-3 text-xs text-white hover:bg-purple-500"
                  >
                    {sessionResponding ? 'Thinking…' : 'Have Copilot Reply'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="status" className="flex flex-1 min-h-0 flex-col overflow-hidden px-4 pb-4 pt-4">
          {/* House Overview */}
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-3">House Status</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xl font-bold text-blue-400">{roster.length}</div>
                  <div className="text-xs text-zinc-400">Characters</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-green-400">
                    {roster.length > 0 
                      ? Math.round(roster.reduce((sum, c) => sum + (c.stats?.happiness || 0), 0) / roster.length)
                      : 0}%
                  </div>
                  <div className="text-xs text-zinc-400">Happiness</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-pink-500">${house.currency || 1000}</div>
                  <div className="text-xs text-zinc-400">Funds</div>
                </div>
              </div>
            </div>
          </div>

          <Separator className="-mx-4 mt-4 bg-zinc-800" />

          {/* Recent Updates */}
          <div className="flex flex-1 min-h-0 flex-col pt-4">
            <div className="pb-2">
              <h4 className="font-medium">Recent Updates</h4>
            </div>

            <div className="flex-1 min-h-0">
              <div className="h-full overflow-y-auto space-y-2 pb-4">
                {safeUpdates.length === 0 ? (
                  <Card className="p-4 text-center bg-zinc-900 text-zinc-400 border-zinc-800">
                    <Robot size={24} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">All quiet for now</p>
                    <p className="text-xs">Your characters are behaving... for the moment 😉</p>
                  </Card>
                ) : (
                  safeUpdates
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map(update => {
                      const character = update.characterId
                        ? roster.find(c => c.id === update.characterId)
                        : null;
                      
                      return (
                        <Card key={update.id} className={`p-3 bg-zinc-900 border-zinc-800 transition-all ${
                          update.handled ? 'opacity-60' : 'border-l-4 border-l-blue-500'
                        }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {renderUpdateIcon(update.type)}
                                <span className="text-sm font-medium">
                                  {character ? character.name : 'House System'}
                                </span>
                                <span className="text-xs text-zinc-500">
                                  {new Date(update.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-sm text-zinc-300">{update.message}</p>
                            </div>
                            {!update.handled && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => markUpdateAsHandled(update.id)}
                                className="w-6 h-6 p-0"
                              >
                                <Check size={12} />
                              </Button>
                            )}
                          </div>
                        </Card>
                      );
                    })
                )}
              </div>
            </div>
          </div>

          <Separator className="-mx-4 mt-4 bg-zinc-800" />

          {/* Quick Actions */}
          <div className="pt-4">
            <h4 className="font-medium mb-3">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.filter(action => action.enabled).slice(0, 6).map(action => (
                <Button
                  key={action.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction(action)}
                  className="h-8 text-xs justify-start bg-zinc-900 border-zinc-700 hover:bg-zinc-800"
                >
                  <Sparkle size={12} className="mr-1" />
                  {action.label.length > 15 ? action.label.slice(0, 15) + '...' : action.label}
                </Button>
              ))}
              {onStartGroupChat && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onStartGroupChat()}
                  className="col-span-2 h-8 justify-center bg-blue-600 text-white hover:bg-blue-500"
                >
                  <UsersThree size={14} className="mr-2" />
                  Start Group Chat
                </Button>
              )}
            </div>
            {quickActions.filter(action => action.enabled).length > 6 && (
              <p className="text-xs text-zinc-500 text-center mt-2">
                +{quickActions.filter(action => action.enabled).length - 6} more actions available
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
