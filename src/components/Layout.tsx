import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Copilot } from './Copilot';

interface LayoutProps {
  children: ReactNode;
  currentView?: 'house' | 'chat' | 'scene';
  onStartChat?: (characterId: string) => void;
  onStartGroupChat?: (sessionId?: string) => void;
  onStartScene?: (sessionId: string) => void;
  dbStatus?: string;
}

export function Layout({ children, currentView, onStartChat, onStartGroupChat, onStartScene, dbStatus }: LayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      {/* Debug Status */}
      {dbStatus && (
        <div className="fixed top-2 right-2 z-50 bg-black/80 text-white px-2 py-1 rounded text-xs font-mono">
          {dbStatus}
        </div>
      )}
      
      {/* Main Sidebar */}
      <div className="w-80 border-r border-border flex-shrink-0 overflow-hidden">
        <Sidebar 
          onStartChat={onStartChat}
          onStartGroupChat={onStartGroupChat}
          onStartScene={onStartScene}
        />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {children}
      </div>
      
      {/* Copilot Sidebar */}
      <div className="w-80 border-l border-border flex-shrink-0">
        <Copilot 
          onStartChat={onStartChat}
          onStartGroupChat={onStartGroupChat}
          onStartScene={onStartScene}
        />
      </div>
    </div>
  );
}