import { useEffect, useRef, useState } from 'react'
import { useKV } from '@github/spark/hooks'

// adjust paths to match your repo structure (see your screenshot)
import { ChatSession, Character, ChatMessage, SceneObjective } from '../lib/types'
import { useHouse } from './useHouse'           // if your hook lives elsewhere, fix this path
import { AIService } from '../lib/ai'           // you have src/lib/ai.ts, not aiService
import { toast } from 'sonner'

type SessionsSetter = React.Dispatch<React.SetStateAction<ChatSession[]>>

export const useSceneMode = () => {
  const { house } = useHouse()
  const [activeSessions, setActiveSessions] = useKV<ChatSession[]>('scene-sessions', [])
  const [isProcessing, setIsProcessing] = useState(false)

  // keep a live ref so timeouts read fresh state
  const sessionsRef = useRef<ChatSession[]>(activeSessions)
  useEffect(() => {
    sessionsRef.current = activeSessions
  }, [activeSessions])

  const createSceneSession = async (
    characterIds: string[],
    objectives: SceneObjective[],
    context?: string
  ): Promise<string> => {
    const sessionId = `scene_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

    const sceneObjectives: Record<string, string> = {}
    for (const obj of objectives) sceneObjectives[obj.characterId] = obj.objective

    const now = new Date()
    const newSession: ChatSession = {
      id: sessionId,
      type: 'scene',
      participantIds: characterIds,
      messages: [
        {
          id: `msg_${Date.now()}_sys`,
          content: `Scene started with ${characterIds.length} characters. Each character has secret objectives they will try to fulfill.`,
          timestamp: now,
          type: 'system',
        },
      ],
      context,
      active: true,
      sceneObjectives,
      sceneSettings: {
        autoPlay: true,
        turnDuration: 5000,
        maxTurns: 50,
      },
      createdAt: now,
      updatedAt: now,
    }

    setActiveSessions((sessions) => [...sessions, newSession])
    toast.success(`Scene session created (${sessionId.slice(0, 12)})`)

    // kick off autoplay shortly after creation
    setTimeout(() => startAutoPlay(sessionId), 800)
    return sessionId
  }

  const getSession = (sessionId: string): ChatSession | undefined =>
    sessionsRef.current.find((s) => s.id === sessionId)

  const updateSession = (sessionId: string, updater: (s: ChatSession) => ChatSession) => {
    setActiveSessions((sessions) =>
      sessions.map((s) => (s.id === sessionId ? updater(s) : s))
    )
  }

  const endScene = async (sessionId: string) => {
    const now = new Date()
    updateSession(sessionId, (s) => ({
      ...s,
      active: false,
      updatedAt: now,
      messages: [
        ...s.messages,
        {
          id: `msg_${Date.now()}_end`,
          content: 'Scene has ended. Characters have completed their interaction.',
          timestamp: now,
          type: 'system',
        },
      ],
    }))
    toast.info('Scene session ended')
    setIsProcessing(false)
  }

  const pauseScene = async (sessionId: string) => {
    updateSession(sessionId, (s) => ({
      ...s,
      sceneSettings: { ...s.sceneSettings!, autoPlay: false },
      updatedAt: new Date(),
    }))
  }

  const resumeScene = async (sessionId: string) => {
    updateSession(sessionId, (s) => ({
      ...s,
      sceneSettings: { ...s.sceneSettings!, autoPlay: true },
      updatedAt: new Date(),
    }))
    await startAutoPlay(sessionId)
  }

  const addUserMessage = async (sessionId: string, content: string) => {
    const now = new Date()
    updateSession(sessionId, (s) => ({
      ...s,
      messages: [
        ...s.messages,
        { id: `msg_${Date.now()}_user`, content, timestamp: now, type: 'text' },
      ],
      updatedAt: now,
    }))
  }

const processCharacterTurn = async (sessionId: string, characterId: string): Promise<void> => {
  // read fresh session
  let currentSession: ChatSession | undefined;
  setActiveSessions(s => { currentSession = s.find(x => x.id === sessionId); return s; });

  if (!currentSession || !currentSession.active) return;

  const character = house.characters?.find(c => c.id === characterId);
  if (!character) {
    setActiveSessions(s => s.map(sess => sess.id === sessionId ? {
      ...sess,
      messages: [...sess.messages, {
        id: `msg_${Date.now()}_sys_missing`,
        content: `Character ${characterId} not found; skipping turn.`,
        timestamp: new Date(),
        type: 'system'
      }]
    } : sess));
    return;
  }

  const objective = currentSession.sceneObjectives?.[characterId];
  if (!objective) {
    setActiveSessions(s => s.map(sess => sess.id === sessionId ? {
      ...sess,
      messages: [...sess.messages, {
        id: `msg_${Date.now()}_sys_noobj`,
        content: `No objective found for ${character.name}; skipping turn.`,
        timestamp: new Date(),
        type: 'system'
      }]
    } : sess));
    return;
  }

  // Build recent convo context (exclude system msgs)
  const recentMessages = currentSession.messages.slice(-8).filter(m => m.type !== 'system');
  const conversationContext = recentMessages.length
    ? recentMessages.map(m => {
        if (m.characterId) {
          const name = house.characters?.find(c => c.id === m.characterId)?.name ?? 'Character';
          return `${name}: ${m.content}`;
        }
        return `User: ${m.content}`;
      }).join('\n')
    : 'No previous conversation.';

  const others =
    currentSession.participantIds
      .filter(id => id !== characterId)
      .map(id => house.characters?.find(c => c.id === id)?.name)
      .filter(Boolean)
      .join(', ') || 'others';

  const characterPrompt = `
You are ${character.name}.
Personality: ${character.personality}
Secret objective: ${objective}
Scene context: ${currentSession.context || 'A social gathering'}

Participants: ${character.name}, ${others}

Recent conversation:
${conversationContext}

Respond as ${character.name}. Work toward your objective subtly. Keep response to 1–2 sentences.
`.trim();

  try {
    const provider = house.aiSettings?.provider || 'openrouter';
    if (provider !== 'openrouter') {
      throw new Error(`Unsupported AI provider: ${provider}. Only OpenRouter is supported.`);
    }
    if (!house.aiSettings?.apiKey) {
      throw new Error('OpenRouter API key is required. Please configure it in House Settings.');
    }

    const aiService = new AIService(house);
    const response = await aiService.generateResponse(characterPrompt);

    const message: ChatMessage = {
      id: `msg_${Date.now()}_${characterId}`,
      characterId,
      content: response,
      timestamp: new Date(),
      type: 'text'
    };

    setActiveSessions(s => s.map(sess =>
      sess.id === sessionId
        ? { ...sess, messages: [...sess.messages, message], updatedAt: new Date() }
        : sess
    ));
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';

    const errorMsg: ChatMessage = {
      id: `msg_${Date.now()}_autoplay_error`,
      content: `⚠️ Auto-play error for ${character.name}: ${msg}`,
      timestamp: new Date(),
      type: 'system'
    };

    setActiveSessions(s => s.map(sess =>
      sess.id === sessionId
        ? {
            ...sess,
            messages: [...sess.messages, errorMsg],
            updatedAt: new Date(),
            // pause autoplay on config/API errors
            sceneSettings: /api|key|openrouter/i.test(msg)
              ? { ...(sess.sceneSettings ?? {}), autoPlay: false }
              : sess.sceneSettings
          }
        : sess
    ));

    if (/api|key|openrouter/i.test(msg)) {
      toast.error('Scene paused due to API configuration error. Check House Settings.');
    } else {
      toast.error(`Error generating response for ${character.name}: ${msg}`);
    }
  }
};

  const startAutoPlay = async (sessionId: string) => {
    const tick = async () => {
      const session = getSession(sessionId)
      if (!session || !session.active) return setIsProcessing(false)

      if (!session.sceneSettings?.autoPlay) return setIsProcessing(false)

      const spokenTurns = session.messages.filter((m) => m.characterId).length
      const maxTurns = session.sceneSettings?.maxTurns ?? 20
      if (spokenTurns >= maxTurns) return endScene(sessionId)

      const available = session.participantIds.filter((id) =>
        house.characters?.some((c) => c.id === id)
      )
      if (available.length === 0) return endScene(sessionId)

      const randomId = available[Math.floor(Math.random() * available.length)]

      try {
        await processCharacterTurn(sessionId, randomId)
      } finally {
        const fresh = getSession(sessionId)
        const delay = fresh?.sceneSettings?.turnDuration ?? 5000
        setTimeout(tick, delay)
      }
    }

    setIsProcessing(true)
    setTimeout(tick, 1000)
  }

  return {
    activeSessions,
    isProcessing,
    createSceneSession,
    startAutoPlay,
    endScene,
    pauseScene,
    resumeScene,
    addUserMessage,
  }
}
