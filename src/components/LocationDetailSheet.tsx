import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { useSceneMode } from '@/hooks/useSceneMode';
import type { Location } from '@/types';
import { Users, MessageSquare } from 'lucide-react';

interface LocationDetailSheetProps {
  location: Location;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LocationDetailSheet({ location, open, onOpenChange }: LocationDetailSheetProps) {
  const { getCharactersAtLocation } = useHouseFileStorage();
  const { createSceneSession } = useSceneMode();
  const characters = getCharactersAtLocation(location.id);

  const handleStartGroupChat = () => {
    if (characters.length === 0) return;
    
    const participantIds = characters.map(c => c.id);
    createSceneSession(participantIds, {
      name: `${location.name} Group Chat`,
      description: `Group conversation at ${location.name}`,
      locationId: location.id,
      playerPrompt: location.prompt
    });
    onOpenChange(false);
  };

  const handleStartOneOnOne = (characterId: string) => {
    createSceneSession([characterId], {
      name: `${location.name} - ${characters.find(c => c.id === characterId)?.name}`,
      description: `One-on-one conversation at ${location.name}`,
      locationId: location.id,
      playerPrompt: location.prompt
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="text-2xl">{location.name}</SheetTitle>
          <SheetDescription>{location.description}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Location Info */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {location.type}
            </Badge>
            {location.mood && (
              <Badge variant="secondary" className="capitalize">
                {location.mood}
              </Badge>
            )}
          </div>

          {/* Atmospheric Prompt */}
          {location.prompt && (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground italic">"{location.prompt}"</p>
            </div>
          )}

          {/* Characters at Location */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="w-4 h-4" />
                Characters Here ({characters.length})
              </h3>
              {characters.length > 1 && (
                <Button size="sm" variant="default" onClick={handleStartGroupChat}>
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Group Chat
                </Button>
              )}
            </div>

            <ScrollArea className="h-[400px] pr-4">
              {characters.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No characters at this location</p>
                  <p className="text-sm mt-1">Assign characters from the roster</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {characters.map((character) => (
                    <div
                      key={character.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {character.avatar && (
                          <img
                            src={character.avatar}
                            alt={character.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium">{character.name}</p>
                          {character.role && (
                            <p className="text-xs text-muted-foreground">{character.role}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStartOneOnOne(character.id)}
                      >
                        <MessageSquare className="w-3 h-3 mr-1" />
                        Chat
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Quick Actions */}
          <div className="pt-4 border-t space-y-2">
            <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
