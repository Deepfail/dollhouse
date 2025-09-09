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
    console.log('Starting chat with character:', characterId);
    const sessionId = createSession('individual', [characterId]);
    console.log('Created session:', sessionId);
    if (sessionId) {
      setActiveSessionId(sessionId);
      setCurrentView('chat');
      toast.success(`Started chat with ${house.characters?.find(c => c.id === characterId)?.name || 'character'}`);
    } else {
      toast.error('Failed to create chat session');
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
        onStartScene={handleStartScene}
      >
        {currentView === 'house' ? (
          <HouseView 
            onStartChat={handleStartChat}
            onStartScene={handleStartScene}
          />
        ) : currentView === 'chat' ? (
          <ChatInterface 
            sessionId={activeSessionId} 
            onBack={handleBackToHouse}
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