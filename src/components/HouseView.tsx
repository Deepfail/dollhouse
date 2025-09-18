import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import {
    Camera,
    Monitor as Desktop,
    List,
    MapPin as Map,
    ChatCircle as MessageCircle,
    Plus,
    Users,
    X
} from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { CharacterCard } from './CharacterCard';
import { CharacterCreatorRepo } from './CharacterCreatorRepo';
import { DesktopUI } from './DesktopUI';
import { HouseMap } from './HouseMap';


interface HouseViewProps {
  onStartChat?: (characterId: string) => void;
  onStartGroupChat?: (sessionId?: string) => void;
  onStartScene?: (sessionId: string) => void;
}

export function HouseView({ onStartChat, onStartGroupChat, onStartScene }: HouseViewProps) {
  const {
    house,
    characters,
    isLoading,
    addCharacter,
    removeCharacter,
    updateCharacter,
    addRoom,
    removeRoom,
    assignCharacterToRoom,
    getAvailableRooms
  } = useHouseFileStorage();
  const [viewMode, setViewMode] = useState<'map' | 'list' | 'desktop'>('map');
  const [selectedCharacter, setSelectedCharacter] = useState<any>(null);
  const [showCharacterDetails, setShowCharacterDetails] = useState(false);
  const [showCharacterCreator, setShowCharacterCreator] = useState(false);
  const [showRoomCreator, setShowRoomCreator] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomType, setNewRoomType] = useState<'shared' | 'private'>('shared');

  // UI-level dedupe guard
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



  const handleDeleteCharacter = async (characterId: string) => {
    await removeCharacter(characterId);
  };
  // Room creation handler
  const handleAddRoom = async () => {
    if (!newRoomName.trim()) return;
    await addRoom({
      id: `${newRoomName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      name: newRoomName,
      description: '',
      type: newRoomType,
      capacity: 5,
      residents: [],
      facilities: [],
      unlocked: true,
      decorations: [],
      createdAt: new Date(),
    });
    setNewRoomName('');
    setShowRoomCreator(false);
  };

  const handleCharacterClick = (character: any) => {
    setSelectedCharacter(character);
    setShowCharacterDetails(true);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white/50 backdrop-blur-sm dark:bg-gray-800/50">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">My Character House</h1>
          <Badge variant="outline">
            {characters?.length || 0} Characters
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

          <Button onClick={() => setShowCharacterCreator(true)}>
            <Plus size={16} className="mr-2" />
            Add Character
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {viewMode === 'map' ? (
          <HouseMap
            onStartChat={onStartChat}
            onStartGroupChat={onStartGroupChat}
            onStartScene={onStartScene}
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
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-muted-foreground">Loading rooms...</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {house.rooms.map((room) => {
                      const charactersInRoom = characters.filter((c: any) =>
                        room.residents.includes(c.id)
                      );
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
                                {charactersInRoom.slice(0, 4).map((character: any) => (
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
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => onStartGroupChat?.()}
                              >
                                <MessageCircle size={14} className="mr-1" />
                                Chat
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => onStartScene?.(room.id)}
                              >
                                <Camera size={14} className="mr-1" />
                                Scene
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="flex-1 text-red-500"
                                onClick={() => removeRoom(room.id)}
                              >
                                <X size={14} className="mr-1" />
                                Remove
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                    <div className="col-span-full">
                      <Button variant="outline" onClick={() => setShowRoomCreator(true)}>
                        <Plus size={14} className="mr-1" />
                        Add Room
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="characters" className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-muted-foreground">Loading characters...</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">All Characters</h3>
                      <Button size="sm" onClick={() => setShowCharacterCreator(true)}>
                        <Plus size={14} className="mr-1" />
                        Add Character
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {visibleCharacters?.map((character: any) => (
                        <CharacterCard
                          key={`houseview-${character.id}`}
                          character={character}
                          onStartChat={onStartChat ?? (() => {})}
                          onDelete={handleDeleteCharacter}
                          compact
                          source="houseview"
                        />
                      ))}

                      {(!characters || characters.length === 0) && (
                        <div className="col-span-full text-center text-muted-foreground py-12">
                          <Users size={48} className="mx-auto mb-4 opacity-50" />
                          <p>No characters yet. Create your first character to get started!</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {/* Character Details Modal */}
      <Dialog open={showCharacterDetails} onOpenChange={setShowCharacterDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={selectedCharacter?.avatar} alt={selectedCharacter?.name} />
                <AvatarFallback>
                  {selectedCharacter?.name?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span>{selectedCharacter?.name}</span>
                  {selectedCharacter?.rarity && (
                    <Badge variant="outline" className="text-xs capitalize">
                      {selectedCharacter.rarity}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Level {selectedCharacter?.progression?.level || 1}</span>
                  <span className="flex items-center gap-1">
                    ❤️ {selectedCharacter?.stats?.love || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    ⚡ {selectedCharacter?.stats?.happiness || 0}
                  </span>
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-sm text-muted-foreground">
                {selectedCharacter?.description || 'No description available'}
              </p>
            </div>

            {selectedCharacter?.personalities && selectedCharacter.personalities.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Personalities</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedCharacter.personalities.map((personality: string, idx: number) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {personality}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {selectedCharacter?.features && selectedCharacter.features.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Features</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedCharacter.features.map((feature: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {selectedCharacter?.role && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Role:</span>
                <Badge variant="outline">{selectedCharacter.role}</Badge>
              </div>
            )}

            {selectedCharacter?.job && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Job:</span>
                <span>{selectedCharacter.job}</span>
              </div>
            )}

            {selectedCharacter?.prompts?.system && (
              <div>
                <h4 className="font-medium mb-2">System Prompt</h4>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                  {selectedCharacter.prompts.system}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowCharacterDetails(false)}>
              <X size={16} className="mr-2" />
              Close
            </Button>
            <Button onClick={() => onStartChat?.(selectedCharacter?.id)}>
              <MessageCircle size={16} className="mr-2" />
              Start Chat
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Character Creator Modal */}
      <CharacterCreatorRepo
        open={showCharacterCreator}
        onOpenChange={setShowCharacterCreator}
      />

      {/* Room Creator Modal */}
      {showRoomCreator && (
        <Dialog open={showRoomCreator} onOpenChange={setShowRoomCreator}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Room</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <input
                className="w-full p-2 border rounded"
                placeholder="Room name"
                value={newRoomName}
                onChange={e => setNewRoomName(e.target.value)}
              />
              <select
                className="w-full p-2 border rounded"
                value={newRoomType}
                onChange={e => setNewRoomType(e.target.value as any)}
              >
                <option value="shared">Shared</option>
                <option value="private">Private</option>
              </select>
              <Button onClick={handleAddRoom} disabled={!newRoomName.trim()}>
                Add Room
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
