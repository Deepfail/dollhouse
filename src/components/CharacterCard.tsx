import React, { useMemo, useState } from 'react'

// UI (shadcn)
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs'
import { ScrollArea } from './ui/scroll-area'
import { Progress } from './ui/progress'
import { Avatar, AvatarFallback } from './ui/avatar'

// Icons (phosphor)
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
  BookOpen
} from '@phosphor-icons/react'

// If you already have a Character type elsewhere, swap this for your import.
export type Character = {
  id: string
  name: string
  description?: string
  role?: string
  rarity?: 'common' | 'rare' | 'epic' | 'legendary'
  lastInteraction?: string | number | Date
  traits?: string[]
  unlocks?: string[]
  progression?: {
    level: number
    nextLevelExp: number
    achievements: string[]
    unlockedFeatures: string[]
  }
  prompts?: {
    system?: string
    personality?: string
    background?: string
  }
  relationships?: Record<string, number>
  stats: {
    relationship: number
    happiness: number
    wet: number
    experience: number
  }
}

// If you have a real hook, import it; otherwise this keeps compile happy.
type Session = { id: string; type: 'group' | 'individual'; participantIds: string[]; messages: any[]; updatedAt: string | number | Date }
const useChatFallback = () => ({ sessions: [] as Session[] })

type Props = {
  character: Character
  onStartChat: (characterId: string) => void
  onGift?: (characterId: string) => void
  onMove?: (characterId: string) => void
  compact?: boolean
}

const getRarityIcon = (rarity?: Character['rarity']) => {
  const cls = 'w-4 h-4'
  switch (rarity) {
    case 'legendary':
      return <Crown className={cls + ' text-amber-400'} />
    case 'epic':
      return <Sparkles className={cls + ' text-purple-400'} />
    case 'rare':
      return <Trophy className={cls + ' text-blue-400'} />
    default:
      return <Lock className={cls + ' text-muted-foreground'} />
  }
}

export function CharacterCard({
  character,
  onStartChat,
  onGift,
  onMove,
  compact = false,
}: Props) {
  const [showDetails, setShowDetails] = useState(false)

  // swap this for your real hook if you have it:
  const { sessions } = useChatFallback()

  const characterSessions = useMemo(
    () => sessions.filter(s => s.participantIds?.includes(character.id) && s.messages.length > 0),
    [sessions, character.id]
  )

  const totalMessages = useMemo(
    () => characterSessions.reduce((sum, s) => sum + s.messages.filter((m: any) => m.characterId === character.id).length, 0),
    [characterSessions, character.id]
  )

  const lastInteraction = character.lastInteraction
    ? new Date(character.lastInteraction).toLocaleDateString()
    : 'Never'

  // ---- Compact card variant (optional) ----
  if (compact) {
    return (
      <Card className="p-3 hover:shadow transition cursor-pointer" onClick={() => setShowDetails(true)}>
        <div className="flex items-start gap-2">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {character.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{character.name}</span>
              {getRarityIcon(character.rarity)}
              {character.role && (
                <Badge variant="outline" className="text-[10px]">
                  {character.role}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{character.description}</p>
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2 text-[11px]">
            <Heart size={12} className="text-red-500" />
            <Progress value={character.stats.relationship} className="h-1 flex-1" />
            <span className="w-8 text-right text-muted-foreground">{character.stats.relationship}%</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <Smile size={12} className="text-yellow-500" />
            <Progress value={character.stats.happiness} className="h-1 flex-1" />
            <span className="w-8 text-right text-muted-foreground">{character.stats.happiness}%</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <Droplets size={12} className="text-pink-500" />
            <Progress value={character.stats.wet} className="h-1 flex-1" />
            <span className="w-8 text-right text-muted-foreground">{character.stats.wet}%</span>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation()
              onStartChat(character.id)
            }}
          >
            <MessageCircle size={14} className="mr-1" />
            Chat
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              onGift?.(character.id)
            }}
          >
            <Gift size={14} />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              onMove?.(character.id)
            }}
          >
            <Home size={14} />
          </Button>
        </div>

        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {character.name}
                {getRarityIcon(character.rarity)}
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="chats">Chats</TabsTrigger>
                <TabsTrigger value="progress">Progress</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[60vh] mt-4 pr-2">
                <TabsContent value="overview" className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-1">Description</h4>
                    <p className="text-sm text-muted-foreground">{character.description || '—'}</p>
                  </div>

                  {character.traits?.length ? (
                    <div>
                      <h4 className="font-medium mb-1">Traits</h4>
                      <div className="flex flex-wrap gap-1">
                        {character.traits.map((t) => (
                          <Badge key={t} variant="secondary">{t}</Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-xs">
                      <div className="mb-1 flex items-center gap-2">
                        <Heart size={12} className="text-red-500" />
                        <span>Relationship</span>
                        <span className="ml-auto text-muted-foreground">{character.stats.relationship}%</span>
                      </div>
                      <Progress value={character.stats.relationship} className="h-1.5" />
                    </div>
                    <div className="text-xs">
                      <div className="mb-1 flex items-center gap-2">
                        <Smile size={12} className="text-yellow-500" />
                        <span>Happiness</span>
                        <span className="ml-auto text-muted-foreground">{character.stats.happiness}%</span>
                      </div>
                      <Progress value={character.stats.happiness} className="h-1.5" />
                    </div>
                    <div className="text-xs">
                      <div className="mb-1 flex items-center gap-2">
                        <Droplets size={12} className="text-pink-500" />
                        <span>Wet</span>
                        <span className="ml-auto text-muted-foreground">{character.stats.wet}%</span>
                      </div>
                      <Progress value={character.stats.wet} className="h-1.5" />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="chats" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
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
                      {characterSessions.slice(0, 5).map((s) => (
                        <Card key={s.id} className="p-3 flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">
                              {s.type === 'group' ? 'Group Chat' : 'Individual Chat'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {s.messages.length} messages
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(s.updatedAt).toLocaleDateString()}
                          </div>
                        </Card>
                      ))}
                      {!characterSessions.length && (
                        <Card className="p-3 text-center text-xs text-muted-foreground">
                          No chats yet.
                        </Card>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Clock size={16} className="text-muted-foreground" />
                      <span className="text-sm font-medium">Last Interaction</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{lastInteraction}</p>
                  </div>
                </TabsContent>

                <TabsContent value="progress" className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Unlocks & Features</h4>
                    <div className="space-y-2">
                      {(character.unlocks || []).map((u) => (
                        <div key={u} className="flex items-center gap-2 p-2 bg-muted rounded">
                          <Check size={16} className="text-green-500" />
                          <span className="text-sm">{u}</span>
                        </div>
                      ))}
                      {(character.progression?.unlockedFeatures || []).map((f) => (
                        <div key={f} className="flex items-center gap-2 p-2 bg-muted rounded">
                          <Sparkles size={16} className="text-purple-500" />
                          <span className="text-sm">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Achievements</h4>
                    <div className="space-y-2">
                      {(character.progression?.achievements || []).map((a) => (
                        <div key={a} className="flex items-center gap-2 p-2 bg-muted rounded">
                          <Trophy size={16} className="text-amber-500" />
                          <span className="text-sm">{a}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Next Level Progress</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Level {character.progression?.level ?? 1}</span>
                        <span>
                          {character.stats.experience}/{character.progression?.nextLevelExp ?? 1000} XP
                        </span>
                      </div>
                      <Progress
                        value={
                          ((character.stats.experience) /
                            (character.progression?.nextLevelExp ?? 1000)) * 100
                        }
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
                        <Card className="p-3 mt-1 text-xs text-muted-foreground">
                          {character.prompts?.system || '—'}
                        </Card>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Personality Prompt</label>
                        <Card className="p-3 mt-1 text-xs text-muted-foreground">
                          {character.prompts?.personality || '—'}
                        </Card>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Background</label>
                        <Card className="p-3 mt-1 text-xs text-muted-foreground">
                          {character.prompts?.background || '—'}
                        </Card>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Relationships</h4>
                    <div className="space-y-2">
                      {Object.entries(character.relationships || {}).map(([id, level]) => (
                        <div key={id} className="flex justify-between items-center p-2 bg-muted rounded">
                          <span className="text-sm">{id.slice(0, 8)}…</span>
                          <Badge variant="outline">{level}%</Badge>
                        </div>
                      ))}
                      {!character.relationships && (
                        <Card className="p-3 text-center text-xs text-muted-foreground">
                          No relationship data.
                        </Card>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </DialogContent>
        </Dialog>
      </Card>
    )
  }

  // ---- Full card variant ----
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
          <Progress value={character.stats.relationship} className="h-1 flex-1" />
          <span className="text-muted-foreground w-8">{character.stats.relationship}%</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Smile size={12} className="text-yellow-500" />
          <Progress value={character.stats.happiness} className="h-1 flex-1" />
          <span className="text-muted-foreground w-8">{character.stats.happiness}%</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Droplets size={12} className="text-pink-500" />
          <Progress value={character.stats.wet} className="h-1 flex-1" />
          <span className="text-muted-foreground w-8">{character.stats.wet}%</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation()
            onStartChat(character.id)
          }}
        >
          <MessageCircle size={14} className="mr-1" />
          Chat
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation()
            onGift?.(character.id)
          }}
        >
          <Gift size={14} />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation()
            onMove?.(character.id)
          }}
        >
          <Home size={14} />
        </Button>
      </div>

      <div className="mt-3 pt-3 border-t border-border">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{lastInteraction}</span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-muted-foreground">Online</span>
          </div>
        </div>
      </div>

      {/* Reuse the same dialog from compact variant */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {character.name}
              {getRarityIcon(character.rarity)}
            </DialogTitle>
          </DialogHeader>

          {/* For brevity, reuse the compact dialog content */}
          {/* If you want different content here, duplicate Tabs from above and tweak */}
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="chats">Chats</TabsTrigger>
              <TabsTrigger value="progress">Progress</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <ScrollArea className="h-[60vh] mt-4 pr-2">
              {/* You could extract the TabsContent into a subcomponent to avoid duplication */}
              <TabsContent value="overview" className="space-y-4">
                <div>
                  <h4 className="font-medium mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground">{character.description || '—'}</p>
                </div>
              </TabsContent>
              <TabsContent value="chats" className="space-y-4">
                <Card className="p-3 text-center text-xs text-muted-foreground">See compact dialog for full chat stats.</Card>
              </TabsContent>
              <TabsContent value="progress" className="space-y-4">
                <Card className="p-3 text-center text-xs text-muted-foreground">See compact dialog for full progress.</Card>
              </TabsContent>
              <TabsContent value="settings" className="space-y-4">
                <Card className="p-3 text-center text-xs text-muted-foreground">See compact dialog for settings.</Card>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
