import { HouseView } from '@/components/HouseView';
import { InterviewChat } from '@/components/InterviewChat';
import { Layout } from '@/components/Layout';
import { SceneInterface } from '@/components/SceneInterface';
import { Toaster } from '@/components/ui/sonner';
import { useChat } from '@/hooks/useChat';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { useConversationAnalytics } from '@/hooks/useConversationAnalytics';
import { setGlobalStorage } from '@/storage/index';
import { initStorage } from '@/storage/init';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logger } from './lib/logger';

function App() {
  const [currentView, setCurrentView] = useState<'house' | 'chat' | 'scene'>('house');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
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

  return storageReady ? (
    <AppContent 
      currentView={currentView} 
      setCurrentView={setCurrentView} 
      activeSessionId={activeSessionId} 
      setActiveSessionId={setActiveSessionId} 
      selectedCharacterId={selectedCharacterId} 
      setSelectedCharacterId={setSelectedCharacterId} 
    />
  ) : (
    <LoadingScreen />
  );
}

function LoadingScreen() {
  return (
    <div className="h-screen bg-[#0f0f0f] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Initializing storage...</p>
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
  const { createSession, sessions, setActiveSessionId: setChatActiveSessionId } = useChat();
  const { house, isLoading } = useHouseFileStorage();
  
  // Initialize conversation analytics for auto-summarization
  const { isInitialized: analyticsInitialized } = useConversationAnalytics();

  // Listen for Ali's direct session switches
  useEffect(() => {
    const handleDirectSessionSwitch = (event: Event) => {
      const { sessionId, characterId } = (event as any).detail;
      logger.log('🎯 Ali direct session switch:', sessionId, characterId);
      
      setActiveSessionId(sessionId);
      setChatActiveSessionId(sessionId);
      setCurrentView('chat');
      setSelectedCharacterId(characterId);
      
      const character = house?.characters?.find(c => c.id === characterId);
      if (character) {
        toast.success(`${character.name} is in your room now...`, { duration: 3000 });
      }
    };

    (globalThis as any).addEventListener('ali-direct-session-switch', handleDirectSessionSwitch);
    
    return () => {
      (globalThis as any).removeEventListener('ali-direct-session-switch', handleDirectSessionSwitch);
    };
  }, [setActiveSessionId, setChatActiveSessionId, setCurrentView, setSelectedCharacterId, house?.characters]);

  const handleStartChat = async (characterId: string) => {
    try {
      if (!house?.characters || house.characters.length === 0) return;
      const character = house.characters.find(c => c.id === characterId);
      if (!character) return;
      
      const sessionId = await createSession('individual', [characterId]);
      if (sessionId) {
        setActiveSessionId(sessionId);
        setChatActiveSessionId(sessionId);
        setCurrentView('chat');
        setSelectedCharacterId(characterId);
        
        toast.success(`${character.name} is on her way to your room...`, {
          duration: 3000,
        });
      }
    } catch (e) {
      logger.error('Explicit chat start failed', e);
    }
  };

  const handleSelectCharacter = (characterId: string) => {
    setSelectedCharacterId(characterId);
    setCurrentView('chat');
  };

  const handleStartGroupChat = () => {
    try {
      const g = globalThis as any;
      if (g?.dispatchEvent && g?.CustomEvent) {
        g.dispatchEvent(new g.CustomEvent('open-group-chat-creator'));
      }
      setCurrentView('chat');
    } catch (e) {
      logger.error('Failed to trigger group chat creator', e);
    }
  };

  const handleStartScene = (sessionId: string) => {
    logger.log('handleStartScene called with sessionId:', sessionId);
    
    try {
      setActiveSessionId(sessionId);
      setCurrentView('scene');
      toast.success('Scene started! Session ID: ' + sessionId.slice(0, 12));
    } catch (error) {
      logger.error('Error in handleStartScene:', error);
      toast.error('Failed to start scene');
    }
  };

  const handleViewChange = (view: 'house' | 'scene' | 'chat') => {
    setCurrentView(view);
  };

  const handleSessionChange = (sessionId: string | null) => {
    setActiveSessionId(sessionId);
    if (sessionId) {
      setChatActiveSessionId(sessionId);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading house data...</p>
        </div>
      </div>
    );
  }

  // Function to render main content based on current view
  const renderMainContent = () => {
    switch (currentView) {
      case 'house':
        return <HouseView />;
      case 'chat':
        const active = sessions.find(s => s.id === activeSessionId);
        if (active?.type === 'interview' && activeSessionId) {
          return <InterviewChat sessionId={activeSessionId} onExit={() => setCurrentView('house')} />;
        }
        // Universal chat will be handled by Layout
        return <HouseView />; 
      case 'scene':
        return activeSessionId ? (
          <SceneInterface 
            sessionId={activeSessionId}
            onClose={() => setCurrentView('house')}
          />
        ) : <HouseView />;
      default:
        return <HouseView />;
    }
  };

  return (
    <div className="h-screen bg-[#0f0f0f]">
      <Layout
        onStartChat={handleStartChat}
        onStartGroupChat={handleStartGroupChat}
        onSelectCharacter={handleSelectCharacter}
        onStartScene={handleStartScene}
        activeSessionId={activeSessionId}
        currentView={currentView}
        onViewChange={handleViewChange}
        onSessionChange={handleSessionChange}
      >
        {renderMainContent()}
      </Layout>
      <Toaster />
    </div>
  );
}

export default App;