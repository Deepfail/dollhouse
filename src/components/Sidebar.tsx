import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useChat } from '@/hooks/useChat';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import {
    House as Home,
    ChatCircle as MessageCircle,
    Users,
    Plus,
    Clock
} from '@phosphor-icons/react';
import { useMemo, useState } from 'react';

interface CharacterLike {
  id: string;
  name?: string;
  avatar?: string;
  role?: string;
  stats?: Record<string, unknown>;
}

interface SidebarProps {
  onStartChat?: (characterId: string) => void;
  onSelectCharacter?: (characterId: string) => void;
  onStartGroupChat?: (sessionId?: string) => void;
  onStartScene?: (sessionId: string) => void;
  onSwitchToSession?: (sessionId: string) => void;
}

export function Sidebar({ onStartChat, onSelectCharacter, onStartGroupChat, onSwitchToSession }: SidebarProps) {
  const { house, characters } = useHouseFileStorage();
  const { sessions, getSessionMessages } = useChat();
  const [activeTab, setActiveTab] = useState<'characters' | 'chats'>('characters');

  // UI-level dedupe as a final guard
  const visibleCharacters: CharacterLike[] = useMemo(() => {
    const byId = new Set<string>();
    const out: CharacterLike[] = [];
    for (const c of characters || []) {
      if (!c?.id || byId.has(c.id)) continue;
      byId.add(c.id);
      out.push({ id: c.id, name: c.name, avatar: c.avatar, role: (c as unknown as CharacterLike).role, stats: (c as unknown as CharacterLike).stats });
    }
    return out;
  }, [characters]);

  const selectCharacter = (characterId: string) => {
    // Always start a chat when clicking on a character
    if (onStartChat) {
      onStartChat(characterId);
    } else if (onSelectCharacter) {
      // fallback: maintain old behavior if chat handler not provided
      onSelectCharacter(characterId);
    }
  };

  const switchToSession = (sessionId: string) => {
    if (onSwitchToSession) {
      onSwitchToSession(sessionId);
    }
  };

  const startGroupChat = () => {
    if (onStartGroupChat) {
      onStartGroupChat();
    }
  };

  // Get existing sessions with characters for the chat list
  const characterSessions = useMemo(() => {
    return sessions
      .filter(s => s.type === 'individual' && s.participantIds && s.participantIds.length > 0)
      .map(session => {
        const characterId = session.participantIds[0];
        const character = characters?.find(c => c.id === characterId);
        return {
          session,
          character
        };
      })
      .filter(item => item.character); // Only show sessions where we found the character
  }, [sessions, characters]);

  // Format time ago
  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };
  return (
    <div className="h-full flex flex-col bg-[#1a1a1a] text-white">
      {/* Header Section */}
      <div className="p-6 border-b border-gray-700 bg-[#101014]">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <Home size={24} className="text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-[#1a1a1a] flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">{house?.name || 'The Dollhouse'}</h1>
            <p className="text-sm text-gray-400">porn-aid.com</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-green-500">Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="p-4 border-b border-gray-700 bg-[#1a1a1a]">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xl font-bold text-[#667eea]">247</div>
            <div className="text-xs text-gray-400">Viewers</div>
          </div>
          <div>
            <div className="text-xl font-bold text-[#ff1372]">1.2M</div>
            <div className="text-xs text-gray-400">Followers</div>
          </div>
          <div>
            <div className="text-xl font-bold text-[#4facfe]">{visibleCharacters.length}</div>
            <div className="text-xs text-gray-400">Characters</div>
          </div>
        </div>
      </div>

      {/* Search and Tabs */}
      <div className="p-4">
        {/* Tab Buttons */}
        <div className="flex gap-1 mb-4 bg-neutral-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('characters')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'characters'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Characters
          </button>
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'chats'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Chats ({characterSessions.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            <MessageCircle size={16} className="text-gray-400" />
          </div>
          <Input
            placeholder={activeTab === 'characters' ? 'Search characters...' : 'Search chats...'}
            className="pl-10 bg-neutral-800 border-gray-600 text-gray-300 placeholder-gray-500"
          />
        </div>
      </div>

      {/* Character/Chat List */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full px-4">
          <div className="space-y-2">
            {activeTab === 'characters' ? (
              // Characters Tab
              visibleCharacters.map((character, index) => {
                const isOnline = Math.random() > 0.5; // Mock online status
                const lastSeen = formatTimeAgo(new Date(Date.now() - Math.random() * 86400000));
                
                return (
                  <div
                    key={character.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 cursor-pointer transition-colors group"
                    onClick={() => selectCharacter(character.id)}
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-600">
                        {character.avatar ? (
                          <img src={character.avatar} alt={character.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                            {character.name?.slice(0, 2) || '??'}
                          </div>
                        )}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[#1a1a1a] ${
                        isOnline ? 'bg-green-500' : index % 3 === 0 ? 'bg-red-500' : index % 3 === 1 ? 'bg-pink-500' : 'bg-gray-500'
                      }`}></div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white text-sm truncate">{character.name}</div>
                      <div className="text-xs text-gray-400 truncate">@{character.name?.toLowerCase().replace(/\s+/g, '') || 'unknown'}</div>
                    </div>
                    
                    <div className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-16 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectCharacter(character.id);
                        }}
                      >
                        Chat
                      </Button>
                      {isOnline && (
                        <div className="w-3 h-3 bg-green-500 rounded-full opacity-60 mb-1 group-hover:hidden"></div>
                      )}
                      <div className="text-xs text-gray-400 group-hover:hidden">{lastSeen}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              // Chats Tab
              characterSessions.length > 0 ? (
                characterSessions.map(({ session, character }) => {
                  if (!character) return null;
                  
                  const lastUpdated = formatTimeAgo(new Date(session.updatedAt));
                  
                  return (
                    <div
                      key={session.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 cursor-pointer transition-colors"
                      onClick={() => switchToSession(session.id)}
                    >
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-600">
                          {character.avatar ? (
                            <img src={character.avatar} alt={character.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                              {character.name?.slice(0, 2) || '??'}
                            </div>
                          )}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[#1a1a1a] bg-blue-500"></div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white text-sm truncate">{character.name}</div>
                        <div className="text-xs text-gray-400 truncate">
                          <Clock size={12} className="inline mr-1" />
                          Active chat
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <Badge variant="secondary" className="text-xs mb-1">
                          {session.type}
                        </Badge>
                        <div className="text-xs text-gray-400">{lastUpdated}</div>
                      </div>
                    </div>
                  );
                })
              ) : (
                // No chats yet
                <div className="text-center py-8 text-gray-400">
                  <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No active chats</p>
                  <p className="text-xs">Click on a character to start chatting!</p>
                </div>
              )
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-gray-700 bg-[#101014]">
        <div className="flex gap-2">
          <Button
            onClick={startGroupChat}
            className="flex-1 bg-[rgba(123,254,0,0.57)] hover:bg-[rgba(123,254,0,0.7)] text-white font-bold rounded-xl h-12 shadow-lg"
          >
            <MessageCircle size={16} className="mr-2" />
            CHAT
          </Button>
          <Button
            className="flex-1 bg-[rgba(255,19,114,0.65)] hover:bg-[rgba(255,19,114,0.8)] text-white font-bold rounded-xl h-12 shadow-lg"
          >
            <Users size={16} className="mr-2" />
            GIRL
          </Button>
        </div>
      </div>
    </div>
  );
}
