import { useEffect, useRef, useState } from 'react'
import { useKV } from '@github/spark/hooks'

import { ChatSession, Character, ChatMessage, SceneObjective } from '@/types'
import { useHouse } from './useHouse'           // if your hook lives elsewhere, fix this path
import { AIService } from '@/lib/aiService'           
import { toast } from 'sonner'

export const useSceneMode = () => {
  const { house } = useHouse()
  const [activeSessions, setActiveSessions] = useKV<ChatSession[]>('scene-sessions', [])
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
        autoPlay: true,
        turnDuration: 5000,
        maxTurns: 50,
      },
      createdAt: now,
      updatedAt: now,
    }

    setActiveSessions((sessions) => [...sessions, newSession])
    toast.success(`Scene session created (${sessionId.slice(0, 12)})`)

    // Kick off autoplay shortly after creation
    setTimeout(() => startAutoPlay(sessionId), 800)
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
      sceneSettings: { ...(s.sceneSettings ?? {}), autoPlay: false },
      updatedAt: new Date(),
    }))
  }

  const resumeScene = async (sessionId: string) => {
    updateSession(sessionId, (s) => ({
      ...s,
      sceneSettings: { ...(s.sceneSettings ?? {}), autoPlay: true },
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
        { id: `msg_${now.getTime()}_user`, content, timestamp: now, type: 'text' },
      ],
      updatedAt: now,
    }))
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

    const characterPrompt = `
You are ${character.name}.
Personality: ${character.personality}
Secret objective: ${objective}
Scene context: ${currentSession.context || 'A social gathering'}

Participants: ${character.name}, ${others}

Recent conversation:
${conversationContext}

Respond as ${character.name}. Work toward your objective subtly. Keep response to 1–2 sentences.
`.trim()

    try {
      const provider = house?.aiSettings?.provider || 'openrouter'
      if (provider !== 'openrouter') {
        throw new Error(`Unsupported AI provider: ${provider}. Only OpenRouter is supported.`)
      }
      if (!house?.aiSettings?.apiKey?.trim()) {
        throw new Error('OpenRouter API key is required. Please configure it in House Settings.')
      }

      const aiService = new AIService(() => house!)
      const response = await aiService.generateResponse(characterPrompt)

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
          ? { ...(s.sceneSettings ?? {}), autoPlay: false }
          : s.sceneSettings,
      }))

      if (/api|key|openrouter/i.test(msg)) {
        toast.error('Scene paused due to API configuration error. Check House Settings.')
      } else {
        toast.error(`Error generating response for ${character.name}: ${msg}`)
      }
    }
  }

  const startAutoPlay = async (sessionId: string) => {
    const tick = async () => {
      const session = getSession(sessionId)
      if (!session || !session.active) {
        setIsProcessing(false)
        return
      }

      if (!session.sceneSettings?.autoPlay) {
        setIsProcessing(false)
        return
      }

      const spokenTurns = session.messages.filter((m) => m.characterId).length
      const maxTurns = session.sceneSettings?.maxTurns ?? 20
      if (spokenTurns >= maxTurns) {
        await endScene(sessionId)
        return
      }

      const available = session.participantIds.filter((id) =>
        safeChars.some((c) => c.id === id)
      )
      if (available.length === 0) {
        await endScene(sessionId)
        return
      }

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
