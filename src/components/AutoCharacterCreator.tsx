import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { useAutoCharacterCreator } from '@/hooks/useAutoCharacterCreator';
import { Sparkle, Plus, Gear, Clock, Users, Crown, Star, Diamond } from '@phosphor-icons/react';
import { toast } from 'sonner';

// Available character themes from the generator
const AVAILABLE_THEMES = [
  { id: 'college', name: 'College', description: 'Promiscuous, big tits and ass. Looking for fun.', icon: '🎓' },
  { id: 'prime', name: 'Prime', description: 'Rebellious, adventurous, craving attention and validation.', icon: '🏫' },
  { id: 'fresh', name: 'Fresh', description: 'Playful, embodying a fun spirit.', icon: '🧸' }
];

const RARITY_CONFIG = {
  common: { name: 'Common', color: 'bg-gray-500', icon: Star, multiplier: 1 },
  rare: { name: 'Rare', color: 'bg-blue-500', icon: Crown, multiplier: 1.5 },
  legendary: { name: 'Legendary', color: 'bg-yellow-500', icon: Diamond, multiplier: 2 }
};

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
      const rarityIcon = RARITY_CONFIG[character.rarity].icon;
      toast.success(`Created ${character.rarity} character: ${character.name}`, {
        icon: React.createElement(rarityIcon, { size: 16 })
      });
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

  const toggleTheme = (themeId: string) => {
    setConfig(prev => ({
      ...prev,
      themes: prev.themes.includes(themeId)
        ? prev.themes.filter(t => t !== themeId)
        : [...prev.themes, themeId]
    }));
  };

  const getRarityStats = () => {
    // This would ideally come from the house state, but for now we'll show config
    const total = config.rarityWeights.common + config.rarityWeights.rare + config.rarityWeights.legendary;
    return {
      common: Math.round((config.rarityWeights.common / total) * 100),
      rare: Math.round((config.rarityWeights.rare / total) * 100),
      legendary: Math.round((config.rarityWeights.legendary / total) * 100)
    };
  };

  const rarityStats = getRarityStats();

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
              <div className="space-y-3">
                <Label className="text-base font-medium">Character Themes</Label>
                <p className="text-sm text-muted-foreground">
                  Select which age groups to generate characters from
                </p>
                <div className="grid gap-3">
                  {AVAILABLE_THEMES.map(theme => (
                    <div key={theme.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        id={theme.id}
                        checked={config.themes.includes(theme.id)}
                        onCheckedChange={() => toggleTheme(theme.id)}
                      />
                      <div className="flex-1 space-y-1">
                        <Label 
                          htmlFor={theme.id} 
                          className="text-sm font-medium cursor-pointer flex items-center gap-2"
                        >
                          <span className="text-lg">{theme.icon}</span>
                          {theme.name}
                        </Label>
                        <p className="text-xs text-muted-foreground">{theme.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {config.themes.length === 0 && (
                  <p className="text-sm text-destructive">Please select at least one theme</p>
                )}
              </div>

              {/* Rarity Configuration */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Character Rarity</Label>
                <p className="text-sm text-muted-foreground">
                  Control how often different rarity characters appear. Higher rarity = better stats and abilities.
                </p>
                
                <div className="grid gap-4">
                  {/* Common */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${RARITY_CONFIG.common.color}`} />
                        <span className="text-sm font-medium">{RARITY_CONFIG.common.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {rarityStats.common}%
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Basic stats, common traits
                      </span>
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

                  {/* Rare */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${RARITY_CONFIG.rare.color}`} />
                        <span className="text-sm font-medium">{RARITY_CONFIG.rare.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {rarityStats.rare}%
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Enhanced stats, special abilities
                      </span>
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

                  {/* Legendary */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${RARITY_CONFIG.legendary.color}`} />
                        <span className="text-sm font-medium">{RARITY_CONFIG.legendary.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {rarityStats.legendary}%
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Maximum stats, unique abilities, special rooms
                      </span>
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

                {/* Rarity Benefits Preview */}
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  <h5 className="text-sm font-medium">Rarity Benefits:</h5>
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span>Common:</span>
                      <span>1x base stats</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rare:</span>
                      <span>1.5x base stats + special trait</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Legendary:</span>
                      <span>2x base stats + unique ability + VIP room</span>
                    </div>
                  </div>
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