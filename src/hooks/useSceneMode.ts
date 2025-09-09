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
    
    setActiveSessions(sessions => [...sessions, newSession]);
    
    toast.success('Scene session created! Characters will begin interacting automatically.');
    
    // Start auto-play immediately after creation
    setTimeout(() => {
      startAutoPlayForSession(newSession);
    }, 1000);
    
    return sessionId;
  };
  
  const startAutoPlayForSession = async (session: ChatSession) => {
    if (!session.active || !session.sceneSettings?.autoPlay) return;
    
    setIsProcessing(true);
    
    const processNextTurn = async () => {
      // Get current session state
      const currentSession = activeSessions.find(s => s.id === session.id);
      if (!currentSession || !currentSession.active) {
        setIsProcessing(false);
        return;
      }
      
      // Check if autoPlay is still enabled
      if (!currentSession.sceneSettings?.autoPlay) {
        setIsProcessing(false);
        return;
      }
      
      const maxTurns = currentSession.sceneSettings?.maxTurns || 50;
      if (currentSession.messages.filter(m => m.characterId).length >= maxTurns) {
        await endScene(session.id);
        return;
      }
      
      // Get a random character to speak next
      const availableCharacters = currentSession.participantIds.filter(id => 
        house.characters?.find(c => c.id === id)
      );
      
      if (availableCharacters.length === 0) {
        await endScene(session.id);
        return;
      }
      
      const randomCharacterId = availableCharacters[Math.floor(Math.random() * availableCharacters.length)];
      
      try {
        await processCharacterTurn(session.id, randomCharacterId);
        
        // Schedule next turn
        const turnDuration = currentSession.sceneSettings?.turnDuration || 5000;
        setTimeout(processNextTurn, turnDuration);
      } catch (error) {
        console.error('Error in auto-play:', error);
        setIsProcessing(false);
      }
    };
    
    // Start the first turn
    setTimeout(processNextTurn, 2000);
  };
  };
  
  const processCharacterTurn = async (sessionId: string, characterId: string): Promise<void> => {
    const session = activeSessions.find(s => s.id === sessionId);
    if (!session || !session.active) return;
    
    const character = house.characters?.find(c => c.id === characterId);
    if (!character) return;
    
    const objective = session.sceneObjectives?.[characterId];
    if (!objective) return;
    
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
      const response = await spark.llm(characterPrompt);
      
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
      
    } catch (error) {
      console.error('Error processing character turn:', error);
      toast.error(`Error generating response for ${character.name}`);
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