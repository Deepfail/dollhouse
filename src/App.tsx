import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { HouseView } from '@/components/HouseView';
import { ChatInterface } from '@/components/ChatInterface';
import { SceneInterface } from '@/components/SceneInterface';
import { useChat } from '@/hooks/useChat';
import { useSceneMode } from '@/hooks/useSceneMode';
import { Toaster } from '@/components/ui/sonner';

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
    
    // Verify the scene session exists
    const sceneExists = activeSessions.some(session => session.id === sessionId);
    console.log('Scene exists:', sceneExists);
    
    if (sceneExists) {
      setActiveSessionId(sessionId);
      setCurrentView('scene');
      console.log('Switching to scene view with sessionId:', sessionId);
    } else {
      console.error('Scene session not found:', sessionId);
      // If not found immediately, try one more time with a slight delay
      setTimeout(() => {
        const sceneExistsDelayed = activeSessions.some(session => session.id === sessionId);
        if (sceneExistsDelayed) {
          setActiveSessionId(sessionId);
          setCurrentView('scene');
          console.log('Found scene after delay, switching to scene view');
        } else {
          console.error('Scene session still not found after delay');
          setCurrentView('house');
          setActiveSessionId(null);
        }
      }, 200);
    }
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