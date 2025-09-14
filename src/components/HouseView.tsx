import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CharacterCard } from './CharacterCard';
import { ChatInterface } from './ChatInterface';
import { SceneInterface } from './SceneInterface';
import { HouseMap } from './HouseMap';
import { DesktopUI } from './DesktopUI';
import { useHouse } from '@/hooks/useHouse';
import { useChat } from '@/hooks/useChat';
import { useSceneMode } from '@/hooks/useSceneMode';
import { Character } from '@/types';
import { 
  Plus, 
  Users, 
  ChatCircle as MessageCircle,
  Camera,
  MapPin as Map,
  List,
  Monitor as Desktop
} from '@phosphor-icons/react';

export function HouseView() {
  const { house, removeCharacter } = useHouse();
  const { createSession } = useChat();
  const { createSceneSession } = useSceneMode();
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [activeScene, setActiveScene] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list' | 'desktop'>('map');

  const handleStartChat = (characterId: string) => {
    setActiveChat(characterId);
    createSession('individual', [characterId]);
  };

  const handleStartGroupChat = (sessionId?: string) => {
    setActiveChat('group');
    // Group chat logic here
  };

  const handleStartScene = (sessionId: string) => {
    setActiveScene(sessionId);
    // createSceneSession logic here
  };

  const handleDeleteCharacter = (characterId: string) => {
    removeCharacter(characterId);
  };

  if (activeChat) {
    return (
      <ChatInterface 
        sessionId={activeChat}
        onBack={() => setActiveChat(null)}
      />
    );
  }

  if (activeScene) {
    return (
      <SceneInterface 
        sessionId={activeScene}
        onClose={() => setActiveScene(null)}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white/50 backdrop-blur-sm dark:bg-gray-800/50">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">{house.name}</h1>
          <Badge variant="outline">
            {house.characters?.length || 0} Characters
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <Button
              variant={viewMode === 'map' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('map')}
              className="flex items-center gap-2"
            >
              <Map size={16} />
              Map
            </Button>
            <Button
              variant={viewMode === 'desktop' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('desktop')}
              className="flex items-center gap-2"
            >
              <Desktop size={16} />
              Desktop
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="flex items-center gap-2"
            >
              <List size={16} />
              List
            </Button>
          </div>
          
          <Button>
            <Plus size={16} className="mr-2" />
            Add Character
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {viewMode === 'map' ? (
          <HouseMap
            onStartChat={handleStartChat}
            onStartGroupChat={handleStartGroupChat}
            onStartScene={handleStartScene}
          />
        ) : viewMode === 'desktop' ? (
          <DesktopUI />
        ) : (
          <div className="p-6">
            <Tabs defaultValue="rooms" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="rooms">Rooms</TabsTrigger>
                <TabsTrigger value="characters">Characters</TabsTrigger>
              </TabsList>
              
              <TabsContent value="rooms" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {house.rooms?.map((room) => {
                    const charactersInRoom = house.characters?.filter(c => 
                      room.residents.includes(c.id)
                    ) || [];
                    
                    return (
                      <Card key={room.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <span>{room.name}</span>
                            <Badge variant="outline">{room.type}</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {room.description && (
                            <p className="text-sm text-muted-foreground mb-3">
                              {room.description}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-2 mb-3">
                            <Users size={16} />
                            <span className="text-sm">{charactersInRoom.length} residents</span>
                          </div>
                          
                          {charactersInRoom.length > 0 && (
                            <div className="flex -space-x-2 mb-3">
                              {charactersInRoom.slice(0, 4).map((character) => (
                                <Avatar key={character.id} className="w-8 h-8 border-2 border-white">
                                  <AvatarImage src={character.avatar} alt={character.name} />
                                  <AvatarFallback className="text-xs">
                                    {character.name.slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                              {charactersInRoom.length > 4 && (
                                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full border-2 border-white flex items-center justify-center text-xs">
                                  +{charactersInRoom.length - 4}
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1">
                              <MessageCircle size={14} className="mr-1" />
                              Chat
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1">
                              <Camera size={14} className="mr-1" />
                              Scene
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
              
              <TabsContent value="characters" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {house.characters?.map((character) => (
                    <CharacterCard
                      key={character.id}
                      character={character}
                      onStartChat={handleStartChat}
                      onDelete={handleDeleteCharacter}
                      compact
                    />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}