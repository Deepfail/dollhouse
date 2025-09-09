import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { useHouse } from '@/hooks/useHouse';
import { useChat } from '@/hooks/useChat';
import { Room, Character } from '@/types';
import { 
  House as Home, 
  Plus, 
  Users, 
  ChatCircle as MessageCircle, 
  Heart,
  BatteryMedium as Battery,
  Smiley as Smile,
  Gift,
  Gear as Settings,
  Bed,
  Coffee,
  BookOpen,
  GameController as Gamepad2
} from '@phosphor-icons/react';
import { motion } from 'framer-motion';

interface HouseViewProps {
  onStartChat: (characterId: string) => void;
  onStartGroupChat?: (sessionId?: string) => void;
  onStartScene: (sessionId: string) => void;
}

export function HouseView({ onStartChat, onStartGroupChat, onStartScene }: HouseViewProps) {
  const { house, moveCharacterToRoom } = useHouse();
  const { createSession } = useChat();
  const [selectedRoom, setSelectedRoom] = useState<string | null>((house.rooms || [])[0]?.id || null);

  const selectedRoomData = (house.rooms || []).find(r => r.id === selectedRoom);
  const roomCharacters = selectedRoomData
    ? (house.characters || []).filter(c => selectedRoomData.residents.includes(c.id))
    : [];

  const getRoomIcon = (type: string) => {
    switch (type) {
      case 'private': return <Bed size={16} />;
      case 'facility': return <Coffee size={16} />;
      default: return <Home size={16} />;
    }
  };

  const getFacilityIcon = (facility: string) => {
    switch (facility) {
      case 'chat': return <MessageCircle size={14} />;
      case 'games': return <Gamepad2 size={14} />;
      case 'library': return <BookOpen size={14} />;
      case 'kitchen': return <Coffee size={14} />;
      default: return <Settings size={14} />;
    }
  };

  const handleCharacterAction = (character: Character, action: 'chat' | 'gift' | 'move') => {
    switch (action) {
      case 'chat':
        onStartChat(character.id);
        break;
      case 'gift':
        // Open gift giving interface
        break;
      case 'move':
        // Open room selection for moving character
        break;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* House Header */}
      <div className="border-b border-border p-6 bg-card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Home size={32} className="text-primary" />
              {house.name}
            </h1>
            <p className="text-muted-foreground mt-1">{house.description}</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">${house.currency}</div>
              <div className="text-sm text-muted-foreground">House Funds</div>
            </div>
            <Button>
              <Plus size={16} className="mr-2" />
              Add Room
            </Button>
          </div>
        </div>

        {/* Room Navigation */}
        <div className="flex gap-2 mt-6 overflow-x-auto">
          {(house.rooms || []).map(room => (
            <Button
              key={room.id}
              variant={selectedRoom === room.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedRoom(room.id)}
              className="flex-shrink-0"
            >
              {getRoomIcon(room.type)}
              <span className="ml-2">{room.name}</span>
              {room.residents.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {room.residents.length}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Room View */}
      <div className="flex-1 p-6">
        {selectedRoomData ? (
          <div className="space-y-6">
            {/* Room Info */}
            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    {getRoomIcon(selectedRoomData.type)}
                    <h2 className="text-xl font-semibold">{selectedRoomData.name}</h2>
                    <Badge variant={selectedRoomData.type === 'private' ? 'default' : 'secondary'}>
                      {selectedRoomData.type}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{selectedRoomData.description}</p>
                </div>
                
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Capacity</div>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={(selectedRoomData.residents.length / selectedRoomData.capacity) * 100} 
                      className="w-16 h-2" 
                    />
                    <span className="text-sm font-medium">
                      {selectedRoomData.residents.length}/{selectedRoomData.capacity}
                    </span>
                  </div>
                </div>
              </div>

              {/* Facilities */}
              {selectedRoomData.facilities.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Facilities:</span>
                  <div className="flex gap-1">
                    {selectedRoomData.facilities.map(facility => (
                      <Badge key={facility} variant="outline" className="text-xs">
                        {getFacilityIcon(facility)}
                        <span className="ml-1">{facility}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Characters in Room */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Characters in {selectedRoomData.name}
                </h3>
                {roomCharacters.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (onStartGroupChat) {
                        onStartGroupChat();
                      } else {
                        const sessionId = createSession('group', roomCharacters.map(c => c.id));
                        // Navigate to chat - fallback
                      }
                    }}
                  >
                    <Users size={16} className="mr-2" />
                    Group Chat
                  </Button>
                )}
              </div>

              {roomCharacters.length === 0 ? (
                <Card className="p-8 text-center">
                  <Home size={48} className="mx-auto text-muted-foreground mb-4" />
                  <h4 className="font-medium mb-2">Empty Room</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    No characters are currently in this room.
                  </p>
                  <Button variant="outline" size="sm">
                    Invite Character
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {roomCharacters.map(character => (
                    <motion.div
                      key={character.id}
                      whileHover={{ y: -2 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="p-4 hover:shadow-lg transition-shadow">
                        <div className="flex items-start gap-3 mb-4">
                          <Avatar className="w-12 h-12">
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {character.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1">
                            <h4 className="font-medium">{character.name}</h4>
                            {character.role && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {character.role}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {character.description}
                        </p>

                        {/* Character Stats */}
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-xs">
                            <Heart size={12} className="text-red-500" />
                            <Progress value={character.stats.relationship} className="h-1 flex-1" />
                            <span className="text-muted-foreground w-8">
                              {character.stats.relationship}%
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs">
                            <Smile size={12} className="text-yellow-500" />
                            <Progress value={character.stats.happiness} className="h-1 flex-1" />
                            <span className="text-muted-foreground w-8">
                              {character.stats.happiness}%
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs">
                            <Battery size={12} className="text-blue-500" />
                            <Progress value={character.stats.energy} className="h-1 flex-1" />
                            <span className="text-muted-foreground w-8">
                              {character.stats.energy}%
                            </span>
                          </div>
                        </div>

                        {/* Character Actions */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleCharacterAction(character, 'chat')}
                          >
                            <MessageCircle size={14} className="mr-1" />
                            Chat
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCharacterAction(character, 'gift')}
                          >
                            <Gift size={14} />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCharacterAction(character, 'move')}
                          >
                            <Home size={14} />
                          </Button>
                        </div>

                        {/* Activity Status */}
                        <div className="mt-3 pt-3 border-t border-border">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {character.lastInteraction 
                                ? `Last seen ${new Date(character.lastInteraction).toLocaleDateString()}`
                                : 'Never interacted'
                              }
                            </span>
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-muted-foreground">Online</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <Card className="p-8 text-center">
            <Home size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Rooms Available</h3>
            <p className="text-muted-foreground mb-4">
              Create your first room to house your characters.
            </p>
            <Button>
              <Plus size={16} className="mr-2" />
              Create Room
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}