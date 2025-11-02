export interface GeneratedImage {
  id: string;
  prompt: string;
  imageUrl: string;
  createdAt: string | Date;
  characterId?: string;
  tags?: string[];
  byteSize?: number;
  mimeType?: string;
  base64Length?: number;
  storageType?: 'inline' | 'cache';
  storageKey?: string;
}
