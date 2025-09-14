import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHouse } from '@/hooks/useHouse';
import { Character, AVAILABLE_PERSONALITIES, AVAILABLE_ROLES, AVAILABLE_TRAITS } from '@/types';
import { Plus, X, FloppyDisk as Save, DotsThree, Image as ImageIcon, Spinner } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { AIService } from '@/lib/aiService';

interface CharacterCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  character?: Character; // For editing existing characters
}

const PRESET_CLASSES = [
  'Friendly', 'Mysterious', 'Energetic', 'Calm', 'Playful', 'Serious', 'Romantic', 'Intellectual', 'Sporty', 'Artistic'
];

export function CharacterCreator({ open, onOpenChange, character }: CharacterCreatorProps) {
  const { house, addCharacter, updateCharacter } = useHouse();
  const isEditing = !!character;

  const [formData, setFormData] = useState({
    name: character?.name || '',
    description: character?.description || '',
    personality: character?.personality || '',
    appearance: character?.appearance || '',
    role: character?.role || '',
    personalities: character?.personalities || [],
    traits: character?.traits || [],
    classes: character?.classes || [],
    avatar: character?.avatar || '',
    prompts: {
      system: character?.prompts.system || '',
      personality: character?.prompts.personality || '',
      background: character?.prompts.background || ''
    },
    stats: {
      love: character?.stats.love || 50,
      happiness: character?.stats.happiness || 70,
      wet: character?.stats.wet || 80,
      willing: character?.stats.willing || 50,
      selfEsteem: character?.stats.selfEsteem || 50,
      loyalty: character?.stats.loyalty || 50,
      fight: character?.stats.fight || 20,
      pain: character?.stats.pain || 30,
      experience: character?.stats.experience || 0,
      level: character?.stats.level || 1
    }
  });

  const [customPersonality, setCustomPersonality] = useState('');
  const [customTrait, setCustomTrait] = useState('');
  const [customClass, setCustomClass] = useState('');
  const [activeTab, setActiveTab] = useState('basic');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const handleGenerateImage = async () => {
    if (!formData.appearance.trim()) {
      toast.error('Please describe the character\'s appearance first');
      return;
    }

    setIsGeneratingImage(true);
    try {
      const prompt = `Create a portrait image of a ${formData.role || 'young woman'} character: ${formData.appearance}. ${formData.name ? `Name: ${formData.name}.` : ''} Style: realistic, detailed, high quality, character portrait.`;
      
      const imageUrl = await AIService.generateImage(prompt);
      
      if (imageUrl) {
        updateFormData('avatar', imageUrl);
        toast.success('Character image generated successfully!');
      } else {
        toast.error('Failed to generate image. Please check your Venice AI settings.');
      }
    } catch (error) {
      console.error('Image generation error:', error);
      toast.error('Failed to generate image: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsGeneratingImage(false);
    }
  };

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

  const togglePersonality = (personality: string) => {
    setFormData(prev => ({
      ...prev,
      personalities: prev.personalities.includes(personality)
        ? prev.personalities.filter(p => p !== personality)
        : [...prev.personalities, personality]
    }));
  };

  const addCustomPersonality = () => {
    if (customPersonality.trim() && !formData.personalities.includes(customPersonality.trim())) {
      setFormData(prev => ({
        ...prev,
        personalities: [...prev.personalities, customPersonality.trim()]
      }));
      setCustomPersonality('');
    }
  };

  const toggleTrait = (trait: string) => {
    setFormData(prev => ({
      ...prev,
      traits: prev.traits.includes(trait)
        ? prev.traits.filter(s => s !== trait)
        : [...prev.traits, trait]
    }));
  };

  const addCustomTrait = () => {
    if (customTrait.trim() && !formData.traits.includes(customTrait.trim())) {
      setFormData(prev => ({
        ...prev,
        traits: [...prev.traits, customTrait.trim()]
      }));
      setCustomTrait('');
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
    // Validation
    const errors: string[] = [];
    
    if (!formData.name.trim()) {
      errors.push('Character name is required');
    }
    
    if (formData.name.trim().length > 50) {
      errors.push('Character name must be 50 characters or less');
    }
    
    if (!formData.description.trim()) {
      errors.push('Character description is required');
    }
    
    if (formData.description.trim().length > 500) {
      errors.push('Character description must be 500 characters or less');
    }
    
    if (!formData.personality.trim()) {
      errors.push('Character personality is required');
    }
    
    if (formData.personality.trim().length > 1000) {
      errors.push('Character personality must be 1000 characters or less');
    }
    
    if (formData.personalities.length === 0) {
      errors.push('At least one personality trait is required');
    }
    
    if (formData.traits.length === 0) {
      errors.push('At least one trait is required');
    }
    
    // Check for duplicate names (only for new characters)
    if (!isEditing && house.characters?.some(c => 
      c.name.toLowerCase() === formData.name.trim().toLowerCase()
    )) {
      errors.push('A character with this name already exists');
    }
    
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return;
    }

    try {
      // Find the first available room for the new character
      const availableRoom = house.rooms?.find(room => 
        room.residents.length < room.capacity && room.unlocked
      ) || house.rooms?.[0]; // Fallback to first room if none available

      const characterData: Character = {
        id: character?.id || `char-${Date.now()}`,
        name: formData.name.trim(),
        description: formData.description.trim(),
        personality: formData.personality.trim(),
        appearance: formData.appearance.trim(),
        role: formData.role.trim(),
        avatar: formData.avatar,
        personalities: formData.personalities,
        traits: formData.traits,
        classes: formData.classes,
        rarity: 'common', // Default rarity
        unlocks: character?.unlocks || [],
        prompts: formData.prompts,
        stats: {
          love: formData.stats.love,
          happiness: formData.stats.happiness,
          wet: formData.stats.wet,
          willing: formData.stats.willing,
          selfEsteem: formData.stats.selfEsteem,
          loyalty: formData.stats.loyalty,
          fight: formData.stats.fight,
          stamina: 50,
          pain: formData.stats.pain,
          experience: 0,
          level: 1
        },
        skills: character?.skills || {
          hands: 20,
          mouth: 20,
          missionary: 20,
          doggy: 20,
          cowgirl: 20
        },
        roomId: character?.roomId || availableRoom?.id || 'common-room', // Assign to available room
        lastInteraction: character?.lastInteraction,
        conversationHistory: character?.conversationHistory || [],
        memories: character?.memories || [],
        preferences: character?.preferences || {},
        relationships: character?.relationships || {},
        progression: character?.progression || {
          level: 1,
          nextLevelExp: 100,
          unlockedFeatures: [],
          achievements: [],
          relationshipStatus: 'stranger',
          affection: 50,
          trust: 50,
          intimacy: 0,
          dominance: 50,
          jealousy: 30,
          possessiveness: 30,
          sexualExperience: 0,
          kinks: [],
          limits: [],
          fantasies: [],
          unlockedPositions: [],
          unlockedOutfits: [],
          unlockedToys: [],
          unlockedScenarios: [],
          relationshipMilestones: [],
          sexualMilestones: [],
          significantEvents: [],
          memorableEvents: [],
          bonds: {},
          sexualCompatibility: {
            overall: 50,
            kinkAlignment: 50,
            stylePreference: 50
          },
          userPreferences: {
            likes: [],
            dislikes: [],
            turnOns: [],
            turnOffs: []
          }
        },
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
    } catch (error) {
      console.error('Error saving character:', error);
      toast.error('Failed to save character. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-none sm:w-[92vw] md:w-[88vw] lg:w-[80vw] xl:w-[75vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Edit ${character.name}` : 'Create New Character'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="attributes">Attributes</TabsTrigger>
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
                    placeholder="e.g., nurse, student, secretary"
                    list="preset-roles"
                  />
                  <datalist id="preset-roles">
                    {AVAILABLE_ROLES.map(role => (
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
                <div className="flex gap-2">
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm" 
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImage || !formData.appearance.trim()}
                    className="flex items-center gap-2"
                  >
                    {isGeneratingImage ? (
                      <Spinner size={16} className="animate-spin" />
                    ) : (
                      <ImageIcon size={16} />
                    )}
                    {isGeneratingImage ? 'Generating...' : 'Generate Image'}
                  </Button>
                  {formData.avatar && (
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm" 
                      onClick={() => updateFormData('avatar', '')}
                    >
                      Clear Image
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="attributes" className="space-y-6">
              {/* Personalities */}
              <div className="space-y-3">
                <Label>Personalities</Label>
                <div className="flex flex-wrap gap-2 items-center">
                  {/* Show first 6 personalities as badges */}
                  {AVAILABLE_PERSONALITIES.slice(0, 6).map(personality => (
                    <Badge
                      key={personality}
                      variant={formData.personalities.includes(personality) ? "default" : "outline"}
                      className="cursor-pointer capitalize"
                      onClick={() => togglePersonality(personality)}
                    >
                      {personality}
                    </Badge>
                  ))}
                  
                  {/* More button with popover */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
                        <DotsThree size={12} className="mr-1" />
                        More
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-4" align="start">
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">All Personalities</Label>
                        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                          {AVAILABLE_PERSONALITIES.map(personality => (
                            <Badge
                              key={personality}
                              variant={formData.personalities.includes(personality) ? "default" : "outline"}
                              className="cursor-pointer capitalize text-xs justify-center"
                              onClick={() => togglePersonality(personality)}
                            >
                              {personality}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="flex gap-2">
                  <Input
                    value={customPersonality}
                    onChange={(e) => setCustomPersonality(e.target.value)}
                    placeholder="Add custom personality"
                    onKeyDown={(e) => e.key === 'Enter' && addCustomPersonality()}
                  />
                  <Button size="sm" onClick={addCustomPersonality}>
                    <Plus size={16} />
                  </Button>
                </div>
                
                {formData.personalities.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.personalities.map(personality => (
                      <Badge key={personality} variant="secondary" className="gap-1 capitalize">
                        {personality}
                        <X 
                          size={12} 
                          className="cursor-pointer hover:text-destructive"
                          onClick={() => togglePersonality(personality)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Traits */}
              <div className="space-y-3">
                <Label>Traits</Label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_TRAITS.map(trait => (
                    <Badge
                      key={trait}
                      variant={formData.traits.includes(trait) ? "default" : "outline"}
                      className="cursor-pointer capitalize"
                      onClick={() => toggleTrait(trait)}
                    >
                      {trait}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={customTrait}
                    onChange={(e) => setCustomTrait(e.target.value)}
                    placeholder="Add custom trait"
                    onKeyDown={(e) => e.key === 'Enter' && addCustomTrait()}
                  />
                  <Button size="sm" onClick={addCustomTrait}>
                    <Plus size={16} />
                  </Button>
                </div>
                {formData.traits.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.traits.map(trait => (
                      <Badge key={trait} variant="secondary" className="gap-1 capitalize">
                        {trait}
                        <X 
                          size={12} 
                          className="cursor-pointer hover:text-destructive"
                          onClick={() => toggleTrait(trait)}
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
                    <Label className="text-sm">Love: {formData.stats.love}%</Label>
                    <Slider
                      value={[formData.stats.love]}
                      onValueChange={(value) => updateFormData('stats.love', value[0])}
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
                    <Label className="text-sm">Wet: {formData.stats.wet}%</Label>
                    <Slider
                      value={[formData.stats.wet]}
                      onValueChange={(value) => updateFormData('stats.wet', value[0])}
                      max={100}
                      step={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Willing: {formData.stats.willing}%</Label>
                    <Slider
                      value={[formData.stats.willing]}
                      onValueChange={(value) => updateFormData('stats.willing', value[0])}
                      max={100}
                      step={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Self Esteem: {formData.stats.selfEsteem}%</Label>
                    <Slider
                      value={[formData.stats.selfEsteem]}
                      onValueChange={(value) => updateFormData('stats.selfEsteem', value[0])}
                      max={100}
                      step={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Loyalty: {formData.stats.loyalty}%</Label>
                    <Slider
                      value={[formData.stats.loyalty]}
                      onValueChange={(value) => updateFormData('stats.loyalty', value[0])}
                      max={100}
                      step={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Fight: {formData.stats.fight}%</Label>
                    <Slider
                      value={[formData.stats.fight]}
                      onValueChange={(value) => updateFormData('stats.fight', value[0])}
                      max={100}
                      step={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Pain: {formData.stats.pain}%</Label>
                    <Slider
                      value={[formData.stats.pain]}
                      onValueChange={(value) => updateFormData('stats.pain', value[0])}
                      max={100}
                      step={5}
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
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg overflow-hidden">
                    {formData.avatar ? (
                      <img 
                        src={formData.avatar} 
                        alt={formData.name || 'Character'} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to initials if image fails to load
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.textContent = formData.name.slice(0, 2).toUpperCase() || 'CH';
                        }}
                      />
                    ) : (
                      formData.name.slice(0, 2).toUpperCase() || 'CH'
                    )}
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
                    
                    {formData.personalities.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Personalities:</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {formData.personalities.map(personality => (
                            <Badge key={personality} variant="default" className="text-xs capitalize">
                              {personality}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {formData.traits.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Traits:</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {formData.traits.map(trait => (
                            <Badge key={trait} variant="secondary" className="text-xs capitalize">
                              {trait}
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
                        <Label className="text-xs">Love</Label>
                        <div className="font-medium">{formData.stats.love}%</div>
                      </div>
                      <div>
                        <Label className="text-xs">Wet</Label>
                        <div className="font-medium">{formData.stats.wet}%</div>
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