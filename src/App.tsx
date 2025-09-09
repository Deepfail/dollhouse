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
    console.log('App mounted');
    console.log('Available characters:', house.characters?.length || 0);
    console.log('AI Settings:', house.aiSettings);
    console.log('Spark available:', !!window.spark);
  }, [house]);

  const handleStartChat = (characterId: string) => {
    console.log('handleStartChat called with characterId:', characterId);
    console.log('Available characters:', house.characters?.map(c => c.id) || []);
    console.log('Character exists:', house.characters?.some(c => c.id === characterId));
    
    const sessionId = createSession('individual', [characterId]);
    console.log('createSession returned:', sessionId);
    
    if (sessionId) {
      console.log('Setting active session ID to:', sessionId);
      setActiveSessionId(sessionId);
      setCurrentView('chat');
      toast.success(`Started chat with ${house.characters?.find(c => c.id === characterId)?.name || 'character'}`);
    } else {
      console.error('Failed to create session for character:', characterId);
      toast.error('Failed to create chat session');
    }
  };

  const handleStartGroupChat = (sessionId?: string) => {
    if (sessionId) {
      // Use existing session
      setActiveSessionId(sessionId);
      setCurrentView('chat');
      toast.success('Started group chat');
    } else {
      // Create new group chat with all characters
      const characterIds = (house.characters || []).map(c => c.id);
      if (characterIds.length > 1) {
        const newSessionId = createSession('group', characterIds);
        if (newSessionId) {
          setActiveSessionId(newSessionId);
          setCurrentView('chat');
          toast.success('Started group chat');
        } else {
          toast.error('Failed to create group chat');
        }
      } else {
        toast.error('Need at least 2 characters for group chat');
      }
    }
  };

  const handleStartScene = (sessionId: string) => {
    console.log('handleStartScene called with sessionId:', sessionId);
    
    // Verify the session exists
    const session = activeSessions.find(s => s.id === sessionId);
    if (!session) {
      console.error('Scene session not found:', sessionId);
      toast.error('Scene session not found. Please create a new scene.');
      return;
    }
    
    setActiveSessionId(sessionId);
    setCurrentView('scene');
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