# OpenRouter Image Display Fix

## Problem
Images generated through OpenRouter with the `google/gemini-2.5-flash-image` model were not displaying in the FEED, despite being successfully generated and saved to storage.

## Root Cause
The issue was caused by a bug in the OpenRouter image URL processing logic in `src/lib/aiService.ts`. The code was incorrectly adding the `data:image/png;base64,` prefix to image URLs that already had this prefix, resulting in double-prefixed URLs like:
```
data:image/png;base64,data:image/png;base64,<actual-base64-data>
```

This malformed data URL would fail to render in the browser.

## Changes Made

### 1. Fixed Double-Prefix Bug (`src/lib/aiService.ts`)
**Line 338-343**: Changed the logic to only add the data URL prefix if the image URL doesn't already start with `data:`:

```typescript
// Before (BUGGY):
if (typeof imageUrl === 'string') {
  const fullUrl = imageUrl.includes('base64') ? `data:image/png;base64,${imageUrl}` : `data:image/png;base64,${imageUrl}`;
  logger.log('OpenRouter base64 image converted to data URL, length:', fullUrl.length);
  return fullUrl;
}

// After (FIXED):
if (typeof imageUrl === 'string' && !imageUrl.startsWith('data:')) {
  const fullUrl = `data:image/png;base64,${imageUrl}`;
  logger.log('OpenRouter base64 image converted to data URL, length:', fullUrl.length);
  return fullUrl;
}
```

### 2. Enhanced Error Logging (`src/components/CharacterCard.v2.tsx`)

**parseDataUrl function**: Added error logging to detect malformed data URLs early:
```typescript
if (!match) {
  console.error('parseDataUrl: imageUrl does not match data URL format', {
    prefix: imageUrl.substring(0, 100),
  });
  return null;
}
```

**useGalleryImageSource hook**: Added detailed logging for object URL conversion:
- Logs when conversion starts
- Logs when object URL is created successfully
- Logs when object URL is revoked
- Logs errors with context about fallback to data URL

### 3. Improved Feed Rendering (`src/components/CharacterFeed.tsx`)

**FeedImageCard component**: Enhanced logging to track image rendering:
- Added `onLoad` handler to confirm successful image loads
- Improved `onError` handler with more detailed error information
- Added useEffect logging to track sourceInfo changes

## How Images Are Handled

### Size-Based Strategy
Images from OpenRouter are typically ~1.5-2MB (base64). The system uses a smart strategy:

1. **Small images (<1.5MB)**: Rendered directly using data URLs
2. **Large images (≥1.5MB)**: Converted to blob URLs for better performance

### Flow
1. Image generated via OpenRouter
2. Image URL validated and stored in `generated-images.json`
3. CharacterFeed loads images from storage
4. For each image, `useGalleryImageSource` determines rendering strategy:
   - If large, converts data URL to blob URL
   - If conversion fails, falls back to original data URL
5. Feed displays image using the appropriate URL

## Testing Instructions

### 1. Generate a Test Image
1. Open the app and navigate to a character
2. Go to the Gallery tab
3. Enter a prompt (e.g., "portrait photo in a cafe")
4. Click "Generate Image"

### 2. Verify Image Display
Check the browser console for these log messages:

#### Generation Phase:
```
Image generated successfully, URL length: <number>
OpenRouter returned image URL from images array, length: <number>, type: data:image/png;base6
Image size ≈ 1.47MB binary (1543210 bytes), base64 payload ≈ 1.96MB (1962180 chars)
Image saved to storage successfully
```

#### Feed Rendering Phase:
```
FeedImageCard rendering: {
  imageId: "...",
  hasImageUrl: true,
  imageUrlPrefix: "data:image/png;base64,iVBORw...",
  byteSize: 1543210,
  mimeType: "image/png",
  sourceInfoSrc: "blob:http://localhost:5173/...",
  isProcessing: false,
  failed: false
}
```

#### Object URL Conversion (for large images):
```
Converting large image to object URL { imageId: "...", byteSize: 1543210, urlLength: 1962180 }
Object URL created successfully { imageId: "...", objectUrl: "blob:http://localhost:5173/..." }
```

#### Success:
```
Feed image loaded successfully { imageId: "...", srcType: "blob" }
```

### 3. Check for Errors
If you see any of these errors, the image may not display:
- `parseDataUrl: imageUrl does not match data URL format` - The data URL is malformed
- `Failed to convert data URL to object URL` - Object URL conversion failed (will fallback to data URL)
- `Failed to render feed image` - Image failed to load in the browser

## Model Configuration

The app supports these OpenRouter image generation models:
- `google/gemini-2.0-flash-exp:image-generation` (default)
- `google/gemini-2.5-flash-image` (user's model)

To use a specific model:
1. Go to AI Settings
2. Select "OpenRouter" as the image provider
3. Enter your OpenRouter API key
4. Specify the model name in the image model field

## Additional Notes

### Browser Compatibility
- The object URL conversion uses `fetch()` to convert data URLs to blobs
- Fallback to `atob()` if fetch fails
- All modern browsers support these APIs

### Performance Considerations
- Large data URLs (>1.5MB) can cause performance issues if rendered directly
- Object URLs are memory-efficient and render faster
- Object URLs are revoked when components unmount to prevent memory leaks

### Storage
Images are stored in `generated-images.json` via the IndexedDB-backed file storage system. The database stores:
- `imageUrl`: The full data URL (base64 encoded)
- `byteSize`: Binary size in bytes
- `mimeType`: Image MIME type (e.g., "image/png")
- `base64Length`: Length of base64 string
- Other metadata (id, prompt, characterId, createdAt, tags)

## Troubleshooting

### Images Still Not Displaying?
1. Check browser console for errors
2. Verify the data URL starts with `data:image/` in the logs
3. Check if object URL conversion is failing
4. Verify the image is saved to `generated-images.json` (check IndexedDB in browser DevTools)
5. Try clearing the generated images and generating a new one

### Object URL Conversion Failing?
The system will automatically fall back to the original data URL. However, if the data URL is very large (>5MB), some browsers may refuse to render it directly. In this case:
1. Check if the image is compressed (quality: 'standard' in OpenRouter request)
2. Consider reducing image size in the OpenRouter API call
3. Check browser memory limits

### Images Disappearing After Initial Load?
This could indicate object URLs being revoked too early. Check the console for "Revoking object URL" messages that don't align with component unmounting.
