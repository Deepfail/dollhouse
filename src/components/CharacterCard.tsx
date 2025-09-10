import { useState } from 'react';
import { Button } from '@/components/ui/butt
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from
import { useChat } from '@/hooks/useChat';
  Heart,
  Smiley as Smile,
  Trophy,
  ChatCircle as MessageCircle,
  Home,
  BookOpe
  Crown,
  Lock,
} from '@phosphor-

  charact
  onGift
  compact?: boolean;

  const

  const cha
  );
  const 
  );
  const
    : '
  const getRarityColor = (rarit
      case 'legendary': return 'text-am

    }
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

          <DialogContent className="max-w-2xl
              <Dialog
                  <AvatarFallback className="bg-primary text-primary-foregroun
                  </AvatarFallback>
                <div>
                    <span>{character.name}</span>
     
    

                
            

              <TabsList class
                <TabsTrigger value="st
       
              
              <ScrollArea className="h-96 mt-4">
                  <div>
         
                  
                    <h4 className="font-
                  </div>
                  <div>
                    <p classNam

            
                      {character.traits.map(
                          {trait}
                      ))}
                  </div>
                  <d
                    <div className="flex flex-wrap gap-1">
                        <Badge key={cls
                  
                  

                    <Button onClick={() => onStartChat(ch
                      Start Chat
                    <Button variant="outline" onClick={() =>
                    </Button>
                      <
                  </div>

                  <d
                      
                          <Heart size={16} className="text-red-500" />
                    
              
                    <
                    <div>
                        <div cl
                          <span className="t
                        <span cla
                      <Progress value=

                  
               
                    
                      <
                  
                
               

                        <span className=
                      <div className="text-xs text-muted-foregrou
                      </div>
                    </div>
                </TabsContent>
                <TabsContent value="chats" cla
                    <Card className="p-3 text-center">
                      <div className="text-xs text-muted-foreg
                    <Card className
                      <di
                  </d
                  <div>
                    <div className="space-y-2">
                        <Card key={session.id} classN
                            <div>
                                {session
                            
                        
                            <div className="text-xs text-muted-foreground">
                            </div>
                        
                    </

                    <div cl

                    <p className="text-sm text-muted-foreground">{lastInterac
                </TabsContent>
                <TabsContent value="progress" className="space-y-4">
                    <h4 className="font-medium mb-2">Unlocks &
                      {character.unlocks.map(unlock => (
                          <Check size={16} className="text-green-500
                        </div>
                      

                          <span className="text-
                      ))}
                  </div
                  <div>
                    <div className="space-y-2">
                        
                  
                      )
                  </div>
                  <div>
                    <div
                  
                      <
                        value={(character.stats.experience / charact
                      />
                  </div>

                  <div>
                    <div className="space-y-3">
                        <label className="text-sm font-med
                          <p className="text-xs text-m
                          </p>
                      </div>
                      <div>
                        <
                          
                        

                       
                          <p className="text-xs text-muted-foregr
                          </p>
                      </div>
                  </div>
                  <div>
                    <div classNa
                        <
                          
                      ))

              </ScrollArea>
          </DialogContent>
      </motion.div>
  }
  // Full character card for 
    <motion.div
      transition={{ duration: 0.2 }}
      <Card className="p-4 ho
          <Avatar className="w-12 h-12">
              {character.name.slice(0, 2
          </Avatar>
          <div className
              <h4 className="f

              <Badge variant="outline" className="text-xs mb-2">
              </Badge>
            <p className=
            </p>
        </div>
        {/* Character Stats */}
          <div className="flex items-center gap-2 text-xs">
            <Progress value={c
              {character.stats.relationship}%
                      </div>
          <div className="flex items-center gap-2 text-xs">
            <Progress valu

          </div>
          <div className="flex items-center gap-2 text-xs">
            <Progress value={character.stats.wet} className="h-1 
              {character.stats.wet}%
          </div>

        <div className="flex gap-2">
            size="sm"
            onClick={(e) => {
              onStartChat(

            Chat
          
            size="sm"
            onClick={(e) => {
              onGift?.(character.id);
          >
          </Button>
          <Button
            variant="outline"
              e.stopPropag

            <Home size={1
        </div>
        {/* Activity Status */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <span className=
          </div>
      </Card>
      {/* Detailed Character Modal - same as compact version */}
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
            <DialogTitle cla
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













































































































































