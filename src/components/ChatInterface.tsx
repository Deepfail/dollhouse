import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useChat } from '@/hooks/useChat';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import type { Character, ChatMessage, ChatSession } from '@/types';
import {
    ArrowLeft,
    BatteryMedium,
    ChartBar,
    CheckCircle,
    Crown,
    Gear,
    Heart,
    ChatCircle as MessageCircle,
    PencilSimple,
    User,
    WifiHigh
} from '@phosphor-icons/react';
import React, { useEffect, useState } from 'react';
import { CharacterCreatorRepo } from './CharacterCreatorRepo';
import { GroupChatCreator } from './GroupChatCreator';

interface ChatInterfaceProps {
  sessionId?: string | null;
  selectedCharacterId?: string | null; // passive selection without guaranteed session
  onBack?: () => void;
  onStartGroupChat?: (sessionId?: string) => void;
}

export function ChatInterface({ sessionId, selectedCharacterId, onBack }: ChatInterfaceProps) {
  const { characters } = useHouseFileStorage();
  const { sessions, getSessionMessages, sendMessage, activeSessionId: hookActive, setActiveSessionId, switchToSession, createSession, createInterviewSession } = useChat() as unknown as {
    sessions: ChatSession[];
    getSessionMessages: (id: string) => Promise<ChatMessage[]>;
    sendMessage: (sessionId: string, content: string, senderId: string) => Promise<void>;
    activeSessionId: string | null;
    setActiveSessionId: (id: string) => void;
    switchToSession: (id: string) => Promise<void>;
    createSession: (type: 'individual' | 'group' | 'scene' | 'assistant' | 'interview', participantIds: string[]) => Promise<string>;
    createInterviewSession: (characterId: string) => Promise<string>;
  };
  const [activeTab, setActiveTab] = useState<'profile'|'chat'|'feed'|'stats'|'settings'>('profile');
  const [showSessionList, setShowSessionList] = useState(false);

  const effectiveSessionId = sessionId || hookActive || null;
  const session = sessions?.find((s: ChatSession) => s.id === effectiveSessionId);
  const sessionCharacters = characters?.filter((c: Character) => session?.participantIds?.includes(c.id)) || [];
  
  // Get the main character for profile display
  // Determine main character: prefer explicit selectedCharacterId when no active session
  const mainCharacter = sessionCharacters[0] || characters?.find(c => c.id === selectedCharacterId) || characters?.[0];
  const [editOpen, setEditOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  // Listen for external request to open group chat creator (e.g., big green button)
  useEffect(() => {
    const g = globalThis as unknown as { addEventListener?: (t: string, cb: () => void) => void; removeEventListener?: (t: string, cb: () => void) => void };
    const handler = () => setGroupModalOpen(true);
    if (g.addEventListener) g.addEventListener('open-group-chat-creator', handler);
    return () => { if (g.removeEventListener) g.removeEventListener('open-group-chat-creator', handler); };
  }, []);
  // Reference to bottom sentinel for auto-scroll
  // Scroll anchor id
  const scrollAnchorId = 'chat-scroll-anchor';

  // Ensure hook active session matches prop if provided
  useEffect(() => {
    if (effectiveSessionId && hookActive !== effectiveSessionId) {
      try { setActiveSessionId(effectiveSessionId); } catch { /* ignore */ }
    }
  }, [effectiveSessionId, hookActive, setActiveSessionId]);

  // When active session changes, auto-switch to chat tab if we have messages or user had chat previously
  useEffect(() => {
    if (!effectiveSessionId) {
      // No session -> make sure we are on profile tab
      if (activeTab !== 'profile') setActiveTab('profile');
      return;
    }
    (async () => {
      const data = await getSessionMessages(effectiveSessionId);
      setMessages(data);
      if (data.length > 0 && activeTab !== 'chat') setActiveTab('chat');
    })();
  }, [effectiveSessionId]);

  // Load messages when session changes or tab becomes chat
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (activeTab !== 'chat' || !effectiveSessionId) return;
      const data = await getSessionMessages(effectiveSessionId);
      if (!cancelled) setMessages(data);
    }
    load();
    return () => { cancelled = true; };
  }, [effectiveSessionId, activeTab, getSessionMessages]);

  // Listen for global updates to refresh while in chat tab
  useEffect(() => {
    if (activeTab !== 'chat') return;
    const handler = () => {
      if (!effectiveSessionId) return;
      getSessionMessages(effectiveSessionId).then(setMessages).catch(() => { /* ignore */ });
    };
    const g = globalThis as unknown as { addEventListener?: (t: string, cb: () => void) => void; removeEventListener?: (t: string, cb: () => void) => void };
    if (g?.addEventListener) {
      g.addEventListener('chat-sessions-updated', handler);
      return () => g.removeEventListener && g.removeEventListener('chat-sessions-updated', handler);
    }
    return undefined;
  }, [activeTab, effectiveSessionId, getSessionMessages]);

  // Listen for explicit active-session change events to switch to chat
  useEffect(() => {
    const onActiveChanged = (e: unknown) => {
      const evt = e as { detail?: { sessionId?: string } };
      if (evt.detail?.sessionId) {
        // Load messages and show chat
        getSessionMessages(evt.detail.sessionId).then(setMessages);
        setActiveTab('chat');
      }
    };
    const g = globalThis as unknown as { addEventListener?: (t: string, cb: (e: unknown) => void) => void; removeEventListener?: (t: string, cb: (e: unknown) => void) => void };
    if (g?.addEventListener) {
      g.addEventListener('chat-active-session-changed', onActiveChanged);
      return () => g.removeEventListener && g.removeEventListener('chat-active-session-changed', onActiveChanged);
    }
    return undefined;
  }, [getSessionMessages]);

  // Auto scroll on messages change
  useEffect(() => {
    if (activeTab === 'chat') {
      type Elem = { scrollIntoView?: (opts?: unknown) => void } | null;
      const g = globalThis as unknown as { document?: { getElementById: (id: string) => Elem } };
      const el: Elem = g.document ? g.document.getElementById(scrollAnchorId) : null;
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages, activeTab]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !effectiveSessionId) return;
    const text = chatInput.trim();
    setChatInput('');
    // Optimistic append
  const optimistic: ChatMessage = { id: `temp-${Date.now()}`, characterId: undefined, content: text, timestamp: new Date(), type: 'text', metadata: undefined };
  setMessages(prev => [...prev, optimistic]);
    try {
      await sendMessage(effectiveSessionId, text, 'user');
      const refreshed = await getSessionMessages(effectiveSessionId);
      setMessages(refreshed);
    } catch {
      // Rollback optimistic if needed
    }
  };

  // Character-specific sessions list (individual only)
  const characterSessionList = React.useMemo(() => {
    if (!mainCharacter) return [] as ChatSession[];
    return sessions.filter(s => s.type === 'individual' && s.participantIds.includes(mainCharacter.id))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }, [sessions, mainCharacter]);

  const handleSelectSession = async (id: string) => {
    await switchToSession(id);
    setShowSessionList(false);
    setActiveTab('chat');
  };

  const handleNewSession = async () => {
    if (!mainCharacter) return;
    const newId = await createSession('individual', [mainCharacter.id]);
    await switchToSession(newId);
    setShowSessionList(false);
    setActiveTab('chat');
  };
  
  // Mock stats for the design
  const stats = {
    love: 65,
    wet: 45,
    trust: 78,
    confidence: 82,
    intelligence: 94,
    creativity: 89,
    humor: 71,
    kindness: 92,
    adventurous: 63
  };

  if (!mainCharacter) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm">
          <MessageCircle size={48} className="mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold mb-2">No Character Selected</h3>
            <p className="text-muted-foreground text-sm">Select a character from the sidebar to view their profile.</p>
          </div>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft size={16} className="mr-2" /> Back to House
          </Button>
        </div>
      </div>
    );
  }

  const isGroup = session?.type === 'group';

  return (
    <div className={`h-full flex flex-col bg-[#1a1a1a] text-white ${isGroup ? 'group-chat-layout' : ''}`}>      
      {!isGroup && (
      <div className="bg-[#0f0f0f] h-[32px] flex items-center justify-between px-6 text-white text-xs flex-shrink-0">
        <span className="font-medium">9:41</span>
        <div className="flex items-center gap-1">
          <WifiHigh size={16} className="text-white" />
          <WifiHigh size={16} className="text-white" />
          <BatteryMedium size={16} className="text-white" />
        </div>
      </div>) }

      {/* Header */}
  <div className={`h-[73px] border-b border-[rgba(255,255,255,0.04)] px-4 flex items-center justify-between flex-shrink-0 ${isGroup ? 'bg-[#141414]' : 'bg-[#1a1a1a]'}`}>
        <div className="flex items-center gap-3">
          {isGroup ? (
            <div className="flex items-center gap-2">
              {session?.participantIds.slice(0,5).map(pid => {
                const c = characters?.find(ch => ch.id === pid);
                if (!c) return null;
                return (
                  <Avatar key={pid} className="w-8 h-8 border border-neutral-700">
                    <AvatarImage src={c.avatar} />
                    <AvatarFallback>{c.name.slice(0,2)}</AvatarFallback>
                  </Avatar>
                );
              })}
              {session && session.participantIds.length > 5 && (
                <div className="text-[10px] text-gray-400">+{session.participantIds.length - 5}</div>
              )}
              <div className="ml-2">
                <h2 className="text-white font-semibold text-sm">Group Chat</h2>
                <p className="text-[#ff1372] text-[10px] uppercase tracking-wide">{session?.participantIds.length} participants</p>
              </div>
            </div>
          ) : (
            <>
              <Avatar className="w-10 h-10">
                <AvatarImage src={mainCharacter.avatar} alt={mainCharacter.name} />
                <AvatarFallback>{mainCharacter.name?.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-white font-semibold">{mainCharacter.name}</h2>
                <p className="text-[#43e97b] text-xs">Online now</p>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 relative">
          <Button variant="ghost" size="sm" onClick={() => setShowSessionList(v => !v)} aria-label="Character Chats">
            <MessageCircle size={16} className={showSessionList ? 'text-[#ff1372]' : 'text-gray-400'} />
          </Button>
          {!isGroup && mainCharacter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const id = await createInterviewSession(mainCharacter.id);
                await switchToSession(id);
                setActiveTab('chat');
              }}
              className="text-xs"
            >
              Interview
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setGroupModalOpen(true)}
            className="text-xs"
          >
            Group
          </Button>
          <Button variant="ghost" size="sm">
            <CheckCircle size={16} className="text-gray-400" />
          </Button>
          {/* Pencil edit button - opens character editor */}
          <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)} aria-label="Edit character">
            <PencilSimple size={16} className="text-gray-300" />
          </Button>
          {showSessionList && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-[#111] border border-neutral-800 rounded-xl shadow-xl z-50 p-2 space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-gray-300">Chats with {mainCharacter?.name}</span>
                <Button size="sm" variant="ghost" className="text-[10px] px-1 h-5" onClick={handleNewSession}>New</Button>
              </div>
              <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                {characterSessionList.length === 0 && (
                  <div className="text-[11px] text-gray-500 px-2 py-3 text-center">No chats yet. Start one!</div>
                )}
                {characterSessionList.map(s => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectSession(s.id)}
                    className={`w-full text-left px-2 py-2 rounded-lg border text-[11px] transition-colors ${s.id === effectiveSessionId ? 'border-[#ff1372] bg-[#ff1372]/10 text-white' : 'border-neutral-800 hover:bg-neutral-800 text-gray-300'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">Chat</span>
                      <span className="text-[10px] text-gray-500">{s.updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-gray-500">
                      <span>{s.messageCount ?? messages.length} msgs</span>
                      {s.endedAt && <span className="text-[9px] text-yellow-500">ended</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {!isGroup && (
      <div className="bg-neutral-800 h-[52px] border-b border-[rgba(255,255,255,0.02)] shadow-[0_10px_30px_-12px_rgba(255,19,145,0.45)] flex items-center px-4 flex-shrink-0">
        <div className="flex w-full items-center justify-between gap-6 max-w-[980px] mx-auto text-xs">
          {/* Love */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-2 w-28">
              <Heart size={14} className="text-red-400" />
              <span className="text-gray-300">Love</span>
            </div>
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-red-400 to-[#ff1372]" style={{ width: `${stats.love}%` }} />
              </div>
              <span className="text-red-400 font-semibold w-10 text-right">{stats.love}%</span>
            </div>
          </div>

          {/* Wet */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-2 w-28">
              <div className="w-3 h-3.5 bg-blue-400 rounded-sm" />
              <span className="text-gray-300">Wet</span>
            </div>
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-blue-400 to-cyan-400" style={{ width: `${stats.wet}%` }} />
              </div>
              <span className="text-blue-400 font-semibold w-10 text-right">{stats.wet}%</span>
            </div>
          </div>

          {/* Trust */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-2 w-28">
              <Crown size={14} className="text-green-400" />
              <span className="text-gray-300">Trust</span>
            </div>
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-green-400 to-emerald-400" style={{ width: `${stats.trust}%` }} />
              </div>
              <span className="text-green-400 font-semibold w-10 text-right">{stats.trust}%</span>
            </div>
          </div>
        </div>
      </div>) }

      {/* Content Area */}
  <div className={`flex-1 overflow-hidden ${isGroup ? 'pb-2' : ''}`}>
        {activeTab === 'profile' && (
        <ScrollArea className="h-full p-4">
          {/* Character Profile */}
          <div className="space-y-6">
            {/* Main Avatar and Info */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <Avatar className="w-32 h-32 border-4 border-[#667eea]">
                  <AvatarImage src={mainCharacter.avatar} alt={mainCharacter.name} />
                  <AvatarFallback className="text-2xl">{mainCharacter.name?.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#43e97b] rounded-full border-4 border-[#1a1a1a] flex items-center justify-center">
                  <CheckCircle size={12} className="text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{mainCharacter.name}</h1>
                <p className="text-[#667eea]">Age 26</p>
              </div>
            </div>

            {/* Description */}
            <div className="bg-[rgba(38,38,38,0.6)] rounded-xl p-4 border border-[rgba(55,65,81,0.3)]">
              <div className="flex items-center gap-2 mb-3">
                <User size={18} className="text-white" />
                <h3 className="text-white font-semibold">Description</h3>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                {mainCharacter.description || "Sarah is a talented UX/UI designer with a passion for creating beautiful and functional digital experiences. She has a warm personality and loves working with innovative teams. Her creative mind is always buzzing with new ideas, and she approaches every project with enthusiasm and dedication."}
              </p>
            </div>

            {/* Appearance */}
            <div className="bg-[rgba(38,38,38,0.6)] rounded-xl p-4 border border-[rgba(55,65,81,0.3)]">
              <div className="flex items-center gap-2 mb-3">
                <User size={18} className="text-white" />
                <h3 className="text-white font-semibold">Appearance</h3>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed mb-3">
                {mainCharacter.appearance || "Sarah has long, silky black hair that cascades down to her shoulders. Her expressive brown eyes sparkle with intelligence and warmth. She has a petite frame and carries herself with confidence and grace."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-[rgba(102,126,234,0.2)] text-[#667eea] border-none">Petite</Badge>
                <Badge variant="secondary" className="bg-[rgba(236,72,153,0.2)] text-[#ff1372] border-none">Brown Eyes</Badge>
                <Badge variant="secondary" className="bg-[rgba(79,172,254,0.2)] text-[#4facfe] border-none">Black Hair</Badge>
                <Badge variant="secondary" className="bg-[rgba(67,233,123,0.2)] text-[#43e97b] border-none">Elegant</Badge>
              </div>
            </div>

            {/* Personality */}
            <div className="bg-[rgba(38,38,38,0.6)] rounded-xl p-4 border border-[rgba(55,65,81,0.3)]">
              <div className="flex items-center gap-2 mb-3">
                <Heart size={18} className="text-white" />
                <h3 className="text-white font-semibold">Personality</h3>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed mb-3">
                {mainCharacter.personality || "Sarah is naturally curious and loves learning new things. She's empathetic and always tries to understand others' perspectives. Her creative nature makes her approach problems from unique angles, and she has a gentle but determined personality."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-[rgba(102,126,234,0.2)] text-[#667eea] border-none">Creative</Badge>
                <Badge variant="secondary" className="bg-[rgba(236,72,153,0.2)] text-[#ff1372] border-none">Empathetic</Badge>
                <Badge variant="secondary" className="bg-[rgba(79,172,254,0.2)] text-[#4facfe] border-none">Curious</Badge>
                <Badge variant="secondary" className="bg-[rgba(67,233,123,0.2)] text-[#43e97b] border-none">Determined</Badge>
                <Badge variant="secondary" className="bg-[rgba(250,112,154,0.2)] text-[#fa709a] border-none">Gentle</Badge>
              </div>
            </div>

            {/* Character Stats */}
            <div className="bg-[rgba(38,38,38,0.6)] rounded-xl p-4 border border-[rgba(55,65,81,0.3)]">
              <h3 className="text-white font-semibold mb-4">Character Stats</h3>
              <div className="space-y-3">
                {Object.entries(stats).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-gray-300 text-xs capitalize">{key}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 bg-[rgba(55,65,81,0.5)] rounded-full">
                        <div 
                          className={`h-1.5 rounded-full ${
                            key === 'confidence' ? 'bg-[#667eea]' :
                            key === 'intelligence' ? 'bg-[#4facfe]' :
                            key === 'creativity' ? 'bg-[#ff1372]' :
                            key === 'humor' ? 'bg-[#43e97b]' :
                            key === 'kindness' ? 'bg-[#fa709a]' :
                            'bg-red-400'
                          }`}
                          style={{ width: `${(value / 100) * 100}%` }}
                        ></div>
                      </div>
                      <span className={`text-xs font-semibold ${
                        key === 'confidence' ? 'text-[#667eea]' :
                        key === 'intelligence' ? 'text-[#4facfe]' :
                        key === 'creativity' ? 'text-[#ff1372]' :
                        key === 'humor' ? 'text-[#43e97b]' :
                        key === 'kindness' ? 'text-[#fa709a]' :
                        'text-red-400'
                      }`}>{value}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* History */}
            <div className="bg-[rgba(38,38,38,0.6)] rounded-xl p-4 border border-[rgba(55,65,81,0.3)]">
              <h3 className="text-white font-semibold mb-4">History</h3>
              
              {/* Story Summary */}
              <div className="bg-[rgba(15,15,15,0.7)] rounded-lg p-3 mb-4">
                <h4 className="text-[#667eea] text-sm font-medium mb-2">Story Summary</h4>
                <p className="text-gray-300 text-xs leading-relaxed">
                  Sarah joined the creative community 6 months ago. She's been working on building her portfolio and 
                  has shown remarkable growth in her design skills. Recently, she's been more open about sharing her 
                  personal thoughts and experiences.
                </p>
              </div>

              {/* Timeline */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-[#43e97b] rounded-full flex items-center justify-center">
                    <CheckCircle size={12} className="text-white" />
                  </div>
                  <div>
                    <p className="text-gray-300 text-xs">Shared her first personal design project</p>
                    <p className="text-gray-500 text-xs">3 days ago</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-[#667eea] rounded-full flex items-center justify-center">
                    <MessageCircle size={12} className="text-white" />
                  </div>
                  <div>
                    <p className="text-gray-300 text-xs">Had a deep conversation about creative inspiration</p>
                    <p className="text-gray-500 text-xs">1 week ago</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-[#ff1372] rounded-full flex items-center justify-center">
                    <Heart size={12} className="text-white" />
                  </div>
                  <div>
                    <p className="text-gray-300 text-xs">Reached a milestone in trust level</p>
                    <p className="text-gray-500 text-xs">2 weeks ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
        )}
        {(activeTab === 'chat' || isGroup) && (
          <div className="flex flex-col h-full">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map(m => {
                  const isUser = !m.characterId; // user message if no characterId
                  return (
                    <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${isUser ? 'bg-[#ff1372] text-white' : 'bg-neutral-800 text-gray-200 border border-neutral-700'}`}>
                        {m.content}
                      </div>
                    </div>
                  );
                })}
                <div id={scrollAnchorId} />
              </div>
            </ScrollArea>
            <form onSubmit={handleSend} className="p-3 border-t border-neutral-800 flex gap-2 bg-[#111]">
              <Input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Message..." className="bg-neutral-800 border-neutral-700 text-sm" />
              <Button type="submit" disabled={!chatInput.trim()} variant="secondary" className="bg-[#ff1372] hover:bg-[#ff1372]/80 text-white border-none">Send</Button>
            </form>
          </div>
        )}
      </div>

      {!isGroup && (
        <div className="relative w-full flex justify-center mb-4">
          <div className="w-full max-w-[420px] px-4">
            <div className="bg-[rgba(15,15,15,0.85)] rounded-xl border border-[rgba(255,255,255,0.03)] px-2 py-2">
  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
          <TabsList className="grid grid-cols-5 bg-transparent h-14 gap-3">
            <TabsTrigger 
              value="profile" 
              className={`flex flex-col items-center gap-1 h-14 rounded-lg px-2 ${
                activeTab === 'profile' 
                  ? 'bg-[rgba(255,19,145,0.18)] text-[#ff1372]' 
                  : 'text-gray-400'
              }`}
            >
              <User size={18} />
              <span className="text-xs">Profile</span>
            </TabsTrigger>
            <TabsTrigger 
              value="chat" 
              className="flex flex-col items-center gap-1 h-14 rounded-lg px-2 text-gray-400"
            >
              <MessageCircle size={18} />
              <span className="text-xs">Chat</span>
            </TabsTrigger>
            <TabsTrigger 
              value="feed" 
              className="flex flex-col items-center gap-1 h-14 rounded-lg px-2 text-gray-400"
            >
              <Heart size={18} />
              <span className="text-xs">Feed</span>
            </TabsTrigger>
            <TabsTrigger 
              value="stats" 
              className="flex flex-col items-center gap-1 h-14 rounded-lg px-2 text-gray-400"
            >
              <ChartBar size={18} />
              <span className="text-xs">Stats</span>
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="flex flex-col items-center gap-1 h-14 rounded-lg px-2 text-gray-400"
            >
              <Gear size={18} />
              <span className="text-xs">Settings</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
            </div>
          </div>
        </div>) }
      {/* Editor dialog for editing character */}
      <CharacterCreatorRepo open={editOpen} onOpenChange={setEditOpen} character={mainCharacter} />
      <GroupChatCreator open={groupModalOpen} onClose={() => setGroupModalOpen(false)} />
    </div>
  );
}
