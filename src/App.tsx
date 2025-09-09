import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { HouseView } from '@/components/HouseView';
import { ChatInterface } from '@/components/ChatInterface';
import { SceneInterface } from '@/components/SceneInterface';
import { useChat } from '@/hooks/useChat';
import { useSceneMode } from '@/hooks/useSceneMode';
import { useHouse } from '@/hooks/useHouse';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

function App() {
  const [currentView, setCurrentView] = useState<'house' | 'chat' | 'scene'>('house');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const { createSession, sessions, switchToSession, setActiveSessionId: setChatActiveSessionId } = useChat();
  const { activeSessions } = useSceneMode();
  const { house } = useHouse();

  // Debug logging
  useEffect(() => {
    const debugInfo = {
      currentView,
      activeSessionId,
      charactersCount: house.characters?.length || 0,
      chatSessionsCount: sessions.length,
      sceneSessionsCount: activeSessions.length,
      provider: house.aiSettings?.provider || 'not set',
      hasApiKey: !!house.aiSettings?.apiKey,
      sparkAvailable: !!window.spark,
      sparkLLMAvailable: !!(window.spark && window.spark.llm),
      sparkLLMPromptAvailable: !!(window.spark && window.spark.llmPrompt)
    };

    console.log('=== App Debug Information ===');
    console.log('Debug Info:', debugInfo);
    
    if (house.characters && house.characters.length > 0) {
      console.log('Available Characters:');
      house.characters.forEach(char => {
        console.log(`• ${char.name} (${char.id.slice(0, 8)}...)`);
      });
    }
    
    if (sessions.length > 0) {
      console.log('Available Sessions:');
      sessions.forEach(session => {
        console.log(`• ${session.type} - ${session.id.slice(0, 8)}... (${session.participantIds.length} participants)`);
      });
    }
    
    if (activeSessionId) {
      const activeSession = sessions.find(s => s.id === activeSessionId);
      console.log('Active Session Found:', activeSession ? 'YES' : 'NO');
      if (activeSession) {
        console.log('Active Session Details:', {
          id: activeSession.id.slice(0, 8) + '...',
          type: activeSession.type,
          messageCount: activeSession.messages.length,
          participants: activeSession.participantIds.length
        });
      }
    }
    
    console.log('=== End App Debug ===');
  }, [house, sessions, activeSessions, currentView, activeSessionId]);

  const handleStartChat = async (characterId: string) => {
    console.log('=== handleStartChat called ===');
    console.log('Character ID:', characterId);
    console.log('Available characters:', house.characters?.map(c => ({ id: c.id, name: c.name })) || []);
    
    if (!house.characters || house.characters.length === 0) {
      toast.error('No characters available');
      return;
    }
    
    const character = house.characters.find(c => c.id === characterId);
    if (!character) {
      toast.error('Character not found');
      return;
    }
    
    // Check AI configuration first
    const provider = house.aiSettings?.provider || 'spark';
    if (provider === 'spark' && (!window.spark || !window.spark.llm)) {
      console.warn('Spark AI not available, continuing with fallback responses');
    }
    if (provider === 'openrouter' && !house.aiSettings?.apiKey) {
      toast.error('Please configure your OpenRouter API key in House Settings');
      return;
    }
    
    // Create the session
    const sessionId = createSession('individual', [characterId]);
    console.log('createSession returned:', sessionId);
    
    if (sessionId) {
      console.log('Setting active session ID to:', sessionId);
      
      // Switch to the session in the hook immediately
      setChatActiveSessionId(sessionId);
      
      // Switch views immediately
      setCurrentView('chat');
      setActiveSessionId(sessionId);
      
      toast.success(`Started chat with ${character.name}`);
    } else {
      console.error('Failed to create session for character:', characterId);
      toast.error('Failed to create chat session');
    }
  };

  const handleStartGroupChat = async (sessionId?: string) => {
    console.log('=== handleStartGroupChat called ===');
    console.log('Session ID provided:', sessionId);
    console.log('Available characters:', house.characters?.length || 0);
    
    // Check AI configuration first
    const provider = house.aiSettings?.provider || 'spark';
    if (provider === 'spark' && (!window.spark || !window.spark.llm)) {
      console.warn('Spark AI not available, continuing with fallback responses');
    }
    if (provider === 'openrouter' && !house.aiSettings?.apiKey) {
      toast.error('Please configure your OpenRouter API key in House Settings');
      return;
    }
    
    if (sessionId) {
      // Use existing session - set it active in hook first
      setChatActiveSessionId(sessionId);
      setCurrentView('chat');
      setActiveSessionId(sessionId);
      toast.success('Started group chat');
    } else {
      // Create new group chat with all characters
      const characterIds = (house.characters || []).map(c => c.id);
      console.log('Character IDs for group chat:', characterIds);
      
      if (characterIds.length > 1) {
        const newSessionId = createSession('group', characterIds);
        console.log('Group session created:', newSessionId);
        
        if (newSessionId) {
          // Set active in hook first, then switch views
          setChatActiveSessionId(newSessionId);
          setCurrentView('chat');
          setActiveSessionId(newSessionId);
          toast.success(`Started group chat with ${characterIds.length} characters`);
        } else {
          toast.error('Failed to create group chat');
        }
      } else if (characterIds.length === 1) {
        toast.error('Need at least 2 characters for group chat. You only have 1 character.');
      } else {
        toast.error('No characters available for group chat');
      }
    }
  };

  const handleStartScene = (sessionId: string) => {
    console.log('handleStartScene called with sessionId:', sessionId);
    console.log('Available scene sessions:', activeSessions.map(s => ({ id: s.id, type: s.type, active: s.active })));
    
    // Set active session immediately
    setActiveSessionId(sessionId);
    setCurrentView('scene');
    
    // Check if session exists, otherwise retry a few times
    const checkSession = (attempt: number = 1) => {
      const session = activeSessions.find(s => s.id === sessionId);
      
      if (session) {
        console.log('Scene session found on attempt', attempt, ':', { id: session.id, type: session.type, active: session.active });
        return;
      }
      
      if (attempt <= 3) {
        console.log(`Scene session not found on attempt ${attempt}, retrying...`);
        setTimeout(() => checkSession(attempt + 1), 200);
      } else {
        console.error('Scene session not found after 3 attempts:', sessionId);
        console.log('Available sessions:', activeSessions.map(s => s.id));
        toast.error('Scene session not found. The scene may not have been created properly.');
      }
    };
    
    checkSession();
  };

  const handleBackToHouse = () => {
    setCurrentView('house');
    setActiveSessionId(null);
  };

  return (
    <div className="h-screen bg-background">
      <Layout
        onStartChat={handleStartChat}
        onStartGroupChat={handleStartGroupChat}
        onStartScene={handleStartScene}
      >
        {currentView === 'house' ? (
          <HouseView 
            onStartChat={handleStartChat}
            onStartGroupChat={handleStartGroupChat}
            onStartScene={handleStartScene}
          />
        ) : currentView === 'chat' ? (
          <ChatInterface 
            sessionId={activeSessionId} 
            onBack={handleBackToHouse}
            onStartChat={handleStartChat}
            onStartGroupChat={handleStartGroupChat}
          />
        ) : (
          <SceneInterface 
            sessionId={activeSessionId!}
            onClose={handleBackToHouse}
          />
        )}
      </Layout>
      <Toaster />
    </div>
  );
}

export default App