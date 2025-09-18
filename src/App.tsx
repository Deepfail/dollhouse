import { ChatInterface } from '@/components/ChatInterface';
import { HouseView } from '@/components/HouseView';
import { Layout } from '@/components/Layout';
import { SceneInterface } from '@/components/SceneInterface';
import { Toaster } from '@/components/ui/sonner';
import { useChat } from '@/hooks/useChat';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { useSceneMode } from '@/hooks/useSceneMode';
import { setGlobalStorage } from '@/storage/index';
import { initStorage } from '@/storage/init';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

function App() {
  const [currentView, setCurrentView] = useState<'house' | 'chat' | 'scene'>('house');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);

  // Initialize storage system first
  useEffect(() => {
    const initializeStorage = async () => {
      try {
        console.log('🔧 Initializing unified storage system...');
        
        const storage = await initStorage();
        setGlobalStorage(storage);
        console.log('✅ Storage initialized successfully!');
        
        setStorageReady(true);
      } catch (err) {
        console.error('❌ Storage initialization failed:', err);
        toast.error('Failed to initialize storage');
      }
    };

    initializeStorage();
  }, []);

  return storageReady ? <AppContent currentView={currentView} setCurrentView={setCurrentView} activeSessionId={activeSessionId} setActiveSessionId={setActiveSessionId} /> : <LoadingScreen />;
}

function LoadingScreen() {
  return (
    <div className="h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Initializing storage...</p>
      </div>
    </div>
  );
}

function AppContent({ 
  currentView, 
  setCurrentView, 
  activeSessionId, 
  setActiveSessionId 
}: {
  currentView: 'house' | 'chat' | 'scene';
  setCurrentView: (view: 'house' | 'chat' | 'scene') => void;
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
}) {
  const { createSession, sessions, switchToSession, setActiveSessionId: setChatActiveSessionId } = useChat();
  const { activeSessions } = useSceneMode();
  const { house, isLoading } = useHouseFileStorage();

  // Debug logging with error handling
  useEffect(() => {
    try {
      const debugInfo = {
        currentView,
        activeSessionId,
        charactersCount: house?.characters?.length || 0,
        chatSessionsCount: sessions?.length || 0,
        sceneSessionsCount: activeSessions?.length || 0,
        provider: house?.aiSettings?.provider || 'not set',
        hasApiKey: !!(house?.aiSettings?.apiKey?.trim())
      };

      console.log('=== App Debug Information ===');
      console.log('Debug Info:', debugInfo);
      
      if (house?.characters && house.characters.length > 0) {
        console.log('Available Characters:');
        house.characters.forEach(char => {
          console.log(`• ${char.name} (${char.id.slice(0, 8)}...)`);
        });
      }
      
      if (sessions && sessions.length > 0) {
        console.log('Available Sessions:');
        sessions.forEach(session => {
          console.log(`• ${session.type} - ${session.id.slice(0, 8)}... (${session.participantIds?.length || 0} participants)`);
        });
      }
      
      if (activeSessionId) {
        const activeSession = sessions?.find(s => s.id === activeSessionId);
        console.log('Active Session Found:', activeSession ? 'YES' : 'NO');
        if (activeSession) {
          console.log('Active Session Details:', {
            id: activeSession.id.slice(0, 8) + '...',
            type: activeSession.type,
            messageCount: activeSession.messages?.length || 0,
            participants: activeSession.participantIds?.length || 0
          });
        }
      }
      
      console.log('=== End App Debug ===');
    } catch (error) {
      console.error('Error in debug logging:', error);
    }
  }, [currentView, activeSessionId, house?.characters, sessions, activeSessions]);

  const handleStartChat = async (characterId: string) => {
    console.log('=== handleStartChat called ===');
    console.log('Character ID:', characterId);
    
    try {
      if (!house?.characters || house.characters.length === 0) {
        toast.error('No characters available');
        return;
      }
      
      const character = house?.characters?.find(c => c.id === characterId);
      if (!character) {
        toast.error('Character not found');
        return;
      }
      
      // Clear any existing active session to avoid conflicts
      setActiveSessionId(null);
      
      const sessionId = await createSession('individual', [characterId]);
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
        // Use existing session (individual or group)
        setActiveSessionId(sessionId);
        setChatActiveSessionId(sessionId);
        setCurrentView('chat');
        toast.success('Opened chat');
      } else {
        // Create new group chat with all characters
        const characterIds = (house?.characters || []).map(c => c.id);
        console.log('Character IDs for group chat:', characterIds);
        
        if (characterIds.length > 1) {
          const newSessionId = await createSession('group', characterIds);
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
    
    try {
      // Simply set the active session and switch view
      setActiveSessionId(sessionId);
      setCurrentView('scene');
      
      toast.success('Scene started! Session ID: ' + sessionId.slice(0, 12));
    } catch (error) {
      console.error('Error in handleStartScene:', error);
      toast.error('Failed to start scene');
    }
  };

  const handleBackToHouse = () => {
    try {
      setCurrentView('house');
      setActiveSessionId(null);
    } catch (error) {
      console.error('Error in handleBackToHouse:', error);
    }
  };

  // If activeSessionId is set externally (e.g., via Sidebar switchToSession), ensure we navigate to chat
  useEffect(() => {
    if (activeSessionId) {
      setCurrentView('chat');
      setChatActiveSessionId(activeSessionId);
    }
  }, [activeSessionId, setChatActiveSessionId]);

  // Show loading state while file storage is initializing
  if (isLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading house data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background">
      <Layout
        currentView={currentView}
        onStartChat={handleStartChat}
        onStartGroupChat={handleStartGroupChat}
        onStartScene={handleStartScene}
      >
        {currentView === 'house' ? (
          <HouseView />
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