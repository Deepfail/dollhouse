import { ChatInterface } from '@/components/ChatInterface';
import { HouseView } from '@/components/HouseView';
import { InterviewChat } from '@/components/InterviewChat';
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
  // NEW: track a user-selected character independent of chat sessions
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
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

  return storageReady ? <AppContent currentView={currentView} setCurrentView={setCurrentView} activeSessionId={activeSessionId} setActiveSessionId={setActiveSessionId} selectedCharacterId={selectedCharacterId} setSelectedCharacterId={setSelectedCharacterId} /> : <LoadingScreen />;
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
  setActiveSessionId,
  selectedCharacterId,
  setSelectedCharacterId
}: {
  currentView: 'house' | 'chat' | 'scene';
  setCurrentView: (view: 'house' | 'chat' | 'scene') => void;
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  selectedCharacterId: string | null;
  setSelectedCharacterId: (id: string | null) => void;
}) {
  const { createSession, sessions, setActiveSessionId: setChatActiveSessionId, sessionsLoaded, activeSessionId: hookActive } = useChat();
  const { house, isLoading } = useHouseFileStorage();
  
  // Animation state for the phone UI
  const [isAnimating, setIsAnimating] = useState(false);

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

  // Listen for Ali's direct session switches to avoid double-creation
  useEffect(() => {
    const handleDirectSessionSwitch = (event: Event) => {
      const { sessionId, characterId } = (event as any).detail;
      logger.log('🎯 Ali direct session switch:', sessionId, characterId);
      
      // Set the session directly without creating a new one
      setActiveSessionId(sessionId);
      setChatActiveSessionId(sessionId);
      setCurrentView('chat');
      setSelectedCharacterId(characterId);
      
      // Show success message
      const character = house?.characters?.find(c => c.id === characterId);
      if (character) {
        toast.success(`${character.name} is in your room now...`, { duration: 3000 });
      }
    };

    globalThis.addEventListener('ali-direct-session-switch', handleDirectSessionSwitch);
    
    return () => {
      globalThis.removeEventListener('ali-direct-session-switch', handleDirectSessionSwitch);
    };
  }, [setActiveSessionId, setChatActiveSessionId, setCurrentView, setSelectedCharacterId, house?.characters]);

  // LEGACY: handleStartChat previously always created a session. We retain for explicit chat actions (e.g., START STORY buttons).
  const handleStartChat = async (characterId: string) => {
    try {
      if (!house?.characters || house.characters.length === 0) return;
      const character = house.characters.find(c => c.id === characterId);
      if (!character) return;
      
      // Trigger animation if not already in chat view
      if (currentView !== 'chat') {
        setIsAnimating(true);
        // Animation duration
        globalThis.setTimeout(() => setIsAnimating(false), 600);
      }
      
      // Reuse pattern: create a fresh session ONLY when explicitly invoked
      const sessionId = await createSession('individual', [characterId]);
      if (sessionId) {
        setActiveSessionId(sessionId);
        setChatActiveSessionId(sessionId);
        setCurrentView('chat');
        setSelectedCharacterId(characterId);
        
        // Show a toast notification about what's happening
        toast.success(`${character.name} is on her way to your room...`, {
          duration: 3000,
        });
      }
    } catch (e) {
      logger.error('Explicit chat start failed', e);
    }
  };

  // NEW: selection without spawning a chat session
  const handleSelectCharacter = (characterId: string) => {
    setSelectedCharacterId(characterId);
    // Navigate to chat/profile view without creating session
    setCurrentView('chat');
  };

  // REVISED: no automatic group session creation. Instead, emit event to open the GroupChatCreator modal.
  const handleStartGroupChat = () => {
    try {
      const g = globalThis as unknown as { dispatchEvent?: (e: unknown) => void; CustomEvent?: new (type: string, init?: unknown) => unknown };
      if (g?.dispatchEvent && g?.CustomEvent) {
        g.dispatchEvent(new g.CustomEvent('open-group-chat-creator'));
      }
      // Ensure we are on chat view to see modal
      setCurrentView('chat');
    } catch (e) {
      logger.error('Failed to trigger group chat creator', e);
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
        onStartChat={handleStartChat}
        onStartGroupChat={handleStartGroupChat}
        onSelectCharacter={handleSelectCharacter}
        onStartScene={handleStartScene}
        isAnimating={isAnimating}
      >
        {currentView === 'house' ? (
          <HouseView />
        ) : currentView === 'chat' ? (
          (() => {
            const active = sessions.find(s => s.id === activeSessionId);
            if (active?.type === 'interview' && activeSessionId) {
              return <InterviewChat sessionId={activeSessionId} onExit={handleBackToHouse} />;
            }
            return (
              <ChatInterface 
                sessionId={activeSessionId} 
                selectedCharacterId={selectedCharacterId}
                onBack={handleBackToHouse}
                onStartGroupChat={handleStartGroupChat}
              />
            );
          })()
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