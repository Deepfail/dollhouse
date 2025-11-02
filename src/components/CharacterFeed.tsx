import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFileStorage } from '@/hooks/useFileStorage';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { useGalleryImageSource } from '@/components/CharacterCard.v2';
import type { Character } from '@/types';
import type { GeneratedImage } from '@/types/generatedImage';
import { Heart } from '@phosphor-icons/react';
import { useMemo, useState, useEffect } from 'react';

interface CharacterFeedProps {
  characterId: string;
}

export function CharacterFeed({ characterId }: CharacterFeedProps) {
  const { characters, isLoading: isHouseLoading } = useHouseFileStorage();
  const { data: storedImages = [], isLoading: isGalleryLoading } = useFileStorage<GeneratedImage[]>('generated-images.json', []);

  const character = characters?.find((c: Character) => c.id === characterId);

  const feedImages = useMemo(() => {
    return storedImages
      .filter((image) => image.characterId === characterId)
      .map((image) => ({
        ...image,
        createdAt: image.createdAt instanceof Date ? image.createdAt : new Date(image.createdAt),
      }))
      .sort((a, b) => {
        const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
        const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
        return bTime - aTime;
      });
  }, [storedImages, characterId]);

  const isLoading = isHouseLoading || isGalleryLoading;

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
        {feedImages.map((image) => (
          <FeedImageCard key={image.id} image={image} character={character} />
        ))}

        {feedImages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-muted-foreground">
              <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No gallery posts yet</p>
              <p className="text-sm">Generate an image to share something from {character?.name ?? 'this character'}.</p>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function FeedImageCard({ image, character }: { image: GeneratedImage; character?: Character }) {
  const sourceInfo = useGalleryImageSource(image);
  const [hasError, setHasError] = useState(false);
  const [isPng, setIsPng] = useState(false);

  useEffect(() => {
    setHasError(false);
    setIsPng(Boolean(image.mimeType?.includes('/png') || image.imageUrl?.toLowerCase().includes('image/png')));
    
    console.log('FeedImageCard rendering:', {
      imageId: image.id,
      hasImageUrl: Boolean(image.imageUrl),
      imageUrlPrefix: image.imageUrl?.substring(0, 50),
      byteSize: image.byteSize,
      mimeType: image.mimeType,
      storageType: image.storageType,
      storageKey: image.storageKey,
      sourceInfoSrc: sourceInfo.src?.substring(0, 50),
      isProcessing: sourceInfo.isProcessing,
      failed: sourceInfo.failed,
    });
  }, [image.id, image.imageUrl, image.mimeType, sourceInfo.src, sourceInfo.isProcessing, sourceInfo.failed, image.byteSize]);

  const createdAt = image.createdAt instanceof Date ? image.createdAt : new Date(image.createdAt);
  const createdLabel = formatTimeAgo(createdAt);

  const showUnavailable = hasError || sourceInfo.failed;

  return (
    <Card className="overflow-hidden border-0 shadow-sm bg-card">
      <div className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={character?.avatar} alt={character?.name} />
            <AvatarFallback>{character?.name?.charAt(0)?.toUpperCase() || '?'}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold text-sm">{character?.name ?? 'Character'}</div>
            <div className="text-xs text-muted-foreground">{createdLabel}</div>
          </div>
        </div>
      </div>

      <CardContent className="p-0">
        <div className="relative h-80 w-full bg-white/5">
          {showUnavailable ? (
            <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-wide text-muted-foreground">
              Preview unavailable
            </div>
          ) : sourceInfo.src ? (
            <img
              src={sourceInfo.src}
              alt={image.prompt}
              className="h-full w-full object-cover"
              onLoad={() => {
                console.log('Feed image loaded successfully', {
                  imageId: image.id,
                  srcType: sourceInfo.src.startsWith('blob:') ? 'blob' : 'data',
                });
              }}
              onError={(e) => {
                console.error('Failed to render feed image', {
                  imageId: image.id,
                  byteSize: image.byteSize,
                  urlLength: typeof image.imageUrl === 'string' ? image.imageUrl.length : 0,
                  mimeType: image.mimeType,
                  srcType: sourceInfo.src?.startsWith('blob:') ? 'blob' : 'data',
                  srcPrefix: sourceInfo.src?.substring(0, 100),
                  error: e,
                });
                setHasError(true);
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-wide text-muted-foreground">
              Preparing preview…
            </div>
          )}

          {sourceInfo.isProcessing && !showUnavailable ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs uppercase tracking-wide text-white/70">
              Preparing preview…
            </div>
          ) : null}

          {isPng && !showUnavailable ? (
            <div className="absolute left-2 top-2 rounded bg-black/60 px-2 py-1 text-[10px] uppercase tracking-wide text-white/70">
              PNG
            </div>
          ) : null}
        </div>

        <div className="p-4 text-sm">
          <div className="font-semibold text-white/80">{character?.name ?? 'Character'}'s post</div>
          <p className="mt-2 text-muted-foreground">{image.prompt || 'No description provided.'}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function formatTimeAgo(timestamp: Date) {
  const now = Date.now();
  const time = timestamp instanceof Date ? timestamp.getTime() : new Date(timestamp).getTime();
  const diffInSeconds = Math.floor((now - time) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
  return new Date(time).toLocaleDateString();
}
