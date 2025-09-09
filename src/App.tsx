import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { HouseView } from '@/components/HouseView';
import { ChatInterface } from '@/components/ChatInterface';
import { SceneInterface } from '@/components/SceneInterface';
import { useChat } from '@/hooks/useChat';
import { useSceneMode } from '@/hooks/useSceneMode';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

function App() {
  const [currentView, setCurrentView] = useState<'house' | 'chat' | 'scene'>('house');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const { createSession } = useChat();
  const { activeSessions } = useSceneMode();

  const handleStartChat = (characterId: string) => {
    const sessionId = createSession('individual', [characterId]);
    setActiveSessionId(sessionId);
    setCurrentView('chat');
  };

  const handleStartScene = (sessionId: string) => {
    console.log('handleStartScene called with sessionId:', sessionId);
    
    // Use a timeout to allow state updates to propagate
    setTimeout(() => {
      // Verify the scene session exists
      const sceneExists = activeSessions.some(session => session.id === sessionId);
      console.log('Scene exists (delayed check):', sceneExists);
      console.log('Available sessions:', activeSessions.map(s => s.id));
      
      if (sceneExists) {
        setActiveSessionId(sessionId);
        setCurrentView('scene');
        console.log('Successfully switching to scene view with sessionId:', sessionId);
      } else {
        console.error('Scene session not found after delay:', sessionId);
        toast.error('Scene session not found. Please try creating a new scene.');
        setCurrentView('house');
        setActiveSessionId(null);
      }
    }, 500); // Give more time for state updates
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