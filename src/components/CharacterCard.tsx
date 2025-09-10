import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

import {
  Heart,
  Smiley as Smile,
  ChatCircle as MessageCircle,
  Gift,
  Home,
  Trophy,
  Sparkles,
  Check,
  Clock,
  Crown,
  Lock,
  Droplets,
  BookOpen,
  Eye,
  ShieldCheck,
  Lightning,
  Star,
  Fire,
  Users,
  Calendar,
  TrendUp,
  Award
} from '@phosphor-icons/react';

import { Character } from '@/types';
import { useChat } from '@/hooks/useChat';
import { useRelationshipDynamics } from '@/hooks/useRelationshipDynamics';

interface CharacterCardProps {
  character: Character;
  onStartChat: (characterId: string) => void;
  onGift?: (characterId: string) => void;
  onMove?: (characterId: string) => void;
  compact?: boolean;
}

const getRarityIcon = (rarity?: Character['rarity']) => {
  const cls = 'w-4 h-4';
  switch (rarity) {
    case 'legendary':
      return <Crown className={cls + ' text-amber-400'} />;
    case 'epic':
      return <Sparkles className={cls + ' text-purple-400'} />;
    case 'rare':
      return <Trophy className={cls + ' text-blue-400'} />;
    default:
      return <Star className={cls + ' text-muted-foreground'} />;
  }
};

const getRelationshipStatusColor = (status: Character['relationshipDynamics']['relationshipStatus']) => {
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
  compact = false,
}: CharacterCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const { sessions } = useChat();
  const { updateRelationshipStats, checkSexualMilestones } = useRelationshipDynamics();

  // Safely access character properties with defaults
  const stats = character.stats || {
    relationship: 0,
    wet: 0,
    happiness: 0,
    experience: 0,
    level: 1
  };

  const relationshipDynamics = character.relationshipDynamics || {
    affection: 0,
    trust: 0,
    intimacy: 0,
    dominance: 50,
    jealousy: 0,
    loyalty: 0,
    possessiveness: 0,
    relationshipStatus: 'stranger' as const,
    bonds: {},
    significantEvents: [],
    userPreferences: {
      likes: [],
      dislikes: [],
      turnOns: [],
      turnOffs: []
    }
  };

  const sexualProgression = character.sexualProgression || {
    arousal: 0,
    libido: 50,
    experience: 0,
    kinks: [],
    limits: [],
    fantasies: [],
    skills: {},
    unlockedPositions: [],
    unlockedOutfits: [],
    unlockedToys: [],
    unlockedScenarios: [],
    sexualMilestones: [],
    compatibility: {
      overall: 0,
      kinkAlignment: 0,
      stylePreference: 0
    },
    memorableEvents: []
  };

  const progression = character.progression || {
    level: stats.level,
    nextLevelExp: 1000,
    unlockedFeatures: [],
    achievements: []
  };

  const characterSessions = useMemo(
    () => sessions.filter(s => s.participantIds?.includes(character.id) && s.messages.length > 0),
    [sessions, character.id]
  );

  const totalMessages = useMemo(
    () => characterSessions.reduce((sum, s) => sum + s.messages.filter((m: any) => m.characterId === character.id).length, 0),
    [characterSessions, character.id]
  );

  const lastInteraction = character.lastInteraction
    ? new Date(character.lastInteraction).toLocaleDateString()
    : 'Never';

  const relationshipStatus = relationshipDynamics.relationshipStatus;
  const achievedMilestones = sexualProgression.sexualMilestones.filter(m => m.achieved).length;
  const totalMilestones = sexualProgression.sexualMilestones.length;

  // Compact card variant for sidebar
  if (compact) {
    return (
      <>
        <Card 
          className="p-3 hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-primary/20 hover:border-l-primary"
          onClick={() => setShowDetails(true)}
        >
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 border-2 border-primary/20">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                {character.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-sm truncate">{character.name}</h4>
                {getRarityIcon(character.rarity)}
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
                  <Progress value={stats.relationship} className="h-1 flex-1" />
                  <span className="text-[9px] text-muted-foreground w-6">{stats.relationship}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Droplets size={10} className="text-pink-500" />
                  <Progress value={stats.wet} className="h-1 flex-1" />
                  <span className="text-[9px] text-muted-foreground w-6">{stats.wet}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-3 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Level {stats.level}</span>
              <span>{achievedMilestones}/{totalMilestones} milestones</span>
            </div>
          </div>
        </Card>

        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {character.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    {character.name}
                    {getRarityIcon(character.rarity)}
                  </div>
                  <div className="text-sm text-muted-foreground font-normal">
                    {relationshipStatus.replace('_', ' ')} • Level {stats.level}
                  </div>
                </div>
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="overview" className="mt-4">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="relationship">Relationship</TabsTrigger>
                <TabsTrigger value="sexual">Sexual</TabsTrigger>
                <TabsTrigger value="chats">Chats</TabsTrigger>
                <TabsTrigger value="progress">Progress</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[60vh] mt-4 pr-4">
                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="p-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <BookOpen size={16} />
                        Character Info
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Description</label>
                          <p className="text-sm mt-1">{character.description || '—'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Role</label>
                          <p className="text-sm mt-1">{character.role || '—'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Traits</label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {character.traits?.length ? character.traits.map((trait) => (
                              <Badge key={trait} variant="secondary" className="text-xs">{trait}</Badge>
                            )) : <span className="text-sm text-muted-foreground">—</span>}
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <TrendUp size={16} />
                        Stats Overview
                      </h4>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <Heart size={12} className="text-red-500" />
                              Relationship
                            </span>
                            <span className="font-medium">{stats.relationship}%</span>
                          </div>
                          <Progress value={stats.relationship} className="h-2" />
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <Droplets size={12} className="text-pink-500" />
                              Arousal
                            </span>
                            <span className="font-medium">{stats.wet}%</span>
                          </div>
                          <Progress value={stats.wet} className="h-2" />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <Smile size={12} className="text-yellow-500" />
                              Happiness
                            </span>
                            <span className="font-medium">{stats.happiness}%</span>
                          </div>
                          <Progress value={stats.happiness} className="h-2" />
                        </div>
                      </div>
                    </Card>
                  </div>

                  <Card className="p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Users size={16} />
                      Quick Actions
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => onStartChat(character.id)}>
                        <MessageCircle size={14} className="mr-2" />
                        Start Chat
                      </Button>
                      {onGift && (
                        <Button size="sm" variant="outline" onClick={() => onGift(character.id)}>
                          <Gift size={14} className="mr-2" />
                          Give Gift
                        </Button>
                      )}
                      {onMove && (
                        <Button size="sm" variant="outline" onClick={() => onMove(character.id)}>
                          <Home size={14} className="mr-2" />
                          Move Room
                        </Button>
                      )}
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="relationship" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="p-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Heart size={16} />
                        Relationship Dynamics
                      </h4>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Affection</span>
                            <span className="font-medium">{relationshipDynamics.affection || 0}%</span>
                          </div>
                          <Progress value={relationshipDynamics.affection || 0} className="h-2" />
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Trust</span>
                            <span className="font-medium">{relationshipDynamics.trust || 0}%</span>
                          </div>
                          <Progress value={relationshipDynamics.trust || 0} className="h-2" />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Intimacy</span>
                            <span className="font-medium">{relationshipDynamics.intimacy || 0}%</span>
                          </div>
                          <Progress value={relationshipDynamics.intimacy || 0} className="h-2" />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Loyalty</span>
                            <span className="font-medium">{relationshipDynamics.loyalty || 0}%</span>
                          </div>
                          <Progress value={relationshipDynamics.loyalty || 0} className="h-2" />
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Star size={16} />
                        Relationship Status
                      </h4>
                      <div className="space-y-3">
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <div className={`text-2xl font-bold ${getRelationshipStatusColor(relationshipStatus)}`}>
                            {relationshipStatus.replace('_', ' ').toUpperCase()}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">Current Status</div>
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <h5 className="font-medium mb-2">Preferences</h5>
                          <div className="space-y-2">
                            <div>
                              <span className="text-sm text-green-600">Likes: </span>
                              <span className="text-sm">{relationshipDynamics.userPreferences.likes.join(', ') || 'None yet'}</span>
                            </div>
                            <div>
                              <span className="text-sm text-red-600">Dislikes: </span>
                              <span className="text-sm">{relationshipDynamics.userPreferences.dislikes.join(', ') || 'None yet'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>

                  <Card className="p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Calendar size={16} />
                      Recent Events
                    </h4>
                    <div className="space-y-2">
                      {relationshipDynamics.significantEvents?.slice(0, 5).map((event) => (
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
                          No relationship events yet
                        </div>
                      )}
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="sexual" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="p-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Fire size={16} />
                        Sexual Stats
                      </h4>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Arousal</span>
                            <span className="font-medium">{sexualProgression.arousal || 0}%</span>
                          </div>
                          <Progress value={sexualProgression.arousal || 0} className="h-2" />
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Libido</span>
                            <span className="font-medium">{sexualProgression.libido || 0}%</span>
                          </div>
                          <Progress value={sexualProgression.libido || 0} className="h-2" />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Experience</span>
                            <span className="font-medium">{sexualProgression.experience || 0}%</span>
                          </div>
                          <Progress value={sexualProgression.experience || 0} className="h-2" />
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Award size={16} />
                        Milestones
                      </h4>
                      <div className="space-y-2">
                        {sexualProgression.sexualMilestones?.map((milestone) => (
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
                  </div>

                  <Card className="p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Lightning size={16} />
                      Unlocked Content
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium mb-2">Positions</h5>
                        <div className="flex flex-wrap gap-1">
                          {sexualProgression.unlockedPositions?.map((position) => (
                            <Badge key={position} variant="secondary" className="text-xs">{position}</Badge>
                          )) || <span className="text-sm text-muted-foreground">None</span>}
                        </div>
                      </div>
                      <div>
                        <h5 className="font-medium mb-2">Scenarios</h5>
                        <div className="flex flex-wrap gap-1">
                          {sexualProgression.unlockedScenarios?.map((scenario) => (
                            <Badge key={scenario} variant="secondary" className="text-xs">{scenario}</Badge>
                          )) || <span className="text-sm text-muted-foreground">None</span>}
                        </div>
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="chats" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-4 text-center">
                      <div className="text-3xl font-bold text-primary">{characterSessions.length}</div>
                      <div className="text-sm text-muted-foreground">Conversations</div>
                    </Card>
                    <Card className="p-4 text-center">
                      <div className="text-3xl font-bold text-primary">{totalMessages}</div>
                      <div className="text-sm text-muted-foreground">Messages</div>
                    </Card>
                  </div>

                  <Card className="p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <MessageCircle size={16} />
                      Recent Chats
                    </h4>
                    <div className="space-y-2">
                      {characterSessions.slice(0, 8).map((session) => (
                        <div key={session.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div>
                            <div className="text-sm font-medium">
                              {session.type === 'group' ? 'Group Chat' : 'Individual Chat'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {session.messages.length} messages
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(session.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                      {!characterSessions.length && (
                        <div className="text-center py-8 text-muted-foreground">
                          No chats yet. Start a conversation!
                        </div>
                      )}
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock size={16} />
                      <span className="font-semibold">Last Interaction</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{lastInteraction}</p>
                  </Card>
                </TabsContent>

                <TabsContent value="progress" className="space-y-4">
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
                        <Sparkles size={16} />
                        Achievements
                      </h4>
                      <div className="space-y-2">
                        {progression.achievements?.map((achievement) => (
                          <div key={achievement} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                            <Award size={16} className="text-amber-500" />
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

                  <Card className="p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Check size={16} />
                      Unlocked Features
                    </h4>
                    <div className="space-y-2">
                      {progression.unlockedFeatures?.map((feature) => (
                        <div key={feature} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                          <Sparkles size={16} className="text-purple-500" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      )) || (
                        <div className="text-center py-4 text-muted-foreground">
                          No special features unlocked yet
                        </div>
                      )}
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
                    </div>
                  </Card>

                  <Card className="p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Users size={16} />
                      Character Relationships
                    </h4>
                    <div className="space-y-2">
                      {relationshipDynamics.bonds && Object.keys(relationshipDynamics.bonds).length > 0 ? (
                        Object.entries(relationshipDynamics.bonds).map(([charId, bond]) => (
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
              </ScrollArea>
            </Tabs>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Full card variant (not currently used but kept for flexibility)
  return (
    <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setShowDetails(true)}>
      <div className="flex items-start gap-3 mb-4">
        <Avatar className="w-12 h-12">
          <AvatarFallback className="bg-primary text-primary-foreground">
            {character.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium">{character.name}</h4>
            {getRarityIcon(character.rarity)}
            {character.role && (
              <Badge variant="outline" className="text-xs">
                {character.role}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {character.description}
          </p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-xs">
          <Heart size={12} className="text-red-500" />
          <Progress value={stats.relationship} className="h-1 flex-1" />
          <span className="text-muted-foreground w-8">{stats.relationship}%</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Smile size={12} className="text-yellow-500" />
          <Progress value={stats.happiness} className="h-1 flex-1" />
          <span className="text-muted-foreground w-8">{stats.happiness}%</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Droplets size={12} className="text-pink-500" />
          <Progress value={stats.wet} className="h-1 flex-1" />
          <span className="text-muted-foreground w-8">{stats.wet}%</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation();
            onStartChat(character.id);
          }}
        >
          <MessageCircle size={14} className="mr-1" />
          Chat
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onGift?.(character.id);
          }}
        >
          <Gift size={14} />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onMove?.(character.id);
          }}
        >
          <Home size={14} />
        </Button>
      </div>
    </Card>
  );
}