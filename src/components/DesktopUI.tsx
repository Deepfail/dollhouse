import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCharacters } from '@/hooks/useCharacters';
import { Monitor, Users, ChatCircle, Camera } from '@phosphor-icons/react';

export function DesktopUI() {
  const { characters, isLoading } = useCharacters();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading desktop...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-7xl mx-auto h-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
          {/* Left Panel - Characters */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Monitor size={20} />
              <h2 className="text-xl font-semibold">Desktop View</h2>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users size={16} />
                  Characters ({characters?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {characters?.map((character) => (
                  <div key={character.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={character.avatar} alt={character.name} />
                      <AvatarFallback className="text-xs">
                        {character.name.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{character.name}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Level {character.progression?.level || 1}</span>
                        <span>❤️ {character.stats?.love || 0}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">
                      {character.rarity}
                    </Badge>
                  </div>
                ))}

                {(!characters || characters.length === 0) && (
                  <div className="text-center text-muted-foreground py-8">
                    <Users size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No characters yet</p>
                    <p className="text-xs">Create your first character!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Center Panel - Main Desktop */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full justify-start" variant="outline">
                    <ChatCircle size={16} className="mr-2" />
                    Start Group Chat
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Camera size={16} className="mr-2" />
                    Create Scene
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Users size={16} className="mr-2" />
                    Add Character
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-muted-foreground py-8">
                    <p className="text-sm">No recent activity</p>
                    <p className="text-xs">Start interacting with your characters!</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Status Overview */}
            <Card>
              <CardHeader>
                <CardTitle>House Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500">{characters?.length || 0}</div>
                    <div className="text-xs text-muted-foreground">Characters</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">0</div>
                    <div className="text-xs text-muted-foreground">Active Chats</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-500">0</div>
                    <div className="text-xs text-muted-foreground">Scenes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-500">3</div>
                    <div className="text-xs text-muted-foreground">Rooms</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
