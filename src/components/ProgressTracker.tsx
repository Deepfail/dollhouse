import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Heart, 
  Trophy, 
  Star, 
  Lock, 
  Check, 
  Fire, 
  Sparkle,
  TrendUp,
  Calendar,
  Brain
} from '@phosphor-icons/react';
import { Character } from '@/types';

interface ProgressTrackerProps {
  character: Character;
}

export function ProgressTracker({ character }: ProgressTrackerProps) {
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

  const relationshipStatus = relationshipDynamics.relationshipStatus;
  const sexualMilestones = sexualProgression.sexualMilestones;
  const achievedMilestones = sexualMilestones.filter(m => m.achieved);
  const nextMilestone = sexualMilestones.find(m => !m.achieved);
  
  const recentEvents = [
    ...relationshipDynamics.significantEvents,
    ...sexualProgression.memorableEvents
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);

  const getStatusColor = (status: string) => {
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

  const getProgressToNextLevel = () => {
    const current = stats.love;
    if (current >= 80) return 100;
    if (current >= 60) return ((current - 60) / 20) * 100;
    if (current >= 40) return ((current - 40) / 20) * 100;
    if (current >= 25) return ((current - 25) / 15) * 100;
    if (current >= 10) return ((current - 10) / 15) * 100;
    return (current / 10) * 100;
  };

  const getNextLevelName = () => {
    const current = stats.love;
    if (current >= 80) return 'Devoted (Max)';
    if (current >= 60) return 'Devoted';
    if (current >= 40) return 'Lover';
    if (current >= 25) return 'Romantic Interest';
    if (current >= 10) return 'Close Friend';
    return 'Friend';
  };

  return (
    <div className="space-y-4">
      {/* Current Relationship Status */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Relationship Status
          </h3>
          <Badge variant="outline" className={getStatusColor(relationshipStatus)}>
            {relationshipStatus.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
        
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Progress to {getNextLevelName()}</span>
              <span>{stats.love}%</span>
            </div>
            <Progress value={getProgressToNextLevel()} className="h-2" />
          </div>
          
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-lg font-bold text-red-500">{relationshipDynamics.affection}</div>
              <div className="text-xs text-muted-foreground">Affection</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-500">{relationshipDynamics.trust}</div>
              <div className="text-xs text-muted-foreground">Trust</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-500">{relationshipDynamics.intimacy}</div>
              <div className="text-xs text-muted-foreground">Intimacy</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Sexual Progression */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Fire className="w-5 h-5 text-pink-500" />
            Sexual Progression
          </h3>
          <Badge variant="outline">
            {achievedMilestones.length}/{sexualMilestones.length} Milestones
          </Badge>
        </div>
        
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-lg font-bold text-pink-500">{stats.wet}</div>
              <div className="text-xs text-muted-foreground">Arousal</div>
            </div>
            <div>
              <div className="text-lg font-bold text-orange-500">{sexualProgression.libido}</div>
              <div className="text-xs text-muted-foreground">Libido</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-500">{sexualProgression.experience}</div>
              <div className="text-xs text-muted-foreground">Experience</div>
            </div>
          </div>
          
          {nextMilestone && (
            <div className="border rounded-lg p-3 bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-sm">Next Milestone</span>
              </div>
              <div className="text-sm text-muted-foreground">{nextMilestone.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{nextMilestone.description}</div>
              
              {nextMilestone.requiredStats && (
                <div className="mt-2 space-y-1">
                  {Object.entries(nextMilestone.requiredStats).map(([stat, required]) => {
                    let current = 0;
                    if (stat === 'relationship') current = stats.love;
                    else if (stat === 'wet') current = stats.wet;
                    else if (stat === 'trust') current = relationshipDynamics.trust;
                    else if (stat === 'intimacy') current = relationshipDynamics.intimacy;
                    
                    const progress = (current / required) * 100;
                    
                    return (
                      <div key={stat} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="capitalize">{stat}</span>
                          <span>{current}/{required}</span>
                        </div>
                        <Progress value={Math.min(100, progress)} className="h-1" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Achievements & Milestones */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold">Achievements</h3>
        </div>
        
        <ScrollArea className="h-32">
          <div className="space-y-2 pr-2">
            {achievedMilestones.map((milestone) => (
              <div key={milestone.id} className="flex items-center gap-2 p-2 bg-green-500/10 rounded border border-green-500/20">
                <Check className="w-4 h-4 text-green-500" />
                <div className="flex-1">
                  <div className="text-sm font-medium">{milestone.name}</div>
                  <div className="text-xs text-muted-foreground">{milestone.description}</div>
                </div>
                {milestone.achievedAt && (
                  <div className="text-xs text-muted-foreground">
                    {new Date(milestone.achievedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
            
            {progression.achievements?.map((achievement) => (
              <div key={achievement} className="flex items-center gap-2 p-2 bg-amber-500/10 rounded border border-amber-500/20">
                <Star className="w-4 h-4 text-amber-500" />
                <div className="text-sm font-medium">{achievement}</div>
              </div>
            ))}
            
            {achievedMilestones.length === 0 && !progression.achievements?.length && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No achievements yet. Keep building your relationship!
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Recent Events */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold">Recent Events</h3>
        </div>
        
        <ScrollArea className="h-32">
          <div className="space-y-2 pr-2">
            {recentEvents.map((event) => (
              <div key={event.id} className="flex items-start gap-3 p-2 bg-muted/30 rounded">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium line-clamp-2">{event.description}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(event.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
            
            {recentEvents.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No recent events. Start chatting to build memories!
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Character Memories */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-5 h-5 text-purple-500" />
          <h3 className="font-semibold">Memories</h3>
        </div>
        
        <ScrollArea className="h-32">
          <div className="space-y-2 pr-2">
            {character.memories && character.memories.length > 0 ? (
              character.memories
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 5)
                .map((memory) => {
                  const categoryEmoji = {
                    personal: '👤',
                    relationship: '❤️',
                    sexual: '🔥',
                    preferences: '⭐',
                    events: '📅'
                  }[memory.category] || '💭';

                  const importanceColor = {
                    high: 'border-red-500/20 bg-red-500/5',
                    medium: 'border-blue-500/20 bg-blue-500/5',
                    low: 'border-gray-500/20 bg-gray-500/5'
                  }[memory.importance] || 'border-gray-500/20 bg-gray-500/5';

                  return (
                    <div key={memory.id} className={`flex items-start gap-3 p-2 rounded border ${importanceColor}`}>
                      <div className="text-sm mt-0.5">{categoryEmoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm">{memory.content}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(memory.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  );
                })
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No memories yet. Start chatting to build memories!
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}