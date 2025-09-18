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
    // Mobile layout - single column with bottom nav or drawer, device-like dark style
    return (
      <div className="flex flex-col h-screen bg-black text-white">
        {/* Debug Status */}
        {dbStatus && (
          <div className="fixed top-2 right-2 z-50 bg-black/80 text-white px-2 py-1 rounded text-xs font-mono">
            {dbStatus}
          </div>
        )}
        {/* Main Content */}
        <div className="flex-1 overflow-hidden bg-[#18181b] rounded-t-2xl shadow-xl mx-0 mt-0">
          {children}
        </div>
        {/* Mobile Navigation */}
        <div className="border-t border-zinc-800 bg-[#101014] rounded-b-2xl shadow-xl p-0">
          <div className="p-2">
            <Sidebar 
              onStartChat={onStartChat}
              onStartGroupChat={onStartGroupChat}
              onStartScene={onStartScene}
            />
          </div>
        </div>
      </div>
    );
  }

  // Desktop layout - three columns, device-like dark style
  return (
    <div className="flex h-screen bg-black text-white">
      {/* Debug Status */}
      {dbStatus && (
        <div className="fixed top-2 right-2 z-50 bg-black/80 text-white px-2 py-1 rounded text-xs font-mono">
          {dbStatus}
        </div>
      )}
      {/* Main Sidebar */}
  <div className="w-[24rem] flex-shrink-0 overflow-hidden p-2">
        <div className="h-full rounded-2xl shadow-xl bg-[#18181b] border border-zinc-800 flex flex-col">
          <Sidebar 
            onStartChat={onStartChat}
            onStartGroupChat={onStartGroupChat}
            onStartScene={onStartScene}
          />
        </div>
      </div>
      {/* Main Content */}
      <div className="flex-1 flex flex-col p-2">
        <div className="h-full rounded-2xl shadow-xl bg-[#18181b] border border-zinc-800 flex flex-col">
          {children}
        </div>
      </div>
      {/* Copilot Sidebar */}
  <div className="w-80 flex-shrink-0 overflow-hidden p-2">
        <div className="h-full rounded-2xl shadow-xl bg-[#18181b] border border-zinc-800 flex flex-col">
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