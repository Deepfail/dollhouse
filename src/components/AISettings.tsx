import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { repositoryStorage } from '@/hooks/useRepositoryStorage';
import { AIService } from '@/lib/aiService';
import {
    CheckCircle,
    Eye,
    EyeSlash,
    Gear,
    Sparkle,
    TestTube,
    XCircle
} from '@phosphor-icons/react';
import React, { useState } from 'react';
import { toast } from 'sonner';

interface AISettingsProps {
  children?: React.ReactNode;
}

export function AISettings({ children }: AISettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showImageApiKey, setShowImageApiKey] = useState(false);
  
  // Form state
  const [textProvider, setTextProvider] = useState('openrouter');
  const [textApiKey, setTextApiKey] = useState('');
  const [textModel, setTextModel] = useState('deepseek/deepseek-chat-v3.1');
  const [textApiUrl, setTextApiUrl] = useState('');

  // Provider-specific caches so switching provider doesn't overwrite the other
  const [veniceTextApiKey, setVeniceTextApiKey] = useState('');
  const [openrouterTextApiKey, setOpenrouterTextApiKey] = useState('');
  const [veniceTextModel, setVeniceTextModel] = useState('venice-large');
  const [openrouterTextModel, setOpenrouterTextModel] = useState('deepseek/deepseek-chat-v3.1');
  const [veniceTextApiUrl, setVeniceTextApiUrl] = useState('');
  
  const [imageProvider, setImageProvider] = useState('venice');
  const [imageApiKey, setImageApiKey] = useState('');
  const [imageModel, setImageModel] = useState('venice-sd35');
  const [imageApiUrl, setImageApiUrl] = useState('');

  // Venice AI text models with usage notes for clearer selection
  // Values map to Venice API model identifiers; labels include guidance only
  const veniceTextModels: { value: string; label: string }[] = [
    // Primary Venice choices
    { value: 'llama-3.3-70b', label: 'Llama 3.3 70B — balanced' },
    { value: 'qwen3-235b', label: 'Qwen3 235B — most powerful' },
    { value: 'venice-uncensored', label: 'Venice Uncensored — uncensored' },
    // Back-compat aliases shown last
    { value: 'venice-uncensored-1.1', label: 'Venice Uncensored 1.1 (alias)' },
    { value: 'venice-reasoning', label: 'Venice Reasoning (alias)' },
    { value: 'venice-small', label: 'Venice Small (alias)' },
    { value: 'venice-medium', label: 'Venice Medium (alias)' },
    { value: 'venice-large', label: 'Venice Large (alias)' },
  ];

  React.useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  // Ensure model stays valid when switching providers
  React.useEffect(() => {
    // When provider changes, swap in provider-specific cached values
    if (textProvider === 'venice') {
      // Ensure a valid Venice model
      const veniceValues = new Set(veniceTextModels.map(m => m.value));
      const nextModel = veniceValues.has(veniceTextModel) ? veniceTextModel : 'venice-large';
      setTextModel(nextModel);
      setTextApiKey(veniceTextApiKey);
      setTextApiUrl(veniceTextApiUrl);
    } else {
      // OpenRouter branch
      // If current model is a Venice-only value, switch to cached OpenRouter model
      const veniceValues = new Set(veniceTextModels.map(m => m.value));
      const nextModel = veniceValues.has(openrouterTextModel) ? 'deepseek/deepseek-chat-v3.1' : openrouterTextModel;
      setTextModel(nextModel || 'deepseek/deepseek-chat-v3.1');
      setTextApiKey(openrouterTextApiKey);
      setTextApiUrl('');
    }
  }, [textProvider]);

  const loadSettings = async () => {
    try {
      const houseConfig = await repositoryStorage.get('house_config') as any;
      const aiSettings = houseConfig?.aiSettings || {};
      // Load provider selection first
      const loadedProvider = aiSettings.textProvider || 'openrouter';
      setTextProvider(loadedProvider);

      // Load provider-specific fields with fallbacks to legacy fields
      const loadedVeniceKey = aiSettings.veniceTextApiKey || (loadedProvider === 'venice' ? aiSettings.textApiKey : '') || '';
      const loadedOpenRouterKey = aiSettings.openrouterTextApiKey || (loadedProvider === 'openrouter' ? aiSettings.textApiKey : '') || '';
      const loadedVeniceModel = aiSettings.veniceTextModel || (aiSettings.textProvider === 'venice' ? aiSettings.textModel : undefined) || 'venice-large';
      const loadedOpenRouterModel = aiSettings.openrouterTextModel || (aiSettings.textProvider === 'openrouter' ? aiSettings.textModel : undefined) || 'deepseek/deepseek-chat-v3.1';
      const loadedVeniceUrl = aiSettings.veniceTextApiUrl || (aiSettings.textProvider === 'venice' ? aiSettings.textApiUrl : undefined) || '';

      setVeniceTextApiKey(loadedVeniceKey);
      setOpenrouterTextApiKey(loadedOpenRouterKey);
      setVeniceTextModel(loadedVeniceModel);
      setOpenrouterTextModel(loadedOpenRouterModel);
      setVeniceTextApiUrl(loadedVeniceUrl);

      // Hydrate current visible inputs based on provider
      if (loadedProvider === 'venice') {
        setTextApiKey(loadedVeniceKey);
        setTextModel(loadedVeniceModel);
        setTextApiUrl(loadedVeniceUrl);
      } else {
        setTextApiKey(loadedOpenRouterKey);
        setTextModel(loadedOpenRouterModel);
        setTextApiUrl('');
      }
      
      setImageProvider(aiSettings.imageProvider || 'venice');
      setImageApiKey(aiSettings.imageApiKey || '');
      setImageModel(aiSettings.imageModel || 'venice-sd35');
      setImageApiUrl(aiSettings.imageApiUrl || '');
    } catch (error) {
      console.error('Failed to load AI settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      const houseConfig = await repositoryStorage.get('house_config') as any || {};
      // Keep provider-specific fields so switching providers doesn't overwrite saved keys/models
      const newAiSettings = {
        textProvider,
        // Backward-compat fields reflect the currently active provider
        textApiKey: textApiKey.trim(),
        textModel,
        textApiUrl: textApiUrl.trim(),

        // Provider-specific fields
        veniceTextApiKey: veniceTextApiKey.trim(),
        openrouterTextApiKey: openrouterTextApiKey.trim(),
        veniceTextModel,
        openrouterTextModel,
        veniceTextApiUrl: veniceTextApiUrl.trim(),

        // Image settings unchanged
        imageProvider,
        imageApiKey: imageApiKey.trim(),
        imageModel,
        imageApiUrl: imageApiUrl.trim()
      };
      
      const updatedConfig = {
        ...houseConfig,
        aiSettings: newAiSettings
      };
      
      await repositoryStorage.set('house_config', updatedConfig);
      toast.success('AI settings saved successfully!');
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to save AI settings:', error);
      toast.error('Failed to save settings');
    }
  };

  const testConnection = async () => {
    if (!textApiKey.trim()) {
      toast.error('Please enter an API key first');
      return;
    }
    
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const result = await AIService.testConnection(textApiKey.trim(), textModel);
      setTestResult(result);
      
      if (result.success) {
        toast.success('Connection test successful!');
      } else {
        toast.error('Connection test failed: ' + result.message);
      }
    } catch (error) {
      const errorResult = { success: false, message: 'Connection test failed' };
      setTestResult(errorResult);
      toast.error('Connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const openRouterTextModels: { value: string; label: string }[] = [
    { value: 'deepseek/deepseek-chat-v3.1', label: 'DeepSeek Chat v3.1' },
    { value: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B' },
    { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
    { value: 'openai/gpt-4o', label: 'GPT-4o' },
    { value: 'x-ai/grok-4', label: 'Grok-4' },
    { value: 'google/gemini-pro-1.5', label: 'Gemini Pro 1.5' },
  ];

  const handleTextModelChange = (value: string) => {
    // If currently viewing Venice provider but a non-Venice model was chosen, auto-switch provider
    const veniceValues = new Set(veniceTextModels.map(m => m.value));
    if (textProvider === 'venice' && !veniceValues.has(value)) {
      setTextProvider('openrouter');
    }
    setTextModel(value);
    // Update provider-specific cache
    if (textProvider === 'venice') {
      setVeniceTextModel(value);
    } else {
      setOpenrouterTextModel(value);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Gear size={16} className="mr-2" />
            AI Settings
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-visible bg-gray-900 text-white" style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Sparkle size={20} />
            AI Configuration
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="text" className="flex-1">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="text">Text Generation</TabsTrigger>
            <TabsTrigger value="image">Image Generation</TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-6 max-h-[70vh] overflow-y-auto overflow-x-visible">
            <TabsContent value="text" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Text Generation Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Provider</Label>
                      <Select value={textProvider} onValueChange={setTextProvider}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openrouter">OpenRouter</SelectItem>
                          <SelectItem value="venice">Venice AI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Model</Label>
                      <Select value={textModel} onValueChange={handleTextModelChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          {textProvider === 'venice' ? (
                            <>
                              {veniceTextModels.map(m => (
                                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                              ))}
                              <SelectItem disabled value="__divider">──────────</SelectItem>
                              {openRouterTextModels.map(m => (
                                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                              ))}
                            </>
                          ) : (
                            <>
                              {openRouterTextModels.map(m => (
                                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                              ))}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Label>API Key</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? <EyeSlash size={14} /> : <Eye size={14} />}
                      </Button>
                    </div>
                    <Input
                      type={showApiKey ? 'text' : 'password'}
                      value={textApiKey}
                      onChange={(e) => {
                        setTextApiKey(e.target.value);
                        if (textProvider === 'venice') {
                          setVeniceTextApiKey(e.target.value);
                        } else {
                          setOpenrouterTextApiKey(e.target.value);
                        }
                      }}
                      placeholder={`Enter your ${textProvider === 'venice' ? 'Venice AI' : 'OpenRouter'} API key`}
                    />
                  </div>

                  {textProvider === 'venice' && (
                    <div>
                      <Label>API URL (optional)</Label>
                      <Input
                          value={textApiUrl}
                          onChange={(e) => {
                            setTextApiUrl(e.target.value);
                            setVeniceTextApiUrl(e.target.value);
                          }}
                        placeholder="https://api.venice.ai/api/v1"
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={testConnection}
                      disabled={isTesting || !textApiKey.trim()}
                      variant="outline"
                      className="flex-1"
                    >
                      {isTesting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                          Testing...
                        </>
                      ) : (
                        <>
                          <TestTube size={16} className="mr-2" />
                          Test Connection
                        </>
                      )}
                    </Button>
                    
                    {testResult && (
                      <div className="flex items-center gap-2">
                        {testResult.success ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            <CheckCircle size={14} className="mr-1" />
                            Success
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle size={14} className="mr-1" />
                            Failed
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {testResult && !testResult.success && (
                    <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                      {testResult.message}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="image" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Image Generation Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Provider</Label>
                      <Select value={imageProvider} onValueChange={setImageProvider}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Disabled</SelectItem>
                          <SelectItem value="venice">Venice AI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {imageProvider === 'venice' && (
                      <div>
                        <Label>Model</Label>
                        <Select value={imageModel} onValueChange={setImageModel}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select model" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="qwen-image">qwen-image — Highest quality, multimodal editing ($0.01)</SelectItem>
                            <SelectItem value="venice-sd35">venice-sd35 — Default choice, Eliza-optimized ($0.01)</SelectItem>
                            <SelectItem value="hidream">hidream — Production-ready generation ($0.01)</SelectItem>
                            <SelectItem value="lustify-sdxl">lustify-sdxl — Uncensored content ($0.01)</SelectItem>
                            <SelectItem value="wai-Illustrious">wai-Illustrious — Anime/NSFW capable</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {imageProvider === 'venice' && (
                    <>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Label>API Key</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => setShowImageApiKey(!showImageApiKey)}
                          >
                            {showImageApiKey ? <EyeSlash size={14} /> : <Eye size={14} />}
                          </Button>
                        </div>
                        <Input
                          type={showImageApiKey ? 'text' : 'password'}
                          value={imageApiKey}
                          onChange={(e) => setImageApiKey(e.target.value)}
                          placeholder="Enter your Venice AI API key"
                        />
                      </div>

                      <div>
                        <Label>API URL (optional)</Label>
                        <Input
                          value={imageApiUrl}
                          onChange={(e) => setImageApiUrl(e.target.value)}
                          placeholder="https://api.venice.ai/api/v1"
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        <Separator />

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={saveSettings}>
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}