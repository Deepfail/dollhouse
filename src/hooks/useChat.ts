/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { repositoryStorage } from '@/hooks/useRepositoryStorage';
import { AIService } from '../lib/aiService';
import { analyzeBehavior, buildMemoryEntries, createBehaviorProfile } from '../lib/behaviorAnalysis';
import { getDb, saveDatabase } from '../lib/db';
import { uuid } from '../lib/uuid';
// Note: use in-app character list from useHouseFileStorage; avoid repo adapter to prevent mismatches
import { aliProfileService } from '@/lib/aliProfile';
import { legacyStorage } from '@/lib/legacyStorage';
import { logger } from '@/lib/logger';
import { formatPrompt } from '@/lib/prompts';
import { Character, ChatMessage, ChatSession } from '../types';
import { useHouseFileStorage } from './useHouseFileStorage';

const clampNumber = (value: number, min = 0, max = 100): number => {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
};

type NumericProgressionKey = 'affection' | 'trust' | 'intimacy' | 'dominance' | 'jealousy' | 'possessiveness';

const NUMERIC_PROGRESSION_KEYS: NumericProgressionKey[] = ['affection', 'trust', 'intimacy', 'dominance', 'jealousy', 'possessiveness'];

const isNumericProgressionKey = (key: string): key is NumericProgressionKey =>
  (NUMERIC_PROGRESSION_KEYS as string[]).includes(key);

const SUMMARY_CONFIG = {
  MIN_TOTAL_MESSAGES: 60,
  KEEP_RECENT_MESSAGES: 28,
  MIN_CHUNK_MESSAGES: 12,
  MIN_CHUNK_CHARS: 1400
} as const;

type GlobalEventTargetLike = {
  dispatchEvent?: (event: unknown) => void;
  CustomEvent?: new (type: string, init?: { detail?: unknown }) => unknown;
  addEventListener?: (type: string, listener: (event: unknown) => void) => void;
  removeEventListener?: (type: string, listener: (event: unknown) => void) => void;
};

const getGlobalEventTarget = (): GlobalEventTargetLike | undefined => {
  if (typeof globalThis === 'undefined') {
    return undefined;
  }
  return globalThis as GlobalEventTargetLike;
};

const dispatchGlobalEvent = (name: string, detail?: unknown): void => {
  const target = getGlobalEventTarget();
  if (!target?.dispatchEvent || !target.CustomEvent) {
    return;
  }
  try {
    const EventCtor = target.CustomEvent;
    const event = new EventCtor(name, { detail });
    target.dispatchEvent(event);
  } catch {
    // noop
  }
};

const addGlobalEventListener = (name: string, listener: (event: unknown) => void): void => {
  const target = getGlobalEventTarget();
  if (!target?.addEventListener) {
    return;
  }
  try {
    target.addEventListener(name, listener);
  } catch {
    // noop
  }
};

const removeGlobalEventListener = (name: string, listener: (event: unknown) => void): void => {
  const target = getGlobalEventTarget();
  if (!target?.removeEventListener) {
    return;
  }
  try {
    target.removeEventListener(name, listener);
  } catch {
    // noop
  }
};

export function useChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const { characters, updateCharacter } = useHouseFileStorage(); // Use unified character storage

  // Prevent overlapping loads & allow suppression of broadcast events to avoid feedback loops
  const loadingRef = useRef(false);
  const lastLoadTsRef = useRef(0);
  const lastSignatureRef = useRef<string | null>(null);

  const loadSessions = useCallback(async (options?: { suppressBroadcast?: boolean; force?: boolean }) => {
    try {
      const nowMs = Date.now();
      if (!options?.force) {
        if (loadingRef.current) {
          // Avoid re-entrant loads that can cause thrash
          return sessions;
        }
        // Simple throttle: ignore calls within 400ms unless forced
        if (nowMs - lastLoadTsRef.current < 400) {
          return sessions;
        }
      }
    lastLoadTsRef.current = nowMs;
    loadingRef.current = true;
  logger.log('🔄 Loading chat sessions...');
      const { db } = await getDb();
      
      // Get all sessions
      const sessionRows: any[] = [];
      db.exec({
        sql: 'SELECT * FROM chat_sessions ORDER BY updated_at DESC',
        rowMode: 'object',
        callback: (r: any) => sessionRows.push(r)
      });

  logger.log('📋 Found', sessionRows.length, 'sessions');

      // Load participants for each session
      const loadedSessions: ChatSession[] = [];
      
      for (const sessionRow of sessionRows) {
        const participantRows: any[] = [];
        db.exec({
          sql: 'SELECT character_id FROM session_participants WHERE session_id = ?',
          bind: [sessionRow.id],
          rowMode: 'object',
          callback: (r: any) => participantRows.push(r)
        });

        const participantIds = participantRows.map(p => p.character_id);

        // Count messages for badge display
        const msgCountRows: any[] = [];
        db.exec({
          sql: 'SELECT COUNT(1) as cnt FROM messages WHERE session_id = ?',
          bind: [sessionRow.id],
          rowMode: 'object',
          callback: (r: any) => msgCountRows.push(r)
        });
        const messageCount = Number(msgCountRows[0]?.cnt || 0);

        // Load hidden goals if any
        const goalRows: any[] = [];
        db.exec({
          sql: 'SELECT character_id, goal_text FROM session_goals WHERE session_id = ?',
          bind: [sessionRow.id],
          rowMode: 'object',
          callback: (r: any) => goalRows.push(r)
        });
        const sceneObjectives = goalRows.reduce((acc: Record<string, string>, r: any) => {
          acc[r.character_id] = r.goal_text;
          return acc;
        }, {} as Record<string, string>);
        
        loadedSessions.push({
          id: sessionRow.id,
          type: sessionRow.type,
          participantIds,
          messages: [], // Will load messages separately when needed
          context: sessionRow.title,
          sceneObjectives: Object.keys(sceneObjectives).length ? sceneObjectives : undefined,
          active: !sessionRow.ended_at, // active if not ended
          messageCount,
          endedAt: sessionRow.ended_at ? new Date(parseInt(sessionRow.ended_at)) : null,
          createdAt: new Date(parseInt(sessionRow.created_at)),
          updatedAt: new Date(parseInt(sessionRow.updated_at))
        });
      }

      // Build a lightweight signature (ids + updated_at timestamps) to detect real changes
      const signature = loadedSessions
        .map(s => `${s.id}:${s.updatedAt.getTime()}:${s.messageCount}`)
        .join('|');

      if (signature !== lastSignatureRef.current) {
        logger.log('✅ Loaded', loadedSessions.length, 'sessions with participants (changed)');
        lastSignatureRef.current = signature;
        setSessions(loadedSessions);
        setSessionsLoaded(true);
        if (!options?.suppressBroadcast) {
          dispatchGlobalEvent('chat-sessions-updated');
        }
      } else {
        // Silent no-op; avoid log spam
        // Optionally still mark loaded flag if first time
        if (!sessionsLoaded) setSessionsLoaded(true);
      }
      return loadedSessions;
    } catch (error) {
      logger.error('❌ Failed to load sessions:', error);
      setSessionsLoaded(true);
      return [];
    } finally {
      loadingRef.current = false;
    }
  }, [sessions, sessionsLoaded]);

  const getSessionMessages = useCallback(async (sessionId: string): Promise<ChatMessage[]> => {
    try {
      logger.log('📨 Loading messages for session:', sessionId);
      const { db } = await getDb();
      const messageRows: any[] = [];
      db.exec({
        sql: 'SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC',
        bind: [sessionId],
        rowMode: 'object',
        callback: (r: any) => messageRows.push(r)
      });

      const messages = messageRows.map((row: any) => ({
        id: row.id,
        characterId: row.sender_id, // sender_id can be null for user messages
        content: row.content,
        timestamp: new Date(parseInt(row.created_at)),
        type: 'text' as const,
        metadata: undefined
      }));

      logger.log('✅ Loaded', messages.length, 'messages for session');
      if (messages.length === 0) {
        logger.log('ℹ️ Session has zero messages (sessionId=', sessionId, ')');
      }
      return messages;
    } catch (error) {
      logger.error('❌ Failed to load messages for session:', sessionId, error);
      return [];
    }
  }, []);

  const sendMessage = useCallback(async (sessionId: string, content: string, senderId: string, options?: { copilot?: boolean }) => {
    try {
      logger.log('📤 Sending message to session:', sessionId, 'from:', senderId);
      const { db } = await getDb();
      const messageId = uuid();
      const now = Date.now();

      // sender_id is null for user messages, character ID for character messages
      const senderValue = senderId === 'user' ? null : senderId;

      // Store user message
      db.exec({
        sql: 'INSERT INTO messages (id, session_id, sender_id, content, created_at) VALUES (?, ?, ?, ?, ?)',
        bind: [messageId, sessionId, senderValue, content, now]
      });

      // Update session updated_at and mark active
      db.exec({
        sql: 'UPDATE chat_sessions SET ended_at = NULL, updated_at = ? WHERE id = ?',
        bind: [now, sessionId]
      });

      await saveDatabase();
  logger.log('✅ User message sent successfully');

  // Log interaction for Ali's analysis
  if (senderId === 'user') {
    try {
      const lowerContent = content.toLowerCase();
      // Simple keyword extraction for preferences
      if (lowerContent.includes('dominate') || lowerContent.includes('control')) {
        await aliProfileService.addPreference({
          category: 'trait',
          value: 'dominance',
          confidence: 0.7,
          source: 'interaction',
          context: sessionId
        });
      }
      if (lowerContent.includes('love') || lowerContent.includes('romance')) {
        await aliProfileService.addPreference({
          category: 'scenario',
          value: 'romantic',
          confidence: 0.6,
          source: 'interaction',
          context: sessionId
        });
      }
      // Add more as needed
    } catch (e) {
      logger.warn('Failed to log interaction for Ali', e);
    }
  }

  // On user messages, run behavior analysis on all participants periodically (every 10 messages)
  // Skip for copilot assistant usage
  if (senderId === 'user' && !options?.copilot) {
        const participantRows: Array<{ character_id: string }> = [];
        db.exec({
          sql: 'SELECT character_id FROM session_participants WHERE session_id = ?',
          bind: [sessionId],
          rowMode: 'object',
          callback: (r: unknown) => {
            const row = r as { character_id: string };
            participantRows.push(row);
          }
        });
        const participantIds = participantRows.map(p => p.character_id);

        const participantCharacters: Character[] = participantIds
          .map(pid => (characters || []).find(c => c.id === pid))
          .filter((c): c is Character => Boolean(c));

        if (participantCharacters.length) {
          try {
            const recentMessages = await getSessionMessages(sessionId);
            
            // Only run analysis every 10 messages to avoid spam
            const shouldAnalyze = recentMessages.length % 10 === 0;
            
            if (shouldAnalyze) {
              const analysis = await analyzeBehavior({
                sessionId,
                messages: recentMessages,
                characters: participantCharacters,
                latestUserMessage: content
              });

              for (const adjustment of analysis.adjustments) {
              const target = participantCharacters.find(c => c.id === adjustment.characterId);
              const fullChar = (characters || []).find(c => c.id === adjustment.characterId);
              if (!target || !fullChar) continue;

              const updatedStats = { ...fullChar.stats };
              const updatedProgression = { ...fullChar.progression };

              if (adjustment.statAdjustments.stats) {
                for (const [statKey, delta] of Object.entries(adjustment.statAdjustments.stats)) {
                  if (typeof delta !== 'number' || Number.isNaN(delta)) continue;
                  if (statKey === 'experience') {
                    const nextLevelExp = updatedProgression?.nextLevelExp ?? 100;
                    let updatedExp = (updatedStats.experience ?? 0) + delta;
                    if (updatedExp < 0) updatedExp = 0;
                    let newLevel = updatedStats.level ?? 1;
                    let threshold = nextLevelExp;
                    while (updatedExp >= threshold && threshold > 0) {
                      updatedExp -= threshold;
                      newLevel += 1;
                      threshold = Math.round(threshold * 1.25);
                    }
                    updatedStats.experience = updatedExp;
                    updatedStats.level = newLevel;
                    if (updatedProgression) {
                      updatedProgression.level = Math.max(updatedProgression.level || 1, newLevel);
                      updatedProgression.nextLevelExp = threshold;
                    }
                  } else if (statKey in updatedStats) {
                    const typedKey = statKey as keyof typeof updatedStats;
                    const currentValue = Number(updatedStats[typedKey] ?? 0);
                    updatedStats[typedKey] = clampNumber(currentValue + delta);
                  }
                }
              }

              if (adjustment.statAdjustments.progression) {
                for (const [progKey, delta] of Object.entries(adjustment.statAdjustments.progression)) {
                  if (typeof delta !== 'number' || Number.isNaN(delta)) continue;
                  if (isNumericProgressionKey(progKey)) {
                    const current = Number(updatedProgression?.[progKey] ?? 0);
                    updatedProgression[progKey] = clampNumber(current + delta);
                  }
                }
              }

              const behaviorProfile = createBehaviorProfile(adjustment, fullChar.behaviorProfile);
              const memories = buildMemoryEntries(fullChar, adjustment.memories);

              await updateCharacter(fullChar.id, {
                stats: updatedStats,
                progression: updatedProgression,
                behaviorProfile,
                memories,
                lastInteraction: new Date()
              } as Partial<Character>);
                for (const tag of adjustment.tags) {
                  await aliProfileService.addPreference({
                    category: 'behavior',
                    value: `${fullChar.name}:${tag}`,
                    confidence: clampNumber(adjustment.confidence, 0.4, 0.95),
                    source: 'analysis',
                    context: sessionId
                  });
                }
              }

              // Log analysis results silently (don't create visible chat messages)
              logger.log('📊 Behavior analysis completed for session', sessionId, '- updated', analysis.adjustments.length, 'character profiles');
            }
          } catch (analysisError) {
            logger.warn('Behavior analysis failed', analysisError);
          }
        }
      }

      // Generate AI responses (skip for copilot or assistant sessions)
      if (senderId === 'user' && !options?.copilot) {
        const session = sessions.find(s => s.id === sessionId);
        console.log('🔍 Checking if should generate responses:', {
          hasSender: senderId === 'user',
          notCopilot: !options?.copilot,
          session: session?.id,
          sessionType: session?.type,
          participantCount: session?.participantIds.length,
          participants: session?.participantIds,
        });
        
        if (session && !session.assistantOnly && session.type !== 'assistant' && session.participantIds.length > 0) {
          console.log('✅ Generating responses for participants:', session.participantIds);
          await generateCharacterResponses(sessionId, session.participantIds, content);
        } else {
          console.warn('❌ Skipping response generation:', {
            hasSession: !!session,
            assistantOnly: session?.assistantOnly,
            type: session?.type,
            participantCount: session?.participantIds.length,
          });
        }
      }

      // Reload sessions to get updated data
      await loadSessions();
    } catch (error) {
      logger.error('❌ Failed to send message:', error);
      throw error;
    }
  }, [characters, getSessionMessages, loadSessions, sessions, updateCharacter]);

  const generateCharacterResponses = useCallback(async (sessionId: string, characterIds: string[], userMessage: string) => {
    try {
      logger.log('🤖 Generating AI responses for characters:', characterIds);
      
      // Use in-app characters from unified storage (pre-loaded in this hook)
      const allChars = (characters || []);
      let sessionChars = allChars.filter(c => characterIds.includes(c.id));
      // Fallback to direct storage read if nothing matched (race: characters not loaded yet)
      if (sessionChars.length === 0) {
        try {
          const storageMod = await import('@/storage');
          const st = (storageMod as any).storage;
          if (st) {
            const saved = await st.get('settings', 'characters');
            const parsed = saved && (saved as any).value ? JSON.parse((saved as any).value) : [];
            if (Array.isArray(parsed) && parsed.length) {
              sessionChars = parsed.filter((c: any) => characterIds.includes(c.id));
            }
          }
          } catch (e) {
          logger.warn('Fallback character retrieval failed:', e);
        }
      }
      // Fallback 2: try legacy adapter (storage.characters table)
      if (sessionChars.length === 0) {
        try {
          const adapterMod = await import('@/storage/adapters');
          const legacyChars = await (adapterMod as any).StorageAdapter.getCharacters();
          if (Array.isArray(legacyChars) && legacyChars.length) {
            sessionChars = legacyChars.filter((c: any) => characterIds.includes(c.id));
          }
        } catch (e) {
          logger.warn('Legacy adapter character retrieval failed:', e);
        }
      }
      if (sessionChars.length === 0) {
        logger.warn('No matching characters found for session participants; skipping AI generation');
        return;
      }
      
  // Get recent message history for context
  const recentMessages = await getSessionMessages(sessionId);
  const conversationHistory = recentMessages.slice(-12); // Keep a few more for continuity

      // Load hidden goals for this session (from both session_goals table and scene sessions)
      const { db } = await getDb();
      
      // Get session type and check if it's linked to a scene
      const sessInfo: any[] = [];
      db.exec({
        sql: 'SELECT type FROM chat_sessions WHERE id = ?',
        bind: [sessionId],
        rowMode: 'object',
        callback: (r: any) => sessInfo.push(r)
      });
      const sessionType = (sessInfo[0]?.type as string) || 'individual';
      if (sessionType === 'interview') {
        logger.log('⏭️ Skip character auto-responses in interview session');
        return;
      }
      
      // Load scene context if this session is part of a scene
      let sceneContext = '';
      try {
        const sceneRows: any[] = [];
        db.exec({
          sql: "SELECT value FROM settings WHERE key LIKE 'scene_session:%'",
          rowMode: 'object',
          callback: (r: any) => sceneRows.push(r)
        });
        
        for (const row of sceneRows) {
          try {
            const sceneSession = JSON.parse(row.value || '{}');
            if (sceneSession.chatSessionId === sessionId && sceneSession.description) {
              // Found the scene for this chat session - inject context
              sceneContext = formatPrompt('house.scene.contextPrompt', {
                sceneDescription: sceneSession.description
              });
              logger.log('🎬 Injecting scene context for session:', sessionId);
              
              // Also load hidden goals from scene session if they exist
              if (sceneSession.hiddenGoals) {
                // Merge scene hidden goals with session goals
                for (const [charId, goalData] of Object.entries(sceneSession.hiddenGoals as Record<string, { goal: string; priority: string }>)) {
                  // Check if already in session_goals, if not add it
                  const existing: any[] = [];
                  db.exec({
                    sql: 'SELECT id FROM session_goals WHERE session_id = ? AND character_id = ?',
                    bind: [sessionId, charId],
                    rowMode: 'object',
                    callback: (r: any) => existing.push(r)
                  });
                  
                  if (existing.length === 0) {
                    db.exec({
                      sql: 'INSERT INTO session_goals (session_id, character_id, goal_text, priority) VALUES (?, ?, ?, ?)',
                      bind: [sessionId, charId, goalData.goal, goalData.priority]
                    });
                  }
                }
              }
              break;
            }
          } catch {
            // Skip invalid scene session data
          }
        }
      } catch (e) {
        logger.warn('Failed to load scene context', e);
      }
      
  const goalRows: { character_id: string; goal_text: string; priority: string }[] = [];
      db.exec({
        sql: 'SELECT character_id, goal_text, priority FROM session_goals WHERE session_id = ?',
        bind: [sessionId],
        rowMode: 'object',
  callback: (r: unknown) => { const row = r as { character_id: string; goal_text: string; priority: string }; goalRows.push(row); }
      });
      const goalsByChar: Record<string, { goal: string; priority: string }[]> = {};
      for (const g of goalRows) {
        if (!goalsByChar[g.character_id]) goalsByChar[g.character_id] = [];
        goalsByChar[g.character_id].push({ goal: g.goal_text, priority: g.priority });
      }
      
      // Long-term memory: summarize older parts of the conversation and persist
      let sessionSummary = '' as string;
      try {
        const sumRows: { summary_text?: string; covered_until?: string }[] = [];
        db.exec({
          sql: 'SELECT summary_text, covered_until FROM session_summaries WHERE session_id = ?',
          bind: [sessionId],
          rowMode: 'object',
          callback: (r: unknown) => { sumRows.push(r as { summary_text?: string; covered_until?: string }); }
        });

        sessionSummary = (sumRows[0]?.summary_text || '').trim();
        const lastCovered = sumRows[0]?.covered_until ? Number(sumRows[0].covered_until) : 0;

        const timestampMs = (value: ChatMessage['timestamp']): number => {
          if (value instanceof Date) return value.getTime();
          if (typeof value === 'number') return value;
          return new Date(value).getTime();
        };

        if (recentMessages.length > SUMMARY_CONFIG.MIN_TOTAL_MESSAGES) {
          const candidateMessages = recentMessages.slice(0, Math.max(0, recentMessages.length - SUMMARY_CONFIG.KEEP_RECENT_MESSAGES));
          if (candidateMessages.length) {
            const unsummarized = candidateMessages.filter(msg => timestampMs(msg.timestamp) > lastCovered);

            if (unsummarized.length) {
              const textLines = unsummarized.map(m => {
                if (typeof m.content === 'string' && m.content.startsWith('[System] ')) return '';
                const sender = m.characterId
                  ? (sessionChars.find((c: { id: string; name?: string }) => c.id === m.characterId)?.name || 'Character')
                  : 'User';
                return `${sender}: ${m.content}`;
              }).filter(Boolean);

              const textBlock = textLines.join('\n');
              const exceedsChunkThreshold = unsummarized.length >= SUMMARY_CONFIG.MIN_CHUNK_MESSAGES || textBlock.length >= SUMMARY_CONFIG.MIN_CHUNK_CHARS;

              if (exceedsChunkThreshold && textBlock.trim().length) {
                const summaryPrompt = formatPrompt('copilot.chat.summaryPrompt', {
                  conversation: textBlock
                });
                let newSummary = '';
                try {
                  newSummary = await AIService.generateResponse(summaryPrompt, undefined, undefined, { temperature: 0.2, max_tokens: 300 });
                } catch (e) {
                  logger.warn('Summary generation failed; using placeholder.', e);
                  newSummary = '[Summary unavailable; continuing from recent context]';
                }

                const lastIncludedTs = unsummarized.reduce((latest, msg) => Math.max(latest, timestampMs(msg.timestamp)), lastCovered);

                if (lastIncludedTs > lastCovered) {
                  const nowTs = Date.now();
                  const trimmedSummary = newSummary.trim();

                  if (sumRows.length > 0) {
                    const merged = `${(sumRows[0].summary_text || '').trim()}\n\n${trimmedSummary}`.trim();
                    db.exec({
                      sql: 'UPDATE session_summaries SET summary_text = ?, covered_until = ?, updated_at = ? WHERE session_id = ?',
                      bind: [merged, lastIncludedTs, nowTs, sessionId]
                    });
                    sessionSummary = merged;
                  } else {
                    db.exec({
                      sql: 'INSERT INTO session_summaries (session_id, summary_text, covered_until, updated_at) VALUES (?, ?, ?, ?)',
                      bind: [sessionId, trimmedSummary, lastIncludedTs, nowTs]
                    });
                    sessionSummary = trimmedSummary;
                  }

                  await saveDatabase();
                }
              }
            }
          }
        }
      } catch (e) {
        logger.warn('Failed to update session summary', e);
      }
      
      for (const character of sessionChars) {
        try {
          // Build conversation context WITHOUT the current user message (it's added separately)
          const nameFor = (id?: string | null) => {
            if (!id) return 'User';
            const char = sessionChars.find((c: { id: string; name?: string }) => c.id === id);
            return char?.name || 'Character';
          };
          
          // Only include messages BEFORE the current user message
          const historyText = conversationHistory
            .map(msg => `${nameFor(msg.characterId as string | null)}: ${msg.content}`)
            .join('\n');
          
          // Create concise system prompt
          const systemPrompt = character.prompts?.system || 
            `You are ${character.name}. ${character.description || ''}`.trim();
          
          // Load global chat prompt from house config
          const houseConfig = await repositoryStorage.get('house_config') as any;
          const globalChatPrompt = houseConfig?.chatPrompt?.trim();
          const globalChatDirective = globalChatPrompt
            ? `\n\nGLOBAL CONTEXT:\n${globalChatPrompt}\n`
            : '';
          
          // Load character's hidden prompt (only they know this)
          const characterHiddenPrompt = character.prompts?.hiddenPrompt?.trim();
          const characterHiddenDirective = characterHiddenPrompt
            ? `\n\nPRIVATE INSTRUCTIONS (only for ${character.name}, DO NOT reveal):\n${characterHiddenPrompt}\n`
            : '';
          
          // Load hidden goals for this character
          const hiddenGoals = (goalsByChar[character.id] || [])
            .map(g => `- ${g.goal}`)
            .join('\n');
          const hiddenDirective = hiddenGoals
            ? `\n\nSUBTLE OBJECTIVES (weave naturally into conversation, don't mention explicitly):\n${hiddenGoals}\n`
            : '';

          // Scene context injection
          const sceneDirective = sceneContext || '';

          // Memory context
          const memorySection = sessionSummary 
            ? `\n\nPREVIOUS CONVERSATION SUMMARY:\n${sessionSummary}\n`
            : '';

          // Build the full prompt with STRICT formatting rules
          const fullPrompt = `${systemPrompt}${globalChatDirective}${characterHiddenDirective}${hiddenDirective}${sceneDirective}${memorySection}

RECENT CONVERSATION:
${historyText}
User: ${userMessage}

CRITICAL RESPONSE RULES:
- You are ${character.name}. Respond ONLY as dialogue/speech, like a real person texting or talking
- DO NOT use action descriptions, stage directions, asterisks, or parentheses for actions
- DO NOT write like a novel or roleplay (no "*smirks*" or "(leans closer)" or similar)
- Write ONLY what ${character.name} would actually SAY out loud
- Be direct, natural, and conversational - like real speech
- Keep response under 3 sentences
- Do NOT include your name before the response
- Each character has their own personality - show it through WORD CHOICE and TONE, not actions

${character.name}'s response:`;

          logger.log(`🎭 Generating response for ${character.name}...`);
          
          // Generate AI response with optimized settings
          const response = await AIService.generateResponse(fullPrompt, undefined, undefined, {
            temperature: 0.85,
            max_tokens: 150
          });

          if (response && response.trim()) {
            // Clean up response: remove action text, asterisks, parentheses
            let cleanedResponse = response.trim();
            
            // Remove parenthetical action descriptions like "(smirks)" or "(Her voice drops)"
            cleanedResponse = cleanedResponse.replace(/\([^)]+\)/g, '');
            
            // Remove asterisk actions like *leans in* or *grins*
            cleanedResponse = cleanedResponse.replace(/\*[^*]+\*/g, '');
            
            // Remove character name prefix if present (e.g., "Tilly: ")
            cleanedResponse = cleanedResponse.replace(/^[A-Z][a-z]+:\s*/i, '');
            
            // Clean up extra whitespace
            cleanedResponse = cleanedResponse.replace(/\s+/g, ' ').trim();
            
            // Skip if nothing left after cleaning
            if (!cleanedResponse || cleanedResponse.length < 3) {
              logger.warn(`Skipping empty response from ${character.name} after cleaning`);
              continue;
            }
            
            // Store character response
            const { db } = await getDb();
            const responseId = uuid();
            const responseTime = Date.now() + Math.floor(Math.random() * 3000); // Random delay 0-3s
            
            db.exec({
              sql: 'INSERT INTO messages (id, session_id, sender_id, content, created_at) VALUES (?, ?, ?, ?, ?)',
              bind: [responseId, sessionId, character.id, cleanedResponse, responseTime]
            });

            // Update session updated_at
            db.exec({
              sql: 'UPDATE chat_sessions SET updated_at = ? WHERE id = ?',
              bind: [responseTime, sessionId]
            });

            logger.log(`✅ Generated response for ${character.name}`);
          }
        } catch (error) {
          logger.error(`❌ Failed to generate response for ${character.name}:`, error);
          // Continue with other characters even if one fails
        }
      }
      
  await saveDatabase();
  logger.log('🎉 AI response generation completed');
      
    } catch (error) {
      logger.error('❌ Failed to generate character responses:', error);
    }
  }, [getSessionMessages]);

  const updateSessionGoal = useCallback(async (
    sessionId: string,
    characterId: string,
    goalText: string,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ) => {
    try {
      const { db } = await getDb();
      const now = Date.now();
      // Check if a goal already exists for this (session, character)
  const rows: { id?: string }[] = [];
      db.exec({
        sql: 'SELECT id FROM session_goals WHERE session_id = ? AND character_id = ?',
        bind: [sessionId, characterId],
        rowMode: 'object',
  callback: (r: unknown) => rows.push(r as { id?: string })
      });

      if (!goalText.trim()) {
        // Delete if empty
        db.exec({
          sql: 'DELETE FROM session_goals WHERE session_id = ? AND character_id = ?',
          bind: [sessionId, characterId]
        });
      } else if (rows.length > 0) {
        // Update existing
        db.exec({
          sql: 'UPDATE session_goals SET goal_text = ?, priority = ? WHERE session_id = ? AND character_id = ?',
          bind: [goalText.trim(), priority, sessionId, characterId]
        });
      } else {
        // Insert new
        const id = uuid();
        db.exec({
          sql: 'INSERT INTO session_goals (id, session_id, character_id, goal_text, priority, secret, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          bind: [id, sessionId, characterId, goalText.trim(), priority, 1, now]
        });
      }

      // Touch session updated_at
      db.exec({
        sql: 'UPDATE chat_sessions SET updated_at = ? WHERE id = ?',
        bind: [now, sessionId]
      });

      await saveDatabase();
      // Refresh sessions so UI can pick up fresh goals via load
      await loadSessions();
    } catch (e) {
      logger.error('Failed to update session goal', e);
      throw e;
    }
  }, [loadSessions]);

  const createSession = useCallback(async (
    type: 'individual' | 'group' | 'scene' | 'assistant' | 'interview',
    participantIds: string[],
    options?: { hiddenGoals?: Record<string, { goal: string; priority?: 'low' | 'medium' | 'high' }>; assistantOnly?: boolean }
  ): Promise<string> => {
    try {
      logger.log('🆕 Creating session:', type, 'with participants:', participantIds);
      if (type === 'assistant') {
        const existing = sessions.find(s => s.type === 'assistant');
        if (existing) {
          logger.log('🔁 Reusing existing assistant session', existing.id);
          setActiveSessionId(existing.id);
          return existing.id;
        }
      }
      if (type === 'assistant') {
        const existing = sessions.find(s => s.type === 'assistant');
        if (existing) {
          logger.log('🔁 Reusing existing assistant session', existing.id);
          setActiveSessionId(existing.id);
          return existing.id;
        }
      }
      
      // Validate that all participant IDs exist in unified storage
      const validParticipants = participantIds.filter(id => {
        const exists = characters?.some(c => c.id === id);
        if (!exists) {
          logger.warn('⚠️ Character not found in unified storage:', id);
        }
        return exists;
      });
      
      if (type !== 'assistant' && validParticipants.length === 0) {
        throw new Error('No valid characters found for chat session');
      }
      
      const { db } = await getDb();
      const sessionId = uuid();
      const now = Date.now();

      db.exec({
        sql: 'INSERT INTO chat_sessions (id, type, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        bind: [sessionId, type, `${type} chat`, now, now]
      });

      // Only add valid participants - skip SQLite character table foreign key
      // Store participant IDs directly since we validate against unified storage
      if (type !== 'assistant') {
        for (const participantId of validParticipants) {
          const participantEntryId = uuid();
          db.exec({
            sql: 'INSERT INTO session_participants (id, session_id, character_id, joined_at) VALUES (?, ?, ?, ?)',
            bind: [participantEntryId, sessionId, participantId, now]
          });
        }
      }

      // Persist hidden goals when provided
      if (options?.hiddenGoals) {
        for (const [charId, g] of Object.entries(options.hiddenGoals)) {
          if (!validParticipants.includes(charId)) continue;
          const gid = uuid();
          db.exec({
            sql: 'INSERT INTO session_goals (id, session_id, character_id, goal_text, priority, secret, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            bind: [gid, sessionId, charId, g.goal, g.priority || 'medium', 1, now]
          });
        }
      }

  logger.log('✅ Session created successfully:', sessionId);
      await saveDatabase();

  await loadSessions();
      setActiveSessionId(sessionId);
      try { legacyStorage.setItem('active_chat_session', sessionId); } catch { /* ignore */ }
      dispatchGlobalEvent('chat-active-session-changed', { sessionId });
  return sessionId;
    } catch (error) {
        logger.error('❌ Failed to create session:', error);
      throw error;
    }
  }, [loadSessions, characters]);

  // Create an interview session: user + copilot interviewer + target character(s)
  const createInterviewSession = useCallback(async (characterId: string): Promise<string> => {
    try {
      // Reuse existing interview session for character if active and not ended
      const existing = sessions.find(s => s.type === 'interview' && s.participantIds.includes(characterId) && !s.endedAt);
      if (existing) {
        logger.log('🔁 Reusing interview session for character', characterId, existing.id);
        setActiveSessionId(existing.id);
        return existing.id;
      }
      const sessionId = await createSession('interview', [characterId]);
      logger.log('🆕 Interview session created', sessionId, 'for character', characterId);
      // Generate opening question
      let opening = '';
      try {
        const char = (characters || []).find(c => c.id === characterId);
        const basePrompt = formatPrompt('copilot.chat.interviewOpening', {
          characterName: char?.name || 'Character'
        });
        opening = await AIService.generateResponse(basePrompt, undefined, undefined, { temperature: 0.7, max_tokens: 80 });
      } catch (e) {
        logger.warn('Failed to generate opening interview question, using fallback', e);
        opening = 'Let\'s start—can you introduce yourself briefly?';
      }
      // Store opening question as copilot message
      await sendMessage(sessionId, opening, 'copilot', { copilot: true });
      return sessionId;
    } catch (e) {
      logger.error('Failed to create interview session', e);
      throw e;
    }
  }, [createSession, sessions, characters, sendMessage]);

  // Create a group session with optional hidden roles/objectives (encoded into session_goals rows)
  const createGroupSession = useCallback(async (
    participantIds: string[],
    roles?: Record<string, { role: string; objective?: string; priority?: 'low' | 'medium' | 'high' }>
  ): Promise<string> => {
    const hiddenGoals: Record<string, { goal: string; priority?: 'low' | 'medium' | 'high' }> = {};
    if (roles) {
      for (const [cid, r] of Object.entries(roles)) {
        const text = r.objective ? `[ROLE] ${r.role}\n[OBJECTIVE] ${r.objective}` : `[ROLE] ${r.role}`;
        hiddenGoals[cid] = { goal: text, priority: r.priority || 'medium' };
      }
    }
    return await createSession('group', participantIds, { hiddenGoals });
  }, [createSession]);

  const closeSession = useCallback(async (sessionId: string) => {
    try {
      const { db } = await getDb();
      db.exec({
        sql: 'UPDATE chat_sessions SET ended_at = ?, updated_at = ? WHERE id = ?',
        bind: [Date.now(), Date.now(), sessionId]
      });

      await saveDatabase();
      await loadSessions();
    } catch (error) {
      logger.error('❌ Failed to close session:', error);
    }
  }, [loadSessions]);

  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      const { db } = await getDb();

      // Delete messages first
      db.exec({
        sql: 'DELETE FROM messages WHERE session_id = ?',
        bind: [sessionId]
      });

      // Delete participants
      db.exec({
        sql: 'DELETE FROM session_participants WHERE session_id = ?',
        bind: [sessionId]
      });

      // Delete session
      db.exec({
        sql: 'DELETE FROM chat_sessions WHERE id = ?',
        bind: [sessionId]
      });

      await saveDatabase();
      await loadSessions();
      
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
      }
    } catch (error) {
      logger.error('❌ Failed to delete session:', error);
    }
  }, [loadSessions, activeSessionId]);

  const switchToSession = useCallback(async (sessionId: string) => {
    try {
      const { db } = await getDb();
      // Re-open session if it was ended
      db.exec({
        sql: 'UPDATE chat_sessions SET ended_at = NULL, updated_at = ? WHERE id = ?',
        bind: [Date.now(), sessionId]
      });
      await saveDatabase();
      setActiveSessionId(sessionId);
      try { legacyStorage.setItem('active_chat_session', sessionId); } catch { /* ignore */ }
      dispatchGlobalEvent('chat-active-session-changed', { sessionId });
      await loadSessions();
    } catch (e) {
      logger.warn('Failed to switch/open session', e);
      setActiveSessionId(sessionId);
    }
  }, [loadSessions]);

  const updateSessionMessage = useCallback(async () => {
    // Placeholder for future implementation
    logger.log('updateSessionMessage not implemented');
  }, []);

  const addSessionMessage = useCallback(async () => {
    // Placeholder for future implementation
    logger.log('addSessionMessage not implemented');
  }, []);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  // On mount, adopt existing active session from optional backup storage
    try {
      const stored = legacyStorage.getItem('active_chat_session');
      if (stored) {
        setActiveSessionId(stored);
      }
  } catch { /* ignore */ }
    // Event listeners to sync across multiple hook instances
    const onSessionsUpdated = () => {
      // Reload without rebroadcast to avoid event storm
      loadSessions({ suppressBroadcast: true });
    };
    const onActiveChanged = (e: unknown) => {
      const anyEvt = e as { detail?: { sessionId?: string } };
      const detail = anyEvt?.detail || {};
      if (detail.sessionId) setActiveSessionId(detail.sessionId);
    };
    addGlobalEventListener('chat-sessions-updated', onSessionsUpdated);
    addGlobalEventListener('chat-active-session-changed', onActiveChanged);
    return () => {
      removeGlobalEventListener('chat-sessions-updated', onSessionsUpdated);
      removeGlobalEventListener('chat-active-session-changed', onActiveChanged);
    };
  }, [loadSessions]);

  const clearSessionMessages = useCallback(async (sessionId: string) => {
    try {
      logger.log('🗑️ Clearing messages for session:', sessionId);
      const { db } = await getDb();
      
      // Delete all messages for this session
      db.exec({
        sql: 'DELETE FROM messages WHERE session_id = ?',
        bind: [sessionId]
      });
      
      // Delete session summary
      db.exec({
        sql: 'DELETE FROM session_summaries WHERE session_id = ?',
        bind: [sessionId]
      });
      
      // Update session timestamp
      db.exec({
        sql: 'UPDATE chat_sessions SET updated_at = ? WHERE id = ?',
        bind: [Date.now(), sessionId]
      });
      
      await saveDatabase();
      await loadSessions();
      logger.log('✅ Session messages cleared');
      toast.success('Chat cleared');
    } catch (error) {
      logger.error('❌ Failed to clear session messages:', error);
      toast.error('Failed to clear chat');
    }
  }, [loadSessions]);

  const analyzeAndEndSession = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      const { db } = await getDb();
      const sessionMeta: Array<{ ended_at?: string | number | null }> = [];
      db.exec({
        sql: 'SELECT ended_at FROM chat_sessions WHERE id = ?',
        bind: [sessionId],
        rowMode: 'object',
        callback: (r: unknown) => {
          sessionMeta.push(r as { ended_at?: string | number | null });
        }
      });

      const summaryRows: Array<{ summary_text?: string | null; covered_until?: string | number | null }> = [];
      db.exec({
        sql: 'SELECT summary_text, covered_until FROM session_summaries WHERE session_id = ?',
        bind: [sessionId],
        rowMode: 'object',
        callback: (r: unknown) => {
          summaryRows.push(r as { summary_text?: string | null; covered_until?: string | number | null });
        }
      });

      const endedAtValue = sessionMeta[0]?.ended_at ? Number(sessionMeta[0].ended_at) : 0;
      const existingSummary = summaryRows[0]?.summary_text?.trim();
      const coveredUntil = summaryRows[0]?.covered_until ? Number(summaryRows[0].covered_until) : 0;

      const messages = await getSessionMessages(sessionId);

      const latestMessageTimestamp = messages.reduce((latest, msg) => {
        const rawTimestamp = msg.timestamp;
        const ts = rawTimestamp instanceof Date
          ? rawTimestamp.getTime()
          : typeof rawTimestamp === 'number'
            ? rawTimestamp
            : new Date(rawTimestamp as string).getTime();
        return Number.isFinite(ts) ? Math.max(latest, ts) : latest;
      }, 0);

      if (endedAtValue && existingSummary && coveredUntil >= latestMessageTimestamp) {
        logger.log('ℹ️ Session already analyzed; skipping duplicate run for', sessionId);
        toast.info('Conversation already analyzed.');
        return false;
      }

      logger.log('📊 Analyzing and ending session:', sessionId);
      
      // Get session participants
      const participantRows: Array<{ character_id: string }> = [];
      db.exec({
        sql: 'SELECT character_id FROM session_participants WHERE session_id = ?',
        bind: [sessionId],
        rowMode: 'object',
        callback: (r: unknown) => {
          const row = r as { character_id: string };
          participantRows.push(row);
        }
      });
      const participantIds = participantRows.map(p => p.character_id);
      
      const participantCharacters: Character[] = participantIds
        .map(pid => (characters || []).find(c => c.id === pid))
        .filter((c): c is Character => Boolean(c));
      
      // Run full behavior analysis
      if (participantCharacters.length && messages.length > 0) {
        const lastUserMessage = messages.filter(m => !m.characterId).pop();
        
        const analysis = await analyzeBehavior({
          sessionId,
          messages,
          characters: participantCharacters,
          latestUserMessage: lastUserMessage?.content || ''
        });
        
        // Apply all adjustments
        for (const adjustment of analysis.adjustments) {
          const fullChar = (characters || []).find(c => c.id === adjustment.characterId);
          if (!fullChar) continue;
          
          const updatedStats = { ...fullChar.stats };
          const updatedProgression = { ...fullChar.progression };
          
          if (adjustment.statAdjustments.stats) {
            for (const [statKey, delta] of Object.entries(adjustment.statAdjustments.stats)) {
              if (typeof delta !== 'number' || Number.isNaN(delta)) continue;
              if (statKey === 'experience') {
                const nextLevelExp = updatedProgression?.nextLevelExp ?? 100;
                let updatedExp = (updatedStats.experience ?? 0) + delta;
                if (updatedExp < 0) updatedExp = 0;
                let newLevel = updatedStats.level ?? 1;
                let threshold = nextLevelExp;
                while (updatedExp >= threshold && threshold > 0) {
                  updatedExp -= threshold;
                  newLevel += 1;
                  threshold = Math.round(threshold * 1.25);
                }
                updatedStats.experience = updatedExp;
                updatedStats.level = newLevel;
                if (updatedProgression) {
                  updatedProgression.level = Math.max(updatedProgression.level || 1, newLevel);
                  updatedProgression.nextLevelExp = threshold;
                }
              } else if (statKey in updatedStats) {
                const typedKey = statKey as keyof typeof updatedStats;
                const currentValue = Number(updatedStats[typedKey] ?? 0);
                updatedStats[typedKey] = clampNumber(currentValue + delta);
              }
            }
          }
          
          if (adjustment.statAdjustments.progression) {
            for (const [progKey, delta] of Object.entries(adjustment.statAdjustments.progression)) {
              if (typeof delta !== 'number' || Number.isNaN(delta)) continue;
              if (isNumericProgressionKey(progKey)) {
                const current = Number(updatedProgression?.[progKey] ?? 0);
                updatedProgression[progKey] = clampNumber(current + delta);
              }
            }
          }
          
          const behaviorProfile = createBehaviorProfile(adjustment, fullChar.behaviorProfile);
          const memories = buildMemoryEntries(fullChar, adjustment.memories);
          
          await updateCharacter(fullChar.id, {
            stats: updatedStats,
            progression: updatedProgression,
            behaviorProfile,
            memories,
            lastInteraction: new Date()
          } as Partial<Character>);
          
          logger.log(`✅ Updated ${fullChar.name} profile from conversation analysis`);
        }
      }
      
      // Extract insights for Ali
      const userMessages = messages.filter(m => !m.characterId);
      const content = userMessages.map(m => m.content).join(' ').toLowerCase();
      
      const insights: Record<string, unknown> = {};
      if (content.includes('hurt') || content.includes('pain')) {
        insights.prefersPain = true;
      }
      if (content.includes('young') || content.includes('teen')) {
        insights.prefersYounger = true;
      }
      
      await aliProfileService.updateInsights(insights);
      
      // Close the session
      await closeSession(sessionId);
      
      logger.log('✅ Session analyzed and ended');
      toast.success('ANALYSIS COMPLETE. STORY AND STATS UPDATED');
      return true;
    } catch (e) {
      logger.error('Failed to analyze and end session', e);
      toast.error('Failed to end conversation');
      return false;
    }
  }, [getSessionMessages, characters, updateCharacter, closeSession]);

  // Reuse or create latest individual session for a single character
  const ensureIndividualSession = useCallback(async (characterId: string): Promise<string> => {
    // Find most recently updated individual session with exactly this participant
    const existing = [...sessions]
      .filter(s => s.type === 'individual' && s.participantIds.length === 1 && s.participantIds[0] === characterId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    if (existing.length) {
      const id = existing[0].id;
      try { await switchToSession(id); } catch { setActiveSessionId(id); }
      return id;
    }
    // Otherwise create new
    const id = await createSession('individual', [characterId]);
    return id;
  }, [sessions, switchToSession, createSession]);

  return {
    sessions: sessions || [],
    activeSessionId,
    setActiveSessionId,
    sessionsLoaded,
    loadSessions,
    getSessionMessages,
    sendMessage,
    createSession,
    createGroupSession,
    closeSession,
    deleteSession,
    switchToSession,
    updateSessionMessage,
    addSessionMessage,
    updateSessionGoal,
    clearSessionMessages,
    analyzeAndEndSession,
    ensureIndividualSession,
    createInterviewSession
  };
}
