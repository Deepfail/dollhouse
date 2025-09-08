import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useKV } from '@github/spark/hooks';
import { useHouse } from '@/hooks/useHouse';
import { CopilotUpdate } from '@/types';
import { 
  Robot, 
  Bell, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  Heart,
  Battery,
  Smile,
  Star,
  Clock
} from '@phosphor-icons/react';

export function Copilot() {
  const { house } = useHouse();
  const [updates, setUpdates] = useKV<CopilotUpdate[]>('copilot-updates', []);
  const [isOnline, setIsOnline] = useState(true);

  // Simulate copilot monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      generateCopilotUpdates();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [house.characters]);

  const generateCopilotUpdates = () => {
    const newUpdates: CopilotUpdate[] = [];

    house.characters.forEach(character => {
      // Check for low stats
      if (character.stats.energy < 30) {
        newUpdates.push({
          id: `energy-${character.id}-${Date.now()}`,
          type: 'need',
          characterId: character.id,
          message: `${character.name} is getting tired and needs rest.`,
          priority: 'medium',
          timestamp: new Date(),
          handled: false
        });
      }

      if (character.stats.happiness < 40) {
        newUpdates.push({
          id: `happiness-${character.id}-${Date.now()}`,
          type: 'need',
          characterId: character.id,
          message: `${character.name} seems a bit down. Maybe spend some time together?`,
          priority: 'medium',
          timestamp: new Date(),
          handled: false
        });
      }

      // Check for high relationship milestones
      if (character.stats.relationship >= 80 && character.stats.relationship < 85) {
        newUpdates.push({
          id: `milestone-${character.id}-${Date.now()}`,
          type: 'alert',
          characterId: character.id,
          message: `${character.name} really enjoys your company! Consider giving them a special gift.`,
          priority: 'low',
          timestamp: new Date(),
          handled: false
        });
      }
    });

    if (newUpdates.length > 0) {
      setUpdates(current => [...current, ...newUpdates].slice(-20)); // Keep last 20
    }
  };

  const handleUpdate = (updateId: string) => {
    setUpdates(current =>
      current.map(update =>
        update.id === updateId ? { ...update, handled: true } : update
      )
    );
  };

  const clearAllUpdates = () => {
    setUpdates([]);
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle size={16} className="text-red-500" />;
      case 'medium': return <Info size={16} className="text-yellow-500" />;
      default: return <CheckCircle size={16} className="text-blue-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'behavior': return <Star size={16} className="text-purple-500" />;
      case 'need': return <Heart size={16} className="text-red-500" />;
      case 'alert': return <Bell size={16} className="text-yellow-500" />;
      default: return <Info size={16} className="text-blue-500" />;
    }
  };

  const unhandledUpdates = updates.filter(u => !u.handled);

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <Robot size={24} className="text-accent" />
            {isOnline && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-card"></div>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold">House Manager</h2>
            <p className="text-sm text-muted-foreground">
              {isOnline ? 'Online & Monitoring' : 'Offline'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={unhandledUpdates.length > 0 ? 'destructive' : 'secondary'}>
            {unhandledUpdates.length} pending
          </Badge>
          {unhandledUpdates.length > 0 && (
            <Button size="sm" variant="ghost" onClick={clearAllUpdates}>
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* House Overview */}
      <div className="p-4 space-y-4">
        <div>
          <h3 className="font-medium mb-3">House Status</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Heart size={16} className="text-red-500" />
                <div>
                  <p className="font-medium">
                    {house.characters.length > 0 
                      ? Math.round(house.characters.reduce((acc, c) => acc + c.stats.relationship, 0) / house.characters.length)
                      : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Relationship</p>
                </div>
              </div>
            </Card>

            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Smile size={16} className="text-yellow-500" />
                <div>
                  <p className="font-medium">
                    {house.characters.length > 0 
                      ? Math.round(house.characters.reduce((acc, c) => acc + c.stats.happiness, 0) / house.characters.length)
                      : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Happiness</p>
                </div>
              </div>
            </Card>

            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Battery size={16} className="text-blue-500" />
                <div>
                  <p className="font-medium">
                    {house.characters.length > 0 
                      ? Math.round(house.characters.reduce((acc, c) => acc + c.stats.energy, 0) / house.characters.length)
                      : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Energy</p>
                </div>
              </div>
            </Card>

            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-purple-500" />
                <div>
                  <p className="font-medium">{house.characters.filter(c => 
                    c.lastInteraction && 
                    Date.now() - new Date(c.lastInteraction).getTime() < 24 * 60 * 60 * 1000
                  ).length}</p>
                  <p className="text-xs text-muted-foreground">Active Today</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Updates Feed */}
      <div className="flex-1 flex flex-col">
        <div className="px-4 pb-2">
          <h3 className="font-medium">Recent Updates</h3>
        </div>
        
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-2 pb-4">
            {updates.length === 0 ? (
              <Card className="p-4 text-center text-muted-foreground">
                <Robot size={24} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">All quiet for now</p>
                <p className="text-xs">I'll keep an eye on things!</p>
              </Card>
            ) : (
              updates
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map(update => {
                  const character = update.characterId 
                    ? house.characters.find(c => c.id === update.characterId)
                    : null;

                  return (
                    <Card
                      key={update.id}
                      className={`p-3 ${update.handled ? 'opacity-60' : ''} ${
                        update.priority === 'high' ? 'border-red-200' : 
                        update.priority === 'medium' ? 'border-yellow-200' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getTypeIcon(update.type)}
                        </div>
                        
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            {character && (
                              <Badge variant="outline" className="text-xs">
                                {character.name}
                              </Badge>
                            )}
                            {getPriorityIcon(update.priority)}
                          </div>
                          
                          <p className="text-sm">{update.message}</p>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {new Date(update.timestamp).toLocaleTimeString()}
                            </span>
                            
                            {!update.handled && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs"
                                onClick={() => handleUpdate(update.id)}
                              >
                                Handle
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-t border-border space-y-2">
        <h3 className="font-medium text-sm">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" className="text-xs">
            Gather All
          </Button>
          <Button size="sm" variant="outline" className="text-xs">
            Rest All
          </Button>
          <Button size="sm" variant="outline" className="text-xs">
            Feed All
          </Button>
          <Button size="sm" variant="outline" className="text-xs">
            Check Status
          </Button>
        </div>
      </div>
    </div>
  );
}