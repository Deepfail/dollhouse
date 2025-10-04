import { PromptLibrary } from '@/components/PromptLibrary';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { legacyStorage } from '@/lib/legacyStorage';
import { logger } from '@/lib/logger';
import {
  ArrowClockwise,
  CheckCircle,
  Database,
  Download,
  Image as ImageIcon,
  Info,
  Key,
  Palette,
  FloppyDisk as Save,
  Gear as Settings,
  Shield,
  Trash,
  Upload
} from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface SettingsPageProps {
  onClose?: () => void;
}

export function SettingsPage({ onClose }: SettingsPageProps) {
  // API Settings
  const [apiSettings, setApiSettings] = useState({
    openRouterKey: '',
    defaultModel: 'deepseek/deepseek-chat-v3.1',
    imageProvider: 'none',
    imageApiKey: '',
    figmaToken: ''
  });

  // Image Generation Settings
  const [imageSettings, setImageSettings] = useState({
    model: 'flux-1.1-pro',
    negativePrompt: 'blurry, low quality, deformed, ugly, extra limbs',
    width: 1024,
    height: 1024,
    steps: 20,
    cfgScale: 7.5,
    stylePreset: 'enhance',
    sampler: 'euler',
    seed: -1,
    variants: 1,
    format: 'png'
  });

  // UI Settings
  const [uiSettings, setUiSettings] = useState({
    theme: 'dark',
    compactMode: false,
    showAnimations: true,
    autoSave: true,
    notifications: true
  });

  // Storage Settings
  const [storageSettings, setStorageSettings] = useState({
    autoBackup: true,
    backupFrequency: 'daily',
    maxBackups: 10,
    clearCache: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      // Load from legacy storage abstraction or repository
      const savedApiSettings = legacyStorage.getItem('api-settings');
      const savedImageSettings = legacyStorage.getItem('image-settings');
      const savedUiSettings = legacyStorage.getItem('ui-settings');
      const savedStorageSettings = legacyStorage.getItem('storage-settings');

      if (savedApiSettings) setApiSettings(JSON.parse(savedApiSettings));
      if (savedImageSettings) setImageSettings(JSON.parse(savedImageSettings));
      if (savedUiSettings) setUiSettings(JSON.parse(savedUiSettings));
      if (savedStorageSettings) setStorageSettings(JSON.parse(savedStorageSettings));
    } catch (error) {
      logger.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaveStatus('saving');
      // Save to legacy storage abstraction
      legacyStorage.setItem('api-settings', JSON.stringify(apiSettings));
      legacyStorage.setItem('image-settings', JSON.stringify(imageSettings));
      legacyStorage.setItem('ui-settings', JSON.stringify(uiSettings));
      legacyStorage.setItem('storage-settings', JSON.stringify(storageSettings));

      // Save to repository storage if available
      try {
        const { repositoryStorage } = await import('@/hooks/useRepositoryStorage');
        await repositoryStorage.set('api-settings', apiSettings);
        await repositoryStorage.set('image-settings', imageSettings);
        await repositoryStorage.set('ui-settings', uiSettings);
        await repositoryStorage.set('storage-settings', storageSettings);
      } catch (error) {
        logger.warn('Repository storage not available:', error);
      }

      setSaveStatus('saved');
      toast.success('Settings saved successfully');

      // Reset status after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      logger.error('Error saving settings:', error);
      setSaveStatus('error');
      toast.error('Failed to save settings');
    }
  };

  const resetToDefaults = async () => {
    const confirmed = confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.');
    if (!confirmed) return;

    try {
      setIsLoading(true);

      // Reset to default values
      setApiSettings({
        openRouterKey: '',
        defaultModel: 'deepseek/deepseek-chat-v3.1',
        imageProvider: 'none',
        imageApiKey: '',
        figmaToken: ''
      });

      setImageSettings({
        model: 'flux-1.1-pro',
        negativePrompt: 'blurry, low quality, deformed, ugly, extra limbs',
        width: 1024,
        height: 1024,
        steps: 20,
        cfgScale: 7.5,
        stylePreset: 'enhance',
        sampler: 'euler',
        seed: -1,
        variants: 1,
        format: 'png'
      });

      setUiSettings({
        theme: 'dark',
        compactMode: false,
        showAnimations: true,
        autoSave: true,
        notifications: true
      });

      setStorageSettings({
        autoBackup: true,
        backupFrequency: 'daily',
        maxBackups: 10,
        clearCache: false
      });

      // Clear via legacy storage abstraction
      legacyStorage.removeItem('api-settings');
      legacyStorage.removeItem('image-settings');
      legacyStorage.removeItem('ui-settings');
      legacyStorage.removeItem('storage-settings');

      toast.success('Settings reset to defaults');
    } catch (error) {
      logger.error('Error resetting settings:', error);
      toast.error('Failed to reset settings');
    } finally {
      setIsLoading(false);
    }
  };

  const exportSettings = () => {
    try {
      const allSettings = {
        api: apiSettings,
        image: imageSettings,
        ui: uiSettings,
        storage: storageSettings,
        exportDate: new Date().toISOString()
      };

      const dataStr = JSON.stringify(allSettings, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `dollhouse-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Settings exported successfully');
    } catch (error) {
      logger.error('Error exporting settings:', error);
      toast.error('Failed to export settings');
    }
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const settings = JSON.parse(e.target?.result as string);

        if (settings.api) setApiSettings(settings.api);
        if (settings.image) setImageSettings(settings.image);
        if (settings.ui) setUiSettings(settings.ui);
        if (settings.storage) setStorageSettings(settings.storage);

        toast.success('Settings imported successfully');
      } catch (error) {
        logger.error('Error importing settings:', error);
        toast.error('Failed to import settings - invalid file format');
      }
    };
    reader.readAsText(file);
  };

  const clearCache = async () => {
    const confirmed = confirm('Are you sure you want to clear all cached data? This may affect performance temporarily.');
    if (!confirmed) return;

    try {
      setIsLoading(true);
      // Clear various caches
      legacyStorage.clear();
      legacyStorage.sessionClear();

      // Clear service worker caches if available
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
      }

      toast.success('Cache cleared successfully');
    } catch (error) {
      logger.error('Error clearing cache:', error);
      toast.error('Failed to clear cache');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b bg-card">
        <div className="flex items-center gap-3">
          <Settings size={24} className="text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your application preferences and API configurations</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportSettings}
            className="flex items-center gap-2"
          >
            <Download size={16} />
            Export
          </Button>

          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={importSettings}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              id="import-settings"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('import-settings')?.click()}
              className="flex items-center gap-2"
            >
              <Upload size={16} />
              Import
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefaults}
            disabled={isLoading}
            className="flex items-center gap-2 text-destructive hover:text-destructive"
          >
            <ArrowClockwise size={16} className={isLoading ? 'animate-spin' : undefined} />
            {isLoading ? 'Working...' : 'Reset'}
          </Button>

          <Button
            onClick={saveSettings}
            disabled={saveStatus === 'saving'}
            className="flex items-center gap-2"
          >
            {saveStatus === 'saving' ? (
              <ArrowClockwise size={16} className="animate-spin" />
            ) : saveStatus === 'saved' ? (
              <CheckCircle size={16} className="text-green-500" />
            ) : (
              <Save size={16} />
            )}
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save'}
          </Button>

          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          )}
        </div>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="api" className="h-full">
          <TabsList className="grid w-full grid-cols-6 m-6 mb-0">
            <TabsTrigger value="api" className="flex items-center gap-2">
              <Key size={16} />
              API
            </TabsTrigger>
            <TabsTrigger value="image" className="flex items-center gap-2">
              <ImageIcon size={16} />
              Images
            </TabsTrigger>
            <TabsTrigger value="ui" className="flex items-center gap-2">
              <Palette size={16} />
              UI
            </TabsTrigger>
            <TabsTrigger value="storage" className="flex items-center gap-2">
              <Database size={16} />
              Storage
            </TabsTrigger>
            <TabsTrigger value="prompts" className="flex items-center gap-2">
              <Info size={16} />
              Prompts
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Shield size={16} />
              Advanced
            </TabsTrigger>
          </TabsList>

          <div className="p-6">
            {/* API Settings */}
            <TabsContent value="api" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key size={20} />
                    API Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="openrouter-key">OpenRouter API Key</Label>
                      <Input
                        id="openrouter-key"
                        type="password"
                        value={apiSettings.openRouterKey}
                        onChange={(e) => setApiSettings(prev => ({ ...prev, openRouterKey: e.target.value }))}
                        placeholder="sk-or-v1-..."
                      />
                      <p className="text-xs text-muted-foreground">
                        Get your API key from{' '}
                        <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          OpenRouter
                        </a>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="default-model">Default Model</Label>
                      <Select
                        value={apiSettings.defaultModel}
                        onValueChange={(value) => setApiSettings(prev => ({ ...prev, defaultModel: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="deepseek/deepseek-chat-v3.1">DeepSeek Chat v3.1</SelectItem>
                          <SelectItem value="anthropic/claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                          <SelectItem value="anthropic/claude-3-haiku">Claude 3 Haiku</SelectItem>
                          <SelectItem value="openai/gpt-4">GPT-4</SelectItem>
                          <SelectItem value="openai/gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="image-provider">Image Provider</Label>
                      <Select
                        value={apiSettings.imageProvider}
                        onValueChange={(value) => setApiSettings(prev => ({ ...prev, imageProvider: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="replicate">Replicate</SelectItem>
                          <SelectItem value="openai">OpenAI DALL-E</SelectItem>
                          <SelectItem value="stability">Stability AI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="image-api-key">Image API Key</Label>
                      <Input
                        id="image-api-key"
                        type="password"
                        value={apiSettings.imageApiKey}
                        onChange={(e) => setApiSettings(prev => ({ ...prev, imageApiKey: e.target.value }))}
                        placeholder="API key for image generation"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="figma-token">Figma Access Token</Label>
                      <Input
                        id="figma-token"
                        type="password"
                        value={apiSettings.figmaToken}
                        onChange={(e) => setApiSettings(prev => ({ ...prev, figmaToken: e.target.value }))}
                        placeholder="figd_..."
                      />
                      <p className="text-xs text-muted-foreground">
                        Get your token from{' '}
                        <a href="https://www.figma.com/developers/api#access-tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          Figma Developer Settings
                        </a>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Image Generation Settings */}
            <TabsContent value="image" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon size={20} />
                    Image Generation Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="image-model">Model</Label>
                      <Select
                        value={imageSettings.model}
                        onValueChange={(value) => setImageSettings(prev => ({ ...prev, model: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="flux-1.1-pro">Flux 1.1 Pro</SelectItem>
                          <SelectItem value="flux-dev">Flux Dev</SelectItem>
                          <SelectItem value="stable-diffusion-3">Stable Diffusion 3</SelectItem>
                          <SelectItem value="dalle-3">DALL-E 3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="width">Width</Label>
                      <Input
                        id="width"
                        type="number"
                        value={imageSettings.width}
                        onChange={(e) => setImageSettings(prev => ({ ...prev, width: parseInt(e.target.value) || 1024 }))}
                        min="256"
                        max="2048"
                        step="64"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="height">Height</Label>
                      <Input
                        id="height"
                        type="number"
                        value={imageSettings.height}
                        onChange={(e) => setImageSettings(prev => ({ ...prev, height: parseInt(e.target.value) || 1024 }))}
                        min="256"
                        max="2048"
                        step="64"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="steps">Steps</Label>
                      <Input
                        id="steps"
                        type="number"
                        value={imageSettings.steps}
                        onChange={(e) => setImageSettings(prev => ({ ...prev, steps: parseInt(e.target.value) || 20 }))}
                        min="1"
                        max="100"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cfg-scale">CFG Scale</Label>
                      <Input
                        id="cfg-scale"
                        type="number"
                        step="0.1"
                        value={imageSettings.cfgScale}
                        onChange={(e) => setImageSettings(prev => ({ ...prev, cfgScale: parseFloat(e.target.value) || 7.5 }))}
                        min="1"
                        max="20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="variants">Variants</Label>
                      <Input
                        id="variants"
                        type="number"
                        value={imageSettings.variants}
                        onChange={(e) => setImageSettings(prev => ({ ...prev, variants: parseInt(e.target.value) || 1 }))}
                        min="1"
                        max="4"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sampler">Sampler</Label>
                      <Select
                        value={imageSettings.sampler}
                        onValueChange={(value) => setImageSettings(prev => ({ ...prev, sampler: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="euler">Euler</SelectItem>
                          <SelectItem value="euler_a">Euler A</SelectItem>
                          <SelectItem value="heun">Heun</SelectItem>
                          <SelectItem value="dpm++2m">DPM++ 2M</SelectItem>
                          <SelectItem value="dpm++2m_karras">DPM++ 2M Karras</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="style-preset">Style Preset</Label>
                      <Select
                        value={imageSettings.stylePreset}
                        onValueChange={(value) => setImageSettings(prev => ({ ...prev, stylePreset: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="enhance">Enhance</SelectItem>
                          <SelectItem value="anime">Anime</SelectItem>
                          <SelectItem value="photographic">Photographic</SelectItem>
                          <SelectItem value="digital-art">Digital Art</SelectItem>
                          <SelectItem value="comic-book">Comic Book</SelectItem>
                          <SelectItem value="fantasy-art">Fantasy Art</SelectItem>
                          <SelectItem value="line-art">Line Art</SelectItem>
                          <SelectItem value="low-poly">Low Poly</SelectItem>
                          <SelectItem value="neon-punk">Neon Punk</SelectItem>
                          <SelectItem value="origami">Origami</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="seed">Seed (-1 for random)</Label>
                      <Input
                        id="seed"
                        type="number"
                        value={imageSettings.seed}
                        onChange={(e) => setImageSettings(prev => ({ ...prev, seed: parseInt(e.target.value) || -1 }))}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="negative-prompt">Negative Prompt</Label>
                    <Textarea
                      id="negative-prompt"
                      value={imageSettings.negativePrompt}
                      onChange={(e) => setImageSettings(prev => ({ ...prev, negativePrompt: e.target.value }))}
                      placeholder="What you don't want in your images..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* UI Settings */}
            <TabsContent value="ui" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette size={20} />
                    User Interface
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Theme</Label>
                        <p className="text-sm text-muted-foreground">Choose your preferred color scheme</p>
                      </div>
                      <Select
                        value={uiSettings.theme}
                        onValueChange={(value) => setUiSettings(prev => ({ ...prev, theme: value }))}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Compact Mode</Label>
                        <p className="text-sm text-muted-foreground">Use smaller UI elements to fit more content</p>
                      </div>
                      <Switch
                        checked={uiSettings.compactMode}
                        onCheckedChange={(checked) => setUiSettings(prev => ({ ...prev, compactMode: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Animations</Label>
                        <p className="text-sm text-muted-foreground">Enable smooth transitions and animations</p>
                      </div>
                      <Switch
                        checked={uiSettings.showAnimations}
                        onCheckedChange={(checked) => setUiSettings(prev => ({ ...prev, showAnimations: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Auto-save</Label>
                        <p className="text-sm text-muted-foreground">Automatically save changes as you work</p>
                      </div>
                      <Switch
                        checked={uiSettings.autoSave}
                        onCheckedChange={(checked) => setUiSettings(prev => ({ ...prev, autoSave: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Notifications</Label>
                        <p className="text-sm text-muted-foreground">Show toast notifications for actions</p>
                      </div>
                      <Switch
                        checked={uiSettings.notifications}
                        onCheckedChange={(checked) => setUiSettings(prev => ({ ...prev, notifications: checked }))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Storage Settings */}
            <TabsContent value="storage" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database size={20} />
                    Data & Storage
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Auto Backup</Label>
                        <p className="text-sm text-muted-foreground">Automatically backup your data</p>
                      </div>
                      <Switch
                        checked={storageSettings.autoBackup}
                        onCheckedChange={(checked) => setStorageSettings(prev => ({ ...prev, autoBackup: checked }))}
                      />
                    </div>

                    {storageSettings.autoBackup && (
                      <>
                        <div className="space-y-2">
                          <Label>Backup Frequency</Label>
                          <Select
                            value={storageSettings.backupFrequency}
                            onValueChange={(value) => setStorageSettings(prev => ({ ...prev, backupFrequency: value }))}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hourly">Hourly</SelectItem>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="max-backups">Max Backups</Label>
                          <Input
                            id="max-backups"
                            type="number"
                            value={storageSettings.maxBackups}
                            onChange={(e) => setStorageSettings(prev => ({ ...prev, maxBackups: parseInt(e.target.value) || 10 }))}
                            min="1"
                            max="50"
                          />
                        </div>
                      </>
                    )}

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Clear Cache</Label>
                        <p className="text-sm text-muted-foreground">Clear all cached data (requires restart)</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearCache}
                        disabled={isLoading}
                        className="text-destructive hover:text-destructive"
                      >
                        {isLoading ? (
                          <ArrowClockwise size={16} className="mr-2 animate-spin" />
                        ) : (
                          <Trash size={16} className="mr-2" />
                        )}
                        {isLoading ? 'Working...' : 'Clear Cache'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Prompt Settings */}
            <TabsContent value="prompts" className="space-y-6">
              <PromptLibrary />
            </TabsContent>

            {/* Advanced Settings */}
            <TabsContent value="advanced" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield size={20} />
                    Advanced Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <Info size={16} />
                    <AlertDescription>
                      These settings are for advanced users. Changing them may affect application stability.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-medium mb-2">Debug Information</h4>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div>Storage: {legacyStorage.getItem('') ? 1 : 0} items</div>
                        <div>Session Storage: {legacyStorage.sessionLength()} items</div>
                        <div>User Agent: {navigator.userAgent.slice(0, 50)}...</div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                        <ArrowClockwise size={16} className="mr-2" />
                        Reload App
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          logger.log('Debug info:', {
                            apiSettings,
                            imageSettings,
                            uiSettings,
                            storageSettings
                          });
                          toast.success('Debug info logged to console');
                        }}
                      >
                        <Info size={16} className="mr-2" />
                        Log Debug Info
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
