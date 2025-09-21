import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Robot,
  Users,
  Gift,
  PaperPlaneRight,
  Sparkle,
  // MagnifyingGlass,
  // Lightbulb,
  Plus,
  FloppyDisk
} from '@phosphor-icons/react';
import { Character } from '@/types';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { useChat } from '@/hooks/useChat';
import { useQuickActions } from '@/hooks/useQuickActions';
import { CharacterCreatorRepo } from './CharacterCreatorRepo';

interface CopilotProps {
  onStartChat?: (characterId: string) => void;
  onStartGroupChat?: (sessionId?: string) => void;
  onStartScene?: (sessionId: string) => void;
}

type Message = {
  id: string;
  sender: 'copilot' | 'user';
  content: string;
  timestamp: string;
  suggestions?: string[];
  recommendations?: unknown[];
};

export function Copilot({ onStartChat, onStartGroupChat, onStartScene }: CopilotProps) {
  const { characters } = useHouseFileStorage();

  const [inputMessage, setInputMessage] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | undefined>(undefined);

  const insights = {
    engagement: 87,
    contentQuality: 92,
    growthRate: 74
  };

  // (removed unused quickActions in favor of explicit action buttons)

  const initialMessages: Message[] = [
    {
      id: '1',
      sender: 'copilot',
      content: "Hello! I'm your AI assistant. How can I help you today?",
      timestamp: 'Just now'
    }
  ];

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { createSession, sendMessage, activeSessionId, setActiveSessionId } = useChat();
  const { executeAction } = useQuickActions();

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    const content = inputMessage.trim();
    setInputMessage('');

    (async () => {
      try {
        // Ensure session exists
        let sessionId = activeSessionId;
        if (!sessionId) {
          const participants = selectedCharacterId ? [selectedCharacterId] : [];
          sessionId = await createSession(participants.length ? 'individual' : 'scene', participants);
          setActiveSessionId(sessionId);
        }

        // Send via hook (persists to DB and triggers server-side generation)
        await sendMessage(sessionId!, content, 'user');

        // Optimistic UI: append user message locally
        const userMsg = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2,9)}`,
          sender: 'user' as const,
          content,
          timestamp: 'Just now'
        };
        setMessages((m) => [...m, userMsg]);

        // Return focus to input for quick follow-ups
  try { inputRef.current?.focus(); } catch { /* ignore focus errors */ }
      } catch (e) {
        try { (globalThis as any).logger?.error?.('Failed sending message via useChat', e); } catch {}
        setMessages((m) => [...m, { id: `${Date.now()}-err`, sender: 'copilot', content: 'Failed to send message', timestamp: 'Now' }]);
      }
    })();
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-scroll messages container when new messages arrive
  useEffect(() => {
    if (!scrollRef.current) return;
    try {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    } catch {
      try { (globalThis as any).logger?.warn?.('Scroll failed'); } catch {}
    }
  }, [messages]);

  return (
    <div className="h-full flex flex-col bg-[#1a1a1a] text-white border-l border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#4facfe] to-[#667eea] flex items-center justify-center">
            <Robot size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">House Assistant</h2>
            <p className="text-xs text-gray-400">Help with characters, scenes, and edits</p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <select
              aria-label="Select character to edit"
              value={selectedCharacterId || ''}
              onChange={(e) => setSelectedCharacterId(e.target.value || undefined)}
              className="bg-[#0f0f0f] text-sm text-gray-300 rounded px-2 py-1 border border-gray-700"
            >
              <option value="">Select character...</option>
                {((characters || []) as Character[]).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
            <Button size="sm" variant="ghost" onClick={() => setEditorOpen(true)} aria-label="Create character">
              <Plus size={14} />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => {
              if (selectedCharacterId) setEditorOpen(true);
            }} aria-label="Edit selected character" disabled={!selectedCharacterId}>
              <FloppyDisk size={14} />
            </Button>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-[#0f0f0f] p-4 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-gray-400 mb-4">AI INSIGHTS</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Engagement Score</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-gray-700 rounded-full">
                <div 
                  className="h-2 bg-gradient-to-r from-[#43e97b] to-[#4facfe] rounded-full"
                  style={{ width: `${insights.engagement}%` }}
                ></div>
              </div>
              <span className="text-sm font-semibold text-[#43e97b]">{insights.engagement}%</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Content Quality</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-gray-700 rounded-full">
                <div 
                  className="h-2 bg-gradient-to-r from-[#667eea] to-[#f093fb] rounded-full"
                  style={{ width: `${insights.contentQuality}%` }}
                ></div>
              </div>
              <span className="text-sm font-semibold text-[#667eea]">{insights.contentQuality}%</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Growth Rate</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-gray-700 rounded-full">
                <div 
                  className="h-2 bg-gradient-to-r from-[#fa709a] to-[#ff1372] rounded-full"
                  style={{ width: `${insights.growthRate}%` }}
                ></div>
              </div>
              <span className="text-sm font-semibold text-[#ff1372]">{insights.growthRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">QUICK ACTIONS</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="justify-start" onClick={async () => {
            try {
              if (!selectedCharacterId) return onStartChat?.('');
              const sid = await createSession('individual', [selectedCharacterId]);
              setActiveSessionId(sid);
              onStartChat?.(selectedCharacterId);
            } catch (e) {
              globalThis.console?.error?.('Failed to start chat session', e);
            }
          }} aria-label="Start chat">
            <PaperPlaneRight size={14} className="mr-2" /> Chat
          </Button>
          <Button variant="outline" size="sm" className="justify-start" onClick={() => onStartGroupChat?.('')} aria-label="Start group chat">
            <Users size={14} className="mr-2" /> Group
          </Button>
          <Button variant="outline" size="sm" className="justify-start" onClick={() => onStartScene?.('')} aria-label="Start scene">
            <Sparkle size={14} className="mr-2" /> Scene
          </Button>
          <Button variant="outline" size="sm" className="justify-start" onClick={() => executeAction('gather-all')} aria-label="Gather all characters">
            <Gift size={14} className="mr-2" /> Gather
          </Button>
        </div>
      </div>

      {/* Chat Messages - make this area flexible and allow internal scrolling behind the sticky input */}
      <ScrollArea className="flex-1 min-h-0">
        <div ref={scrollRef} className="p-4 pb-28 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="flex gap-3 items-start">
              {message.sender === 'copilot' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#4facfe] to-[#667eea] flex items-center justify-center flex-shrink-0">
                  <Robot size={12} className="text-white" />
                </div>
              )}
              
              <div className={`flex-1 ${message.sender === 'user' ? 'text-right' : ''}`}>
                <div className={`inline-block rounded-xl p-3 ${
                  message.sender === 'user' 
                    ? 'bg-gradient-to-r from-[#ff5a5d] to-[#ff1372] text-white' 
                    : 'bg-neutral-800 text-gray-300'
                }`}> 
                  <p className="text-sm">{message.content}</p>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {message.timestamp}
                </div>
              </div>
              
              {message.sender === 'user' && (
                <div className="w-8 h-8 rounded-full bg-center bg-cover flex-shrink-0 bg-gradient-to-r from-blue-500 to-purple-600"></div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input Area - sticky to bottom so it's always visible while messages scroll */}
      <div className="sticky bottom-0 bg-[#1a1a1a] p-4 border-t border-gray-700 z-20">
        <div className="relative">
          <Input
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask your House Assistant..."
            aria-label="Ask the house assistant"
            className="pr-12 bg-[#0f0f0f] border border-gray-700 text-white placeholder-gray-500"
          />
          <Button
            size="sm"
            onClick={handleSendMessage}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 p-0"
          >
            <PaperPlaneRight size={12} />
          </Button>
        </div>
        
        {/* Status Dots */}
        <div className="flex justify-center gap-2 mt-2">
          <div className="w-2 h-2 bg-[#667eea] rounded-full opacity-90"></div>
          <div className="w-2 h-2 bg-[#f093fb] rounded-full opacity-90"></div>
          <div className="w-2 h-2 bg-[#4facfe] rounded-full opacity-90"></div>
        </div>
      </div>
      {/* Character Editor Drawer wired to quick actions */}
      <CharacterCreatorRepo
        open={editorOpen}
        onOpenChange={(v) => {
          setEditorOpen(v);
          if (!v) setSelectedCharacterId(undefined);
        }}
        character={((characters || []) as Character[]).find((c) => c.id === selectedCharacterId)}
      />
    </div>
  );
}