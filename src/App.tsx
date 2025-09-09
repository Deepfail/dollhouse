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
    // Verify the scene session exists
    const sceneExists = activeSessions.some(session => session.id === sessionId);
    if (sceneExists) {
      setActiveSessionId(sessionId);
      setCurrentView('scene');
    } else {
      console.error('Scene session not found:', sessionId);
      // Fallback to house view if scene doesn't exist
      setCurrentView('house');
      setActiveSessionId(null);
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