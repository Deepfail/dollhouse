import { useState } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from 'react-resizable-panels';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCharacters } from '@/hooks/useCharacters';
import { useSettings } from '@/hooks/useSettings';
import { CopilotPresets } from '@/components/CopilotPresets';
import { CharacterCreatorRepo } from '@/components/CharacterCreatorRepo';
import { MessageCircle, Settings, Plus, User } from '@phosphor-icons/react';

export function DesktopShell() {
  const { characters, isLoading } = useCharacters();
  const { setSetting } = useSettings();
  const [showCharacterCreator, setShowCharacterCreator] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<any>(null);

  // Handle panel resize to persist sizes
  const handleLayout = (sizes: number[]) => {
    setSetting({ 
      key: 'desktop_panel_sizes', 
      value: JSON.stringify(sizes) 
    });
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading characters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background">
      <ResizablePanelGroup 
        direction="horizontal" 
        onLayout={handleLayout}
        className="h-full"
      >
        {/* Left Panel - Character Roster */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
          <div className="h-full flex flex-col border-r">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Characters</h2>
                <Button 
                  size="sm" 
                  onClick={() => setShowCharacterCreator(true)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {characters.length === 0 ? (
                <div className="text-center py-8">
                  <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No characters yet</p>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCharacterCreator(true)}
                  >
                    Create Your First Character
                  </Button>
                </div>
              ) : (
                characters.map((character: any) => (
                  <Card 
                    key={character.id} 
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedCharacter?.id === character.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => setSelectedCharacter(character)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage 
                            src={character.avatar_path} 
                            alt={character.name} 
                          />
                          <AvatarFallback>
                            {character.name?.charAt(0)?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{character.name}</h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {character.bio?.substring(0, 50) || 'No bio'}
                            {character.bio?.length > 50 ? '...' : ''}
                          </p>
                          <div className="flex gap-1 mt-1">
                            {character.tags_json && JSON.parse(character.tags_json).slice(0, 2).map((tag: string) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 mt-3">
                        <Button size="sm" variant="outline" className="flex-1">
                          <MessageCircle className="w-3 h-3 mr-1" />
                          Chat
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCharacter(character);
                            setShowCharacterCreator(true);
                          }}
                        >
                          <Settings className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Middle Panel - Main Content */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col">
            <div className="p-4 border-b">
              <h1 className="text-2xl font-bold">Character House</h1>
              <p className="text-muted-foreground">
                {selectedCharacter 
                  ? `Selected: ${selectedCharacter.name}`
                  : 'Select a character from the roster or create a new one'
                }
              </p>
            </div>

            <div className="flex-1 p-4">
              {selectedCharacter ? (
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <Avatar className="w-16 h-16">
                        <AvatarImage 
                          src={selectedCharacter.avatar_path} 
                          alt={selectedCharacter.name} 
                        />
                        <AvatarFallback className="text-lg">
                          {selectedCharacter.name?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-xl">{selectedCharacter.name}</CardTitle>
                        <div className="flex gap-2 mt-2">
                          {selectedCharacter.tags_json && JSON.parse(selectedCharacter.tags_json).map((tag: string) => (
                            <Badge key={tag} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Bio</h4>
                      <p className="text-muted-foreground">{selectedCharacter.bio}</p>
                    </div>

                    {selectedCharacter.traits_json && (
                      <div>
                        <h4 className="font-medium mb-2">Traits</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(JSON.parse(selectedCharacter.traits_json)).map(([key, value]) => (
                            <div key={key} className="text-sm">
                              <span className="font-medium">{key}:</span> {String(value)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedCharacter.system_prompt && (
                      <div>
                        <h4 className="font-medium mb-2">System Prompt</h4>
                        <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                          {selectedCharacter.system_prompt}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <User className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Welcome to Character House</h3>
                    <p className="text-muted-foreground mb-4 max-w-md">
                      Create and manage your AI characters. Select a character from the roster 
                      to view details, or create a new one to get started.
                    </p>
                    <Button onClick={() => setShowCharacterCreator(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Character
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel - Copilot */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
          <div className="h-full flex flex-col border-l">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Copilot</h2>
              <p className="text-sm text-muted-foreground">AI Assistant Settings</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <CopilotPresets />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Character Creator Dialog */}
      <CharacterCreatorRepo
        open={showCharacterCreator}
        onOpenChange={(open) => {
          setShowCharacterCreator(open);
          if (!open) setSelectedCharacter(null);
        }}
        character={selectedCharacter}
      />
    </div>
  );
}