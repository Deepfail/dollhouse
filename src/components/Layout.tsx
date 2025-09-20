import { useIsMobile } from '@/hooks/use-mobile';
import { ReactNode } from 'react';
import { Copilot } from './Copilot';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: ReactNode;
  currentView?: 'house' | 'chat' | 'scene';
  onStartChat?: (characterId: string) => void;
  onStartGroupChat?: (sessionId?: string) => void;
  onStartScene?: (sessionId: string) => void;
  dbStatus?: string;
}

export function Layout({ children, currentView, onStartChat, onStartGroupChat, onStartScene, dbStatus }: LayoutProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    // Mobile layout - single column with device-like appearance
    return (
      <div className="flex flex-col h-screen bg-[#0f0f0f] text-white">
        {/* Debug Status */}
        {dbStatus && (
          <div className="fixed top-2 right-2 z-50 bg-black/80 text-white px-2 py-1 rounded text-xs font-mono">
            {dbStatus}
          </div>
        )}
        {/* Main Content - Full Screen Mobile */}
        <div className="flex-1 overflow-hidden bg-[#0f0f0f]">
          {children}
        </div>
        {/* Mobile Navigation */}
        <div className="border-t border-gray-700 bg-[#1a1a1a] p-4">
          <Sidebar 
            onStartChat={onStartChat}
            onStartGroupChat={onStartGroupChat}
            onStartScene={onStartScene}
          />
        </div>
      </div>
    );
  }

  // Desktop layout - three columns matching Figma design
  return (
    <div className="flex h-screen bg-[#0f0f0f] text-white">
      {/* Debug Status */}
      {dbStatus && (
        <div className="fixed top-2 right-2 z-50 bg-black/80 text-white px-2 py-1 rounded text-xs font-mono">
          {dbStatus}
        </div>
      )}
      
      {/* Left Sidebar - User List & Navigation */}
      <div className="w-[320px] flex-shrink-0 bg-[#1a1a1a] border-r border-gray-700">
        <Sidebar 
          onStartChat={onStartChat}
          onStartGroupChat={onStartGroupChat}
          onStartScene={onStartScene}
        />
      </div>
      
      {/* Center - Mobile Device Mockup */}
      <div className="flex-1 flex items-center justify-center bg-[#0f0f0f]">
        <div className="w-[440px] h-[760px] bg-[#1a1a1a] rounded-[24px] border border-gray-700 shadow-[0px_0px_20px_0px_rgba(102,126,234,0.3)] overflow-hidden">
          {children}
        </div>
      </div>
      
      {/* Right Sidebar - AI Copilot */}
      <div className="w-[320px] flex-shrink-0 bg-[#1a1a1a] border-l border-gray-700">
        <Copilot 
          onStartChat={onStartChat}
          onStartGroupChat={onStartGroupChat}
          onStartScene={onStartScene}
        />
      </div>
    </div>
  );
}