import { useSimpleStorage, simpleStorage } from './useSimpleStorage';
import { ChatSession, ChatMessage, Character } from '@/types';
import { useState, useEffect } from 'react';
import { useHouse } from './useHouse';
import { useInteractionSystem } from './useInteractionSystem';
import { AIService } from '@/lib/aiService';
import { storage } from '@/lib/storage';
import { toast } from 'sonner';
import { useMemorySystem } from './useMemorySystem';
import { useStorySystem } from './useStorySystem';

export function useChat() {
  const [sessions, setSessions] = useSimpleStorage<ChatSession[]>('chat-sessions', []);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [forceUpdate] = useSimpleStorage<number>('settings-force-update', 0); // React to settings changes
  const { house } = useHouse();
  const { processUserMessage, processCharacterResponse, triggerMilestoneEvents } = useInteractionSystem();
  const { processConversationMemories, getMemoryContext } = useMemorySystem();
  const { createStoryEntry, addStoryEntry, getStoryModePrompt } = useStorySystem();
  
  // Ensure sessions is never undefined
  const safeSessions = sessions || [];
  const activeSession = safeSessions.find(s => s.id === activeSessionId);

  // Auto-close inactive sessions after 24 hours
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      
      setSessions(current => {
        const currentSessions = current || [];
        const updatedSessions = currentSessions.map(session => {
          if (session.active && session.updatedAt) {
            const timeSinceUpdate = now - new Date(session.updatedAt).getTime();
            if (timeSinceUpdate > oneDayMs) {
              console.log(`Auto-closing inactive session: ${session.id}`);
              // Process memories before closing
              setTimeout(() => {
                session.participantIds.forEach(characterId => {
                  processConversationMemories(characterId, session);
                });
              }, 1000);
              return { ...session, active: false };
            }
          }
          return session;
        });
        return updatedSessions;
      });
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [processConversationMemories]);

  const createSession = (type: 'individual' | 'group' | 'scene', participantIds: string[], context?: string) => {
    console.log('=== createSession Debug ===');
    console.log('Type:', type);
    console.log('Participant IDs requested:', participantIds);
    console.log('Context:', context);
    console.log('Available characters:', house.characters?.map(c => ({ id: c.id, name: c.name })) || []);
    console.log('Current sessions before creation:', (sessions || []).length);
    
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
      // Update sessions immediately using the functional form
      setSessions(current => {
        const currentSessions = current || [];
        return [...currentSessions, newSession];
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

    // Check API configuration before sending message
    if (!house?.aiSettings?.textApiKey && !house?.aiSettings?.apiKey) {
      console.error('No API key configured');
      toast.error('Please configure your OpenRouter API key in House Settings before chatting. Get a free key from openrouter.ai');
      return;
    }

    console.log('Sending message:', content, 'in session:', activeSession.id);

    try {
      const message: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        characterId,
        content,
        timestamp: new Date(),
        type: 'text'
      };

      // Update the session with the new message first
      setSessions(current => {
        const currentSessions = current || [];
        const updated = currentSessions.map(session =>
          session.id === activeSessionId
            ? {
                ...session,
                messages: [...(session.messages || []), message],
                updatedAt: new Date()
              }
            : session
        );
        console.log('Sessions after message add:', updated.map(s => ({ id: s.id.slice(0, 8), messageCount: s.messages?.length || 0 })));
        return updated;
      });

      // If this is a user message, trigger AI responses and process interactions
      if (!characterId && activeSession.participantIds && activeSession.participantIds.length > 0) {
        console.log('Triggering AI responses for participants:', activeSession.participantIds);
        
        // Process relationship interactions for each character in the session
        activeSession.participantIds.forEach(participantId => {
          const character = house?.characters?.find(c => c.id === participantId);
          if (character) {
            processUserMessage(participantId, content, character);
            // Randomly trigger milestone events
            if (Math.random() < 0.1) {
              triggerMilestoneEvents(participantId, character);
            }
          }
        });
        
        // Don't await this - let it run in background
        setTimeout(() => {
          generateAIResponses(activeSession.id, message);
        }, 500);
      }
    } catch (error) {
      console.error('Error in sendMessage:', error);
      toast.error('Failed to send message');
    }
  };

  const generateAIResponses = async (sessionId: string, userMessage: ChatMessage) => {
    try {
      // Get fresh session state
      const session = safeSessions.find(s => s.id === sessionId);
      if (!session) {
        console.error('Session not found for AI response generation:', sessionId);
        return;
      }

      console.log('Generating AI responses for session:', sessionId, 'participants:', session.participantIds);

      if (!session.participantIds || session.participantIds.length === 0) {
        console.warn('No participants in session for AI response');
        return;
      }

      // Generate responses for each character, with staggered timing
      for (let i = 0; i < session.participantIds.length; i++) {
        const characterId = session.participantIds[i];
        const delay = Math.random() * 1500 + 500 + (i * 1000); // Stagger responses
        
        setTimeout(async () => {
          try {
            const response = await generateCharacterResponse(characterId, userMessage, session);
            if (response) {
              setSessions(current => {
                const currentSessions = current || [];
                return currentSessions.map(s =>
                  s.id === sessionId
                    ? {
                        ...s,
                        messages: [...(s.messages || []), response],
                        updatedAt: new Date()
                      }
                    : s
                );
              });
            }
          } catch (error) {
            console.error(`Error generating response for character ${characterId}:`, error);
          }
        }, delay);
      }
    } catch (error) {
      console.error('Error in generateAIResponses:', error);
    }
  };

  const generateCharacterResponse = async (
    characterId: string,
    userMessage: ChatMessage,
    session: ChatSession
  ): Promise<ChatMessage | null> => {
    try {
      const character = house?.characters?.find(c => c.id === characterId);
      if (!character) {
        console.error('Character not found:', characterId);
        return null;
      }

      const provider = house?.aiSettings?.provider || 'openrouter';

      // Let AIService handle provider and API key validation

      // Get conversation history for context
      const recentMessages = (session.messages || []).slice(-10);
      const conversationContext = recentMessages.map(msg => {
        if (msg.characterId) {
          const char = house?.characters?.find(c => c.id === msg.characterId);
          return `${char?.name || 'Unknown'}: ${msg.content}`;
        }
        return `User: ${msg.content}`;
      }).join('\n');

      // Build character prompt - make it more robust and detailed
      let characterPrompt = `You are ${character.name}`;
      
      if (character.role) {
        characterPrompt += `, a ${character.role}`;
      }
      
      characterPrompt += `.

CHARACTER INFORMATION:
Name: ${character.name}
Appearance: ${character.appearance}
Personality: ${character.personality}
Features: ${character.features.join(', ')}
Background: ${character.prompts?.background || 'No specific background provided'}
Role: ${character.role}

Current Stats:
- Love/Relationship: ${character.stats.love}%
- Happiness: ${character.stats.happiness}%
- Arousal: ${character.stats.wet}%
- Willingness: ${character.stats.willing}%
- Self-Esteem: ${character.stats.selfEsteem}%
- Loyalty: ${character.stats.loyalty}%

Sexual Experience: ${character.progression.sexualExperience}%
Kinks: ${(character.progression.kinks || []).join(', ') || 'None specified'}
Limits: ${(character.progression.limits || []).join(', ') || 'None specified'}

IMPORTANT MEMORIES:
${(character.memories || []).filter(memory =>
  (memory.importance === 'high' || memory.importance === 'medium') &&
  (memory.category === 'relationship' || memory.category === 'sexual' || memory.category === 'events')
).slice(0, 3).map(memory => `- ${memory.category.toUpperCase()}: ${memory.content}`).join('\n') || 'No significant memories yet'}

SIGNIFICANT EVENTS:
${(character.progression?.significantEvents || []).slice(0, 2).map(event =>
  `- ${event.type.replace('_', ' ').toUpperCase()}: ${event.description}`
).join('\n') || 'No significant events yet'}

MEMORABLE MOMENTS:
${(character.progression?.memorableEvents || []).filter(event => event.intensity > 50).slice(0, 2).map(event =>
  `- ${event.type.replace('_', ' ').toUpperCase()}: ${event.description} (Intensity: ${event.intensity}%)`
).join('\n') || 'No memorable intimate moments yet'}`;

      // Add world context if available
      if (house?.worldPrompt) {
        characterPrompt += `\n\nWorld Context: ${house.worldPrompt}`;
      }

      // Add relevant memories for context
      const memoryContext = getMemoryContext(characterId, userMessage.content);
      if (memoryContext) {
        characterPrompt += memoryContext;
      }

      // Add story mode context for narrative continuity
      const storyModeContext = getStoryModePrompt(character);
      if (storyModeContext) {
        characterPrompt += `\n\n${storyModeContext}`;
      }

      if (conversationContext) {
        characterPrompt += `\n\nCurrent conversation:
${conversationContext}`;
      }

      characterPrompt += `\n\nUser just said: "${userMessage.content}"

Respond as ${character.name} would, staying true to your character with your actual personality (${character.personality}), traits (${character.features.join(', ')}), and current emotional/sexual state. Reference your shared history, memories, and past events when appropriate to maintain continuity. Keep responses conversational and engaging, typically 1-2 sentences unless the situation calls for more detail.`;

      console.log(`Generating AI response for ${character.name} using ${provider}...`);
      // Use the new direct API service that gets settings from KV directly
      const response = await AIService.generateResponse(
        characterPrompt,
        house?.aiSettings?.apiKey,
        house?.aiSettings?.model
      );

      const message: ChatMessage = {
        id: `msg-${Date.now()}-${characterId}`,
        characterId,
        content: response,
        timestamp: new Date(),
        type: 'text'
      };

      // Process character response for relationship building
      processCharacterResponse(characterId, response, character);

      // Generate story entry for this conversation exchange
      try {
        const storyEntry = await createStoryEntry(
          character,
          'conversation',
          `Conversation with ${character.name}`,
          {
            conversation: `User: ${userMessage.content}\n${character.name}: ${response}`,
            userAction: userMessage.content,
            characterResponse: response,
            participants: [characterId]
          }
        );
        
        // Update character with new story entry
        const updatedCharacter = addStoryEntry(character, storyEntry);
        
        // Update the character in house storage
        const currentHouse = await storage.get<any>('character-house');
        if (currentHouse?.characters) {
          const charIndex = currentHouse.characters.findIndex((c: any) => c.id === characterId);
          if (charIndex !== -1) {
            currentHouse.characters[charIndex] = updatedCharacter;
            await storage.set('character-house', currentHouse);
          }
        }
      } catch (error) {
        console.warn('Failed to generate story entry:', error);
      }

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
      const charRef = house?.characters?.find(c => c.id === characterId);

      const fallbackResponses = [
        `*${charRef?.name || 'Character'} nods thoughtfully*`,
        `I see what you mean.`,
        `That's fascinating!`,
        `*${charRef?.name || 'Character'} considers your words*`,
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

      // Process character response for relationship building
      if (charRef) {
        processCharacterResponse(characterId, response, charRef);
      }

      return message;
    }
  };

  const switchToSession = (sessionId: string) => {
    console.log('switchToSession called with:', sessionId);
    console.log('Available sessions:', safeSessions.map(s => ({ id: s.id, type: s.type, active: s.active })));
    
    const session = safeSessions.find(s => s.id === sessionId);
    console.log('Found session in switchToSession:', session ? 'YES' : 'NO');
    
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

  // Simple setActiveSessionId that just sets it
  const setActiveSessionIdSafe = (sessionId: string) => {
    console.log('setActiveSessionIdSafe called with:', sessionId);
    setActiveSessionId(sessionId);
  };

  const closeSession = (sessionId: string) => {
    // Process memories for all characters in the session before closing
    const session = safeSessions.find(s => s.id === sessionId);
    if (session && session.participantIds.length > 0) {
      // Process memories asynchronously
      setTimeout(() => {
        session.participantIds.forEach(characterId => {
          processConversationMemories(characterId, session);
        });
      }, 1000); // Small delay to ensure all processing is complete
    }

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

  const clearAllSessions = () => {
    console.log('Clearing all chat sessions');
    setSessions([]);
    setActiveSessionId(null);
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
    setActiveSessionId: setActiveSessionIdSafe,
    clearAllSessions
  };
}