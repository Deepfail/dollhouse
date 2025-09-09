import { useKV } from '@github/spark/hooks';
import { ChatSession, ChatMessage, Character } from '@/types';
import { useState } from 'react';
import { useHouse } from './useHouse';
import { AIService } from '@/lib/aiService';
import { toast } from 'sonner';

export function useChat() {
  const [sessions, setSessions] = useKV<ChatSession[]>('chat-sessions', []);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const { house } = useHouse();
  
  // Ensure sessions is never undefined
  const safeSessions = sessions || [];
  const activeSession = safeSessions.find(s => s.id === activeSessionId);

  const createSession = (type: 'individual' | 'group' | 'scene', participantIds: string[], context?: string) => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      participantIds,
      messages: [],
      context,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('Creating chat session:', newSession.id, 'for participants:', participantIds);

    setSessions(current => {
      const updatedSessions = [...(current || []), newSession];
      console.log('Chat sessions updated, new count:', updatedSessions.length);
      return updatedSessions;
    });
    
    setActiveSessionId(newSession.id);
    
    // Verify participants exist
    const validParticipants = participantIds.filter(id => 
      house.characters?.some(c => c.id === id)
    );
    
    if (validParticipants.length === 0) {
      console.warn('No valid participants found for session');
      toast.error('No valid characters found for chat session');
      return newSession.id;
    }
    
    console.log('Valid participants:', validParticipants.length);
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
      const character = house.characters?.find(c => c.id === characterId);
      if (!character) {
        console.error('Character not found:', characterId);
        return null;
      }

      // Check if AI service is available
      if (!window.spark || !window.spark.llm || !window.spark.llmPrompt) {
        console.error('Spark AI service not available');
        
        // Return a fallback message when AI service isn't available
        const fallbackMessage: ChatMessage = {
          id: `msg-${Date.now()}-${characterId}`,
          characterId,
          content: `*${character.name} looks puzzled* I'm sorry, but I seem to be having trouble connecting right now. This app requires the Spark AI environment to function properly.`,
          timestamp: new Date(),
          type: 'text'
        };
        
        toast.error('This app requires Spark AI environment. Please make sure you\'re running in a proper Spark environment.');
        return fallbackMessage;
      }

      // Get conversation history for context
      const recentMessages = session.messages.slice(-10);
      const conversationContext = recentMessages.map(msg => {
        if (msg.characterId) {
          const char = house.characters?.find(c => c.id === msg.characterId);
          return `${char?.name || 'Unknown'}: ${msg.content}`;
        }
        return `User: ${msg.content}`;
      }).join('\n');

      // Create AI service instance with current house settings
      const aiService = new AIService(house);

      // Build character prompt
      const characterPrompt = `You are ${character.name}, a ${character.role} character.

Character Description: ${character.description}
Personality: ${character.personality}
Background: ${character.prompts.background}

System Instructions: ${character.prompts.system}
Personality Prompt: ${character.prompts.personality}

Current conversation:
${conversationContext}

User just said: ${userMessage.content}

Respond as ${character.name} would, staying true to their personality and background. Keep responses conversational and engaging, typically 1-2 sentences unless the situation calls for more detail.`;

      console.log(`Generating AI response for ${character.name}...`);
      const response = await aiService.generateResponse(characterPrompt);

      const message: ChatMessage = {
        id: `msg-${Date.now()}-${characterId}`,
        characterId,
        content: response,
        timestamp: new Date(),
        type: 'text'
      };

      return message;
    } catch (error) {
      console.error('Error generating AI response:', error);
      
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      if (errorMessage.includes('AI service not available') || errorMessage.includes('Spark AI service')) {
        toast.error('This app requires Spark AI environment to function properly.');
      } else if (errorMessage.includes('rate limit')) {
        toast.error('Please wait a moment before sending another message.');
      } else if (errorMessage.includes('temporarily unavailable')) {
        toast.error('AI service is temporarily down. Please try again in a few moments.');
      } else {
        toast.error(`Failed to generate response for ${house.characters?.find(c => c.id === characterId)?.name}: ${errorMessage}`);
      }
      
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