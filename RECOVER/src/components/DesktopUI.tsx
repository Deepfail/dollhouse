import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { useChat } from '@/hooks/useChat';
import { Character } from '@/types';
import { CharacterCard } from './CharacterCard';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  House as Home, 
  Plus, 
  Users, 
  ChatCircle as MessageCircle, 
  Heart,
  Drop,
  Smiley as Smile,
  Gift,
  Clock,
  Calendar,
  TrendUp,
  Notification,
  Camera,
  MapPin,
  Gear as Settings,
  Minus,
  Square,
  X
} from '@phosphor-icons/react';

interface Widget {
  id: string;
  title: string;
  type: 'character-circle' | 'stats' | 'activity' | 'clock' | 'weather' | 'calendar' | 'quick-actions';
  position: { x: number; y: number };
  size: { width: number; height: number };
  isMinimized: boolean;
  data?: any;
}

export function DesktopUI() {
  const { house } = useHouseFileStorage();
  const { sessions } = useChat();
  const [time, setTime] = useState(new Date());
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([
    {
      id: 'characters',
      title: 'Characters',
      type: 'character-circle',
      position: { x: 20, y: 20 },
      size: { width: 300, height: 200 },
      isMinimized: false
    },
    {
      id: 'activity',
      title: 'Recent Activity',
      type: 'activity',
      position: { x: 340, y: 20 },
      size: { width: 350, height: 200 },
      isMinimized: false
    },
    {
      id: 'stats',
      title: 'House Stats',
      type: 'stats',
      position: { x: 710, y: 20 },
      size: { width: 280, height: 200 },
      isMinimized: false
    },
    {
      id: 'clock',
      title: 'Clock',
      type: 'clock',
      position: { x: 20, y: 240 },
      size: { width: 200, height: 120 },
      isMinimized: false
    },
    {
      id: 'quick-actions',
      title: 'Quick Actions',
      type: 'quick-actions',
      position: { x: 240, y: 240 },
      size: { width: 300, height: 120 },
      isMinimized: false
    }
  ]);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const moveWidget = (id: string, position: { x: number; y: number }) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, position } : w));
  };

  const toggleMinimize = (id: string) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, isMinimized: !w.isMinimized } : w));
  };

  const getCharacterStats = (character: Character) => {
    const stats = character.stats;
    if (!stats) return null;
    
    return {
      happiness: stats.happiness || 0,
      arousal: stats.wet || 0,
      energy: stats.stamina || 0,
      relationship: stats.love || 0
    };
  };

  const renderWidget = (widget: Widget) => {
    const isMinimized = widget.isMinimized;
    
    return (
      <motion.div
        key={widget.id}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          position: 'absolute',
          left: widget.position.x,
          top: widget.position.y,
          width: isMinimized ? 200 : widget.size.width,
          height: isMinimized ? 40 : widget.size.height,
          zIndex: 10
        }}
        drag
        dragMomentum={false}
        onDragEnd={(_, info) => {
          moveWidget(widget.id, {
            x: widget.position.x + info.offset.x,
            y: widget.position.y + info.offset.y
          });
        }}
        className="cursor-move"
      >
        <Card className="h-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border shadow-lg hover:shadow-xl transition-all">
          {/* Widget Header */}
          <div className="flex items-center justify-between p-3 border-b bg-gray-50/50 dark:bg-gray-700/50">
            <h3 className="font-semibold text-sm">{widget.title}</h3>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => toggleMinimize(widget.id)}
                className="h-6 w-6 p-0"
              >
                {isMinimized ? <Square size={12} /> : <Minus size={12} />}
              </Button>
            </div>
          </div>

          {/* Widget Content */}
          {!isMinimized && (
            <div className="p-3 h-[calc(100%-48px)] overflow-hidden">
              {widget.type === 'character-circle' && (
                <div className="grid grid-cols-3 gap-3 h-full">
                  {house.characters?.slice(0, 9).map((character) => {
                    const stats = getCharacterStats(character);
                    return (
                      <motion.div
                        key={character.id}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex flex-col items-center gap-1 cursor-pointer"
                        onClick={() => setSelectedCharacter(character)}
                      >
                        <div className="relative">
                          <Avatar className="w-12 h-12 border-2 border-white shadow-md">
                            <AvatarImage src={character.avatar} alt={character.name} />
                            <AvatarFallback className="text-xs">
                              {character.name.slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          {stats && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white"
                              style={{
                                backgroundColor: stats.happiness > 70 ? '#22c55e' : 
                                               stats.happiness > 40 ? '#eab308' : '#ef4444'
                              }}
                            />
                          )}
                        </div>
                        <span className="text-xs font-medium text-center truncate w-full">
                          {character.name}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {widget.type === 'activity' && (
                <ScrollArea className="h-full">
                  <div className="space-y-2">
                    {sessions.slice(0, 5).map((session) => (
                      <div key={session.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <MessageCircle size={16} className="text-blue-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {session.type === 'group' ? 'Group Chat' : 'Individual Chat'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {session.messages[session.messages.length - 1]?.content || 'No messages yet'}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {session.messages.length}
                        </Badge>
                      </div>
                    ))}
                    {sessions.length === 0 && (
                      <div className="text-center text-muted-foreground text-sm">
                        No recent activity
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}

              {widget.type === 'stats' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Characters</span>
                    <span className="font-semibold">{house.characters?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Rooms</span>
                    <span className="font-semibold">{house.rooms?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Currency</span>
                    <span className="font-semibold">${house.currency || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Active Chats</span>
                    <span className="font-semibold">{sessions.length}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <TrendUp size={16} className="text-green-500" />
                      <span className="text-sm text-green-600 dark:text-green-400">
                        House thriving
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {widget.type === 'clock' && (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-2xl font-bold">
                    {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {time.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                  </div>
                </div>
              )}

              {widget.type === 'quick-actions' && (
                <div className="grid grid-cols-2 gap-2 h-full">
                  <Button variant="outline" className="flex flex-col gap-1 h-full">
                    <Plus size={20} />
                    <span className="text-xs">Add Character</span>
                  </Button>
                  <Button variant="outline" className="flex flex-col gap-1 h-full">
                    <Home size={20} />
                    <span className="text-xs">Add Room</span>
                  </Button>
                  <Button variant="outline" className="flex flex-col gap-1 h-full">
                    <Camera size={20} />
                    <span className="text-xs">Create Scene</span>
                  </Button>
                  <Button variant="outline" className="flex flex-col gap-1 h-full">
                    <Settings size={20} />
                    <span className="text-xs">Settings</span>
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      </motion.div>
    );
  };

  return (
    <>
      {/* Desktop Background */}
      <div className="h-full w-full bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 relative overflow-hidden">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, white 2px, transparent 2px),
                             radial-gradient(circle at 75% 75%, white 2px, transparent 2px)`,
            backgroundSize: '100px 100px'
          }} />
        </div>

        {/* Desktop Widgets */}
        <div className="relative h-full w-full">
          {widgets.map(renderWidget)}
        </div>

        {/* Desktop Taskbar */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-black/20 backdrop-blur-md border-t border-white/20">
          <div className="flex items-center justify-between h-full px-4">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">
                <Home size={16} className="mr-2" />
                Dollhouse
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-white/20 text-white">
                {house.characters?.length || 0} Characters
              </Badge>
              <Badge variant="secondary" className="bg-white/20 text-white">
                {sessions.length} Active Chats
              </Badge>
            </div>
            
            <div className="text-white text-sm">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>

      {/* Character Detail Modal */}
      <Dialog open={!!selectedCharacter} onOpenChange={() => setSelectedCharacter(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Character Details</DialogTitle>
          </DialogHeader>
          {selectedCharacter && (
            <div className="p-4">
              <CharacterCard
                character={selectedCharacter}
                onStartChat={() => {
                  // Handle chat start
                  setSelectedCharacter(null);
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}