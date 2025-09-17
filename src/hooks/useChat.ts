import { useCallback, useState } from 'react';
import { getDb, saveDatabase } from '../lib/db';
import { ChatMessage, ChatSession } from '../types';

export function useChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      const { db } = await getDb();
      const result = db.exec({
        sql: 'SELECT * FROM chat_sessions ORDER BY created_at DESC',
        returnValue: 'resultRows',
        rowMode: 'object'
      });

      const loadedSessions: ChatSession[] = result.map((row: any) => ({
        id: row.id,
        type: row.type,
        participantIds: [], // Will load from session_participants
        messages: [], // Will load messages separately
        context: row.title, // Using title as context for now
        active: true, // All loaded sessions are considered active for now
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));

      setSessions(loadedSessions);
      return loadedSessions;
    } catch (error) {
      console.error('Failed to load sessions:', error);
      return [];
    }
  }, []);

  const getSessionMessages = useCallback(async (sessionId: string): Promise<ChatMessage[]> => {
    try {
      const { db } = await getDb();
      const result = db.exec({
        sql: 'SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC',
        bind: [sessionId],
        returnValue: 'resultRows',
        rowMode: 'object'
      });

      return result.map((row: any) => ({
        id: row.id,
        characterId: row.character_id,
        content: row.content,
        timestamp: new Date(row.created_at),
        type: row.message_type || 'text',
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      }));
    } catch (error) {
      console.error('Failed to load messages for session:', sessionId, error);
      return [];
    }
  }, []);

  const sendMessage = useCallback(async (sessionId: string, content: string, senderId: string) => {
    try {
      const { db } = await getDb();
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      db.exec({
        sql: 'INSERT INTO messages (id, session_id, character_id, content, created_at, message_type) VALUES (?, ?, ?, ?, ?, ?)',
        bind: [messageId, sessionId, senderId === 'user' ? null : senderId, content, new Date().toISOString(), 'text']
      });

      // Update session updated_at
      db.exec({
        sql: 'UPDATE chat_sessions SET updated_at = ? WHERE id = ?',
        bind: [new Date().toISOString(), sessionId]
      });

      // Trigger persistence
      await saveDatabase();

      // Reload sessions to get updated data
      await loadSessions();
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }, [loadSessions]);

  const createSession = useCallback(async (type: 'individual' | 'group' | 'scene', participantIds: string[]): Promise<string> => {
    try {
      const { db } = await getDb();
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      db.exec({
        sql: 'INSERT INTO chat_sessions (id, type, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        bind: [sessionId, type, `${type} chat`, now, now]
      });

      // Add participants
      for (const participantId of participantIds) {
        db.exec({
          sql: 'INSERT INTO session_participants (session_id, character_id, joined_at) VALUES (?, ?, ?)',
          bind: [sessionId, participantId, now]
        });
      }

      // Trigger persistence
      await saveDatabase();

      await loadSessions();
      setActiveSessionId(sessionId);
      return sessionId;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }, [loadSessions]);

  const closeSession = useCallback(async (sessionId: string) => {
    try {
      const { db } = await getDb();
      db.exec({
        sql: 'UPDATE chat_sessions SET updated_at = ? WHERE id = ?',
        bind: [new Date().toISOString(), sessionId]
      });

      // Trigger persistence
      await saveDatabase();

      await loadSessions();
    } catch (error) {
      console.error('Failed to close session:', error);
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

      // Trigger persistence
      await saveDatabase();

      await loadSessions();
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  }, [loadSessions, activeSessionId]);

  const switchToSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
  }, []);

  const updateSessionMessage = useCallback(async () => {
    // Placeholder for future implementation
    console.log('updateSessionMessage not implemented');
  }, []);

  const addSessionMessage = useCallback(async () => {
    // Placeholder for future implementation
    console.log('addSessionMessage not implemented');
  }, []);

  // Load sessions on mount
  useState(() => {
    loadSessions();
  });

  return {
    sessions,
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
    addSessionMessage
  };
}
