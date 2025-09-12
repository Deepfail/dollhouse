import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useHouse } from '@/hooks/useHouse';
import { useChat } from '@/hooks/useChat';
import { Room, Character } from '@/types';
import { CharacterCard } from './CharacterCard';
import { CharacterCreator } from './CharacterCreator';
import { 
  House as Home, 
  Plus, 
  Users, 
  ChatCircle as MessageCircle, 
  Heart,
  Drop,
  Smiley as Smile,
  Gift,
  Gear as Settings,
  Bed,
  Coffee,
  BookOpen,
  GameController as Gamepad2,
  Trash,
  Pencil
} from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface HouseViewProps {
  onStartChat: (characterId: string) => void;
  onStartGroupChat?: (sessionId?: string) => void;
  onStartScene: (sessionId: string) => void;
}

export function HouseView({ onStartChat, onStartGroupChat, onStartScene }: HouseViewProps) {
  const { house, moveCharacterToRoom, addRoom, removeRoom, updateRoom, removeCharacter } = useHouse();
  const { createSession } = useChat();
  const [selectedRoom, setSelectedRoom] = useState<string | null>((house.rooms || [])[0]?.id || null);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [showEditRoom, setShowEditRoom] = useState<string | null>(null);
  const [showMoveCharacter, setShowMoveCharacter] = useState<string | null>(null);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [newRoom, setNewRoom] = useState({
    name: '',
    description: '',
    type: 'shared' as 'private' | 'shared' | 'facility',
    capacity: 2
  });

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
        toast.info('Gift system coming soon!');
        break;
      case 'move':
        setShowMoveCharacter(character.id);
        break;
    }
  };

  const handleAddRoom = async () => {
    if (!newRoom.name.trim()) {
      toast.error('Room name is required');
      return;
    }

    try {
      const roomData: Room = {
        id: `room-${Date.now()}`,
        ...newRoom,
        residents: [],
        facilities: [],
        decorations: [],
        unlocked: true,
        createdAt: new Date()
      };
      
      await addRoom(roomData);
      setShowAddRoom(false);
      setNewRoom({ name: '', description: '', type: 'shared', capacity: 2 });
      toast.success('Room added successfully!');
    } catch (error) {
      toast.error('Failed to add room');
    }
  };

  const handleMoveCharacter = async (characterId: string, roomId: string) => {
    try {
      await moveCharacterToRoom(characterId, roomId);
      setShowMoveCharacter(null);
      toast.success('Character moved successfully!');
    } catch (error) {
      toast.error('Failed to move character');
    }
  };

  const handleDeleteCharacter = async (characterId: string) => {
    try {
      await removeCharacter(characterId);
      toast.success('Character deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete character');
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
            <Button onClick={() => setShowAddRoom(true)}>
              <Plus size={16} className="mr-2" />
              Add Room
            </Button>
          </div>
        </div>

        {/* Room Navigation */}
        <div className="flex gap-2 mt-6 overflow-x-auto">
          {(house.rooms || []).map(room => (
            <div key={room.id} className="flex items-center gap-1">
              <Button
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
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowEditRoom(room.id)}
                className="px-2"
              >
                <Pencil size={14} />
              </Button>
            </div>
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
                    <CharacterCard
                      key={character.id}
                      character={character}
                      onStartChat={onStartChat}
                      onEdit={setEditingCharacter}
                      onGift={(characterId) => handleCharacterAction(character, 'gift')}
                      onMove={(characterId) => handleCharacterAction(character, 'move')}
                      onDelete={handleDeleteCharacter}
                    />
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
            <Button onClick={() => setShowAddRoom(true)}>
              <Plus size={16} className="mr-2" />
              Create Room
            </Button>
          </Card>
        )}
      </div>

      {/* Add Room Dialog */}
      <Dialog open={showAddRoom} onOpenChange={setShowAddRoom}>
        <DialogContent className="w-[95vw] max-w-none sm:w-[92vw] md:w-[88vw] lg:w-[80vw] xl:w-[75vw]">
          <DialogHeader>
            <DialogTitle>Add New Room</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Room Name</label>
              <Input
                value={newRoom.name}
                onChange={(e) => setNewRoom(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter room name"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={newRoom.description}
                onChange={(e) => setNewRoom(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe this room"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Room Type</label>
              <Select value={newRoom.type} onValueChange={(value: any) => setNewRoom(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="shared">Shared</SelectItem>
                  <SelectItem value="facility">Facility</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Capacity</label>
              <Input
                type="number"
                value={newRoom.capacity}
                onChange={(e) => setNewRoom(prev => ({ ...prev, capacity: parseInt(e.target.value) || 1 }))}
                min={1}
                max={10}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRoom(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRoom}>
              Add Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Character Dialog */}
      {showMoveCharacter && (
        <Dialog open={!!showMoveCharacter} onOpenChange={() => setShowMoveCharacter(null)}>
          <DialogContent className="w-[95vw] max-w-none sm:w-[92vw] md:w-[88vw] lg:w-[80vw] xl:w-[75vw]">
            <DialogHeader>
              <DialogTitle>Move Character to Room</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select a room to move this character to:
              </p>
              
              <div className="space-y-2">
                {house.rooms.map(room => (
                  <Button
                    key={room.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleMoveCharacter(showMoveCharacter, room.id)}
                    disabled={room.residents.length >= room.capacity}
                  >
                    <div className="flex items-center gap-3">
                      {getRoomIcon(room.type)}
                      <div>
                        <div className="font-medium">{room.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {room.residents.length}/{room.capacity} residents
                        </div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowMoveCharacter(null)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Character Creator Dialog */}
      {editingCharacter && (
        <CharacterCreator
          open={!!editingCharacter}
          onOpenChange={() => setEditingCharacter(null)}
          character={editingCharacter}
        />
      )}
    </div>
  );
}