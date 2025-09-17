import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Character } from '@/types';
import { ChatCircle, Gear, Gift, Heart, Lightning, Star, Trash } from '@phosphor-icons/react';

interface CharacterCardProps {
  character: Character;
  onStartChat?: (characterId: string) => void;
  onDelete?: (characterId: string) => void;
  onEdit?: (character: Character | null) => void;
  onGift?: (characterId: string) => void;
  onClick?: (character: Character) => void;
  compact?: boolean;
  source?: string;
}

export function CharacterCard({
  character,
  onStartChat,
  onDelete,
  onEdit,
  onGift,
  onClick,
  compact = false,
  source
}: CharacterCardProps) {
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'text-yellow-500 border-yellow-500';
      case 'epic': return 'text-purple-500 border-purple-500';
      case 'rare': return 'text-blue-500 border-blue-500';
      default: return 'text-gray-500 border-gray-500';
    }
  };

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return <Star className="w-3 h-3" />;
      case 'epic': return <Lightning className="w-3 h-3" />;
      case 'rare': return <Star className="w-3 h-3" />;
      default: return null;
    }
  };

  if (compact) {
    return (
      <Card 
        className={cn(
          "hover:shadow-md transition-shadow cursor-pointer group",
          getRarityColor(character.rarity),
          onClick && "cursor-pointer"
        )}
        onClick={() => onClick?.(character)}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={character.avatar} alt={character.name} />
              <AvatarFallback>
                {character.name?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-sm truncate">{character.name}</h3>
                {getRarityIcon(character.rarity)}
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Heart className="w-3 h-3" />
                  {character.stats?.love || 0}
                </span>
                <span>Lvl {character.progression?.level || 1}</span>
              </div>

              {character.personalities && character.personalities.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {character.personalities.slice(0, 2).map((personality, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs px-1 py-0">
                      {personality}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onStartChat && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartChat(character.id);
                  }}
                  className="h-8 w-8 p-0"
                  title="Start Chat"
                >
                  <ChatCircle className="w-4 h-4" />
                </Button>
              )}

              {onEdit && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(character);
                  }}
                  className="h-8 w-8 p-0"
                  title="Edit Character"
                >
                  <Gear className="w-4 h-4" />
                </Button>
              )}

              {onGift && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onGift(character.id);
                  }}
                  className="h-8 w-8 p-0"
                  title="Send Gift"
                >
                  <Gift className="w-4 h-4" />
                </Button>
              )}

              {onDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete ${character.name}? This cannot be undone.`)) {
                      onDelete(character.id);
                    }
                  }}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                  title="Delete Character"
                >
                  <Trash className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full card view
  return (
    <Card 
      className={cn(
        "hover:shadow-lg transition-shadow",
        getRarityColor(character.rarity),
        onClick && "cursor-pointer"
      )}
      onClick={() => onClick?.(character)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={character.avatar} alt={character.name} />
              <AvatarFallback className="text-lg">
                {character.name?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>

            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{character.name}</CardTitle>
                {getRarityIcon(character.rarity)}
                <Badge variant="outline" className="text-xs capitalize">
                  {character.rarity}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <span>Level {character.progression?.level || 1}</span>
                <span className="flex items-center gap-1">
                  <Heart className="w-3 h-3" />
                  {character.stats?.love || 0}
                </span>
                <span className="flex items-center gap-1">
                  <Lightning className="w-3 h-3" />
                  {character.stats?.happiness || 0}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-1">
            {onStartChat && (
              <Button
                size="sm"
                onClick={() => onStartChat(character.id)}
                title="Start Chat"
              >
                <ChatCircle className="w-4 h-4 mr-1" />
                Chat
              </Button>
            )}

            {onEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(character)}
                title="Edit Character"
              >
                <Gear className="w-4 h-4" />
              </Button>
            )}

            {onGift && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onGift(character.id)}
                title="Send Gift"
              >
                <Gift className="w-4 h-4" />
              </Button>
            )}

            {onDelete && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (confirm(`Delete ${character.name}? This cannot be undone.`)) {
                    onDelete(character.id);
                  }
                }}
                title="Delete Character"
                className="text-red-500 hover:text-red-700"
              >
                <Trash className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {character.description || 'No description available'}
        </p>

        {character.personalities && character.personalities.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Personalities</h4>
            <div className="flex flex-wrap gap-1">
              {character.personalities.slice(0, 4).map((personality, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {personality}
                </Badge>
              ))}
              {character.personalities.length > 4 && (
                <Badge variant="secondary" className="text-xs">
                  +{character.personalities.length - 4}
                </Badge>
              )}
            </div>
          </div>
        )}

        {character.features && character.features.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Features</h4>
            <div className="flex flex-wrap gap-1">
              {character.features.slice(0, 4).map((feature, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {feature}
                </Badge>
              ))}
              {character.features.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{character.features.length - 4}
                </Badge>
              )}
            </div>
          </div>
        )}

        {character.role && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Role:</span>
            <Badge variant="outline">{character.role}</Badge>
          </div>
        )}

        {character.job && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Job:</span>
            <span>{character.job}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
