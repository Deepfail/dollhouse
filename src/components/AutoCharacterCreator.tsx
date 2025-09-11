import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAutoCharacterCreator } from '@/hooks/useAutoCharacterCreator';
import { Sparkle, Plus, Gear, Clock, Users } from '@phosphor-icons/react';
import { toast } from 'sonner';

export const AutoCharacterCreator: React.FC = () => {
  const {
    config,
    setConfig,
    createRandomCharacter,
    isCreating,
    nextCreationTime,
    toggleAutoCreator,
    updateAutoCreatorConfig,
    isEnabled,
    maxCharacters,
    interval
  } = useAutoCharacterCreator();
  
  const [showSettings, setShowSettings] = useState(false);
  const [localMaxCharacters, setLocalMaxCharacters] = useState(maxCharacters);
  const [localInterval, setLocalInterval] = useState(interval);

  const handleCreateNow = async () => {
    try {
      const character = await createRandomCharacter();
      toast.success(`Created new character: ${character.name}`);
    } catch (error) {
      toast.error('Failed to create character');
    }
  };

  const handleSaveSettings = async () => {
    await updateAutoCreatorConfig({
      maxCharacters: localMaxCharacters,
      interval: localInterval
    });
    setShowSettings(false);
    toast.success('Auto-creator settings saved');
  };

  const addTheme = (theme: string) => {
    if (theme && !config.themes.includes(theme)) {
      setConfig(prev => ({
        ...prev,
        themes: [...prev.themes, theme]
      }));
    }
  };

  const removeTheme = (theme: string) => {
    setConfig(prev => ({
      ...prev,
      themes: prev.themes.filter(t => t !== theme)
    }));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkle className="text-primary" />
          Auto Character Creator
          <Badge variant={isEnabled ? "default" : "secondary"}>
            {isEnabled ? "Active" : "Inactive"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Controls */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label>Auto-create characters</Label>
            <p className="text-sm text-muted-foreground">
              Automatically generate new characters periodically
            </p>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={toggleAutoCreator}
          />
        </div>

        <Separator />

        {/* Status Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="text-muted-foreground" size={16} />
            <div>
              <p className="font-medium">Interval</p>
              <p className="text-muted-foreground">{interval} minutes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="text-muted-foreground" size={16} />
            <div>
              <p className="font-medium">Max Characters</p>
              <p className="text-muted-foreground">{maxCharacters}</p>
            </div>
          </div>
        </div>

        {nextCreationTime && isEnabled && (
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm font-medium">Next Creation:</p>
            <p className="text-sm text-muted-foreground">
              {nextCreationTime.toLocaleString()}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={handleCreateNow}
            disabled={isCreating}
            className="flex-1"
          >
            <Plus size={16} />
            {isCreating ? 'Creating...' : 'Create Now'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Gear size={16} />
          </Button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <>
            <Separator />
            <div className="space-y-4">
              <h4 className="font-medium">Settings</h4>
              
              {/* Max Characters */}
              <div className="space-y-2">
                <Label>Maximum Characters: {localMaxCharacters}</Label>
                <Slider
                  value={[localMaxCharacters]}
                  onValueChange={([value]) => setLocalMaxCharacters(value)}
                  min={5}
                  max={50}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Creation Interval */}
              <div className="space-y-2">
                <Label>Creation Interval: {localInterval} minutes</Label>
                <Slider
                  value={[localInterval]}
                  onValueChange={([value]) => setLocalInterval(value)}
                  min={5}
                  max={120}
                  step={5}
                  className="w-full"
                />
              </div>

              {/* Themes */}
              <div className="space-y-2">
                <Label>Character Themes</Label>
                <div className="flex flex-wrap gap-2">
                  {config.themes.map(theme => (
                    <Badge 
                      key={theme}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeTheme(theme)}
                    >
                      {theme} ×
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Add new theme..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addTheme((e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                </div>
              </div>

              {/* Rarity Weights */}
              <div className="space-y-3">
                <Label>Character Rarity Weights</Label>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Common: {config.rarityWeights.common}%</span>
                  </div>
                  <Slider
                    value={[config.rarityWeights.common]}
                    onValueChange={([value]) => 
                      setConfig(prev => ({
                        ...prev,
                        rarityWeights: { ...prev.rarityWeights, common: value }
                      }))
                    }
                    min={0}
                    max={100}
                    step={5}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Rare: {config.rarityWeights.rare}%</span>
                  </div>
                  <Slider
                    value={[config.rarityWeights.rare]}
                    onValueChange={([value]) => 
                      setConfig(prev => ({
                        ...prev,
                        rarityWeights: { ...prev.rarityWeights, rare: value }
                      }))
                    }
                    min={0}
                    max={100}
                    step={5}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Legendary: {config.rarityWeights.legendary}%</span>
                  </div>
                  <Slider
                    value={[config.rarityWeights.legendary]}
                    onValueChange={([value]) => 
                      setConfig(prev => ({
                        ...prev,
                        rarityWeights: { ...prev.rarityWeights, legendary: value }
                      }))
                    }
                    min={0}
                    max={100}
                    step={5}
                  />
                </div>
              </div>

              <Button onClick={handleSaveSettings} className="w-full">
                Save Settings
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};