import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { AIService } from '@/lib/aiService';
import { populateCharacterProfile } from '@/lib/characterProfileBuilder';
import { logger } from '@/lib/logger';
import { formatPrompt } from '@/lib/prompts';
import { Character } from '@/types';
import {
    Image as ImageIcon,
    Plus,
    FloppyDisk as Save,
    Sparkle,
    User,
    X
} from '@phosphor-icons/react';
import React, { useState } from 'react';
import { toast } from 'sonner';

interface CharacterCreatorProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  character?: Character;
}

const PERSONALITY_OPTIONS = [
  'Adventurous', 'Affectionate', 'Agreeable', 'Aloof', 'Ambitious', 'Analytical', 'Artistic', 'Assertive', 'Athletic', 'Authentic', 'Balanced', 'Bashful', 'Bold', 'Bookish', 'Bouncy', 'Brave', 'Bubbly', 'Calm', 'Candid', 'Caring', 'Charismatic', 'Charming', 'Cheeky', 'Chill', 'Clever', 'Compassionate', 'Competitive', 'Confident', 'Considerate', 'Cooperative', 'Courteous', 'Coy', 'Curious', 'Cute', 'Daring', 'Decisive', 'Dependable', 'Devoted', 'Diligent', 'Direct', 'Discreet', 'Dominant', 'Dreamy', 'Driven', 'Dry-Humored', 'Dutiful', 'Easygoing', 'Eccentric', 'Elegant', 'Eloquent', 'Empathetic', 'Energetic', 'Enthusiastic', 'Ethereal', 'Excitable', 'Expressive', 'Extroverted', 'Feisty', 'Feminine', 'Fierce', 'Flirtatious', 'Focused', 'Forgiving', 'Forthright', 'Fresh', 'Friendly', 'Funny', 'Gentle', 'Genuine', 'Giving', 'Goofy', 'Graceful', 'Gritty', 'Grounded', 'Happy-Go-Lucky', 'Hardworking', 'Helpful', 'Honest', 'Hopeful', 'Humble', 'Humorous', 'Hyper', 'Idealistic', 'Imaginative', 'Indecisive', 'Independent', 'Individualistic', 'Innocent', 'Intellectual', 'Intense', 'Introverted', 'Intuitive', 'Inventive', 'Irreverent', 'Jovial', 'Joyful', 'Kind', 'Laid-Back', 'Lively', 'Logical', 'Loyal', 'Magnetic', 'Mature', 'Mellow', 'Methodical', 'Modest', 'Mysterious', 'Mystical', 'Naive', 'Nerdy', 'Nurturing', 'Observant', 'Open-Minded', 'Optimistic', 'Organized', 'Outdoorsy', 'Outgoing', 'Passionate', 'Patient', 'Perceptive', 'Perky', 'Persistent', 'Personable', 'Playful', 'Plucky', 'Poised', 'Polished', 'Polite', 'Practical', 'Precise', 'Protective', 'Proud', 'Pure', 'Quick-Witted', 'Quiet', 'Quirky', 'Rational', 'Reassuring', 'Rebellious', 'Reflective', 'Reliable', 'Reserved', 'Resourceful', 'Respectful', 'Romantic', 'Sassy', 'Savvy', 'Seductive', 'Sensible', 'Sensitive', 'Serene', 'Serious', 'Shy', 'Sincere', 'Sly', 'Snarky', 'Social', 'Sophisticated', 'Spiritual', 'Spontaneous', 'Sporty', 'Steadfast', 'Stoic', 'Strong-Willed', 'Stubborn', 'Submissive', 'Supportive', 'Sweet', 'Talkative', 'Teasing', 'Tenacious', 'Thoughtful', 'Timid', 'Tolerant', 'Touchy', 'Trusting', 'Trustworthy', 'Unconfident', 'Understanding', 'Untouched', 'Upbeat', 'Versatile', 'Vibrant', 'Virginal', 'Visionary', 'Vulnerable', 'Warm', 'Whimsical', 'Willing', 'Witty', 'Worldly', 'Youthful', 'Zany', 'Zen'

];

const FEATURE_OPTIONS = [
'Short hair', 'Long Straight hair', 'Messy bun', 'Pigtails', 'Braids', 'Ponytail', 'High Ponytail', 'Dyed hair', 'Bangs', 'Twintails',
'Blue eyes', 'Brown eyes', 'Green eyes', 'Hazel eyes', 'Bright eyes', 'Big eyes', 'Almond eyes',
'Petite', 'Curvy', 'Skinny', 'Toned', 'Flexible', 'Delicate frame', 'Tiny', 'Bubble Butt', 'Big Tits', 'Child Body', 'Flat Chest', 'Big Ass',
'Glasses', 'Freckles', 'Dimples', 'Rosy cheeks', 'Tan skin', 'Big Pretty Lips', 'Long Tongue', 'No Gag Reflex',
'Beautiful smile', 'Expressive eyes', 'Puppy Dog Eyes', 'Adorable', 'Cute', 'Sexy', 'Natural beauty', 'Youthful glow', 'Playful grin', 'Cute Face Paintings', 'Naughty Smile'

];

const ROLE_OPTIONS = [
  'In Training', 'Good Girl', 'Bad Girl', 'Kinky Girl', 'Abused Girl', 'Dont touch Me Girl', 'Stuck Up Girl', 'Daddys Girl'
];

export function CharacterCreator({ open = false, onOpenChange, character }: CharacterCreatorProps) {
  const { addCharacter, isLoading } = useHouseFileStorage();
  const createCharacter = addCharacter;
  const isCreating = isLoading;
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentTab, setCurrentTab] = useState('basic');
  
  // Simplified form state
  const [name, setName] = useState(character?.name || '');
  const [role, setRole] = useState(character?.role || '');
  const [description, setDescription] = useState(character?.description || '');
  const [personality, setPersonality] = useState(character?.personality || '');
  const [appearance, setAppearance] = useState(character?.appearance || '');
  const [avatar, setAvatar] = useState(character?.avatar || '');
  const [personalities, setPersonalities] = useState<string[]>(character?.personalities || []);
  const [features, setFeatures] = useState<string[]>(character?.features || []);

  const addToArray = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    if (!value.trim()) return;
    setter(prev => [...prev, value.trim()]);
  };

  const removeFromArray = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const generateCharacterData = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);
    
    try {
      // Generate personality traits using prompt library
      setGenerationProgress(25);
      const personalityPrompt = formatPrompt('character.creator.personalityPrompt');
      const personalityResponse = await AIService.generateResponse(personalityPrompt);
      const generatedPersonalities = personalityResponse.split(',').map(p => p.trim()).filter(Boolean);
      setPersonalities(generatedPersonalities);
      setPersonality(generatedPersonalities.join(', '));
      
      // Generate physical features using prompt library
      setGenerationProgress(50);
      const featuresPrompt = formatPrompt('character.creator.featuresPrompt');
      const featuresResponse = await AIService.generateResponse(featuresPrompt);
      const generatedFeatures = featuresResponse.split(',').map(f => f.trim()).filter(Boolean);
      setFeatures(generatedFeatures);
      
      // Generate background story using prompt library
      setGenerationProgress(75);
      const backgroundPrompt = formatPrompt('character.creator.backgroundPrompt', {
        personalityTraits: generatedPersonalities.join(', '),
        featureTraits: generatedFeatures.join(', ')
      });
      const backgroundResponse = await AIService.generateResponse(backgroundPrompt);
      setDescription(backgroundResponse);
      setAppearance(generatedFeatures.join(', '));
      
      setGenerationProgress(100);
      toast.success('Character data generated successfully!');
      
    } catch (error) {
  logger.error('Generation error:', error);
      toast.error('Failed to generate character data. Please check your AI settings.');
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  const generateImage = async () => {
    if (!name) {
      toast.error('Please enter a character name first');
      return;
    }

    setIsGenerating(true);
    try {
      // Create image prompt from character data
      const prompt = `Portrait of ${name}, ${role || 'person'}, ${
        features.slice(0, 3).join(', ') || 'attractive features'
      }, ${personalities.slice(0, 2).join(' and ') || 'friendly personality'}, high quality, detailed`;
      
  const imageUrl = await AIService.generateImage(prompt, { hide_watermark: true });
      
      if (imageUrl) {
        setAvatar(imageUrl);
        toast.success('Character image generated!');
      } else {
        toast.error('Image generation failed');
      }
    } catch (error) {
  logger.error('Image generation error:', error);
      toast.error('Failed to generate image. Please check your AI settings.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Character name is required');
      return;
    }

    try {
      const now = new Date();
      const newCharacter: Character = {
        id: crypto.randomUUID(),
        name: name.trim(),
        description: description.trim(),
        personality: personality.trim(),
        appearance: appearance.trim(),
        avatar: avatar || undefined,
        roomId: undefined,
        stats: {
          love: 50, happiness: 50, wet: 0, willing: 50, selfEsteem: 50, loyalty: 50, fight: 20, stamina: 50, pain: 30, experience: 0, level: 1
        },
        skills: { hands: 20, mouth: 20, missionary: 20, doggy: 20, cowgirl: 20 },
        role: role || 'companion',
        personalities: personalities,
        features: features,
        classes: [],
        unlocks: [],
        rarity: 'common',
        specialAbility: undefined,
        preferredRoomType: 'shared',
        imageDescription: description.trim(),
        physicalStats: { hairColor: '', eyeColor: '', height: '', weight: '', skinTone: '' },
        prompts: {
          system: `You are ${name}. ${personality ? `Your personality: ${personality}. ` : ''}${description ? `Background: ${description}` : ''}`.trim(),
          description: description.trim(),
          personality: personality.trim(),
          background: description.trim(),
          appearance: appearance.trim(),
          responseStyle: 'Keep replies playful, attentive, and true to her desires.',
          originScenario: `${name} is an adult who crossed paths with the user, felt the chemistry instantly, and chose to return to the Dollhouse for more.`,
        },
        lastInteraction: undefined,
        conversationHistory: [],
        memories: [],
        preferences: {},
        relationships: {},
        progression: {
          level: 1, nextLevelExp: 100, unlockedFeatures: [], achievements: [],
          relationshipStatus: 'stranger', affection: 50, trust: 50, intimacy: 20, dominance: 50, jealousy: 30, possessiveness: 40,
          sexualExperience: 0, kinks: [], limits: [], fantasies: [], unlockedPositions: [], unlockedOutfits: [], unlockedToys: [], unlockedScenarios: [],
          relationshipMilestones: [], sexualMilestones: [], significantEvents: [], storyChronicle: [], memorableEvents: [], bonds: {}, sexualCompatibility: { overall: 50, kinkAlignment: 50, stylePreference: 50 }, userPreferences: { likes: [], dislikes: [], turnOns: [], turnOffs: [] }
        },
        createdAt: now,
        updatedAt: now,
      };

      const enrichedCharacter = await populateCharacterProfile(newCharacter, {
        request: `Keep these canon facts: role ${newCharacter.role || 'companion'}, personality ${newCharacter.personality}, description ${newCharacter.description}, appearance ${newCharacter.appearance}. Generate cohesive prompts that keep her voice consistent and expand her backstory slightly.`,
        name: newCharacter.name,
        existing: newCharacter,
        mode: 'preserve'
      });

      await createCharacter(enrichedCharacter);

      // Reset form and close dialog
      setName('');
      setRole('');
      setDescription('');
      setPersonality('');
      setAppearance('');
      setAvatar('');
      setPersonalities([]);
      setFeatures([]);
      setCurrentTab('basic');
      onOpenChange?.(false);
    } catch (error) {
  logger.error('Save error:', error);
      toast.error('Failed to save character');
    }
  };

  const handleClose = () => {
    setName('');
    setRole('');
    setDescription('');
    setPersonality('');
    setAppearance('');
    setAvatar('');
    setPersonalities([]);
    setFeatures([]);
    setCurrentTab('basic');
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-gray-900 text-white" style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <User size={20} />
            {character ? 'Edit Character' : 'Create New Character'}
          </DialogTitle>
        </DialogHeader>

        {isGenerating && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkle size={16} className="animate-spin" />
              <span className="text-sm">Generating character data...</span>
            </div>
            <Progress value={generationProgress} className="h-2" />
          </div>
        )}

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="flex-1">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="generation">AI Generation</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh] mt-4">
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Character name"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map(roleOption => (
                        <SelectItem key={roleOption} value={roleOption}>{roleOption}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Character description and background"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="personality">Personality</Label>
                <Textarea
                  id="personality"
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  placeholder="Character personality traits"
                  rows={2}
                />
              </div>

              <div>
                <Label>Personality Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {personalities.map((p, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {p}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-4 w-4 p-0"
                        onClick={() => removeFromArray(setPersonalities, index)}
                      >
                        <X size={12} />
                      </Button>
                    </Badge>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {PERSONALITY_OPTIONS.filter(p => !personalities.includes(p)).slice(0, 10).map(p => (
                    <Button
                      key={p}
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs"
                      onClick={() => addToArray(setPersonalities, p)}
                    >
                      <Plus size={10} className="mr-1" />
                      {p}
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-4">
              <div>
                <Label htmlFor="appearance">Appearance Description</Label>
                <Textarea
                  id="appearance"
                  value={appearance}
                  onChange={(e) => setAppearance(e.target.value)}
                  placeholder="Physical appearance description"
                  rows={3}
                />
              </div>

              <div>
                <Label>Physical Features</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {features.map((feature, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {feature}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-4 w-4 p-0"
                        onClick={() => removeFromArray(setFeatures, index)}
                      >
                        <X size={12} />
                      </Button>
                    </Badge>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {FEATURE_OPTIONS.filter(f => !features.includes(f)).slice(0, 10).map(feature => (
                    <Button
                      key={feature}
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs"
                      onClick={() => addToArray(setFeatures, feature)}
                    >
                      <Plus size={10} className="mr-1" />
                      {feature}
                    </Button>
                  ))}
                </div>
              </div>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Character Image</h3>
                  <Button onClick={generateImage} disabled={isGenerating} size="sm">
                    <ImageIcon size={16} className="mr-2" />
                    Generate Image
                  </Button>
                </div>
                
                {avatar && (
                  <div className="mb-4">
                    <img 
                      src={avatar} 
                      alt={name || 'Character'} 
                      className="w-32 h-32 object-cover rounded-lg mx-auto"
                    />
                  </div>
                )}
                
                <div>
                  <Label>Image URL</Label>
                  <Input
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    placeholder="Character image URL"
                  />
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="generation" className="space-y-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-4">AI Character Generation</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Use AI to automatically generate character traits, features, and background story.
                </p>
                <Button onClick={generateCharacterData} disabled={isGenerating} className="w-full">
                  <Sparkle size={16} className="mr-2" />
                  Generate Complete Character
                </Button>
              </Card>

              <Card className="p-4">
                <h3 className="font-semibold mb-4">AI Image Generation</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate a character portrait based on the name, role, and features you've defined.
                </p>
                <Button onClick={generateImage} disabled={isGenerating || !name} className="w-full">
                  <ImageIcon size={16} className="mr-2" />
                  Generate Character Image
                </Button>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <Separator />

        <div className="flex justify-between">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isCreating}>
            <Save size={16} className="mr-2" />
            {isCreating ? 'Creating...' : 'Create Character'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}