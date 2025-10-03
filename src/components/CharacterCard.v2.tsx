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
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useChat } from '@/hooks/useChat';
import { useFileStorage } from '@/hooks/useFileStorage';
import { useStorySystem } from '@/hooks/useStorySystem';
import { Character, StoryEntry } from '@/types';
import { toast } from 'sonner';

interface GeneratedImage {
  id: string;
  prompt: string;
  imageUrl: string;
  createdAt: string | Date;
  characterId?: string;
  tags?: string[];
}

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
    case 'acquaintance':
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
    const storedPrompts = character.prompts ?? {
      system: '',
      description: '',
      personality: '',
      background: '',
      appearance: '',
      responseStyle: '',
      originScenario: '',
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
        system: '',
        description: '',
        personality: '',
        background: '',
        appearance: '',
        responseStyle: '',
        originScenario: '',
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

    const prompts = character.prompts ?? {
      system: '',
      description: '',
      personality: '',
      background: '',
      appearance: '',
      responseStyle: '',
      originScenario: '',
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

  const handleCreateImage = useCallback(async () => {
    if (!newImagePrompt.trim()) {
      toast.error('Please enter a prompt for the image');
      return;
    }

    setIsCreatingImage(true);
    try {
      const characterContext = character.imageDescription || 
        `${character.personalities?.[0] || 'person'} with ${character.features?.slice(0, 3).join(', ') || 'distinctive'} features`.trim();
      
      const enhancedPrompt = `${newImagePrompt.trim()}. Character appearance: ${characterContext}`;
      
      const { AIService } = await import('@/lib/aiService');
      const imageUrl = await AIService.generateImage(enhancedPrompt);
      
      if (imageUrl) {
        const newImage: GeneratedImage = {
          id: crypto.randomUUID(),
          prompt: newImagePrompt.trim(),
          imageUrl,
          createdAt: new Date(),
          characterId: character.id,
          tags: ['character', 'generated', character.role || 'person'].filter(Boolean)
        };

        setStoredImages([newImage, ...storedImages]);
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
  }, [newImagePrompt, character, storedImages, setStoredImages]);

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
    return entries.slice().sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 8);
  }, [progression.storyChronicle]);

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

  const heroPanel = (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-transparent to-transparent p-6">
        <div className="flex flex-col items-start gap-6">
          <Avatar className="h-28 w-28 border-4 border-white/20 shadow-xl">
            <AvatarImage src={character.avatar} alt={character.name} />
            <AvatarFallback className="bg-primary/30 text-xl font-semibold">
              {character.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold text-white">{character.name}</h2>
              {getRarityIcon(character.rarity)}
              <Badge variant="outline" className="border-white/20 bg-white/5 text-xs capitalize text-white/80">
                {relationshipStatus.replace(/_/g, ' ')}
              </Badge>
            </div>
            <p className="text-sm text-white/70">{character.description}</p>
            <div className="flex flex-wrap gap-2 text-xs text-white/50">
              {character.role && <Badge variant="secondary">{character.role}</Badge>}
              {character.job && <Badge variant="outline">{character.job}</Badge>}
              <Badge variant="outline">Level {stats.level}</Badge>
              <Badge variant="outline">{totalMessages} messages</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {quickStats.map(({ key, label, value, tone, bar, icon: Icon }) => (
          <div key={`hero-${key}`} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between text-sm text-white/70">
              <div className="flex items-center gap-2">
                <Icon className={`${tone} h-4 w-4`} />
                <span>{label}</span>
              </div>
              <span className="font-medium text-white">{value}%</span>
            </div>
            <Progress value={value} className={`mt-2 h-2 bg-white/10 [&>div]:${bar}`} />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-white/40">
          <span>Last Interaction</span>
          <span>{formatDate(lastInteraction)}</span>
        </div>
        <div className="mt-2 text-base font-semibold text-white">
          {totalMessages} messages · {characterSessions.length} sessions
        </div>
      </div>

      {primaryActions}

      {source && source !== 'roster' && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/50">
          Viewing from <span className="font-medium text-white/80">{source}</span>
        </div>
      )}
    </div>
  );

  const overviewTab = (
    <TabsContent value="overview" className="h-full">
      <ScrollArea className="h-full">
        <div className="space-y-6 p-6">
          <Card className="border-none bg-white/5 text-white">
            <div className="space-y-6 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold">Profile</h3>
                  <Badge
                    variant="outline"
                    className={`${relationshipStatusColor(relationshipStatus)} border-white/15 bg-transparent text-[10px] capitalize`}
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
                    {isEditMode ? 'View Mode' : 'Edit Profile'}
                  </Button>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-[220px_1fr]">
                <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 text-white/90">
                  <Avatar className="h-32 w-32 rounded-3xl border border-white/10">
                    <AvatarImage src={profileDraft.avatar} alt={profileDraft.name || character.name} />
                    <AvatarFallback className="bg-white/10 text-2xl font-semibold">
                      {(profileDraft.name || character.name || '?').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isEditMode && (
                    <div className="w-full space-y-2 text-sm">
                      <Label htmlFor={`${character.id}-avatar`} className="text-xs uppercase tracking-[0.25em] text-white/50">
                        Profile Picture URL
                      </Label>
                      <Input
                        id={`${character.id}-avatar`}
                        value={profileDraft.avatar}
                        onChange={(event) => handleDraftChange('avatar', event.target.value)}
                        placeholder="https://..."
                        className="h-10 rounded-xl border-white/15 bg-white/5"
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  {isEditMode ? (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label htmlFor={`${character.id}-name`} className="text-xs uppercase tracking-[0.25em] text-white/50">
                            Name
                          </Label>
                          <Input
                            id={`${character.id}-name`}
                            value={profileDraft.name}
                            onChange={(event) => handleDraftChange('name', event.target.value)}
                            className="mt-1 h-10 rounded-xl border-white/15 bg-white/5"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`${character.id}-age`} className="text-xs uppercase tracking-[0.25em] text-white/50">
                            Age
                          </Label>
                          <Input
                            id={`${character.id}-age`}
                            type="number"
                            min={0}
                            value={profileDraft.age}
                            onChange={(event) => handleDraftChange('age', event.target.value)}
                            className="mt-1 h-10 rounded-xl border-white/15 bg-white/5"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor={`${character.id}-description`} className="text-xs uppercase tracking-[0.25em] text-white/50">
                          Description
                        </Label>
                        <Textarea
                          id={`${character.id}-description`}
                          value={profileDraft.description}
                          onChange={(event) => handleDraftChange('description', event.target.value)}
                          className="mt-1 h-28 rounded-2xl border-white/15 bg-white/5 text-sm"
                          placeholder="Who is she? What draws the player in?"
                        />
                      </div>

                      <div>
                        <Label htmlFor={`${character.id}-backstory`} className="text-xs uppercase tracking-[0.25em] text-white/50">
                          Backstory
                        </Label>
                        <Textarea
                          id={`${character.id}-backstory`}
                          value={profileDraft.backstory}
                          onChange={(event) => handleDraftChange('backstory', event.target.value)}
                          className="mt-1 h-32 rounded-2xl border-white/15 bg-white/5 text-sm"
                          placeholder="Add context, history, and hooks for the AI."
                        />
                      </div>

                      <div>
                        <Label htmlFor={`${character.id}-keywords`} className="text-xs uppercase tracking-[0.25em] text-white/50">
                          Keywords
                        </Label>
                        <Textarea
                          id={`${character.id}-keywords`}
                          value={profileDraft.keywords}
                          onChange={(event) => handleDraftChange('keywords', event.target.value)}
                          className="mt-1 h-24 rounded-2xl border-white/15 bg-white/5 text-sm"
                          placeholder="comma or newline separated"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* View Mode - Display Only */}
                      <div className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <div className="text-xs uppercase tracking-[0.25em] text-white/50 mb-2">Name</div>
                            <div className="text-lg font-semibold">{character.name}</div>
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-[0.25em] text-white/50 mb-2">Age</div>
                            <div className="text-lg font-semibold">{character.age || 'Not set'}</div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-xs uppercase tracking-[0.25em] text-white/50 mb-2">Description</div>
                          <div className="text-sm text-white/80 leading-relaxed">{character.description || 'No description available'}</div>
                        </div>
                        
                        {character.prompts?.background && (
                          <div>
                            <div className="text-xs uppercase tracking-[0.25em] text-white/50 mb-2">Backstory</div>
                            <div className="text-sm text-white/80 leading-relaxed">{character.prompts.background}</div>
                          </div>
                        )}
                        
                        {character.features && character.features.length > 0 && (
                          <div>
                            <div className="text-xs uppercase tracking-[0.25em] text-white/50 mb-2">Keywords</div>
                            <div className="flex flex-wrap gap-2">
                              {character.features.map((feature, idx) => (
                                <Badge key={idx} variant="outline" className="border-white/20 bg-white/5 text-xs">
                                  {feature}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {isEditMode && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                  <div className="text-xs uppercase tracking-[0.25em] text-white/40">
                    {isProfileDirty ? 'Unsaved changes' : 'All changes saved'}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetProfile}
                      disabled={!isProfileDirty || isSavingProfile}
                      className="rounded-full border-white/20 text-white/70 hover:text-white"
                    >
                      Reset
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveProfile}
                      disabled={!isProfileDirty || isSavingProfile}
                      className="rounded-full bg-[#ff1372] px-5 text-white hover:bg-[#ff1372]/85"
                    >
                      {isSavingProfile ? 'Saving…' : 'Save Profile'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </ScrollArea>
    </TabsContent>
  );

  const statsTab = (
    <TabsContent value="stats" className="h-full">
      <ScrollArea className="h-full">
        <div className="space-y-6 p-6">
          <Card className="border-none bg-white/5 text-white">
            <div className="space-y-4 p-6">
              <h3 className="text-lg font-semibold">Core Stats</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {Object.entries(stats).map(([label, value]) => (
                  <div key={label}>
                    <div className="flex items-center justify-between text-sm text-white/70">
                      <span className="capitalize">{label}</span>
                      <span className="text-white/80">
                        {typeof value === 'number' ? `${Math.round(value)}` : value}
                        {label === 'experience' || label === 'level' ? '' : '%'}
                      </span>
                    </div>
                    <Progress value={typeof value === 'number' ? value : 0} className="mt-1.5 h-2 bg-white/10" />
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="border-none bg-white/5 text-white">
            <div className="space-y-4 p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <TrendUp className="h-5 w-5 text-emerald-300" /> Sexual Skills
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {Object.entries(skills).map(([label, value]) => (
                  <div key={label}>
                    <div className="flex items-center justify-between text-sm text-white/70">
                      <span className="capitalize">{label}</span>
                      <span className="text-white/80">{value}%</span>
                    </div>
                    <Progress value={value} className="mt-1.5 h-2 bg-white/10" />
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="border-none bg-white/5 text-white">
            <div className="space-y-4 p-6">
              <h3 className="text-lg font-semibold">Compatibility</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {compatibilityStats.map(({ label, value }) => (
                  <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-4 text-center text-white/80">
                    <div className="text-sm uppercase tracking-wide text-white/50">{label}</div>
                    <div className="mt-2 text-2xl font-semibold">{value}%</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </ScrollArea>
    </TabsContent>
  );

  const physicalTab = (
    <TabsContent value="physical" className="h-full">
      <ScrollArea className="h-full">
        <div className="space-y-6 p-6">
          <Card className="border-none bg-white/5 text-white">
            <div className="space-y-4 p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <User className="h-5 w-5 text-pink-300" /> Physical Features
              </h3>
              
              {/* Physical Attributes */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h4 className="text-sm font-medium text-white/80 mb-2">Appearance</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/60">Height:</span>
                      <span>5'6" (168cm)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Build:</span>
                      <span>Athletic</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Hair:</span>
                      <span>Long, Dark Brown</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Eyes:</span>
                      <span>Hazel Green</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-white/80 mb-2">Physical Stats</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/60">Age:</span>
                      <span>23</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Measurements:</span>
                      <span>34-26-36</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Cup Size:</span>
                      <span>C</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Physical Ratings */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-white/80 mb-3">Physical Ratings</h4>
                <div className="space-y-3">
                  {[
                    { category: 'Face', score: 8.5, color: 'bg-pink-500' },
                    { category: 'Body', score: 9.2, color: 'bg-purple-500' },
                    { category: 'Curves', score: 8.8, color: 'bg-red-500' },
                    { category: 'Skin', score: 9.0, color: 'bg-orange-500' },
                    { category: 'Overall', score: 8.9, color: 'bg-gradient-to-r from-pink-500 to-purple-500' }
                  ].map(({ category, score, color }) => (
                    <div key={category}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-white/70">{category}</span>
                        <span className="font-semibold text-white">{score}/10</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${color} transition-all duration-300`}
                          style={{ width: `${score * 10}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Physical Description */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-white/80 mb-2">Description</h4>
                <p className="text-sm text-white/70 leading-relaxed">
                  {character.name} has a naturally stunning appearance with perfect proportions. 
                  Her athletic build showcases toned curves and graceful movement. Her expressive eyes 
                  and warm smile create an irresistible combination that draws attention wherever she goes.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </ScrollArea>
    </TabsContent>
  );

  const valueTab = (
    <TabsContent value="value" className="h-full">
      <ScrollArea className="h-full">
        <div className="space-y-6 p-6">
          <Card className="border-none bg-white/5 text-white">
            <div className="space-y-4 p-6">
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
          </Card>
        </div>
      </ScrollArea>
    </TabsContent>
  );

  const feedTab = (
    <TabsContent value="feed" className="h-full">
      <ScrollArea className="h-full">
        <div className="space-y-4 p-6">
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
                <Card
                  key={image.id}
                  className="group overflow-hidden border border-white/10 bg-white/5 text-white transition hover:border-primary/40"
                >
                  <button
                    type="button"
                    className="block w-full overflow-hidden"
                    onClick={() => setSelectedImage(image)}
                  >
                    <img
                      src={image.imageUrl}
                      alt={image.prompt}
                      className="h-48 w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </button>
                  <div className="space-y-2 p-4 text-sm text-white/70">
                    <div className="line-clamp-2 text-white/80">{image.prompt}</div>
                    <div className="text-xs uppercase tracking-wide text-white/40">
                      {formatDate(image.createdAt)}
                    </div>
                    {image.tags && image.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {image.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="border-white/20 bg-transparent text-[10px] text-white/60">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-white/20 text-white hover:bg-white/10"
                      onClick={() => void handleDownloadImage(image)}
                    >
                      <Download className="mr-2 h-4 w-4" /> Download
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </TabsContent>
  );

  const memoriesTab = (
    <TabsContent value="memories" className="h-full">
      <ScrollArea className="h-full">
        <div className="space-y-6 p-6">
          <Card className="border-none bg-white/5 text-white">
            <div className="space-y-4 p-6">
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
          </Card>

          <Card className="border-none bg-white/5 text-white/70">
            <div className="space-y-4 p-6">
              <h3 className="text-lg font-semibold text-white">Emotional Journey</h3>
              <pre className="whitespace-pre-wrap text-sm leading-relaxed">{emotionalJourney}</pre>
            </div>
          </Card>
        </div>
      </ScrollArea>
    </TabsContent>
  );

  const promptsTab = (
    <TabsContent value="prompts" className="h-full">
      <ScrollArea className="h-full">
        <div className="space-y-6 p-6">
          <Card className="border-none bg-white/5 text-white">
            <div className="space-y-3 p-6">
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
          </Card>
        </div>
      </ScrollArea>
    </TabsContent>
  );

  const dialogContent = (
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
  <DialogContent className="w-full max-w-[1500px] overflow-hidden border border-white/10 bg-[#05050c] p-0 text-white sm:max-w-none lg:max-w-[1500px]">
        <DialogHeader className="sr-only">
          <DialogTitle>{character.name}</DialogTitle>
        </DialogHeader>
        <div className="grid h-full min-h-[520px] grid-cols-1 lg:grid-cols-[320px_1fr]">
          <div className="border-b border-white/10 bg-[#0a0a17] p-6 lg:border-b-0 lg:border-r">
            {heroPanel}
          </div>
          <div className="flex flex-col">
            <Tabs defaultValue="overview" className="flex h-full flex-col">
              <TabsList className="flex w-full flex-wrap gap-2 overflow-x-auto border-b border-white/10 bg-[#080814] p-4 pb-2">
                <TabsTrigger value="overview" className="flex min-w-[120px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs text-white/70 data-[state=active]:bg-white/10 data-[state=active]:text-white">
                  <Star className="h-4 w-4" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="stats" className="flex min-w-[120px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs text-white/70 data-[state=active]:bg-white/10 data-[state=active]:text-white">
                  <TrendUp className="h-4 w-4" />
                  Stats
                </TabsTrigger>
                <TabsTrigger value="physical" className="flex min-w-[120px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs text-white/70 data-[state=active]:bg-white/10 data-[state=active]:text-white">
                  <User className="h-4 w-4" />
                  Physical
                </TabsTrigger>
                <TabsTrigger value="value" className="flex min-w-[120px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs text-white/70 data-[state=active]:bg-white/10 data-[state=active]:text-white">
                  <CurrencyDollar className="h-4 w-4" />
                  Value
                </TabsTrigger>
                <TabsTrigger value="feed" className="flex min-w-[120px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs text-white/70 data-[state=active]:bg-white/10 data-[state=active]:text-white">
                  <ImageIcon className="h-4 w-4" />
                  Feed
                </TabsTrigger>
                <TabsTrigger value="memories" className="flex min-w-[120px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs text-white/70 data-[state=active]:bg-white/10 data-[state=active]:text-white">
                  <BookOpen className="h-4 w-4" />
                  Memories
                </TabsTrigger>
                <TabsTrigger value="prompts" className="flex min-w-[120px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs text-white/70 data-[state=active]:bg-white/10 data-[state=active]:text-white">
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const selectedImageDialog = selectedImage ? (
    <Dialog open onOpenChange={() => setSelectedImage(null)}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Image Detail</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <img
            src={selectedImage.imageUrl}
            alt={selectedImage.prompt}
            className="max-h-[480px] w-full rounded-xl object-contain"
          />
          <div className="space-y-3 text-sm">
            <div>
              <h4 className="text-sm font-semibold">Prompt</h4>
              <p className="mt-1 text-muted-foreground">{selectedImage.prompt}</p>
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              {formatDate(selectedImage.createdAt)}
            </div>
            {selectedImage.tags?.length ? (
              <div className="flex flex-wrap gap-1">
                {selectedImage.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px] uppercase">
                    #{tag}
                  </Badge>
                ))}
              </div>
            ) : null}
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => void handleDownloadImage(selectedImage)}>
                <Download className="mr-2 h-4 w-4" /> Download
              </Button>
              <Button variant="outline" onClick={() => setSelectedImage(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  ) : null;

  if (compact) {
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
            <AvatarImage src={character.avatar} alt={character.name} />
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

function handleDownloadImage(image: GeneratedImage) {
  const globalObj = globalThis as unknown as { open?: (url?: string, target?: string) => void };
  if (typeof globalObj.open !== 'function') {
    return;
  }

  globalObj.open(image.imageUrl, '_blank');
}
