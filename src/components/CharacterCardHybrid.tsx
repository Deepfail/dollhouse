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
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  BookOpen,
  ChartLineUp,
  ChatsCircle,
  Crown,
  Download,
  Drop,
  Gift,
  Heart,
  House,
  Image as ImageIcon,
  Lightning,
  ChatCircle as MessageCircle,
  Pencil,
  ShieldCheck,
  Smiley as Smile,
  Sparkle,
  Star,
  Trash,
  TrendUp,
  Trophy,
  Users,
  CurrencyDollar,
  Code,
  Brain,
  IdentificationBadge,
} from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useChat } from '@/hooks/useChat';
import { useFileStorage } from '@/hooks/useFileStorage';
import { useRelationshipDynamics } from '@/hooks/useRelationshipDynamics';
import { useStorySystem } from '@/hooks/useStorySystem';
import { AIService } from '@/lib/aiService';
import { logger } from '@/lib/logger';
import type {
  Character,
  RelationshipMilestone,
  SexualMilestone,
  StoryEntry,
} from '@/types';

interface GeneratedImage {
  id: string;
  prompt: string;
  imageUrl: string;
  createdAt: string | Date;
  characterId?: string;
  tags?: string[];
  caption?: string;
  liked?: boolean;
}

interface DMMessage {
  id: number;
  content: string;
  timestamp: string;
  characterId: string | null;
}

export interface CharacterCardProps {
  character: Character;
  onStartChat: (characterId: string) => void;
  onGift?: (characterId: string) => void;
  onMove?: (characterId: string) => void;
  onEdit?: (character: Character) => void;
  onDelete?: (characterId: string) => void;
  compact?: boolean;
  source?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

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

const toDM = (content: string, characterId: string | null): DMMessage => ({
  id: Date.now() + Math.floor(Math.random() * 1000),
  content,
  timestamp: new Date().toISOString(),
  characterId,
});

const createImageCaption = () => {
  const motivations = [
    'living for this energy today',
    'caught a vibe and had to share',
    'feeling dangerously cute atm',
    'this lighting hits different',
    'just another night in the house',
  ];
  const emoji = ['✨', '💕', '💫', '🌙', '🔥'];
  return `${motivations[Math.floor(Math.random() * motivations.length)]} ${
    emoji[Math.floor(Math.random() * emoji.length)]
  }`;
};

export function CharacterCard({
  character,
  onStartChat,
  onGift,
  onMove,
  onEdit,
  onDelete,
  compact = false,
  source = 'roster',
  open,
  onOpenChange,
  hideTrigger = false,
}: CharacterCardProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [dmMessages, setDmMessages] = useState<DMMessage[]>([]);
  const [dmInput, setDmInput] = useState('');
  const [isSendingDm, setIsSendingDm] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newImagePrompt, setNewImagePrompt] = useState('');
  const [isCreatingImage, setIsCreatingImage] = useState(false);
  const [isSuggestingPrompt, setIsSuggestingPrompt] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);

  const isDialogOpen = open ?? internalOpen;
  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setShowCreatePost(false);
      setSelectedImage(null);
      setNewImagePrompt('');
    }
    if (open === undefined) {
      setInternalOpen(value);
    }
    onOpenChange?.(value);
  };

  const { sessions } = useChat();
  const { updateRelationshipStats } = useRelationshipDynamics();
  const { getRecentStoryContext, analyzeEmotionalJourney } = useStorySystem();
  const { data: storedImages = [], setData: setStoredImages } = useFileStorage<GeneratedImage[]>(
    'generated-images.json',
    [],
  );

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
      stamina: clamp(base.stamina, 50),
      pain: clamp(base.pain, 20),
      experience: Math.max(0, base.experience ?? 0),
      level: Math.max(1, base.level ?? 1),
    };
  }, [character.stats]);

  const skills = useMemo(() => {
    const base = character.skills ?? ({} as Character['skills']);
    return {
      hands: clamp(base.hands, 0),
      mouth: clamp(base.mouth, 0),
      missionary: clamp(base.missionary, 0),
      doggy: clamp(base.doggy, 0),
      cowgirl: clamp(base.cowgirl, 0),
    };
  }, [character.skills]);

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
      sexualCompatibility: base.sexualCompatibility ?? {
        overall: 0,
        kinkAlignment: 0,
        stylePreference: 0,
      },
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

  const milestoneSummary = useMemo(() => {
    const relationshipMilestones = (progression.relationshipMilestones as RelationshipMilestone[]) ?? [];
    const sexualMilestones = (progression.sexualMilestones as SexualMilestone[]) ?? [];
    return {
      relationship: {
        achieved: relationshipMilestones.filter((m) => m.achieved).length,
        total: relationshipMilestones.length,
      },
      sexual: {
        achieved: sexualMilestones.filter((m) => m.achieved).length,
        total: sexualMilestones.length,
      },
    };
  }, [progression.relationshipMilestones, progression.sexualMilestones]);

  const storySummary = useMemo(() => {
    const recent = getRecentStoryContext(character, 5);
    return Array.isArray(recent) ? recent : [];
  }, [character, getRecentStoryContext]);

  const emotionalJourney = useMemo(() => {
    const journey = analyzeEmotionalJourney(character) ?? {};
    const highlights = Array.isArray((journey as { highlights?: unknown }).highlights)
      ? (journey as { highlights: string[] }).highlights
      : [];
    return {
      summary: (journey as { summary?: string }).summary ?? 'No read on her mood yet.',
      highlights,
    };
  }, [analyzeEmotionalJourney, character]);

  const initialDmHistory = useMemo(() => {
    const entries: DMMessage[] = [];
    for (const session of characterSessions) {
      const messages = session.messages ?? [];
      for (const message of messages.slice(-10)) {
        entries.push({
          id: Date.now() + Math.floor(Math.random() * 5000),
          content: message.content,
          timestamp: message.timestamp?.toISOString?.() ?? new Date().toISOString(),
          characterId: message.characterId ?? null,
        });
      }
    }
    return entries.slice(-30);
  }, [characterSessions]);

  useEffect(() => {
    setDmMessages(initialDmHistory);
  }, [initialDmHistory]);

  const galleryHeader = (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1b1b29] via-[#12121b] to-[#09090f] p-6 text-white shadow-[0_30px_80px_-60px_rgba(255,19,114,0.75)]">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 rounded-2xl border border-white/10">
            <AvatarImage src={character.avatar} alt={character.name} />
            <AvatarFallback className="bg-primary/20 text-primary-foreground">
              {character.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/40">
              <IdentificationBadge weight="bold" className="h-3 w-3" />
              <span>{character.role || 'Companion'}</span>
              {source && <span>• {source}</span>}
            </div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold text-white">{character.name}</h2>
              {getRarityIcon(character.rarity)}
              <Badge variant="outline" className={`rounded-full ${relationshipStatusColor(relationshipStatus)}`}>
                {relationshipStatus.replace(/_/g, ' ')}
              </Badge>
            </div>
            <p className="text-sm text-white/70">{character.description || character.bio}</p>
            <div className="flex flex-wrap gap-3 text-xs text-white/50">
              <span>Msgs: {totalMessages}</span>
              <span>Last contact: {formatDate(lastInteraction)}</span>
              <span>Value tier: {character.rarity?.toUpperCase() ?? 'COMMON'}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Love', value: stats.love, tone: 'text-rose-300', bar: 'bg-rose-400/60', icon: Heart },
            { label: 'Happiness', value: stats.happiness, tone: 'text-amber-200', bar: 'bg-amber-300/60', icon: Smile },
            { label: 'Desire', value: stats.wet, tone: 'text-fuchsia-200', bar: 'bg-fuchsia-400/60', icon: Drop },
          ].map(({ label, value, tone, bar, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/5/50 p-3">
              <div className="flex items-center justify-between text-sm text-white/70">
                <span className="flex items-center gap-2">
                  <Icon className={`${tone} h-4 w-4`} />
                  {label}
                </span>
                <span className="font-semibold text-white">{value}%</span>
              </div>
              <Progress value={value} className={`mt-2 h-1.5 bg-white/10 [&>div]:${bar}`} />
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-white/40">
          <span className="flex items-center gap-1">
            <Brain className="h-3 w-3" />
            {character.personalities?.slice(0, 3).join(' • ') || 'No traits set'}
          </span>
          {character.progression?.fantasies?.length ? (
            <span className="flex items-center gap-1">
              <Lightning className="h-3 w-3" />
              {character.progression.fantasies.slice(0, 2).join(' • ')}
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3">
        <Card className="rounded-3xl border border-white/10 bg-[#101018]/95 p-4 text-white">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-white/40">
            <span>Milestones</span>
            <ChartLineUp className="h-3.5 w-3.5" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-white/50">Relationship</div>
              <div className="mt-1 text-2xl font-semibold text-white">
                {milestoneSummary.relationship.achieved}/{milestoneSummary.relationship.total || 1}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-white/50">Intimacy</div>
              <div className="mt-1 text-2xl font-semibold text-white">
                {milestoneSummary.sexual.achieved}/{milestoneSummary.sexual.total || 1}
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">
            <p>{emotionalJourney.summary}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-white/50">
              {emotionalJourney.highlights.slice(0, 3).map((item) => (
                <Badge key={item} variant="outline" className="rounded-full border-white/20 text-[10px]">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border border-white/10 bg-[#101018]/95 p-4 text-white">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-white/40">
            <span>Gallery</span>
            <ImageIcon className="h-3.5 w-3.5" />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {galleryImages.slice(0, 6).map((image) => (
              <div
                key={image.id}
                className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5"
              >
                <img src={image.imageUrl} alt={image.prompt} className="h-20 w-full object-cover" />
              </div>
            ))}
            {!galleryImages.length && (
              <div className="col-span-3 rounded-xl border border-dashed border-white/10 bg-white/5 p-4 text-center text-xs text-white/50">
                No generated shots yet.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );

  const handleDownloadImage = useCallback(async (image: GeneratedImage) => {
    try {
      const response = await fetch(image.imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${character.name}-gallery.png`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('Failed to download image', error);
      toast.error('Download failed');
    }
  }, [character.name]);

  const handleCreateImage = useCallback(async () => {
    const trimmedPrompt = newImagePrompt.trim();
    if (!trimmedPrompt || isCreatingImage) return;

    setIsCreatingImage(true);
    try {
      const appearanceTraits = [
        character.imageDescription,
        character.appearance,
        character.personalities?.slice(0, 2)?.join(', '),
        character.features?.slice(0, 3)?.join(', '),
      ]
        .filter(Boolean)
        .join(' • ');

      const enhancedPrompt = appearanceTraits
        ? `${trimmedPrompt}. Character appearance: ${appearanceTraits}`
        : trimmedPrompt;

      const imageUrl = await AIService.generateImage(enhancedPrompt);
      if (!imageUrl) {
        toast.error('Image generator returned no result');
        return;
      }

      const newImage: GeneratedImage = {
        id:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `img-${Date.now()}`,
        prompt: trimmedPrompt,
        imageUrl,
        createdAt: new Date().toISOString(),
        characterId: character.id,
        tags: [
          character.role ?? 'companion',
          ...(character.personalities?.slice(0, 2) ?? []),
          'gallery',
        ].filter(Boolean),
        caption: createImageCaption(),
        liked: false,
      };

      await setStoredImages((previous) => [newImage, ...previous]);
      toast.success('Image added to her feed');
      setNewImagePrompt('');
      setShowCreatePost(false);
    } catch (error) {
      logger.error('Image creation failed', error);
      toast.error('Could not create an image right now');
    } finally {
      setIsCreatingImage(false);
    }
  }, [
    character.appearance,
    character.features,
    character.id,
    character.imageDescription,
    character.personalities,
    character.role,
    isCreatingImage,
    newImagePrompt,
    setStoredImages,
  ]);

  const handleToggleLike = useCallback(
    (imageId: string) => {
      void setStoredImages((previous) =>
        previous.map((image) =>
          image.id === imageId ? { ...image, liked: !image.liked } : image,
        ),
      );
    },
    [setStoredImages],
  );

  const handleSuggestImagePrompt = useCallback(async () => {
    if (isSuggestingPrompt) return;
    setIsSuggestingPrompt(true);
    try {
      const suggestionPrompt = [
        `Generate a concise AI image prompt (<150 words) for a glamour portrait of ${character.name}.`,
        'Focus on physical appearance, styling, lighting, and mood.',
        'Avoid age references and explicit content.',
        character.role ? `Role: ${character.role}.` : null,
        character.personalities?.length
          ? `Personality keywords: ${character.personalities.join(', ')}.`
          : null,
        character.features?.length
          ? `Physical features: ${character.features.join(', ')}.`
          : null,
        character.appearance ? `Appearance notes: ${character.appearance}.` : null,
        character.imageDescription
          ? `Existing image description: ${character.imageDescription}.`
          : null,
      ]
        .filter(Boolean)
        .join('\n');

      const promptDraft = await AIService.generateResponse(
        suggestionPrompt,
        undefined,
        undefined,
        {
          temperature: 0.8,
          max_tokens: 220,
        },
      );

      if (promptDraft?.trim()) {
        setNewImagePrompt(promptDraft.trim());
        setShowCreatePost(true);
        toast.success('Draft prompt ready');
      } else {
        toast.error('No prompt was generated');
      }
    } catch (error) {
      logger.error('Prompt suggestion failed', error);
      toast.error('Could not draft a prompt');
    } finally {
      setIsSuggestingPrompt(false);
    }
  }, [
    character.appearance,
    character.features,
    character.imageDescription,
    character.name,
    character.personalities,
    character.role,
    isSuggestingPrompt,
  ]);

  const handleSendDm = useCallback(async () => {
    if (!dmInput.trim() || isSendingDm) return;
    const userMessage = toDM(dmInput.trim(), null);
    setDmMessages((prev) => [...prev, userMessage]);
    setDmInput('');
    setIsSendingDm(true);

    try {
      const conversation = [...dmMessages, userMessage].slice(-10);
      const prompt = [
        `You are ${character.name}. Stay in character, respond intimately but naturally.`,
        'Conversation history:',
        ...conversation.map((message) =>
          `${message.characterId ? character.name : 'User'}: ${message.content}`,
        ),
        `${character.name}:`,
      ].join('\n');

      const reply = await AIService.generateResponse(prompt);
      if (reply) {
        const response = toDM(reply.trim(), character.id);
        setDmMessages((prev) => [...prev, response]);
        updateRelationshipStats(character.id, { love: 1, happiness: 1, loyalty: 0.5 });
      }
    } catch (error) {
      logger.error('DM send failed', error);
      toast.error('Could not reach her right now');
    } finally {
      setIsSendingDm(false);
    }
  }, [character.id, character.name, dmInput, dmMessages, isSendingDm, updateRelationshipStats]);

  const renderOverview = (
    <TabsContent value="overview" className="grid min-h-0 grid-cols-1 gap-6 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="space-y-4">
        <Card className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-white/40">
            <span>Snapshot</span>
            <Users className="h-3.5 w-3.5" />
          </div>
          <div className="mt-3 space-y-3 text-sm text-white/70">
            <p>{character.longDescription || character.bio || 'No full bio yet.'}</p>
            <div className="grid gap-2 text-xs">
              <div>Primary Room: {character.preferredRoomType ?? 'Unset'}</div>
              <div>Schedule Slot: {character.schedule?.preferredTime ?? 'Flexible'}</div>
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-white/40">
            <span>Relationship Pulse</span>
            <Heart className="h-3.5 w-3.5" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-white/70">
            {[
              { label: 'Affection', value: clamp(progression.affection, 0) },
              { label: 'Trust', value: clamp(progression.trust, 0) },
              { label: 'Intimacy', value: clamp(progression.intimacy, 0) },
              { label: 'Dominance', value: clamp(progression.dominance, 50) },
              { label: 'Jealousy', value: clamp(progression.jealousy, 0) },
              { label: 'Possessiveness', value: clamp(progression.possessiveness, 0) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span>{label}</span>
                  <span className="font-medium text-white">{value}%</span>
                </div>
                <Progress value={value} className="mt-2 h-1.5 bg-white/10" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-white/40">
          <span>Recent Storyline</span>
          <BookOpen className="h-3.5 w-3.5" />
        </div>
        <ScrollArea className="mt-4 h-[320px] pr-3">
          <div className="space-y-3 text-sm text-white/70">
            {storySummary.length ? (
              storySummary.map((entry) => (
                <div key={`${entry.timestamp}-${entry.summary}`} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs uppercase tracking-[0.25em] text-white/40">
                    {new Date(entry.timestamp).toLocaleDateString()}
                  </div>
                  <p className="mt-2 text-white/80">{entry.summary}</p>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-white/50">
                No narrative events captured yet.
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>
    </TabsContent>
  );

  const renderStats = (
    <TabsContent value="stats" className="grid min-h-0 grid-cols-1 gap-4 md:grid-cols-2">
      <Card className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white">
        <div className="text-xs uppercase tracking-[0.25em] text-white/40">Core Metrics</div>
        <div className="mt-3 space-y-3 text-sm text-white/70">
          {Object.entries(stats).map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-white/40">
                <span>{label}</span>
                <span className="text-white">{typeof value === 'number' ? Math.round(value) : value}</span>
              </div>
              <Progress value={typeof value === 'number' ? value : 0} className="mt-2 h-1.5 bg-white/10" />
            </div>
          ))}
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white">
          <div className="text-xs uppercase tracking-[0.25em] text-white/40">Bedroom Skillset</div>
          <div className="mt-3 space-y-3">
            {Object.entries(skills).map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/70">
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-white/40">
                  <span>{label}</span>
                  <span className="text-white">{value}%</span>
                </div>
                <Progress value={value} className="mt-2 h-1.5 bg-white/10" />
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white">
          <div className="text-xs uppercase tracking-[0.25em] text-white/40">Compatibility</div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: 'Overall', value: clamp(progression.sexualCompatibility.overall, 0) },
              { label: 'Kinks', value: clamp(progression.sexualCompatibility.kinkAlignment, 0) },
              { label: 'Style', value: clamp(progression.sexualCompatibility.stylePreference, 0) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center text-xs">
                <div className="uppercase tracking-[0.25em] text-white/40">{label}</div>
                <div className="mt-2 text-2xl font-semibold text-white">{value}%</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </TabsContent>
  );

  const renderValue = (
    <TabsContent value="value" className="grid min-h-0 gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Card className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#112015] via-[#08110b] to-[#040807] p-6 text-white">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-emerald-300/70">
          <span>Portfolio Insight</span>
          <CurrencyDollar className="h-4 w-4" />
        </div>
        <div className="mt-5 grid gap-4 text-sm">
          <div className="rounded-3xl border border-emerald-500/30 bg-black/20 p-5 shadow-[0_25px_65px_-45px_rgba(16,185,129,0.7)]">
            <div className="text-xs uppercase tracking-[0.25em] text-emerald-200/80">Estimated Market Value</div>
            <div className="mt-2 text-4xl font-semibold text-white">$155,000</div>
            <div className="mt-3 flex items-center gap-2 text-xs text-emerald-200/80">
              <TrendUp className="h-3.5 w-3.5" />
              <span>+12.4% week over week</span>
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-500/20 bg-white/5 p-5">
            <h4 className="text-sm font-semibold text-white/80">Value Drivers</h4>
            <div className="mt-3 space-y-2 text-sm text-white/70">
              {[
                { factor: 'Physical Beauty', value: '$45,000', weight: '36%' },
                { factor: 'Personality', value: '$25,000', weight: '20%' },
                { factor: 'Rarity', value: '$20,000', weight: '16%' },
                { factor: 'Experience', value: '$15,000', weight: '12%' },
                { factor: 'Age Factor', value: '$12,000', weight: '10%' },
                { factor: 'Skills', value: '$8,000', weight: '6%' },
              ].map(({ factor, value, weight }) => (
                <div key={factor} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs">
                  <span className="text-white/70">{factor}</span>
                  <span className="text-white/90">{value}</span>
                  <span className="text-emerald-300/80">{weight}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-500/20 bg-white/5 p-5 text-xs text-white/70">
            <div className="uppercase tracking-[0.3em] text-emerald-200/60">Strategy</div>
            <p className="mt-3 text-sm text-white/80">
              High-value asset with consistent appreciation. Prioritize exclusive experiences, limited access, and curated events to maintain scarcity premium.
            </p>
            <ul className="mt-3 space-y-2 text-white/60">
              <li>• Introduce VIP experiences with premium pricing</li>
              <li>• Capture high-res gallery sets monthly</li>
              <li>• Schedule rotating luxury suites</li>
              <li>• Pair with strategic partners for brand lift</li>
            </ul>
          </div>
        </div>
      </Card>

      <Card className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-white/40">
          <span>Pricing Desk</span>
          <Code className="h-4 w-4" />
        </div>
        <div className="mt-4 space-y-3 text-sm text-white/70">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs uppercase tracking-[0.3em] text-white/40">Daily Rate</div>
            <div className="mt-2 text-2xl font-semibold text-white">$6,500</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs uppercase tracking-[0.3em] text-white/40">Exclusive Weekend</div>
            <div className="mt-2 text-2xl font-semibold text-white">$18,900</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs uppercase tracking-[0.3em] text-white/40">Long-Term Contract</div>
            <div className="mt-2 text-2xl font-semibold text-white">$72,000 / month</div>
          </div>
        </div>
      </Card>
    </TabsContent>
  );

  const renderFeed = (
    <>
      <TabsContent value="feed" className="grid min-h-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.25em] text-white/40">
            <div className="flex items-center gap-2">
              <span>Social Stream</span>
              <Lightning className="h-3.5 w-3.5" />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleSuggestImagePrompt()}
                disabled={isSuggestingPrompt}
                className="h-8 gap-2 rounded-full border border-white/10 bg-white/5 text-[11px] uppercase tracking-[0.2em] text-white/60 hover:bg-white/10 disabled:opacity-60"
              >
                <Sparkle className="h-3.5 w-3.5" />
                {isSuggestingPrompt ? 'Drafting…' : 'Suggest prompt'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreatePost((previous) => !previous)}
                className="h-8 gap-2 rounded-full border-white/20 bg-[#ff1372]/10 text-[11px] uppercase tracking-[0.2em] text-white hover:bg-[#ff1372]/20"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                {showCreatePost ? 'Hide form' : 'Share new look'}
              </Button>
            </div>
          </div>
          {showCreatePost ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-[#0b0b16]/90 p-4 text-sm text-white/70">
              <Textarea
                value={newImagePrompt}
                onChange={(event) => setNewImagePrompt(event.target.value)}
                placeholder={`Describe the vibe you're giving ${character.name} tonight...`}
                className="h-32 rounded-2xl border-white/10 bg-white/5 text-sm text-white placeholder:text-white/40"
              />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <span className="text-[11px] uppercase tracking-[0.2em] text-white/40">
                  Saved prompts live in generated-images.json
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowCreatePost(false);
                      setNewImagePrompt('');
                    }}
                    className="h-9 rounded-full border-white/20 px-4 text-xs uppercase tracking-[0.2em] text-white/70 hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void handleCreateImage()}
                    disabled={!newImagePrompt.trim() || isCreatingImage}
                    className="h-9 rounded-full bg-[#ff1372] px-5 text-xs font-semibold uppercase tracking-[0.2em] text-white hover:bg-[#ff1372]/90 disabled:opacity-60"
                  >
                    {isCreatingImage ? (
                      <span className="flex items-center gap-2">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-b-transparent" />
                        Rendering…
                      </span>
                    ) : (
                      'Create image'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          <ScrollArea className="mt-4 h-[360px] pr-3">
            <div className="space-y-4">
              {galleryImages.length ? (
                galleryImages.map((image) => (
                  <div
                    key={image.id}
                    className="overflow-hidden rounded-3xl border border-white/10 bg-[#090914]/90 shadow-[0_20px_45px_-40px_rgba(255,19,114,0.75)]"
                  >
                    <div className="relative">
                      <img
                        src={image.imageUrl}
                        alt={image.prompt}
                        className="h-48 w-full cursor-pointer object-cover transition hover:opacity-90"
                        onClick={() => setSelectedImage(image)}
                      />
                      <button
                        type="button"
                        onClick={() => handleDownloadImage(image)}
                        className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/40 p-2 text-white/70 transition hover:bg-black/70 hover:text-white"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-start justify-between gap-3 px-4 py-3">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-white/80">
                          {image.caption || 'just felt like sharing this moment ✨'}
                        </div>
                        <div className="text-[11px] uppercase tracking-[0.2em] text-white/40">
                          {formatDate(image.createdAt)}
                        </div>
                        <div className="text-xs text-white/60 line-clamp-2">{image.prompt}</div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleLike(image.id)}
                          className={`flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.25em] transition ${
                            image.liked
                              ? 'border-[#ff1372]/70 bg-[#ff1372]/10 text-[#ff7cab]'
                              : 'border-white/15 bg-white/5 text-white/60 hover:text-white'
                          }`}
                        >
                          <Heart
                            className={`h-4 w-4 ${image.liked ? 'fill-[#ff7cab] text-[#ff7cab]' : 'text-white/60'}`}
                          />
                          {image.liked ? 'Loved' : 'Love'}
                        </button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedImage(image)}
                          className="h-8 rounded-full border border-white/10 bg-white/5 px-4 text-[11px] uppercase tracking-[0.3em] text-white/60 hover:bg-white/15 hover:text-white"
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-white/50">
                  No gallery entries yet. Generate a look to populate the feed.
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>

        <Card className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-white/40">
            <span>Memorable Events</span>
            <Sparkle className="h-3.5 w-3.5" />
          </div>
          <ScrollArea className="mt-4 h-[360px] pr-2">
            <div className="space-y-3 text-sm text-white/70">
              {(progression.memorableEvents as StoryEntry[]).length ? (
                (progression.memorableEvents as StoryEntry[]).map((event) => (
                  <div key={event.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs uppercase tracking-[0.25em] text-white/40">
                      {new Date(event.timestamp).toLocaleDateString()}
                    </div>
                    <p className="mt-2 text-white/80">{event.description}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-white/50">
                  Nothing recorded yet. Run scenes to start her scrapbook.
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>
      </TabsContent>
      <Dialog
        open={!!selectedImage}
        onOpenChange={(value) => {
          if (!value) {
            setSelectedImage(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl border-none bg-[#07070c]/95 p-0 text-white">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>{character.name}&rsquo;s gallery drop</DialogTitle>
          </DialogHeader>
          {selectedImage ? (
            <div className="space-y-4 px-6 pb-6">
              <div className="overflow-hidden rounded-3xl border border-white/10">
                <img src={selectedImage.imageUrl} alt={selectedImage.prompt} className="w-full object-cover" />
              </div>
              <div className="space-y-2 text-sm text-white/70">
                <div className="text-base font-semibold text-white/80">
                  {selectedImage.caption || 'just felt like sharing this moment ✨'}
                </div>
                <div className="text-[11px] uppercase tracking-[0.25em] text-white/40">
                  {formatDate(selectedImage.createdAt)}
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.25em] text-white/40">Prompt</div>
                  <p className="mt-2 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm leading-relaxed text-white/70">
                    {selectedImage.prompt}
                  </p>
                </div>
                {selectedImage.tags?.length ? (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {selectedImage.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="rounded-full border-white/20 text-[11px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleToggleLike(selectedImage.id)}
                  className={`h-10 rounded-full border ${
                    selectedImage.liked ? 'border-[#ff1372]/70 text-[#ff7cab]' : 'border-white/20 text-white/70'
                  } px-4 text-xs uppercase tracking-[0.25em]`}
                >
                  <Heart
                    className={`mr-2 h-4 w-4 ${selectedImage.liked ? 'fill-[#ff7cab] text-[#ff7cab]' : 'text-white/60'}`}
                  />
                  {selectedImage.liked ? 'Loved' : 'Love'}
                </Button>
                <Button
                  onClick={() => handleDownloadImage(selectedImage)}
                  className="h-10 rounded-full bg-[#ff1372] px-5 text-xs font-semibold uppercase tracking-[0.25em] text-white hover:bg-[#ff1372]/90"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );

  const renderDms = (
    <TabsContent value="dms" className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Card className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-white/40">
          <span>Direct Messages</span>
          <MessageCircle className="h-3.5 w-3.5" />
        </div>
        <div className="mt-3 flex h-[360px] min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f17]/70">
          <ScrollArea className="flex-1 px-4 py-4">
            <div className="space-y-3">
              {dmMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.characterId ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl border px-3 py-2 text-sm shadow-lg transition-colors ${
                      message.characterId
                        ? 'border-white/10 bg-white/10 text-white/80'
                        : 'border-[#ff1372] bg-[#ff1372]/20 text-white'
                    }`}
                  >
                    <p>{message.content}</p>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/40">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              {!dmMessages.length && (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-white/50">
                  No DMs yet. Slide something smooth to break the ice.
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="border-t border-white/10 bg-[#11111b]/80 px-4 py-3">
            <form
              className="flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSendDm();
              }}
            >
              <Input
                value={dmInput}
                onChange={(event) => setDmInput(event.target.value)}
                disabled={isSendingDm}
                placeholder="Tell her what you need tonight..."
                className="h-10 flex-1 rounded-xl border-white/10 bg-white/5 text-sm text-white placeholder:text-white/40"
              />
              <Button
                type="submit"
                disabled={!dmInput.trim() || isSendingDm}
                className="h-10 rounded-xl bg-[#ff1372] px-4 text-xs font-semibold uppercase tracking-[0.2em] text-white hover:bg-[#ff1372]/90"
              >
                Send
              </Button>
            </form>
          </div>
        </div>
      </Card>

      <Card className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-white/40">
          <span>Session History</span>
          <ChatsCircle className="h-3.5 w-3.5" />
        </div>
        <ScrollArea className="mt-4 h-[360px] pr-3">
          <div className="space-y-3 text-sm text-white/70">
            {characterSessions.length ? (
              characterSessions.map((session) => (
                <div key={session.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs uppercase tracking-[0.25em] text-white/40">
                    {session.type.toUpperCase()}
                  </div>
                  <div className="mt-1 text-white/80">{session.title ?? 'Untitled session'}</div>
                  <div className="mt-2 flex items-center justify-between text-xs text-white/50">
                    <span>{session.messageCount ?? session.messages?.length ?? 0} messages</span>
                    <span>{formatDate(session.updatedAt)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-white/50">
                No sessions logged. Launch a chat to seed this timeline.
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>
    </TabsContent>
  );

  const renderMemories = (
    <TabsContent value="memories" className="min-h-0">
      <Card className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-white/40">
          <span>Memory Bank</span>
          <ShieldCheck className="h-3.5 w-3.5" />
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {(character.memories ?? []).length ? (
            character.memories?.map((memory) => (
              <div key={memory.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-white/40">
                  <span>{memory.category}</span>
                  <span>{new Date(memory.timestamp).toLocaleDateString()}</span>
                </div>
                <p className="mt-2 text-white/80">{memory.content}</p>
                <div className="mt-3 flex items-center justify-between text-[11px] text-white/40">
                  <span>Impact: {memory.importance}</span>
                  {memory.tags?.length ? <span>{memory.tags.join(', ')}</span> : null}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-white/50">
              No memories recorded. Play more scenes and capture milestones.
            </div>
          )}
        </div>
      </Card>
    </TabsContent>
  );

  const renderPrompts = (
    <TabsContent value="prompts" className="grid min-h-0 gap-4 lg:grid-cols-2">
      <Card className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white">
        <div className="text-xs uppercase tracking-[0.25em] text-white/40">System Prompt</div>
        <Textarea
          defaultValue={
            character.system_prompt ||
            `You are ${character.name}, a companion with this personality: ${character.personality}. Respond naturally, intimately, and stay grounded in your memories.`
          }
          className="mt-3 h-48 rounded-2xl border border-white/10 bg-white/5 text-sm text-white/80"
        />
      </Card>
      <Card className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white">
        <div className="text-xs uppercase tracking-[0.25em] text-white/40">Persona Notes</div>
        <Textarea
          defaultValue={character.longDescription || character.bio || 'Add personality notes, go-to phrases, and red lines here.'}
          className="mt-3 h-48 rounded-2xl border border-white/10 bg-white/5 text-sm text-white/80"
        />
      </Card>
    </TabsContent>
  );

  const fullCard = (
    <div className="relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#07070c]/95 text-white shadow-[0_55px_130px_-65px_rgba(255,19,114,0.55)] backdrop-blur-md">
      <div className="flex-1 overflow-hidden">
  <ScrollArea className="h-full w-full px-6 py-6">
          <div className="space-y-8">
            {galleryHeader}
            <Tabs defaultValue="overview" className="flex min-h-0 flex-col">
              <TabsList className="sticky top-0 z-10 mb-4 grid grid-cols-6 rounded-2xl border border-white/10 bg-white/10 p-1 text-xs text-white/70">
                <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-white/15 data-[state=active]:text-white">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="stats" className="rounded-xl data-[state=active]:bg-white/15 data-[state=active]:text-white">
                  Stats
                </TabsTrigger>
                <TabsTrigger value="value" className="rounded-xl data-[state=active]:bg-white/15 data-[state=active]:text-white">
                  Value
                </TabsTrigger>
                <TabsTrigger value="feed" className="rounded-xl data-[state=active]:bg-white/15 data-[state=active]:text-white">
                  Feed
                </TabsTrigger>
                <TabsTrigger value="dms" className="rounded-xl data-[state=active]:bg-white/15 data-[state=active]:text-white">
                  DMs
                </TabsTrigger>
                <TabsTrigger value="memories" className="rounded-xl data-[state=active]:bg-white/15 data-[state=active]:text-white">
                  Memories
                </TabsTrigger>
              </TabsList>
              {renderOverview}
              {renderStats}
              {renderValue}
              {renderFeed}
              {renderDms}
              {renderMemories}
              {renderPrompts}
            </Tabs>
          </div>
        </ScrollArea>
      </div>
    </div>
  );

  const actions = (
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
      className="group cursor-pointer overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#141428] via-[#0b0b16] to-[#04040a] p-4 text-white shadow-lg transition hover:border-[#ff1372]/40 hover:shadow-[0_45px_85px_-60px_rgba(255,19,114,0.65)] focus:outline-none focus:ring-2 focus:ring-[#ff1372]"
      onClick={() => handleOpenChange(true)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleOpenChange(true);
        }
      }}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12 rounded-2xl border border-white/10">
          <AvatarImage src={character.avatar} alt={character.name} />
          <AvatarFallback className="bg-primary/20 text-primary-foreground">
            {character.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/40">
            <span>{character.role || 'Companion'}</span>
            {source && <span>• {source}</span>}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <h4 className="text-sm font-semibold">{character.name}</h4>
            {getRarityIcon(character.rarity)}
            <Badge variant="outline" className={`rounded-full ${relationshipStatusColor(relationshipStatus)}`}>
              {relationshipStatus.replace(/_/g, ' ')}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-white/60 line-clamp-2">{character.description}</p>
        </div>
        <div className="text-right text-[10px] text-white/40">
          <div>{totalMessages} msgs</div>
          <div>{formatDate(lastInteraction)}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { label: 'Love', value: stats.love, icon: Heart },
          { label: 'Mood', value: stats.happiness, icon: Smile },
          { label: 'Desire', value: stats.wet, icon: Drop },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-2 text-center text-[11px] text-white/70">
            <Icon className="mx-auto h-3.5 w-3.5" />
            <div className="mt-1 font-semibold text-white">{value}%</div>
            <div className="uppercase tracking-[0.3em] text-white/40">{label}</div>
          </div>
        ))}
      </div>

      <div className="mt-4">{actions}</div>
    </Card>
  );

  if (hideTrigger) {
    return (
      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
  <DialogContent className="w-full max-w-[min(100vw-2rem,80rem)] border-none bg-transparent p-0 sm:max-w-none">
          <DialogHeader className="sr-only">
            <DialogTitle>{character.name}</DialogTitle>
          </DialogHeader>
          {fullCard}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      {!compact && compactCard}
      {compact && !hideTrigger ? compactCard : null}
      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
  <DialogContent className="w-full max-w-[min(100vw-2rem,90rem)] border-none bg-transparent p-0 sm:max-w-none">
          <DialogHeader className="sr-only">
            <DialogTitle>{character.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {fullCard}
            <Card className="rounded-[24px] border border-white/10 bg-[#090914]/90 p-6 text-white">
              <div className="text-xs uppercase tracking-[0.25em] text-white/40">Quick Actions</div>
              <div className="mt-3">{actions}</div>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
