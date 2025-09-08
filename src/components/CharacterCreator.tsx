import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { useHouse } from '@/hooks/useHouse';
import { Character } from '@/types';
import { Plus, X, FloppyDisk as Save } from '@phosphor-icons/react';
import { toast } from 'sonner';

interface CharacterCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  character?: Character; // For editing existing characters
}

const PRESET_ROLES = [
  'Companion', 'Advisor', 'Assistant', 'Friend', 'Mentor', 'Guardian', 'Scholar', 'Artist', 'Warrior', 'Healer'
];

const PRESET_SKILLS = [
  'Conversation', 'Empathy', 'Wisdom', 'Creativity', 'Logic', 'Humor', 'Leadership', 'Patience', 'Adventure', 'Care'
];

const PRESET_CLASSES = [
  'Friendly', 'Mysterious', 'Energetic', 'Calm', 'Playful', 'Serious', 'Romantic', 'Intellectual', 'Sporty', 'Artistic'
];

export function CharacterCreator({ open, onOpenChange, character }: CharacterCreatorProps) {
  const { addCharacter, updateCharacter } = useHouse();
  const isEditing = !!character;

  const [formData, setFormData] = useState({
    name: character?.name || '',
    description: character?.description || '',
    personality: character?.personality || '',
    appearance: character?.appearance || '',
    role: character?.role || '',
    skills: character?.skills || [],
    classes: character?.classes || [],
    prompts: {
      system: character?.prompts.system || '',
      personality: character?.prompts.personality || '',
      background: character?.prompts.background || ''
    },
    stats: {
      relationship: character?.stats.relationship || 50,
      energy: character?.stats.energy || 80,
      happiness: character?.stats.happiness || 70,
      experience: character?.stats.experience || 0,
      level: character?.stats.level || 1
    }
  });

  const [customSkill, setCustomSkill] = useState('');
  const [customClass, setCustomClass] = useState('');
  const [activeTab, setActiveTab] = useState('basic');

  const updateFormData = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as object),
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const toggleSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  const addCustomSkill = () => {
    if (customSkill.trim() && !formData.skills.includes(customSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, customSkill.trim()]
      }));
      setCustomSkill('');
    }
  };

  const toggleClass = (cls: string) => {
    setFormData(prev => ({
      ...prev,
      classes: prev.classes.includes(cls)
        ? prev.classes.filter(c => c !== cls)
        : [...prev.classes, cls]
    }));
  };

  const addCustomClass = () => {
    if (customClass.trim() && !formData.classes.includes(customClass.trim())) {
      setFormData(prev => ({
        ...prev,
        classes: [...prev.classes, customClass.trim()]
      }));
      setCustomClass('');
    }
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Character name is required');
      return;
    }

    const characterData: Character = {
      id: character?.id || `char-${Date.now()}`,
      name: formData.name.trim(),
      description: formData.description.trim(),
      personality: formData.personality.trim(),
      appearance: formData.appearance.trim(),
      role: formData.role.trim(),
      skills: formData.skills,
      classes: formData.classes,
      unlocks: character?.unlocks || [],
      prompts: formData.prompts,
      stats: formData.stats,
      lastInteraction: character?.lastInteraction,
      conversationHistory: character?.conversationHistory || [],
      memories: character?.memories || [],
      preferences: character?.preferences || {},
      createdAt: character?.createdAt || new Date(),
      updatedAt: new Date()
    };

    if (isEditing) {
      updateCharacter(character.id, characterData);
      toast.success(`${formData.name} updated successfully!`);
    } else {
      addCharacter(characterData);
      toast.success(`${formData.name} created successfully!`);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Edit ${character.name}` : 'Create New Character'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="traits">Traits & Stats</TabsTrigger>
            <TabsTrigger value="prompts">AI Prompts</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <div className="mt-4 h-[60vh] overflow-y-auto">
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateFormData('name', e.target.value)}
                    placeholder="Character name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    value={formData.role}
                    onChange={(e) => updateFormData('role', e.target.value)}
                    placeholder="e.g., Companion, Advisor"
                    list="preset-roles"
                  />
                  <datalist id="preset-roles">
                    {PRESET_ROLES.map(role => (
                      <option key={role} value={role} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  placeholder="Brief description of your character"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="personality">Personality</Label>
                <Textarea
                  id="personality"
                  value={formData.personality}
                  onChange={(e) => updateFormData('personality', e.target.value)}
                  placeholder="Describe their personality traits, quirks, and behavior"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="appearance">Appearance</Label>
                <Textarea
                  id="appearance"
                  value={formData.appearance}
                  onChange={(e) => updateFormData('appearance', e.target.value)}
                  placeholder="Physical description and style"
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="traits" className="space-y-6">
              {/* Skills */}
              <div className="space-y-3">
                <Label>Skills</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_SKILLS.map(skill => (
                    <Badge
                      key={skill}
                      variant={formData.skills.includes(skill) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleSkill(skill)}
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={customSkill}
                    onChange={(e) => setCustomSkill(e.target.value)}
                    placeholder="Add custom skill"
                    onKeyDown={(e) => e.key === 'Enter' && addCustomSkill()}
                  />
                  <Button size="sm" onClick={addCustomSkill}>
                    <Plus size={16} />
                  </Button>
                </div>
                {formData.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map(skill => (
                      <Badge key={skill} variant="secondary" className="gap-1">
                        {skill}
                        <X 
                          size={12} 
                          className="cursor-pointer hover:text-destructive"
                          onClick={() => toggleSkill(skill)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Classes */}
              <div className="space-y-3">
                <Label>Classes</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_CLASSES.map(cls => (
                    <Badge
                      key={cls}
                      variant={formData.classes.includes(cls) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleClass(cls)}
                    >
                      {cls}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={customClass}
                    onChange={(e) => setCustomClass(e.target.value)}
                    placeholder="Add custom class"
                    onKeyDown={(e) => e.key === 'Enter' && addCustomClass()}
                  />
                  <Button size="sm" onClick={addCustomClass}>
                    <Plus size={16} />
                  </Button>
                </div>
                {formData.classes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.classes.map(cls => (
                      <Badge key={cls} variant="secondary" className="gap-1">
                        {cls}
                        <X 
                          size={12} 
                          className="cursor-pointer hover:text-destructive"
                          onClick={() => toggleClass(cls)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="space-y-4">
                <Label>Initial Stats</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Relationship: {formData.stats.relationship}%</Label>
                    <Slider
                      value={[formData.stats.relationship]}
                      onValueChange={(value) => updateFormData('stats.relationship', value[0])}
                      max={100}
                      step={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Energy: {formData.stats.energy}%</Label>
                    <Slider
                      value={[formData.stats.energy]}
                      onValueChange={(value) => updateFormData('stats.energy', value[0])}
                      max={100}
                      step={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Happiness: {formData.stats.happiness}%</Label>
                    <Slider
                      value={[formData.stats.happiness]}
                      onValueChange={(value) => updateFormData('stats.happiness', value[0])}
                      max={100}
                      step={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Level: {formData.stats.level}</Label>
                    <Slider
                      value={[formData.stats.level]}
                      onValueChange={(value) => updateFormData('stats.level', value[0])}
                      min={1}
                      max={10}
                      step={1}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="prompts" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="system-prompt">System Prompt</Label>
                <Textarea
                  id="system-prompt"
                  value={formData.prompts.system}
                  onChange={(e) => updateFormData('prompts.system', e.target.value)}
                  placeholder="Base instructions for how this character should behave"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="personality-prompt">Personality Prompt</Label>
                <Textarea
                  id="personality-prompt"
                  value={formData.prompts.personality}
                  onChange={(e) => updateFormData('prompts.personality', e.target.value)}
                  placeholder="Detailed personality instructions and quirks"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="background-prompt">Background Prompt</Label>
                <Textarea
                  id="background-prompt"
                  value={formData.prompts.background}
                  onChange={(e) => updateFormData('prompts.background', e.target.value)}
                  placeholder="Character's history, memories, and context"
                  rows={4}
                />
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                    {formData.name.slice(0, 2).toUpperCase() || 'CH'}
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="text-xl font-bold">{formData.name || 'Unnamed Character'}</h3>
                      {formData.role && (
                        <Badge variant="outline" className="mt-1">{formData.role}</Badge>
                      )}
                    </div>
                    
                    {formData.description && (
                      <p className="text-muted-foreground">{formData.description}</p>
                    )}
                    
                    {formData.skills.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Skills:</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {formData.skills.map(skill => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {formData.classes.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Classes:</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {formData.classes.map(cls => (
                            <Badge key={cls} variant="outline" className="text-xs">
                              {cls}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <Label className="text-xs">Relationship</Label>
                        <div className="font-medium">{formData.stats.relationship}%</div>
                      </div>
                      <div>
                        <Label className="text-xs">Energy</Label>
                        <div className="font-medium">{formData.stats.energy}%</div>
                      </div>
                      <div>
                        <Label className="text-xs">Happiness</Label>
                        <div className="font-medium">{formData.stats.happiness}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save size={16} className="mr-2" />
              {isEditing ? 'Update' : 'Create'} Character
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}