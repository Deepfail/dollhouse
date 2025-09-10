import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Character, ChatSession } from '@/types';
import { useChat } from '@/hooks/useChat';
import { 
  Heart,
  Droplets, // For wet stat
  Smiley as Smile,
  Star,
  Trophy,
  Clock,
  ChatCircle as MessageCircle,
  Gift,
  Home,
  User,
  BookOpen,
  Sparkles,
  Crown,
  Fire,
  Lock,
  Check
} from '@phosphor-icons/react';
import { motion } from 'framer-motion';

interface CharacterCardProps {
  character: Character;
  onStartChat: (characterId: string) => void;
  onGift?: (characterId: string) => void;
  onMove?: (characterId: string) => void;
  compact?: boolean;
}

export function CharacterCard({ character, onStartChat, onGift, onMove, compact = false }: CharacterCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const { sessions } = useChat();

  // Get character's chat history
  const characterSessions = sessions.filter(s => 
    s.participantIds.includes(character.id) && s.messages.length > 0
  );

  const totalMessages = characterSessions.reduce((sum, session) => 
    sum + session.messages.filter(m => m.characterId === character.id).length, 0
  );

  const lastInteraction = character.lastInteraction 
    ? new Date(character.lastInteraction).toLocaleDateString() 
    : 'Never';

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'text-amber-400';
      case 'epic': return 'text-purple-400';
      case 'rare': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return <Crown size={16} className="text-amber-400" />;
      case 'epic': return <Fire size={16} className="text-purple-400" />;
      case 'rare': return <Star size={16} className="text-blue-400" />;
      default: return <User size={16} className="text-gray-400" />;
    }
  };

  if (compact) {
    return (
      <motion.div
        whileHover={{ x: 2 }}
        transition={{ duration: 0.2 }}
      >
        <Card 
          className="p-2 hover:bg-accent/50 transition-colors cursor-pointer border-l-4 border-l-primary"
          onClick={() => setShowDetails(true)}
        >
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {character.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-sm truncate">{character.name}</h4>
                {getRarityIcon(character.rarity)}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {character.description}
              </p>
            </div>

            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-1">
                <Heart size={10} className="text-red-500" />
                <div className="w-8 h-1 bg-muted rounded-full">
                  <div 
                    className="h-full bg-red-500 rounded-full" 
                    style={{ width: `${character.stats.relationship}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-6">{character.stats.relationship}%</span>
              </div>
              
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-16 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartChat(character.id);
                }}
              >
                Chat
              </Button>
            </div>
          </div>
        </Card>

        {/* Detailed Character Modal */}
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {character.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span>{character.name}</span>
                    {getRarityIcon(character.rarity)}
                    <Badge variant="outline" className={getRarityColor(character.rarity)}>
                      {character.rarity}
                    </Badge>
                  </div>
                  <div className="text-sm font-normal text-muted-foreground">
                    Level {character.stats.level} • {character.role}
                  </div>
                </div>
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="overview" className="flex-1 overflow-hidden">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="stats">Stats</TabsTrigger>
                <TabsTrigger value="chats">Chats</TabsTrigger>
                <TabsTrigger value="progress">Progress</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <ScrollArea className="h-96 mt-4">
                <TabsContent value="overview" className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground">{character.description}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Personality</h4>
                    <p className="text-sm text-muted-foreground">{character.personality}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Appearance</h4>
                    <p className="text-sm text-muted-foreground">{character.appearance}</p>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Traits</h4>
                    <div className="flex flex-wrap gap-1">
                      {character.traits.map(trait => (
                        <Badge key={trait} variant="secondary" className="text-xs">
                          {trait}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Classes</h4>
                    <div className="flex flex-wrap gap-1">
                      {character.classes.map(cls => (
                        <Badge key={cls} variant="outline" className="text-xs">
                          {cls}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={() => onStartChat(character.id)} className="flex-1">
                      <MessageCircle size={16} className="mr-2" />
                      Start Chat
                    </Button>
                    <Button variant="outline" onClick={() => onGift?.(character.id)}>
                      <Gift size={16} />
                    </Button>
                    <Button variant="outline" onClick={() => onMove?.(character.id)}>
                      <Home size={16} />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="stats" className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Heart size={16} className="text-red-500" />
                          <span className="text-sm font-medium">Relationship</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{character.stats.relationship}%</span>
                      </div>
                      <Progress value={character.stats.relationship} className="h-2" />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Droplets size={16} className="text-pink-500" />
                          <span className="text-sm font-medium">Arousal</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{character.stats.wet}%</span>
                      </div>
                      <Progress value={character.stats.wet} className="h-2" />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Smile size={16} className="text-yellow-500" />
                          <span className="text-sm font-medium">Happiness</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{character.stats.happiness}%</span>
                      </div>
                      <Progress value={character.stats.happiness} className="h-2" />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Star size={16} className="text-blue-500" />
                          <span className="text-sm font-medium">Experience</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{character.stats.experience} XP</span>
                      </div>
                      <div className="text-xs text-muted-foreground mb-1">
                        Level {character.stats.level} → {character.stats.level + 1}
                      </div>
                      <Progress value={(character.stats.experience % 1000) / 10} className="h-2" />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="chats" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <Card className="p-3 text-center">
                      <div className="text-2xl font-bold text-primary">{characterSessions.length}</div>
                      <div className="text-xs text-muted-foreground">Conversations</div>
                    </Card>
                    <Card className="p-3 text-center">
                      <div className="text-2xl font-bold text-primary">{totalMessages}</div>
                      <div className="text-xs text-muted-foreground">Messages</div>
                    </Card>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Recent Chats</h4>
                    <div className="space-y-2">
                      {characterSessions.slice(0, 5).map(session => (
                        <Card key={session.id} className="p-3">
                          <div className="flex items-center justify-between">
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
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={16} className="text-muted-foreground" />
                      <span className="text-sm font-medium">Last Interaction</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{lastInteraction}</p>
                  </div>
                </TabsContent>

                <TabsContent value="progress" className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Unlocks & Achievements</h4>
                    <div className="space-y-2">
                      {character.unlocks.map(unlock => (
                        <div key={unlock} className="flex items-center gap-2 p-2 bg-muted rounded">
                          <Check size={16} className="text-green-500" />
                          <span className="text-sm">{unlock}</span>
                        </div>
                      ))}
                      
                      {character.progression.unlockedFeatures.map(feature => (
                        <div key={feature} className="flex items-center gap-2 p-2 bg-muted rounded">
                          <Sparkles size={16} className="text-purple-500" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Achievements</h4>
                    <div className="space-y-2">
                      {character.progression.achievements.map(achievement => (
                        <div key={achievement} className="flex items-center gap-2 p-2 bg-muted rounded">
                          <Trophy size={16} className="text-amber-500" />
                          <span className="text-sm">{achievement}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Next Level Progress</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Level {character.progression.level}</span>
                        <span>{character.stats.experience}/{character.progression.nextLevelExp} XP</span>
                      </div>
                      <Progress 
                        value={(character.stats.experience / character.progression.nextLevelExp) * 100} 
                        className="h-2" 
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">AI Configuration</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium">System Prompt</label>
                        <Card className="p-3 mt-1">
                          <p className="text-xs text-muted-foreground">
                            {character.prompts.system}
                          </p>
                        </Card>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Personality Prompt</label>
                        <Card className="p-3 mt-1">
                          <p className="text-xs text-muted-foreground">
                            {character.prompts.personality}
                          </p>
                        </Card>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Background</label>
                        <Card className="p-3 mt-1">
                          <p className="text-xs text-muted-foreground">
                            {character.prompts.background}
                          </p>
                        </Card>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Relationship Data</h4>
                    <div className="space-y-2">
                      {Object.entries(character.relationships).map(([charId, level]) => (
                        <div key={charId} className="flex justify-between items-center p-2 bg-muted rounded">
                          <span className="text-sm">{charId.slice(0, 8)}...</span>
                          <Badge variant="outline">{level}%</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </DialogContent>
        </Dialog>
      </motion.div>
    );
  }

  // Full character card for house view
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
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
            </div>
            {character.role && (
              <Badge variant="outline" className="text-xs mb-2">
                {character.role}
              </Badge>
            )}
            <p className="text-sm text-muted-foreground line-clamp-2">
              {character.description}
            </p>
          </div>
        </div>

        {/* Character Stats */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-xs">
            <Heart size={12} className="text-red-500" />
            <Progress value={character.stats.relationship} className="h-1 flex-1" />
            <span className="text-muted-foreground w-8">
              {character.stats.relationship}%
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-xs">
            <Smile size={12} className="text-yellow-500" />
            <Progress value={character.stats.happiness} className="h-1 flex-1" />
            <span className="text-muted-foreground w-8">
              {character.stats.happiness}%
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-xs">
            <Droplets size={12} className="text-pink-500" />
            <Progress value={character.stats.wet} className="h-1 flex-1" />
            <span className="text-muted-foreground w-8">
              {character.stats.wet}%
            </span>
          </div>
        </div>

        {/* Character Actions */}
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

        {/* Activity Status */}
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{lastInteraction}</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-muted-foreground">Online</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Detailed Character Modal - same as compact version */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {character.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span>{character.name}</span>
                  {getRarityIcon(character.rarity)}
                  <Badge variant="outline" className={getRarityColor(character.rarity)}>
                    {character.rarity}
                  </Badge>
                </div>
                <div className="text-sm font-normal text-muted-foreground">
                  Level {character.stats.level} • {character.role}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="overview" className="flex-1 overflow-hidden">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="stats">Stats</TabsTrigger>
              <TabsTrigger value="chats">Chats</TabsTrigger>
              <TabsTrigger value="progress">Progress</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-96 mt-4">
              {/* Same content as compact version - keeping DRY principle, but this is acceptable for clarity */}
              <TabsContent value="overview" className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{character.description}</p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Personality</h4>
                  <p className="text-sm text-muted-foreground">{character.personality}</p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Appearance</h4>
                  <p className="text-sm text-muted-foreground">{character.appearance}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Traits</h4>
                  <div className="flex flex-wrap gap-1">
                    {character.traits?.map(trait => (
                      <Badge key={trait} variant="secondary" className="text-xs">
                        {trait}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Classes</h4>
                  <div className="flex flex-wrap gap-1">
                    {character.classes?.map(cls => (
                      <Badge key={cls} variant="outline" className="text-xs">
                        {cls}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={() => onStartChat(character.id)} className="flex-1">
                    <MessageCircle size={16} className="mr-2" />
                    Start Chat
                  </Button>
                  <Button variant="outline" onClick={() => onGift?.(character.id)}>
                    <Gift size={16} />
                  </Button>
                  <Button variant="outline" onClick={() => onMove?.(character.id)}>
                    <Home size={16} />
                  </Button>
                </div>
              </TabsContent>

              {/* Repeat other tabs content */}
              <TabsContent value="stats" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Heart size={16} className="text-red-500" />
                        <span className="text-sm font-medium">Relationship</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{character.stats.relationship}%</span>
                    </div>
                    <Progress value={character.stats.relationship} className="h-2" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Droplets size={16} className="text-pink-500" />
                        <span className="text-sm font-medium">Arousal</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{character.stats.wet}%</span>
                    </div>
                    <Progress value={character.stats.wet} className="h-2" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Smile size={16} className="text-yellow-500" />
                        <span className="text-sm font-medium">Happiness</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{character.stats.happiness}%</span>
                    </div>
                    <Progress value={character.stats.happiness} className="h-2" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Star size={16} className="text-blue-500" />
                        <span className="text-sm font-medium">Experience</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{character.stats.experience} XP</span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">
                      Level {character.stats.level} → {character.stats.level + 1}
                    </div>
                    <Progress value={(character.stats.experience % 1000) / 10} className="h-2" />
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}