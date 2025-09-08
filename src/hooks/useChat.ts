import { useKV } from '@github/spark/hooks';
import { ChatSession, ChatMessage, Character } from '@/types';
import { useState } from 'react';

export function useChat() {
  const [sessions, setSessions] = useKV<ChatSession[]>('chat-sessions', []);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  // Ensure sessions is never undefined
  const safeSessions = sessions || [];
  const activeSession = safeSessions.find(s => s.id === activeSessionId);

  const createSession = (type: 'individual' | 'group' | 'scene', participantIds: string[], context?: string) => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      type,
      participantIds,
      messages: [],
      context,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setSessions(current => [...(current || []), newSession]);
    setActiveSessionId(newSession.id);
    return newSession.id;
  };

  const sendMessage = async (content: string, characterId?: string) => {
    if (!activeSession) return;

    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      characterId,
      content,
      timestamp: new Date(),
      type: 'text'
    };

    setSessions(current => {
      const currentSessions = current || [];
      return currentSessions.map(session =>
        session.id === activeSessionId
          ? {
              ...session,
              messages: [...session.messages, message],
              updatedAt: new Date()
            }
          : session
      );
    });

    // If this is a user message, trigger AI responses
    if (!characterId && activeSession.participantIds.length > 0) {
      await generateAIResponses(activeSession.id, message);
    }
  };

  const generateAIResponses = async (sessionId: string, userMessage: ChatMessage) => {
    const session = safeSessions.find(s => s.id === sessionId);
    if (!session) return;

    // This would integrate with the AI service
    // For now, we'll add placeholder responses
    for (const characterId of session.participantIds) {
      setTimeout(async () => {
        const response = await generateCharacterResponse(characterId, userMessage, session);
        if (response) {
          setSessions(current => {
            const currentSessions = current || [];
            return currentSessions.map(s =>
              s.id === sessionId
                ? {
                    ...s,
                    messages: [...s.messages, response],
                    updatedAt: new Date()
                  }
                : s
            );
          });
        }
      }, Math.random() * 2000 + 500); // Stagger responses
    }
  };

  const generateCharacterResponse = async (
    characterId: string,
    userMessage: ChatMessage,
    session: ChatSession
  ): Promise<ChatMessage | null> => {
    try {
      // This would use the actual AI integration
      // For now, return a placeholder
      const responses = [
        "That's interesting! Tell me more.",
        "I see what you mean.",
        "How does that make you feel?",
        "I've been thinking about that too.",
        "*nods thoughtfully*"
      ];

      const response: ChatMessage = {
        id: `msg-${Date.now()}-${characterId}`,
        characterId,
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
        type: 'text'
      };

      return response;
    } catch (error) {
      console.error('Error generating AI response:', error);
      return null;
    }
  };

  const switchToSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
  };

  const closeSession = (sessionId: string) => {
    setSessions(current => {
      const currentSessions = current || [];
      return currentSessions.map(session =>
        session.id === sessionId
          ? { ...session, active: false }
          : session
      );
    });
    
    if (activeSessionId === sessionId) {
      const remainingSessions = safeSessions.filter(s => s.active && s.id !== sessionId);
      setActiveSessionId(remainingSessions.length > 0 ? remainingSessions[0].id : null);
    }
  };

  const deleteSession = (sessionId: string) => {
    setSessions(current => {
      const currentSessions = current || [];
      return currentSessions.filter(s => s.id !== sessionId);
    });
    
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
    }
  };

  const getSessionsByCharacter = (characterId: string) => {
    return safeSessions.filter(session => 
      session.participantIds.includes(characterId)
    );
  };

  return {
    sessions: safeSessions,
    activeSession,
    activeSessionId,
    createSession,
    sendMessage,
    switchToSession,
    closeSession,
    deleteSession,
    getSessionsByCharacter
  };
}