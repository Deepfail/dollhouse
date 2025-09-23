import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Copilot } from './Copilot';

interface LayoutProps {
  children: ReactNode;
  currentView?: 'house' | 'chat' | 'scene';
  onStartChat?: (characterId: string) => void;
  onStartGroupChat?: (sessionId?: string) => void;
  onSelectCharacter?: (characterId: string) => void;
  onStartScene?: (sessionId: string) => void;
}

export function Layout({ children, currentView, onStartChat, onStartGroupChat, onSelectCharacter, onStartScene }: LayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      {/* Main Sidebar */}
      <div className="w-80 border-r border-border flex-shrink-0 overflow-hidden">
        <Sidebar 
          onStartChat={onStartChat}
          onStartGroupChat={onStartGroupChat}
          onSelectCharacter={onSelectCharacter}
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