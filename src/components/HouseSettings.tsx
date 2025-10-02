import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
// ...existing code...
import { AISettings } from '@/components/AISettings';
import { useFileStorage } from '@/hooks/useFileStorage';
import { repositoryStorage } from '@/hooks/useRepositoryStorage';
import { Check, Gear, X } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface HouseSettingsProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface AISettingsConfig {
  textProvider: 'openrouter' | 'venice' | 'anthropic' | 'openai';
  textApiKey?: string;
  textModel: string;
  textApiUrl?: string;
  imageProvider: 'venice' | 'openai' | 'stability' | 'none';
  imageModel?: string;
  imageModelCustom?: string;
  imageApiKey?: string;
  imageApiUrl?: string;
}

interface HouseConfig {
  name: string;
  worldPrompt?: string;
  copilotPrompt?: string;
  copilotMaxTokens?: number;
  copilotUseHouseContext?: boolean;
  copilotContextDetail?: 'lite' | 'balanced' | 'detailed';
  aiSettings: AISettingsConfig;
  autoCreator: {
    enabled: boolean;
    interval: number;
    maxCharacters: number;
    themes: string[];
  };
}

const DEFAULT_CONFIG: HouseConfig = {
  name: 'The Dollhouse',
  worldPrompt: '',
  copilotPrompt: '',

  copilotMaxTokens: 500,
  copilotUseHouseContext: true,
  copilotContextDetail: 'balanced',
  aiSettings: {
    textProvider: 'openrouter',
    textModel: 'deepseek/deepseek-chat',
    imageProvider: 'venice',
    imageModel: 'venice-sd35',
    imageModelCustom: ''
  },
  autoCreator: {
    enabled: false,
    interval: 60,
    maxCharacters: 10,
    themes: ['college', 'ad girls', 'men']
  }
};

export function HouseSettings({ open, onOpenChange }: HouseSettingsProps) {
  const [localConfig, setLocalConfig] = useState<HouseConfig>(DEFAULT_CONFIG);
  const [originalConfig, setOriginalConfig] = useState<HouseConfig>(DEFAULT_CONFIG);
  const [hasChanges, setHasChanges] = useState(false);
  const { setData: setSettingsForceUpdate } = useFileStorage<number>('settings-force-update.json', 0);

  // Load settings from repositoryStorage on mount/open
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const config = await repositoryStorage.get<HouseConfig>('house_config');
        if (config && Object.keys(config).length > 0) {
          const configPartial = config as Partial<HouseConfig>;
          // Defensive: ensure aiSettings and autoCreator are always present
          const safeConfig: HouseConfig = {
            ...DEFAULT_CONFIG,
            ...configPartial,
            aiSettings: { ...DEFAULT_CONFIG.aiSettings, ...(configPartial.aiSettings ?? {}) },
            autoCreator: { ...DEFAULT_CONFIG.autoCreator, ...(configPartial.autoCreator ?? {}) }
          };
          setLocalConfig(safeConfig);
          setOriginalConfig(safeConfig);
        } else {
          setLocalConfig(DEFAULT_CONFIG);
          setOriginalConfig(DEFAULT_CONFIG);
        }
      } catch (error) {
        console.error('Failed to load house settings', error);
        setLocalConfig(DEFAULT_CONFIG);
        setOriginalConfig(DEFAULT_CONFIG);
      }
    })();
  }, [open]);

  // Track changes
  useEffect(() => {
    setHasChanges(JSON.stringify(localConfig) !== JSON.stringify(originalConfig));
  }, [localConfig, originalConfig]);

  const handleSave = async () => {
    try {
      await repositoryStorage.set('house_config', localConfig);
  await setSettingsForceUpdate(Date.now());
      setOriginalConfig(localConfig);
      toast.success('House settings saved!');
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save house settings', error);
      toast.error('Failed to save settings');
    }
  };

  const handleCancel = () => {
    setLocalConfig(originalConfig);
    setHasChanges(false);
  };

  const updateConfig = (updates: Partial<HouseConfig>) => {
    setLocalConfig(prev => ({ ...prev, ...updates }));
  };

  const updateAutoCreator = (updates: Partial<HouseConfig['autoCreator']>) => {
    setLocalConfig(prev => ({
      ...prev,
      autoCreator: { ...prev.autoCreator, ...updates }
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-gray-900 text-white" style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Gear size={20} />
            House Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="ai">AI Settings</TabsTrigger>
            <TabsTrigger value="copilot">Copilot</TabsTrigger>
            <TabsTrigger value="auto">Auto Creator</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* General Settings */}
            <TabsContent value="general" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label htmlFor="house-name">House Name</Label>
                <Input
                  id="house-name"
                  value={localConfig.name}
                  onChange={(e) => updateConfig({ name: e.target.value })}
                  placeholder="Enter house name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="world-prompt">World Prompt</Label>
                <Textarea
                  id="world-prompt"
                  value={localConfig.worldPrompt || ''}
                  onChange={(e) => updateConfig({ worldPrompt: e.target.value })}
                  placeholder="Describe the world/universe your characters live in..."
                  rows={4}
                />
                <p className="text-sm text-muted-foreground">
                  This prompt helps set the context for all AI interactions in your house.
                </p>
              </div>
            </TabsContent>

            {/* AI Settings */}
            <TabsContent value="ai" className="space-y-6 mt-0">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Manage AI providers, models, and keys in the dedicated AI Settings dialog.
                </p>
                <AISettings>
                  <Button variant="outline">Open AI Settings</Button>
                </AISettings>
              </div>
            </TabsContent>

            {/* Copilot Settings */}
            <TabsContent value="copilot" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label htmlFor="copilot-prompt">Copilot Prompt</Label>
                <Textarea
                  id="copilot-prompt"
                  value={localConfig.copilotPrompt || ''}
                  onChange={(e) => updateConfig({ copilotPrompt: e.target.value })}
                  placeholder="Instructions for the house copilot AI..."
                  rows={4}
                />
                <p className="text-sm text-muted-foreground">
                  This prompt defines how the copilot behaves and monitors your house.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="copilot-tokens">Max Tokens</Label>
                <Input
                  id="copilot-tokens"
                  type="number"
                  value={localConfig.copilotMaxTokens || 1000}
                  onChange={(e) => updateConfig({ copilotMaxTokens: parseInt(e.target.value) || 1000 })}
                  min={1}
                  max={4000}
                />
                <p className="text-sm text-muted-foreground">
                  Maximum tokens the copilot can use per response.
                </p>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <Label>Include House Context</Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, the copilot automatically receives the world prompt and current roster on every reply.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={localConfig.copilotUseHouseContext !== false}
                    onCheckedChange={(enabled) => updateConfig({ copilotUseHouseContext: enabled })}
                  />
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded border ${
                      localConfig.copilotUseHouseContext !== false
                        ? 'border-green-500 text-green-400 bg-green-500/10'
                        : 'border-zinc-600 text-zinc-300 bg-zinc-700/30'
                    }`}
                  >
                    {localConfig.copilotUseHouseContext !== false ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Context Detail Level</Label>
                <Select
                  value={localConfig.copilotContextDetail || 'balanced'}
                  onValueChange={(value) =>
                    updateConfig({ copilotContextDetail: value as 'lite' | 'balanced' | 'detailed' })
                  }
                >
                  <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                    <SelectValue placeholder="Choose detail level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lite">Friend Mode (keep it casual)</SelectItem>
                    <SelectItem value="balanced">Balanced (use detail when asked)</SelectItem>
                    <SelectItem value="detailed">Analyst (complete breakdowns)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Friend Mode keeps context light so the copilot stays conversational; switch to Analyst when you want deep stat breakdowns on call.
                </p>
              </div>
            </TabsContent>

            {/* Auto Creator Settings */}
            <TabsContent value="auto" className="space-y-4 mt-0">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Auto Character Creator</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically create new characters over time
                  </p>
                </div>
                <Switch
                  checked={localConfig.autoCreator.enabled}
                  onCheckedChange={(enabled) => updateAutoCreator({ enabled })}
                />
              </div>

              {localConfig.autoCreator.enabled && (
                <div className="space-y-4 pl-4 border-l-2 border-muted">
                  <div className="space-y-2">
                    <Label htmlFor="auto-interval">Creation Interval (minutes)</Label>
                    <Input
                      id="auto-interval"
                      type="number"
                      value={localConfig.autoCreator.interval}
                      onChange={(e) => updateAutoCreator({ interval: parseInt(e.target.value) || 60 })}
                      min={15}
                      max={1440}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="auto-max">Max Characters</Label>
                    <Input
                      id="auto-max"
                      type="number"
                      value={localConfig.autoCreator.maxCharacters}
                      onChange={(e) => updateAutoCreator({ maxCharacters: parseInt(e.target.value) || 10 })}
                      min={1}
                      max={50}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Themes</Label>
                    <Input
                      value={localConfig.autoCreator.themes.join(', ')}
                      onChange={(e) => updateAutoCreator({
                        themes: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                      })}
                      placeholder="fantasy, modern, sci-fi"
                    />
                    <p className="text-sm text-muted-foreground">
                      Comma-separated list of themes for auto-generated characters
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel} disabled={!hasChanges}>
            <X size={16} className="mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges}>
            <Check size={16} className="mr-2" />
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
