import { useEffect, useRef, useState, useCallback } from 'react'
import { useSimpleStorage } from './useSimpleStorage';

import { ChatSession, Character, ChatMessage, SceneObjective } from '@/types'
import { useHouse } from './useHouse'           // if your hook lives elsewhere, fix this path
import { AIService } from '@/lib/aiService'           
import { toast } from 'sonner'

export const useSceneMode = () => {
  const { house } = useHouse()
  const [activeSessions, setActiveSessions] = useSimpleStorage<ChatSession[]>('scene-sessions', [])
  const [isProcessing, setIsProcessing] = useState(false)

  // Keep a live copy for timers to read fresh state
  const sessionsRef = useRef<ChatSession[]>(activeSessions)
  useEffect(() => {
    sessionsRef.current = activeSessions
  }, [activeSessions])

  const safeChars: Character[] = Array.isArray(house?.characters) ? (house!.characters as Character[]) : []

  const getSession = (sessionId: string): ChatSession | undefined =>
    sessionsRef.current.find((s) => s.id === sessionId)

  const updateSession = (sessionId: string, updater: (s: ChatSession) => ChatSession) => {
    setActiveSessions((sessions) => sessions.map((s) => (s.id === sessionId ? updater(s) : s)))
  }

  const createSceneSession = async (
    characterIds: string[],
    objectives: SceneObjective[],
    context?: string,
    sceneSettings?: { autoPlay?: boolean; turnDuration?: number; maxTurns?: number }
  ): Promise<string> => {
    const sessionId = `scene_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    console.log('Creating scene session:', { sessionId, characterIds, context: context?.slice(0, 50) });
    
    const sceneObjectives: Record<string, string> = {}
    for (const obj of objectives) sceneObjectives[obj.characterId] = obj.objective

    const now = new Date()
    const newSession: ChatSession = {
      id: sessionId,
      type: 'scene',
      participantIds: characterIds,
      messages: [
        {
          id: `msg_${now.getTime()}_sys`,
          content: `Scene started with ${characterIds.length} characters. Each has a secret objective.`,
          timestamp: now,
          type: 'system',
        },
      ],
      context,
      active: true,
      sceneObjectives,
      sceneSettings: {
        autoPlay: sceneSettings?.autoPlay ?? false,
        turnDuration: sceneSettings?.turnDuration ?? 5000,
        maxTurns: sceneSettings?.maxTurns ?? 50,
      },
      createdAt: now,
      updatedAt: now,
    }

    console.log('New session created:', { id: newSession.id, type: newSession.type });
    setActiveSessions((sessions) => {
      const updated = [...sessions, newSession];
      console.log('Updated sessions count:', updated.length);
      console.log('All session IDs:', updated.map(s => s.id));
      return updated;
    });
    toast.success(`Scene session created (${sessionId.slice(0, 12)})`)

    // Verify session was stored
    setTimeout(() => {
      const stored = JSON.parse(localStorage.getItem('scene-sessions') || '[]');
      const found = stored.find((s: any) => s.id === sessionId);
      console.log('Session storage verification:', { sessionId, found: !!found, totalStored: stored.length });
    }, 100);

    // Generate initial character response for setup
    await processCharacterTurn(sessionId, characterIds[0])

    return sessionId
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
          id: `msg_${now.getTime()}_end`,
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
      sceneSettings: { turnDuration: 5000, ...(s.sceneSettings ?? {}), autoPlay: false },
      updatedAt: new Date(),
    }))
  }

  const resumeScene = async (sessionId: string) => {
    updateSession(sessionId, (s) => ({
      ...s,
      sceneSettings: { turnDuration: 5000, ...(s.sceneSettings ?? {}), autoPlay: true },
      updatedAt: new Date(),
    }))
    await startAutoPlay(sessionId)
  }

  const addUserMessage = async (sessionId: string, content: string, triggerResponse: boolean = false) => {
    const now = new Date()
    updateSession(sessionId, (s) => ({
      ...s,
      messages: [
        ...s.messages,
        { id: `msg_${now.getTime()}_user`, content, timestamp: now, type: 'text' },
      ],
      updatedAt: now,
    }))
    if (triggerResponse) {
      await triggerCharacterResponse(sessionId)
    }
  }

  const processCharacterTurn = async (sessionId: string, characterId: string): Promise<void> => {
    // Read fresh session
    let currentSession: ChatSession | undefined
    setActiveSessions((s) => {
      currentSession = s.find((x) => x.id === sessionId)
      return s
    })

    if (!currentSession || !currentSession.active) return

    const character = safeChars.find((c) => c.id === characterId)
    if (!character) {
      updateSession(sessionId, (s) => ({
        ...s,
        messages: [
          ...s.messages,
          {
            id: `msg_${Date.now()}_sys_missing`,
            content: `Character ${characterId} not found; skipping turn.`,
            timestamp: new Date(),
            type: 'system',
          },
        ],
      }))
      return
    }

    const objective = currentSession.sceneObjectives?.[characterId]
    if (!objective) {
      updateSession(sessionId, (s) => ({
        ...s,
        messages: [
          ...s.messages,
          {
            id: `msg_${Date.now()}_sys_noobj`,
            content: `No objective found for ${character.name}; skipping turn.`,
            timestamp: new Date(),
            type: 'system',
          },
        ],
      }))
      return
    }

    // Build recent conversation (exclude system)
    const recent = currentSession.messages.slice(-8).filter((m) => m.type !== 'system')
    const conversationContext =
      recent.length > 0
        ? recent
            .map((m) => {
              if (m.characterId) {
                const name = safeChars.find((c) => c.id === m.characterId)?.name ?? 'Character'
                return `${name}: ${m.content}`
              }
              return `User: ${m.content}`
            })
            .join('\n')
        : 'No previous conversation.'

    const others =
      currentSession.participantIds
        .filter((id) => id !== characterId)
        .map((id) => safeChars.find((c) => c.id === id)?.name)
        .filter(Boolean)
        .join(', ') || 'others'

    const characterPrompt = `You are ${character.name}, engaging in an intimate roleplay scene.

CHARACTER:
Name: ${character.name}
Appearance: ${character.appearance}
Personality: ${character.personality}
Traits: ${character.traits.join(', ')}
Background: ${character.prompts?.background || 'No specific background'}

STATS:
Love: ${character.stats.love}%, Happiness: ${character.stats.happiness}%, Arousal: ${character.stats.wet}%, Willingness: ${character.stats.willing}%

EXPERIENCE:
Sexual: ${character.progression.sexualExperience}%, Kinks: ${(character.progression.kinks || []).slice(0, 3).join(', ') || 'None'}

GOAL: ${objective}

${currentSession.context ? `SCENE: ${currentSession.context}` : 'Private intimate setting with user.'}

${others ? `OTHERS: ${others}` : 'Alone with user.'}

RECENT CONVERSATION:
${conversationContext}

MEMORIES: ${(character.memories || []).filter(m => m.importance === 'high').slice(0, 2).map(m => `${m.category}: ${m.content}`).join(' | ') || 'No key memories'}

Respond naturally as ${character.name} with your personality and current state. Reference memories when relevant. Keep response to 1-2 sentences.`.trim()

    try {
      const provider = house?.aiSettings?.provider || 'openrouter'
      if (provider !== 'openrouter') {
        throw new Error(`Unsupported AI provider: ${provider}. Only OpenRouter is supported.`)
      }
      if (!house?.aiSettings?.apiKey?.trim()) {
        throw new Error('OpenRouter API key is required. Please configure it in House Settings.')
      }

      const response = await AIService.generateResponse(
        characterPrompt,
        house?.aiSettings?.apiKey,
        house?.aiSettings?.model
      )

      const now = new Date()
      const message: ChatMessage = {
        id: `msg_${now.getTime()}_${characterId}`,
        characterId,
        content: response,
        timestamp: now,
        type: 'text',
      }

      updateSession(sessionId, (s) => ({
        ...s,
        messages: [...s.messages, message],
        updatedAt: now,
      }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      const now = new Date()

      updateSession(sessionId, (s) => ({
        ...s,
        messages: [
          ...s.messages,
          {
            id: `msg_${now.getTime()}_autoplay_error`,
            content: `⚠️ Auto-play error for ${character.name}: ${msg}`,
            timestamp: now,
            type: 'system',
          },
        ],
        updatedAt: now,
        // Pause autoplay on config/API errors
        sceneSettings: /api|key|openrouter/i.test(msg)
          ? { turnDuration: 5000, ...(s.sceneSettings ?? {}), autoPlay: false }
          : s.sceneSettings,
      }))

      if (/api|key|openrouter/i.test(msg)) {
        toast.error('Scene paused due to API configuration error. Check House Settings.')
      } else {
        toast.error(`Error generating response for ${character.name}: ${msg}`)
      }
    }
  }

  const triggerCharacterResponse = async (sessionId: string) => {
    const session = getSession(sessionId)
    if (!session || !session.active) return

    const available = session.participantIds.filter((id) =>
      safeChars.some((c) => c.id === id)
    );
    if (available.length === 0) return

    // Find the last character who spoke
    const characterMessages = session.messages.filter((m) => m.characterId);
    const lastSpeakerId = characterMessages.length > 0 ? characterMessages[characterMessages.length - 1].characterId : null;

    let nextCharacterId: string;
    if (!lastSpeakerId) {
      nextCharacterId = available[0];
    } else {
      const lastSpeakerIndex = available.indexOf(lastSpeakerId);
      if (lastSpeakerIndex === -1) {
        nextCharacterId = available[0];
      } else {
        nextCharacterId = available[(lastSpeakerIndex + 1) % available.length];
      }
    }

    await processCharacterTurn(sessionId, nextCharacterId);
  }

  const startAutoPlay = async (sessionId: string) => {
    // Prevent multiple auto-play loops
    if (isProcessing) return;

    const tick = async () => {
      // Always get fresh session data
      const currentSessions = sessionsRef.current;
      const session = currentSessions.find((s) => s.id === sessionId);

      if (!session || !session.active) {
        setIsProcessing(false);
        return;
      }

      if (!session.sceneSettings?.autoPlay) {
        setIsProcessing(false);
        return;
      }

      const spokenTurns = session.messages.filter((m) => m.characterId).length;
      const maxTurns = session.sceneSettings?.maxTurns ?? 20;
      if (spokenTurns >= maxTurns) {
        await endScene(sessionId);
        return;
      }

      const available = session.participantIds.filter((id) =>
        safeChars.some((c) => c.id === id)
      );
      if (available.length === 0) {
        await endScene(sessionId);
        return;
      }

      // Implement proper turn-taking: cycle through characters in order
      // Find the last character who spoke
      const characterMessages = session.messages.filter((m) => m.characterId);
      const lastSpeakerId = characterMessages.length > 0 ? characterMessages[characterMessages.length - 1].characterId : null;

      // Find the next character in the rotation
      let nextCharacterId: string;
      if (!lastSpeakerId) {
        // First turn - start with the first character
        nextCharacterId = available[0];
      } else {
        // Find the index of the last speaker and move to the next one
        const lastSpeakerIndex = available.indexOf(lastSpeakerId);
        if (lastSpeakerIndex === -1) {
          // Last speaker not in available list, start from beginning
          nextCharacterId = available[0];
        } else {
          // Move to next character, wrap around if needed
          nextCharacterId = available[(lastSpeakerIndex + 1) % available.length];
        }
      }

      try {
        await processCharacterTurn(sessionId, nextCharacterId);
      } catch (error) {
        console.error('Auto-play turn failed:', error);
      } finally {
        // Schedule next tick only if still auto-playing and active
        const freshSessions = sessionsRef.current;
        const freshSession = freshSessions.find((s) => s.id === sessionId);

        if (freshSession?.active && freshSession?.sceneSettings?.autoPlay) {
          const delay = freshSession.sceneSettings?.turnDuration ?? 5000;
          setTimeout(tick, delay);
        } else {
          setIsProcessing(false);
        }
      }
    };

    setIsProcessing(true);
    // Start immediately
    setTimeout(tick, 100);
  };

  const loadFromStorage = useCallback(() => {
    const stored = JSON.parse(localStorage.getItem('scene-sessions') || '[]');
    setActiveSessions(stored);
  }, []);

  return {
    activeSessions,
    isProcessing,
    createSceneSession,
    startAutoPlay,
    endScene,
    pauseScene,
    resumeScene,
    addUserMessage,
    loadFromStorage,
  }
}
