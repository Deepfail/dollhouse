import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Copilot } from './Copilot';

interface LayoutProps {
  children: ReactNode;
  onStartChat?: (characterId: string) => void;
  onStartScene?: (sessionId: string) => void;
}

export function Layout({ children, onStartChat, onStartScene }: LayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      {/* Main Sidebar */}
      <div className="w-80 border-r border-border flex-shrink-0">
        <Sidebar 
          onStartChat={onStartChat}
          onStartScene={onStartScene}
        />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {children}
      </div>
      
      {/* Copilot Sidebar */}
      <div className="w-80 border-l border-border flex-shrink-0">
        <Copilot />
      </div>
    </div>
  );
}