import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { repositoryStorage } from '@/hooks/useRepositoryStorage';
import { generateCharacterDraft } from '@/lib/llm';
import { Character } from '@/types';
import { FloppyDisk, Plus, Sparkle, X } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';


interface CharacterCreatorRepoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  character?: any; // For editing existing characters from repo
}

export function CharacterCreatorRepo({ open, onOpenChange, character }: CharacterCreatorRepoProps) {
  const { addCharacter, updateCharacter, isLoading, characters } = useHouseFileStorage();
  const isEditing = !!character;



  const [formData, setFormData] = useState({
    name: '',
    gender: 'female' as 'female' | 'male' | 'other',
    age: 18 as number | '',
    job: '',
    bio: '',
    appearanceDescription: '',
    system_prompt: '',
    avatar_path: '',
    traits: {} as Record<string, any>,
    tags: [] as string[], // personality tags
    appearanceTags: [] as string[],
    guidance: '', // New field for Task 5
  });

  const [customTag, setCustomTag] = useState('');
  const [customAppearanceTag, setCustomAppearanceTag] = useState('');
  const [customTrait, setCustomTrait] = useState('');
  const [customTraitValue, setCustomTraitValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Appearance tag repository (persisted suggestions)
  const [availableAppearanceTags, setAvailableAppearanceTags] = useState<string[]>([]);

  // Height/Weight UI state
  const [heightUnit, setHeightUnit] = useState<'cm' | 'imperial'>('cm');
  const [heightCm, setHeightCm] = useState<number | ''>('');
  const [heightFt, setHeightFt] = useState<number | ''>('');
  const [heightIn, setHeightIn] = useState<number | ''>('');

  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [weightKg, setWeightKg] = useState<number | ''>('');
  const [weightLbs, setWeightLbs] = useState<number | ''>('');

  const HAIR_COLOR_OPTIONS = [
    'Blonde',
    'Dirty Blonde',
    'Strawberry Blonde',
    'Red (Ginger)',
    'Light Brown',
    'Black',
    'Pink',
    'Blue',
  ];

  const EYE_COLOR_OPTIONS = [
    'Brown',
    'Hazel',
    'Green',
    'Blue',
    'Gray',
    'Amber',
    'Violet',
    'Heterochromia',
  ];

  const SKIN_TONE_OPTIONS = [
    'Very Fair',
    'Fair',
    'Light',
    'Medium',
    'Olive',
    'Tan',
    'Brown',
    'Dark',
  ];

  // Normalize free-text traits to allowed options for selects
  const normalizeToOption = (val: any, options: string[]): string | undefined => {
    if (!val) return undefined;
    const s = String(val).trim();
    if (!s) return undefined;
    // Exact (case-insensitive)
    const exact = options.find(o => o.toLowerCase() === s.toLowerCase());
    if (exact) return exact;
    // Simple synonym adjustments
    const syn = s.toLowerCase()
      .replace(/\bblond\b/g, 'blonde')
      .replace(/\bgrey\b/g, 'gray')
      .replace(/\blight brown\b/g, 'Light Brown')
      .replace(/\bdark brown\b/g, 'Brown');
    const exactSyn = options.find(o => o.toLowerCase() === syn.toLowerCase());
    if (exactSyn) return exactSyn;
    // Contains/partial
    const contains = options.find(o => syn.includes(o.toLowerCase()) || o.toLowerCase().includes(syn));
    if (contains) return contains;
    // Title-case fallback if close
    const cap = s.replace(/\b\w/g, c => c.toUpperCase());
    const close = options.find(o => o.toLowerCase().startsWith(s.toLowerCase()) || s.toLowerCase().startsWith(o.toLowerCase()));
    return close || cap;
  };

  // Helpers to normalize character data from either repo-style or in-app Character
  const safeParseJSON = (value: unknown, fallback: any) => {
    try {
      if (typeof value === 'string' && value.trim()) return JSON.parse(value);
      if (Array.isArray(value) || (value && typeof value === 'object')) return value;
      return fallback;
    } catch {
      return fallback;
    }
  };

  const mapCharacterToForm = (c: any) => {
    if (!c) return {
      name: '', gender: 'female' as 'female' | 'male' | 'other', age: 18 as number | '', job: '', bio: '', appearanceDescription: '', system_prompt: '', avatar_path: '', traits: {}, tags: [], appearanceTags: [], guidance: ''
    };

    const traitsFromJSON = safeParseJSON(c.traits_json, {});
    const tagsFromJSON = safeParseJSON(c.tags_json, [] as string[]);

    // Derive traits from physicalStats if available
    const physicalTraits: Record<string, any> = c.physicalStats ? {
      hairColor: c.physicalStats.hairColor || '',
      eyeColor: c.physicalStats.eyeColor || '',
      height: c.physicalStats.height || '',
      weight: c.physicalStats.weight || '',
      skinTone: c.physicalStats.skinTone || ''
    } : {};

    // Prefer explicit repo fields, else map from in-app Character model
    const appearanceTagsFromFeatures = Array.isArray(c.features)
      ? c.features.filter((f: any) => typeof f === 'string' && !String(f).includes(':'))
          .map((s: string) => s.trim()).filter(Boolean)
      : [];

    return {
      name: c.name || '',
      gender: (c.gender as 'female' | 'male' | 'other') || (c.role === 'guest' ? 'male' : 'female'),
      age: typeof c.age === 'number' ? c.age : 18 as number | '',
      job: c.job || '',
      bio: c.bio || c.description || '',
      appearanceDescription: c.appearance || c.imageDescription || '',
      system_prompt: c.system_prompt || c.prompts?.system || '',
      avatar_path: c.avatar_path || c.avatar || '',
      traits: Object.keys(traitsFromJSON).length ? traitsFromJSON : (c.traits || physicalTraits),
      tags: (Array.isArray(tagsFromJSON) && tagsFromJSON.length) ? tagsFromJSON : ([...(c.tags || []), ...(c.personalities || [])].filter(Boolean)),
      appearanceTags: appearanceTagsFromFeatures,
      guidance: ''
    };
  };

  // Populate form when opening editor
  useEffect(() => {
    if (isEditing && character) {
      setFormData(mapCharacterToForm(character));
      // Initialize height/weight UI from character
      const hRaw = character?.physicalStats?.height || character?.traits?.height || '';
      const wRaw = character?.physicalStats?.weight || character?.traits?.weight || '';
      const cm = parseHeightToCm(String(hRaw));
      if (cm != null) {
        setHeightUnit('cm');
        setHeightCm(cm);
        const imp = cmToImperial(cm);
        setHeightFt(imp.feet);
        setHeightIn(imp.inches);
      } else {
        setHeightUnit('cm');
        setHeightCm('');
        setHeightFt('');
        setHeightIn('');
      }
      const kg = parseWeightToKg(String(wRaw));
      if (kg != null) {
        setWeightUnit('kg');
        setWeightKg(kg);
        setWeightLbs(Math.round(kgToLbs(kg)));
      } else {
        setWeightUnit('kg');
        setWeightKg('');
        setWeightLbs('');
      }
    } else {
      setFormData({
        name: '', gender: 'female', age: 18, job: '', bio: '', appearanceDescription: '', system_prompt: '', avatar_path: '', traits: {}, tags: [], appearanceTags: [], guidance: ''
      });
      setHeightUnit('cm');
      setHeightCm('');
      setHeightFt('');
      setHeightIn('');
      setWeightUnit('kg');
      setWeightKg('');
      setWeightLbs('');
    }
  }, [isEditing, character, open]);

  // Load available appearance tags from repository storage, seed if empty
  useEffect(() => {
    const loadTags = async () => {
      try {
        const existing = await repositoryStorage.get('appearance_tags');
        let list = Array.isArray(existing) ? (existing as string[]) : [];
        if (!list.length) {
          list = [
            'tattoos', 'piercings', 'freckles', 'glasses', 'athletic', 'curvy', 'petite',
            'slim', 'toned', 'muscled', 'hourglass', 'pear-shaped', 'busty', 'tall', 'short',
            'long hair', 'short hair', 'wavy hair', 'straight hair', 'braids', 'ponytail',
            'bangs', 'dimples', 'beauty mark'
          ];
          await repositoryStorage.set('appearance_tags', list);
        }
        setAvailableAppearanceTags(list);
      } catch (e) {
        console.error('Failed to load appearance tags', e);
      }
    };
    if (open) loadTags();
  }, [open]);

  const persistAppearanceTag = async (tag: string) => {
    const t = tag.trim();
    if (!t) return;
    try {
      const existing = await repositoryStorage.get('appearance_tags');
      let list = Array.isArray(existing) ? (existing as string[]) : [];
      if (!list.includes(t)) {
        list = [...list, t].sort();
        await repositoryStorage.set('appearance_tags', list);
        setAvailableAppearanceTags(list);
      }
    } catch (e) {
      console.error('Failed to save appearance tag', e);
    }
  };

  // Helpers for height/weight parsing and conversion
  const parseHeightToCm = (val: string): number | null => {
    if (!val) return null;
    const s = val.trim().toLowerCase();
    // e.g., "170", "170 cm"
    const cmMatch = s.match(/^(\d+(?:\.\d+)?)\s*(cm)?$/);
    if (cmMatch) return Math.round(parseFloat(cmMatch[1]));
    // e.g., 5'6", 5ft 6in, 5 ft 6 in
    const imp1 = s.match(/^(\d+)\s*'?\s*(\d+)?\s*"?$/); // 5'6"
    const imp2 = s.match(/^(\d+)\s*(?:ft|feet)\s*(\d+)?\s*(?:in|inch|inches)?$/); // 5 ft 6 in
    const m = imp1 || imp2;
    if (m) {
      const feet = parseInt(m[1] || '0', 10);
      const inches = parseInt(m[2] || '0', 10);
      const totalInches = feet * 12 + inches;
      return Math.round(totalInches * 2.54);
    }
    return null;
  };

  const cmToImperial = (cm: number) => {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches - feet * 12);
    return { feet, inches };
  };

  const parseWeightToKg = (val: string): number | null => {
    if (!val) return null;
    const s = val.trim().toLowerCase();
    const kgMatch = s.match(/^(\d+(?:\.\d+)?)\s*(kg)?$/);
    if (kgMatch) return Math.round(parseFloat(kgMatch[1]));
    const lbsMatch = s.match(/^(\d+(?:\.\d+)?)\s*(lb|lbs|pounds?)$/);
    if (lbsMatch) return Math.round(parseFloat(lbsMatch[1]) * 0.45359237);
    return null;
  };

  const kgToLbs = (kg: number) => kg * 2.2046226218;

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

  const addAppearanceTag = async () => {
    const t = customAppearanceTag.trim();
    if (t && !formData.appearanceTags.includes(t)) {
      setFormData(prev => ({
        ...prev,
        appearanceTags: [...prev.appearanceTags, t]
      }));
      await persistAppearanceTag(t);
      setCustomAppearanceTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const removeAppearanceTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      appearanceTags: prev.appearanceTags.filter(t => t !== tag)
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
        const t = { ...formData.traits, ...draft.traits } as Record<string, any>;
        // Normalize select-backed traits
        if (t.hairColor) t.hairColor = normalizeToOption(t.hairColor, HAIR_COLOR_OPTIONS) || t.hairColor;
        if (t.eyeColor) t.eyeColor = normalizeToOption(t.eyeColor, EYE_COLOR_OPTIONS) || t.eyeColor;
        if (t.skinTone) t.skinTone = normalizeToOption(t.skinTone, SKIN_TONE_OPTIONS) || t.skinTone;
        updateFormData('traits', t);
      }
      if (draft.appearance) {
        updateFormData('appearanceDescription', draft.appearance);
      }
      if (draft.tags && draft.tags.length > 0) {
        const newTags = draft.tags.filter(tag => !formData.tags.includes(tag));
        updateFormData('tags', [...formData.tags, ...newTags]);
      }
      if (draft.system_prompt) {
        updateFormData('system_prompt', draft.system_prompt);
      }

      // If draft included height/weight, try to reflect into the height/weight UI
  const maybeHeight = draft?.traits?.height;
      if (maybeHeight) {
        const cm = parseHeightToCm(String(maybeHeight));
        if (cm != null) {
          setHeightUnit('cm');
          setHeightCm(cm);
          const imp = cmToImperial(cm);
          setHeightFt(imp.feet);
          setHeightIn(imp.inches);
        }
      }
  const maybeWeight = draft?.traits?.weight;
      if (maybeWeight) {
        const kg = parseWeightToKg(String(maybeWeight));
        if (kg != null) {
          setWeightUnit('kg');
          setWeightKg(kg);
          setWeightLbs(Math.round(kgToLbs(kg)));
        }
      }

      toast.success('Character details generated successfully!');
    } catch (error) {
      console.error('Error generating character:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate character details');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast.error('Character name is required');
      return;
    }

    const isMale = formData.gender === 'male';

    // Name uniqueness (case-insensitive), allow same id when editing
    const nameLower = formData.name.trim().toLowerCase();
    const nameExists = (characters || []).some(
      (c: Character) => c.name.trim().toLowerCase() === nameLower && (!isEditing || c.id !== (character as Character)?.id)
    );
    if (nameExists) {
      toast.error('A character with this name already exists. Please choose another name.');
      return;
    }

    if (!formData.bio.trim()) {
      toast.error('Character bio is required');
      return;
    }

    if (isMale) {
      // For males, require age and job if provided but keep it simple
      if (formData.age !== '' && (Number(formData.age) <= 0 || Number.isNaN(Number(formData.age)))) {
        toast.error('Please enter a valid age or leave it blank');
        return;
      }
    }

    const characterData = {
      name: formData.name.trim(),
      gender: formData.gender,
      age: formData.age === '' ? undefined : Number(formData.age),
      job: formData.job?.trim() || undefined,
      bio: formData.bio.trim(),
      appearanceDescription: formData.appearanceDescription.trim(),
      system_prompt: formData.system_prompt.trim(),
      avatar_path: formData.avatar_path.trim() || undefined,
      traits: formData.traits,
      tags: formData.tags,
    };

    // Compute normalized physical stats from UI (skip for male)
    let finalHeightCm: number | null = null;
    let finalWeightKg: number | null = null;
    if (!isMale) {
      if (heightUnit === 'cm') {
        finalHeightCm = typeof heightCm === 'number' ? heightCm : parseHeightToCm(String(heightCm));
      } else {
        const ft = typeof heightFt === 'number' ? heightFt : parseInt(String(heightFt || '0'), 10);
        const inch = typeof heightIn === 'number' ? heightIn : parseInt(String(heightIn || '0'), 10);
        finalHeightCm = Math.round(((ft || 0) * 12 + (inch || 0)) * 2.54);
      }
      if (weightUnit === 'kg') {
        finalWeightKg = typeof weightKg === 'number' ? weightKg : parseWeightToKg(String(weightKg));
      } else {
        const lbsNum = typeof weightLbs === 'number' ? weightLbs : parseFloat(String(weightLbs || ''));
        finalWeightKg = isNaN(lbsNum as number) ? null : Math.round((lbsNum as number) * 0.45359237);
      }
    }

    if (isEditing) {
      // Map repo-style fields back to in-app Character model for updates
      const physicalStatsFromTraits = isMale ? (character?.physicalStats || undefined) : {
        hairColor: formData.traits.hairColor ?? (character?.physicalStats?.hairColor ?? ''),
        eyeColor: formData.traits.eyeColor ?? (character?.physicalStats?.eyeColor ?? ''),
        height: finalHeightCm != null ? `${finalHeightCm} cm` : (character?.physicalStats?.height ?? ''),
        weight: finalWeightKg != null ? `${finalWeightKg} kg` : (character?.physicalStats?.weight ?? ''),
        skinTone: formData.traits.skinTone ?? (character?.physicalStats?.skinTone ?? ''),
      };

      const featuresFromTraits = isMale ? [] : Object.entries(formData.traits)
        .filter(([k, v]) => !(k in { hairColor:1, eyeColor:1, height:1, weight:1, skinTone:1 }))
        .map(([k, v]) => `${k}: ${String(v)}`);

      const updates: Partial<Character> = {
        name: characterData.name,
        gender: characterData.gender as any,
        age: characterData.age,
        job: characterData.job,
        description: characterData.bio,
        appearance: characterData.appearanceDescription || character?.appearance,
        imageDescription: characterData.appearanceDescription || character?.imageDescription,
        avatar: isMale ? character?.avatar : characterData.avatar_path,
        prompts: {
          ...(character?.prompts || {}),
          system: isMale ? '' : (characterData.system_prompt || ''),
        },
        // Merge features/personality-like tags non-destructively
        features: isMale ? (character?.features || []) : Array.from(new Set([...(character?.features || []), ...featuresFromTraits, ...formData.appearanceTags])),
        personalities: Array.from(new Set([...(character?.personalities || []), ...formData.tags])),
        physicalStats: physicalStatsFromTraits as any,
        role: isMale ? 'guest' : (character?.role || 'companion'),
      } as Partial<Character>;

      await updateCharacter((character as Character).id, updates);
    } else {
      const newCharacter: Character = {
        id: crypto.randomUUID(),
        ...characterData,
        description: characterData.bio,
        appearance: characterData.appearanceDescription,
        personality: '',
        gender: characterData.gender as any,
        age: characterData.age,
        job: characterData.job,
        avatar: isMale ? undefined : characterData.avatar_path,
        roomId: undefined,
        stats: {
          love: 50, happiness: 50, wet: 0, willing: 50, selfEsteem: 50, loyalty: 50, fight: 20, stamina: 50, pain: 30, experience: 0, level: 1
        },
        skills: {
          hands: 20, mouth: 20, missionary: 20, doggy: 20, cowgirl: 20
        },
        role: isMale ? 'guest' : 'companion',
        personalities: [...formData.tags],
        features: isMale ? [] : [...formData.appearanceTags, ...Object.entries(formData.traits)
          .filter(([k]) => !(k in { hairColor:1, eyeColor:1, height:1, weight:1, skinTone:1 }))
          .map(([k, v]) => `${k}: ${String(v)}`)
        ],
        classes: [],
        unlocks: [],
        rarity: 'common',
        specialAbility: undefined,
        preferredRoomType: isMale ? 'facility' : 'shared',
  imageDescription: characterData.appearanceDescription || characterData.bio,
        physicalStats: isMale ? undefined : {
          hairColor: String(characterData.traits?.hairColor ?? ''),
          eyeColor: String(characterData.traits?.eyeColor ?? ''),
          height: finalHeightCm != null ? `${finalHeightCm} cm` : '',
          weight: finalWeightKg != null ? `${finalWeightKg} kg` : '',
          skinTone: String(characterData.traits?.skinTone ?? ''),
        },
        prompts: {
          system: isMale ? '' : (characterData.system_prompt || ''),
          personality: '',
          background: characterData.bio
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
        createdAt: new Date(),
        updatedAt: new Date(),
        autoGenerated: false
      } as any;
      const added = await addCharacter(newCharacter);
      if (added) {
        try {
          const { useFileStorage } = await import('@/hooks/useFileStorage');
          // dynamically use the hook is not possible here; instead call repository storage for defaults
        } catch {}
        try {
          // Manually append to generated-images.json using the storage helper
          const { getDb, saveDatabase } = await import('@/lib/db');
          const { db } = await getDb();
          const key = 'generated-images.json';
          const rows: any[] = [];
          db.exec({ sql: 'SELECT value FROM settings WHERE key = ?', bind: [key], rowMode: 'object', callback: (r: any) => rows.push(r) });
          let images: any[] = [];
          if (rows.length > 0) {
            try { images = JSON.parse(rows[0].value) || []; } catch { images = []; }
          }
          const avatarUrl = (newCharacter as any).avatar;
          if (typeof avatarUrl === 'string' && avatarUrl.trim().length > 0) {
            const initialPost = {
              id: crypto.randomUUID(),
              prompt: 'Profile created',
              imageUrl: avatarUrl,
              createdAt: new Date(),
              characterId: (newCharacter as any).id,
              tags: ['profile', 'character'],
              caption: `${newCharacter.name} just joined the house ✨`
            };
            const updated = [initialPost, ...images];
            const serialized = JSON.stringify(updated);
            db.exec('BEGIN');
            const before: any[] = [];
            db.exec({ sql: 'SELECT total_changes() AS c', rowMode: 'object', callback: (r: any) => before.push(r) });
            db.exec({ sql: 'UPDATE settings SET value = ? WHERE key = ?', bind: [serialized, key] });
            const after: any[] = [];
            db.exec({ sql: 'SELECT total_changes() AS c', rowMode: 'object', callback: (r: any) => after.push(r) });
            const changed = (after[0]?.c ?? 0) - (before[0]?.c ?? 0);
            if (changed === 0) {
              db.exec({ sql: 'INSERT INTO settings (key, value) VALUES (?, ?)', bind: [key, serialized] });
            }
            db.exec('COMMIT');
            await saveDatabase();
          }
        } catch (e) {
          console.warn('Failed to append initial feed post:', e);
        }
      }
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto overscroll-contain w-[95vw] max-w-none sm:w-[92vw] md:w-[88vw] lg:w-[80vw] xl:w-[75vw] bg-gray-900 text-white" style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>
        <DialogHeader>
          <DialogTitle className="text-white">
            {isEditing ? `Edit ${character?.name}` : 'Create New Character'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          {(() => {
            const isMale = formData.gender === 'male';
            const cols = isMale ? 'grid-cols-2' : 'grid-cols-4';
            return (
              <TabsList className={`grid w-full ${cols}`}>
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                {!isMale && <TabsTrigger value="appearance">Appearance</TabsTrigger>}
                <TabsTrigger value="personality">Personality</TabsTrigger>
                {!isMale && <TabsTrigger value="generation">Generation</TabsTrigger>}
              </TabsList>
            );
          })()}

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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(val: 'female' | 'male' | 'other') => updateFormData('gender', val)}
                  >
                    <SelectTrigger id="gender"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age as number | ''}
                    onChange={(e) => updateFormData('age', e.target.value ? parseInt(e.target.value, 10) : '')}
                    placeholder="e.g. 18"
                    min={1}
                    step={1}
                  />
                </div>
                {formData.gender === 'male' && (
                  <div className="space-y-2">
                    <Label htmlFor="job">Job</Label>
                    <Input
                      id="job"
                      value={formData.job}
                      onChange={(e) => updateFormData('job', e.target.value)}
                      placeholder="e.g. Photographer"
                    />
                  </div>
                )}
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

              {formData.gender !== 'male' && (
                <div className="space-y-2">
                  <Label htmlFor="avatar_path">Avatar URL</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="avatar_path"
                      value={formData.avatar_path}
                      onChange={(e) => updateFormData('avatar_path', e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                      className="flex-1"
                    />
                    <Avatar
                      className="w-12 h-12 border cursor-pointer hover:ring-2 hover:ring-primary/50"
                      onClick={() => {
                        // Default action on avatar click is to open quick actions below
                        fileInputRef.current?.click();
                      }}
                      title="Click to upload or generate a selfie"
                    >
                      <AvatarImage src={formData.avatar_path} alt={formData.name || 'Avatar'} />
                      <AvatarFallback>{(formData.name || '?').slice(0,2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Upload Photo
                    </Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        setIsGeneratingAvatar(true);
                        try {
                          // Build selfie-friendly image prompt
                          const baseDesc = (formData.appearanceDescription || character?.imageDescription || '').trim();
                          const traitBits: string[] = [];
                          if (formData.traits.hairColor) traitBits.push(`${formData.traits.hairColor} hair`);
                          if (formData.traits.eyeColor) traitBits.push(`${formData.traits.eyeColor} eyes`);
                          if (formData.traits.skinTone) traitBits.push(`${formData.traits.skinTone} skin`);
                          const traitDesc = traitBits.join(', ');
                          const appearance = [baseDesc, traitDesc].filter(Boolean).join(', ');
                          const selfieSuffix = 'selfie, portrait, profile picture, shoulders up, looking at camera, subtle smile, soft diffused lighting, clean blurred background, natural skin, high detail, 1:1 aspect, photographic';
                          const prompt = [appearance || formData.bio || formData.name, selfieSuffix].filter(Boolean).join(', ');

                          const { AIService } = await import('@/lib/aiService');
                          const url = await AIService.generateImage(prompt, {
                            width: 768,
                            height: 768,
                            steps: 30,
                            cfg_scale: 7.5,
                            format: 'webp',
                            hide_watermark: true
                          });
                          if (url) {
                            updateFormData('avatar_path', url);
                            toast.success('Generated selfie avatar');
                          }
                        } catch (e) {
                          console.error('Failed to generate avatar', e);
                          toast.error(e instanceof Error ? e.message : 'Failed to generate avatar');
                        } finally {
                          setIsGeneratingAvatar(false);
                        }
                      }}
                      disabled={isGeneratingAvatar}
                    >
                      {isGeneratingAvatar ? 'Generating…' : 'Generate Selfie'}
                    </Button>
                  </div>
                  {/* Hidden file input for uploads */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        const dataUrl = String(reader.result || '');
                        updateFormData('avatar_path', dataUrl);
                        toast.success('Avatar updated');
                      };
                      reader.onerror = () => toast.error('Failed to read file');
                      reader.readAsDataURL(file);
                      // reset the input so selecting the same file again works
                      (e.target as HTMLInputElement).value = '';
                    }}
                  />
                </div>
              )}

              {formData.gender !== 'male' && (
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
              )}
            </div>
          </TabsContent>

          {formData.gender !== 'male' && (
          <TabsContent value="appearance" className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="appearanceDescription">Appearance Description</Label>
                <Textarea
                  id="appearanceDescription"
                  value={formData.appearanceDescription}
                  onChange={(e) => updateFormData('appearanceDescription', e.target.value)}
                  placeholder="Describe her overall look, outfit/style, and body features (tastefully) ..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Hair Color</Label>
                <div className="flex gap-2 items-center">
                  <Select
                    value={formData.traits.hairColor ? String(formData.traits.hairColor) : undefined}
                    onValueChange={(val) =>
                      setFormData((prev) => ({
                        ...prev,
                        traits: { ...prev.traits, hairColor: val },
                      }))
                    }
                  >
                    <SelectTrigger className="min-w-[220px]">
                      <SelectValue placeholder="Select hair color" />
                    </SelectTrigger>
                    <SelectContent>
                      {HAIR_COLOR_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Eye Color</Label>
                <div className="flex gap-2 items-center">
                  <Select
                    value={formData.traits.eyeColor ? String(formData.traits.eyeColor) : undefined}
                    onValueChange={(val) =>
                      setFormData((prev) => ({
                        ...prev,
                        traits: { ...prev.traits, eyeColor: val },
                      }))
                    }
                  >
                    <SelectTrigger className="min-w-[220px]">
                      <SelectValue placeholder="Select eye color" />
                    </SelectTrigger>
                    <SelectContent>
                      {EYE_COLOR_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Skin Tone</Label>
                <div className="flex gap-2 items-center">
                  <Select
                    value={formData.traits.skinTone ? String(formData.traits.skinTone) : undefined}
                    onValueChange={(val) =>
                      setFormData((prev) => ({
                        ...prev,
                        traits: { ...prev.traits, skinTone: val },
                      }))
                    }
                  >
                    <SelectTrigger className="min-w-[220px]">
                      <SelectValue placeholder="Select skin tone" />
                    </SelectTrigger>
                    <SelectContent>
                      {SKIN_TONE_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Height</Label>
                <div className="flex flex-wrap gap-2 items-center">
                  <Select value={heightUnit} onValueChange={(v: 'cm' | 'imperial') => setHeightUnit(v)}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cm">Centimeters</SelectItem>
                      <SelectItem value="imperial">Feet/Inches</SelectItem>
                    </SelectContent>
                  </Select>
                  {heightUnit === 'cm' ? (
                    <Input
                      type="number"
                      className="w-[160px]"
                      placeholder="e.g. 170"
                      value={heightCm as number | ''}
                      onChange={(e) => setHeightCm(e.target.value ? parseInt(e.target.value, 10) : '')}
                    />
                  ) : (
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        className="w-[120px]"
                        placeholder="ft"
                        value={heightFt as number | ''}
                        onChange={(e) => setHeightFt(e.target.value ? parseInt(e.target.value, 10) : '')}
                      />
                      <Input
                        type="number"
                        className="w-[120px]"
                        placeholder="in"
                        value={heightIn as number | ''}
                        onChange={(e) => setHeightIn(e.target.value ? parseInt(e.target.value, 10) : '')}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Weight</Label>
                <div className="flex flex-wrap gap-2 items-center">
                  <Select value={weightUnit} onValueChange={(v: 'kg' | 'lbs') => setWeightUnit(v)}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">Kilograms</SelectItem>
                      <SelectItem value="lbs">Pounds</SelectItem>
                    </SelectContent>
                  </Select>
                  {weightUnit === 'kg' ? (
                    <Input
                      type="number"
                      className="w-[160px]"
                      placeholder="e.g. 55"
                      value={weightKg as number | ''}
                      onChange={(e) => setWeightKg(e.target.value ? parseInt(e.target.value, 10) : '')}
                    />
                  ) : (
                    <Input
                      type="number"
                      className="w-[160px]"
                      placeholder="e.g. 120"
                      value={weightLbs as number | ''}
                      onChange={(e) => setWeightLbs(e.target.value ? parseInt(e.target.value, 10) : '')}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Appearance Traits</Label>
                <div className="flex gap-2">
                  <Input
                    value={customTrait}
                    onChange={(e) => setCustomTrait(e.target.value)}
                    placeholder="Trait name (e.g., Bust, Style)"
                    className="flex-1"
                  />
                  <Input
                    value={customTraitValue}
                    onChange={(e) => setCustomTraitValue(e.target.value)}
                    placeholder="Value (e.g., Hourglass, 34C)"
                    className="flex-1"
                  />
                  <Button onClick={addTrait} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(formData.traits)
                    .filter(([key]) => !(['hairColor','eyeColor','skinTone'].includes(key)))
                    .map(([key, value]) => (
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
                <Label>Appearance Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={customAppearanceTag}
                    onChange={(e) => setCustomAppearanceTag(e.target.value)}
                    placeholder="Add appearance tag (e.g., freckles)"
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && addAppearanceTag()}
                  />
                  <Button onClick={addAppearanceTag} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.appearanceTags.map((tag) => (
                    <Badge key={tag} variant="outline" className="flex items-center gap-1">
                      <span>{tag}</span>
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => removeAppearanceTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
                {availableAppearanceTags.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">Suggestions</div>
                    <div className="flex flex-wrap gap-2">
                      {availableAppearanceTags.filter(t => !formData.appearanceTags.includes(t)).slice(0, 24).map((t) => (
                        <Badge key={t} variant="secondary" className="cursor-pointer" onClick={() => {
                          setFormData(prev => ({ ...prev, appearanceTags: Array.from(new Set([...prev.appearanceTags, t])) }));
                        }}>
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          )}

          <TabsContent value="personality" className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Personality Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    placeholder="Add personality tag (e.g., playful)"
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && addTag()}
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

          {formData.gender !== 'male' && (
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
          )}
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isLoading}
          >
            <FloppyDisk className="w-4 h-4 mr-2" />
            {isEditing ? 'Update' : 'Create'} Character
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}