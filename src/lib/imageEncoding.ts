import { logger } from '@/lib/logger';

export interface ParsedDataUrl {
  base64Data: string;
  mimeType: string;
  byteSize: number;
}

const DATA_URL_REGEX = /^data:(.*?);base64,/i;

export function parseDataUrl(imageUrl: string): ParsedDataUrl | null {
  if (typeof imageUrl !== 'string') {
    logger.error('parseDataUrl: imageUrl is not a string', typeof imageUrl);
    return null;
  }

  const match = imageUrl.match(DATA_URL_REGEX);
  if (!match) {
    logger.error('parseDataUrl: Invalid data URL format', {
      prefix: imageUrl.substring(0, 80),
    });
    return null;
  }

  const base64Data = imageUrl.slice(match[0].length).replace(/\s/g, '');
  const mimeType = match[1] || 'image/png';
  const padding = (base64Data.match(/=+$/) || [''])[0].length;
  const byteSize = Math.max(Math.floor((base64Data.length * 3) / 4) - padding, 0);

  return {
    base64Data,
    mimeType,
    byteSize,
  };
}

export async function dataUrlToBlob(imageUrl: string): Promise<Blob> {
  const parsed = parseDataUrl(imageUrl);
  if (!parsed) {
    throw new Error('Invalid data URL');
  }

  const globalRef = typeof globalThis !== 'undefined' ? (globalThis as typeof globalThis) : undefined;
  if (globalRef?.fetch) {
    try {
      const response = await globalRef.fetch(imageUrl);
      const blob = await response.blob();
      return blob;
    } catch (fetchError) {
      logger.warn('dataUrlToBlob: fetch fallback failed, attempting manual decode', fetchError);
    }
  }

  if (!globalRef?.atob) {
    throw new Error('Base64 decoding not available');
  }

  const binaryString = globalRef.atob(parsed.base64Data);
  const length = binaryString.length;
  const bytes = new Uint8Array(length);

  for (let index = 0; index < length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index);
  }

  return new Blob([bytes], { type: parsed.mimeType });
}

export async function convertDataUrlToObjectUrl(imageUrl: string): Promise<string> {
  const blob = await dataUrlToBlob(imageUrl);
  return URL.createObjectURL(blob);
}
