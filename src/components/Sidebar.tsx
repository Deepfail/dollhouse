import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useHouse } from '@/hooks/useHouse';
import { useChat } from '@/hooks/useChat';
import { Character } from '@/types';
import { toast } from 'sonner';
import { 
  Plus, 
  House as Home, 
  Users, 
  ChatCircle as MessageCircle, 
  Gear as Settings, 
  Heart, 
  Drop, 
  Smiley as Smile,
  Sparkle,
  Play,
  Image as ImageIcon
} from '@phosphor-icons/react';
import { CharacterCreator } from './CharacterCreator';
import { AutoCharacterCreator } from './AutoCharacterCreator';
import { SceneCreator } from './SceneCreator';
import { HouseSettings } from './HouseSettings';
import { CharacterCard } from './CharacterCard';
import { GiftManager } from './GiftManager';
import { DataManager } from './DataManager';
import { PersistenceDebugger } from './PersistenceDebugger';
import { ImageGallery } from './ImageGallery';

interface SidebarProps {
  onStartChat?: (characterId: string) => void;
  onStartGroupChat?: (sessionId?: string) => void;
  onStartScene?: (sessionId: string) => void;
}

export function Sidebar({ onStartChat, onStartGroupChat, onStartScene }: SidebarProps) {
  const { house } = useHouse();
  const { createSession, sessions } = useChat();
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
      const characterIds = (house.characters || []).map(c => c.id);
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
            <h1 className="text-xl font-bold">{house.name}</h1>
            <p className="text-sm text-muted-foreground">
              {house.characters.length} characters
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="secondary" className="text-primary font-medium">
            ${house.currency}
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
                {house.characters.length === 0 ? (
                  <Card className="p-4 text-center text-muted-foreground">
                    <p className="text-sm">No characters yet</p>
                    <p className="text-xs">Create your first companion!</p>
                  </Card>
                ) : (
                  (house.characters || []).map(character => (
                    <CharacterCard
                      key={character.id}
                      character={character}
                      onStartChat={startIndividualChat}
                      onEdit={setEditingCharacter}
                      onGift={(characterId) => setSelectedCharacterForGift(characterId)}
                      compact={true}
                    />
                  ))
                )}
              </div>

              {house.characters.length > 1 && (
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
                {(house.rooms || []).map(room => (
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
                          const character = house.characters.find(c => c.id === residentId);
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
                <h3 className="font-medium">Active Chats</h3>
              </div>

              <div className="space-y-2">
                {sessions.filter(s => s.active).length === 0 ? (
                  <Card className="p-4 text-center text-muted-foreground">
                    <p className="text-sm">No active chats</p>
                    <p className="text-xs">Start a conversation!</p>
                  </Card>
                ) : (
                  sessions.filter(s => s.active).map(session => (
                    <Card key={session.id} className="p-3 cursor-pointer hover:bg-accent/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-sm">
                            {session.type === 'group' ? 'Group Chat' : 'Individual Chat'}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {session.participantIds.length} participant(s)
                          </p>
                        </div>
                        <Badge variant="outline">
                          {session.messages.length}
                        </Badge>
                      </div>
                    </Card>
                  ))
                )}
              </div>
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
          <ImageIcon size={16} className="mr-2" />
          Image Gallery
        </Button>
        <div className="flex gap-2">
          <DataManager />
          <PersistenceDebugger />
        </div>
      </div>

      {/* Character Creator Modal */}
      {showCreator && (
        <CharacterCreator
          open={showCreator}
          onOpenChange={setShowCreator}
        />
      )}

      {/* Character Editor Modal */}
      {editingCharacter && (
        <CharacterCreator
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
      {selectedCharacterForGift && (
        <GiftManager
          character={house.characters.find(c => c.id === selectedCharacterForGift)!}
          isOpen={!!selectedCharacterForGift}
          onClose={() => setSelectedCharacterForGift(null)}
        />
      )}
    </div>
  );
}