import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { GearSix, ArrowCounterClockwise } from '@phosphor-icons/react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

// Archetype configuration stored in localStorage
interface ArchetypeConfig {
  label: string;
  pitch: string;
  ageRange: string;
  defaultAge: number;
  defaultRole: string;
  defaultRoom: string;
}

interface ArchetypeSettings {
  college: ArchetypeConfig;
  prime: ArchetypeConfig;
  fresh: ArchetypeConfig;
}

const DEFAULT_ARCHETYPES: ArchetypeSettings = {
  college: {
    label: 'College',
    pitch: 'upperclass student balancing campus life, side hustles, and thrill-seeking nights',
    ageRange: '20-23',
    defaultAge: 21,
    defaultRole: 'Campus Muse',
    defaultRoom: 'club',
  },
  prime: {
    label: 'Prime',
    pitch: 'ambitious woman in her mid-to-late twenties, polished, seductive, and in control of her world',
    ageRange: '24-32',
    defaultAge: 27,
    defaultRole: 'Prime Temptress',
    defaultRoom: 'vip',
  },
  fresh: {
    label: 'Fresh',
    pitch: 'fresh-faced adult (19-21) bursting with curiosity, playful bravado, and a drive to impress',
    ageRange: '19-21',
    defaultAge: 20,
    defaultRole: 'Fresh Muse',
    defaultRoom: 'lounge',
  },
};

const STORAGE_KEY = 'dollhouse.archetypeSettings';

// Get archetype settings from storage or return defaults
export function getArchetypeSettings(): ArchetypeSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load archetype settings:', error);
  }
  return DEFAULT_ARCHETYPES;
}

// Save archetype settings to storage
export function saveArchetypeSettings(settings: ArchetypeSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save archetype settings:', error);
    throw error;
  }
}

interface CharacterCreatorSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CharacterCreatorSettings({ open, onOpenChange }: CharacterCreatorSettingsProps) {
  const [settings, setSettings] = useState<ArchetypeSettings>(DEFAULT_ARCHETYPES);
  const [currentTab, setCurrentTab] = useState('college');

  // Load settings when dialog opens
  useEffect(() => {
    if (open) {
      setSettings(getArchetypeSettings());
    }
  }, [open]);

  const handleSave = () => {
    try {
      saveArchetypeSettings(settings);
      toast.success('Character creation settings saved');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_ARCHETYPES);
    toast.info('Settings reset to defaults (not saved yet)');
  };

  const handleResetArchetype = (archetype: keyof ArchetypeSettings) => {
    setSettings({
      ...settings,
      [archetype]: DEFAULT_ARCHETYPES[archetype],
    });
    toast.info(`${DEFAULT_ARCHETYPES[archetype].label} reset to defaults`);
  };

  const updateArchetype = (archetype: keyof ArchetypeSettings, field: keyof ArchetypeConfig, value: string | number) => {
    setSettings({
      ...settings,
      [archetype]: {
        ...settings[archetype],
        [field]: value,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col bg-gray-900 text-white overflow-hidden p-4 md:p-6">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <GearSix size={20} />
            Character Creator Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-3 w-full flex-shrink-0">
            <TabsTrigger value="college">College</TabsTrigger>
            <TabsTrigger value="prime">Prime</TabsTrigger>
            <TabsTrigger value="fresh">Fresh</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-scroll mt-4" style={{ maxHeight: 'calc(90vh - 250px)' }}>
            {(['college', 'prime', 'fresh'] as const).map((archetype) => (
              <TabsContent key={archetype} value={archetype} className="space-y-4 mt-0 pb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    {settings[archetype].label} Archetype Configuration
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResetArchetype(archetype)}
                  >
                    <ArrowCounterClockwise size={14} className="mr-2" />
                    Reset to Default
                  </Button>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div>
                    <Label htmlFor={`${archetype}-label`}>Label</Label>
                    <Input
                      id={`${archetype}-label`}
                      value={settings[archetype].label}
                      onChange={(e) => updateArchetype(archetype, 'label', e.target.value)}
                      placeholder="Display name for this archetype"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`${archetype}-pitch`}>
                      Pitch / Description
                      <span className="text-xs text-muted-foreground ml-2">
                        (This is what the AI uses to understand the archetype)
                      </span>
                    </Label>
                    <Textarea
                      id={`${archetype}-pitch`}
                      value={settings[archetype].pitch}
                      onChange={(e) => updateArchetype(archetype, 'pitch', e.target.value)}
                      placeholder="Describe this archetype for the AI"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`${archetype}-ageRange`}>Age Range</Label>
                      <Input
                        id={`${archetype}-ageRange`}
                        value={settings[archetype].ageRange}
                        onChange={(e) => updateArchetype(archetype, 'ageRange', e.target.value)}
                        placeholder="e.g., 20-23"
                      />
                    </div>

                    <div>
                      <Label htmlFor={`${archetype}-defaultAge`}>Default Age</Label>
                      <Input
                        id={`${archetype}-defaultAge`}
                        type="number"
                        min={18}
                        max={99}
                        value={settings[archetype].defaultAge}
                        onChange={(e) => updateArchetype(archetype, 'defaultAge', parseInt(e.target.value) || 18)}
                        placeholder="e.g., 21"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`${archetype}-defaultRole`}>Default Role</Label>
                      <Input
                        id={`${archetype}-defaultRole`}
                        value={settings[archetype].defaultRole}
                        onChange={(e) => updateArchetype(archetype, 'defaultRole', e.target.value)}
                        placeholder="e.g., Campus Muse"
                      />
                    </div>

                    <div>
                      <Label htmlFor={`${archetype}-defaultRoom`}>Default Room Type</Label>
                      <Input
                        id={`${archetype}-defaultRoom`}
                        value={settings[archetype].defaultRoom}
                        onChange={(e) => updateArchetype(archetype, 'defaultRoom', e.target.value)}
                        placeholder="e.g., club"
                      />
                    </div>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 space-y-2">
                    <h4 className="font-semibold text-sm text-blue-400">💡 Usage Guide</h4>
                    <ul className="text-xs text-blue-200 space-y-1">
                      <li><strong>Label:</strong> Display name shown in the UI</li>
                      <li><strong>Pitch:</strong> Description sent to AI to define the character archetype</li>
                      <li><strong>Age Range:</strong> Text shown to AI (e.g., "20-23")</li>
                      <li><strong>Default Age:</strong> Actual number assigned if not specified</li>
                      <li><strong>Default Role:</strong> Job/title assigned to characters</li>
                      <li><strong>Default Room:</strong> Preferred room type (club, vip, lounge, etc.)</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>
            ))}
          </div>
        </Tabs>

        <Separator className="flex-shrink-0 mt-4" />

        <div className="flex justify-between items-center flex-shrink-0 gap-2">
          <Button variant="outline" onClick={handleReset}>
            <ArrowCounterClockwise size={16} className="mr-2" />
            Reset All to Defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <GearSix size={16} className="mr-2" />
              Save Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
