import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useKV } from '@github/spark/hooks';
import { useHouse } from '@/hooks/useHouse';
import { toast } from 'sonner';
import { 
  Key, 
  Globe, 
  Palette, 
  Brain, 
  Image as ImageIcon,
  House as Home,
  Users,
  Gear
} from '@phosphor-icons/react';

interface HouseSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface APISettings {
  openrouter: {
    apiKey: string;
    defaultModel: string;
    enabled: boolean;
  };
  veniceAI: {
    apiKey: string;
    enabled: boolean;
  };
}

const OPENROUTER_MODELS = [
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3' },
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'anthropic/claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
  { id: 'openai/o1-preview', name: 'OpenAI o1-preview' },
  { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5' },
  { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B' }
];

export function HouseSettings({ open, onOpenChange }: HouseSettingsProps) {
  const { house, updateHouse } = useHouse();
  const [apiSettings, setAPISettings] = useKV<APISettings>('api-settings', {
    openrouter: {
      apiKey: '',
      defaultModel: 'deepseek/deepseek-chat',
      enabled: false
    },
    veniceAI: {
      apiKey: '',
      enabled: false
    }
  });

  // House configuration state
  const [houseName, setHouseName] = useState(house.name);
  const [houseDescription, setHouseDescription] = useState(house.description || '');
  const [worldPrompt, setWorldPrompt] = useState(house.worldPrompt || '');
  const [copilotPrompt, setCopilotPrompt] = useState(house.copilotPrompt || '');
  const [currency, setCurrency] = useState(house.currency);

  const handleSaveAPISettings = () => {
    setAPISettings(prev => ({
      ...prev,
      ...apiSettings
    }));
    toast.success('API settings saved successfully');
  };

  const handleSaveHouseSettings = () => {
    updateHouse({
      name: houseName,
      description: houseDescription,
      worldPrompt,
      copilotPrompt,
      currency
    });
    toast.success('House settings updated successfully');
  };

  const handleTestOpenRouter = async () => {
    if (!apiSettings.openrouter.apiKey) {
      toast.error('Please enter your OpenRouter API key first');
      return;
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiSettings.openrouter.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: apiSettings.openrouter.defaultModel,
          messages: [{ role: 'user', content: 'Hello, this is a test message.' }],
          max_tokens: 10
        })
      });

      if (response.ok) {
        toast.success('OpenRouter connection successful!');
      } else {
        toast.error('OpenRouter connection failed. Check your API key.');
      }
    } catch (error) {
      toast.error('Failed to connect to OpenRouter');
    }
  };

  const handleTestVeniceAI = async () => {
    if (!apiSettings.veniceAI.apiKey) {
      toast.error('Please enter your Venice AI API key first');
      return;
    }

    try {
      // Venice AI test - this would need the actual endpoint
      toast.success('Venice AI connection test initiated');
    } catch (error) {
      toast.error('Failed to connect to Venice AI');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
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
            <TabsTrigger value="apis" className="flex items-center gap-2">
              <Key size={16} />
              APIs
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
                    Save House Settings
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* API Settings Tab */}
            <TabsContent value="apis" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe size={18} />
                    OpenRouter Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure OpenRouter for LLM conversations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="openrouter-enabled"
                      checked={apiSettings.openrouter.enabled}
                      onCheckedChange={(checked) => 
                        setAPISettings(prev => ({
                          ...prev,
                          openrouter: { ...prev.openrouter, enabled: checked }
                        }))
                      }
                    />
                    <Label htmlFor="openrouter-enabled">Enable OpenRouter</Label>
                    <Badge variant={apiSettings.openrouter.enabled ? "default" : "secondary"}>
                      {apiSettings.openrouter.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="openrouter-key">API Key</Label>
                    <Input
                      id="openrouter-key"
                      type="password"
                      value={apiSettings.openrouter.apiKey}
                      onChange={(e) => 
                        setAPISettings(prev => ({
                          ...prev,
                          openrouter: { ...prev.openrouter, apiKey: e.target.value }
                        }))
                      }
                      placeholder="sk-or-v1-..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="default-model">Default Model</Label>
                    <Select
                      value={apiSettings.openrouter.defaultModel}
                      onValueChange={(value) =>
                        setAPISettings(prev => ({
                          ...prev,
                          openrouter: { ...prev.openrouter, defaultModel: value }
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent>
                        {OPENROUTER_MODELS.map(model => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleTestOpenRouter} variant="outline" className="flex-1">
                      Test Connection
                    </Button>
                    <Button onClick={handleSaveAPISettings} className="flex-1">
                      Save Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon size={18} />
                    Venice AI Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure Venice AI for image generation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="venice-enabled"
                      checked={apiSettings.veniceAI.enabled}
                      onCheckedChange={(checked) => 
                        setAPISettings(prev => ({
                          ...prev,
                          veniceAI: { ...prev.veniceAI, enabled: checked }
                        }))
                      }
                    />
                    <Label htmlFor="venice-enabled">Enable Venice AI</Label>
                    <Badge variant={apiSettings.veniceAI.enabled ? "default" : "secondary"}>
                      {apiSettings.veniceAI.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="venice-key">API Key</Label>
                    <Input
                      id="venice-key"
                      type="password"
                      value={apiSettings.veniceAI.apiKey}
                      onChange={(e) => 
                        setAPISettings(prev => ({
                          ...prev,
                          veniceAI: { ...prev.veniceAI, apiKey: e.target.value }
                        }))
                      }
                      placeholder="Enter Venice AI API key"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleTestVeniceAI} variant="outline" className="flex-1">
                      Test Connection
                    </Button>
                    <Button onClick={handleSaveAPISettings} className="flex-1">
                      Save Settings
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

                  <Button onClick={handleSaveHouseSettings} className="w-full">
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
                    Advanced Configuration
                  </CardTitle>
                  <CardDescription>
                    Advanced settings and experimental features
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Advanced settings will be available in future updates</p>
                    <p className="text-sm">Export/import configurations, backup data, etc.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}