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
import { useKV } from '@github/spark/hooks';
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
  
  // Force update trigger to help with persistence issues
  const [forceUpdate, setForceUpdate] = useKV<number>('settings-force-update', 0);
  
  // House configuration state
  const [houseName, setHouseName] = useState(house.name);
  const [houseDescription, setHouseDescription] = useState(house.description || '');
  const [worldPrompt, setWorldPrompt] = useState(house.worldPrompt || 'Welcome to your Character Creator House! This is a virtual space where AI-powered characters live, interact, and grow. Characters have personalities, relationships, and can engage in conversations with you and each other.');
  const [copilotPrompt, setCopilotPrompt] = useState(house.copilotPrompt || 'You are a helpful House Manager AI for a character creator house. Keep responses to 2-3 sentences maximum. Monitor character well-being, provide status updates, and assist users with managing their virtual house and characters. Be friendly but concise.');
  const [copilotMaxTokens, setCopilotMaxTokens] = useState(house.copilotMaxTokens || 75);
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

  // Watch for house updates to sync success
  useEffect(() => {
    if (house.aiSettings?.apiKey && house.aiSettings.apiKey !== '' && open) {
      console.log('House AI settings updated successfully:', house.aiSettings);
      // Sync form state to match house state after successful save
      if (house.aiSettings.apiKey !== apiKey) {
        setApiKey(house.aiSettings.apiKey);
      }
      if (house.aiSettings.provider !== provider) {
        setProvider(house.aiSettings.provider);
      }
      if (house.aiSettings.model !== selectedModel) {
        setSelectedModel(house.aiSettings.model);
      }
    }
  }, [house.aiSettings?.apiKey, house.aiSettings?.provider, house.aiSettings?.model, open]);
  useEffect(() => {
    if (!open) return; // Only sync when dialog is first opened
    
    console.log('=== Syncing form state with house data ===');
    console.log('House AI Settings:', house.aiSettings);
    
    // Only update form state if dialog is opening for the first time
    // This prevents overwriting user input during editing
    const syncFormState = () => {
      setHouseName(house.name);
      setHouseDescription(house.description || '');
      setWorldPrompt(house.worldPrompt || 'Welcome to your Character Creator House! This is a virtual space where AI-powered characters live, interact, and grow. Characters have personalities, relationships, and can engage in conversations with you and each other.');
      setCopilotPrompt(house.copilotPrompt || 'You are a helpful House Manager AI for a character creator house. Keep responses to 2-3 sentences maximum. Monitor character well-being, provide status updates, and assist users with managing their virtual house and characters. Be friendly but concise.');
      setCopilotMaxTokens(house.copilotMaxTokens || 75);
      setCurrency(house.currency);
      setProvider(house.aiSettings?.provider || 'openrouter');
      setSelectedModel(house.aiSettings?.model || 'deepseek/deepseek-chat-v3.1');
      setApiKey(house.aiSettings?.apiKey || '');
      setImageProvider(house.aiSettings?.imageProvider || 'venice');
      setImageApiKey(house.aiSettings?.imageApiKey || '');
      setAutoEnabled(house.autoCreator?.enabled || false);
      setAutoInterval(house.autoCreator?.interval || 60);
      setAutoMaxChars(house.autoCreator?.maxCharacters || 10);
      
      console.log('Form state synced - API Key:', house.aiSettings?.apiKey ? `${house.aiSettings.apiKey.slice(0, 8)}...` : 'empty');
    };
    
    syncFormState();
  }, [open]); // Only depend on open state, not house data

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

  const handleSaveApiSettings = async () => {
    console.log('=== Saving API Settings ===');
    console.log('Provider:', provider);
    console.log('Model:', selectedModel);
    console.log('API Key present:', !!apiKey);
    console.log('API Key length:', apiKey.length);
    console.log('Image Provider:', imageProvider);
    console.log('Image API Key present:', !!imageApiKey);
    console.log('Current house AI settings before save:', house.aiSettings);
    
    if (!apiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }
    
    // Create the complete AI settings object with current form values
    const newApiSettings = {
      provider: provider as 'openrouter',
      model: selectedModel,
      apiKey: apiKey.trim(), // Ensure no whitespace issues
      imageProvider: imageProvider as 'venice' | 'none',
      imageApiKey: imageApiKey.trim(),
      // Preserve existing AI settings that we don't show in the form
      temperature: house.aiSettings?.temperature || 0.7,
      maxTokens: house.aiSettings?.maxTokens || 512
    };
    
    console.log('New AI settings being saved:', newApiSettings);
    
    try {
      // Use functional update to ensure we get the latest house state
      updateHouse(currentHouse => ({
        ...currentHouse,
        aiSettings: newApiSettings,
        updatedAt: new Date()
      }));
      
      // Wait a bit to ensure the KV store is updated
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Trigger a force update to ensure other components re-render
      setForceUpdate(current => (current || 0) + 1);
      
      console.log('API settings save completed successfully');
      toast.success('API settings saved successfully');
      
      // Verify the save worked after a short delay
      setTimeout(() => {
        console.log('Verification check - House AI settings after save:', house.aiSettings);
      }, 500);
      
    } catch (error) {
      console.error('Failed to save API settings:', error);
      toast.error('Failed to save API settings');
    }
  };

  const handleTestApiConnection = async () => {
    if (!apiKey) {
      toast.error('Please enter an API key first');
      return;
    }

    toast.info('Testing API connection...');
    
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Character Creator House'
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            {
              role: 'user',
              content: 'Say "API test successful" if you can read this.'
            }
          ],
          temperature: 0.3,
          max_tokens: 20
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API test error:', response.status, errorText);
        
        if (response.status === 401) {
          toast.error('Invalid API key - Please check your OpenRouter API key');
        } else if (response.status === 429) {
          toast.error('Rate limit exceeded - Please wait and try again');
        } else if (response.status === 400) {
          toast.error('Bad request - Check if the selected model is valid');
        } else {
          toast.error(`API test failed: ${response.status}`);
        }
        return;
      }

      const data = await response.json();
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        toast.success('API connection successful! ✅');
        console.log('API test response:', data.choices[0].message.content);
      } else {
        toast.error('API responded but with invalid format');
      }
      
    } catch (error) {
      console.error('API test error:', error);
      toast.error('API connection failed - Check your internet connection');
    }
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
                  {/* Debug Info */}
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    <div className="text-muted-foreground mb-2">Debug Info:</div>
                    <div>Form API Key: {apiKey ? `${apiKey.slice(0, 8)}... (${apiKey.length} chars)` : 'empty'}</div>
                    <div>House API Key: {house.aiSettings?.apiKey ? `${house.aiSettings.apiKey.slice(0, 8)}... (${house.aiSettings.apiKey.length} chars)` : 'empty'}</div>
                    <div>Form Provider: {provider}</div>
                    <div>House Provider: {house.aiSettings?.provider || 'none'}</div>
                    <div>Form Model: {selectedModel}</div>
                    <div>House Model: {house.aiSettings?.model || 'none'}</div>
                    <div>Form Trimmed Length: {apiKey.trim().length}</div>
                    <div>House Trimmed Length: {house.aiSettings?.apiKey?.trim().length || 0}</div>
                    <div>Match: {apiKey.trim() === (house.aiSettings?.apiKey?.trim() || '') ? 'YES' : 'NO'}</div>
                    <div>Valid Check: {!!(house.aiSettings?.apiKey && house.aiSettings.apiKey.trim().length > 0) ? 'VALID' : 'INVALID'}</div>
                  </div>
                  
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

                  <div className="flex gap-2">
                    <Button onClick={handleTestApiConnection} variant="outline" className="flex-1">
                      Test Connection
                    </Button>
                    <Button onClick={handleSaveApiSettings} className="flex-1">
                      Save API Settings
                    </Button>
                  </div>
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