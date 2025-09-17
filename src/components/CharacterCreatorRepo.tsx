import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useCharacters } from '@/hooks/useCharacters';
import { generateCharacterDraft } from '@/lib/llm';
import { FloppyDisk, Plus, Sparkle, X } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface CharacterCreatorRepoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  character?: any; // For editing existing characters from repo
}

export function CharacterCreatorRepo({ open, onOpenChange, character }: CharacterCreatorRepoProps) {
  const { createCharacter, updateCharacter, isCreating, isUpdating } = useCharacters();
  const isEditing = !!character;

  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    system_prompt: '',
    avatar_path: '',
    traits: {} as Record<string, any>,
    tags: [] as string[],
    guidance: '', // New field for Task 5
  });

  const [customTag, setCustomTag] = useState('');
  const [customTrait, setCustomTrait] = useState('');
  const [customTraitValue, setCustomTraitValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (character) {
      setFormData({
        name: character.name || '',
        bio: character.bio || '',
        system_prompt: character.system_prompt || '',
        avatar_path: character.avatar_path || '',
        traits: character.traits_json ? JSON.parse(character.traits_json) : {},
        tags: character.tags_json ? JSON.parse(character.tags_json) : [],
        guidance: '',
      });
    } else {
      // Reset form for new character
      setFormData({
        name: '',
        bio: '',
        system_prompt: '',
        avatar_path: '',
        traits: {},
        tags: [],
        guidance: '',
      });
    }
  }, [character, open]);

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    if (customTag.trim() && !formData.tags.includes(customTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, customTag.trim()]
      }));
      setCustomTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const addTrait = () => {
    if (customTrait.trim() && customTraitValue.trim()) {
      setFormData(prev => ({
        ...prev,
        traits: {
          ...prev.traits,
          [customTrait.trim()]: customTraitValue.trim()
        }
      }));
      setCustomTrait('');
      setCustomTraitValue('');
    }
  };

  const removeTrait = (traitKey: string) => {
    setFormData(prev => ({
      ...prev,
      traits: Object.fromEntries(
        Object.entries(prev.traits).filter(([key]) => key !== traitKey)
      )
    }));
  };

  const handleGenerate = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a character name first');
      return;
    }

    setIsGenerating(true);
    try {
      const draft = await generateCharacterDraft(
        {
          name: formData.name,
          bio: formData.bio,
          traits: formData.traits,
          tags: formData.tags,
          system_prompt: formData.system_prompt,
        },
        formData.guidance
      );

      // Merge the generated content with existing data
      if (draft.bio) {
        updateFormData('bio', draft.bio);
      }
      if (draft.traits) {
        updateFormData('traits', { ...formData.traits, ...draft.traits });
      }
      if (draft.tags && draft.tags.length > 0) {
        const newTags = draft.tags.filter(tag => !formData.tags.includes(tag));
        updateFormData('tags', [...formData.tags, ...newTags]);
      }
      if (draft.system_prompt) {
        updateFormData('system_prompt', draft.system_prompt);
      }

      toast.success('Character details generated successfully!');
    } catch (error) {
      console.error('Error generating character:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate character details');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    // Validation
    if (!formData.name.trim()) {
      toast.error('Character name is required');
      return;
    }

    if (!formData.bio.trim()) {
      toast.error('Character bio is required');
      return;
    }

    const characterData = {
      name: formData.name.trim(),
      bio: formData.bio.trim(),
      system_prompt: formData.system_prompt.trim(),
      avatar_path: formData.avatar_path.trim() || undefined,
      traits: formData.traits,
      tags: formData.tags,
    };

    if (isEditing) {
      updateCharacter({ id: character.id, patch: characterData });
    } else {
      createCharacter(characterData);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto overscroll-contain w-[95vw] max-w-none sm:w-[92vw] md:w-[88vw] lg:w-[80vw] xl:w-[75vw]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Edit ${character?.name}` : 'Create New Character'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="traits">Traits & Tags</TabsTrigger>
            <TabsTrigger value="generation">Generation</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  placeholder="Character name..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => updateFormData('bio', e.target.value)}
                  placeholder="Character background, personality, description..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar_path">Avatar URL</Label>
                <Input
                  id="avatar_path"
                  value={formData.avatar_path}
                  onChange={(e) => updateFormData('avatar_path', e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="system_prompt">System Prompt</Label>
                <Textarea
                  id="system_prompt"
                  value={formData.system_prompt}
                  onChange={(e) => updateFormData('system_prompt', e.target.value)}
                  placeholder="AI system instructions for this character..."
                  rows={3}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="traits" className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Character Traits</Label>
                <div className="flex gap-2">
                  <Input
                    value={customTrait}
                    onChange={(e) => setCustomTrait(e.target.value)}
                    placeholder="Trait name (e.g., Height)"
                    className="flex-1"
                  />
                  <Input
                    value={customTraitValue}
                    onChange={(e) => setCustomTraitValue(e.target.value)}
                    placeholder="Value (e.g., 5'6&quot;)"
                    className="flex-1"
                  />
                  <Button onClick={addTrait} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(formData.traits).map(([key, value]) => (
                    <Badge key={key} variant="secondary" className="flex items-center gap-1">
                      <span>{key}: {String(value)}</span>
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => removeTrait(key)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    placeholder="Add tag..."
                    className="flex-1"
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  />
                  <Button onClick={addTag} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="flex items-center gap-1">
                      <span>{tag}</span>
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="generation" className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="guidance">Generation Guidance</Label>
                <Textarea
                  id="guidance"
                  value={formData.guidance}
                  onChange={(e) => updateFormData('guidance', e.target.value)}
                  placeholder="Optional guidance for AI generation (preferences, style, etc.)..."
                  rows={4}
                />
              </div>

              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Use the single Generate button to enhance all character fields based on the current information and guidance.
                </div>
                <Button 
                  variant="outline" 
                  className="w-full"
                  disabled={!formData.name.trim() || isGenerating}
                  onClick={handleGenerate}
                >
                  <Sparkle className="w-4 h-4 mr-2" />
                  {isGenerating ? 'Generating...' : 'Generate Character Details'}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isCreating || isUpdating}
          >
            <FloppyDisk className="w-4 h-4 mr-2" />
            {isEditing ? 'Update' : 'Create'} Character
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}