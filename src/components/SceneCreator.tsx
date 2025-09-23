import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useChat } from '@/hooks/useChat';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { useSceneMode } from '@/hooks/useSceneMode';
import { getDb, saveDatabase } from '@/lib/db';
import { logger } from '@/lib/logger';
import { Camera, Play, Users } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface SceneCreatorProps {
  onSceneCreated?: (sessionId: string) => void;
}

export function SceneCreator({ onSceneCreated }: SceneCreatorProps) {
  const { characters } = useHouseFileStorage();
  const { createSceneSession, updateSceneSession } = useSceneMode();
  const { createSession } = useChat();
  const [sceneName, setSceneName] = useState('');
  const [sceneDescription, setSceneDescription] = useState('');
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [hiddenGoals, setHiddenGoals] = useState<Record<string, { goal: string; priority: 'low' | 'medium' | 'high' }>>({});

  // Keep hidden goals in sync with selection
  useEffect(() => {
    setHiddenGoals(prev => {
      const next: Record<string, { goal: string; priority: 'low' | 'medium' | 'high' }> = {};
      for (const id of selectedCharacters) {
        next[id] = prev[id] || { goal: '', priority: 'medium' };
      }
      return next;
    });
  }, [selectedCharacters]);

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
      // First, create a scene session (in-memory)
      const sessionId = createSceneSession(selectedCharacters, {
        name: sceneName,
        description: sceneDescription,
        hiddenGoals
      });

      if (sessionId) {
        // Then, create a backing chat session of type 'scene' so AI can act on hidden goals
        let chatSessionId: string | null = null;
        try {
          chatSessionId = await createSession('scene', selectedCharacters, {
            hiddenGoals: Object.fromEntries(
              Object.entries(hiddenGoals).map(([cid, v]) => [cid, { goal: v.goal, priority: v.priority }])
            )
          });
        } catch (e) {
          logger.warn('Failed to create backing chat session for scene:', e);
        }

        // Persist mapping scene -> chat in settings and update scene session
        try {
          if (chatSessionId) {
            const { db } = await getDb();
            const key = `scene_chat:${sessionId}`;
            const serialized = JSON.stringify({ chatSessionId });
            const before: any[] = [];
            db.exec({ sql: 'SELECT total_changes() AS c', rowMode: 'object', callback: (r: any) => before.push(r) });
            db.exec({ sql: 'UPDATE settings SET value = ? WHERE key = ?', bind: [serialized, key] });
            const after: any[] = [];
            db.exec({ sql: 'SELECT total_changes() AS c', rowMode: 'object', callback: (r: any) => after.push(r) });
            const changed = (after[0]?.c ?? 0) - (before[0]?.c ?? 0);
            if (changed === 0) {
              db.exec({ sql: 'INSERT INTO settings (key, value) VALUES (?, ?)', bind: [key, serialized] });
            }
            await saveDatabase();
            updateSceneSession(sessionId, { chatSessionId });
          }
        } catch (e) {
          logger.warn('Failed to persist scene->chat mapping:', e);
        }

        toast.success(`Scene "${sceneName}" created!`);
        onSceneCreated?.(sessionId);
        // Reset form
        setSceneName('');
        setSceneDescription('');
        setSelectedCharacters([]);
        setHiddenGoals({});
      } else {
        toast.error('Failed to create scene');
      }
    } catch (error) {
  logger.error('Error creating scene:', error);
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
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[rgba(255,255,255,0.06)] mr-2"></div>
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

      {/* Hidden Objectives */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Hidden Objectives</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedCharacters.length === 0 && (
            <div className="text-sm text-muted-foreground">
              Select participants above to set their secret objectives.
            </div>
          )}
          {selectedCharacters.map((id) => {
            const ch = (characters || []).find(c => c.id === id);
            if (!ch) return null;
            const goal = hiddenGoals[id]?.goal || '';
            const priority = hiddenGoals[id]?.priority || 'medium';
            return (
              <div key={id} className="space-y-2 p-3 rounded-md border border-zinc-800 bg-zinc-900">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{ch.name}</div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Priority</Label>
                    <Select
                      value={priority}
                      onValueChange={(val: 'low' | 'medium' | 'high') =>
                        setHiddenGoals(prev => ({
                          ...prev,
                          [id]: { goal: prev[id]?.goal || '', priority: val }
                        }))
                      }
                    >
                      <SelectTrigger className="w-[130px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Textarea
                  value={goal}
                  onChange={(e) =>
                    setHiddenGoals(prev => ({
                      ...prev,
                      [id]: { goal: e.target.value, priority: prev[id]?.priority || 'medium' }
                    }))
                  }
                  placeholder={`What does ${ch.name} secretly want to achieve in this scene? (only visible to you)`}
                  rows={3}
                />
                <div className="text-xs text-muted-foreground">
                  These are secret objectives to guide behavior. They will not be shown to other characters.
                </div>
              </div>
            );
          })}
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