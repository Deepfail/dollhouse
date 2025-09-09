import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHouse } from '@/hooks/useHouse';
import { toast } from 'sonner';
import { 
  Brain, 
  House as Home,
  Gear
} from '@phosphor-icons/react';

interface HouseSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SPARK_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o (Default)' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini' }
];

export function HouseSettings({ open, onOpenChange }: HouseSettingsProps) {
  const { house, updateHouse } = useHouse();
  
  // House configuration state
  const [houseName, setHouseName] = useState(house.name);
  const [houseDescription, setHouseDescription] = useState(house.description || '');
  const [worldPrompt, setWorldPrompt] = useState(house.worldPrompt || '');
  const [copilotPrompt, setCopilotPrompt] = useState(house.copilotPrompt || '');
  const [currency, setCurrency] = useState(house.currency);
  
  // AI Settings state  
  const [selectedModel, setSelectedModel] = useState(house.aiSettings?.model || 'gpt-4o');

  const handleSaveHouseSettings = () => {
    updateHouse({
      name: houseName,
      description: houseDescription,
      worldPrompt,
      copilotPrompt,
      currency,
      aiSettings: {
        provider: 'spark',
        model: selectedModel
      }
    });
    toast.success('Settings updated successfully');
  };

  const handleSavePromptSettings = () => {
    updateHouse({
      worldPrompt,
      copilotPrompt
    });
    toast.success('Prompt settings updated successfully');
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="house" className="flex items-center gap-2">
              <Home size={16} />
              House
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
                        {SPARK_MODELS.map(model => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-muted/50 p-3 rounded-lg border border-border">
                    <div className="flex items-start gap-2">
                      <div className="text-accent mt-0.5">ℹ️</div>
                      <div className="text-sm text-muted-foreground">
                        This app uses Spark's built-in AI service. No additional API configuration required.
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleSaveHouseSettings} className="w-full">
                    Save Settings
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
                    Advanced Settings
                  </CardTitle>
                  <CardDescription>
                    Advanced configuration options
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 p-4 rounded-lg border border-border">
                    <div className="flex items-start gap-3">
                      <div className="text-accent">⚙️</div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Advanced Features</p>
                        <p className="text-sm text-muted-foreground">
                          Additional configuration options and features will be available here in future updates.
                        </p>
                      </div>
                    </div>
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