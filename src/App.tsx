import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { HouseView } from '@/components/HouseView';
import { ChatInterface } from '@/components/ChatInterface';
import { useChat } from '@/hooks/useChat';
import { Toaster } from '@/components/ui/sonner';

function App() {
  const [currentView, setCurrentView] = useState<'house' | 'chat'>('house');
  const { createSession, activeSessionId } = useChat();

  const handleStartChat = (characterId: string) => {
    const sessionId = createSession('individual', [characterId]);
    setCurrentView('chat');
  };

  return (
    <div className="h-screen bg-background">
      <Layout>
        {currentView === 'house' ? (
          <HouseView onStartChat={handleStartChat} />
        ) : (
          <ChatInterface sessionId={activeSessionId} />
        )}
      </Layout>
      <Toaster />
    </div>
  );
}

export default App