import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useMemo, useState } from 'react';

import {
    BookOpen,
    Calendar,
    Check,
    Crown,
    Download,
    Drop,
    Eye,
    Fire,
    Gift,
    Heart,
    House,
    Image as ImageIcon,
    Lightning,
    Lock,
    Medal,
    ChatCircle as MessageCircle,
    Pencil,
    Plus,
    ShieldCheck,
    Sparkle,
    Star,
    Trash,
    TrendUp,
    Trophy,
    Users
} from '@phosphor-icons/react';

import { useChat } from '@/hooks/useChat';
import { useFileStorage } from '@/hooks/useFileStorage';
import { useRelationshipDynamics } from '@/hooks/useRelationshipDynamics';
import { useStorySystem } from '@/hooks/useStorySystem';
import { logger } from '@/lib/logger';
import { Character } from '@/types';
import { toast } from 'sonner';

interface GeneratedImage {
  id: string;
  prompt: string;
  imageUrl: string;
  createdAt: Date;
  liked?: boolean;
  characterId?: string;
  tags?: string[];
  caption?: string; // Add caption field for Instagram-like posts
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
  source?: string; // NEW: Help identify where this card is rendered from
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

const getRarityIcon = (rarity?: Character['rarity']) => {
  const cls = 'w-4 h-4';
  switch (rarity) {
    case 'legendary':
      return <Crown className={cls + ' text-amber-400'} />;
    case 'epic':
      return <Sparkle className={cls + ' text-purple-400'} />;
    case 'rare':
      return <Trophy className={cls + ' text-blue-400'} />;
    default:
      return <Star className={cls + ' text-muted-foreground'} />;
  }
};

const getRelationshipStatusColor = (status: Character['progression']['relationshipStatus']) => {
  switch (status) {
    case 'devoted': return 'text-pink-500';
    case 'lover': return 'text-red-500';
    case 'romantic_interest': return 'text-purple-500';
    case 'close_friend': return 'text-blue-500';
    case 'friend': return 'text-green-500';
    case 'acquaintance': return 'text-yellow-500';
    default: return 'text-muted-foreground';
  }
};

export function CharacterCard({
  character,
  onStartChat,
  onGift,
  onMove,
  onEdit,
  onDelete,
  compact: _unusedCompact = false,
  source = 'unknown', // NEW: Default source
  open,
  onOpenChange,
  hideTrigger = false,
}: CharacterCardProps) {
  void _unusedCompact;
  const [internalOpen, setInternalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [showCreateImage, setShowCreateImage] = useState(false);
  const [newImagePrompt, setNewImagePrompt] = useState('');
  const [isCreatingImage, setIsCreatingImage] = useState(false);
  const [isGeneratingImagePrompt, setIsGeneratingImagePrompt] = useState(false);
  
  // Integrated chat state for DMs tab
  const [dmMessages, setDmMessages] = useState<DMMessage[]>([]);
  const [dmInput, setDmInput] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
  const { sessions } = useChat();
  const { updateRelationshipStats } = useRelationshipDynamics();
  const { getRecentStoryContext, analyzeEmotionalJourney } = useStorySystem();

  const isDialogOpen = open ?? internalOpen;
  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setShowCreateImage(false);
      setSelectedImage(null);
    }
    if (open === undefined) {
      setInternalOpen(value);
    }
    onOpenChange?.(value);
  };

  // Image handling
  const { data: images, setData: setImages } = useFileStorage<GeneratedImage[]>('generated-images.json', []);
  const characterImages = images.filter(img => img.characterId === character.id);

  // Safely access character properties with defaults - ensure no NaN values
  const stats = character.stats ? {
    love: Math.max(0, Math.min(100, character.stats.love || 0)),
    happiness: Math.max(0, Math.min(100, character.stats.happiness || 50)),
    wet: Math.max(0, Math.min(100, character.stats.wet || 0)),
    willing: Math.max(0, Math.min(100, character.stats.willing || 50)),
    selfEsteem: Math.max(0, Math.min(100, character.stats.selfEsteem || 50)),
    loyalty: Math.max(0, Math.min(100, character.stats.loyalty || 50)),
    fight: Math.max(0, Math.min(100, character.stats.fight || 20)),
    stamina: Math.max(0, Math.min(100, character.stats.stamina || 50)),
    pain: Math.max(0, Math.min(100, character.stats.pain || 20)),
    experience: Math.max(0, character.stats.experience || 0),
    level: Math.max(1, character.stats.level || 1)
  } : {
    love: 0,
    happiness: 50,
    wet: 0,
    willing: 50,
    selfEsteem: 50,
    loyalty: 50,
    fight: 20,
    stamina: 50,
    pain: 20,
    experience: 0,
    level: 1
  };

  const skills = character.skills ? {
    hands: Math.max(0, Math.min(100, character.skills.hands || 0)),
    mouth: Math.max(0, Math.min(100, character.skills.mouth || 0)),
    missionary: Math.max(0, Math.min(100, character.skills.missionary || 0)),
    doggy: Math.max(0, Math.min(100, character.skills.doggy || 0)),
    cowgirl: Math.max(0, Math.min(100, character.skills.cowgirl || 0))
  } : {
    hands: 0,
    mouth: 0,
    missionary: 0,
    doggy: 0,
    cowgirl: 0
  };

  const progression = character.progression || {
    level: stats.level,
    nextLevelExp: 1000,
    unlockedFeatures: [],
    achievements: [],
    relationshipStatus: 'stranger' as const,
    affection: 0,
    trust: 0,
    intimacy: 0,
    dominance: 50,
    jealousy: 0,
    possessiveness: 0,
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
      overall: 0,
      kinkAlignment: 0,
      stylePreference: 0
    },
    userPreferences: {
      likes: [],
      dislikes: [],
      turnOns: [],
      turnOffs: []
    }
  };

  const characterSessions = useMemo(
    () => sessions.filter(s => s.participantIds?.includes(character.id) && s.messages.length > 0),
    [sessions, character.id]
  );

  const totalMessages = useMemo(
    () =>
      characterSessions.reduce((sum, s) => {
        const messages = (s.messages ?? []) as DMMessage[];
        return sum + messages.filter((m) => m.characterId === character.id).length;
      }, 0),
    [characterSessions, character.id]
  );

  const relationshipStatus = progression.relationshipStatus || 'stranger';
  const achievedMilestones = (progression.sexualMilestones || []).filter(m => m.achieved).length;
  const totalMilestones = (progression.sexualMilestones || []).length;

  // Image handling functions
  const handleDownloadImage = async (image: GeneratedImage) => {
    try {
      const response = await fetch(image.imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `character-image-${image.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Could add toast notification here if available
    } catch (error) {
  logger.error('Download error:', error);
    }
  };

  // Integrated DM chat functions
  const handleSendDmMessage = async () => {
    if (!dmInput.trim() || isSendingMessage) return;

    const userMessage = {
      id: Date.now(),
      content: dmInput.trim(),
      timestamp: new Date().toISOString(),
      characterId: null // User message
    };

    setDmMessages(prev => [...prev, userMessage]);
    setDmInput('');
    setIsSendingMessage(true);

    try {
      // Import AIService dynamically to avoid circular dependencies
      const { AIService } = await import('@/lib/aiService');
      
      // Generate character response
      const systemPrompt = character.prompts?.system || `You are ${character.name}. Respond to messages in character.`;
      const conversationHistory = [...dmMessages, userMessage].slice(-10); // Keep last 10 messages
      
      const prompt = `${systemPrompt}\n\nConversation:\n${conversationHistory.map(msg => 
        `${msg.characterId ? character.name : 'User'}: ${msg.content}`
      ).join('\n')}\n\n${character.name}:`;

      const response = await AIService.generateResponse(prompt);
      
      if (response) {
        const characterMessage = {
          id: Date.now() + 1,
          content: response.trim(),
          timestamp: new Date().toISOString(),
          characterId: character.id
        };
        
        setDmMessages(prev => [...prev, characterMessage]);
        
        // Update relationship stats
        updateRelationshipStats(character.id, {
          love: 1,
          happiness: 1,
          loyalty: 0.5
        });
      }
    } catch (error) {
  logger.error('Error sending DM:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleCreateImage = async () => {
    if (!newImagePrompt.trim()) return;

    setIsCreatingImage(true);
    try {
      // Create enhanced prompt with character's image description
      const characterContext = character.imageDescription || 
        `${character.personalities?.[0] || 'person'} with ${character.features?.slice(0, 3).join(', ') || 'distinctive'} features`.trim();
      
      const enhancedPrompt = `${newImagePrompt.trim()}. Character appearance: ${characterContext}`;
      
      // Import AIService dynamically to avoid circular dependencies
      const { AIService } = await import('@/lib/aiService');
      const imageUrl = await AIService.generateImage(enhancedPrompt);
      
      if (imageUrl) {
        const newImage: GeneratedImage = {
          id: crypto.randomUUID(),
          prompt: newImagePrompt.trim(),
          imageUrl,
          createdAt: new Date(),
          characterId: character.id,
          tags: ['character', 'portrait', character.role || 'character'].filter(Boolean),
          caption: generateImageCaption()
        };

        // Save using proper file storage system
        const updatedImages = [newImage, ...images];
        setImages(updatedImages);

        setNewImagePrompt('');
        setShowCreateImage(false);
        toast.success('Image created successfully!');
      }
    } catch (error) {
  logger.error('Image creation error:', error);
    } finally {
      setIsCreatingImage(false);
    }
  };

  const generateImageCaption = (): string => {
    // Generate AI-style caption from character perspective
    const motivations = [
      "just felt like sharing this moment",
      "loving this vibe today",
      "feeling myself right now",
      "when the lighting hits just right",
      "new day, new me",
      "embracing my energy",
      "this is my happy place",
      "living in the moment",
      "feeling grateful for today",
      "just being authentic"
    ];
    
    const emojis = ["💕", "✨", "💖", "🌸", "💫", "🌟", "💝", "🦋", "🌺", "💎"];
    
    const motivation = motivations[Math.floor(Math.random() * motivations.length)];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    
    return `${motivation} ${emoji}`;
  };

  const handleGenerateImagePrompt = async () => {
    setIsGeneratingImagePrompt(true);
    try {
      const promptInstructions = `Generate a detailed image prompt for AI image generation based on this character's attributes. Focus ONLY on physical features, style, and visual characteristics. Do not include age references, personality traits, or story elements.

Character Details:
${character.name ? `Name: ${character.name}` : ''}
${character.role ? `Role: ${character.role}` : ''}
${character.personalities?.length > 0 ? `Personalities: ${character.personalities.join(', ')}` : ''}
${character.features?.length > 0 ? `Physical Features: ${character.features.join(', ')}` : ''}
${character.appearance ? `Current Appearance Description: ${character.appearance}` : ''}
${character.physicalStats ? `Physical Stats: Hair: ${character.physicalStats.hairColor}, Eyes: ${character.physicalStats.eyeColor}, Skin: ${character.physicalStats.skinTone}` : ''}

Create a concise, optimized prompt (under 150 words) that includes:
- Specific physical characteristics (hair color, eye color, build, etc.)
- Clothing style or outfit description
- Overall aesthetic and visual style
- Camera angle or composition notes if relevant

Return only the image prompt, nothing else.`;

      const { AIService } = await import('@/lib/aiService');
      const generatedPrompt = await AIService.generateResponse(promptInstructions, undefined, undefined, {
        temperature: 0.8,
        max_tokens: 300
      });

      if (generatedPrompt?.trim()) {
        // For CharacterCard, we'll need to update the character via onEdit callback
        if (onEdit) {
          const updatedCharacter = {
            ...character,
            imageDescription: generatedPrompt.trim()
          };
          onEdit(updatedCharacter);
        }
        // Could add toast notification here if available
      } else {
  logger.error('Failed to generate image prompt');
      }
    } catch (error) {
  logger.error('Error generating image prompt:', error);
    } finally {
      setIsGeneratingImagePrompt(false);
    }
  };

  // Compact card variant for sidebar
  const content = (
      <>
        {!hideTrigger && (
          <Card 
            className="p-3 hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-primary/20 hover:border-l-primary"
            onClick={() => handleOpenChange(true)}
            data-character-id={character.id}
            data-character-source={source}
          >
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 border-2 border-primary/20">
              <AvatarImage src={character.avatar} alt={character.name} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                {character.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-sm truncate">{character.name}</h4>
                {getRarityIcon(character.rarity)}
                <div className="text-[8px] opacity-50 ml-auto">{source}</div>
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                  {character.role || 'Unknown'}
                </Badge>
                <span className={`text-[10px] font-medium ${getRelationshipStatusColor(relationshipStatus)}`}>
                  {relationshipStatus.replace('_', ' ')}
                </span>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Heart size={10} className="text-red-500" />
                  <Progress value={stats.love} className="h-1 flex-1" />
                  <span className="text-[9px] text-muted-foreground w-6">{stats.love}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Drop size={10} className="text-pink-500" />
                  <Progress value={stats.wet} className="h-1 flex-1" />
                  <span className="text-[9px] text-muted-foreground w-6">{stats.wet}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-3 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2">
              <span>Level {stats.level}</span>
              <span>{achievedMilestones}/{totalMilestones} milestones</span>
            </div>
            
            {/* Quick Actions for compact view */}
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-6 text-[10px] px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartChat(character.id);
                }}
              >
                <MessageCircle size={10} className="mr-1" />
                Chat
              </Button>
              {onEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(character);
                  }}
                >
                  <Pencil size={10} />
                </Button>
              )}
              {onDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-6 px-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash size={10} />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Character</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {character.name}? This action cannot be undone and will permanently remove the character from your house, including all their conversations and progress.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => onDelete(character.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete Character
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
          </Card>
        )}

        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogContent className="w-full h-full md:w-[90vw] md:max-w-[1200px] md:max-h-[85vh] md:rounded-3xl overflow-hidden p-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 md:border-4 border-gray-300 dark:border-gray-600 shadow-2xl">
            <DialogHeader className="sr-only">
              <DialogTitle>{character.name} - Character Interface</DialogTitle>
            </DialogHeader>
            {/* iPad-like Device Frame */}
            <div className="h-full flex flex-col bg-black md:rounded-3xl md:p-1">
              {/* Screen Area */}
              <div className="flex-1 bg-white dark:bg-gray-900 md:rounded-[20px] overflow-hidden relative">
                {/* Status Bar with Navigation */}
                <div className="h-12 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 flex items-center justify-between px-4 text-xs font-medium text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="font-semibold">{character.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {relationshipStatus.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button size="sm" variant="ghost" className="h-8 px-2">
                      <House size={14} />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 px-2">
                      <Users size={14} />
                    </Button>
                    <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <div className="flex gap-0.5">
                      <div className="w-1 h-2 bg-green-500 rounded-sm"></div>
                      <div className="w-1 h-2 bg-green-500 rounded-sm"></div>
                      <div className="w-1 h-2 bg-green-400 rounded-sm"></div>
                    </div>
                  </div>
                </div>

                <Tabs defaultValue="overview" className="flex-1 flex flex-col">
                  {/* Enhanced Tab Bar with Character Images */}
                  <TabsList className="grid grid-cols-6 bg-gray-50 dark:bg-gray-800 m-0 rounded-none border-b border-gray-200 dark:border-gray-700 h-20 p-2">
                    <TabsTrigger value="overview" className="flex flex-col items-center gap-1 h-full data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600 rounded-lg">
                      <Eye size={24} />
                      <span className="text-xs font-medium">Profile</span>
                    </TabsTrigger>
                    <TabsTrigger value="stats" className="flex flex-col items-center gap-1 h-full data-[state=active]:bg-green-100 data-[state=active]:text-green-600 rounded-lg">
                      <TrendUp size={24} />
                      <span className="text-xs font-medium">Stats</span>
                    </TabsTrigger>
                    <TabsTrigger value="feed" className="flex flex-col items-center gap-1 h-full data-[state=active]:bg-pink-100 data-[state=active]:text-pink-600 rounded-lg">
                      <ImageIcon size={24} />
                      <span className="text-xs font-medium">Feed</span>
                    </TabsTrigger>
                    <TabsTrigger value="dms" className="flex flex-col items-center gap-1 h-full data-[state=active]:bg-purple-100 data-[state=active]:text-purple-600 rounded-lg">
                      <MessageCircle size={24} />
                      <span className="text-xs font-medium">Chat</span>
                    </TabsTrigger>
                    <TabsTrigger value="memories" className="flex flex-col items-center gap-1 h-full data-[state=active]:bg-orange-100 data-[state=active]:text-orange-600 rounded-lg">
                      <BookOpen size={24} />
                      <span className="text-xs font-medium">Stories</span>
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="flex flex-col items-center gap-1 h-full data-[state=active]:bg-gray-100 data-[state=active]:text-gray-600 rounded-lg">
                      <Pencil size={24} />
                      <span className="text-xs font-medium">Settings</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Content Area with Fixed Scrolling */}
                  <div className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                      <div className="p-6">
                <TabsContent value="overview" className="space-y-6 mt-0">
                  {/* Character Profile Header - Prominent Image and START Button */}
                  <Card className="p-6 bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 border-0 shadow-xl">
                    <div className="flex flex-col items-center text-center mb-6">
                      <Avatar className="w-32 h-32 border-4 border-[rgba(255,255,255,0.06)] shadow-xl ring-4 ring-primary/20 mb-4">
                        <AvatarImage src={character.avatar} alt={character.name} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white text-3xl font-bold">
                          {character.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-3xl font-bold">{character.name}</h2>
                        {getRarityIcon(character.rarity)}
                      </div>
                      
                      <Badge variant="default" className="bg-gradient-to-r from-primary to-primary/80 text-white px-4 py-2 text-sm mb-4">
                        {character.role || 'No role'} • Level {stats.level}
                      </Badge>

                      {/* Story Status and START Button */}
                      {characterSessions.length === 0 ? (
                        <div className="w-full max-w-sm">
                          <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
                            <h3 className="font-semibold text-green-800 dark:text-green-300 mb-2">Ready to Begin</h3>
                            <p className="text-sm text-green-600 dark:text-green-400">
                              Start your story with {character.name}. She's new to the house and feeling uncertain about everything.
                            </p>
                          </div>
                          <Button 
                            onClick={() => onStartChat(character.id)}
                            size="lg" 
                            className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold text-lg shadow-lg"
                          >
                            <Star size={20} className="mr-2" />
                            START STORY
                          </Button>
                        </div>
                      ) : (
                        <div className="w-full max-w-sm">
                          <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                            <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Story in Progress</h3>
                            <p className="text-sm text-blue-600 dark:text-blue-400">
                              Continue your ongoing story with {character.name}. You've had {totalMessages} conversations.
                            </p>
                          </div>
                          <Button 
                            onClick={() => onStartChat(character.id)}
                            size="lg" 
                            className="w-full h-12 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold text-lg shadow-lg"
                          >
                            <MessageCircle size={20} className="mr-2" />
                            CONTINUE STORY
                          </Button>
                        </div>
                      )}

                        {/* Social Media Style Stats Row */}
                        <div className="flex gap-8 text-center mt-6">
                          <div>
                            <div className="text-2xl font-bold text-primary">{characterSessions.length}</div>
                            <div className="text-sm text-muted-foreground">Chats</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-primary">{totalMessages}</div>
                            <div className="text-sm text-muted-foreground">Messages</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-primary">{achievedMilestones}</div>
                            <div className="text-sm text-muted-foreground">Milestones</div>
                          </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="mb-6 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                      <p className="text-sm leading-relaxed">{character.description || 'No description available'}</p>
                    </div>

                    {/* Physical Stats - Instagram Profile Style */}
                    {character.physicalStats && (
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-muted-foreground mb-3">Physical Info</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center justify-between p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg">
                            <span className="text-sm font-medium text-muted-foreground">Hair Color</span>
                            <span className="text-sm font-semibold">{character.physicalStats.hairColor}</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg">
                            <span className="text-sm font-medium text-muted-foreground">Eye Color</span>
                            <span className="text-sm font-semibold">{character.physicalStats.eyeColor}</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg">
                            <span className="text-sm font-medium text-muted-foreground">Height</span>
                            <span className="text-sm font-semibold">{character.physicalStats.height}</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg">
                            <span className="text-sm font-medium text-muted-foreground">Skin</span>
                            <span className="text-sm font-semibold">{character.physicalStats.skinTone}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Personality Tags */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-muted-foreground mb-3">Personality</h4>
                      <div className="flex flex-wrap gap-2">
                        {character.personalities?.map((personality) => (
                          <Badge key={personality} variant="outline" className="bg-white/70 dark:bg-gray-800/70 border-primary/20 text-primary hover:bg-primary/10">
                            {personality}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Features Tags */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-muted-foreground mb-3">Features</h4>
                      <div className="flex flex-wrap gap-2">
                        {character.features?.map((feature) => (
                          <Badge key={feature} variant="secondary" className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-300">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => onStartChat(character.id)} className="flex-1">
                        <MessageCircle size={14} className="mr-2" />
                        Message
                      </Button>
                      {onEdit && (
                        <Button size="sm" variant="outline" onClick={() => onEdit(character)}>
                          <Pencil size={14} className="mr-2" />
                          Edit
                        </Button>
                      )}
                      {onGift && (
                        <Button size="sm" variant="outline" onClick={() => onGift(character.id)}>
                          <Gift size={14} className="mr-2" />
                          Gift
                        </Button>
                      )}
                      {onMove && (
                        <Button size="sm" variant="outline" onClick={() => onMove(character.id)}>
                          <House size={14} className="mr-2" />
                          Move Room
                        </Button>
                      )}
                      {onDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <Trash size={14} className="mr-2" />
                              Delete Character
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Character</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {character.name}? This action cannot be undone and will permanently remove the character from your house, including all their conversations and progress.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => onDelete(character.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete Character
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="feed" className="flex-1 flex flex-col p-0 m-0">
                  {/* Mobile Phone-style Header */}
                  <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
                    {/* Status Bar Mockup */}
                    <div className="flex justify-between items-center px-4 py-1 text-xs bg-black text-white">
                      <span>9:41</span>
                      <div className="flex gap-1">
                        <div className="w-4 h-2 bg-white rounded-sm opacity-60"></div>
                        <div className="w-4 h-2 bg-white rounded-sm opacity-80"></div>
                        <div className="w-4 h-2 bg-white rounded-sm"></div>
                      </div>
                    </div>
                    
                    {/* Feed Header */}
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8 border border-gray-200 dark:border-gray-700">
                          <AvatarImage src={character.avatar} alt={character.name} />
                          <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white text-xs">
                            {character.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-sm">{character.name}</div>
                          <div className="text-xs text-muted-foreground">@{character.name.toLowerCase().replace(/\s+/g, '')}</div>
                        </div>
                      </div>
                      
                      {/* Create Post Button - Instagram Style */}
                      <Button
                        onClick={() => setShowCreateImage(!showCreateImage)}
                        variant="ghost"
                        size="sm"
                        className="p-2 rounded-lg border-2 border-dashed border-gray-300 hover:border-primary hover:bg-primary/5"
                      >
                        <Plus size={18} className="text-primary" />
                      </Button>
                    </div>

                    {/* Create Post Interface */}
                    {showCreateImage && (
                      <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex items-start gap-3">
                          <Avatar className="w-8 h-8 border border-gray-200 dark:border-gray-700">
                            <AvatarImage src={character.avatar} alt={character.name} />
                            <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white text-xs">
                              {character.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-3">
                            <Textarea
                              placeholder={`What's on your mind, ${character.name}?`}
                              value={newImagePrompt}
                              onChange={(e) => setNewImagePrompt(e.target.value)}
                              rows={3}
                              className="resize-none border-0 bg-white dark:bg-gray-900 rounded-xl shadow-sm"
                            />
                            <div className="flex gap-2">
                              <Button
                                onClick={handleCreateImage}
                                disabled={isCreatingImage || !newImagePrompt.trim()}
                                className="flex-1 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                                size="sm"
                              >
                                {isCreatingImage ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2" />
                                    Creating...
                                  </>
                                ) : (
                                  <>
                                    <ImageIcon className="w-4 h-4 mr-2" />
                                    Share
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
                                className="rounded-full"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Instagram-style Feed Content */}
                  <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                    {characterImages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
                        <div className="w-20 h-20 bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mb-6">
                          <ImageIcon className="w-10 h-10 text-pink-400" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">No Posts Yet</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 max-w-xs">
                          {character.name} hasn't shared any photos yet. Tap the + button to create their first post!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-0">
                        {characterImages.map((image, index) => (
                          <div key={image.id} className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                            {/* Post Header */}
                            <div className="flex items-center justify-between p-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="w-8 h-8 border border-gray-200 dark:border-gray-700">
                                  <AvatarImage src={character.avatar} alt={character.name} />
                                  <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white text-xs">
                                    {character.name.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-semibold text-sm text-gray-900 dark:text-white">{character.name}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {new Date(image.createdAt).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </div>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <span className="text-lg leading-none">⋯</span>
                              </Button>
                            </div>

                            {/* Post Image - Edge to Edge */}
                            <div className="relative aspect-square bg-gray-100 dark:bg-gray-800">
                              <img
                                src={image.imageUrl}
                                alt={image.caption || `${character.name}'s post`}
                                className="w-full h-full object-cover cursor-pointer transition-transform hover:scale-[1.02]"
                                onClick={() => setSelectedImage(image)}
                                loading={index < 3 ? "eager" : "lazy"}
                              />
                              {/* Subtle overlay on hover */}
                              <div className="absolute inset-0 bg-black/0 hover:bg-black/5 transition-colors pointer-events-none" />
                            </div>

                            {/* Post Actions */}
                            <div className="p-3 space-y-2">
                              {/* Action Buttons */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    onClick={() => {
                                      // Toggle like functionality
                                      const updatedImages = images.map(img => 
                                        img.id === image.id ? { ...img, liked: !img.liked } : img
                                      );
                                      setImages(updatedImages);
                                    }}
                                  >
                                    <Heart
                                      size={22}
                                      className={`transition-colors ${
                                        image.liked 
                                          ? 'fill-red-500 text-red-500' 
                                          : 'text-gray-700 dark:text-gray-300 hover:text-red-400'
                                      }`}
                                    />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                    onClick={() => setSelectedImage(image)}
                                  >
                                    <MessageCircle size={22} className="text-gray-700 dark:text-gray-300 hover:text-blue-400" />
                                  </Button>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                                  onClick={() => handleDownloadImage(image)}
                                >
                                  <Download size={18} className="text-gray-700 dark:text-gray-300" />
                                </Button>
                              </div>

                              {/* Likes Count */}
                              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                {image.liked ? '1 like' : 'Be the first to like this'}
                              </div>

                              {/* Caption */}
                              <div className="text-sm text-gray-900 dark:text-white">
                                <span className="font-semibold mr-2">{character.name}</span>
                                <span className="text-gray-700 dark:text-gray-300">
                                  {image.caption || 'just felt like sharing this moment ✨'}
                                </span>
                              </div>

                              {/* View comments link */}
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 p-0 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                onClick={() => setSelectedImage(image)}
                              >
                                View full image
                              </Button>
                            </div>
                          </div>
                        ))}
                        
                        {/* Bottom spacing for mobile */}
                        <div className="h-6 bg-gray-50 dark:bg-gray-900"></div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="dms" className="flex-1 flex flex-col">
                  <div className="flex flex-col h-full bg-gradient-to-b from-blue-50 to-white dark:from-gray-800 dark:to-gray-900">
                    {/* Chat Header - iPhone/iPad Style */}
                    <div className="flex items-center gap-3 p-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
                      <Avatar className="w-10 h-10 ring-2 ring-blue-200">
                        <AvatarImage src={character.avatar} alt={character.name} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                          {character.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 dark:text-white">{character.name}</div>
                        <div className="text-sm text-green-500 flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          Active now
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {/* Messages Area */}
                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-4">
                        {dmMessages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-center py-12">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-900 rounded-full flex items-center justify-center mb-6">
                              <MessageCircle size={32} className="text-blue-500" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-white">Start a conversation</h3>
                            <p className="text-gray-600 dark:text-gray-300 text-sm max-w-xs">
                              Send {character.name} a message to begin chatting
                            </p>
                          </div>
                        ) : (
                          dmMessages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex ${message.characterId ? 'justify-start' : 'justify-end'}`}
                            >
                              <div
                                className={`max-w-[75%] p-3 rounded-2xl shadow-sm ${
                                  message.characterId
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-tl-md border border-gray-200 dark:border-gray-600'
                                    : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-tr-md'
                                }`}
                              >
                                <p className="text-sm leading-relaxed">{message.content}</p>
                                <div className={`text-xs mt-1 ${
                                  message.characterId
                                    ? 'text-gray-500 dark:text-gray-400'
                                    : 'text-blue-100'
                                }`}>
                                  {new Date(message.timestamp).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                        {isSendingMessage && (
                          <div className="flex justify-start">
                            <div className="bg-white dark:bg-gray-700 p-3 rounded-2xl rounded-tl-md border border-gray-200 dark:border-gray-600">
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>

                    {/* Message Input - iPhone/iPad Style */}
                    <div className="p-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700">
                      <div className="flex gap-3 items-end">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={dmInput}
                            onChange={(e) => setDmInput(e.target.value)}
                            placeholder={`Message ${character.name}...`}
                            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendDmMessage();
                              }
                            }}
                            disabled={isSendingMessage}
                          />
                        </div>
                        <Button
                          size="sm"
                          className="rounded-full w-10 h-10 p-0 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg"
                          onClick={handleSendDmMessage}
                          disabled={!dmInput.trim() || isSendingMessage}
                        >
                          {isSendingMessage ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <MessageCircle size={16} />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="stats" className="space-y-4">
                  {/* Main Character Stats */}
                  <Card className="p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Heart size={16} />
                      Main Stats
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Love</span>
                          <span className="font-medium">{stats.love}%</span>
                        </div>
                        <Progress value={stats.love} className="h-2" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Happiness</span>
                          <span className="font-medium">{stats.happiness}%</span>
                        </div>
                        <Progress value={stats.happiness} className="h-2" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Wet</span>
                          <span className="font-medium">{stats.wet}%</span>
                        </div>
                        <Progress value={stats.wet} className="h-2" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Willingness</span>
                          <span className="font-medium">{stats.willing}%</span>
                        </div>
                        <Progress value={stats.willing} className="h-2" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Self Esteem</span>
                          <span className="font-medium">{stats.selfEsteem}%</span>
                        </div>
                        <Progress value={stats.selfEsteem} className="h-2" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Loyalty</span>
                          <span className="font-medium">{stats.loyalty}%</span>
                        </div>
                        <Progress value={stats.loyalty} className="h-2" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Fight</span>
                          <span className="font-medium">{stats.fight}%</span>
                        </div>
                        <Progress value={stats.fight} className="h-2" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Stamina</span>
                          <span className="font-medium">{stats.stamina}%</span>
                        </div>
                        <Progress value={stats.stamina} className="h-2" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Pain Tolerance</span>
                          <span className="font-medium">{stats.pain}%</span>
                        </div>
                        <Progress value={stats.pain} className="h-2" />
                      </div>
                    </div>
                  </Card>

                  {/* Level and Experience */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="p-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Trophy size={16} />
                        Experience & Level
                      </h4>
                      <div className="space-y-3">
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <div className="text-3xl font-bold text-primary">Level {stats.level}</div>
                          <div className="text-sm text-muted-foreground mt-1">Current Level</div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Experience</span>
                            <span>{stats.experience}/{progression.nextLevelExp}</span>
                          </div>
                          <Progress 
                            value={(stats.experience / progression.nextLevelExp) * 100} 
                            className="h-2" 
                          />
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Sparkle size={16} />
                        Achievements
                      </h4>
                      <div className="space-y-2">
                        {progression.achievements?.map((achievement) => (
                          <div key={achievement} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                            <Medal size={16} className="text-amber-500" />
                            <span className="text-sm">{achievement}</span>
                          </div>
                        )) || (
                          <div className="text-center py-4 text-muted-foreground">
                            No achievements yet
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>

                  {/* Relationship Dynamics */}
                  <Card className="p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Heart size={16} />
                      Relationship Dynamics
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Affection</span>
                          <span className="font-medium">{progression.affection || 0}%</span>
                        </div>
                        <Progress value={progression.affection || 0} className="h-2" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Trust</span>
                          <span className="font-medium">{progression.trust || 0}%</span>
                        </div>
                        <Progress value={progression.trust || 0} className="h-2" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Intimacy</span>
                          <span className="font-medium">{progression.intimacy || 0}%</span>
                        </div>
                        <Progress value={progression.intimacy || 0} className="h-2" />
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className={`text-2xl font-bold ${getRelationshipStatusColor(relationshipStatus)}`}>
                          {relationshipStatus.replace('_', ' ').toUpperCase()}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">Current Status</div>
                      </div>
                    </div>
                  </Card>

                  {/* Sexual Progression */}
                  <Card className="p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Fire size={16} />
                      Sexual Progression
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Experience</span>
                          <span className="font-medium">{progression.sexualExperience || 0}%</span>
                        </div>
                        <Progress value={progression.sexualExperience || 0} className="h-2" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Willingness</span>
                          <span className="font-medium">{stats.willing || 0}%</span>
                        </div>
                        <Progress value={stats.willing || 0} className="h-2" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Self Esteem</span>
                          <span className="font-medium">{stats.selfEsteem || 0}%</span>
                        </div>
                        <Progress value={stats.selfEsteem || 0} className="h-2" />
                      </div>
                    </div>

                    {/* Sexual Skills */}
                    <div className="border-t pt-4">
                      <h5 className="font-medium mb-3 flex items-center gap-2">
                        <Lightning size={16} />
                        Sexual Skills
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Hands (Handjobs, Stroking)</span>
                            <span className="font-medium">{skills.hands}%</span>
                          </div>
                          <Progress value={skills.hands} className="h-2" />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Mouth (Blowjobs, Tongue)</span>
                            <span className="font-medium">{skills.mouth}%</span>
                          </div>
                          <Progress value={skills.mouth} className="h-2" />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Missionary</span>
                            <span className="font-medium">{skills.missionary}%</span>
                          </div>
                          <Progress value={skills.missionary} className="h-2" />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Doggy</span>
                            <span className="font-medium">{skills.doggy}%</span>
                          </div>
                          <Progress value={skills.doggy} className="h-2" />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Cowgirl</span>
                            <span className="font-medium">{skills.cowgirl}%</span>
                          </div>
                          <Progress value={skills.cowgirl} className="h-2" />
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Milestones and Events */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="p-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Medal size={16} />
                        Milestones
                      </h4>
                      <div className="space-y-2">
                        {progression.relationshipMilestones?.concat(progression.sexualMilestones || []).map((milestone) => (
                          <div key={milestone.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded">
                            {milestone.achieved ? (
                              <Check size={16} className="text-green-500" />
                            ) : (
                              <Lock size={16} className="text-muted-foreground" />
                            )}
                            <div className="flex-1">
                              <div className="text-sm font-medium">{milestone.name}</div>
                              <div className="text-xs text-muted-foreground">{milestone.description}</div>
                            </div>
                          </div>
                        )) || (
                          <div className="text-center py-4 text-muted-foreground">
                            No milestones defined
                          </div>
                        )}
                      </div>
                    </Card>

                    <Card className="p-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Calendar size={16} />
                        Recent Events
                      </h4>
                      <div className="space-y-2">
                        {progression.significantEvents?.slice(0, 5).map((event) => (
                          <div key={event.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                            <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                            <div className="flex-1">
                              <div className="text-sm font-medium">{event.description}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {new Date(event.timestamp).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        )) || (
                          <div className="text-center py-8 text-muted-foreground">
                            No significant events yet
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>

                  {/* Unlocked Content */}
                  <Card className="p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Lightning size={16} />
                      Unlocked Content
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium mb-2">Positions</h5>
                        <div className="flex flex-wrap gap-1">
                          {progression.unlockedPositions?.map((position) => (
                            <Badge key={position} variant="secondary" className="text-xs">{position}</Badge>
                          )) || <span className="text-sm text-muted-foreground">None</span>}
                        </div>
                      </div>
                      <div>
                        <h5 className="font-medium mb-2">Scenarios</h5>
                        <div className="flex flex-wrap gap-1">
                          {progression.unlockedScenarios?.map((scenario) => (
                            <Badge key={scenario} variant="secondary" className="text-xs">{scenario}</Badge>
                          )) || <span className="text-sm text-muted-foreground">None</span>}
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* User Preferences */}
                  <Card className="p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Star size={16} />
                      User Preferences
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm text-green-600 font-medium">Likes: </span>
                        <span className="text-sm">{progression.userPreferences?.likes?.join(', ') || 'None yet'}</span>
                      </div>
                      <div>
                        <span className="text-sm text-red-600 font-medium">Dislikes: </span>
                        <span className="text-sm">{progression.userPreferences?.dislikes?.join(', ') || 'None yet'}</span>
                      </div>
                      <div>
                        <span className="text-sm text-purple-600 font-medium">Turn-ons: </span>
                        <span className="text-sm">{progression.userPreferences?.turnOns?.join(', ') || 'None yet'}</span>
                      </div>
                      <div>
                        <span className="text-sm text-orange-600 font-medium">Turn-offs: </span>
                        <span className="text-sm">{progression.userPreferences?.turnOffs?.join(', ') || 'None yet'}</span>
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                  <Card className="p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <ShieldCheck size={16} />
                      AI Configuration
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium">System Prompt</label>
                        <div className="mt-1 p-3 bg-muted/30 rounded text-xs text-muted-foreground max-h-20 overflow-y-auto">
                          {character.prompts?.system || '—'}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Personality Prompt</label>
                        <div className="mt-1 p-3 bg-muted/30 rounded text-xs text-muted-foreground max-h-20 overflow-y-auto">
                          {character.prompts?.personality || '—'}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Background</label>
                        <div className="mt-1 p-3 bg-muted/30 rounded text-xs text-muted-foreground max-h-20 overflow-y-auto">
                          {character.prompts?.background || '—'}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-sm font-medium">Image Prompt</label>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={handleGenerateImagePrompt}
                            disabled={isGeneratingImagePrompt}
                            className="h-6 px-2 text-xs"
                          >
                            {isGeneratingImagePrompt ? 'Generating...' : 'Generate'}
                          </Button>
                        </div>
                        <div className="mt-1 p-3 bg-muted/30 rounded text-xs text-muted-foreground max-h-20 overflow-y-auto">
                          {character.imageDescription || '—'}
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Users size={16} />
                      Character Relationships
                    </h4>
                    <div className="space-y-2">
                      {progression.bonds && Object.keys(progression.bonds).length > 0 ? (
                        Object.entries(progression.bonds).map(([charId, bond]) => (
                          <div key={charId} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                            <div>
                              <span className="text-sm font-medium">{charId.slice(0, 8)}...</span>
                              <Badge variant="outline" className="ml-2 text-xs">{bond.type}</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">{bond.strength}%</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-muted-foreground">
                          No character relationships yet
                        </div>
                      )}
                    </div>
                  </Card>
                </TabsContent>

                {/* Story Chronicle / Memories Tab */}
                <TabsContent value="memories" className="space-y-4">
                  <Card className="p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <BookOpen size={16} />
                      Story Chronicle
                    </h4>
                    <div className="space-y-3">
                      {character.progression.storyChronicle && character.progression.storyChronicle.length > 0 ? (
                        <ScrollArea className="h-64">
                          <div className="space-y-3">
                            {character.progression.storyChronicle
                              .slice()
                              .reverse() // Show most recent first
                              .map((entry) => (
                                <div key={entry.id} className="p-3 bg-muted/30 rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        {entry.eventType}
                                      </Badge>
                                      <Badge 
                                        variant={entry.significance === 'pivotal' ? 'default' : 'outline'} 
                                        className="text-xs"
                                      >
                                        {entry.significance}
                                      </Badge>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(entry.timestamp).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <h5 className="font-medium text-sm mb-1">{entry.title}</h5>
                                  <p className="text-sm text-muted-foreground mb-2">{entry.summary}</p>
                                  {entry.tags && entry.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {entry.tags.map((tag, index) => (
                                        <Badge key={index} variant="secondary" className="text-xs">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                          </div>
                        </ScrollArea>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <BookOpen size={32} className="mx-auto mb-2 opacity-50" />
                          <p>No story entries yet</p>
                          <p className="text-xs">Start conversations to build your story together</p>
                        </div>
                      )}
                    </div>
                  </Card>

                  <Card className="p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <TrendUp size={16} />
                      Emotional Journey
                    </h4>
                    <div className="space-y-3">
                      <div className="text-sm">
                        <p className="text-muted-foreground">
                          {analyzeEmotionalJourney(character)}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="font-medium">Recent Context:</span>
                          <div className="mt-1 p-2 bg-muted/30 rounded text-xs text-muted-foreground max-h-20 overflow-y-auto">
                            {getRecentStoryContext(character, 5)}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium">Story Arc:</span>
                          <div className="mt-1 p-2 bg-muted/30 rounded text-xs">
                            {character.progression.currentStoryArc || 'No active story arc'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                      </div>
                    </ScrollArea>
                  </div>
                </Tabs>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Image Detail Modal */}
        {selectedImage && (
          <Dialog
            open={!!selectedImage}
            onOpenChange={(value) => {
              if (!value) {
                setSelectedImage(null);
              }
            }}
          >
            <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Image Details</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <img
                src={selectedImage.imageUrl}
                alt={selectedImage.prompt}
                className="w-full max-h-96 object-contain rounded-lg"
              />
              <div className="space-y-2">
                <p><strong>Prompt:</strong> {selectedImage.prompt}</p>
                <p><strong>Created:</strong> {new Date(selectedImage.createdAt).toLocaleString()}</p>
                {selectedImage.tags && selectedImage.tags.length > 0 && (
                  <div>
                    <strong>Tags:</strong>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedImage.tags.map(tag => (
                        <Badge key={tag} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleDownloadImage(selectedImage)}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      
      </>
    );

  return content;
}