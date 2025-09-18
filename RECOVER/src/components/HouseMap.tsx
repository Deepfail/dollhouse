import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { Room, Character } from '@/types';
import { CharacterCard } from './CharacterCard';
import { motion } from 'framer-motion';
import { 
  House as Home, 
  Plus, 
  Users, 
  ChatCircle as MessageCircle, 
  Heart,
  Bed,
  Coffee,
  BookOpen,
  GameController as Gamepad2,
  Gear as Settings,
  MapPin,
  Eye
} from '@phosphor-icons/react';

interface HouseMapProps {
  onStartChat: (characterId: string) => void;
  onStartGroupChat?: (sessionId?: string) => void;
  onStartScene: (sessionId: string) => void;
}

export function HouseMap({ onStartChat, onStartGroupChat, onStartScene }: HouseMapProps) {
  const { house } = useHouseFileStorage();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);

  const selectedRoomData = (house.rooms || []).find(r => r.id === selectedRoom);
  const roomCharacters = selectedRoomData
    ? (house.characters || []).filter(c => selectedRoomData.residents.includes(c.id))
    : [];

  const getRoomIcon = (type: string) => {
    switch (type) {
      case 'private': return <Bed size={24} />;
      case 'facility': return <Coffee size={24} />;
      default: return <Home size={24} />;
    }
  };

  const getRoomColor = (type: string) => {
    switch (type) {
      case 'private': return 'from-pink-400 to-purple-500';
      case 'facility': return 'from-blue-400 to-cyan-500';
      default: return 'from-green-400 to-emerald-500';
    }
  };

  const getGridPosition = (index: number, total: number) => {
    // Create a nice grid layout for rooms
    const cols = Math.ceil(Math.sqrt(total));
    const row = Math.floor(index / cols);
    const col = index % cols;
    
    return {
      gridColumn: col + 1,
      gridRow: row + 1
    };
  };

  if (!house.rooms || house.rooms.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900">
        <Card className="p-8 text-center max-w-md">
          <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Home size={40} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Rooms Yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first room to start building your house.
          </p>
          <Button>
            <Plus size={16} className="mr-2" />
            Add Room
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="h-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6 overflow-auto">
        {/* House Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            {house.name}
          </h1>
          <p className="text-lg text-muted-foreground">
            Click any room to see who's inside
          </p>
        </div>

        {/* House Map Grid */}
        <div 
          className="grid gap-6 max-w-6xl mx-auto"
          style={{
            gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(house.rooms.length))}, 1fr)`,
            minHeight: '60vh'
          }}
        >
          {house.rooms.map((room, index) => {
            const charactersInRoom = (house.characters || []).filter(c => room.residents.includes(c.id));
            const isHovered = hoveredRoom === room.id;
            
            return (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Card 
                  className={`relative h-48 cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-2xl ${
                    isHovered ? 'ring-4 ring-purple-400' : ''
                  }`}
                  onClick={() => setSelectedRoom(room.id)}
                  onMouseEnter={() => setHoveredRoom(room.id)}
                  onMouseLeave={() => setHoveredRoom(null)}
                >
                  {/* Room Background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${getRoomColor(room.type)} opacity-20`} />
                  
                  {/* Room Content */}
                  <div className="relative p-4 h-full flex flex-col">
                    {/* Room Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${getRoomColor(room.type)} text-white`}>
                          {getRoomIcon(room.type)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{room.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {room.type}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users size={16} />
                        <span className="text-sm">{charactersInRoom.length}</span>
                      </div>
                    </div>

                    {/* Characters Preview */}
                    <div className="flex-1 flex flex-col justify-end">
                      {charactersInRoom.length > 0 ? (
                        <div className="space-y-2">
                          {charactersInRoom.slice(0, 3).map((character) => (
                            <div key={character.id} className="flex items-center gap-2 bg-white/60 dark:bg-gray-800/60 rounded-lg p-2">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={character.avatar} alt={character.name} />
                                <AvatarFallback className="text-xs">
                                  {character.name.slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium truncate">{character.name}</span>
                            </div>
                          ))}
                          {charactersInRoom.length > 3 && (
                            <div className="text-center text-sm text-muted-foreground">
                              +{charactersInRoom.length - 3} more
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground">
                          <Home size={32} className="mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Empty room</p>
                        </div>
                      )}
                    </div>

                    {/* Hover Effect */}
                    {isHovered && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent flex items-center justify-center"
                      >
                        <div className="bg-white/90 dark:bg-gray-800/90 rounded-full p-3">
                          <Eye size={24} className="text-gray-700 dark:text-gray-300" />
                        </div>
                      </motion.div>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Add Room Button */}
        <div className="text-center mt-8">
          <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
            <Plus size={20} className="mr-2" />
            Add New Room
          </Button>
        </div>
      </div>

      {/* Room Detail Modal */}
      <Dialog open={!!selectedRoom} onOpenChange={() => setSelectedRoom(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedRoomData && (
                <>
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${getRoomColor(selectedRoomData.type)} text-white`}>
                    {getRoomIcon(selectedRoomData.type)}
                  </div>
                  <div>
                    <span>{selectedRoomData.name}</span>
                    <Badge variant="outline" className="ml-2">
                      {selectedRoomData.type}
                    </Badge>
                  </div>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            {selectedRoomData && (
              <div className="space-y-6">
                {/* Room Description */}
                {selectedRoomData.description && (
                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-muted-foreground">{selectedRoomData.description}</p>
                  </div>
                )}

                {/* Characters in Room */}
                <div>
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <Users size={18} />
                    Characters in {selectedRoomData.name} ({roomCharacters.length})
                  </h4>
                  
                  {roomCharacters.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {roomCharacters.map((character) => (
                        <CharacterCard
                          key={character.id}
                          character={character}
                          onStartChat={onStartChat}
                          compact
                        />
                      ))}
                    </div>
                  ) : (
                    <Card className="p-8 text-center">
                      <Home size={48} className="mx-auto mb-4 opacity-50" />
                      <h3 className="font-semibold mb-2">Empty Room</h3>
                      <p className="text-muted-foreground mb-4">
                        No characters are currently in this room.
                      </p>
                      <Button variant="outline">
                        <Plus size={16} className="mr-2" />
                        Move Character Here
                      </Button>
                    </Card>
                  )}
                </div>

                {/* Room Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button onClick={() => onStartGroupChat?.()} className="flex-1">
                    <MessageCircle size={16} className="mr-2" />
                    Group Chat
                  </Button>
                  <Button variant="outline" onClick={() => onStartScene('')} className="flex-1">
                    <Settings size={16} className="mr-2" />
                    Create Scene
                  </Button>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}