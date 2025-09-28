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
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    BookOpen,
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
} from '@phosphor-icons/react';
import { useMemo, useState } from 'react';

import { useChat } from '@/hooks/useChat';
import { useFileStorage } from '@/hooks/useFileStorage';
import { useStorySystem } from '@/hooks/useStorySystem';
import { Character, RelationshipMilestone, SexualMilestone, StoryEntry } from '@/types';

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
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);

  const isDialogOpen = open ?? internalOpen;
  const handleOpenChange = (value: boolean) => {
    if (open === undefined) {
      setInternalOpen(value);
    }
    onOpenChange?.(value);
  };

  const { sessions } = useChat();
  const { getRecentStoryContext, analyzeEmotionalJourney } = useStorySystem();
  const { data: storedImages = [] } = useFileStorage<GeneratedImage[]>('generated-images.json', []);

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
      pain: clamp(base.pain, 25),
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

  const storySummary = useMemo(
    () => getRecentStoryContext(character, 5),
    [character, getRecentStoryContext],
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

  const relationshipStats = [
    { label: 'Affection', value: clamp(progression.affection, 0) },
    { label: 'Trust', value: clamp(progression.trust, 0) },
    { label: 'Intimacy', value: clamp(progression.intimacy, 0) },
    { label: 'Dominance', value: clamp(progression.dominance, 50) },
    { label: 'Jealousy', value: clamp(progression.jealousy, 0) },
    { label: 'Possessiveness', value: clamp(progression.possessiveness, 0) },
  ];

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
            <div className="space-y-4 p-6">
              <h3 className="text-lg font-semibold">Profile Snapshot</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-medium text-white/80">Personalities</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(character.personalities ?? []).length > 0 ? (
                      character.personalities.map((trait) => (
                        <Badge key={trait} variant="outline" className="bg-transparent text-xs text-white/70">
                          {trait}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-white/50">No personality traits recorded yet.</span>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-white/80">Features</h4>
                  <p className="mt-2 text-sm text-white/60">
                    {dots(character.features, 'No physical traits listed yet.')}
                  </p>
                </div>
              </div>
              {character.physicalStats && (
                <div className="grid gap-3 text-sm text-white/60 sm:grid-cols-2">
                  <div>Hair: <span className="text-white/80">{character.physicalStats.hairColor}</span></div>
                  <div>Eyes: <span className="text-white/80">{character.physicalStats.eyeColor}</span></div>
                  <div>Height: <span className="text-white/80">{character.physicalStats.height}</span></div>
                  <div>Skin Tone: <span className="text-white/80">{character.physicalStats.skinTone}</span></div>
                </div>
              )}
            </div>
          </Card>

          <Card className="border-none bg-white/5 text-white">
            <div className="space-y-4 p-6">
              <h3 className="text-lg font-semibold">Relationship Progress</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  {relationshipStats.map(({ label, value }) => (
                    <div key={label}>
                      <div className="flex items-center justify-between text-sm text-white/70">
                        <span>{label}</span>
                        <span className="text-white/80">{value}%</span>
                      </div>
                      <Progress value={value} className="mt-1.5 h-2 bg-white/10" />
                    </div>
                  ))}
                </div>
                <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                  <div className="flex items-center justify-between">
                    <span>Relationship Milestones</span>
                    <span className="text-white/90">
                      {milestoneSummary.relationship.achieved}/{milestoneSummary.relationship.total}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Intimacy Milestones</span>
                    <span className="text-white/90">
                      {milestoneSummary.sexual.achieved}/{milestoneSummary.sexual.total}
                    </span>
                  </div>
                  <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/60">
                    <h4 className="mb-1 flex items-center gap-2 text-sm font-medium text-white/80">
                      <Lightning className="h-4 w-4 text-amber-300" />
                      Unlocked Scenarios
                    </h4>
                    <p>{dots(progression.unlockedScenarios, 'No scenarios unlocked yet.')}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="border-none bg-white/5 text-white">
            <div className="space-y-4 p-6">
              <h3 className="text-lg font-semibold">Story Context</h3>
              <pre className="whitespace-pre-wrap text-sm leading-relaxed text-white/70">
                {storySummary}
              </pre>
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

  const feedTab = (
    <TabsContent value="feed" className="h-full">
      <ScrollArea className="h-full">
        <div className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <ImageIcon className="h-5 w-5 text-sky-300" /> Gallery
            </h3>
            <Badge variant="outline" className="border-white/20 bg-white/5 text-xs text-white/70">
              {galleryImages.length} images
            </Badge>
          </div>

          {galleryImages.length === 0 ? (
            <Card className="border-none bg-white/5 text-white/70">
              <div className="flex flex-col items-center gap-2 p-12 text-center">
                <ImageIcon className="h-10 w-10 text-white/20" />
                <p>No generated images yet. Create one from the copilot to populate her gallery.</p>
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
                      className="w-full"
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

  const settingsTab = (
    <TabsContent value="settings" className="h-full">
      <ScrollArea className="h-full">
        <div className="space-y-6 p-6">
          <Card className="border-none bg-white/5 text-white">
            <div className="space-y-3 p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <ShieldCheck className="h-5 w-5 text-emerald-300" /> AI Prompts
              </h3>
              <div className="space-y-4 text-sm text-white/70">
                <div>
                  <div className="text-xs uppercase tracking-wide text-white/40">System Prompt</div>
                  <pre className="mt-1 whitespace-pre-wrap rounded-lg border border-white/10 bg-white/5 p-3">
                    {character.prompts?.system ?? 'No system prompt configured yet.'}
                  </pre>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-white/40">Personality Prompt</div>
                  <pre className="mt-1 whitespace-pre-wrap rounded-lg border border-white/10 bg-white/5 p-3">
                    {character.prompts?.personality ?? 'No personality prompt configured yet.'}
                  </pre>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-white/40">Background</div>
                  <pre className="mt-1 whitespace-pre-wrap rounded-lg border border-white/10 bg-white/5 p-3">
                    {character.prompts?.background ?? 'No background prompt configured yet.'}
                  </pre>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-white/40">Image Prompt</div>
                  <pre className="mt-1 whitespace-pre-wrap rounded-lg border border-white/10 bg-white/5 p-3">
                    {character.imageDescription ?? 'No optimized image prompt yet.'}
                  </pre>
                </div>
              </div>
            </div>
          </Card>

          <Card className="border-none bg-white/5 text-white">
            <div className="space-y-4 p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <Users className="h-5 w-5 text-blue-300" /> Bonds & Preferences
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                  <h4 className="text-sm font-medium text-white/80">Bonds</h4>
                  {Object.keys(progression.bonds).length === 0 ? (
                    <p className="mt-2 text-xs text-white/50">No bonds recorded.</p>
                  ) : (
                    <div className="mt-3 space-y-1 text-xs">
                      {Object.entries(progression.bonds).map(([id, bond]) => (
                        <div key={id} className="flex items-center justify-between rounded border border-white/10 bg-white/5 p-2">
                          <span>{id.slice(0, 8)}...</span>
                          <span className="text-white/80">{bond.type}</span>
                          <span className="text-white/60">{bond.strength}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                  <h4 className="text-sm font-medium text-white/80">Preferences</h4>
                  <div className="mt-3 space-y-2">
                    <div>
                      <span className="text-xs uppercase tracking-wide text-white/40">Likes</span>
                      <p>{dots(progression.userPreferences.likes, 'No data')}</p>
                    </div>
                    <div>
                      <span className="text-xs uppercase tracking-wide text-white/40">Dislikes</span>
                      <p>{dots(progression.userPreferences.dislikes, 'No data')}</p>
                    </div>
                    <div>
                      <span className="text-xs uppercase tracking-wide text-white/40">Turn Ons</span>
                      <p>{dots(progression.userPreferences.turnOns, 'No data')}</p>
                    </div>
                    <div>
                      <span className="text-xs uppercase tracking-wide text-white/40">Turn Offs</span>
                      <p>{dots(progression.userPreferences.turnOffs, 'No data')}</p>
                    </div>
                  </div>
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
      <DialogContent className="w-full max-w-6xl overflow-hidden border border-white/10 bg-[#05050c] p-0 text-white">
        <DialogHeader className="sr-only">
          <DialogTitle>{character.name}</DialogTitle>
        </DialogHeader>
        <div className="grid h-full min-h-[520px] grid-cols-1 lg:grid-cols-[320px_1fr]">
          <div className="border-b border-white/10 bg-[#0a0a17] p-6 lg:border-b-0 lg:border-r">
            {heroPanel}
          </div>
          <div className="flex flex-col">
            <Tabs defaultValue="overview" className="flex h-full flex-col">
              <TabsList className="grid grid-cols-5 gap-2 border-b border-white/10 bg-[#080814] p-4 pb-2">
                <TabsTrigger value="overview" className="flex flex-col items-center gap-1 text-xs text-white/70 data-[state=active]:bg-white/10 data-[state=active]:text-white">
                  <Star className="h-4 w-4" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="stats" className="flex flex-col items-center gap-1 text-xs text-white/70 data-[state=active]:bg-white/10 data-[state=active]:text-white">
                  <TrendUp className="h-4 w-4" />
                  Stats
                </TabsTrigger>
                <TabsTrigger value="feed" className="flex flex-col items-center gap-1 text-xs text-white/70 data-[state=active]:bg-white/10 data-[state=active]:text-white">
                  <ImageIcon className="h-4 w-4" />
                  Feed
                </TabsTrigger>
                <TabsTrigger value="memories" className="flex flex-col items-center gap-1 text-xs text-white/70 data-[state=active]:bg-white/10 data-[state=active]:text-white">
                  <BookOpen className="h-4 w-4" />
                  Memories
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex flex-col items-center gap-1 text-xs text-white/70 data-[state=active]:bg-white/10 data-[state=active]:text-white">
                  <ShieldCheck className="h-4 w-4" />
                  Settings
                </TabsTrigger>
              </TabsList>
              <div className="flex-1 overflow-hidden">
                {overviewTab}
                {statsTab}
                {feedTab}
                {memoriesTab}
                {settingsTab}
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
