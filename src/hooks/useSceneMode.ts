import { useState, useEffect } from 'react';
import { useKV } from '@github/spark/hooks';
import { ChatSession, Character, ChatMessage, SceneObjective } from '@/types';
import { useHouse } from '@/hooks/useHouse';
import { AIService } from '@/lib/aiService';
import { toast } from 'sonner';

export const useSceneMode = () => {
  const { house } = useHouse();
  const [activeSessions, setActiveSessions] = useKV<ChatSession[]>('scene-sessions', []);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const createSceneSession = async (
    characterIds: string[],
    objectives: SceneObjective[],
    context?: string
  ): Promise<string> => {
    const sessionId = `scene_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('Creating scene session with ID:', sessionId);
    console.log('Characters:', characterIds);
    console.log('Objectives:', objectives);
    
    const sceneObjectives: Record<string, string> = {};
    objectives.forEach(obj => {
      sceneObjectives[obj.characterId] = obj.objective;
    });
    
    const newSession: ChatSession = {
      id: sessionId,
      type: 'scene',
      participantIds: characterIds,
      messages: [],
      context,
      active: true,
      sceneObjectives,
      sceneSettings: {
        autoPlay: true,
        turnDuration: 5000, // 5 seconds per turn
        maxTurns: 50
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Add system message explaining the scene
    const systemMessage: ChatMessage = {
      id: `msg_${Date.now()}_sys`,
      content: `Scene started with ${characterIds.length} characters. Each character has been given secret objectives they will try to fulfill through their interactions.`,
      timestamp: new Date(),
      type: 'system'
    };
    
    newSession.messages.push(systemMessage);
    
    console.log('Scene session created:', newSession);
    
    // Update sessions - simpler approach
    setActiveSessions(sessions => [...sessions, newSession]);
    
    toast.success('Scene session created! Session ID: ' + sessionId.slice(0, 12));
    
    // Start auto-play after a brief delay
    setTimeout(() => {
      startAutoPlayForNewSession(sessionId);
    }, 1000);
    
    return sessionId;
  };
  
  const startAutoPlayForNewSession = async (sessionId: string) => {
    console.log('Starting auto-play for session:', sessionId);
    
    setIsProcessing(true);
    
    const processNextTurn = async () => {
      // Get fresh session state using functional update to avoid stale closure
      let currentSession: ChatSession | undefined;
      setActiveSessions(currentSessions => {
        currentSession = currentSessions.find(s => s.id === sessionId);
        return currentSessions;
      });
      
      if (!currentSession || !currentSession.active) {
        console.log('Session not found or inactive:', sessionId);
        setIsProcessing(false);
        return;
      }
      
      // Check if autoPlay is still enabled
      if (!currentSession.sceneSettings?.autoPlay) {
        console.log('AutoPlay disabled for session:', sessionId);
        setIsProcessing(false);
        return;
      }
      
      const maxTurns = currentSession.sceneSettings?.maxTurns || 50;
      if (currentSession.messages.filter(m => m.characterId).length >= maxTurns) {
        console.log('Max turns reached:', maxTurns);
        await endScene(sessionId);
        return;
      }
      
      // Get a random character to speak next
      const availableCharacters = currentSession.participantIds.filter(id => 
        house.characters?.find(c => c.id === id)
      );
      
      console.log('Available characters:', availableCharacters.length);
      
      if (availableCharacters.length === 0) {
        console.log('No available characters found');
        await endScene(sessionId);
        return;
      }
      
      const randomCharacterId = availableCharacters[Math.floor(Math.random() * availableCharacters.length)];
      console.log('Processing turn for character:', randomCharacterId);
      
      try {
        await processCharacterTurn(sessionId, randomCharacterId);
        
        // Schedule next turn with fresh session state
        let nextTurnDuration = 5000;
        setActiveSessions(sessions => {
          const session = sessions.find(s => s.id === sessionId);
          if (session?.sceneSettings?.turnDuration) {
            nextTurnDuration = session.sceneSettings.turnDuration;
          }
          return sessions;
        });
        
        console.log('Scheduling next turn in:', nextTurnDuration + 'ms');
        setTimeout(processNextTurn, nextTurnDuration);
      } catch (error) {
        console.error('Error in auto-play:', error);
        
        // Add error message to scene
        const errorMsgContent = `⚠️ Auto-play error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        const errorMessage: ChatMessage = {
          id: `msg_${Date.now()}_autoplay_error`,
          content: errorMsgContent,
          timestamp: new Date(),
          type: 'system'
        };
        
        setActiveSessions(sessions => 
          sessions.map(s => 
            s.id === sessionId 
              ? { 
                  ...s, 
                  messages: [...s.messages, errorMessage],
                  sceneSettings: { ...s.sceneSettings!, autoPlay: false }, // Pause scene
                  updatedAt: new Date()
                }
              : s
          )
        );
        
        setIsProcessing(false);
        toast.error('Scene auto-play stopped due to error. Check your API settings.');
      }
    };
    
    // Start the first turn
    console.log('Starting first turn in 2 seconds...');
    setTimeout(processNextTurn, 2000);
  };

  
  const processCharacterTurn = async (sessionId: string, characterId: string): Promise<void> => {
    // Get fresh session state using functional update
    let currentSession: ChatSession | undefined;
    setActiveSessions(sessions => {
      currentSession = sessions.find(s => s.id === sessionId);
      return sessions;
    });
    
    if (!currentSession || !currentSession.active) {
      console.log('Session not found or inactive in processCharacterTurn');
      return;
    }
    
    const character = house.characters?.find(c => c.id === characterId);
    
    // Generate character response based on their objective
      return;
    }
    
    const objective = currentSession.sceneObjectives?.[characterId];
    if (!objective) {
g('No objective found for character:', characterId);
Recent conversation:
${conversationContext}

    console.log(`Generating response for ${character.name} with objective: ${objective}`);
      .filter(id => id !== characterId)
    // Get recent conversation history for context
    const recentMessages = currentSession.messages.slice(-8).filter(msg => msg.type !== 'system');
    const conversationContext = recentMessages.length > 0 
? recentMessages.map(msg => {
Respond as ${character.name}. Work toward your objective subtly. Keep response to 1-2 sentences maximum.`;
    
    try {
          }
          return `User: ${msg.content}`;
        }).join('\n')
      : 'No previous conversation.';
    
    // Generate character response based on their objective
    const characterPrompt = `You are ${character.name}. Your personality: ${character.personality}

Your secret objective: ${objective}

Scene: ${currentSession.context || 'A social gathering'}

      console.log('Prompt being sent:', characterPrompt);
${conversationContext}

      const aiService = new AIService(house);
      .filter(id => id !== characterId)
      .map(id => house.characters?.find(c => c.id === id)?.name)
      .filter(Boolean)
      .join(', ')}

Respond as ${character.name}. Work toward your objective subtly. Keep response to 1-2 sentences maximum.`;
    
    try {
      const provider = house.aiSettings?.provider || 'openrouter';

      // Check provider configuration
      if (provider === 'openrouter') {
        if (!house.aiSettings?.apiKey) {
          throw new Error('OpenRouter API key is required. Please configure it in House Settings.');
        }
      } else {
        throw new Error(`Unsupported AI provider: ${provider}. Only OpenRouter is supported.`);
      }

      console.log(`Calling AI service for character response using ${provider}...`);
      console.log('Prompt being sent:', characterPrompt);
      
      // Create AI service instance with current house settings
      const aiService = new AIService(house);
      
      const response = await aiService.generateResponse(characterPrompt);
      
      console.log(`Generated response for ${character.name}:`, response);
      
      const message: ChatMessage = {
        id: `msg_${Date.now()}_${characterId}`,
        characterId,
        content: response,
        timestamp: new Date(),
        type: 'text'
      };
      
      // Update session with new message
      setActiveSessions(sessions => 
        sessions.map(s => 
          s.id === sessionId 
            ? { 
                ...s, 
                messages: [...s.messages, message],
                updatedAt: new Date()
              }
            : s
        )
      );
      
      console.log(`Message added for ${character.name}`);
      
    } catch (error) {
      console.error('Error processing character turn:', error);
      
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Add error message to scene
      if (errorMessage.includes('API') || errorMessage.includes('key')) {
      const errorMessage_: ChatMessage = {
        toast.error('Scene paused due to API error. Please configure your API settings.');
      }
        timestamp: new Date(),
  };
      };
      
      // Update session with error message
      setActiveSessions(sessions => 
        sessions.map(s => 
          s.id === sessionId 
            ? { 
                ...s, 
                messages: [...s.messages, errorMessage_],
                updatedAt: new Date()
              }
            : s
        )
      );
      
      toast.error(`Error generating response for ${character.name}: ${errorMessage}`);
      
      // If this is an API configuration error, pause the scene
      if (errorMessage.includes('API') || errorMessage.includes('key')) {
        await pauseScene(sessionId);
        toast.error('Scene paused due to API error. Please configure your API settings.');
      }
    }
  };
  
  const startAutoPlay = async (sessionId: string) => {
    console.log('Starting auto-play for session:', sessionId);
    
    setIsProcessing(true);
    
    const processNextTurn = async () => {
      // Get fresh session state using functional update
      let currentSession: ChatSession | undefined;
      setActiveSessions(sessions => {
        currentSession = sessions.find(s => s.id === sessionId);
        return sessions;
      });
      
      if (!currentSession || !currentSession.active) {
        console.log('Session not found or inactive:', sessionId);
        setIsProcessing(false);
        return;
      }
      
      // Check if autoPlay is still enabled
      if (!currentSession.sceneSettings?.autoPlay) {
        console.log('AutoPlay disabled for session:', sessionId);
        setIsProcessing(false);
        return;
      }
      
      const maxTurns = currentSession.sceneSettings?.maxTurns || 20;
      if (currentSession.messages.filter(m => m.characterId).length >= maxTurns) {
        await endScene(sessionId);
        return;
      }
      
      // Get a random character to speak next
      const availableCharacters = currentSession.participantIds.filter(id => 
        house.characters?.find(c => c.id === id)
      );
      
      if (availableCharacters.length === 0) {
        await endScene(sessionId);
        return;
      }
      
      const randomCharacterId = availableCharacters[Math.floor(Math.random() * availableCharacters.length)];
      
      try {
        await processCharacterTurn(sessionId, randomCharacterId);
        
        // Schedule next turn with fresh session state
        let nextTurnDuration = 5000;
        setActiveSessions(sessions => {
          const session = sessions.find(s => s.id === sessionId);
          if (session?.sceneSettings?.turnDuration) {
            nextTurnDuration = session.sceneSettings.turnDuration;
          }
          return sessions;
        });
        
        setTimeout(processNextTurn, nextTurnDuration);
      } catch (error) {
        console.error('Error in auto-play:', error);
        setIsProcessing(false);
      }
    };
    
    // Start the first turn
    setTimeout(processNextTurn, 2000); // Wait 2 seconds before first character speaks
  };
  
  const endScene = async (sessionId: string) => {
    setActiveSessions(sessions =>
      sessions.map(s =>
        s.id === sessionId
          ? { ...s, active: false, updatedAt: new Date() }
          : s
      )
    );
    
    // Add ending system message
    const endMessage: ChatMessage = {
      id: `msg_${Date.now()}_end`,
      content: 'Scene has ended. Characters have completed their interaction.',
      timestamp: new Date(),
      type: 'system'
    };
    
    setActiveSessions(sessions =>
      sessions.map(s =>
        s.id === sessionId
          ? { ...s, messages: [...s.messages, endMessage] }
          : s
      )
    );
    
    toast.info('Scene session ended');
    setIsProcessing(false);
  };
  
  const pauseScene = async (sessionId: string) => {
    setActiveSessions(sessions =>
      sessions.map(s =>
        s.id === sessionId
          ? { 
              ...s, 
              sceneSettings: { ...s.sceneSettings!, autoPlay: false },
              updatedAt: new Date()
            }
          : s
      )
    );
  };
  
  const resumeScene = async (sessionId: string) => {
    setActiveSessions(sessions =>
      sessions.map(s =>
        s.id === sessionId
          ? { 
              ...s, 
              sceneSettings: { ...s.sceneSettings!, autoPlay: true },
              updatedAt: new Date()
            }
          : s
      )
    );
    
    await startAutoPlay(sessionId);
  };
  
  const addUserMessage = async (sessionId: string, content: string) => {
    const message: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      content,
      timestamp: new Date(),
      type: 'text'
    };
    
    setActiveSessions(sessions =>
      sessions.map(s =>
        s.id === sessionId
          ? { ...s, messages: [...s.messages, message], updatedAt: new Date() }
          : s
      )
    );
  };
  
  return {
    activeSessions,
    createSceneSession,
    startAutoPlay,
    endScene,
    pauseScene,
    resumeScene,
    addUserMessage,
    isProcessing
  };
};