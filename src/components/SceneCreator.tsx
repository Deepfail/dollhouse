import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useHouse } from '@/hooks/useHouse';
import { useSceneMode } from '@/hooks/useSceneMode';
import { SceneObjective } from '@/types';
import { FilmStrip, Users, Target, Play, Plus, X } from '@phosphor-icons/react';
import { toast } from 'sonner';

interface SceneCreatorProps {
  onSceneCreated: (sessionId: string) => void;
}

export const SceneCreator: React.FC<SceneCreatorProps> = ({ onSceneCreated }) => {
  const { house } = useHouse();
  const { createSceneSession } = useSceneMode();
  
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [objectives, setObjectives] = useState<Record<string, string>>({});
  const [sceneContext, setSceneContext] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCharacterToggle = (characterId: string) => {
    setSelectedCharacters(prev => {
      if (prev.includes(characterId)) {
        const newSelection = prev.filter(id => id !== characterId);
        // Remove objective for deselected character
        setObjectives(prevObj => {
          const newObj = { ...prevObj };
          delete newObj[characterId];
          return newObj;
        });
        return newSelection;
      } else {
        return [...prev, characterId];
      }
    });
  };

  const handleObjectiveChange = (characterId: string, objective: string) => {
    setObjectives(prev => ({
      ...prev,
      [characterId]: objective
    }));
  };

  const generateRandomObjectives = async () => {
    if (selectedCharacters.length < 2) {
      toast.error('Select at least 2 characters first');
      return;
    }

    const charactersInfo = selectedCharacters.map(id => {
      const char = house.characters?.find(c => c.id === id);
      return `${char?.name} (${char?.personality})`;
    }).join(', ');

    const objectivePrompt = `Generate unique secret objectives for ${selectedCharacters.length} characters in a scene.
      
Characters: ${charactersInfo}
Scene context: ${sceneContext || 'A social gathering'}

Create objectives that:
- Are achievable through conversation and social interaction
- Create potential for interesting conflicts or alliances
- Are not directly opposing but create natural tension
- Fit each character's personality

Format as JSON object with character names as keys and objectives as values.
Each objective should be 1-2 sentences describing what the character wants to achieve.`;

    try {
      // Use OpenRouter for objective generation
      const apiKey = house.aiSettings?.apiKey;
      if (!apiKey) {
        throw new Error('OpenRouter API key not configured');
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Character Creator House'
        },
        body: JSON.stringify({
          model: house.aiSettings.model || 'deepseek/deepseek-chat-v3.1',
          messages: [
            {
              role: 'user',
              content: objectivePrompt
            }
          ],
          temperature: 0.8,
          max_tokens: 800
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const data = await response.json();
      const responseContent = data.choices[0]?.message?.content;
      
      if (!responseContent) {
        throw new Error('No response from AI service');
      }
      
      // Try to parse as JSON, fallback to simple text parsing
      let generatedObjectives: Record<string, string> = {};
      
      try {
        generatedObjectives = JSON.parse(responseContent);
      } catch {
        // If JSON parsing fails, create simple objectives
        selectedCharacters.forEach((characterId, index) => {
          const character = house.characters?.find(c => c.id === characterId);
          if (character) {
            generatedObjectives[character.name] = `Objective ${index + 1}: Engage meaningfully with other characters based on your personality.`;
          }
        });
      }
      
      const mappedObjectives: Record<string, string> = {};
      selectedCharacters.forEach(characterId => {
        const character = house.characters?.find(c => c.id === characterId);
        if (character && generatedObjectives[character.name]) {
          mappedObjectives[characterId] = generatedObjectives[character.name];
        }
      });
      
      setObjectives(mappedObjectives);
      toast.success('Random objectives generated!');
    } catch (error) {
      console.error('Failed to generate objectives:', error);
      toast.error('Failed to generate objectives. Try entering them manually.');
    }
  };

  const handleCreateScene = async () => {
    if (selectedCharacters.length < 2) {
      toast.error('Select at least 2 characters');
      return;
    }

    const missingObjectives = selectedCharacters.filter(id => !objectives[id]?.trim());
    if (missingObjectives.length > 0) {
      toast.error('All characters need objectives');
      return;
    }

    setIsCreating(true);
    try {
      const sceneObjectives: SceneObjective[] = selectedCharacters.map(id => ({
        characterId: id,
        objective: objectives[id],
        secret: true,
        priority: 'medium'
      }));

      const sessionId = await createSceneSession(
        selectedCharacters,
        sceneObjectives,
        sceneContext || 'A spontaneous gathering where characters interact based on their secret objectives.'
      );

      console.log('Scene created with ID:', sessionId);
      onSceneCreated(sessionId);
      
      // Reset form
      setSelectedCharacters([]);
      setObjectives({});
      setSceneContext('');
      
    } catch (error) {
      toast.error('Failed to create scene');
    } finally {
      setIsCreating(false);
    }
  };

  const removeCharacter = (characterId: string) => {
    setSelectedCharacters(prev => prev.filter(id => id !== characterId));
    setObjectives(prev => {
      const newObj = { ...prev };
      delete newObj[characterId];
      return newObj;
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FilmStrip className="text-primary" />
          Scene Creator
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Create interactive scenes where characters pursue secret objectives
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Character Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Users size={16} />
              Select Characters ({selectedCharacters.length})
            </Label>
          </div>
          
          <div className="space-y-2">
            {(house.characters || []).map(character => (
              <div
                key={character.id}
                className={`
                  p-3 border rounded-lg cursor-pointer transition-colors
                  ${selectedCharacters.includes(character.id) 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50'
                  }
                `}
                onClick={() => handleCharacterToggle(character.id)}
              >
                <div className="flex items-start gap-3">
                  <Checkbox 
                    checked={selectedCharacters.includes(character.id)}
                    onChange={() => {}} // Handled by parent onClick
                    className="mt-0.5 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-tight break-words">
                      {character.name}
                    </p>
                    <p className="text-xs text-muted-foreground break-words leading-relaxed">
                      {character.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Characters & Objectives */}
        {selectedCharacters.length > 0 && (
          <>
            <Separator />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Target size={16} />
                  Character Objectives
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateRandomObjectives}
                >
                  <Plus size={16} />
                  Generate Random
                </Button>
              </div>
              
              <div className="space-y-3">
                {selectedCharacters.map(characterId => {
                  const character = house.characters?.find(c => c.id === characterId);
                  if (!character) return null;
                  
                  return (
                    <div key={characterId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{character.name}</Badge>
                          <span className="text-sm text-muted-foreground">
                            ({character.role})
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCharacter(characterId)}
                        >
                          <X size={16} />
                        </Button>
                      </div>
                      <Textarea
                        placeholder={`What is ${character.name}'s secret objective in this scene?`}
                        value={objectives[characterId] || ''}
                        onChange={(e) => handleObjectiveChange(characterId, e.target.value)}
                        rows={2}
                        className="resize-none"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Scene Context */}
        <div className="space-y-2">
          <Label>Scene Context (Optional)</Label>
          <Textarea
            placeholder="Describe the setting and situation where characters will interact..."
            value={sceneContext}
            onChange={(e) => setSceneContext(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Create Button */}
        <Button 
          onClick={handleCreateScene}
          disabled={selectedCharacters.length < 2 || isCreating}
          className="w-full"
          size="lg"
        >
          <Play size={20} />
          {isCreating ? 'Creating Scene...' : 'Start Scene'}
        </Button>

        {selectedCharacters.length < 2 && (
          <p className="text-sm text-muted-foreground text-center">
            Select at least 2 characters to create a scene
          </p>
        )}
      </CardContent>
    </Card>
  );
};