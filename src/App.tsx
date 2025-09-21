import { ChatInterface } from '@/components/ChatInterface';
import { HouseView } from '@/components/HouseView';
import { Layout } from '@/components/Layout';
import { SceneInterface } from '@/components/SceneInterface';
import { Toaster } from '@/components/ui/sonner';
import { useChat } from '@/hooks/useChat';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
// useSceneMode was imported previously for scene features; not required here currently
import { setGlobalStorage } from '@/storage/index';
import { initStorage } from '@/storage/init';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logger } from './lib/logger';

function App() {
  const [currentView, setCurrentView] = useState<'house' | 'chat' | 'scene'>('house');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);

  // Initialize storage system first
  useEffect(() => {
    const initializeStorage = async () => {
      try {
        logger.log('🔧 Initializing unified storage system...');
        const storage = await initStorage();
        setGlobalStorage(storage);
        logger.log('✅ Storage initialized successfully!');
        
        setStorageReady(true);
      } catch (err) {
        logger.error('❌ Storage initialization failed:', err);
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
  const { createSession, sessions, setActiveSessionId: setChatActiveSessionId, sessionsLoaded, activeSessionId: hookActive } = useChat();
  const { house, isLoading } = useHouseFileStorage();

  // Debug logging with error handling
  useEffect(() => {
    try {
      const activeId = activeSessionId || hookActive;
      const debugInfo = { currentView, activeId, sessionsLoaded, sessionCount: sessions.length };
      logger.log('[AppDebug]', debugInfo);
    } catch (e) {
      logger.debug('Ignored error while gathering debug info', e);
    }
  }, [currentView, activeSessionId, hookActive, sessionsLoaded, sessions.length]);

  const handleStartChat = async (characterId: string) => {
    logger.log('=== handleStartChat called ===');
    logger.log('Character ID:', characterId);
    
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
  logger.log('createSession returned:', sessionId);
      
      if (sessionId) {
        // Set the active session immediately
        setActiveSessionId(sessionId);
        setChatActiveSessionId(sessionId);
        setCurrentView('chat');
        toast.success(`Started chat with ${character.name}`);
      } else {
  logger.error('Failed to create session for character:', characterId);
        toast.error('Failed to create chat session');
      }
    } catch (error) {
      logger.error('Error in handleStartChat:', error);
      toast.error('Failed to start chat');
    }
  };

  const handleStartGroupChat = async (sessionId?: string) => {
    logger.log('=== handleStartGroupChat called ===');
    logger.log('Session ID provided:', sessionId);
    
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
  logger.log('Character IDs for group chat:', characterIds);
        
        if (characterIds.length > 1) {
          const newSessionId = await createSession('group', characterIds);
          logger.log('Group session created:', newSessionId);
          
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
      logger.error('Error in handleStartGroupChat:', error);
      toast.error('Failed to start group chat');
    }
  };

  const handleStartScene = (sessionId: string) => {
    logger.log('handleStartScene called with sessionId:', sessionId);
    
    try {
      // Simply set the active session and switch view
      setActiveSessionId(sessionId);
      setCurrentView('scene');
      
      toast.success('Scene started! Session ID: ' + sessionId.slice(0, 12));
    } catch (error) {
      logger.error('Error in handleStartScene:', error);
      toast.error('Failed to start scene');
    }
  };

  const handleBackToHouse = () => {
    try {
      setCurrentView('house');
      setActiveSessionId(null);
    } catch (error) {
      logger.error('Error in handleBackToHouse:', error);
    }
  };

  // If activeSessionId is set externally (e.g., via Sidebar switchToSession), ensure we navigate to chat
  useEffect(() => {
    const id = activeSessionId || hookActive;
    if (id) {
      setCurrentView('chat');
      setChatActiveSessionId(id);
    } else if (sessionsLoaded && sessions.length > 0 && currentView === 'chat') {
      // If we tried to go to chat but no active session, adopt most recent
      const fallback = sessions[0].id;
      setActiveSessionId(fallback);
      setChatActiveSessionId(fallback);
    }
  }, [activeSessionId, hookActive, sessionsLoaded, sessions, currentView, setChatActiveSessionId]);

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