import { useState, useEffect, ReactNode } from 'react';
import { Copilot } from './Copilot';
import { Sidebar } from './Sidebar';
import { UniversalChat } from './UniversalChat';
import { UniversalToolbar } from './UniversalToolbar';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
  onStartChat?: (characterId: string) => void;
  onSelectCharacter?: (characterId: string) => void;
  onStartGroupChat?: (sessionId?: string) => void;
  onStartScene?: (sessionId: string) => void;
  dbStatus?: string;
  isAnimating?: boolean;
  activeSessionId?: string | null;
  currentView?: 'house' | 'scene' | 'chat';
  onViewChange?: (view: 'house' | 'scene' | 'chat') => void;
  onSessionChange?: (sessionId: string | null) => void;
}

export function Layout({ 
  children, 
  onStartChat, 
  onSelectCharacter, 
  onStartGroupChat, 
  onStartScene, 
  dbStatus,
  activeSessionId,
  currentView = 'house',
  onViewChange,
  onSessionChange
}: LayoutProps) {
  const isMobile = useIsMobile();
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);

  // Handle Ali's session switch events
  useEffect(() => {
    const handleSessionSwitch = (event: CustomEvent) => {
      const { sessionId } = event.detail;
      console.log('🔄 Layout received session switch:', sessionId);
      setChatSessionId(sessionId);
      setShowChat(true);
      onSessionChange?.(sessionId);
      onViewChange?.('chat');
    };

    window.addEventListener('ali-direct-session-switch', handleSessionSwitch as EventListener);
    
    return () => {
      window.removeEventListener('ali-direct-session-switch', handleSessionSwitch as EventListener);
    };
  }, [onSessionChange, onViewChange]);

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-[#0f0f0f] text-white">
        {dbStatus && (
          <div className="fixed top-2 right-2 z-50 bg-black/80 text-white px-2 py-1 rounded text-xs font-mono">
            {dbStatus}
          </div>
        )}
        
        {/* Show either main content or chat */}
        <div className="flex-1 overflow-hidden bg-[#0f0f0f]">
          {showChat && chatSessionId ? (
            <UniversalChat 
              sessionId={chatSessionId} 
              onClose={() => setShowChat(false)}
            />
          ) : (
            children
          )}
        </div>
        
        <div className="border-t border-gray-700 bg-[#1a1a1a] p-4">
          <Sidebar 
            onStartChat={onStartChat}
            onSelectCharacter={onSelectCharacter}
            onStartGroupChat={onStartGroupChat}
            onStartScene={onStartScene}
            onSwitchToSession={(sessionId) => {
              setChatSessionId(sessionId);
              setShowChat(true);
            }}
          />
        </div>
      </div>
    );
  }

  // Desktop layout - fuck the phone mockup, real chat interface
  return (
    <div className="flex h-screen bg-[#0f0f0f] text-white">
      {dbStatus && (
        <div className="fixed top-2 right-2 z-50 bg-black/80 text-white px-2 py-1 rounded text-xs font-mono">
          {dbStatus}
        </div>
      )}
      
      {/* Left Sidebar - Characters & Navigation */}
      <div className="w-[320px] flex-shrink-0 bg-[#1a1a1a] border-r border-gray-700">
        <Sidebar 
          onStartChat={onStartChat}
          onSelectCharacter={onSelectCharacter}
          onStartGroupChat={onStartGroupChat}
          onStartScene={onStartScene}
          onSwitchToSession={(sessionId) => {
            setChatSessionId(sessionId);
            setShowChat(true);
          }}
        />
      </div>
      
      {/* Center - Main Content or Universal Chat */}
      <div className="flex-1 flex flex-col bg-[#0f0f0f] relative">
        <UniversalToolbar position="top" />
        
        <div className="flex-1 overflow-hidden">
          {showChat && chatSessionId ? (
            <UniversalChat 
              sessionId={chatSessionId} 
              onClose={() => setShowChat(false)}
            />
          ) : (
            children
          )}
        </div>
      </div>
      
      {/* Right Sidebar - AI Copilot */}
      <div className="w-[320px] flex-shrink-0 bg-[#1a1a1a] border-l border-gray-700 flex flex-col min-h-screen overflow-y-auto">
        <div className="flex-1 min-h-0">
          <Copilot 
            onStartChat={onStartChat}
            onStartGroupChat={onStartGroupChat}
            onStartScene={onStartScene}
          />
        </div>
      </div>
    </div>
  );
}