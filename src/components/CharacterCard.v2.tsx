import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  BookOpen,
  Code,
  Crown,
  CurrencyDollar,
  Download,
  Drop,
  Gift,
  Heart,
  House,
  Image as ImageIcon,
  ChatCircle as MessageCircle,
  Pencil,
  Plus,
  Smiley as Smile,
  Sparkle,
  Star,
  Trash,
  TrendUp,
  Trophy,
  User,
} from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { formatPrompt } from '@/lib/prompts';
import { useChat } from '@/hooks/useChat';
import { useFileStorage } from '@/hooks/useFileStorage';
import { useStorySystem } from '@/hooks/useStorySystem';
import { Character, StoryEntry } from '@/types';
import type { GeneratedImage } from '@/types/generatedImage';
import { parseDataUrl, convertDataUrlToObjectUrl } from '@/lib/imageEncoding';
import { deleteImageFromCache, ensureImageCache, loadImageBlobFromCache, storeImageInCache } from '@/lib/imageCache';
import { toast } from 'sonner';

const BYTES_PER_MB = 1024 * 1024;
const MAX_IMAGE_BYTES = 2 * BYTES_PER_MB;
export const OBJECT_URL_THRESHOLD_BYTES = 1.5 * BYTES_PER_MB;
export const LARGE_DATA_URL_LENGTH = 1_800_000; // Fallback when byte size is unavailable
const formatMegabytes = (bytes: number) => (bytes / BYTES_PER_MB).toFixed(2);


export interface CharacterCardProps {
  character: Character;
  onStartChat: (characterId: string) => void;
  onGift?: (characterId: string) => void;
  onMove?: (characterId: string) => void;
  onEdit?: (character: Character) => void;
  onSaveCharacter?: (characterId: string, updates: Partial<Character>) => Promise<boolean | void>;
  onDelete?: (characterId: string) => void;
  compact?: boolean;
  source?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

async function convertImagesToCache(images: GeneratedImage[]): Promise<GeneratedImage[]> {
  const results: GeneratedImage[] = [];

  for (const image of images) {
    const isInlineDataUrl = typeof image.imageUrl === 'string' && image.imageUrl.startsWith('data:');
    const alreadyCached = image.storageType === 'cache' && Boolean(image.storageKey);

    if (!isInlineDataUrl || alreadyCached) {
      results.push(image);
      continue;
    }

    try {
      const cacheKey = image.storageKey || image.id;
      const cacheResult = await storeImageInCache(cacheKey, image.imageUrl);
      results.push({
        ...image,
        imageUrl: '',
        storageType: 'cache',
        storageKey: cacheResult.storageKey,
        byteSize: image.byteSize ?? cacheResult.byteSize,
        mimeType: image.mimeType ?? cacheResult.mimeType,
      });
    } catch (error) {
      console.warn('convertImagesToCache: failed to move image into cache storage', {
        imageId: image.id,
        error,
      });
      results.push(image);
    }
  }

  return results;
}

const getRarityIcon = (rarity?: Character['rarity']) => {
  const base = 'h-4 w-4';
  switch (rarity) {
    case 'legendary':
      return <Crown className={`${base} text-amber-400`} />;
    case 'epic':
      return <Sparkle className={`${base} text-purple-400`} />;
    case 'rare':
      return <Trophy className={`${base} text-blue-400`} />;
    default:
      return <Star className={`${base} text-white/50`} />;
  }
};

const relationshipStatusColor = (status: Character['progression']['relationshipStatus']) => {
  switch (status) {
    case 'devoted':
      return 'text-rose-400';
    case 'lover':
      return 'text-red-400';
    case 'romantic_interest':
      return 'text-violet-400';
    case 'close_friend':
      return 'text-blue-400';
    case 'friend':
      return 'text-emerald-400';
    case 'untrained':
      return 'text-amber-400';
    default:
      return 'text-white/60';
  }
};

const clamp = (value: number | undefined, fallback = 0) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(100, value));
};

const formatDate = (value?: Date | string | null) => {
  if (!value) return 'Never';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Never';
  return date.toLocaleString();
};

const dots = (items: string[] | undefined, empty: string) => {
  if (!items || items.length === 0) return empty;
  return items.join(', ');
};

const PROMPT_FIELDS = ['system', 'description', 'personality', 'background', 'appearance', 'responseStyle', 'originScenario'] as const;
type PromptField = (typeof PROMPT_FIELDS)[number];

const EMPTY_PROMPTS: Record<PromptField, string> = {
  system: '',
  description: '',
  personality: '',
  background: '',
  appearance: '',
  responseStyle: '',
  originScenario: '',
};

export function CharacterCard({
  character,
  onStartChat,
  onGift,
  onMove,
  onEdit,
  onSaveCharacter,
  onDelete,
  compact = false,
  source = 'roster',
  open,
  onOpenChange,
  hideTrigger = false,
}: CharacterCardProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [showCreateImage, setShowCreateImage] = useState(false);
  const [newImagePrompt, setNewImagePrompt] = useState('');
  const [isCreatingImage, setIsCreatingImage] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPhysicalEditMode, setIsPhysicalEditMode] = useState(false);
  const [physicalFeatures, setPhysicalFeatures] = useState({
    hairColor: character.physicalStats?.hairColor || '',
    eyeColor: character.physicalStats?.eyeColor || '',
    skinTone: character.physicalStats?.skinTone || '',
    height: character.physicalStats?.height || '',
    bodyType: '',
    breastSize: '',
    buttSize: '',
    traits: character.features || [],
  });
  const [isGeneratingPhysical, setIsGeneratingPhysical] = useState(false);
  const [generatedPhysicalDescription, setGeneratedPhysicalDescription] = useState(character.appearance || '');
  const profileDefaults = useMemo(
    () => ({
      name: character.name ?? '',
      age: character.age != null ? String(character.age) : '',
      description: character.description ?? '',
      backstory: character.prompts?.background ?? '',
      keywords: (character.features ?? []).join(', '),
      avatar: character.avatar ?? '',
    }),
    [character],
  );
  const [profileDraft, setProfileDraft] = useState(profileDefaults);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const promptDefaults = useMemo(() => {
    const storedPrompts = {
      ...EMPTY_PROMPTS,
      ...(character.prompts ?? {}),
    };

    return {
      system: storedPrompts.system ?? '',
      description: storedPrompts.description ?? character.description ?? '',
      personality: storedPrompts.personality ?? character.personality ?? '',
      background: storedPrompts.background ?? character.description ?? '',
      appearance: storedPrompts.appearance ?? character.appearance ?? character.imageDescription ?? '',
      responseStyle: storedPrompts.responseStyle ?? '',
      originScenario: storedPrompts.originScenario ?? '',
    };
  }, [character.appearance, character.description, character.imageDescription, character.personality, character.prompts]);
  const [promptDraft, setPromptDraft] = useState(promptDefaults);
  const [isSavingPrompts, setIsSavingPrompts] = useState(false);

  useEffect(() => {
    setProfileDraft(profileDefaults);
  }, [profileDefaults]);

  useEffect(() => {
    setPromptDraft(promptDefaults);
  }, [promptDefaults]);

  const isPromptDirty = useMemo(
    () => PROMPT_FIELDS.some((field) => promptDefaults[field] !== promptDraft[field]),
    [promptDefaults, promptDraft],
  );

  const handlePromptChange = useCallback((field: PromptField, value: string) => {
    setPromptDraft((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleResetPrompts = useCallback(() => {
    setPromptDraft(promptDefaults);
  }, [promptDefaults]);

  const handleSavePrompts = useCallback(async () => {
    if (!isPromptDirty || isSavingPrompts) {
      return;
    }

    const trimmedPrompts = {
      system: promptDraft.system.trim(),
      description: promptDraft.description.trim(),
      personality: promptDraft.personality.trim(),
      background: promptDraft.background.trim(),
      appearance: promptDraft.appearance.trim(),
      responseStyle: promptDraft.responseStyle.trim(),
      originScenario: promptDraft.originScenario.trim(),
    } as const;

    const updates: Partial<Character> = {
      prompts: {
        ...EMPTY_PROMPTS,
        ...(character.prompts ?? {}),
        ...trimmedPrompts,
      },
    };

    setIsSavingPrompts(true);
    try {
      if (typeof onSaveCharacter === 'function') {
        const result = await onSaveCharacter(character.id, updates);
        if (result === false) {
          throw new Error('save callback returned false');
        }
      } else {
        toast.error('Saving prompts is not available in this view yet.');
        return;
      }

      setPromptDraft((prev) => ({
        ...prev,
        ...trimmedPrompts,
      }));
      toast.success('Character prompts updated');
    } catch (error) {
      console.error('Failed to save character prompts', error);
      toast.error('Failed to update character prompts');
    } finally {
      setIsSavingPrompts(false);
    }
  }, [character.id, character.prompts, isPromptDirty, isSavingPrompts, onSaveCharacter, promptDraft]);

  const isProfileDirty = useMemo(
    () =>
      Object.keys(profileDefaults).some(
        (key) => profileDefaults[key as keyof typeof profileDefaults] !== profileDraft[key as keyof typeof profileDraft],
      ),
    [profileDefaults, profileDraft],
  );

  const handleDraftChange = useCallback((field: keyof typeof profileDraft, value: string) => {
    setProfileDraft((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleResetProfile = useCallback(() => {
    setProfileDraft(profileDefaults);
  }, [profileDefaults]);

  const handleSaveProfile = useCallback(async () => {
    if (!isProfileDirty) {
      return;
    }

    const parsedAge = profileDraft.age.trim();
    const ageNumber = parsedAge ? Number(parsedAge) : undefined;
    if (parsedAge && Number.isNaN(ageNumber)) {
      toast.error('Age must be a number');
      return;
    }

    const keywords = profileDraft.keywords
      .split(/[\n,]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);

    const prompts = {
      ...EMPTY_PROMPTS,
      ...(character.prompts ?? {}),
    };
    const updates: Partial<Character> = {
      name: profileDraft.name.trim(),
      age: ageNumber,
      description: profileDraft.description.trim(),
      features: keywords,
      avatar: profileDraft.avatar.trim() || undefined,
      prompts: {
        ...prompts,
        description: profileDraft.description.trim(),
        background: profileDraft.backstory.trim(),
      },
    };

    setIsSavingProfile(true);
    try {
      if (typeof onSaveCharacter === 'function') {
        const result = await onSaveCharacter(character.id, updates);
        if (result === false) {
          throw new Error('save callback returned false');
        }
      } else if (typeof onEdit === 'function') {
        onEdit({ ...character, ...updates });
      } else {
        toast.error('Saving is not available in this view yet.');
        return;
      }
      toast.success('Character profile updated');
    } catch (error) {
      console.error('Failed to save character profile', error);
      toast.error('Failed to update character profile');
    } finally {
      setIsSavingProfile(false);
    }
  }, [character, isProfileDirty, onEdit, onSaveCharacter, profileDraft]);

  const isDialogOpen = open ?? internalOpen;
  const handleOpenChange = (value: boolean) => {
    if (open === undefined) {
      setInternalOpen(value);
    }
    onOpenChange?.(value);
  };

  const { sessions } = useChat();
  const { analyzeEmotionalJourney } = useStorySystem();
  const { data: storedImages = [], setData: setStoredImages } = useFileStorage<GeneratedImage[]>('generated-images.json', []);
  const storedImagesRef = useRef(storedImages);
  const attemptedMigrationRef = useRef(false);

  useEffect(() => {
    storedImagesRef.current = storedImages;
  }, [storedImages]);

  useEffect(() => {
    if (attemptedMigrationRef.current) {
      return;
    }

    if (!storedImages || storedImages.length === 0) {
      attemptedMigrationRef.current = true;
      return;
    }

    const needsMigration = storedImages.some((image) => !image.storageType && typeof image.imageUrl === 'string' && image.imageUrl.startsWith('data:'));
    if (!needsMigration) {
      attemptedMigrationRef.current = true;
      return;
    }

    let cancelled = false;

    const migrateToCache = async () => {
      try {
        const cacheAvailable = await ensureImageCache();
        if (!cacheAvailable) {
          attemptedMigrationRef.current = true;
          return;
        }

        const migrated = await convertImagesToCache(storedImages);
        if (cancelled) {
          return;
        }

        attemptedMigrationRef.current = true;
        await setStoredImages(migrated);
      } catch (migrationError) {
        console.warn('Failed to migrate generated images to cache storage', migrationError);
      }
    };

    void migrateToCache();

    return () => {
      cancelled = true;
    };
  }, [setStoredImages, storedImages]);

  const handleCreateImage = useCallback(async () => {
    if (!newImagePrompt.trim()) {
      toast.error('Please enter a prompt for the image');
      return;
    }

    setIsCreatingImage(true);
    try {
      // Use the same detailed appearance prompt as profile picture generation
      const appearancePrompt = character.prompts?.appearance || 
        profileDraft.appearance || 
        character.appearance ||
        `${profileDraft.name || character.name}, ${profileDraft.age || character.age} years old, attractive`;
      
      const enhancedPrompt = `Full-bodied, half-bodied, or selfie photo (not a profile picture headshot). ${newImagePrompt.trim()}. ${appearancePrompt}`;
      
      const { AIService } = await import('@/lib/aiService');
      const imageUrl = await AIService.generateImage(enhancedPrompt);
      
      console.log('Image URL received:', imageUrl ? `${imageUrl.substring(0, 100)}...` : 'null');
      
      if (imageUrl) {
        const parsedData = parseDataUrl(imageUrl);
        const approximateByteSize = parsedData?.byteSize ?? imageUrl.length;
        const base64Length = parsedData?.base64Data.length ?? imageUrl.length;
        const binarySizeMb = formatMegabytes(approximateByteSize);
        const base64SizeMb = formatMegabytes(base64Length);

        console.log(
          `Image size ≈ ${binarySizeMb}MB binary (${approximateByteSize.toLocaleString()} bytes), base64 payload ≈ ${base64SizeMb}MB (${base64Length.toLocaleString()} chars)`
        );

        if (approximateByteSize > MAX_IMAGE_BYTES) {
          toast.error(`Image too large (${binarySizeMb}MB). Maximum size is ${formatMegabytes(MAX_IMAGE_BYTES)}MB.`, {
            duration: 6000,
          });
          console.error('Image size exceeds storage limit', {
            characterId: character.id,
            approximateByteSize,
            base64Length,
          });
          return;
        }

        if (approximateByteSize > OBJECT_URL_THRESHOLD_BYTES || imageUrl.length > LARGE_DATA_URL_LENGTH) {
          console.warn(
            `Large image warning: ${binarySizeMb}MB binary / ${base64SizeMb}MB base64 - may cause performance issues when rendering`
          );
        }

        const imageId = crypto.randomUUID();
        const tags = Array.from(
          new Set(
            ['character', 'generated', character.role || 'person']
              .filter(Boolean)
              .map((tag) => String(tag).trim().toLowerCase()),
          ),
        );

        let storageType: GeneratedImage['storageType'] = 'inline';
        let storageKey: string | undefined;
        let persistedImageUrl = imageUrl;
        let persistedByteSize = approximateByteSize;
        let persistedMimeType = parsedData?.mimeType;

        try {
          const cacheResult = await storeImageInCache(imageId, imageUrl);
          storageType = 'cache';
          storageKey = cacheResult.storageKey;
          persistedImageUrl = '';
          persistedByteSize = cacheResult.byteSize;
          persistedMimeType = persistedMimeType || cacheResult.mimeType;
          console.log('Stored generated image in CacheStorage', {
            imageId,
            storageKey,
            byteSize: cacheResult.byteSize,
            mimeType: cacheResult.mimeType,
          });
        } catch (cacheError) {
          console.warn('Failed to store generated image in cache, falling back to inline data URL', cacheError);
        }

        const existingImages = storedImagesRef.current ?? [];
        let migratedExistingImages = existingImages;

        if (storageType === 'cache') {
          try {
            migratedExistingImages = await convertImagesToCache(existingImages);
          } catch (migrationError) {
            console.warn('Failed to migrate existing images to cache storage', migrationError);
          }
        }

        const newImage: GeneratedImage = {
          id: imageId,
          prompt: newImagePrompt.trim(),
          imageUrl: persistedImageUrl,
          createdAt: new Date(),
          characterId: character.id,
          tags,
          byteSize: persistedByteSize,
          mimeType: persistedMimeType,
          base64Length,
          storageType,
          storageKey,
        };

        const inlineStorageLimit = 1;
        let sanitizedExistingImages: GeneratedImage[];

        if (storageType === 'cache') {
          const inlineRemainders = migratedExistingImages.filter(
            (img) => !img.storageType && typeof img.imageUrl === 'string' && img.imageUrl.startsWith('data:'),
          );

          if (inlineRemainders.length > 0) {
            console.warn('Removing inline gallery images that could not migrate to cache storage', {
              removedCount: inlineRemainders.length,
            });
          }

          sanitizedExistingImages = migratedExistingImages.filter(
            (img) => !(!img.storageType && typeof img.imageUrl === 'string' && img.imageUrl.startsWith('data:')),
          );
        } else {
          sanitizedExistingImages = migratedExistingImages.slice(0, Math.max(0, inlineStorageLimit - 1));
        }

        console.log(
          'Creating new image object:',
          {
            id: newImage.id,
            promptLength: newImage.prompt.length,
            imageUrlLength: imageUrl.length,
            byteSize: approximateByteSize,
          }
        );
        
        await setStoredImages([newImage, ...sanitizedExistingImages]);
        
        console.log('Image saved to storage successfully');
        setNewImagePrompt('');
        setShowCreateImage(false);
        toast.success('Image created successfully!');
      } else {
        toast.error('Failed to generate image. Please check your AI settings.');
      }
    } catch (error) {
      console.error('Error creating image:', error);
      toast.error('Failed to create image: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsCreatingImage(false);
    }
  }, [newImagePrompt, character, setStoredImages]);

  const handleDeleteImage = useCallback(
    (imageId: string) => {
      const targetImage = storedImagesRef.current?.find((img) => img.id === imageId);

      const deleteAndUpdate = async () => {
        if (targetImage?.storageType === 'cache' && targetImage.storageKey) {
          await deleteImageFromCache(targetImage.storageKey);
        }

        await setStoredImages((prevImages) => prevImages.filter((img) => img.id !== imageId));
      };

      void deleteAndUpdate()
        .then(() => {
          toast.success('Image deleted');
        })
        .catch((error) => {
          console.error('Failed to delete generated image', error);
          toast.error('Failed to delete image');
        });
    },
    [setStoredImages]
  );

  const handleGeneratePhysicalDescription = useCallback(async () => {
    setIsGeneratingPhysical(true);
    try {
      const prompt = formatPrompt('character.card.physicalDescriptionPrompt', {
        hairColor: physicalFeatures.hairColor || 'not specified',
        eyeColor: physicalFeatures.eyeColor || 'not specified',
        skinTone: physicalFeatures.skinTone || 'not specified',
        height: physicalFeatures.height || 'not specified',
        bodyType: physicalFeatures.bodyType || 'not specified',
        breastSize: physicalFeatures.breastSize || 'not specified',
        buttSize: physicalFeatures.buttSize || 'not specified',
        traits: physicalFeatures.traits.join(', ') || 'not specified'
      });

      const { AIService } = await import('@/lib/aiService');
      const description = await AIService.generateResponse(prompt, undefined, undefined, {
        temperature: 0.8,
        max_tokens: 200
      });

      if (description && !description.includes('AI provider not configured')) {
        setGeneratedPhysicalDescription(description.trim());
        toast.success('Physical description generated!');
      } else {
        toast.error('Failed to generate description. Please check your AI settings.');
      }
    } catch (error) {
      console.error('Error generating physical description:', error);
      toast.error('Failed to generate description: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsGeneratingPhysical(false);
    }
  }, [physicalFeatures]);

  const stats = useMemo(() => {
    const base = character.stats ?? ({} as Character['stats']);
    return {
      love: clamp(base.love, 0),
      happiness: clamp(base.happiness, 50),
      wet: clamp(base.wet, 0),
      willing: clamp(base.willing, 50),
      loyalty: clamp(base.loyalty, 50),
      selfEsteem: clamp(base.selfEsteem, 50),
      fight: clamp(base.fight, 20),
      pain: clamp(base.pain, 25),
      experience: Math.max(0, base.experience ?? 0),
      level: Math.max(1, base.level ?? 1),
    };
  }, [character.stats]);

  const skills = useMemo(() => {
    const base = character.skills ?? ({} as Character['skills']);
    const baseStats = character.stats ?? ({} as Character['stats']);
    return {
      hands: clamp(base.hands, 0),
      mouth: clamp(base.mouth, 0),
      missionary: clamp(base.missionary, 0),
      doggy: clamp(base.doggy, 0),
      cowgirl: clamp(base.cowgirl, 0),
      stamina: clamp(baseStats.stamina, 50), // Moved from stats
    };
  }, [character.skills, character.stats]);

  const progression = useMemo(() => {
    const base = character.progression ?? ({} as Character['progression']);
    return {
      ...base,
      relationshipMilestones: base.relationshipMilestones ?? [],
      sexualMilestones: base.sexualMilestones ?? [],
      significantEvents: base.significantEvents ?? [],
      memorableEvents: base.memorableEvents ?? [],
      unlockedPositions: base.unlockedPositions ?? [],
      unlockedOutfits: base.unlockedOutfits ?? [],
      unlockedToys: base.unlockedToys ?? [],
      unlockedScenarios: base.unlockedScenarios ?? [],
      bonds: base.bonds ?? {},
      sexualCompatibility: base.sexualCompatibility ?? { overall: 0, kinkAlignment: 0, stylePreference: 0 },
      userPreferences: base.userPreferences ?? { likes: [], dislikes: [], turnOns: [], turnOffs: [] },
      storyChronicle: base.storyChronicle ?? [],
      narrativeSummary: base.narrativeSummary ?? {},
    };
  }, [character.progression]);

  const relationshipStatus = progression.relationshipStatus ?? 'stranger';

  const characterSessions = useMemo(
    () => sessions.filter((session) => session.participantIds?.includes(character.id)),
    [sessions, character.id],
  );

  const totalMessages = useMemo(
    () =>
      characterSessions.reduce(
        (sum, session) => sum + (session.messageCount ?? session.messages?.length ?? 0),
        0,
      ),
    [characterSessions],
  );

  const lastInteraction = character.lastInteraction ?? characterSessions[0]?.updatedAt ?? null;

  const galleryImages = useMemo(
    () => storedImages.filter((image) => image.characterId === character.id),
    [storedImages, character.id],
  );

  const emotionalJourney = useMemo(
    () => analyzeEmotionalJourney(character),
    [character, analyzeEmotionalJourney],
  );

  const quickStats = [
    {
      key: 'love',
      label: 'Love',
      value: stats.love,
      tone: 'text-rose-400',
      bar: 'bg-rose-500/30',
      icon: Heart,
    },
    {
      key: 'happiness',
      label: 'Happiness',
      value: stats.happiness,
      tone: 'text-amber-300',
      bar: 'bg-amber-400/30',
      icon: Smile,
    },
    {
      key: 'desire',
      label: 'Desire',
      value: stats.wet,
      tone: 'text-fuchsia-300',
      bar: 'bg-fuchsia-500/20',
      icon: Drop,
    },
  ] as const;

  const compatibilityStats = [
    { label: 'Overall', value: clamp(progression.sexualCompatibility.overall, 0) },
    { label: 'Kink Alignment', value: clamp(progression.sexualCompatibility.kinkAlignment, 0) },
    { label: 'Style Match', value: clamp(progression.sexualCompatibility.stylePreference, 0) },
  ];

  const storyEntries = useMemo(() => {
    const entries = (progression.storyChronicle as StoryEntry[]) ?? [];
    return entries.slice().sort((a, b) => {
      const aTime = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
      const bTime = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
      return bTime - aTime;
    }).slice(0, 8);
  }, [progression.storyChronicle]);

  const narrativeSummary = useMemo(() => {
    const summary = progression.narrativeSummary ?? {};
    const sanitize = (value?: unknown) => (typeof value === 'string' ? value.trim() : '');
    const rawTimestamp = typeof summary.lastUpdatedAt === 'string' ? summary.lastUpdatedAt.trim() : '';
    const parsedDate = rawTimestamp ? new Date(rawTimestamp) : undefined;
    const lastUpdatedAt = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : undefined;
    return {
      sessionOverview: sanitize(summary.sessionOverview),
      coreStats: sanitize(summary.coreStats),
      sexStats: sanitize(summary.sexStats),
      lastUpdatedAt,
    };
  }, [progression.narrativeSummary]);

  const primaryActions = (
    <div className="grid gap-2 sm:grid-cols-2">
      <Button onClick={() => onStartChat(character.id)} className="h-10">
        <MessageCircle className="mr-2 h-4 w-4" />
        Start Chat
      </Button>
      {onGift && (
        <Button variant="outline" onClick={() => onGift(character.id)} className="h-10">
          <Gift className="mr-2 h-4 w-4" />
          Give Gift
        </Button>
      )}
      {onMove && (
        <Button variant="outline" onClick={() => onMove(character.id)} className="h-10">
          <House className="mr-2 h-4 w-4" />
          Move
        </Button>
      )}
      {onEdit && (
        <Button variant="outline" onClick={() => onEdit(character)} className="h-10">
          <Pencil className="mr-2 h-4 w-4" />
          Edit Profile
        </Button>
      )}
      {onDelete && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="h-10">
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {character.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the character, their progress, and their memories. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(character.id)}>Delete Character</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );

  const compactCard = (
    <Card
      role="button"
      tabIndex={0}
      className="group cursor-pointer border border-white/10 bg-gradient-to-br from-[#141428] via-[#0b0b16] to-[#04040a] p-4 text-white shadow-lg transition hover:border-primary/40 hover:shadow-primary/20 focus:outline-none focus:ring-2 focus:ring-primary"
      onClick={() => handleOpenChange(true)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleOpenChange(true);
        }
      }}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12 border border-white/10">
          <AvatarImage src={character.avatar} alt={character.name} />
          <AvatarFallback className="bg-primary/20 text-primary-foreground">
            {character.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold">{character.name}</h4>
            {getRarityIcon(character.rarity)}
            <Badge variant="outline" className="text-[10px] capitalize">
              {relationshipStatus.replace(/_/g, ' ')}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-white/60 line-clamp-2">{character.description}</p>
        </div>
        <div className="text-right text-[10px] text-white/40">
          <div>{totalMessages} msgs</div>
          <div>{formatDate(lastInteraction)}</div>
          {source && <div className="mt-1 uppercase tracking-wide">{source}</div>}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {quickStats.map(({ key, label, value, tone, bar, icon: Icon }) => (
          <div key={key} className="flex items-center gap-2">
            <Icon className={`${tone} h-3.5 w-3.5`} />
            <div className="flex-1">
              <div className="flex items-center justify-between text-[11px] text-white/60">
                <span>{label}</span>
                <span className="text-white/80">{value}%</span>
              </div>
              <Progress value={value} className={`mt-1 h-1.5 bg-white/10 [&>div]:${bar}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            onStartChat(character.id);
          }}
        >
          <MessageCircle className="mr-2 h-3.5 w-3.5" /> Chat
        </Button>
        {onEdit && (
          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(character);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        {onGift && (
          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              onGift(character.id);
            }}
          >
            <Gift className="h-3.5 w-3.5" />
          </Button>
        )}
        {onMove && (
          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              onMove(character.id);
            }}
          >
            <House className="h-3.5 w-3.5" />
          </Button>
        )}
        {onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="destructive"
                onClick={(event) => event.stopPropagation()}
              >
                <Trash className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {character.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone and will remove all progress with this character.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(character.id)}>
                  Delete Character
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </Card>
  );

  const overviewTab = (
    <TabsContent value="overview" className="h-full">
      <ScrollArea className="h-full px-6">
        <div className="space-y-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold">Profile</h3>
              <Badge
                variant="outline"
                className={`${relationshipStatusColor(relationshipStatus)} border-white/15 bg-transparent text-xs capitalize`}
              >
                {relationshipStatus.replace(/_/g, ' ')}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {source && source !== 'roster' ? (
                <Badge variant="outline" className="border-white/15 bg-white/5 text-xs uppercase tracking-wide text-white/70">
                  Viewing from {source}
                </Badge>
              ) : null}
              <Button
                variant={isEditMode ? "default" : "outline"}
                size="sm"
                onClick={() => setIsEditMode(!isEditMode)}
                className="rounded-full"
              >
                <Pencil className="mr-2 h-3.5 w-3.5" />
                {isEditMode ? 'View Mode' : 'Edit'}
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-[280px_1fr]">
            <div className="flex flex-col gap-4 items-center">
              <Avatar className="h-64 w-64 rounded-2xl border-2 border-white/20">
                <AvatarImage 
                  src={profileDraft.avatar} 
                  alt={profileDraft.name || character.name}
                  className="object-cover"
                />
                <AvatarFallback className="bg-white/10 text-4xl font-semibold">
                  {(profileDraft.name || character.name || '?').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isEditMode && (
                <div className="w-full space-y-2 text-sm">
                  <Label htmlFor={`${character.id}-avatar`} className="text-xs uppercase tracking-wider text-white/50">
                    Profile Picture
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const dataUrl = event.target?.result as string;
                              handleDraftChange('avatar', dataUrl);
                            };
                            reader.readAsDataURL(file);
                          }
                        };
                        input.click();
                      }}
                      className="flex-1 h-8 text-xs bg-white/5 border-white/10 hover:bg-white/10"
                    >
                      <ImageIcon size={14} className="mr-1" />
                      Upload Image
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          toast.info('Generating portrait...');
                          
                          // Use the prompts.appearance field which was specifically made for image generation
                          const appearancePrompt = character.prompts?.appearance || 
                            profileDraft.appearance || 
                            character.appearance ||
                            `${profileDraft.name || character.name}, ${profileDraft.age || character.age} years old, attractive`;
                          
                          // Use AI service to generate image - profile picture is a portrait headshot
                          const { AIService } = await import('@/lib/aiService');
                          const imageUrl = await AIService.generateImage(`Portrait headshot photo. ${appearancePrompt}`);
                          
                          if (imageUrl) {
                            handleDraftChange('avatar', imageUrl);
                            toast.success('Portrait generated!');
                          } else {
                            toast.error('Failed to generate image');
                          }
                        } catch (error) {
                          console.error('Image generation error:', error);
                          toast.error('Failed to generate portrait');
                        }
                      }}
                      className="flex-1 h-8 text-xs bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20 text-purple-300"
                    >
                      <Sparkle size={14} className="mr-1" />
                      Generate AI
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Story Summary */}
              <div className="space-y-3 pt-2">
                <div className="text-xs uppercase tracking-wider text-white/40">Her Story</div>
                {storyEntries.length > 0 ? (
                  <div className="space-y-2">
                    {storyEntries.slice(0, 3).map((entry) => (
                      <div key={entry.id} className="rounded-lg bg-white/5 p-2.5 border border-white/10">
                        <div className="text-xs font-medium text-white/80 line-clamp-1">{entry.title}</div>
                        <div className="text-[10px] text-white/50 mt-0.5">{formatDate(entry.timestamp)}</div>
                      </div>
                    ))}
                    {storyEntries.length > 3 && (
                      <div className="text-xs text-white/40 text-center pt-1">
                        +{storyEntries.length - 3} more events
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-white/40 italic">
                    No story entries yet. Start chatting to build her narrative.
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-5">
              {isEditMode ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor={`${character.id}-name`} className="text-xs uppercase tracking-wider text-white/50">
                        Name
                      </Label>
                      <Input
                        id={`${character.id}-name`}
                        value={profileDraft.name}
                        onChange={(event) => handleDraftChange('name', event.target.value)}
                        className="mt-1.5 h-9 rounded-lg border-white/15 bg-white/5"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`${character.id}-age`} className="text-xs uppercase tracking-wider text-white/50">
                        Age
                      </Label>
                      <Input
                        id={`${character.id}-age`}
                        type="number"
                        min={0}
                        value={profileDraft.age}
                        onChange={(event) => handleDraftChange('age', event.target.value)}
                        className="mt-1.5 h-9 rounded-lg border-white/15 bg-white/5"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor={`${character.id}-description`} className="text-xs uppercase tracking-wider text-white/50">
                      Description
                    </Label>
                    <Textarea
                      id={`${character.id}-description`}
                      value={profileDraft.description}
                      onChange={(event) => handleDraftChange('description', event.target.value)}
                      className="mt-1.5 h-24 rounded-lg border-white/15 bg-white/5 text-sm"
                      placeholder="Who is she? What draws you in?"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`${character.id}-backstory`} className="text-xs uppercase tracking-wider text-white/50">
                      Backstory
                    </Label>
                    <Textarea
                      id={`${character.id}-backstory`}
                      value={profileDraft.backstory}
                      onChange={(event) => handleDraftChange('backstory', event.target.value)}
                      className="mt-1.5 h-28 rounded-lg border-white/15 bg-white/5 text-sm"
                      placeholder="Background, history, and context"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`${character.id}-keywords`} className="text-xs uppercase tracking-wider text-white/50">
                      Keywords
                    </Label>
                    <Textarea
                      id={`${character.id}-keywords`}
                      value={profileDraft.keywords}
                      onChange={(event) => handleDraftChange('keywords', event.target.value)}
                      className="mt-1.5 h-20 rounded-lg border-white/15 bg-white/5 text-sm"
                      placeholder="comma separated"
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* View Mode - Labeled Sections */}
                  <div className="space-y-5">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <div className="text-xs uppercase tracking-wider text-white/40 mb-1.5">Name:</div>
                            <div className="text-base font-semibold text-white">{character.name}</div>
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-wider text-white/40 mb-1.5">Age:</div>
                            <div className="text-base font-semibold text-white">{character.age || 'Unknown'}</div>
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-wider text-white/40 mb-1.5">Role:</div>
                            <div className="text-base text-white/80">{character.role || 'None'}</div>
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-wider text-white/40 mb-1.5">Level:</div>
                            <div className="text-base text-white/80">{stats.level}</div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-xs uppercase tracking-wider text-white/40 mb-1.5">Description:</div>
                          <div className="text-sm text-white/80 leading-relaxed">{character.description || 'No description available'}</div>
                        </div>
                        
                        {character.prompts?.background && (
                          <div>
                            <div className="text-xs uppercase tracking-wider text-white/40 mb-1.5">Background:</div>
                            <div className="text-sm text-white/80 leading-relaxed">{character.prompts.background}</div>
                          </div>
                        )}
                        
                        {character.features && character.features.length > 0 && (
                          <div>
                            <div className="text-xs uppercase tracking-wider text-white/40 mb-1.5">Traits:</div>
                            <div className="flex flex-wrap gap-1.5">
                              {character.features.map((feature, idx) => (
                                <Badge key={idx} variant="outline" className="border-white/20 bg-white/5 text-xs">
                                  {feature}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="pt-3 border-t border-white/10">
                          <div className="text-xs uppercase tracking-wider text-white/40 mb-1.5">Activity:</div>
                          <div className="text-sm text-white/70">
                            {totalMessages} messages • {characterSessions.length} sessions
                          </div>
                          <div className="text-xs text-white/50 mt-1">
                            Last interaction: {formatDate(lastInteraction)}
                          </div>
                        </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {isEditMode && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
              <div className="text-xs uppercase tracking-wider text-white/40">
                {isProfileDirty ? 'Unsaved changes' : 'Saved'}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetProfile}
                  disabled={!isProfileDirty || isSavingProfile}
                  className="rounded-lg border-white/20 text-white/70 hover:text-white"
                >
                  Reset
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveProfile}
                  disabled={!isProfileDirty || isSavingProfile}
                  className="rounded-lg bg-[#ff1372] px-5 text-white hover:bg-[#ff1372]/85"
                >
                  {isSavingProfile ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t border-white/10">
            {primaryActions}
          </div>
        </div>
      </ScrollArea>
    </TabsContent>
  );

  const statsTab = (
    <TabsContent value="stats" className="h-full">
      <ScrollArea className="h-full px-6">
        <div className="space-y-6 py-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Core Stats</h3>
            <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(stats).map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="capitalize text-white/70">{label}</span>
                        <span className="text-white font-medium">
                          {typeof value === 'number' ? `${Math.round(value)}` : value}
                          {label === 'experience' || label === 'level' ? '' : '%'}
                        </span>
                      </div>
                      <Progress value={typeof value === 'number' ? value : 0} className="h-1.5 bg-white/10" />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">Session Overview</h3>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm leading-relaxed text-white/80">
              {narrativeSummary.sessionOverview ? (
                <>
                  <p>{narrativeSummary.sessionOverview}</p>
                  {narrativeSummary.lastUpdatedAt && (
                    <div className="pt-3 text-xs uppercase tracking-wide text-white/40">
                      Updated {formatDate(narrativeSummary.lastUpdatedAt)}
                    </div>
                  )}
                </>
              ) : (
                <p className="italic text-white/50">Run Analyze to capture the latest story beats.</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-white">Relationship Pulse</h3>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm leading-relaxed text-white/80">
                {narrativeSummary.coreStats ? (
                  <p>{narrativeSummary.coreStats}</p>
                ) : (
                  <p className="italic text-white/50">No relationship summary yet.</p>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-white">Intimate Highlights</h3>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm leading-relaxed text-white/80">
                {narrativeSummary.sexStats ? (
                  <p>{narrativeSummary.sexStats}</p>
                ) : (
                  <p className="italic text-white/50">No intimate summary yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <TrendUp className="h-5 w-5 text-emerald-300" /> Sexual Skills
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(skills).map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="capitalize text-white/70">{label}</span>
                        <span className="text-white font-medium">{value}%</span>
                      </div>
                      <Progress value={value} className="h-1.5 bg-white/10" />
                    </div>
                  </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Compatibility</h3>
            <div className="grid gap-3 sm:grid-cols-3">
                {compatibilityStats.map(({ label, value }) => (
                  <div key={label} className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
                    <div className="text-xs uppercase tracking-wide text-white/50">{label}</div>
                    <div className="mt-2 text-xl font-semibold text-white">{value}%</div>
                  </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </TabsContent>
  );

  const physicalTab = (
    <TabsContent value="physical" className="h-full">
      <ScrollArea className="h-full px-6">
        <div className="space-y-6 py-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <User className="h-5 w-5 text-pink-300" /> Physical Features
              </h3>
              <Button
                variant={isPhysicalEditMode ? "default" : "outline"}
                size="sm"
                onClick={() => setIsPhysicalEditMode(!isPhysicalEditMode)}
                className="rounded-full"
              >
                <Pencil className="mr-2 h-3.5 w-3.5" />
                {isPhysicalEditMode ? 'View Mode' : 'Edit'}
              </Button>
            </div>
            
            {isPhysicalEditMode ? (
              <>
                {/* Physical Attributes - Edit Mode */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs uppercase tracking-[0.25em] text-white/50">Hair Color</Label>
                    <Select value={physicalFeatures.hairColor} onValueChange={(value) => setPhysicalFeatures({...physicalFeatures, hairColor: value})}>
                      <SelectTrigger className="mt-1 border-white/15 bg-white/5">
                        <SelectValue placeholder="Select hair color" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Blonde">Blonde</SelectItem>
                        <SelectItem value="Brunette">Brunette</SelectItem>
                        <SelectItem value="Black">Black</SelectItem>
                        <SelectItem value="Red">Red</SelectItem>
                        <SelectItem value="Auburn">Auburn</SelectItem>
                        <SelectItem value="Platinum">Platinum</SelectItem>
                        <SelectItem value="Brown">Brown</SelectItem>
                        <SelectItem value="Dark Brown">Dark Brown</SelectItem>
                        <SelectItem value="Light Brown">Light Brown</SelectItem>
                        <SelectItem value="Gray">Gray</SelectItem>
                        <SelectItem value="White">White</SelectItem>
                        <SelectItem value="Colorful">Colorful/Dyed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs uppercase tracking-[0.25em] text-white/50">Eye Color</Label>
                    <Select value={physicalFeatures.eyeColor} onValueChange={(value) => setPhysicalFeatures({...physicalFeatures, eyeColor: value})}>
                      <SelectTrigger className="mt-1 border-white/15 bg-white/5">
                        <SelectValue placeholder="Select eye color" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Blue">Blue</SelectItem>
                        <SelectItem value="Green">Green</SelectItem>
                        <SelectItem value="Brown">Brown</SelectItem>
                        <SelectItem value="Hazel">Hazel</SelectItem>
                        <SelectItem value="Gray">Gray</SelectItem>
                        <SelectItem value="Amber">Amber</SelectItem>
                        <SelectItem value="Violet">Violet</SelectItem>
                        <SelectItem value="Heterochromia">Heterochromia (Different colors)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs uppercase tracking-[0.25em] text-white/50">Skin Tone</Label>
                    <Select value={physicalFeatures.skinTone} onValueChange={(value) => setPhysicalFeatures({...physicalFeatures, skinTone: value})}>
                      <SelectTrigger className="mt-1 border-white/15 bg-white/5">
                        <SelectValue placeholder="Select skin tone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pale">Pale</SelectItem>
                        <SelectItem value="Fair">Fair</SelectItem>
                        <SelectItem value="Light">Light</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Olive">Olive</SelectItem>
                        <SelectItem value="Tan">Tan</SelectItem>
                        <SelectItem value="Brown">Brown</SelectItem>
                        <SelectItem value="Dark">Dark</SelectItem>
                        <SelectItem value="Ebony">Ebony</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs uppercase tracking-[0.25em] text-white/50">Height</Label>
                    <Input
                      value={physicalFeatures.height}
                      onChange={(e) => setPhysicalFeatures({...physicalFeatures, height: e.target.value})}
                      placeholder="e.g., 5'6&quot; (168cm)"
                      className="mt-1 border-white/15 bg-white/5"
                    />
                  </div>

                  <div>
                    <Label className="text-xs uppercase tracking-[0.25em] text-white/50">Body Type</Label>
                    <Select value={physicalFeatures.bodyType} onValueChange={(value) => setPhysicalFeatures({...physicalFeatures, bodyType: value})}>
                      <SelectTrigger className="mt-1 border-white/15 bg-white/5">
                        <SelectValue placeholder="Select body type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Petite">Petite</SelectItem>
                        <SelectItem value="Slim">Slim</SelectItem>
                        <SelectItem value="Athletic">Athletic</SelectItem>
                        <SelectItem value="Curvy">Curvy</SelectItem>
                        <SelectItem value="Voluptuous">Voluptuous</SelectItem>
                        <SelectItem value="Average">Average</SelectItem>
                        <SelectItem value="Muscular">Muscular</SelectItem>
                        <SelectItem value="Hourglass">Hourglass</SelectItem>
                        <SelectItem value="Pear">Pear</SelectItem>
                        <SelectItem value="Apple">Apple</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs uppercase tracking-[0.25em] text-white/50">Breast Size</Label>
                    <Select value={physicalFeatures.breastSize} onValueChange={(value) => setPhysicalFeatures({...physicalFeatures, breastSize: value})}>
                      <SelectTrigger className="mt-1 border-white/15 bg-white/5">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AA">AA</SelectItem>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                        <SelectItem value="D">D</SelectItem>
                        <SelectItem value="DD">DD</SelectItem>
                        <SelectItem value="DDD/E">DDD/E</SelectItem>
                        <SelectItem value="F">F</SelectItem>
                        <SelectItem value="G+">G and up</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs uppercase tracking-[0.25em] text-white/50">Butt Size</Label>
                    <Select value={physicalFeatures.buttSize} onValueChange={(value) => setPhysicalFeatures({...physicalFeatures, buttSize: value})}>
                      <SelectTrigger className="mt-1 border-white/15 bg-white/5">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Small">Small</SelectItem>
                        <SelectItem value="Average">Average</SelectItem>
                        <SelectItem value="Round">Round</SelectItem>
                        <SelectItem value="Bubble">Bubble</SelectItem>
                        <SelectItem value="Large">Large</SelectItem>
                        <SelectItem value="Extra Large">Extra Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-6">
                  <Label className="text-xs uppercase tracking-[0.25em] text-white/50">Physical Traits</Label>
                  <Textarea
                    value={physicalFeatures.traits.join(', ')}
                    onChange={(e) => setPhysicalFeatures({...physicalFeatures, traits: e.target.value.split(',').map(t => t.trim()).filter(Boolean)})}
                    placeholder="Enter traits separated by commas: tattoos, piercings, beauty marks, scars, etc."
                    className="mt-1 border-white/15 bg-white/5 text-sm"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 pt-4 border-t border-white/10">
                  <Button
                    onClick={handleGeneratePhysicalDescription}
                    disabled={isGeneratingPhysical}
                    className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                  >
                    {isGeneratingPhysical ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkle className="mr-2 h-4 w-4" />
                        Generate Description
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* View Mode */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {physicalFeatures.hairColor && (
                    <div>
                      <div className="text-xs uppercase tracking-[0.25em] text-white/50 mb-2">Hair Color</div>
                      <div className="text-sm font-semibold">{physicalFeatures.hairColor}</div>
                    </div>
                  )}
                  {physicalFeatures.eyeColor && (
                    <div>
                      <div className="text-xs uppercase tracking-[0.25em] text-white/50 mb-2">Eye Color</div>
                      <div className="text-sm font-semibold">{physicalFeatures.eyeColor}</div>
                    </div>
                  )}
                  {physicalFeatures.skinTone && (
                    <div>
                      <div className="text-xs uppercase tracking-[0.25em] text-white/50 mb-2">Skin Tone</div>
                      <div className="text-sm font-semibold">{physicalFeatures.skinTone}</div>
                    </div>
                  )}
                  {physicalFeatures.height && (
                    <div>
                      <div className="text-xs uppercase tracking-[0.25em] text-white/50 mb-2">Height</div>
                      <div className="text-sm font-semibold">{physicalFeatures.height}</div>
                    </div>
                  )}
                  {physicalFeatures.bodyType && (
                    <div>
                      <div className="text-xs uppercase tracking-[0.25em] text-white/50 mb-2">Body Type</div>
                      <div className="text-sm font-semibold">{physicalFeatures.bodyType}</div>
                    </div>
                  )}
                  {physicalFeatures.breastSize && (
                    <div>
                      <div className="text-xs uppercase tracking-[0.25em] text-white/50 mb-2">Breast Size</div>
                      <div className="text-sm font-semibold">{physicalFeatures.breastSize}</div>
                    </div>
                  )}
                  {physicalFeatures.buttSize && (
                    <div>
                      <div className="text-xs uppercase tracking-[0.25em] text-white/50 mb-2">Butt Size</div>
                      <div className="text-sm font-semibold">{physicalFeatures.buttSize}</div>
                    </div>
                  )}
                </div>

                {physicalFeatures.traits.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs uppercase tracking-[0.25em] text-white/50 mb-2">Physical Traits</div>
                    <div className="flex flex-wrap gap-2">
                      {physicalFeatures.traits.map((trait, idx) => (
                        <Badge key={idx} variant="outline" className="border-white/20 bg-white/5">
                          {trait}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Generated Description */}
            {generatedPhysicalDescription && (
              <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
                <h4 className="text-sm font-medium text-white/80 mb-2">Generated Physical Description</h4>
                <p className="text-sm text-white/70 leading-relaxed">{generatedPhysicalDescription}</p>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </TabsContent>
  );

  const valueTab = (
    <TabsContent value="value" className="h-full">
      <ScrollArea className="h-full px-6">
        <div className="space-y-6 py-6">
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <CurrencyDollar className="h-5 w-5 text-green-300" /> Market Valuation
            </h3>
            
            {/* Overall Value */}
            <div className="text-center p-6 bg-gradient-to-r from-green-900/20 to-emerald-900/20 rounded-xl border border-green-500/20">
              <div className="text-3xl font-bold text-green-400 mb-2">$125,000</div>
              <div className="text-sm text-green-300">Estimated Market Value</div>
              <div className="text-xs text-white/60 mt-1">Premium Tier • Rare Quality</div>
            </div>

            {/* Value Breakdown */}
            <div className="grid gap-4 sm:grid-cols-2 mt-6">
              <div>
                <h4 className="text-sm font-medium text-white/80 mb-3">Value Factors</h4>
                <div className="space-y-2 text-sm">
                  {[
                    { factor: 'Physical Beauty', value: '$45,000', weight: '36%' },
                    { factor: 'Personality', value: '$25,000', weight: '20%' },
                    { factor: 'Rarity', value: '$20,000', weight: '16%' },
                    { factor: 'Experience', value: '$15,000', weight: '12%' },
                    { factor: 'Age Factor', value: '$12,000', weight: '10%' },
                    { factor: 'Skills', value: '$8,000', weight: '6%' }
                  ].map(({ factor, value, weight }) => (
                    <div key={factor} className="flex justify-between items-center">
                      <span className="text-white/60">{factor}</span>
                      <div className="text-right">
                        <div className="text-white font-medium">{value}</div>
                        <div className="text-xs text-white/40">{weight}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-white/80 mb-3">Market Analysis</h4>
                <div className="space-y-3">
                  <div className="p-3 bg-green-900/20 rounded-lg border border-green-500/20">
                    <div className="text-sm font-medium text-green-400">Recommendation: HOLD</div>
                    <div className="text-xs text-white/60 mt-1">
                      High-value asset with strong appreciation potential
                    </div>
                  </div>
                  
                  <div className="text-xs text-white/70 space-y-1">
                    <div className="flex justify-between">
                      <span>Value Trend:</span>
                      <span className="text-green-400">↗ +15% (6m)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Market Demand:</span>
                      <span className="text-yellow-400">High</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Depreciation Risk:</span>
                      <span className="text-green-400">Low</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Target Demographics */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-white/80 mb-3">Target Demographics</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  'Executives (25-45)',
                  'High-net-worth individuals',
                  'Collectors of rare beauty',
                  'Premium experience seekers'
                ].map((demographic, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-white/70">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                    {demographic}
                  </div>
                ))}
              </div>
            </div>

            {/* Investment Notes */}
            <div className="mt-6 p-4 bg-blue-900/20 rounded-lg border border-blue-500/20">
              <h4 className="text-sm font-medium text-blue-300 mb-2">Investment Notes</h4>
              <p className="text-xs text-white/70 leading-relaxed">
                Premium asset with exceptional physical ratings and desirable personality traits. 
                Strong appreciation potential due to rarity and high demand in target demographics. 
                Consider long-term hold for maximum value realization.
              </p>
            </div>
          </div>
        </div>
      </ScrollArea>
    </TabsContent>
  );

  const feedTab = (
    <TabsContent value="feed" className="h-full">
      <ScrollArea className="h-full px-6">
        <div className="space-y-6 py-6">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <ImageIcon className="h-5 w-5 text-sky-300" /> Gallery
            </h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-white/20 bg-white/5 text-xs text-white/70">
                {galleryImages.length} images
              </Badge>
              <Button
                onClick={() => setShowCreateImage(!showCreateImage)}
                variant="outline"
                size="sm"
                className="rounded-lg border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                <Plus className="mr-1 h-4 w-4" />
                Create
              </Button>
            </div>
          </div>

          {/* Create Image Interface */}
          {showCreateImage && (
            <Card className="border-white/10 bg-white/5 p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 border border-white/20">
                  <AvatarImage src={character.avatar} alt={character.name} />
                  <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white text-xs">
                    {character.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <Textarea
                    placeholder={`What image should ${character.name} create?`}
                    value={newImagePrompt}
                    onChange={(e) => setNewImagePrompt(e.target.value)}
                    rows={3}
                    className="resize-none border-white/20 bg-white/5 text-white placeholder:text-white/40"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCreateImage}
                      disabled={isCreatingImage || !newImagePrompt.trim()}
                      className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                      size="sm"
                    >
                      {isCreatingImage ? (
                        <>
                          <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <ImageIcon className="mr-2 h-4 w-4" />
                          Generate
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowCreateImage(false);
                        setNewImagePrompt('');
                      }}
                      className="border-white/20 bg-transparent text-white hover:bg-white/10"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {galleryImages.length === 0 ? (
            <Card className="border-none bg-white/5 text-white/70">
              <div className="flex flex-col items-center gap-2 p-12 text-center">
                <ImageIcon className="h-10 w-10 text-white/20" />
                <p>No images yet. Click the Create button to generate {character.name}'s first image.</p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {galleryImages.map((image) => (
                <GalleryImageCard
                  key={image.id}
                  image={image}
                  onSelect={(selected) => setSelectedImage(selected)}
                  onDownload={handleDownloadImage}
                  onDelete={handleDeleteImage}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </TabsContent>
  );

  const memoriesTab = (
    <TabsContent value="memories" className="h-full">
      <ScrollArea className="h-full px-6">
        <div className="space-y-6 py-6">
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <BookOpen className="h-5 w-5 text-sky-300" /> Story Chronicle
            </h3>
            {storyEntries.length === 0 ? (
                <p className="text-sm text-white/60">No story entries yet. Start conversations to build her narrative.</p>
              ) : (
                <div className="space-y-4">
                  {storyEntries.map((entry) => (
                    <div key={entry.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-wide text-white/40">
                        <span>{entry.eventType}</span>
                        <span>{formatDate(entry.timestamp)}</span>
                      </div>
                      <h4 className="mt-2 text-sm font-medium text-white/80">{entry.title}</h4>
                      <p className="mt-2 text-sm text-white/70">{entry.summary}</p>
                      {entry.tags?.length ? (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {entry.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="border-white/20 bg-transparent text-[10px] text-white/60">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Emotional Journey</h3>
            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-white/70">{emotionalJourney}</pre>
          </div>
        </div>
      </ScrollArea>
    </TabsContent>
  );

  const promptsTab = (
    <TabsContent value="prompts" className="h-full">
      <ScrollArea className="h-full px-6">
        <div className="space-y-6 py-6">
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Code className="h-5 w-5 text-emerald-300" /> Character Prompts
            </h3>
            <div className="space-y-4 text-sm text-white/70">
                <div>
                  <label className="block text-white/80 font-medium mb-2">System Prompt</label>
                  <Textarea
                    value={promptDraft.system}
                    onChange={(event) => handlePromptChange('system', event.target.value)}
                    placeholder={`You are ${character.name}, a character with the following personality: ${character.personality}. Stay in character and respond naturally.`}
                    className="h-24 bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-white/80 font-medium mb-2">Description Prompt</label>
                  <Textarea
                    value={promptDraft.description}
                    onChange={(event) => handlePromptChange('description', event.target.value)}
                    placeholder={character.description || 'Craft a two-sentence hook that sells her vibe instantly.'}
                    className="h-20 bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-white/80 font-medium mb-2">Personality Prompt</label>
                  <Textarea
                    value={promptDraft.personality}
                    onChange={(event) => handlePromptChange('personality', event.target.value)}
                    placeholder={character.personality || 'Friendly, engaging, and thoughtful'}
                    className="h-20 bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-white/80 font-medium mb-2">Background Context</label>
                  <Textarea
                    value={promptDraft.background}
                    onChange={(event) => handlePromptChange('background', event.target.value)}
                    placeholder={character.description || 'Add background details here...'}
                    className="h-20 bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-white/80 font-medium mb-2">Appearance Prompt</label>
                  <Textarea
                    value={promptDraft.appearance}
                    onChange={(event) => handlePromptChange('appearance', event.target.value)}
                    placeholder={character.appearance || 'Describe her look, style, and physical presence.'}
                    className="h-20 bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-white/80 font-medium mb-2">Response Style</label>
                  <Textarea
                    value={promptDraft.responseStyle}
                    onChange={(event) => handlePromptChange('responseStyle', event.target.value)}
                    placeholder="Respond in character with natural, engaging dialogue. Keep responses conversational and true to personality."
                    className="h-16 bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-white/80 font-medium mb-2">Origin Scenario</label>
                  <Textarea
                    value={promptDraft.originScenario}
                    onChange={(event) => handlePromptChange('originScenario', event.target.value)}
                    placeholder="You are in a comfortable, private setting where you can speak freely and openly."
                    className="h-16 bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    disabled={!isPromptDirty || isSavingPrompts || typeof onSaveCharacter !== 'function'}
                    onClick={() => void handleSavePrompts()}
                  >
                    {isSavingPrompts ? 'Saving…' : 'Save Prompts'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-white/20"
                    disabled={!isPromptDirty || isSavingPrompts}
                    onClick={handleResetPrompts}
                  >
                    Reset to Default
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-white/20"
                    onClick={() => toast.info('Prompt testing coming soon.')}
                  >
                    Test Prompts
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </TabsContent>
    );

  const renderPanelContent = (insideDialog: boolean) => (
    <>
      {insideDialog ? (
        <DialogHeader className="border-b border-white/10 px-6 py-4">
          <DialogTitle className="text-lg font-semibold">{character.name}</DialogTitle>
        </DialogHeader>
      ) : (
        <div className="border-b border-white/10 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">{character.name}</h2>
        </div>
      )}
      <Tabs defaultValue="overview" className="flex h-full flex-col">
        <TabsList className="flex w-full flex-wrap justify-start gap-1 border-b border-white/10 bg-[#080814] px-6 py-3">
          <TabsTrigger
            value="overview"
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white/60 transition-all data-[state=active]:bg-white/15 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-white/5 hover:text-white/80"
          >
            <Star className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger
            value="stats"
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white/60 transition-all data-[state=active]:bg-white/15 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-white/5 hover:text-white/80"
          >
            <TrendUp className="h-4 w-4" />
            Stats
          </TabsTrigger>
          <TabsTrigger
            value="physical"
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white/60 transition-all data-[state=active]:bg-white/15 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-white/5 hover:text-white/80"
          >
            <User className="h-4 w-4" />
            Physical
          </TabsTrigger>
          <TabsTrigger
            value="value"
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white/60 transition-all data-[state=active]:bg-white/15 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-white/5 hover:text-white/80"
          >
            <CurrencyDollar className="h-4 w-4" />
            Value
          </TabsTrigger>
          <TabsTrigger
            value="feed"
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white/60 transition-all data-[state=active]:bg-white/15 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-white/5 hover:text-white/80"
          >
            <ImageIcon className="h-4 w-4" />
            Feed
          </TabsTrigger>
          <TabsTrigger
            value="memories"
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white/60 transition-all data-[state=active]:bg-white/15 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-white/5 hover:text-white/80"
          >
            <BookOpen className="h-4 w-4" />
            Memories
          </TabsTrigger>
          <TabsTrigger
            value="prompts"
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white/60 transition-all data-[state=active]:bg-white/15 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-white/5 hover:text-white/80"
          >
            <Code className="h-4 w-4" />
            Prompts
          </TabsTrigger>
        </TabsList>
        <div className="flex-1 overflow-hidden">
          {overviewTab}
          {statsTab}
          {physicalTab}
          {valueTab}
          {feedTab}
          {memoriesTab}
          {promptsTab}
        </div>
      </Tabs>
    </>
  );

  const dialogContent = (
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="flex w-full max-w-[1100px] max-h-[90vh] flex-col overflow-hidden border border-white/10 bg-[#05050c] p-0 text-white">
        {renderPanelContent(true)}
      </DialogContent>
    </Dialog>
  );

  const selectedImageDialog = selectedImage ? (
    <SelectedImageModal
      image={selectedImage}
      onRequestClose={() => setSelectedImage(null)}
    />
  ) : null;

  if (compact) {
    const inlineMode = hideTrigger;
    if (inlineMode) {
      return (
        <>
          {isDialogOpen ? (
            <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#05050c]/95 text-white">
              {renderPanelContent(false)}
            </div>
          ) : null}
          {selectedImageDialog}
        </>
      );
    }
    return (
      <>
        {!hideTrigger && compactCard}
        {dialogContent}
        {selectedImageDialog}
      </>
    );
  }

  const fullCard = (
    <Card
      role="button"
      tabIndex={0}
      className="group relative overflow-hidden border border-white/10 bg-gradient-to-br from-[#16162c] via-[#0c0c1a] to-[#04040a] p-6 text-white shadow-xl transition hover:border-primary/40 hover:shadow-primary/30 focus:outline-none focus:ring-2 focus:ring-primary"
      onClick={() => handleOpenChange(true)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleOpenChange(true);
        }
      }}
    >
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex items-start gap-4">
          <Avatar className="h-20 w-20 border-4 border-white/20 shadow-lg">
            <AvatarImage src={character.avatar} alt={character.name} className="object-cover" />
            <AvatarFallback className="bg-primary/30 text-lg font-semibold">
              {character.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-semibold text-white">{character.name}</h3>
              {getRarityIcon(character.rarity)}
              <Badge variant="outline" className="border-white/20 bg-white/10 text-xs capitalize">
                {relationshipStatus.replace(/_/g, ' ')}
              </Badge>
            </div>
            <p className="text-sm text-white/70 line-clamp-2 lg:max-w-lg">{character.description}</p>
            <div className="flex flex-wrap gap-3 text-xs uppercase tracking-wide text-white/40">
              <span>Level {stats.level}</span>
              <span>{totalMessages} messages</span>
              <span>Last seen {formatDate(lastInteraction)}</span>
            </div>
          </div>
        </div>
        <div className="flex-1">
          <div className="grid gap-3 sm:grid-cols-3">
            {quickStats.map(({ key, label, value, tone, icon: Icon }) => (
              <div key={`full-${key}`} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-white/40">
                  <span>{label}</span>
                  <Icon className={`${tone} h-4 w-4`} />
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">{value}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6 border-t border-white/10 pt-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
          <span className={`${relationshipStatusColor(relationshipStatus)} font-semibold uppercase`}>
            {relationshipStatus.replace(/_/g, ' ')}
          </span>
          <span>•</span>
          <span>{dots(character.personalities, 'No personalities')}</span>
        </div>
      </div>
    </Card>
  );

  return (
    <>
      {fullCard}
      {dialogContent}
      {selectedImageDialog}
    </>
  );
}

interface GalleryImageCardProps {
  image: GeneratedImage;
  onSelect: (image: GeneratedImage) => void;
  onDownload: (image: GeneratedImage) => Promise<void> | void;
  onDelete: (imageId: string) => void;
}

interface SelectedImageModalProps {
  image: GeneratedImage;
  onRequestClose: () => void;
}

function SelectedImageModal({ image, onRequestClose }: SelectedImageModalProps) {
  const sourceInfo = useGalleryImageSource(image);
  const isPng = Boolean(image.mimeType?.includes('/png'));
  const showUnavailable = sourceInfo.failed;

  return (
    <Dialog open onOpenChange={(value) => { if (!value) onRequestClose(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Image Detail</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative max-h-[480px] w-full overflow-hidden rounded-xl bg-white/5">
            {showUnavailable ? (
              <div className="flex h-[360px] items-center justify-center text-xs uppercase tracking-wide text-white/60">
                Preview unavailable
              </div>
            ) : sourceInfo.src ? (
              <img
                src={sourceInfo.src}
                alt={image.prompt}
                className="max-h-[480px] w-full object-contain"
              />
            ) : (
              <div className="flex h-[360px] items-center justify-center text-xs uppercase tracking-wide text-white/60">
                Preparing preview…
              </div>
            )}

            {sourceInfo.isProcessing && !showUnavailable ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs uppercase tracking-wide text-white/70">
                Preparing preview…
              </div>
            ) : null}

            {isPng && !showUnavailable ? (
              <div className="absolute left-2 top-2 rounded bg-black/60 px-2 py-1 text-[10px] uppercase tracking-wide text-white/70">
                PNG
              </div>
            ) : null}
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <h4 className="text-sm font-semibold">Prompt</h4>
              <p className="mt-1 text-muted-foreground">{image.prompt}</p>
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              {formatDate(image.createdAt)}
            </div>
            {image.tags?.length ? (
              <div className="flex flex-wrap gap-1">
                {image.tags.map((tag, index) => (
                  <Badge key={`${tag}-${index}`} variant="outline" className="text-[10px] uppercase">
                    #{tag}
                  </Badge>
                ))}
              </div>
            ) : null}
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => void handleDownloadImage(image)}>
                <Download className="mr-2 h-4 w-4" /> Download
              </Button>
              <Button variant="outline" onClick={onRequestClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GalleryImageCard({ image, onSelect, onDownload, onDelete }: GalleryImageCardProps) {
  const sourceInfo = useGalleryImageSource(image);
  const [hasError, setHasError] = useState(false);
  const [isPng, setIsPng] = useState(false);

  useEffect(() => {
    setHasError(false);
    setIsPng(Boolean(image.mimeType?.includes('/png') || image.imageUrl?.toLowerCase().includes('image/png')));
  }, [image.id, sourceInfo.src, image.mimeType, image.imageUrl]);

  const sizeLabel = typeof image.byteSize === 'number' ? `${formatMegabytes(image.byteSize)}MB` : null;
  const showUnavailable = hasError || sourceInfo.failed;

  return (
    <Card className="group overflow-hidden border border-white/10 bg-white/5 text-white transition hover:border-primary/40">
      <button
        type="button"
        className="block w-full overflow-hidden"
        onClick={() => onSelect(image)}
      >
        <div className="relative h-48 w-full">
          {showUnavailable ? (
            <div className="flex h-full w-full items-center justify-center bg-white/5 text-xs uppercase tracking-wide text-white/50">
              Preview unavailable
            </div>
          ) : sourceInfo.src ? (
            <img
              src={sourceInfo.src}
              alt={image.prompt}
              className="h-48 w-full object-cover transition duration-500 group-hover:scale-105"
              onError={() => {
                console.error('Failed to render gallery image', {
                  imageId: image.id,
                  byteSize: image.byteSize,
                  urlLength: typeof image.imageUrl === 'string' ? image.imageUrl.length : 0,
                  mimeType: image.mimeType,
                });
                setHasError(true);
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-white/5 text-xs uppercase tracking-wide text-white/50">
              Preparing preview…
            </div>
          )}
          {sourceInfo.isProcessing && !showUnavailable ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs uppercase tracking-wide text-white/70">
              Preparing preview…
            </div>
          ) : null}
          {isPng && !showUnavailable ? (
            <div className="absolute left-2 top-2 rounded bg-black/60 px-2 py-1 text-[10px] uppercase tracking-wide text-white/70">
              PNG
            </div>
          ) : null}
        </div>
      </button>
      <div className="space-y-2 p-4 text-sm text-white/70">
        <div className="line-clamp-2 text-white/80">{image.prompt}</div>
        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-white/40">
          <span>{formatDate(image.createdAt)}</span>
          {sizeLabel ? <span className="text-[10px] text-white/35">{sizeLabel}</span> : null}
        </div>
        {image.tags && image.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {image.tags.map((tag, index) => (
              <Badge key={`${tag}-${index}`} variant="outline" className="border-white/20 bg-transparent text-[10px] text-white/60">
                #{tag}
              </Badge>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-white/20 text-white hover:bg-white/10"
            onClick={(event) => {
              event.stopPropagation();
              void onDownload(image);
            }}
          >
            <Download className="mr-2 h-4 w-4" /> Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-red-500/20 text-red-400 hover:bg-red-500/10"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(image.id);
            }}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

export interface GalleryImageSourceResult {
  src: string;
  isProcessing: boolean;
  failed: boolean;
}

export function useGalleryImageSource(image: GeneratedImage): GalleryImageSourceResult {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversionFailed, setConversionFailed] = useState(false);

  const cacheKey = useMemo(() => {
    if (image.storageType === 'cache' && image.storageKey) {
      return image.storageKey;
    }
    return undefined;
  }, [image.storageType, image.storageKey]);

  const inlineDataUrl = useMemo(() => {
    if (!cacheKey && typeof image.imageUrl === 'string' && image.imageUrl.startsWith('data:')) {
      return image.imageUrl;
    }
    return undefined;
  }, [cacheKey, image.imageUrl]);

  const needsObjectUrl = useMemo(() => {
    if (!inlineDataUrl) {
      return false;
    }

    const estimatedBytes =
      typeof image.byteSize === 'number' ? image.byteSize : parseDataUrl(inlineDataUrl)?.byteSize ?? 0;

    if (estimatedBytes >= OBJECT_URL_THRESHOLD_BYTES) {
      return true;
    }

    return inlineDataUrl.length >= LARGE_DATA_URL_LENGTH;
  }, [inlineDataUrl, image.byteSize]);

  useEffect(() => {
    let cancelled = false;
    let localUrl: string | null = null;

    const convertToObjectUrl = async () => {
      if (!needsObjectUrl || !inlineDataUrl) {
        setObjectUrl(null);
        setIsProcessing(false);
        setConversionFailed(false);
        return;
      }

      try {
        setIsProcessing(true);
        setConversionFailed(false);
        console.log('Converting large image to object URL', {
          imageId: image.id,
          byteSize: image.byteSize,
          urlLength: inlineDataUrl?.length,
        });
        const url = await convertDataUrlToObjectUrl(inlineDataUrl);
        if (cancelled) {
          return;
        }
        localUrl = url;
        setObjectUrl(localUrl);
        console.log('Object URL created successfully', {
          imageId: image.id,
          objectUrl: url?.substring(0, 50),
        });
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to convert data URL to object URL', {
            imageId: image.id,
            error,
            willFallbackToDataUrl: true,
          });
          setObjectUrl(null);
          setConversionFailed(true);
        }
      } finally {
        if (!cancelled) {
          setIsProcessing(false);
        }
      }
    };

    const loadFromCache = async () => {
      if (!cacheKey) {
        setConversionFailed(false);
        setIsProcessing(false);
        return;
      }

      try {
        setIsProcessing(true);
        setConversionFailed(false);
        const blob = await loadImageBlobFromCache(cacheKey);
        if (!blob) {
          throw new Error('Cache miss');
        }
        const url = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        localUrl = url;
        setObjectUrl(url);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load image from cache', {
            imageId: image.id,
            cacheKey,
            error,
          });
          setObjectUrl(null);
          setConversionFailed(true);
        }
      } finally {
        if (!cancelled) {
          setIsProcessing(false);
        }
      }
    };

    if (cacheKey) {
      void loadFromCache();
    } else if (needsObjectUrl && inlineDataUrl) {
      void convertToObjectUrl();
    } else {
      setObjectUrl(null);
      setIsProcessing(false);
      setConversionFailed(false);
    }

    return () => {
      cancelled = true;
      if (localUrl) {
        console.log('Revoking object URL', {
          imageId: image.id,
        });
        URL.revokeObjectURL(localUrl);
      }
    };
  }, [cacheKey, inlineDataUrl, needsObjectUrl, image.id]);

  const resolvedSrc = (() => {
    if (cacheKey) {
      return objectUrl ?? '';
    }

    if (inlineDataUrl) {
      if (needsObjectUrl) {
        return objectUrl ?? (conversionFailed ? inlineDataUrl : '');
      }
      return inlineDataUrl;
    }

    return typeof image.imageUrl === 'string' ? image.imageUrl : objectUrl ?? '';
  })();

  const hasRenderedSource = Boolean(resolvedSrc);
  const showProcessing = ((cacheKey && !objectUrl) || (inlineDataUrl && needsObjectUrl && !objectUrl)) && !conversionFailed && isProcessing;
  const finalSrc = hasRenderedSource ? resolvedSrc : '';
  const finalFailed = !hasRenderedSource && conversionFailed;

  return {
    src: finalSrc,
    isProcessing: showProcessing,
    failed: finalFailed,
  };
}

async function handleDownloadImage(image: GeneratedImage) {
  if (image.storageType === 'cache' && image.storageKey) {
    if (typeof document === 'undefined') {
      return;
    }

    try {
      const blob = await loadImageBlobFromCache(image.storageKey);
      if (!blob) {
        console.warn('handleDownloadImage: cache miss for image download', { imageId: image.id });
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const extension = (image.mimeType || blob.type || 'image/png').split('/')[1] || 'png';
      link.href = objectUrl;
      link.download = `${image.id}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      return;
    } catch (downloadError) {
      console.error('handleDownloadImage: failed to download cached image', { imageId: image.id, downloadError });
    }
  }

  const globalObj = globalThis as unknown as { open?: (url?: string, target?: string) => void };
  if (typeof globalObj.open === 'function' && image.imageUrl) {
    globalObj.open(image.imageUrl, '_blank');
  }
}
