import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useSimpleStorage } from '@/hooks/useSimpleStorage';
import { AIService } from '@/lib/aiService';
import { toast } from 'sonner';
import {
  Image as ImageIcon,
  Download,
  Trash,
  Plus,
  MagnifyingGlass,
  Heart,
  HeartBreak
} from '@phosphor-icons/react';

interface GeneratedImage {
  id: string;
  prompt: string;
  imageUrl: string;
  createdAt: Date;
  liked?: boolean;
  characterId?: string; // if generated for a specific character
  tags?: string[];
}

interface ImageGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImageGallery({ open, onOpenChange }: ImageGalleryProps) {
  const [images, setImages] = useSimpleStorage<GeneratedImage[]>('generated-images', []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt for image generation');
      return;
    }

    setIsGenerating(true);
    try {
      const imageUrl = await AIService.generateImage(prompt.trim());
      
      if (imageUrl) {
        const newImage: GeneratedImage = {
          id: crypto.randomUUID(),
          prompt: prompt.trim(),
          imageUrl,
          createdAt: new Date(),
          tags: extractTagsFromPrompt(prompt)
        };

        setImages(prev => [newImage, ...prev]);
        setPrompt('');
        toast.success('Image generated successfully!');
      } else {
        toast.error('Failed to generate image');
      }
    } catch (error) {
      console.error('Image generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteImage = (imageId: string) => {
    setImages(prev => prev.filter(img => img.id !== imageId));
    toast.success('Image deleted');
  };

  const handleToggleLike = (imageId: string) => {
    setImages(prev => prev.map(img => 
      img.id === imageId ? { ...img, liked: !img.liked } : img
    ));
  };

  const handleDownloadImage = async (image: GeneratedImage) => {
    try {
      const response = await fetch(image.imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-image-${image.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Image downloaded');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download image');
    }
  };

  const extractTagsFromPrompt = (prompt: string): string[] => {
    // Simple tag extraction based on common keywords
    const keywords = prompt.toLowerCase().split(/\s+/);
    const commonTags = ['portrait', 'landscape', 'anime', 'realistic', 'fantasy', 'character', 'scene', 'art'];
    return commonTags.filter(tag => keywords.some(word => word.includes(tag)));
  };

  const filteredImages = images.filter(image =>
    image.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
    image.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Image Gallery
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 h-full">
          {/* Image Generation Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Generate New Image</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter your image prompt..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isGenerating && handleGenerateImage()}
                  disabled={isGenerating}
                />
                <Button 
                  onClick={handleGenerateImage} 
                  disabled={isGenerating || !prompt.trim()}
                  className="min-w-[120px]"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Generate
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Search and Filters */}
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search images by prompt or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="secondary">
              {filteredImages.length} image{filteredImages.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          {/* Image Grid */}
          <ScrollArea className="flex-1">
            {filteredImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <ImageIcon className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Images Generated Yet</h3>
                <p className="text-muted-foreground">
                  {images.length === 0 
                    ? "Generate your first image using the prompt above!" 
                    : "No images match your search criteria."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                {filteredImages.map((image) => (
                  <Card key={image.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative group">
                      <img
                        src={image.imageUrl}
                        alt={image.prompt}
                        className="w-full h-48 object-cover cursor-pointer"
                        onClick={() => setSelectedImage(image)}
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleToggleLike(image.id)}
                        >
                          {image.liked ? <HeartBreak className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDownloadImage(image)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteImage(image.id)}
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <p className="text-sm font-medium line-clamp-2 mb-2">
                        {image.prompt}
                      </p>
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>{new Date(image.createdAt).toLocaleDateString()}</span>
                        {image.liked && <Heart className="w-3 h-3 fill-red-500 text-red-500" />}
                      </div>
                      {image.tags && image.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {image.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Image Detail Modal */}
        {selectedImage && (
          <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Image Details</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <img
                  src={selectedImage.imageUrl}
                  alt={selectedImage.prompt}
                  className="w-full max-h-96 object-contain rounded-lg"
                />
                <div className="space-y-2">
                  <p><strong>Prompt:</strong> {selectedImage.prompt}</p>
                  <p><strong>Created:</strong> {new Date(selectedImage.createdAt).toLocaleString()}</p>
                  {selectedImage.tags && selectedImage.tags.length > 0 && (
                    <div>
                      <strong>Tags:</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedImage.tags.map(tag => (
                          <Badge key={tag} variant="outline">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleToggleLike(selectedImage.id)}
                    className="flex-1"
                  >
                    {selectedImage.liked ? <HeartBreak className="w-4 h-4 mr-2" /> : <Heart className="w-4 h-4 mr-2" />}
                    {selectedImage.liked ? 'Unlike' : 'Like'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDownloadImage(selectedImage)}
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleDeleteImage(selectedImage.id);
                      setSelectedImage(null);
                    }}
                    className="flex-1"
                  >
                    <Trash className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}