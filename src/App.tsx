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
      hasApiKey: !!house.aiSettings?.apiKey
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
    
    if (!house.characters || house.characters.length === 0) {
      toast.error('No characters available');
      return;
    }
    
    const character = house.characters.find(c => c.id === characterId);
    if (!character) {
      toast.error('Character not found');
      return;
    }
    
    try {
      // Clear any existing active session to avoid conflicts
      setActiveSessionId(null);
      
      const sessionId = createSession('individual', [characterId]);
      console.log('createSession returned:', sessionId);
      
      if (sessionId) {
        // Set the active session immediately
        setActiveSessionId(sessionId);
        setChatActiveSessionId(sessionId);
        setCurrentView('chat');
        toast.success(`Started chat with ${character.name}`);
      } else {
        console.error('Failed to create session for character:', characterId);
        toast.error('Failed to create chat session');
      }
    } catch (error) {
      console.error('Error in handleStartChat:', error);
      toast.error('Failed to start chat');
    }
  };

  const handleStartGroupChat = async (sessionId?: string) => {
    console.log('=== handleStartGroupChat called ===');
    console.log('Session ID provided:', sessionId);
    
    try {
      if (sessionId) {
        // Use existing session
        setActiveSessionId(sessionId);
        setChatActiveSessionId(sessionId);
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
            setChatActiveSessionId(newSessionId);
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
    } catch (error) {
      console.error('Error in handleStartGroupChat:', error);
      toast.error('Failed to start group chat');
    }
  };

  const handleStartScene = (sessionId: string) => {
    console.log('handleStartScene called with sessionId:', sessionId);
    
    // Simply set the active session and switch view
    setActiveSessionId(sessionId);
    setCurrentView('scene');
    
    toast.success('Scene started! Session ID: ' + sessionId.slice(0, 12));
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