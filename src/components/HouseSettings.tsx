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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useHouse } from '@/hooks/useHouse';
import { useSimpleStorage, simpleStorage } from '@/hooks/useSimpleStorage';
import { AVAILABLE_MODELS } from '@/types';
import { AIService } from '@/lib/aiService';
import { toast } from 'sonner';
import { 
  Brain, 
  House as Home,
  Gear,
  Key,
  Image,
  CaretDown,
  CaretUp
} from '@phosphor-icons/react';

interface HouseSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HouseSettings({ open, onOpenChange }: HouseSettingsProps) {
  const { house, updateHouse } = useHouse();
  
  // Force update trigger to help with persistence issues
  const [forceUpdate, setForceUpdate] = useSimpleStorage<number>('settings-force-update', 0);
  
  // House configuration state
  const [houseName, setHouseName] = useState(house.name);
  const [houseDescription, setHouseDescription] = useState(house.description || '');
  const [worldPrompt, setWorldPrompt] = useState(house.worldPrompt || 'Welcome to your Character Creator House! This is a virtual space where AI-powered characters live, interact, and grow. Characters have personalities, relationships, and can engage in conversations with you and each other.');
  const [copilotPrompt, setCopilotPrompt] = useState(house.copilotPrompt || 'You are a helpful House Manager AI for a character creator house. Keep responses to 2-3 sentences maximum. Monitor character well-being, provide status updates, and assist users with managing their virtual house and characters. Be friendly but concise.');
  const [copilotMaxTokens, setCopilotMaxTokens] = useState(house.copilotMaxTokens || 75);
  const [currency, setCurrency] = useState(house.currency);
  
  // AI Settings state - properly separated  
  const [textProvider, setTextProvider] = useState(house.aiSettings?.textProvider || house.aiSettings?.provider || 'openrouter');
  const [textModel, setTextModel] = useState(house.aiSettings?.textModel || house.aiSettings?.model || 'deepseek/deepseek-chat-v3.1');
  const [textApiKey, setTextApiKey] = useState(house.aiSettings?.textApiKey || house.aiSettings?.apiKey || '');
  const [textApiUrl, setTextApiUrl] = useState(house.aiSettings?.textApiUrl || '');
  
  // Image Generation Settings - completely separate
  const [imageProvider, setImageProvider] = useState(house.aiSettings?.imageProvider || 'none');
  const [imageModel, setImageModel] = useState(house.aiSettings?.imageModel || 'venice-sd35');
  const [imageApiKey, setImageApiKey] = useState(house.aiSettings?.imageApiKey || '');
  const [imageApiUrl, setImageApiUrl] = useState(house.aiSettings?.imageApiUrl || '');

  // Auto character creator settings
  const [autoEnabled, setAutoEnabled] = useState(house.autoCreator?.enabled || false);
  const [autoInterval, setAutoInterval] = useState(house.autoCreator?.interval || 60);
  const [autoMaxChars, setAutoMaxChars] = useState(house.autoCreator?.maxCharacters || 10);

  // Debug panel state
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  // Watch for house updates to sync success
  useEffect(() => {
    const currentTextApiKey = house.aiSettings?.textApiKey || house.aiSettings?.apiKey;
    if (currentTextApiKey && currentTextApiKey !== '' && open) {
      console.log('House AI settings updated successfully:', house.aiSettings);
      // Sync form state to match house state after successful save
      if (currentTextApiKey !== textApiKey) {
        setTextApiKey(currentTextApiKey);
      }
      const currentTextProvider = house.aiSettings?.textProvider || house.aiSettings?.provider;
      if (currentTextProvider !== textProvider) {
        setTextProvider(currentTextProvider || 'openrouter');
      }
      const currentTextModel = house.aiSettings?.textModel || house.aiSettings?.model;
      if (currentTextModel !== textModel) {
        setTextModel(currentTextModel || 'deepseek/deepseek-chat-v3.1');
      }
    }
  }, [house.aiSettings?.textApiKey, house.aiSettings?.apiKey, house.aiSettings?.textProvider, house.aiSettings?.provider, house.aiSettings?.textModel, house.aiSettings?.model, open]);
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
      setTextProvider(house.aiSettings?.textProvider || house.aiSettings?.provider || 'openrouter');
      setTextModel(house.aiSettings?.textModel || house.aiSettings?.model || 'deepseek/deepseek-chat-v3.1');
      setTextApiKey(house.aiSettings?.textApiKey || house.aiSettings?.apiKey || '');
      setTextApiUrl(house.aiSettings?.textApiUrl || '');
      setImageProvider(house.aiSettings?.imageProvider || 'none');
      setImageModel(house.aiSettings?.imageModel || 'venice-sd35');
      setImageApiKey(house.aiSettings?.imageApiKey || '');
      setImageApiUrl(house.aiSettings?.imageApiUrl || '');
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
        // Legacy fields for backward compatibility
        provider: textProvider as 'openrouter',
        model: textModel,
        apiKey: textApiKey,
        // New structured fields
        textProvider: textProvider as 'openrouter',
        textModel,
        textApiKey,
        textApiUrl,
        imageProvider: imageProvider as 'venice' | 'openai' | 'stability' | 'none',
        imageApiKey,
        imageApiUrl
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
    console.log('Text Provider:', textProvider);
    console.log('Text Model:', textModel);
    console.log('Text API Key present:', !!textApiKey);
    console.log('Text API Key length:', textApiKey.length);
    console.log('Text API Key first 8 chars:', textApiKey.slice(0, 8));
    console.log('Image Provider:', imageProvider);
    console.log('Image API Key present:', !!imageApiKey);
    console.log('Current house AI settings before save:', house.aiSettings);
    
    // Validation
    const errors: string[] = [];
    
    if (!textApiKey.trim()) {
      errors.push('API key is required');
    } else if (textProvider === 'openrouter' && !textApiKey.trim().startsWith('sk-or-')) {
      errors.push('OpenRouter API key should start with "sk-or-"');
    } else if (textApiKey.trim().length < 20) {
      errors.push('API key appears to be too short');
    }
    
    if (!textModel) {
      errors.push('AI model is required');
    }
    
    if (imageProvider !== 'none' && !imageApiKey.trim()) {
      errors.push('Image API key is required when image provider is enabled');
    }
    
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return;
    }
    
    try {
      // Create the complete AI settings object with current form values
      const newApiSettings = {
        // Legacy fields for backward compatibility
        provider: textProvider as 'openrouter',
        model: textModel,
        apiKey: textApiKey.trim(),
        // New structured fields
        textProvider: textProvider as 'openrouter',
        textModel,
        textApiKey: textApiKey.trim(),
        textApiUrl,
        imageProvider: imageProvider as 'venice' | 'openai' | 'stability' | 'none',
        imageModel,
        imageApiKey: imageApiKey.trim(),
        imageApiUrl
      };
      
      console.log('New AI settings being saved:', newApiSettings);
      
      // Save using the hook's updateHouse method 
      updateHouse(currentHouse => {
        const updated = {
          ...currentHouse,
          aiSettings: newApiSettings,
          updatedAt: new Date()
        };
        console.log('Updated House object:', updated);
        console.log('Updated AI Settings object:', updated.aiSettings);
        return updated;
      });
      
      // Trigger a force update to ensure other components re-render
      setForceUpdate(current => (current || 0) + 1);
      
      // Give a moment for the update to propagate
      setTimeout(() => {
        console.log('Checking updated house state...');
        console.log('House AI Settings after update:', house.aiSettings);
        
        // Verify the save worked by checking localStorage directly
        const kvData = simpleStorage.get('character-house') as any;
        console.log('Verification - localStorage settings:', kvData?.aiSettings);
        console.log('Verification - Hook AI settings:', house.aiSettings);
        
        const savedTextApiKey = kvData?.aiSettings?.textApiKey || kvData?.aiSettings?.apiKey;
        if (savedTextApiKey === textApiKey.trim()) {
          console.log('✅ API settings successfully saved and verified!');
          toast.success('API settings saved successfully');
        } else {
          console.error('❌ API settings save verification failed');
          console.log('Expected:', textApiKey.trim());
          console.log('Got from localStorage:', savedTextApiKey);
          console.log('Got from Hook:', house.aiSettings?.apiKey);
          toast.error('API settings may not have saved correctly. Please try again.');
        }
      }, 500); // Give a bit more time for state to propagate
      
      console.log('API settings save initiated successfully');
      
    } catch (error) {
      console.error('Failed to save API settings:', error);
      toast.error('Failed to save API settings: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleTestApiConnection = async () => {
    if (!textApiKey) {
      toast.error('Please enter an API key first');
      return;
    }

    toast.info('Testing API connection...');
    
    try {
      const result = await AIService.testConnection(textApiKey.trim(), textModel);
      
      if (result.success) {
        toast.success('✅ ' + result.message);
        console.log('API test successful:', result.message);
      } else {
        toast.error('❌ ' + result.message);
        console.error('API test failed:', result.message);
      }
      
    } catch (error) {
      console.error('API test error:', error);
      toast.error('API connection test failed - Check your internet connection');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-none sm:w-[92vw] md:w-[88vw] lg:w-[80vw] xl:w-[75vw] max-h-[90vh] flex flex-col">
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
                  {/* Collapsible Debug Info */}
                  <Collapsible open={showDebugInfo} onOpenChange={setShowDebugInfo}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between">
                        <span className="text-xs text-muted-foreground">Developer Debug Info</span>
                        {showDebugInfo ? <CaretUp className="h-4 w-4" /> : <CaretDown className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2">
                      <div className="p-3 bg-muted rounded-lg text-xs space-y-1">
                        <div className="font-medium text-muted-foreground mb-2">API Configuration Status:</div>
                        <div>Text API Key: {textApiKey ? `configured (${textApiKey.length} chars)` : 'not configured'}</div>
                        <div>Image API Key: {imageApiKey ? `configured (${imageApiKey.length} chars)` : 'not configured'}</div>
                        <div>Text Provider: {textProvider}</div>
                        <div>Image Provider: {imageProvider}</div>
                        <div>Model: {textModel}</div>
                        <div>Sync Status: {textApiKey.trim() === ((house.aiSettings?.textApiKey || house.aiSettings?.apiKey)?.trim() || '') ? 'synced' : 'pending'}</div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={async () => {
                            const kvData = simpleStorage.get('character-house');
                            console.log('Storage data:', kvData);
                            toast.info('Storage data logged to console');
                          }}
                          className="mt-2 h-7 text-xs"
                        >
                          Inspect Storage
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                  
                  <div className="space-y-2">
                    <Label htmlFor="provider">AI Provider</Label>
                    <Select
                      value={textProvider}
                      onValueChange={(value) => setTextProvider(value as 'openrouter')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select AI provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openrouter">OpenRouter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {textProvider === 'openrouter' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="api-key">OpenRouter API Key</Label>
                        <Input
                          id="api-key"
                          type="password"
                          value={textApiKey}
                          onChange={(e) => setTextApiKey(e.target.value)}
                          placeholder="sk-or-v1-..."
                        />
                        <p className="text-xs text-muted-foreground">
                          Get your API key from <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">openrouter.ai</a>
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ai-model">AI Model</Label>
                        <Select
                          value={textModel}
                          onValueChange={setTextModel}
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
                          onValueChange={(value) => setImageProvider(value as 'venice' | 'openai' | 'stability' | 'none')}
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
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="image-model">Venice AI Model</Label>
                            <Select
                              value={imageModel}
                              onValueChange={setImageModel}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select image model" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="venice-sd35">Venice SD3.5 - Default high quality</SelectItem>
                                <SelectItem value="hidream">HiDream I1 - High quality</SelectItem>
                                <SelectItem value="qwen-image">Qwen Image - Highest quality</SelectItem>
                                <SelectItem value="lustify-sdxl">Lustify SDXL - Uncensored</SelectItem>
                                <SelectItem value="wai-Illustrious">WAI Illustrious - Anime</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

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
                        </>
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