import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { useSetting, useSettings } from '@/hooks/useSettings';
import { CopilotPreset } from '@/lib/llm';
import { uuid } from '@/lib/uuid';
import { Check, PencilSimple, Plus, Trash } from '@phosphor-icons/react';
import { useState } from 'react';
import { toast } from 'sonner';

export function CopilotPresets() {
  const { setSetting } = useSettings();
  const { data: presetsData } = useSetting('copilot_presets');
  const { data: currentPresetId } = useSetting('current_preset');
  
  const [showDialog, setShowDialog] = useState(false);
  const [editingPreset, setEditingPreset] = useState<CopilotPreset | null>(null);
  
  const presets: CopilotPreset[] = Array.isArray(presetsData) ? presetsData : [
    {
      id: 'default',
      name: 'Default',
      systemPrompt: 'You are a helpful AI assistant for character creation.',
      params: { temperature: 0.8, max_tokens: 1000, top_p: 0.9 }
    }
  ];

  const [formData, setFormData] = useState<Partial<CopilotPreset>>({
    name: '',
    systemPrompt: '',
    params: { temperature: 0.8, max_tokens: 1000, top_p: 0.9 }
  });

  const handleSelectPreset = async (presetId: string) => {
    setSetting({ key: 'current_preset', value: presetId });
    toast.success('Preset switched successfully!');
  };

  const handleSavePreset = async () => {
    if (!formData.name?.trim() || !formData.systemPrompt?.trim()) {
      toast.error('Name and system prompt are required');
      return;
    }

    const newPreset: CopilotPreset = {
      id: editingPreset?.id || uuid(),
      name: formData.name.trim(),
      systemPrompt: formData.systemPrompt.trim(),
      params: formData.params || { temperature: 0.8, max_tokens: 1000, top_p: 0.9 }
    };

    let updatedPresets;
    if (editingPreset) {
      updatedPresets = presets.map(p => p.id === editingPreset.id ? newPreset : p);
      toast.success('Preset updated successfully!');
    } else {
      updatedPresets = [...presets, newPreset];
      toast.success('Preset created successfully!');
    }

    setSetting({ key: 'copilot_presets', value: JSON.stringify(updatedPresets) });
    setShowDialog(false);
    resetForm();
  };

  const handleEditPreset = (preset: CopilotPreset) => {
    setEditingPreset(preset);
    setFormData(preset);
    setShowDialog(true);
  };

  const handleDeletePreset = async (presetId: string) => {
    if (presetId === 'default') {
      toast.error('Cannot delete default preset');
      return;
    }

    const updatedPresets = presets.filter(p => p.id !== presetId);
    setSetting({ key: 'copilot_presets', value: JSON.stringify(updatedPresets) });

    // If the deleted preset was active, switch to default
    if (currentPresetId === presetId) {
      setSetting({ key: 'current_preset', value: 'default' });
    }

    toast.success('Preset deleted successfully!');
  };

  const resetForm = () => {
    setEditingPreset(null);
    setFormData({
      name: '',
      systemPrompt: '',
      params: { temperature: 0.8, max_tokens: 1000, top_p: 0.9 }
    });
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateParams = (param: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      params: { ...prev.params, [param]: value }
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Copilot Presets</h3>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              New Preset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto overscroll-contain">
            <DialogHeader>
              <DialogTitle>
                {editingPreset ? 'Edit Preset' : 'Create New Preset'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="preset-name">Name</Label>
                <Input
                  id="preset-name"
                  value={formData.name || ''}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  placeholder="Preset name..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="system-prompt">System Prompt</Label>
                <Textarea
                  id="system-prompt"
                  value={formData.systemPrompt || ''}
                  onChange={(e) => updateFormData('systemPrompt', e.target.value)}
                  placeholder="System instructions for the AI..."
                  rows={6}
                />
              </div>

              <div className="space-y-4">
                <Label>Parameters</Label>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="temperature">Temperature</Label>
                      <span className="text-sm text-muted-foreground">
                        {formData.params?.temperature || 0.8}
                      </span>
                    </div>
                    <Slider
                      id="temperature"
                      min={0}
                      max={2}
                      step={0.1}
                      value={[formData.params?.temperature || 0.8]}
                      onValueChange={([value]) => updateParams('temperature', value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="max-tokens">Max Tokens</Label>
                      <span className="text-sm text-muted-foreground">
                        {formData.params?.max_tokens || 1000}
                      </span>
                    </div>
                    <Slider
                      id="max-tokens"
                      min={100}
                      max={4000}
                      step={50}
                      value={[formData.params?.max_tokens || 1000]}
                      onValueChange={([value]) => updateParams('max_tokens', value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="top-p">Top P</Label>
                      <span className="text-sm text-muted-foreground">
                        {formData.params?.top_p || 0.9}
                      </span>
                    </div>
                    <Slider
                      id="top-p"
                      min={0}
                      max={1}
                      step={0.05}
                      value={[formData.params?.top_p || 0.9]}
                      onValueChange={([value]) => updateParams('top_p', value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSavePreset}>
                {editingPreset ? 'Update' : 'Create'} Preset
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {presets.map((preset) => (
          <Card key={preset.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{preset.name}</CardTitle>
                  {currentPresetId === preset.id && (
                    <Badge variant="default" className="text-xs">
                      <Check className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditPreset(preset)}
                  >
                    <PencilSimple className="w-4 h-4" />
                  </Button>
                  {preset.id !== 'default' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePreset(preset.id)}
                    >
                      <Trash className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {preset.systemPrompt.length > 100 
                  ? preset.systemPrompt.substring(0, 100) + '...'
                  : preset.systemPrompt}
              </p>
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span>Temp: {preset.params.temperature}</span>
                <span>Max: {preset.params.max_tokens}</span>
                <span>Top-P: {preset.params.top_p}</span>
              </div>
              {currentPresetId !== preset.id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectPreset(preset.id)}
                  className="w-full"
                >
                  Switch to this preset
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}