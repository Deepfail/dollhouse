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

  // Debug session finding
  console.log('useChat state:', {
    sessionCount: safeSessions.length,
    activeSessionId: activeSessionId ? activeSessionId.slice(0, 12) + '...' : null,
    activeSessionFound: !!activeSession,
    sessionIds: safeSessions.map(s => s.id.slice(0, 12) + '...')
  });

  const createSession = (type: 'individual' | 'group' | 'scene', participantIds: string[], context?: string) => {
    console.log('=== createSession Debug ===');
    console.log('Type:', type);
    console.log('Participant IDs requested:', participantIds);
    console.log('Context:', context);
    console.log('Available characters:', house.characters?.map(c => ({ id: c.id, name: c.name })) || []);
    console.log('Current sessions before creation:', (sessions || []).length);
    console.log('Current sessions details:', (sessions || []).map(s => ({ id: s.id.slice(0, 8), type: s.type, participants: s.participantIds.length })));
    
    // Basic validation
    if (!participantIds || participantIds.length === 0) {
      console.error('No participant IDs provided');
      toast.error('Cannot create chat session without participants');
      return '';
    }
    
    if (!house.characters || house.characters.length === 0) {
      console.error('No characters available in house');
      toast.error('No characters available. Create some characters first.');
      return '';
    }
    
    // Verify participants exist first
    const validParticipants = participantIds.filter(id => 
      house.characters?.some(c => c.id === id)
    );
    
    console.log('Valid participants after filtering:', validParticipants);
    console.log('Invalid participants removed:', participantIds.filter(id => !validParticipants.includes(id)));
    
    if (validParticipants.length === 0) {
      console.warn('No valid participants found for session');
      console.log('Requested participants:', participantIds);
      console.log('Available character IDs:', house.characters?.map(c => c.id) || []);
      toast.error('No valid characters found for chat session');
      return '';
    }

    // For individual chats, we should only have 1 participant
    if (type === 'individual' && validParticipants.length > 1) {
      console.warn('Individual chat requested with multiple participants, taking first one');
      validParticipants.splice(1);
    }

    // For group chats, we should have 2+ participants  
    if (type === 'group' && validParticipants.length < 2) {
      console.error('Group chat requested with less than 2 participants');
      toast.error('Group chat requires at least 2 characters');
      return '';
    }
    
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newSession: ChatSession = {
      id: sessionId,
      type,
      participantIds: validParticipants,
      messages: [],
      context,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('Creating chat session:', sessionId, 'for participants:', validParticipants);
    console.log('New session object:', newSession);

    try {
      // Update local state immediately for instant UI response
      const updatedSessions = [...safeSessions, newSession];
      
      setSessions(current => {
        const currentSessions = current || [];
        const finalSessions = [...currentSessions, newSession];
        console.log('Session array update - before:', currentSessions.length, 'after:', finalSessions.length);
        console.log('Updated sessions:', finalSessions.map(s => ({ id: s.id.slice(0, 8), type: s.type, participants: s.participantIds.length })));
        return finalSessions;
      });
      
      console.log('Session creation completed successfully, returning ID:', sessionId);
      return sessionId;
      
    } catch (error) {
      console.error('Error during session creation:', error);
      toast.error('Failed to create chat session');
      return '';
    }
  };

  const sendMessage = async (content: string, characterId?: string) => {
    console.log('=== sendMessage Debug ===');
    console.log('Content:', content);
    console.log('Character ID:', characterId);
    console.log('Active session ID:', activeSessionId);
    console.log('Active session:', activeSession);
    
    if (!activeSession) {
      console.error('No active session for sending message');
      toast.error('No active chat session found. Please start a new chat.');
      return;
    }

    console.log('Sending message:', content, 'in session:', activeSession.id);

    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      characterId,
      content,
      timestamp: new Date(),
      type: 'text'
    };

    // Update the session with the new message
    setSessions(current => {
      const currentSessions = current || [];
      const updated = currentSessions.map(session =>
        session.id === activeSessionId
          ? {
              ...session,
              messages: [...session.messages, message],
              updatedAt: new Date()
            }
          : session
      );
      console.log('Sessions after message add:', updated.map(s => ({ id: s.id.slice(0, 8), messageCount: s.messages.length })));
      return updated;
    });

    // If this is a user message, trigger AI responses
    if (!characterId && activeSession.participantIds.length > 0) {
      console.log('Triggering AI responses for participants:', activeSession.participantIds);
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

      const provider = house.aiSettings?.provider || 'spark';

      // Check provider configuration
      if (provider === 'spark') {
        if (!window.spark || !window.spark.llm || !window.spark.llmPrompt) {
          console.error('Spark AI service not available');
          // Create a simple fallback response instead of showing error
          const fallbackResponses = [
            "I hear you!",
            "That's interesting.",
            "Tell me more about that.",
            "I understand.",
            "What do you think about that?"
          ];
          const response = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
          
          const message: ChatMessage = {
            id: `msg-${Date.now()}-${characterId}`,
            characterId,
            content: response,
            timestamp: new Date(),
            type: 'text'
          };
          return message;
        }
      } else if (provider === 'openrouter') {
        if (!house.aiSettings?.apiKey) {
          console.error('OpenRouter API key not configured');
          toast.error('OpenRouter API key is not configured. Please add your API key in House Settings.');
          return null;
        }
      } else {
        console.error('Unsupported AI provider:', provider);
        toast.error(`Unsupported AI provider: ${provider}`);
        return null;
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

      // Build character prompt - make it more robust
      let characterPrompt = `You are ${character.name}`;
      
      if (character.role) {
        characterPrompt += `, a ${character.role}`;
      }
      
      characterPrompt += `.

Character Details:`;

      if (character.description) {
        characterPrompt += `\nDescription: ${character.description}`;
      }
      
      if (character.personality) {
        characterPrompt += `\nPersonality: ${character.personality}`;
      }
      
      if (character.prompts?.background) {
        characterPrompt += `\nBackground: ${character.prompts.background}`;
      }
      
      if (character.prompts?.system) {
        characterPrompt += `\nSystem Instructions: ${character.prompts.system}`;
      }
      
      if (character.prompts?.personality) {
        characterPrompt += `\nPersonality Details: ${character.prompts.personality}`;
      }

      // Add world context if available
      if (house.worldPrompt) {
        characterPrompt += `\n\nWorld Context: ${house.worldPrompt}`;
      }

      if (conversationContext) {
        characterPrompt += `\n\nCurrent conversation:
${conversationContext}`;
      }

      characterPrompt += `\n\nUser just said: "${userMessage.content}"

Respond as ${character.name} would, staying true to your character. Keep responses conversational and engaging, typically 1-2 sentences unless the situation calls for more detail.`;

      console.log(`Generating AI response for ${character.name} using ${provider}...`);
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
      
      if (errorMessage.includes('API key')) {
        toast.error('Please configure your API key in House Settings.');
      } else if (errorMessage.includes('rate limit')) {
        toast.error('Please wait a moment before sending another message.');
      } else if (errorMessage.includes('temporarily unavailable')) {
        toast.error('AI service is temporarily down. Please try again in a few moments.');
      } else {
        console.warn(`AI response failed: ${errorMessage}, using fallback`);
      }
      
      // Always provide a fallback response instead of failing completely
      const fallbackResponses = [
        `*${character.name} nods thoughtfully*`,
        `I see what you mean.`,
        `That's fascinating!`,
        `*${character.name} considers your words*`,
        `Tell me more about that.`
      ];
      const response = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      
      const message: ChatMessage = {
        id: `msg-${Date.now()}-${characterId}`,
        characterId,
        content: response,
        timestamp: new Date(),
        type: 'text'
      };
      
      return message;
    }
  };

  const switchToSession = (sessionId: string) => {
    console.log('switchToSession called with:', sessionId);
    console.log('Available sessions:', safeSessions.map(s => ({ id: s.id, type: s.type, active: s.active })));
    
    const session = safeSessions.find(s => s.id === sessionId);
    console.log('Found session in switchToSession:', session ? 'YES' : 'NO', session ? { id: session.id, type: session.type, active: session.active } : null);
    
    if (session) {
      console.log('Setting active session ID to:', sessionId);
      setActiveSessionId(sessionId);
      return true;
    } else {
      console.warn('Session not found in switchToSession:', sessionId);
      console.log('Available session IDs:', safeSessions.map(s => s.id));
      return false;
    }
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
    getSessionsByCharacter,
    setActiveSessionId  // Export this for direct control
  };
}