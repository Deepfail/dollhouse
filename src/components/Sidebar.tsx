import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useIsMobile } from '@/hooks/use-mobile';
import { useChat } from '@/hooks/useChat';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { Character } from '@/types';
import {
    House as Home,
    Image,
    ChatCircle as MessageCircle,
    Play,
    Plus,
    Gear as Settings,
    Sparkle,
    Trash,
    Users,
    X
} from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { AISettings } from './AISettings';
import { AutoCharacterCreator } from './AutoCharacterCreator';
import { CharacterCard } from './CharacterCard';
import { CharacterCreatorRepo } from './CharacterCreatorRepo';
import { DataManager } from './DataManager';
import { GiftManager } from './GiftManager';
import { GroupChatCreator } from './GroupChatCreator';
import { HouseSettings } from './HouseSettings';
import { ImageGallery } from './ImageGallery';
import { PersistenceDebugger } from './PersistenceDebugger';
import { SceneCreator } from './SceneCreator';

interface SidebarProps {
  onStartChat?: (characterId: string) => void;
  onStartGroupChat?: (sessionId?: string) => void;
  onStartScene?: (sessionId: string) => void;
}

export function Sidebar({ onStartChat, onStartGroupChat, onStartScene }: SidebarProps) {
  const { house, characters, isLoading, addCharacter, updateCharacter, removeCharacter, addRoom, updateHouse } = useHouseFileStorage();
  const { createSession, sessions, closeSession, deleteSession, switchToSession } = useChat();
  const isMobile = useIsMobile();

  // House and rooms are now managed by useHouseFileStorage; remove defaultHouse
  const [showCreator, setShowCreator] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [selectedTab, setSelectedTab] = useState('characters');
  const [selectedCharacterForGift, setSelectedCharacterForGift] = useState<string | null>(null);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [showRoomCreator, setShowRoomCreator] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomType, setNewRoomType] = useState<'shared' | 'private' | 'facility'>('shared');
  const [newRoomCapacity, setNewRoomCapacity] = useState<number>(4);
  const [newRoomDescription, setNewRoomDescription] = useState<string>('');
  const [editingRoom, setEditingRoom] = useState<any | null>(null);
  const [editRoomDraft, setEditRoomDraft] = useState<any | null>(null);
  // Hidden goals UI state for group chat
  const [showGroupCreator, setShowGroupCreator] = useState(false);

  // UI-level dedupe as a final guard
  const visibleCharacters = useMemo(() => {
    const byId = new Set<string>();
    const byName = new Set<string>();
    const out: any[] = [];
    for (const c of characters || []) {
      const idKey = c.id;
      const nameKey = (c.name || '').trim().toLowerCase();
      if (byId.has(idKey) || (nameKey && byName.has(nameKey))) continue;
      byId.add(idKey);
      if (nameKey) byName.add(nameKey);
      out.push(c);
    }
    return out;
  }, [characters]);

  const startIndividualChat = (characterId: string) => {
    if (onStartChat) {
      onStartChat(characterId);
    } else {
      const sessionId = createSession('individual', [characterId]);
      // Navigate to chat view would happen here
    }
  };

  const handleSceneCreated = (sessionId: string) => {
    if (onStartScene) {
      onStartScene(sessionId);
    }
  };

  const startGroupChat = () => {
    if (onStartGroupChat) {
      onStartGroupChat();
    } else {
      const characterIds = (house.characters || []).map((c: any) => c.id);
      if (characterIds.length > 1) {
        setShowGroupCreator(true);
      } else {
        toast.error('Need at least 2 characters for group chat');
      }
    }
  };

  return (
    <div className={`h-full flex flex-col bg-[#18181b] text-white rounded-2xl shadow-xl overflow-hidden ${isMobile ? 'min-h-0' : ''}`}>
      {/* Header */}
  <div className={`${isMobile ? 'p-3' : 'p-6'} border-b border-zinc-800 bg-[#101014] rounded-t-2xl`}> 
        <div className={`flex items-center gap-3 ${isMobile ? 'mb-2' : 'mb-4'}`}>
          <Home size={isMobile ? 20 : 24} className="text-accent" />
          <div>
            <h1 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-white`}>{house?.name || 'Loading...'}</h1>
            <p className="text-sm text-zinc-400">
              {characters?.length || 0} characters
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="secondary" className="text-accent font-medium bg-zinc-900 border-zinc-700">
            ${house?.currency || 0}
          </Badge>
          <span className="text-zinc-400">House Funds</span>
          <AISettings>
            <Button variant="ghost" size="sm" className="ml-auto h-8 w-8 p-0 text-accent">
              <Sparkle size={16} />
            </Button>
          </AISettings>
        </div>
      </div>

      {/* Navigation Tabs */}
  <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1 flex flex-col min-h-0 text-white">
  <div className={`${isMobile ? 'm-2 mb-1' : 'm-4 mb-2'} space-y-1`}> 
          {/* First Row */}
          <TabsList className={`w-full h-auto p-1 grid grid-cols-3 gap-1 ${isMobile ? 'text-xs' : ''} bg-zinc-900 rounded-lg`}> 
            <TabsTrigger 
              value="characters" 
              className={`flex-1 ${isMobile ? 'text-xs px-1 py-1' : 'text-xs px-2 py-2'} justify-start data-[state=active]:bg-accent data-[state=active]:text-white`}
            >
              <Users size={14} className="mr-1" />
              {!isMobile && 'Characters'}
            </TabsTrigger>
            <TabsTrigger 
              value="rooms" 
              className={`flex-1 ${isMobile ? 'text-xs px-1 py-1' : 'text-xs px-2 py-2'} justify-start data-[state=active]:bg-accent data-[state=active]:text-white`}
            >
              <Home size={14} className="mr-1" />
              {!isMobile && 'Rooms'}
            </TabsTrigger>
            <TabsTrigger 
              value="chats" 
              className={`flex-1 ${isMobile ? 'text-xs px-1 py-1' : 'text-xs px-2 py-2'} justify-start data-[state=active]:bg-accent data-[state=active]:text-white`}
            >
              <MessageCircle size={14} className="mr-1" />
              {!isMobile && 'Chats'}
            </TabsTrigger>
          </TabsList>
          
          {/* Second Row */}
          {!isMobile && (
            <TabsList className="w-full h-auto p-1 grid grid-cols-2 gap-1 bg-zinc-900 rounded-lg">
              <TabsTrigger 
                value="auto" 
                className="flex-1 text-xs justify-start px-2 py-2 data-[state=active]:bg-accent data-[state=active]:text-white"
              >
                <Sparkle size={14} className="mr-1" />
                Auto Create
              </TabsTrigger>
              <TabsTrigger 
                value="scenes" 
                className="flex-1 text-xs justify-start px-2 py-2 data-[state=active]:bg-accent data-[state=active]:text-white"
              >
                <Play size={14} className="mr-1" />
                Scenes
              </TabsTrigger>
            </TabsList>
          )}
        </div>

        {/* Characters Tab */}
        <TabsContent value="characters" className="flex-1 px-4 pb-4 space-y-3 min-h-0 overflow-hidden">
          <ScrollArea className="h-full bg-transparent">
            <div className="space-y-3 pr-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Characters</h3>
                <Button
                  size="sm"
                  onClick={() => setShowCreator(true)}
                  className="h-8"
                >
                  <Plus size={16} />
                </Button>
              </div>

              <div className="space-y-2">
                {(visibleCharacters?.length || 0) === 0 ? (
                  <Card className="p-4 text-center bg-zinc-900 text-zinc-400 border-zinc-800">
                    <p className="text-sm">No characters yet</p>
                    <p className="text-xs">Create your first companion!</p>
                  </Card>
                ) : (
                  (visibleCharacters || []).map((character: any) => (
                    <CharacterCard
                      key={`sidebar-${character.id}`}
                      character={character}
                      onStartChat={startIndividualChat}
                      onEdit={setEditingCharacter}
                      onGift={(characterId) => setSelectedCharacterForGift(characterId)}
                      compact={true}
                      source="sidebar"
                    />
                  ))
                )}
              </div>

              {(house?.characters?.length || 0) > 1 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={startGroupChat}
                >
                  <Users size={16} className="mr-2" />
                  Group Chat
                </Button>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Rooms Tab */}
        <TabsContent value="rooms" className="flex-1 px-4 pb-4 space-y-3 min-h-0 overflow-hidden">
          <ScrollArea className="h-full bg-transparent">
            <div className="space-y-3 pr-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Rooms</h3>
                <Button size="sm" className="h-8" onClick={() => setShowRoomCreator(true)}>
                  <Plus size={16} />
                </Button>
              </div>

              <div className="space-y-2">
                {(house.rooms || []).map((room: any) => (
                  <Card key={room.id} className="p-3 bg-zinc-900 hover:bg-accent/50 transition-colors cursor-pointer border-zinc-800" onClick={() => { setEditingRoom(room); setEditRoomDraft({ ...room }); }}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{room.name}</h4>
                      <Badge variant={room.type === 'private' ? 'default' : 'secondary'}>
                        {room.type}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-2">
                      {room.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {room.residents.length}/{room.capacity} residents
                      </span>
                      <Progress value={(room.residents.length / room.capacity) * 100} className="h-1 w-16" />
                    </div>

                    {/* Show characters in room */}
                    {room.residents.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {room.residents.slice(0, 3).map((residentId: any) => {
                          const character = house?.characters?.find((c: any) => c.id === residentId);
                          return character ? (
                            <Badge key={character.id} variant="outline" className="text-xs bg-zinc-800 text-white border-zinc-700">
                              {character.name}
                            </Badge>
                          ) : null;
                        })}
                        {room.residents.length > 3 && (
                          <Badge variant="outline" className="text-xs bg-zinc-800 text-white border-zinc-700">
                            +{room.residents.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Chats Tab */}
        <TabsContent value="chats" className="flex-1 px-4 pb-4 space-y-3 min-h-0 overflow-hidden">
          <ScrollArea className="h-full bg-transparent">
            <div className="space-y-3 pr-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Chats</h3>
                {sessions.filter(s => s.active).length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm('Are you sure you want to close all active chats? This will end all ongoing conversations.')) {
                        sessions.filter(s => s.active).forEach(session => {
                          closeSession(session.id);
                        });
                        toast.success('All chats closed');
                      }
                    }}
                    className="text-xs"
                  >
                    Close All
                  </Button>
                )}
              </div>

              {/* Active Chats */}
              {sessions.filter(s => s.active).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Active Chats</h4>
                  {sessions.filter(s => s.active).map(session => (
                    <Card key={session.id} className="p-3 bg-zinc-900 hover:bg-accent/50 border-zinc-800">
                      <div className="flex items-start justify-between">
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => {
                            // Re-open session in DB/state
                            switchToSession(session.id);
                            // Always navigate via onStartGroupChat(session.id) to avoid creating new sessions
                            if (onStartGroupChat) onStartGroupChat(session.id);
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h4 className="font-medium text-sm">
                                {session.type === 'group' ? 'Group Chat' : 'Individual Chat'}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {session.participantIds.length} participant(s) • {session.messageCount ?? session.messages.length} messages
                              </p>
                            </div>
                            <Badge variant="outline" className="bg-zinc-800 text-white border-zinc-700">
                              {session.messageCount ?? session.messages.length}
                            </Badge>
                          </div>
                          
                          {/* Show participant names */}
                          <div className="flex flex-wrap gap-1">
                            {session.participantIds.slice(0, 3).map(id => {
                              const character = (characters || []).find((c: any) => c.id === id);
                              return character ? (
                                <Badge key={id} variant="secondary" className="text-xs bg-zinc-800 text-white border-zinc-700">
                                  {character.name}
                                </Badge>
                              ) : null;
                            })}
                            {session.participantIds.length > 3 && (
                              <Badge variant="secondary" className="text-xs bg-zinc-800 text-white border-zinc-700">
                                +{session.participantIds.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              switchToSession(session.id);
                              if (onStartGroupChat) onStartGroupChat(session.id);
                            }}
                            className="h-8 w-8 p-0"
                            title="Continue Chat"
                          >
                            <MessageCircle size={14} />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              if (confirm('End this chat session? You can start a new chat later.')) {
                                closeSession(session.id);
                                toast.success('Chat ended');
                              }
                            }}
                            className="h-8 w-8 p-0 text-orange-500 hover:text-orange-700"
                            title="End Chat"
                          >
                            <X size={14} />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              if (confirm('Permanently delete this chat session? This cannot be undone.')) {
                                deleteSession(session.id);
                                toast.success('Chat deleted');
                              }
                            }}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                            title="Delete Chat"
                          >
                            <Trash size={14} />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Inactive Chats */}
              {sessions.filter(s => !s.active).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Chat History</h4>
                  {sessions.filter(s => !s.active).map(session => (
                    <Card key={session.id} className="p-3 bg-zinc-900 hover:bg-accent/30 opacity-75 border-zinc-800">
                      <div className="flex items-start justify-between">
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => {
                            switchToSession(session.id);
                            if (onStartGroupChat) onStartGroupChat(session.id);
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h4 className="font-medium text-sm text-muted-foreground">
                                {session.type === 'group' ? 'Group Chat' : 'Individual Chat'} (Ended)
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {session.participantIds.length} participant(s) • {session.messageCount ?? session.messages.length} messages
                              </p>
                            </div>
                            <Badge variant="secondary">
                              {session.messageCount ?? session.messages.length}
                            </Badge>
                          </div>
                          
                          {/* Show participant names */}
                          <div className="flex flex-wrap gap-1">
                            {session.participantIds.slice(0, 3).map(id => {
                              const character = (characters || []).find((c: any) => c.id === id);
                              return character ? (
                                <Badge key={id} variant="outline" className="text-xs bg-zinc-800 text-white border-zinc-700">
                                  {character.name}
                                </Badge>
                              ) : null;
                            })}
                            {session.participantIds.length > 3 && (
                              <Badge variant="outline" className="text-xs bg-zinc-800 text-white border-zinc-700">
                                +{session.participantIds.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* Action buttons for inactive chats */}
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              switchToSession(session.id);
                              if (onStartGroupChat) onStartGroupChat(session.id);
                            }}
                            className="h-8 w-8 p-0"
                            title="Start New Chat"
                          >
                            <MessageCircle size={14} />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              if (confirm('Permanently delete this chat session? This cannot be undone.')) {
                                deleteSession(session.id);
                                toast.success('Chat deleted');
                              }
                            }}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                            title="Delete Chat"
                          >
                            <Trash size={14} />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {sessions.length === 0 && (
                <Card className="p-4 text-center bg-zinc-900 text-zinc-400 border-zinc-800">
                  <p className="text-sm">No chats yet</p>
                  <p className="text-xs">Start a conversation!</p>
                </Card>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Auto Creator Tab */}
        <TabsContent value="auto" className="flex-1 min-h-0 px-4 pb-4 overflow-hidden">
          <ScrollArea className="h-full bg-transparent">
            <div className="pr-3">
              <AutoCharacterCreator />
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Scene Creator Tab */}
        <TabsContent value="scenes" className="flex-1 min-h-0 px-4 pb-4 overflow-hidden">
          <ScrollArea className="h-full bg-transparent">
            <div className="pr-3">
              <SceneCreator onSceneCreated={handleSceneCreated} />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Settings Footer */}
  <div className="p-4 border-t border-zinc-800 bg-[#101014] rounded-b-2xl space-y-2">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start text-white"
          onClick={() => setShowSettings(true)}
        >
          <Settings size={16} className="mr-2 text-accent" />
          House Settings
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start text-white"
          onClick={() => setShowImageGallery(true)}
        >
          <Image size={16} className="mr-2 text-accent" />
          Image Gallery
        </Button>
        <div className="flex gap-2">
          <DataManager />
          <PersistenceDebugger />
        </div>
      </div>

      {/* Character Creator Modal */}
      {showCreator && (
        <CharacterCreatorRepo
          open={showCreator}
          onOpenChange={setShowCreator}
        />
      )}

      {/* Room Creator Modal */}
      {showRoomCreator && (
        <Dialog open={showRoomCreator} onOpenChange={setShowRoomCreator}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Room</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm">Room name</label>
                <Input
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="e.g. Guest Room"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={newRoomType === 'shared' ? 'default' : 'outline'}
                  onClick={() => setNewRoomType('shared')}
                  className="w-full"
                  size="sm"
                >
                  Shared
                </Button>
                <Button
                  variant={newRoomType === 'private' ? 'default' : 'outline'}
                  onClick={() => setNewRoomType('private')}
                  className="w-full"
                  size="sm"
                >
                  Private
                </Button>
                <Button
                  variant={newRoomType === 'facility' ? 'default' : 'outline'}
                  onClick={() => setNewRoomType('facility')}
                  className="w-full"
                  size="sm"
                >
                  Facility
                </Button>
              </div>
              <div>
                <label className="text-sm">LLM Room Description/Prompt</label>
                <Textarea
                  value={newRoomDescription}
                  onChange={(e) => setNewRoomDescription(e.target.value)}
                  placeholder="Describe the room purpose, vibe, and how it should be used by the LLM..."
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm">Capacity</label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={newRoomCapacity}
                  onChange={(e) => setNewRoomCapacity(e.target.value ? Math.max(1, Math.min(20, parseInt(e.target.value, 10))) : 1)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowRoomCreator(false)}>Cancel</Button>
                <Button
                  onClick={async () => {
                    const name = newRoomName.trim();
                    if (!name) return;
                    const id = `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
                    const success = await addRoom({
                      id,
                      name,
                      description: newRoomDescription.trim(),
                      type: newRoomType,
                      capacity: newRoomCapacity,
                      residents: [],
                      facilities: [],
                      unlocked: true,
                      decorations: [],
                      createdAt: new Date(),
                    } as any);
                    if (success) {
                      setNewRoomName('');
                      setNewRoomCapacity(4);
                      setNewRoomType('shared');
                      setNewRoomDescription('');
                      setShowRoomCreator(false);
                    }
                  }}
                  disabled={!newRoomName.trim()}
                >
                  Add Room
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Room Editor Modal */}
      {editingRoom && editRoomDraft && (
        <Dialog open={!!editingRoom} onOpenChange={(open) => { if (!open) { setEditingRoom(null); setEditRoomDraft(null); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Room</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm">Room name</label>
                <Input
                  value={editRoomDraft.name}
                  onChange={(e) => setEditRoomDraft({ ...editRoomDraft, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={editRoomDraft.type === 'shared' ? 'default' : 'outline'}
                  onClick={() => setEditRoomDraft({ ...editRoomDraft, type: 'shared' })}
                  className="w-full"
                  size="sm"
                >
                  Shared
                </Button>
                <Button
                  variant={editRoomDraft.type === 'private' ? 'default' : 'outline'}
                  onClick={() => setEditRoomDraft({ ...editRoomDraft, type: 'private' })}
                  className="w-full"
                  size="sm"
                >
                  Private
                </Button>
                <Button
                  variant={editRoomDraft.type === 'facility' ? 'default' : 'outline'}
                  onClick={() => setEditRoomDraft({ ...editRoomDraft, type: 'facility' })}
                  className="w-full"
                  size="sm"
                >
                  Facility
                </Button>
              </div>
              <div>
                <label className="text-sm">Capacity</label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={editRoomDraft.capacity}
                  onChange={(e) => setEditRoomDraft({ ...editRoomDraft, capacity: e.target.value ? Math.max(1, Math.min(20, parseInt(e.target.value, 10))) : 1 })}
                />
              </div>
              <div>
                <label className="text-sm">LLM Room Description/Prompt</label>
                <Textarea
                  value={editRoomDraft.description || ''}
                  onChange={(e) => setEditRoomDraft({ ...editRoomDraft, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setEditingRoom(null); setEditRoomDraft(null); }}>Cancel</Button>
                <Button
                  onClick={async () => {
                    const newRooms = (house.rooms || []).map((r: any) => r.id === editingRoom.id ? { ...r, ...editRoomDraft } : r);
                    await updateHouse({ rooms: newRooms } as any);
                    setEditingRoom(null);
                    setEditRoomDraft(null);
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Character Editor Modal */}
      {editingCharacter && (
        <CharacterCreatorRepo
          open={!!editingCharacter}
          onOpenChange={() => setEditingCharacter(null)}
          character={editingCharacter}
        />
      )}

      {/* Hidden Goals Setup for Group Chat */}
      {showGroupCreator && (
        <GroupChatCreator 
          open={showGroupCreator} 
          onOpenChange={setShowGroupCreator}
          onStarted={(sessionId) => {
            if (onStartGroupChat) {
              onStartGroupChat(sessionId);
            }
          }}
        />
      )}

      {/* House Settings Modal */}
      {showSettings && (
        <HouseSettings
          open={showSettings}
          onOpenChange={setShowSettings}
        />
      )}

      {/* Image Gallery Modal */}
      {showImageGallery && (
        <ImageGallery
          open={showImageGallery}
          onOpenChange={setShowImageGallery}
        />
      )}

      {/* Gift Manager Modal */}
      {selectedCharacterForGift && characters && (
        <GiftManager
          character={(characters.find((c: any) => c.id === selectedCharacterForGift))!}
          isOpen={!!selectedCharacterForGift}
          onClose={() => setSelectedCharacterForGift(null)}
        />
      )}
    </div>
  );
}