import { useCallback, useEffect, useRef, useState } from 'react';

// ─── UI ──────────────────────────────────────────────────────────────────────
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ─── Hooks / Services ────────────────────────────────────────────────────────
import { useChat } from '@/hooks/useChat'; // for copilot chat persistence
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
// import { useQuickActions } from '@/hooks/useQuickActions';
import { useSceneMode } from '@/hooks/useSceneMode';
import { AIService } from '@/lib/aiService';
import { legacyStorage } from '@/lib/legacyStorage';
import { logger } from '@/lib/logger';

// ─── Types ───────────────────────────────────────────────────────────────────
import type { Character } from '@/types';

// ─── Icons (phosphor) ────────────────────────────────────────────────────────
import { PaperPlaneRight, Robot, Sparkle, Users } from '@phosphor-icons/react';

// ─── Optional: Presets UI ────────────────────────────────────────────────────
// If you wired CopilotPresets previously, you can show it inside a dialog.
// import { CopilotPresets } from './CopilotPresets'

// ─── Local message model ─────────────────────────────────────────────────────
export type CopilotMessage = {
  id: string
  sender: 'user' | 'copilot'
  content: string
  timestamp: Date
  imageData?: string
}

export interface CopilotProps {
  onStartChat?: (characterId: string) => void
  onStartGroupChat?: (sessionId?: string) => void
  onStartScene?: (sessionId: string) => void
}

// ╭────────────────────────────────────────────────────────────────────────────╮
// │ Copilot (merged)
// │ - Keeps the new visual shell (header, insights, quick actions)
// │ - Restores the old Copilot brains: persisted chat, command parsing, scenes,
// │   image-generation, and NO character auto-replies from useChat.sendMessage.
// ╰────────────────────────────────────────────────────────────────────────────╯

export function Copilot({ onStartChat, onStartGroupChat, onStartScene }: CopilotProps = {}) {
  // House + characters
  const { house, characters } = useHouseFileStorage()

  // Quick actions
  // Quick actions currently unused in this pared-down Copilot; re-enable if needed.

  // Chats/scenes (for launching sessions)
  const { createSession, getSessionMessages, sendMessage, sessions, sessionsLoaded, deleteSession, createInterviewSession } = useChat()
  const { createSceneSession } = useSceneMode()

  // Copilot session management
  const [copilotSessionId, setCopilotSessionId] = useState<string | null>(null)
  const [copilotMessages, setCopilotMessages] = useState<CopilotMessage[]>([])
  // const [loadingMessages, setLoadingMessages] = useState(false)

  // UI state
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('')
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  // Removed unused UI state (tool toggles, editor modal)

  // Local chat buffer mirrors persisted store
  // Local redundant buffer removed; using copilotMessages only
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chatScrollRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inputRef = useRef<any>(null)

  // ── Demo insights bar from the new Copilot shell (kept, but computed lightly)
  const insights = {
    engagement: 87,
    contentQuality: 92,
    growthRate: 74,
  }

  // Unified initialization / repair for assistant (Copilot) session
  useEffect(() => {
    const init = async () => {
      if (!sessionsLoaded) return;
      try {
        // Collect assistant sessions
        const assistantSessions = sessions.filter(s => s.type === 'assistant');
        let chosen = assistantSessions[0];
        if (assistantSessions.length > 1) {
          // Pick session with most messages; prune trivial (<=1 message) duplicates
          chosen = assistantSessions.reduce((best, cur) => (cur.messageCount || 0) > (best.messageCount || 0) ? cur : best, assistantSessions[0]);
          for (const s of assistantSessions) {
            if (s.id !== chosen.id && (s.messageCount || 0) <= 1) {
              try { await deleteSession(s.id); logger.log('🧹 Pruned duplicate assistant session', s.id); } catch (e) { logger.warn('Failed pruning assistant session', e); }
            }
          }
        }

        if (!chosen) {
          // Create brand new assistant session
          const sid = await createSession('assistant', [], { assistantOnly: true });
          setCopilotSessionId(sid);
          const greeting = legacyStorage.getItem('copilot_greeting') || (house.copilotPrompt
            ? 'How can I help? Tell me a girl you want to talk to or a scenario to set up.'
            : "I'm your Copilot. I can launch chats, create scenes, or run house actions.");
          try { await sendMessage(sid, greeting, 'copilot', { copilot: true }); } catch (e) { logger.warn('Persist greeting failed', e); }
          const fresh = await getSessionMessages(sid);
          setCopilotMessages(fresh.map(m => ({ id: m.id, sender: m.characterId ? 'copilot' : 'user', content: m.content, timestamp: m.timestamp })));
          return;
        }

        // Use existing chosen session
        setCopilotSessionId(chosen.id);
        const msgs = await getSessionMessages(chosen.id);
        if (msgs.length === 0) {
          const greeting = legacyStorage.getItem('copilot_greeting') || (house.copilotPrompt
            ? 'How can I help? Tell me a girl you want to talk to or a scenario to set up.'
            : "I'm your Copilot. I can launch chats, create scenes, or run house actions.");
          try { await sendMessage(chosen.id, greeting, 'copilot', { copilot: true }); } catch (e) { logger.warn('Persist greeting (existing) failed', e); }
          const reload = await getSessionMessages(chosen.id);
          setCopilotMessages(reload.map(m => ({ id: m.id, sender: m.characterId ? 'copilot' : 'user', content: m.content, timestamp: m.timestamp })));
        } else {
          setCopilotMessages(msgs.map(m => ({ id: m.id, sender: m.characterId ? 'copilot' : 'user', content: m.content, timestamp: m.timestamp })));
        }
      } catch (e) {
        logger.error('Copilot init error', e);
      }
    };
    init();
  }, [sessionsLoaded, sessions, createSession, getSessionMessages, sendMessage, house.copilotPrompt, deleteSession]);

  // Keep scrolled to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [copilotMessages])

  // ─── Helpers: natural-language command parsing (restored) ───────────────────
  const parseImageGenerationCommand = (message: string): string | null => {
    const pats = [
      /send\s+me\s+(?:a\s+)?pic(?:ture)?(?:\s+of\s+)?(.+)/i,
      /generate\s+(?:a\s+|an\s+)?(?:pic(?:ture)?|image)(?:\s+of\s+)?(.+)/i,
      /show\s+me\s+(?:a\s+|an\s+)?(?:pic(?:ture)?|image)(?:\s+of\s+)?(.+)/i,
      /create\s+(?:a\s+|an\s+)?(?:pic(?:ture)?|image)(?:\s+of\s+)?(.+)/i,
      /draw\s+(?:a\s+|an\s+)?(?:pic(?:ture)?|image)(?:\s+of\s+)?(.+)/i,
      /make\s+(?:a\s+|an\s+)?(?:pic(?:ture)?|image)(?:\s+of\s+)?(.+)/i,
      /visualize\s+(.+)/i,
      /imagine\s+(.+)/i,
      /picture\s+of\s+(.+)/i,
      /image\s+of\s+(.+)/i,
      /pic\s+of\s+(.+)/i,
      /(?:give\s+me|want)\s+(?:a\s+|an\s+)?(?:pic(?:ture)?|image)(?:\s+of\s+)?(.+)/i,
    ]
    for (const p of pats) {
      const m = message.match(p)
      if (m?.[1]?.trim()) return m[1].trim()
    }
    return null
  }

  const parseRestartChatCommand = (message: string): string | null => {
    const pats = [
      /restart\s+chat\s+with\s+(\w+)/i,
      /talk\s+to\s+(\w+)\s+again/i,
      /chat\s+with\s+(\w+)/i,
      /start\s+new\s+chat\s+with\s+(\w+)/i,
      /begin\s+conversation\s+with\s+(\w+)/i,
      /speak\s+to\s+(\w+)/i,
      /message\s+(\w+)/i,
      /(\w+),\s+let['']?s\s+talk/i,
      /i\s+want\s+to\s+talk\s+to\s+(\w+)/i,
      /let\s+me\s+speak\s+to\s+(\w+)/i,
    ]
    for (const p of pats) {
      const m = message.match(p)
      if (!m) continue
      const name = m[1]
      const ch = characters?.find(c => c.name.toLowerCase() === name.toLowerCase())
      if (ch) return ch.id
    }
    return null
  }

  const parseCustomSceneCommand = useCallback(async (
    message: string,
  ): Promise<
    | { type: 'chat'; characterId: string; prompt: string }
    | { type: 'scene'; characterId: string; context: string; customPrompt?: string }
    | { type: 'interview'; characterId: string }
    | null
  > => {
    const sendPats = [
      /send\s+(\w+)\s+(?:to|into)\s+my\s+room/i,
      /bring\s+(\w+)\s+(?:to|into)\s+my\s+room/i,
      /invite\s+(\w+)\s+(?:to|into)\s+my\s+room/i,
      /call\s+(\w+)\s+(?:to|into)\s+my\s+room/i,
      /summon\s+(\w+)\s+(?:to|into)\s+my\s+room/i,
      /(\w+),\s+come\s+(?:to|into)\s+my\s+room/i,
      /i\s+want\s+(\w+)\s+in\s+my\s+room/i,
    ]
    for (const p of sendPats) {
      const m = message.match(p)
      if (m) {
        const name = m[1]
        const ch = characters?.find(c => c.name.toLowerCase() === name.toLowerCase())
        if (ch) return { type: 'chat', characterId: ch.id, prompt: `${ch.name} has just been asked to go to your room.` }
      }
    }

    const custom = message.match(/copilot\s+i\s+want\s+you\s+to\s+(.+)/i)
    if (custom) {
      const customPrompt = custom[1].trim()
      const namePick = customPrompt.match(/with\s+(\w+)|^(\w+)/i)
      let ch: Character | undefined
      if (namePick) {
        const name = (namePick[1] || namePick[2] || '').toLowerCase()
        ch = characters?.find(c => c.name.toLowerCase() === name)
      }
      if (!ch && characters && characters.length > 0) ch = characters[0]
      if (ch) return { type: 'scene', characterId: ch.id, context: `User wants a custom scene: ${customPrompt}`, customPrompt }
    }

    return null
  }, [characters])

  // Interview command: "let's interview NAME" / "interview NAME" / "start interview with NAME"
  const parseInterviewCommand = useCallback((message: string): string | null => {
    const pats = [
      /let['’]?s\s+interview\s+(\w+)/i,
      /interview\s+(\w+)/i,
      /start\s+an?\s+interview\s+with\s+(\w+)/i,
      /do\s+an?\s+interview\s+with\s+(\w+)/i
    ];
    for (const p of pats) {
      const m = message.match(p);
      if (m?.[1]) {
        const name = m[1];
        const ch = characters?.find(c => c.name.toLowerCase() === name.toLowerCase());
        if (ch) return ch.id;
      }
    }
    return null;
  }, [characters]);

  // ─── Scene creator (restored minimal – delegates to scene mode) ─────────────
  const createCustomSceneChat = useCallback(
    async (characterId: string, context: string, customPrompt?: string) => {
      try {
        const sessionId = await createSceneSession([characterId], { name: customPrompt ? `Custom scene` : `Scene`, description: context })
        if (sessionId) {
          onStartScene?.(sessionId)
        }
      } catch (err) {
        logger.error('Failed to create custom scene', err)
      }
    },
    [createSceneSession, onStartScene],
  )

  // ─── Persist helper ────────────────────────────────────────────────────────
  const persist = useCallback(
    async (next: CopilotMessage[]) => {
      setCopilotMessages(next)
      // Messages are automatically persisted via sendMessage to the session
    },
    [],
  )

  // ─── Send flow: Use session-based messaging ────────────────────────
  const handleSend = useCallback(async () => {
    const text = inputMessage.trim()
    if (!text || !copilotSessionId) return

    const userMsg: CopilotMessage = { id: `user-${Date.now()}`, sender: 'user', content: text, timestamp: new Date() }
    await persist([...copilotMessages, userMsg])
    setInputMessage('')
    setIsTyping(true)

    try {
      // Send user message to session
      await sendMessage(copilotSessionId, text, 'user', { copilot: true })

      // Command: restart chat with a character
      const restartId = parseRestartChatCommand(text)
      if (restartId) {
        await createSession('individual', [restartId])
        onStartChat?.(restartId)
        setIsTyping(false)
        return
      }

      // Command: image generation
      const imagePrompt = parseImageGenerationCommand(text)
      if (imagePrompt) {
        try {
          const img = await AIService.generateImage(imagePrompt, { hide_watermark: true })
          const imageMsg: CopilotMessage = {
            id: `image-${Date.now()}`,
            sender: 'copilot',
            content: `Here's the image you requested: "${imagePrompt}"`,
            imageData: img,
            timestamp: new Date(),
          }
          await persist([...copilotMessages, userMsg, imageMsg])
        } catch {
          const errMsg: CopilotMessage = {
            id: `err-${Date.now()}`,
            sender: 'copilot',
            content: "I couldn't generate that image right now. Check your Venice/OpenRouter settings and try again.",
            timestamp: new Date(),
          }
          await persist([...copilotMessages, userMsg, errMsg])
        }
        setIsTyping(false)
        return
      }

      // Interview command
      const interviewCharId = parseInterviewCommand(text);
      if (interviewCharId) {
        try {
          await createInterviewSession(interviewCharId);
          onStartChat?.(interviewCharId);
        } catch (e) { logger.warn('Interview session creation failed', e); }
        setIsTyping(false);
        return;
      }

      // Command: custom scene/chat
      const sceneOrChat = await parseCustomSceneCommand(text)
      if (sceneOrChat) {
        if (sceneOrChat.type === 'chat') {
          await createSession('individual', [sceneOrChat.characterId])
          onStartChat?.(sceneOrChat.characterId)
        } else if (sceneOrChat.type === 'scene') {
          await createCustomSceneChat(sceneOrChat.characterId, sceneOrChat.context, sceneOrChat.customPrompt)
        } else if (sceneOrChat.type === 'interview') {
          try { await createInterviewSession(sceneOrChat.characterId); onStartChat?.(sceneOrChat.characterId); } catch (e) { logger.warn('Interview creation failed', e); }
        }
        setIsTyping(false)
        return
      }

      // Default: ask the Copilot model
      let assistantText = ''
      try {
        if (typeof AIService.copilotRespond === 'function') {
          const history = [...copilotMessages, userMsg].map(m => ({ role: m.sender === 'user' ? 'user' as const : 'assistant' as const, content: m.content }))
          assistantText = await AIService.copilotRespond({ threadId: 'local-copilot', messages: history, sessionId: copilotSessionId || undefined, characters: characters })
        }
      } catch (e) {
        logger.warn('copilotRespond not available or failed; falling back', e)
      }

      if (!assistantText) {
        try {
          assistantText = await AIService.generateAssistantReply?.(text)
        } catch (e) {
          logger.error('Assistant fallback failed', e)
        }
      }

      const botMsg: CopilotMessage = {
        id: `copilot-${Date.now()}`,
        sender: 'copilot',
        content: assistantText || "(No assistant connected – wire AIService.copilotRespond or generateAssistantReply)",
        timestamp: new Date(),
      }
      
      // Send copilot response to session
      await sendMessage(copilotSessionId, botMsg.content, 'copilot', { copilot: true })
      const updated = [...copilotMessages, userMsg, botMsg];
      await persist(updated)
      // Reload persisted messages to ensure sync
      try {
        const fresh = await getSessionMessages(copilotSessionId);
        const mapped: CopilotMessage[] = fresh.map(m => ({ id: m.id, sender: m.characterId ? 'copilot' : 'user', content: m.content, timestamp: m.timestamp }));
        setCopilotMessages(mapped);
      } catch (e) {
        logger.warn('Failed to reload copilot messages after send', e);
      }
    } finally {
      setIsTyping(false)
      inputRef.current?.focus?.()
    }
  }, [inputMessage, copilotMessages, copilotSessionId, persist, parseRestartChatCommand, parseImageGenerationCommand, parseCustomSceneCommand, createSession, onStartChat, createCustomSceneChat, sendMessage, getSessionMessages])

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-[#1a1a1a] text-white border-l border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#4facfe] to-[#667eea] flex items-center justify-center">
            <Robot size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">House Copilot</h2>
            <p className="text-xs text-gray-400">Always-on assistant for characters, scenes, and dev ops</p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <select
              aria-label="Select character"
              value={selectedCharacterId}
              onChange={(e) => setSelectedCharacterId(e.target.value)}
              className="bg-[#0f0f0f] text-sm text-gray-300 rounded px-2 py-1 border border-gray-700 min-w-[12rem]"
            >
              <option value="">Select character…</option>
              {(characters || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {/* Character edit/save buttons removed (editor UI not active in this component) */}

            {/* Optional presets dialog – wire if you use CopilotPresets */}
            {/*
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">Presets</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Copilot Presets</DialogTitle></DialogHeader>
                <CopilotPresets />
              </DialogContent>
            </Dialog>
            */}
          </div>
        </div>
      </div>

      {/* Insights strip (kept from new UI) */}
      <div className="bg-[#0f0f0f] p-4 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">AI INSIGHTS</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Engagement', value: insights.engagement, from: '#43e97b', to: '#4facfe' },
            { label: 'Content Quality', value: insights.contentQuality, from: '#667eea', to: '#f093fb' },
            { label: 'Growth Rate', value: insights.growthRate, from: '#fa709a', to: '#ff1372' },
          ].map((m) => (
            <div className="flex items-center justify-between" key={m.label}>
              <span className="text-sm text-gray-300">{m.label}</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-gray-700 rounded-full">
                  <div className="h-2 rounded-full" style={{ width: `${m.value}%`, background: `linear-gradient(90deg, ${m.from}, ${m.to})` }} />
                </div>
                <span className="text-sm font-semibold" style={{ color: m.to }}>{m.value}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions (kept, but wired) */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">QUICK ACTIONS</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="justify-start"
            onClick={async () => {
              try {
                if (!selectedCharacterId) return
                await createSession('individual', [selectedCharacterId])
                onStartChat?.(selectedCharacterId)
              } catch (e) {
                logger.error('Failed to start chat session', e)
              }
            }}
          >
            <PaperPlaneRight size={14} className="mr-2" /> Chat
          </Button>
          <Button variant="outline" size="sm" className="justify-start" onClick={() => onStartGroupChat?.('')}>
            <Users size={14} className="mr-2" /> Group
          </Button>
          <Button variant="outline" size="sm" className="justify-start" onClick={() => onStartScene?.('')}>
            <Sparkle size={14} className="mr-2" /> Scene
          </Button>
          <Button variant="outline" size="sm" className="justify-start" onClick={async () => {
            try {
              if (!selectedCharacterId) return;
              await createInterviewSession(selectedCharacterId);
              onStartChat?.(selectedCharacterId);
            } catch (e) {
              logger.error('Failed to start interview session', e);
            }
          }}>
            <Users size={14} className="mr-2" /> Interview
          </Button>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col min-h-0">
        <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {copilotMessages.map((m) => (
            <div key={m.id} className={`max-w-[80%] ${m.sender === 'user' ? 'ml-auto' : ''}`}>
              <div className="rounded-xl border border-gray-700 bg-[#0f0f0f] p-3">
                <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">{m.sender}</div>
                <div className="whitespace-pre-wrap text-sm">{m.content}</div>
                {m.imageData && (
                  <img src={m.imageData} alt="generated" className="mt-2 rounded-lg border border-gray-700" />
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="opacity-60 text-xs text-center">Copilot is typing…</div>
          )}
        </div>

        <div className="p-3 border-t border-gray-700 flex gap-2">
          <Input
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Ask Copilot… try: ‘send Savannah to my room’, ‘generate an image of…’"
          />
          <Button onClick={handleSend} disabled={!inputMessage.trim() || !copilotSessionId}>
            <PaperPlaneRight size={14} className="mr-1" /> Send
          </Button>
        </div>
      </div>
    </div>
  )
}
