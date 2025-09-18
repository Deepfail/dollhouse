import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { getCharacterPosts } from '@/storage/adapters';
import { ChatCircle, DotsThree, Heart, Share } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface CharacterPost {
  id: string;
  character_id: string;
  content: string;
  image_url?: string | null;
  likes_count: number;
  created_at: number;
  post_type: string;
}


interface CharacterFeedProps {
  characterId: string;
}

export function CharacterFeed({ characterId }: CharacterFeedProps) {
  const { characters } = useHouseFileStorage();
  const [posts, setPosts] = useState<CharacterPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const character = characters?.find((c: any) => c.id === characterId);

  useEffect(() => {
    loadPosts();
  }, [characterId]);

  const loadPosts = async () => {
    try {
      setIsLoading(true);
      const characterPosts = await getCharacterPosts(characterId);
      setPosts(characterPosts);
    } catch (error) {
      console.error('Failed to load posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      // Update local state optimistically
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { ...post, likes_count: post.likes_count + 1 }
            : post
        )
      );
      
      // TODO: Implement actual like persistence in storage
      console.log('Liked post:', postId);
      toast.success('Liked!');
    } catch (error) {
      console.error('Failed to like post:', error);
      toast.error('Failed to like post');
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading feed...</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {posts.map((post) => (
          <Card key={post.id} className="overflow-hidden border-0 shadow-sm bg-card">
            {/* Post Header */}
            <div className="flex items-center justify-between p-4 pb-3">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={character?.avatar} alt={character?.name} />
                  <AvatarFallback>
                    {character?.name?.charAt(0)?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold text-sm">{character?.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatTimeAgo(post.created_at)}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <DotsThree className="w-4 h-4" />
              </Button>
            </div>

            {/* Post Content */}
            <CardContent className="p-0">
              {/* Post Image */}
              {post.image_url && (
                <div className="relative">
                  <img
                    src={post.image_url}
                    alt="Post content"
                    className="w-full h-80 object-cover"
                    onError={(e) => {
                      // Hide broken images
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Post Actions */}
              <div className="p-4 pt-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(post.id)}
                      className="h-auto p-0 hover:scale-110 transition-transform"
                    >
                      <Heart className="w-6 h-6 text-red-500" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-auto p-0">
                      <ChatCircle className="w-6 h-6" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-auto p-0">
                      <Share className="w-6 h-6" />
                    </Button>
                  </div>
                </div>

                {/* Likes Count */}
                {post.likes_count > 0 && (
                  <div className="font-semibold text-sm mb-2">
                    {post.likes_count} {post.likes_count === 1 ? 'like' : 'likes'}
                  </div>
                )}

                {/* Post Caption */}
                <div className="text-sm">
                  <span className="font-semibold mr-2">{character?.name}</span>
                  <span>{post.content}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {posts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-muted-foreground">
              <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No posts yet</p>
              <p className="text-sm">Start a conversation to see posts from {character?.name}</p>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}