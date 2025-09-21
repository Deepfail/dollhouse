import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { Camera, ChatCircle, MapPin, Users } from '@phosphor-icons/react';

interface HouseMapProps {
  onStartChat?: (characterId: string) => void;
  onStartGroupChat?: (sessionId?: string) => void;
  onStartScene?: (sessionId: string) => void;
}

export function HouseMap({ onStartChat, onStartGroupChat, onStartScene }: HouseMapProps) {
  const { characters, isLoading } = useHouseFileStorage();

  // Default rooms structure
  const defaultRooms = [
    {
      id: 'common-room',
      name: 'Common Room',
      description: 'A shared space for everyone to gather',
      type: 'shared',
      capacity: 10,
      x: 200,
      y: 150,
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
      x: 400,
      y: 100,
      residents: characters?.slice(3, 5).map(c => c.id) || [],
      facilities: ['chat'],
      unlocked: true
    },
    {
      id: 'garden',
      name: 'Garden',
      description: 'An outdoor space for relaxation',
      type: 'shared',
      capacity: 8,
      x: 100,
      y: 300,
      residents: characters?.slice(5, 8).map(c => c.id) || [],
      facilities: ['chat', 'scenes'],
      unlocked: true
    }
  ];

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading house map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-950 dark:to-green-950 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0iIzAwMCIgb3BhY2l0eT0iMC4xIi8+Cjwvc3ZnPg==')]"></div>
      </div>

      {/* House Layout */}
      <div className="relative h-full p-8">
        <div className="max-w-6xl mx-auto h-full relative">
          {/* Main House Structure */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-96 h-64 bg-amber-100 dark:bg-amber-900 border-4 border-amber-300 dark:border-amber-700 rounded-lg shadow-lg relative">
              {/* Roof */}
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-80 h-16 bg-red-600 rounded-t-lg"></div>

              {/* Door */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-8 h-16 bg-amber-800 rounded-sm"></div>

              {/* Windows */}
              <div className="absolute top-8 left-8 w-12 h-12 bg-blue-200 dark:bg-blue-800 rounded-sm border-2 border-amber-400"></div>
              <div className="absolute top-8 right-8 w-12 h-12 bg-blue-200 dark:bg-blue-800 rounded-sm border-2 border-amber-400"></div>
            </div>
          </div>

          {/* Room Markers */}
          {defaultRooms.map((room) => {
            const charactersInRoom = characters?.filter(c => room.residents.includes(c.id)) || [];

            return (
              <div
                key={room.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${room.x}px`, top: `${room.y}px` }}
              >
                <Card className="w-48 hover:shadow-lg transition-shadow cursor-pointer group">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-blue-500" />
                      <CardTitle className="text-sm">{room.name}</CardTitle>
                      <Badge variant="outline" className="text-xs">{room.type}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {room.description}
                    </p>

                    {/* Residents */}
                    {charactersInRoom.length > 0 && (
                      <div className="flex -space-x-2 mb-2">
                        {charactersInRoom.slice(0, 3).map((character) => (
                        <Avatar key={character.id} className="w-6 h-6 border-2 border-[rgba(255,255,255,0.06)]">
                            <AvatarImage src={character.avatar} alt={character.name} />
                            <AvatarFallback className="text-xs">
                              {character.name.slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {charactersInRoom.length > 3 && (
                          <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full border-2 border-[rgba(255,255,255,0.06)] flex items-center justify-center text-xs">
                            +{charactersInRoom.length - 3}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                      <span>{charactersInRoom.length}/{room.capacity} residents</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-xs"
                        onClick={() => onStartGroupChat?.(room.id)}
                      >
                        <ChatCircle size={12} className="mr-1" />
                        Chat
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-xs"
                        onClick={() => onStartScene?.(room.id)}
                      >
                        <Camera size={12} className="mr-1" />
                        Scene
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}

          {/* Legend */}
          <div className="absolute bottom-4 right-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
            <h4 className="font-medium text-sm mb-2">Legend</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-100 dark:bg-amber-900 border border-amber-300 rounded"></div>
                <span>Main House</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={12} className="text-blue-500" />
                <span>Rooms</span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={12} className="text-muted-foreground" />
                <span>Characters</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
