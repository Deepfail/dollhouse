import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCharacters } from '@/hooks/useCharacters';
import { useChat } from '@/hooks/useChat';
import { Character } from '@/types';
import {
    House as Home,
    Image as Image,
    ChatCircle as MessageCircle,
    Play,
    Plus,
    Gear as Settings,
    Sparkle,
    Trash,
    Users,
    X
} from '@phosphor-icons/react';
import { useState } from 'react';
import { toast } from 'sonner';

import { AutoCharacterCreator } from './AutoCharacterCreator';
import { CharacterCard } from './CharacterCard';
import { CharacterCreatorRepo } from './CharacterCreatorRepo';
import { DataManager } from './DataManager';
import { GiftManager } from './GiftManager';
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
  const { characters, isLoading } = useCharacters();
  const { createSession, sessions, closeSession, deleteSession, switchToSession } = useChat();

  // Default house structure with rooms for preserved functionality
  const defaultHouse = {
    name: 'Digital Dollhouse',
    currency: 0, // Could be moved to its own state/store later
    characters: characters || [],
    rooms: [
      {
        id: 'common-room',
        name: 'Common Room',
        description: 'A shared space for everyone to gather',
        type: 'shared',
        capacity: 10,
        residents: characters?.slice(0, 3).map(c => c.id) || [],
        facilities: ['chat', 'games'],
        unlocked: true
      },
      {
        id: 'study-room',
        name: 'Study Room',
        description: 'A quiet place for focused conversations',
        type: 'private',
        capacity: 2,
        residents: characters?.slice(3, 5).map(c => c.id) || [],
        facilities: ['study', 'books'],
        unlocked: true
      },
      {
        id: 'garden',
        name: 'Garden',
        description: 'A peaceful outdoor space',
        type: 'outdoor',
        capacity: 6,
        residents: [],
        facilities: ['nature', 'relaxation'],
        unlocked: characters ? characters.length >= 2 : false
      },
      {
        id: 'workshop',
        name: 'Workshop',
        description: 'A creative space for making things',
        type: 'creative',
        capacity: 4,
        residents: [],
        facilities: ['crafting', 'tools'],
        unlocked: characters ? characters.length >= 5 : false
      }
    ]
  };
  const [showCreator, setShowCreator] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [selectedTab, setSelectedTab] = useState('characters');
  const [selectedCharacterForGift, setSelectedCharacterForGift] = useState<string | null>(null);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);

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
      // Fallback: use the old method
      const characterIds = (defaultHouse.characters || []).map(c => c.id);
      if (characterIds.length > 1) {
        createSession('group', characterIds);
        toast.success('Group chat started');
      } else {
        toast.error('Need at least 2 characters for group chat');
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          <Home size={24} className="text-primary" />
          <div>
            <h1 className="text-xl font-bold">{defaultHouse?.name || 'Loading...'}</h1>
            <p className="text-sm text-muted-foreground">
              {defaultHouse?.characters?.length || 0} characters
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="secondary" className="text-primary font-medium">
            ${defaultHouse?.currency || 0}
          </Badge>
          <span className="text-muted-foreground">House Funds</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1 flex flex-col min-h-0">
        <div className="m-4 mb-2 space-y-1">
          {/* First Row */}
          <TabsList className="w-full h-auto p-1 grid grid-cols-3 gap-1">
            <TabsTrigger 
              value="characters" 
              className="flex-1 text-xs justify-start px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Users size={14} className="mr-1" />
              Characters
            </TabsTrigger>
            <TabsTrigger 
              value="rooms" 
              className="flex-1 text-xs justify-start px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Home size={14} className="mr-1" />
              Rooms
            </TabsTrigger>
            <TabsTrigger 
              value="chats" 
              className="flex-1 text-xs justify-start px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <MessageCircle size={14} className="mr-1" />
              Chats
            </TabsTrigger>
          </TabsList>
          
          {/* Second Row */}
          <TabsList className="w-full h-auto p-1 grid grid-cols-2 gap-1">
            <TabsTrigger 
              value="auto" 
              className="flex-1 text-xs justify-start px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Sparkle size={14} className="mr-1" />
              Auto Create
            </TabsTrigger>
            <TabsTrigger 
              value="scenes" 
              className="flex-1 text-xs justify-start px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Play size={14} className="mr-1" />
              Scenes
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Characters Tab */}
        <TabsContent value="characters" className="flex-1 px-4 pb-4 space-y-3 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
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
                {(defaultHouse?.characters?.length || 0) === 0 ? (
                  <Card className="p-4 text-center text-muted-foreground">
                    <p className="text-sm">No characters yet</p>
                    <p className="text-xs">Create your first companion!</p>
                  </Card>
                ) : (
                  (defaultHouse.characters || []).map(character => (
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

              {(defaultHouse?.characters?.length || 0) > 1 && (
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
          <ScrollArea className="h-full">
            <div className="space-y-3 pr-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Rooms</h3>
                <Button size="sm" className="h-8" onClick={() => toast.info('Room creation from sidebar - coming soon!')}>
                  <Plus size={16} />
                </Button>
              </div>

              <div className="space-y-2">
                {(defaultHouse.rooms || []).map(room => (
                  <Card key={room.id} className="p-3 hover:bg-accent/50 transition-colors cursor-pointer">
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
                        {room.residents.slice(0, 3).map(residentId => {
                          const character = defaultHouse?.characters?.find(c => c.id === residentId);
                          return character ? (
                            <Badge key={character.id} variant="outline" className="text-xs">
                              {character.name}
                            </Badge>
                          ) : null;
                        })}
                        {room.residents.length > 3 && (
                          <Badge variant="outline" className="text-xs">
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
          <ScrollArea className="h-full">
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
                    <Card key={session.id} className="p-3 hover:bg-accent/50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 cursor-pointer" onClick={() => {
                          if (onStartChat && session.type === 'individual' && session.participantIds.length === 1) {
                            // For individual chats, switch to that character
                            onStartChat(session.participantIds[0]);
                          } else if (onStartGroupChat && session.type === 'group') {
                            // For group chats, switch to the session
                            onStartGroupChat(session.id);
                          }
                        }}>
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h4 className="font-medium text-sm">
                                {session.type === 'group' ? 'Group Chat' : 'Individual Chat'}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {session.participantIds.length} participant(s) • {session.messages.length} messages
                              </p>
                            </div>
                            <Badge variant="outline">
                              {session.messages.length}
                            </Badge>
                          </div>
                          
                          {/* Show participant names */}
                          <div className="flex flex-wrap gap-1">
                            {session.participantIds.slice(0, 3).map(id => {
                              const character = defaultHouse.characters?.find(c => c.id === id);
                              return character ? (
                                <Badge key={id} variant="secondary" className="text-xs">
                                  {character.name}
                                </Badge>
                              ) : null;
                            })}
                            {session.participantIds.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
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
                              if (onStartChat && session.type === 'individual' && session.participantIds.length === 1) {
                                onStartChat(session.participantIds[0]);
                              } else if (onStartGroupChat && session.type === 'group') {
                                onStartGroupChat(session.id);
                              }
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
                    <Card key={session.id} className="p-3 hover:bg-accent/30 opacity-75">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 cursor-pointer" onClick={() => {
                          if (onStartChat && session.type === 'individual' && session.participantIds.length === 1) {
                            // For individual chats, restart with that character
                            onStartChat(session.participantIds[0]);
                          } else if (onStartGroupChat && session.type === 'group') {
                            // For group chats, restart the group
                            onStartGroupChat();
                          }
                        }}>
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h4 className="font-medium text-sm text-muted-foreground">
                                {session.type === 'group' ? 'Group Chat' : 'Individual Chat'} (Ended)
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {session.participantIds.length} participant(s) • {session.messages.length} messages
                              </p>
                            </div>
                            <Badge variant="secondary">
                              {session.messages.length}
                            </Badge>
                          </div>
                          
                          {/* Show participant names */}
                          <div className="flex flex-wrap gap-1">
                            {session.participantIds.slice(0, 3).map(id => {
                              const character = defaultHouse.characters?.find(c => c.id === id);
                              return character ? (
                                <Badge key={id} variant="outline" className="text-xs">
                                  {character.name}
                                </Badge>
                              ) : null;
                            })}
                            {session.participantIds.length > 3 && (
                              <Badge variant="outline" className="text-xs">
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
                              if (onStartChat && session.type === 'individual' && session.participantIds.length === 1) {
                                onStartChat(session.participantIds[0]);
                              } else if (onStartGroupChat && session.type === 'group') {
                                onStartGroupChat();
                              }
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
                <Card className="p-4 text-center text-muted-foreground">
                  <p className="text-sm">No chats yet</p>
                  <p className="text-xs">Start a conversation!</p>
                </Card>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Auto Creator Tab */}
        <TabsContent value="auto" className="flex-1 min-h-0 px-4 pb-4 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="pr-3">
              <AutoCharacterCreator />
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Scene Creator Tab */}
        <TabsContent value="scenes" className="flex-1 min-h-0 px-4 pb-4 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="pr-3">
              <SceneCreator onSceneCreated={handleSceneCreated} />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Settings Footer */}
      <div className="p-4 border-t border-border space-y-2">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start"
          onClick={() => setShowSettings(true)}
        >
          <Settings size={16} className="mr-2" />
          House Settings
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start"
          onClick={() => setShowImageGallery(true)}
        >
          <Image size={16} className="mr-2" />
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

      {/* Character Editor Modal */}
      {editingCharacter && (
        <CharacterCreatorRepo
          open={!!editingCharacter}
          onOpenChange={() => setEditingCharacter(null)}
          character={editingCharacter}
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
      {selectedCharacterForGift && defaultHouse?.characters && (
        <GiftManager
          character={defaultHouse.characters.find(c => c.id === selectedCharacterForGift)!}
          isOpen={!!selectedCharacterForGift}
          onClose={() => setSelectedCharacterForGift(null)}
        />
      )}
    </div>
  );
}