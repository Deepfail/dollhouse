import { parseDataUrl, dataUrlToBlob } from '@/lib/imageEncoding';
import { logger } from '@/lib/logger';

const CACHE_NAME = 'dollhouse-generated-images';
const CACHE_PATH_PREFIX = '/generated-images/';

function buildCacheRequest(cacheKey: string): Request {
  const url = `${CACHE_PATH_PREFIX}${cacheKey}`;
  return new Request(url, { method: 'GET' });
}

export async function ensureImageCache(): Promise<boolean> {
  if (typeof caches === 'undefined') {
    logger.warn('Image cache unavailable: CacheStorage API not supported');
    return false;
  }

  try {
    await caches.open(CACHE_NAME);
    return true;
  } catch (error) {
    logger.warn('Image cache unavailable: failed to open cache', error);
    return false;
  }
}

export async function storeImageInCache(cacheKey: string, dataUrl: string) {
  if (!cacheKey) {
    throw new Error('storeImageInCache requires a cache key');
  }

  if (!(await ensureImageCache())) {
    throw new Error('Image cache not available');
  }

  const parsed = parseDataUrl(dataUrl);
  const blob = await dataUrlToBlob(dataUrl);
  const response = new Response(blob, {
    headers: {
      'Content-Type': parsed?.mimeType || 'image/png',
      'Content-Length': String(parsed?.byteSize ?? blob.size),
    },
  });

  const cache = await caches.open(CACHE_NAME);
  const request = buildCacheRequest(cacheKey);

  try {
    await cache.delete(request);
  } catch {
    /* ignore */
  }

  await cache.put(request, response);

  return {
    storageKey: cacheKey,
    byteSize: parsed?.byteSize ?? blob.size,
    mimeType: parsed?.mimeType || blob.type || 'image/png',
  };
}

export async function loadImageBlobFromCache(cacheKey: string): Promise<Blob | null> {
  if (!cacheKey || !(await ensureImageCache())) {
    return null;
  }

  const cache = await caches.open(CACHE_NAME);
  const request = buildCacheRequest(cacheKey);
  const response = await cache.match(request);

  if (!response) {
    logger.warn('Image cache miss', { cacheKey });
    return null;
  }

  try {
    return await response.blob();
  } catch (error) {
    logger.error('Failed to read blob from cache response', { cacheKey, error });
    return null;
  }
}

export async function deleteImageFromCache(cacheKey: string): Promise<void> {
  if (!cacheKey || !(await ensureImageCache())) {
    return;
  }

  const cache = await caches.open(CACHE_NAME);
  const request = buildCacheRequest(cacheKey);

  try {
    await cache.delete(request);
  } catch (error) {
    logger.warn('Failed to delete cached image', { cacheKey, error });
  }
}
