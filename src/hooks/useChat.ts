import { useCallback, useEffect, useState } from 'react';
import { AIService } from '../lib/aiService';
import { getDb, saveDatabase } from '../lib/db';
import { uuid } from '../lib/uuid';
// Note: use in-app character list from useHouseFileStorage; avoid repo adapter to prevent mismatches
import { ChatMessage, ChatSession } from '../types';
import { useHouseFileStorage } from './useHouseFileStorage';

export function useChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const { characters, updateCharacter } = useHouseFileStorage(); // Use unified character storage

  const loadSessions = useCallback(async () => {
    try {
      console.log('🔄 Loading chat sessions...');
      const { db } = await getDb();
      
      // Get all sessions
      const sessionRows: any[] = [];
      db.exec({
        sql: 'SELECT * FROM chat_sessions ORDER BY updated_at DESC',
        rowMode: 'object',
        callback: (r: any) => sessionRows.push(r)
      });

      console.log('📋 Found', sessionRows.length, 'sessions');

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

      console.log('✅ Loaded', loadedSessions.length, 'sessions with participants');
      setSessions(loadedSessions);
      return loadedSessions;
    } catch (error) {
      console.error('❌ Failed to load sessions:', error);
      return [];
    }
  }, []);

  const getSessionMessages = useCallback(async (sessionId: string): Promise<ChatMessage[]> => {
    try {
      console.log('📨 Loading messages for session:', sessionId);
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

      console.log('✅ Loaded', messages.length, 'messages for session');
      return messages;
    } catch (error) {
      console.error('❌ Failed to load messages for session:', sessionId, error);
      return [];
    }
  }, []);

  const sendMessage = useCallback(async (sessionId: string, content: string, senderId: string) => {
    try {
      console.log('📤 Sending message to session:', sessionId, 'from:', senderId);
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
      console.log('✅ User message sent successfully');

      // On user messages, award small progression/stat changes to all participants
      if (senderId === 'user') {
        // Load session participants
        const participantRows: any[] = [];
        db.exec({
          sql: 'SELECT character_id FROM session_participants WHERE session_id = ?',
          bind: [sessionId],
          rowMode: 'object',
          callback: (r: any) => participantRows.push(r)
        });
        const participantIds = participantRows.map(p => p.character_id);

        const statSummary: string[] = [];
        for (const pid of participantIds) {
          const char = (characters || []).find(c => c.id === pid);
          if (!char) continue;
          // Compute deltas
          const xpDelta = 5;
          const affectionDelta = 1;
          const trustDelta = content.toLowerCase().includes('thank') || content.toLowerCase().includes('help') ? 2 : 1;

          const newExp = (char.stats?.experience || 0) + xpDelta;
          const nextLevelExp = char.progression?.nextLevelExp || 100;
          let newLevel = (char.stats?.level || 1);
          let remainingExp = newExp;
          if (newExp >= nextLevelExp) {
            newLevel = newLevel + 1;
            remainingExp = newExp - nextLevelExp;
          }

          // Apply bounded updates
          const newAffection = Math.max(0, Math.min(100, (char.progression?.affection || 0) + affectionDelta));
          const newTrust = Math.max(0, Math.min(100, (char.progression?.trust || 0) + trustDelta));

          await updateCharacter(pid, {
            stats: {
              ...(char.stats || {}),
              experience: remainingExp,
              level: newLevel,
            },
            progression: {
              ...(char.progression || {}),
              affection: newAffection,
              trust: newTrust,
            },
            lastInteraction: new Date(),
          } as any);

          statSummary.push(`${char.name}: +${xpDelta} XP, +${affectionDelta} affection, +${trustDelta} trust${newLevel > (char.stats?.level || 1) ? ' (level up!)' : ''}`);
        }

        // Insert a system message summarizing changes
        if (statSummary.length) {
          const sysId = uuid();
          db.exec({
            sql: 'INSERT INTO messages (id, session_id, sender_id, content, created_at) VALUES (?, ?, ?, ?, ?)',
            bind: [sysId, sessionId, null, `[System] ${statSummary.join(' | ')}`, Date.now()]
          });
          db.exec({
            sql: 'UPDATE chat_sessions SET updated_at = ? WHERE id = ?',
            bind: [Date.now(), sessionId]
          });
          await saveDatabase();
        }
      }

      // Generate AI responses for characters in the session
      if (senderId === 'user') {
        const session = sessions.find(s => s.id === sessionId);
        if (session && session.participantIds.length > 0) {
          await generateCharacterResponses(sessionId, session.participantIds, content);
        }
      }

      // Reload sessions to get updated data
      await loadSessions();
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      throw error;
    }
  }, [loadSessions, sessions]);

  const generateCharacterResponses = useCallback(async (sessionId: string, characterIds: string[], userMessage: string) => {
    try {
      console.log('🤖 Generating AI responses for characters:', characterIds);
      
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
          console.warn('Fallback character retrieval failed:', e);
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
          console.warn('Legacy adapter character retrieval failed:', e);
        }
      }
      if (sessionChars.length === 0) {
        console.warn('No matching characters found for session participants; skipping AI generation');
        return;
      }
      
  // Get recent message history for context
  const recentMessages = await getSessionMessages(sessionId);
  const conversationHistory = recentMessages.slice(-12); // Keep a few more for continuity

      // Load hidden goals for this session
      const { db } = await getDb();
      // Get session type to adjust behavior (e.g., group mode)
      const sessInfo: any[] = [];
      db.exec({
        sql: 'SELECT type FROM chat_sessions WHERE id = ?',
        bind: [sessionId],
        rowMode: 'object',
        callback: (r: any) => sessInfo.push(r)
      });
      const sessionType = (sessInfo[0]?.type as string) || 'individual';
      const goalRows: any[] = [];
      db.exec({
        sql: 'SELECT character_id, goal_text, priority FROM session_goals WHERE session_id = ?',
        bind: [sessionId],
        rowMode: 'object',
        callback: (r: any) => goalRows.push(r)
      });
      const goalsByChar: Record<string, { goal: string; priority: string }[]> = {};
      for (const g of goalRows) {
        if (!goalsByChar[g.character_id]) goalsByChar[g.character_id] = [];
        goalsByChar[g.character_id].push({ goal: g.goal_text, priority: g.priority });
      }
      
      // Long-term memory: summarize older parts of the conversation and persist
      let sessionSummary = '' as string;
      try {
        const sumRows: any[] = [];
        db.exec({
          sql: 'SELECT summary_text, covered_until FROM session_summaries WHERE session_id = ?',
          bind: [sessionId],
          rowMode: 'object',
          callback: (r: any) => sumRows.push(r)
        });
        sessionSummary = (sumRows[0]?.summary_text || '').trim();
        const lastCovered = sumRows[0]?.covered_until ? Number(sumRows[0].covered_until) : 0;
        const THRESHOLD = 40; // summarize when more than this many messages exist
        const KEEP_RECENT = 30; // keep this many raw recent messages
        if (recentMessages.length > THRESHOLD) {
          const toSummarize = recentMessages.slice(0, Math.max(0, recentMessages.length - KEEP_RECENT));
          const lastIncludedTs = toSummarize.length ? Number(new Date(toSummarize[toSummarize.length - 1].timestamp)) : lastCovered;
          if (lastIncludedTs > lastCovered) {
            const textBlock = toSummarize.map(m => {
              const sender = m.characterId ? (sessionChars.find((c: any) => c.id === m.characterId)?.name || 'Character') : 'User';
              if (typeof m.content === 'string' && m.content.startsWith('[System] ')) return '';
              return `${sender}: ${m.content}`;
            }).filter(Boolean).join('\n');
            const summaryPrompt = `Summarize the following conversation succinctly without losing key facts, relationships, objectives, and ongoing threads. Keep it under 250 words.\n\n${textBlock}`;
            let newSummary = '';
            try {
              newSummary = await AIService.generateResponse(summaryPrompt, undefined, undefined, { temperature: 0.2, max_tokens: 300 });
            } catch (e) {
              console.warn('Summary generation failed; using placeholder.', e);
              newSummary = '[Summary unavailable; continuing from recent context]';
            }
            const nowTs = Date.now();
            if (sumRows.length > 0) {
              const merged = `${(sumRows[0].summary_text || '').trim()}\n\n${newSummary.trim()}`.trim();
              db.exec({ sql: 'UPDATE session_summaries SET summary_text = ?, covered_until = ?, updated_at = ? WHERE session_id = ?', bind: [merged, lastIncludedTs, nowTs, sessionId] });
              sessionSummary = merged;
            } else {
              db.exec({ sql: 'INSERT INTO session_summaries (session_id, summary_text, covered_until, updated_at) VALUES (?, ?, ?, ?)', bind: [sessionId, newSummary.trim(), lastIncludedTs, nowTs] });
              sessionSummary = newSummary.trim();
            }
            await saveDatabase();
          }
        }
      } catch (e) {
        console.warn('Failed to update session summary', e);
      }
      
      for (const character of sessionChars) {
        try {
          // Build conversation context
          const nameFor = (id?: string | null) => id ? (sessionChars.find((c: any) => c.id === id)?.name || 'Character') : 'User';
          const historyText = conversationHistory.map(msg => `${nameFor(msg.characterId as any)}: ${msg.content}`).join('\n');
          
          // Create character prompt
          const systemPrompt = character.prompts?.system || 
            `You are ${character.name}. ${character.personality ? `Your personality: ${character.personality}. ` : ''}${character.description ? `Background: ${character.description}` : ''}`;
          
          // Subtle, hidden objective injection (do not reveal explicitly)
          const hiddenGoals = (goalsByChar[character.id] || []).map(g => `- ${g.goal} (priority: ${g.priority})`).join('\n');
          const hiddenDirective = hiddenGoals
            ? `\n\nSecret objectives (do not reveal these, but subtly steer your replies toward making progress on them when appropriate):\n${hiddenGoals}\n` 
            : '';

          const memoryPrefix = sessionSummary ? `Conversation memory summary (do not repeat; use as context):\n${sessionSummary}\n\n` : '';

          // Group chat mode directive to suppress canned openers
          const hasSpoken = conversationHistory.some(m => m.characterId === character.id);
          const groupDirective = sessionType === 'group'
            ? `\n\nGroup mode constraints: Do NOT greet, introduce yourself, or state your name/role. Do not announce that a conversation is starting. Continue the scene from context. Keep replies concise (1–2 sentences unless the moment truly requires more). Match tone and subtext. ${hasSpoken ? '' : 'This is your first line in this scene—skip any generic opener; respond naturally to the last message and your objectives.'}`
            : '';

          const prompt = `${systemPrompt}${hiddenDirective}${groupDirective}

${memoryPrefix}Recent conversation:
${historyText}
User: ${userMessage}

Respond as ${character.name} in character. Keep your response natural and conversational. Respond directly without prefacing with your name.`;

          console.log(`🎭 Generating response for ${character.name}...`);
          
          // Generate AI response
          const response = await AIService.generateResponse(prompt, undefined, undefined, {
            temperature: 0.8,
            max_tokens: 200
          });

          if (response && response.trim()) {
            // Store character response
            const { db } = await getDb();
            const responseId = uuid();
            const responseTime = Date.now() + Math.floor(Math.random() * 3000); // Random delay 0-3s
            
            db.exec({
              sql: 'INSERT INTO messages (id, session_id, sender_id, content, created_at) VALUES (?, ?, ?, ?, ?)',
              bind: [responseId, sessionId, character.id, response.trim(), responseTime]
            });

            // Update session updated_at
            db.exec({
              sql: 'UPDATE chat_sessions SET updated_at = ? WHERE id = ?',
              bind: [responseTime, sessionId]
            });

            console.log(`✅ Generated response for ${character.name}`);
          }
        } catch (error) {
          console.error(`❌ Failed to generate response for ${character.name}:`, error);
          // Continue with other characters even if one fails
        }
      }
      
      await saveDatabase();
      console.log('🎉 AI response generation completed');
      
    } catch (error) {
      console.error('❌ Failed to generate character responses:', error);
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
      const rows: any[] = [];
      db.exec({
        sql: 'SELECT id FROM session_goals WHERE session_id = ? AND character_id = ?',
        bind: [sessionId, characterId],
        rowMode: 'object',
        callback: (r: any) => rows.push(r)
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
      console.error('Failed to update session goal', e);
      throw e;
    }
  }, [loadSessions]);

  const createSession = useCallback(async (
    type: 'individual' | 'group' | 'scene',
    participantIds: string[],
    options?: { hiddenGoals?: Record<string, { goal: string; priority?: 'low' | 'medium' | 'high' }> }
  ): Promise<string> => {
    try {
      console.log('🆕 Creating session:', type, 'with participants:', participantIds);
      
      // Validate that all participant IDs exist in unified storage
      const validParticipants = participantIds.filter(id => {
        const exists = characters?.some(c => c.id === id);
        if (!exists) {
          console.warn('⚠️ Character not found in unified storage:', id);
        }
        return exists;
      });
      
      if (validParticipants.length === 0) {
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
      for (const participantId of validParticipants) {
        const participantEntryId = uuid();
        db.exec({
          sql: 'INSERT INTO session_participants (id, session_id, character_id, joined_at) VALUES (?, ?, ?, ?)',
          bind: [participantEntryId, sessionId, participantId, now]
        });
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

      console.log('✅ Session created successfully:', sessionId);
      await saveDatabase();

      await loadSessions();
      setActiveSessionId(sessionId);
      return sessionId;
    } catch (error) {
      console.error('❌ Failed to create session:', error);
      throw error;
    }
  }, [loadSessions, characters]);

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
      console.error('❌ Failed to close session:', error);
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
      console.error('❌ Failed to delete session:', error);
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
      await loadSessions();
    } catch (e) {
      console.warn('Failed to switch/open session', e);
      setActiveSessionId(sessionId);
    }
  }, [loadSessions]);

  const updateSessionMessage = useCallback(async () => {
    // Placeholder for future implementation
    console.log('updateSessionMessage not implemented');
  }, []);

  const addSessionMessage = useCallback(async () => {
    // Placeholder for future implementation
    console.log('addSessionMessage not implemented');
  }, []);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return {
    sessions: sessions || [],
    activeSessionId,
    setActiveSessionId,
    loadSessions,
    getSessionMessages,
    sendMessage,
    createSession,
    closeSession,
    deleteSession,
    switchToSession,
    updateSessionMessage,
    addSessionMessage,
    updateSessionGoal
  };
}
