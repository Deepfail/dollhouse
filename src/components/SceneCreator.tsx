import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCharacters } from '@/hooks/useCharacters';
import { useSceneMode } from '@/hooks/useSceneMode';
import { Camera, Play, Users } from '@phosphor-icons/react';
import { useState } from 'react';
import { toast } from 'sonner';

interface SceneCreatorProps {
  onSceneCreated?: (sessionId: string) => void;
}

export function SceneCreator({ onSceneCreated }: SceneCreatorProps) {
  const { characters } = useCharacters();
  const { createSceneSession } = useSceneMode();
  const [sceneName, setSceneName] = useState('');
  const [sceneDescription, setSceneDescription] = useState('');
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateScene = async () => {
    if (!sceneName.trim()) {
      toast.error('Scene name is required');
      return;
    }

    if (selectedCharacters.length === 0) {
      toast.error('Select at least one character for the scene');
      return;
    }

    setIsCreating(true);
    try {
      const sessionId = createSceneSession(selectedCharacters, {
        name: sceneName,
        description: sceneDescription
      });

      if (sessionId) {
        toast.success(`Scene "${sceneName}" created!`);
        onSceneCreated?.(sessionId);

        // Reset form
        setSceneName('');
        setSceneDescription('');
        setSelectedCharacters([]);
      } else {
        toast.error('Failed to create scene');
      }
    } catch (error) {
      console.error('Error creating scene:', error);
      toast.error('Failed to create scene');
    } finally {
      setIsCreating(false);
    }
  };

  const toggleCharacter = (characterId: string) => {
    setSelectedCharacters(prev =>
      prev.includes(characterId)
        ? prev.filter(id => id !== characterId)
        : [...prev, characterId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Camera size={20} />
        <h2 className="text-xl font-semibold">Scene Creator</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Scene</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="scene-name">Scene Name</Label>
            <Input
              id="scene-name"
              placeholder="e.g., Beach Party, Study Session, Date Night"
              value={sceneName}
              onChange={(e) => setSceneName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scene-description">Scene Description (Optional)</Label>
            <Textarea
              id="scene-description"
              placeholder="Describe the scene setting, mood, and what the characters will do..."
              value={sceneDescription}
              onChange={(e) => setSceneDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Select Characters</Label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
              {characters?.map((character) => (
                <div
                  key={character.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedCharacters.includes(character.id)
                      ? 'bg-accent border-primary'
                      : 'hover:bg-accent/50'
                  }`}
                  onClick={() => toggleCharacter(character.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedCharacters.includes(character.id)}
                    onChange={() => toggleCharacter(character.id)}
                    className="rounded"
                  />
                  <div className="flex items-center gap-3 flex-1">
                    <img
                      src={character.avatar}
                      alt={character.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-medium text-sm">{character.name}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Level {character.progression?.level || 1}</span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {character.rarity}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {(!characters || characters.length === 0) && (
                <div className="text-center text-muted-foreground py-8">
                  <Users size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No characters available</p>
                  <p className="text-xs">Create characters first to start scenes</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-muted-foreground">
              {selectedCharacters.length} character{selectedCharacters.length !== 1 ? 's' : ''} selected
            </div>
            <Button
              onClick={handleCreateScene}
              disabled={isCreating || !sceneName.trim() || selectedCharacters.length === 0}
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Play size={16} className="mr-2" />
                  Create Scene
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Scene Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Scene Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="justify-start h-auto p-4"
              onClick={() => {
                setSceneName('Casual Chat');
                setSceneDescription('A relaxed conversation in the common room');
                setSelectedCharacters(characters?.slice(0, 2).map(c => c.id) || []);
              }}
            >
              <div className="text-left">
                <div className="font-medium">Casual Chat</div>
                <div className="text-xs text-muted-foreground">Relaxed conversation</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto p-4"
              onClick={() => {
                setSceneName('Study Session');
                setSceneDescription('Focused learning and discussion');
                setSelectedCharacters(characters?.slice(0, 3).map(c => c.id) || []);
              }}
            >
              <div className="text-left">
                <div className="font-medium">Study Session</div>
                <div className="text-xs text-muted-foreground">Learning together</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto p-4"
              onClick={() => {
                setSceneName('Date Night');
                setSceneDescription('Romantic evening with special activities');
                setSelectedCharacters(characters?.slice(0, 2).map(c => c.id) || []);
              }}
            >
              <div className="text-left">
                <div className="font-medium">Date Night</div>
                <div className="text-xs text-muted-foreground">Romantic evening</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto p-4"
              onClick={() => {
                setSceneName('Party Time');
                setSceneDescription('Fun gathering with games and activities');
                setSelectedCharacters(characters?.map(c => c.id) || []);
              }}
            >
              <div className="text-left">
                <div className="font-medium">Party Time</div>
                <div className="text-xs text-muted-foreground">Group celebration</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}