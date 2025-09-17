import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useRepositoryKV } from '@/hooks/useRepositoryStorage';
import { AVAILABLE_MODELS } from '@/types';
import { Check, Gear, X } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface HouseSettingsProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface AISettings {
  textProvider: 'openrouter' | 'venice' | 'anthropic' | 'openai';
  textApiKey?: string;
  textModel: string;
  textApiUrl?: string;
  imageProvider: 'venice' | 'openai' | 'stability' | 'none';
  imageModel?: string;
  imageApiKey?: string;
  imageApiUrl?: string;
}

interface HouseConfig {
  name: string;
  worldPrompt?: string;
  copilotPrompt?: string;
  copilotMaxTokens?: number;
  aiSettings: AISettings;
  autoCreator: {
    enabled: boolean;
    interval: number;
    maxCharacters: number;
    themes: string[];
  };
}

const DEFAULT_CONFIG: HouseConfig = {
  name: 'Digital Dollhouse',
  worldPrompt: '',
  copilotPrompt: 'You are a helpful AI assistant monitoring the digital dollhouse. You help manage character relationships, suggest activities, and ensure everyone has a good time.',
  copilotMaxTokens: 1000,
  aiSettings: {
    textProvider: 'openrouter',
    textModel: 'deepseek/deepseek-chat',
    imageProvider: 'venice',
    imageModel: 'venice-sd35'
  },
  autoCreator: {
    enabled: false,
    interval: 60,
    maxCharacters: 10,
    themes: ['fantasy', 'modern', 'sci-fi']
  }
};

export function HouseSettings({ open, onOpenChange }: HouseSettingsProps) {
  const [config, setConfig] = useRepositoryKV<HouseConfig>('house_config', DEFAULT_CONFIG);
  const [localConfig, setLocalConfig] = useState<HouseConfig>(config);
  const [hasChanges, setHasChanges] = useState(false);

  // Update local config when config changes
  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  // Check for changes
  useEffect(() => {
    const hasChanged = JSON.stringify(localConfig) !== JSON.stringify(config);
    setHasChanges(hasChanged);
  }, [localConfig, config]);

  const handleSave = () => {
    setConfig(localConfig);
    toast.success('House settings saved!');
    setHasChanges(false);
  };

  const handleCancel = () => {
    setLocalConfig(config);
    setHasChanges(false);
  };

  const updateConfig = (updates: Partial<HouseConfig>) => {
    setLocalConfig(prev => ({ ...prev, ...updates }));
  };

  const updateAISettings = (updates: Partial<AISettings>) => {
    setLocalConfig(prev => ({
      ...prev,
      aiSettings: { ...prev.aiSettings, ...updates }
    }));
  };

  const updateAutoCreator = (updates: Partial<HouseConfig['autoCreator']>) => {
    setLocalConfig(prev => ({
      ...prev,
      autoCreator: { ...prev.autoCreator, ...updates }
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
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
              {/* Text AI Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  Text/Chat AI
                  <Badge variant="outline">{localConfig.aiSettings.textProvider}</Badge>
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select
                      value={localConfig.aiSettings.textProvider}
                      onValueChange={(value: any) => updateAISettings({ textProvider: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openrouter">OpenRouter</SelectItem>
                        <SelectItem value="venice">Venice AI</SelectItem>
                        <SelectItem value="anthropic">Anthropic</SelectItem>
                        <SelectItem value="openai">OpenAI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Select
                      value={localConfig.aiSettings.textModel}
                      onValueChange={(value) => updateAISettings({ textModel: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_MODELS.map(model => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name} ({model.provider})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="text-api-key">API Key</Label>
                  <Input
                    id="text-api-key"
                    type="password"
                    value={localConfig.aiSettings.textApiKey || ''}
                    onChange={(e) => updateAISettings({ textApiKey: e.target.value })}
                    placeholder="Enter your API key"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="text-api-url">Custom API URL (Optional)</Label>
                  <Input
                    id="text-api-url"
                    value={localConfig.aiSettings.textApiUrl || ''}
                    onChange={(e) => updateAISettings({ textApiUrl: e.target.value })}
                    placeholder="https://api.example.com/v1"
                  />
                </div>
              </div>

              {/* Image AI Settings */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  Image Generation
                  <Badge variant="outline">{localConfig.aiSettings.imageProvider}</Badge>
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select
                      value={localConfig.aiSettings.imageProvider}
                      onValueChange={(value: any) => updateAISettings({ imageProvider: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="venice">Venice AI</SelectItem>
                        <SelectItem value="openai">OpenAI (DALL-E)</SelectItem>
                        <SelectItem value="stability">Stability AI</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Input
                      value={localConfig.aiSettings.imageModel || ''}
                      onChange={(e) => updateAISettings({ imageModel: e.target.value })}
                      placeholder="venice-sd35"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image-api-key">API Key</Label>
                  <Input
                    id="image-api-key"
                    type="password"
                    value={localConfig.aiSettings.imageApiKey || ''}
                    onChange={(e) => updateAISettings({ imageApiKey: e.target.value })}
                    placeholder="Enter your image API key"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image-api-url">Custom API URL (Optional)</Label>
                  <Input
                    id="image-api-url"
                    value={localConfig.aiSettings.imageApiUrl || ''}
                    onChange={(e) => updateAISettings({ imageApiUrl: e.target.value })}
                    placeholder="https://api.example.com/v1"
                  />
                </div>
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
                  min={100}
                  max={4000}
                />
                <p className="text-sm text-muted-foreground">
                  Maximum tokens the copilot can use per response.
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
