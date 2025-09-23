import { useState, useEffect, ReactNode } from 'react';
import { Copilot } from './Copilot';
import { UniversalChat } from './UniversalChat';
import { UniversalToolbar } from './UniversalToolbar';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
  dbStatus?: string;
  activeSessionId?: string | null;
}

export function Layout({ 
  children, 
  dbStatus,
  activeSessionId
}: LayoutProps) {
  const isMobile = useIsMobile();
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);

  // Handle Ali's session switch events
  useEffect(() => {
    const handleSessionSwitch = (event: any) => {
      const { sessionId } = event.detail;
      setChatSessionId(sessionId);
      setShowChat(true);
    };

    (globalThis as any).addEventListener('ali-direct-session-switch', handleSessionSwitch);
    
    return () => {
      (globalThis as any).removeEventListener('ali-direct-session-switch', handleSessionSwitch);
    };
  }, []);

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
      </div>
    );
  }

  // Desktop layout - just main content and copilot
  return (
    <div className="flex h-screen bg-[#0f0f0f] text-white">
      {dbStatus && (
        <div className="fixed top-2 left-2 z-50 bg-black/80 text-white px-2 py-1 rounded text-xs font-mono">
          {dbStatus}
        </div>
      )}
      
      {/* Main Content Area - Full Width */}
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
      
      {/* Right Sidebar - AI Copilot Only */}
      <div className="w-[320px] flex-shrink-0 bg-[#1a1a1a] border-l border-gray-700 flex flex-col min-h-screen overflow-y-auto">
        <div className="flex-1 min-h-0">
          <Copilot />
        </div>
      </div>
    </div>
  );
}