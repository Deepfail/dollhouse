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
      
      // Start auto-play after the state has been updated
      setTimeout(() => {
        startAutoPlayForNewSession(newSession, updatedSessions);
      }, 100);
      
      return updatedSessions;
    });
    
    toast.success('Scene session created! Characters will begin interacting automatically.');
    
    return sessionId;
  };
  
  const startAutoPlayForNewSession = async (session: ChatSession, currentSessions: ChatSession[]) => {
    if (!session.active || !session.sceneSettings?.autoPlay) {
      console.log('Scene not active or autoPlay disabled', { 
        active: session.active, 
        autoPlay: session.sceneSettings?.autoPlay 
      });
      return;
    }
    
    console.log('Starting auto-play for new session:', session.id);
    setIsProcessing(true);
    
    const processNextTurn = async () => {
      // Get current session state from the provided sessions array
      const currentSession = currentSessions.find(s => s.id === session.id);
      if (!currentSession || !currentSession.active) {
        console.log('Session not found or inactive:', session.id);
        setIsProcessing(false);
        return;
      }
      
      // Check if autoPlay is still enabled
      if (!currentSession.sceneSettings?.autoPlay) {
        console.log('AutoPlay disabled for session:', session.id);
        setIsProcessing(false);
        return;
      }
      
      const maxTurns = currentSession.sceneSettings?.maxTurns || 50;
      if (currentSession.messages.filter(m => m.characterId).length >= maxTurns) {
        console.log('Max turns reached:', maxTurns);
        await endScene(session.id);
        return;
      }
      
      // Get a random character to speak next
      const availableCharacters = currentSession.participantIds.filter(id => 
        house.characters?.find(c => c.id === id)
      );
      
      console.log('Available characters:', availableCharacters.length);
      
      if (availableCharacters.length === 0) {
        console.log('No available characters found');
        await endScene(session.id);
        return;
      }
      
      const randomCharacterId = availableCharacters[Math.floor(Math.random() * availableCharacters.length)];
      console.log('Processing turn for character:', randomCharacterId);
      
      try {
        await processCharacterTurn(session.id, randomCharacterId);
        
        // Schedule next turn
        const turnDuration = currentSession.sceneSettings?.turnDuration || 5000;
        console.log('Scheduling next turn in:', turnDuration + 'ms');
        setTimeout(processNextTurn, turnDuration);
      } catch (error) {
        console.error('Error in auto-play:', error);
        setIsProcessing(false);
      }
    };
    
    // Start the first turn
    console.log('Starting first turn in 2 seconds...');
    setTimeout(processNextTurn, 2000);
  };
  
  const startAutoPlayForSession = async (session: ChatSession) => {
    if (!session.active || !session.sceneSettings?.autoPlay) {
      console.log('Scene not active or autoPlay disabled', { 
        active: session.active, 
        autoPlay: session.sceneSettings?.autoPlay 
      });
      return;
    }
    
    console.log('Starting auto-play for session:', session.id);
    setIsProcessing(true);
    
    const processNextTurn = async () => {
      // Get current session state
      const currentSessions = activeSessions;
      const currentSession = currentSessions.find(s => s.id === session.id);
      if (!currentSession || !currentSession.active) {
        console.log('Session not found or inactive:', session.id);
        setIsProcessing(false);
        return;
      }
      
      // Check if autoPlay is still enabled
      if (!currentSession.sceneSettings?.autoPlay) {
        console.log('AutoPlay disabled for session:', session.id);
        setIsProcessing(false);
        return;
      }
      
      const maxTurns = currentSession.sceneSettings?.maxTurns || 50;
      if (currentSession.messages.filter(m => m.characterId).length >= maxTurns) {
        console.log('Max turns reached:', maxTurns);
        await endScene(session.id);
        return;
      }
      
      // Get a random character to speak next
      const availableCharacters = currentSession.participantIds.filter(id => 
        house.characters?.find(c => c.id === id)
      );
      
      console.log('Available characters:', availableCharacters.length);
      
      if (availableCharacters.length === 0) {
        console.log('No available characters found');
        await endScene(session.id);
        return;
      }
      
      const randomCharacterId = availableCharacters[Math.floor(Math.random() * availableCharacters.length)];
      console.log('Processing turn for character:', randomCharacterId);
      
      try {
        await processCharacterTurn(session.id, randomCharacterId);
        
        // Schedule next turn
        const turnDuration = currentSession.sceneSettings?.turnDuration || 5000;
        console.log('Scheduling next turn in:', turnDuration + 'ms');
        setTimeout(processNextTurn, turnDuration);
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
    // Get fresh session state from activeSessions
    const currentSessions = activeSessions;
    const session = currentSessions.find(s => s.id === sessionId);
    if (!session || !session.active) {
      console.log('Session not found or inactive in processCharacterTurn');
      return;
    }
    
    const character = house.characters?.find(c => c.id === characterId);
    if (!character) {
      console.log('Character not found:', characterId);
      return;
    }
    
    const objective = session.sceneObjectives?.[characterId];
    if (!objective) {
      console.log('No objective found for character:', characterId);
      return;
    }
    
    console.log(`Generating response for ${character.name} with objective: ${objective}`);
    
    // Get recent conversation history for context
    const recentMessages = session.messages.slice(-10);
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
      
      Scene context: ${session.context || 'A social gathering'}
      
      Recent conversation:
      ${conversationContext}
      
      Other characters present: ${session.participantIds
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
    setIsProcessing(true);
    
    const processNextTurn = async () => {
      // Get current session state
      const currentSession = activeSessions.find(s => s.id === sessionId);
      if (!currentSession || !currentSession.active) {
        setIsProcessing(false);
        return;
      }
      
      // Check if autoPlay is still enabled
      if (!currentSession.sceneSettings?.autoPlay) {
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
        
        // Schedule next turn
        const turnDuration = currentSession.sceneSettings?.turnDuration || 5000; // 5 seconds
        setTimeout(processNextTurn, turnDuration);
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