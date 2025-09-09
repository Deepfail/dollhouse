import { useState, useEffect } from 'react';
import { useKV } from '@github/spark/hooks';
import { ChatSession, Character, ChatMessage, SceneObjective } from '@/types';
import { useHouse } from '@/hooks/useHouse';
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
    
    // Update state and wait for it to complete
    setActiveSessions(sessions => {
      const updatedSessions = [...sessions, newSession];
      return updatedSessions;
    });
    
    // Start auto-play after a short delay to allow state to update
    setTimeout(() => {
      startAutoPlayForNewSession(sessionId);
    }, 500);
    
    toast.success('Scene session created! Characters will begin interacting automatically.');
    
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
        setIsProcessing(false);
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
    if (!character) {
      console.log('Character not found:', characterId);
      return;
    }
    
    const objective = currentSession.sceneObjectives?.[characterId];
    if (!objective) {
      console.log('No objective found for character:', characterId);
      return;
    }
    
    console.log(`Generating response for ${character.name} with objective: ${objective}`);
    
    // Get recent conversation history for context
    const recentMessages = currentSession.messages.slice(-10);
    const conversationContext = recentMessages.map(msg => {
      if (msg.characterId) {
        const char = house.characters?.find(c => c.id === msg.characterId);
        return `${char?.name || 'Unknown'}: ${msg.content}`;
      }
      return `System: ${msg.content}`;
    }).join('\n');
    
    // Generate character response based on their objective
    const characterPrompt = spark.llmPrompt`
      You are ${character.name}, a ${character.role} with the personality: ${character.personality}
      
      Your secret objective in this scene is: ${objective}
      
      Scene context: ${currentSession.context || 'A social gathering'}
      
      Recent conversation:
      ${conversationContext}
      
      Other characters present: ${currentSession.participantIds
        .filter(id => id !== characterId)
        .map(id => house.characters?.find(c => c.id === id)?.name)
        .filter(Boolean)
        .join(', ')}
      
      Respond as ${character.name} would, keeping your objective in mind but being subtle about it. 
      Make your response natural and conversational, advancing toward your goal without being obvious.
      Keep your response to 1-2 sentences maximum.
      
      System prompt for character behavior: ${character.prompts.system}
    `;
    
    try {
      console.log('Calling LLM for character response...');
      const response = await spark.llm(characterPrompt);
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
      toast.error(`Error generating response for ${character.name}: ${error}`);
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