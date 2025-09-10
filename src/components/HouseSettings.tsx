import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useHouse } from '@/hooks/useHouse';
import { AVAILABLE_MODELS } from '@/types';
import { toast } from 'sonner';
import { 
  Brain, 
  House as Home,
  Gear,
  Key,
  Image
} from '@phosphor-icons/react';

interface HouseSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HouseSettings({ open, onOpenChange }: HouseSettingsProps) {
  const { house, updateHouse } = useHouse();
  
  // House configuration state
  const [houseName, setHouseName] = useState(house.name);
  const [houseDescription, setHouseDescription] = useState(house.description || '');
  const [worldPrompt, setWorldPrompt] = useState(house.worldPrompt || '');
  const [copilotPrompt, setCopilotPrompt] = useState(house.copilotPrompt || '');
  const [copilotMaxTokens, setCopilotMaxTokens] = useState(house.copilotMaxTokens || 100);
  const [currency, setCurrency] = useState(house.currency);
  
  // AI Settings state  
  const [provider, setProvider] = useState(house.aiSettings?.provider || 'openrouter');
  const [selectedModel, setSelectedModel] = useState(house.aiSettings?.model || 'deepseek/deepseek-chat-v3.1');
  const [apiKey, setApiKey] = useState(house.aiSettings?.apiKey || '');
  const [imageProvider, setImageProvider] = useState(house.aiSettings?.imageProvider || 'venice');
  const [imageApiKey, setImageApiKey] = useState(house.aiSettings?.imageApiKey || '');

  // Auto character creator settings
  const [autoEnabled, setAutoEnabled] = useState(house.autoCreator?.enabled || false);
  const [autoInterval, setAutoInterval] = useState(house.autoCreator?.interval || 60);
  const [autoMaxChars, setAutoMaxChars] = useState(house.autoCreator?.maxCharacters || 10);

  // Sync state with house data when it changes
  useEffect(() => {
    setHouseName(house.name);
    setHouseDescription(house.description || '');
    setWorldPrompt(house.worldPrompt || '');
    setCopilotPrompt(house.copilotPrompt || '');
    setCopilotMaxTokens(house.copilotMaxTokens || 100);
    setCurrency(house.currency);
    setProvider(house.aiSettings?.provider || 'openrouter');
    setSelectedModel(house.aiSettings?.model || 'gpt-4o');
    setApiKey(house.aiSettings?.apiKey || '');
    setImageProvider(house.aiSettings?.imageProvider || 'venice');
    setImageApiKey(house.aiSettings?.imageApiKey || '');
    setAutoEnabled(house.autoCreator?.enabled || false);
    setAutoInterval(house.autoCreator?.interval || 60);
    setAutoMaxChars(house.autoCreator?.maxCharacters || 10);
  }, [house]);

  const handleSaveHouseSettings = () => {
    updateHouse({
      name: houseName,
      description: houseDescription,
      worldPrompt,
      copilotPrompt,
      copilotMaxTokens,
      currency,
      aiSettings: {
        ...house.aiSettings,
        provider: provider as 'openrouter',
        model: selectedModel,
        apiKey,
        imageProvider: imageProvider as 'venice' | 'none',
        imageApiKey
      },
      autoCreator: {
        ...house.autoCreator,
        enabled: autoEnabled,
        interval: autoInterval,
        maxCharacters: autoMaxChars,
        themes: house.autoCreator?.themes || ['fantasy', 'modern', 'sci-fi']
      }
    });
    toast.success('Settings updated successfully');
    onOpenChange(false); // Close dialog after saving
  };

  const handleSavePromptSettings = () => {
    updateHouse({
      worldPrompt,
      copilotPrompt
    });
    toast.success('Prompt settings updated successfully');
  };

  const handleSaveApiSettings = () => {
    console.log('=== Saving API Settings ===');
    console.log('Provider:', provider);
    console.log('Model:', selectedModel);
    console.log('API Key present:', !!apiKey);
    console.log('Image Provider:', imageProvider);
    console.log('Image API Key present:', !!imageApiKey);
    
    const newApiSettings = {
      ...house.aiSettings,
      provider: provider as 'openrouter',
      model: selectedModel,
      apiKey,
      imageProvider: imageProvider as 'venice' | 'none',
      imageApiKey
    };
    
    console.log('New AI settings:', newApiSettings);
    
    updateHouse({
      aiSettings: newApiSettings
    });
    
    // Verify the update
    setTimeout(() => {
      console.log('Updated house AI settings:', house.aiSettings);
    }, 100);
    
    toast.success('API settings saved successfully');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gear size={20} className="text-primary" />
            House Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="house" className="flex-1">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="house" className="flex items-center gap-2">
              <Home size={16} />
              House
            </TabsTrigger>
            <TabsTrigger value="api" className="flex items-center gap-2">
              <Key size={16} />
              API
            </TabsTrigger>
            <TabsTrigger value="prompts" className="flex items-center gap-2">
              <Brain size={16} />
              Prompts
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Gear size={16} />
              Advanced
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh] mt-4">
            {/* House Settings Tab */}
            <TabsContent value="house" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home size={18} />
                    Basic Settings
                  </CardTitle>
                  <CardDescription>
                    Configure your character house's basic information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="house-name">House Name</Label>
                      <Input
                        id="house-name"
                        value={houseName}
                        onChange={(e) => setHouseName(e.target.value)}
                        placeholder="Enter house name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Starting Currency</Label>
                      <Input
                        id="currency"
                        type="number"
                        value={currency}
                        onChange={(e) => setCurrency(Number(e.target.value))}
                        placeholder="1000"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="house-description">House Description</Label>
                    <Textarea
                      id="house-description"
                      value={houseDescription}
                      onChange={(e) => setHouseDescription(e.target.value)}
                      placeholder="Describe your character house..."
                      className="min-h-[100px]"
                    />
                  </div>

                  <Button onClick={handleSaveHouseSettings} className="w-full">
                    Save Settings
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* API Settings Tab */}
            <TabsContent value="api" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key size={18} />
                    AI Provider Settings
                  </CardTitle>
                  <CardDescription>
                    Configure your AI provider and models for character interactions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="provider">AI Provider</Label>
                    <Select
                      value={provider}
                      onValueChange={setProvider}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select AI provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openrouter">OpenRouter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {provider === 'openrouter' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="api-key">OpenRouter API Key</Label>
                        <Input
                          id="api-key"
                          type="password"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="sk-or-v1-..."
                        />
                        <p className="text-xs text-muted-foreground">
                          Get your API key from <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">openrouter.ai</a>
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ai-model">AI Model</Label>
                        <Select
                          value={selectedModel}
                          onValueChange={setSelectedModel}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select AI model" />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_MODELS.map(model => (
                              <SelectItem key={model.id} value={model.id}>
                                {model.name} - {model.provider}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Image size={16} />
                        Image Generation
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="image-provider">Image Provider</Label>
                        <Select
                          value={imageProvider}
                          onValueChange={setImageProvider}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select image provider" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="venice">Venice AI</SelectItem>
                            <SelectItem value="none">Disabled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {imageProvider === 'venice' && (
                        <div className="space-y-2">
                          <Label htmlFor="image-api-key">Venice AI API Key</Label>
                          <Input
                            id="image-api-key"
                            type="password"
                            value={imageApiKey}
                            onChange={(e) => setImageApiKey(e.target.value)}
                            placeholder="Your Venice AI API key..."
                          />
                          <p className="text-xs text-muted-foreground">
                            Get your API key from <a href="https://venice.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">venice.ai</a>
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Button onClick={handleSaveApiSettings} className="w-full">
                    Save API Settings
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Prompts Tab */}
            <TabsContent value="prompts" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain size={18} />
                    World & System Prompts
                  </CardTitle>
                  <CardDescription>
                    Configure the core prompts that define your house's behavior
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="world-prompt">World Prompt</Label>
                    <Textarea
                      id="world-prompt"
                      value={worldPrompt}
                      onChange={(e) => setWorldPrompt(e.target.value)}
                      placeholder="Define the world setting, rules, and atmosphere for your character house..."
                      className="min-h-[120px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="copilot-prompt">Copilot/House Manager Prompt</Label>
                    <Textarea
                      id="copilot-prompt"
                      value={copilotPrompt}
                      onChange={(e) => setCopilotPrompt(e.target.value)}
                      placeholder="Define how the house manager AI should behave, what it monitors, and how it helps..."
                      className="min-h-[120px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="copilot-max-tokens">Copilot Response Length (Max Tokens)</Label>
                    <div className="space-y-2">
                      <Input
                        id="copilot-max-tokens"
                        type="number"
                        min="25"
                        max="1000"
                        value={copilotMaxTokens}
                        onChange={(e) => setCopilotMaxTokens(parseInt(e.target.value) || 100)}
                        placeholder="100"
                      />
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>Controls how long the copilot's responses can be:</p>
                        <p>• 25-50: Very brief (1 sentence)</p>
                        <p>• 50-100: Short (2-3 sentences) - Recommended</p>
                        <p>• 100-200: Medium (1 paragraph)</p>
                        <p>• 200+: Long responses</p>
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleSavePromptSettings} className="w-full">
                    Save Prompt Settings
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gear size={18} />
                    Auto Character Creator
                  </CardTitle>
                  <CardDescription>
                    Configure automatic character generation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="auto-enabled"
                      checked={autoEnabled}
                      onCheckedChange={setAutoEnabled}
                    />
                    <Label htmlFor="auto-enabled">Enable Auto Character Creation</Label>
                  </div>

                  {autoEnabled && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="auto-interval">Creation Interval (minutes)</Label>
                          <Input
                            id="auto-interval"
                            type="number"
                            value={autoInterval}
                            onChange={(e) => setAutoInterval(Number(e.target.value))}
                            placeholder="60"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="auto-max">Max Characters</Label>
                          <Input
                            id="auto-max"
                            type="number"
                            value={autoMaxChars}
                            onChange={(e) => setAutoMaxChars(Number(e.target.value))}
                            placeholder="10"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <Button onClick={handleSaveHouseSettings} className="w-full">
                    Save Advanced Settings
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}