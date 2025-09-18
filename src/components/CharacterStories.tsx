import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { getCharacterStories } from '@/storage/adapters';
import { BookOpen, Eye, Heart } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface CharacterStory {
  id: string;
  character_id: string;
  title: string;
  content: string;
  image_url?: string | null;
  created_at: number;
  views: number;
}


interface CharacterStoriesProps {
  characterId: string;
}

export function CharacterStories({ characterId }: CharacterStoriesProps) {
  const { characters } = useHouseFileStorage();
  const [stories, setStories] = useState<CharacterStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const character = characters?.find((c: any) => c.id === characterId);

  useEffect(() => {
    loadStories();
  }, [characterId]);

  const loadStories = async () => {
    try {
      setIsLoading(true);
      const characterStories = await getCharacterStories(characterId);
      setStories(characterStories);
    } catch (error) {
      console.error('Failed to load stories:', error);
      toast.error('Failed to load stories');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading stories...</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {stories.map((story) => (
          <Card key={story.id} className="overflow-hidden">
            <CardContent className="p-0">
              {/* Story Image */}
              {story.image_url && (
                <div className="relative h-48">
                  <img
                    src={story.image_url}
                    alt={story.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Hide broken images
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 text-white">
                    <h3 className="font-bold text-lg mb-1">{story.title}</h3>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span>{story.views}</span>
                      </div>
                      <span>{formatTimeAgo(story.created_at)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Story Content */}
              <div className="p-4">
                {!story.image_url && (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-lg">{story.title}</h3>
                      <Badge variant="outline" className="text-xs">
                        Story
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span>{story.views} views</span>
                      </div>
                      <span>{formatTimeAgo(story.created_at)}</span>
                    </div>
                  </>
                )}

                <div className="prose prose-sm max-w-none">
                  <p className="text-muted-foreground leading-relaxed">
                    {story.content}
                  </p>
                </div>

                {/* Story Actions */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BookOpen className="w-4 h-4" />
                    <span>By {character?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-muted-foreground hover:text-red-500 cursor-pointer transition-colors" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {stories.length === 0 && (
          <div className="text-center py-12">
            <div className="text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No stories yet</p>
              <p className="text-sm">
                {character?.name} hasn't shared any stories. Check back later!
              </p>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}