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
  const { createSession } = useChat();
  const { activeSessions } = useSceneMode();
  const { house } = useHouse();

  // Debug logging
  useEffect(() => {
    console.log('=== App State Debug ===');
    console.log('Current view:', currentView);
    console.log('Active session ID:', activeSessionId);
    console.log('Available characters:', house.characters?.length || 0);
    console.log('Available scene sessions:', activeSessions.length);
    console.log('AI Settings:', {
      provider: house.aiSettings?.provider,
      hasApiKey: !!house.aiSettings?.apiKey,
      model: house.aiSettings?.model
    });
    console.log('Spark available:', !!window.spark);
    console.log('=== End Debug ===');
  }, [house, activeSessions, currentView, activeSessionId]);

  const handleStartChat = (characterId: string) => {
    console.log('=== handleStartChat called ===');
    console.log('Character ID:', characterId);
    console.log('Available characters:', house.characters?.map(c => ({ id: c.id, name: c.name })) || []);
    console.log('Character exists:', house.characters?.some(c => c.id === characterId));
    console.log('AI provider:', house.aiSettings?.provider);
    console.log('Spark available:', !!window.spark?.llm);
    
    if (!house.characters || house.characters.length === 0) {
      toast.error('No characters available');
      return;
    }
    
    const character = house.characters.find(c => c.id === characterId);
    if (!character) {
      toast.error('Character not found');
      return;
    }
    
    const sessionId = createSession('individual', [characterId]);
    console.log('createSession returned:', sessionId);
    
    if (sessionId) {
      console.log('Setting active session ID to:', sessionId);
      setActiveSessionId(sessionId);
      setCurrentView('chat');
      toast.success(`Started chat with ${character.name}`);
    } else {
      console.error('Failed to create session for character:', characterId);
      toast.error('Failed to create chat session');
    }
  };

  const handleStartGroupChat = (sessionId?: string) => {
    console.log('=== handleStartGroupChat called ===');
    console.log('Session ID provided:', sessionId);
    console.log('Available characters:', house.characters?.length || 0);
    
    if (sessionId) {
      // Use existing session
      setActiveSessionId(sessionId);
      setCurrentView('chat');
      toast.success('Started group chat');
    } else {
      // Create new group chat with all characters
      const characterIds = (house.characters || []).map(c => c.id);
      console.log('Character IDs for group chat:', characterIds);
      
      if (characterIds.length > 1) {
        const newSessionId = createSession('group', characterIds);
        console.log('Group session created:', newSessionId);
        
        if (newSessionId) {
          setActiveSessionId(newSessionId);
          setCurrentView('chat');
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
    
    // Function to check and start scene
    const attemptStartScene = (attempt: number = 1) => {
      const session = activeSessions.find(s => s.id === sessionId);
      
      if (session) {
        console.log('Scene session found on attempt', attempt, ':', { id: session.id, type: session.type, active: session.active });
        setActiveSessionId(sessionId);
        setCurrentView('scene');
        return;
      }
      
      if (attempt <= 3) {
        console.log(`Scene session not found on attempt ${attempt}, retrying...`);
        setTimeout(() => attemptStartScene(attempt + 1), 100);
      } else {
        console.error('Scene session not found after 3 attempts:', sessionId);
        console.log('Available sessions:', activeSessions.map(s => s.id));
        toast.error('Scene session not found. Please try creating the scene again.');
      }
    };
    
    attemptStartScene();
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