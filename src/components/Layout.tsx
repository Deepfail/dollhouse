import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Copilot } from './Copilot';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      {/* Main Sidebar */}
      <div className="w-80 border-r border-border flex-shrink-0">
        <Sidebar />
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