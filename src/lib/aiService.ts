import { House } from '@/types';
import { repositoryStorage } from '../hooks/useRepositoryStorage';

// Direct OpenRouter service - no reliance on house state getter which might be stale
export class AIService {
  
  static async generateResponse(prompt: string, apiKey?: string, model?: string, options?: { temperature?: number; max_tokens?: number }): Promise<string> {
    console.log('=== AIService.generateResponse called ===');
    console.log('Prompt length:', prompt.length);
    console.log('Direct params - API Key:', !!apiKey, 'Model:', model);
    
    // Warn if prompt is too long (over 4000 characters is getting excessive)
    if (prompt.length > 4000) {
      console.warn('⚠️ Very long prompt detected:', prompt.length, 'characters');
      console.log('Prompt preview:', prompt.slice(0, 200) + '...');
    }
    
    // Try to get API settings directly from repository storage if not provided
    let finalApiKey = apiKey;
    let finalModel = model;
    let textProvider = 'openrouter';
    let textApiUrl = '';
    
    if (!finalApiKey) {
      try {
        // Get house config from repository storage
        const houseConfig = await repositoryStorage.get('house_config') as any;
        console.log('📦 Retrieved house config from repository storage');
        
        if (houseConfig?.aiSettings) {
          const settings = houseConfig.aiSettings;
          textProvider = settings.textProvider || 'openrouter';
          // Prefer provider-specific slots; fall back to legacy fields
          if (textProvider === 'venice') {
            finalApiKey = settings.veniceTextApiKey || settings.textApiKey;
            finalModel = settings.veniceTextModel || settings.textModel;
            textApiUrl = settings.veniceTextApiUrl || settings.textApiUrl || '';
          } else {
            finalApiKey = settings.openrouterTextApiKey || settings.textApiKey;
            finalModel = settings.openrouterTextModel || settings.textModel;
            textApiUrl = '';
          }
          
          console.log('🔍 Using repository settings:');
          console.log('  - textProvider:', textProvider);
          console.log('  - textApiKey exists:', !!finalApiKey);
          console.log('  - textModel:', finalModel);
          console.log('  - textApiUrl:', textApiUrl);
        } else {
          console.log('📦 No house config found, using defaults');
          // Use defaults if no config exists
          textProvider = 'openrouter';
          textApiUrl = '';
        }
      } catch (error) {
        console.error('❌ Failed to get house settings from repository storage:', error);
        // Fall back to defaults
        textProvider = 'openrouter';
        textApiUrl = '';
      }
    }
    
    // Set default model based on provider if not specified
    if (!finalModel) {
      finalModel = textProvider === 'venice' ? 'venice-large' : 'deepseek/deepseek-chat-v3.1';
    }
    
    if (!finalApiKey || finalApiKey.length === 0) {
      throw new Error(`${textProvider === 'venice' ? 'Venice AI' : 'OpenRouter'} API key is required. Please configure it in House Settings.`);
    }

    try {
      console.log('🚀 Routing to provider:', textProvider);
      // Route to appropriate provider
      if (textProvider === 'venice') {
        console.log('📍 Using Venice AI endpoint');
        // Map friendly Venice aliases to concrete model IDs
        const veniceModelMap: Record<string, string> = {
          // Preferred direct IDs
          'llama-3.3-70b': 'llama-3.3-70b',
          'qwen3-235b': 'qwen3-235b',
          'venice-uncensored': 'venice-uncensored',
          // Back-compat aliases
          'venice-uncensored-1.1': 'venice-uncensored',
          'venice-reasoning': 'qwen3-235b',
          'venice-small': 'llama-3.2-3b',
          'venice-medium': 'llama-3.1-8b',
          'venice-large': 'llama-3.3-70b',
        };
        const resolvedModel = veniceModelMap[finalModel] || finalModel;
        return await this.generateVeniceResponse(prompt, finalApiKey, resolvedModel, textApiUrl, options);
      } else {
        console.log('📍 Using OpenRouter endpoint');
        return await this.generateOpenRouterResponse(prompt, finalApiKey, finalModel, options);
      }
      
    } catch (err) {
      console.error('AIService error:', err);
      if (err instanceof Error) throw err;
      throw new Error(String(err));
    }
  }

  private static async generateOpenRouterResponse(prompt: string, apiKey: string, model: string, options?: { temperature?: number; max_tokens?: number }): Promise<string> {
    const requestBody = {
      model: model,
      messages: [{ role: 'user', content: prompt }],
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 512,
      stream: false,
    };

    console.log('Making OpenRouter request with:', {
      model: model,
      apiKeyLength: apiKey.length,
      promptLength: prompt.length
    });

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Character Creator House',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('OpenRouter response status:', response.status);

    if (!response.ok) {
      const raw = await response.text();
      console.error('OpenRouter error response:', raw);
      
      if (response.status === 401) throw new Error('401 Unauthorized: Invalid OpenRouter API key.');
      if (response.status === 403) throw new Error('403 Forbidden: Key not permitted for this origin or model.');
      if (response.status === 429) throw new Error('429 Rate limit exceeded.');
      if (response.status === 400) {
        let msg = '400 Bad Request';
        try { msg = (JSON.parse(raw)?.error?.message) || msg; } catch {}
        throw new Error(msg);
      }
      if (response.status >= 500) throw new Error(`OpenRouter server error (${response.status}).`);
      throw new Error(`OpenRouter error ${response.status}: ${raw}`);
    }

    const data = await response.json();
    console.log('OpenRouter response data keys:', Object.keys(data));
    
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      console.error('Invalid response structure:', data);
      throw new Error('Invalid response from OpenRouter API');
    }
    
    console.log('OpenRouter response generated successfully, length:', content.length);
    return content;
  }

  private static async generateVeniceResponse(prompt: string, apiKey: string, model: string, apiUrl: string, options?: { temperature?: number; max_tokens?: number }): Promise<string> {
    const requestBody = {
      model: model,
      messages: [{ role: 'user', content: prompt }],
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 512,
      stream: false,
      venice_parameters: {
        enable_web_search: "auto",
        enable_web_citations: true,
        include_venice_system_prompt: true,
        strip_thinking_response: false
      }
    };

    // Use provided API URL or default Venice AI endpoint
    const baseUrl = apiUrl || 'https://api.venice.ai/api/v1';
    const endpoint = `${baseUrl}/chat/completions`;

    console.log('Making Venice AI request with:', {
      model: model,
      apiKeyLength: apiKey.length,
      promptLength: prompt.length,
      endpoint: endpoint
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Venice AI response status:', response.status);

    if (!response.ok) {
      const raw = await response.text();
      console.error('Venice AI error response:', raw);
      
  if (response.status === 401) throw new Error('401 Unauthorized: Invalid Venice AI API key.');
  if (response.status === 402) throw new Error('402 Payment Required: Check Venice AI billing.');
      if (response.status === 403) throw new Error('403 Forbidden: Venice AI key not permitted.');
      if (response.status === 429) throw new Error('429 Rate limit exceeded.');
      if (response.status === 400) {
        let msg = '400 Bad Request';
        try { msg = (JSON.parse(raw)?.error?.message) || msg; } catch {}
        throw new Error(msg);
      }
      if (response.status >= 500) throw new Error(`Venice AI server error (${response.status}).`);
      throw new Error(`Venice AI error ${response.status}: ${raw}`);
    }

    const data = await response.json();
    console.log('Venice AI response data keys:', Object.keys(data));
    
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      console.error('Invalid response structure:', data);
      throw new Error('Invalid response from Venice AI API');
    }
    
    console.log('Venice AI response generated successfully, length:', content.length);
    return content;
  }

  static async testConnection(apiKey?: string, model?: string): Promise<{ success: boolean; message: string }> {
    console.log('=== Testing API Connection ===');
    
    let finalApiKey = apiKey;
    let finalModel = model;
    let textProvider = 'openrouter';
    let textApiUrl = '';
    
    if (!finalApiKey) {
      try {
        const houseConfig = await repositoryStorage.get('house_config') as any;
        // Use new structured fields with fallback to legacy fields
        textProvider = houseConfig?.aiSettings?.textProvider || houseConfig?.aiSettings?.provider || 'openrouter';
        if (textProvider === 'venice') {
          const apiKeyFromStorage = houseConfig?.aiSettings?.veniceTextApiKey || houseConfig?.aiSettings?.textApiKey || houseConfig?.aiSettings?.apiKey;
          finalApiKey = (typeof apiKeyFromStorage === 'string' && apiKeyFromStorage) ? apiKeyFromStorage.trim() : undefined;
          finalModel = houseConfig?.aiSettings?.veniceTextModel || houseConfig?.aiSettings?.textModel || houseConfig?.aiSettings?.model;
          textApiUrl = houseConfig?.aiSettings?.veniceTextApiUrl || houseConfig?.aiSettings?.textApiUrl || '';
        } else {
          const apiKeyFromStorage = houseConfig?.aiSettings?.openrouterTextApiKey || houseConfig?.aiSettings?.textApiKey || houseConfig?.aiSettings?.apiKey;
          finalApiKey = (typeof apiKeyFromStorage === 'string' && apiKeyFromStorage) ? apiKeyFromStorage.trim() : undefined;
          finalModel = houseConfig?.aiSettings?.openrouterTextModel || houseConfig?.aiSettings?.textModel || houseConfig?.aiSettings?.model;
          textApiUrl = '';
        }
      } catch (error) {
        return { success: false, message: 'Failed to get API settings from storage' };
      }
    }
    
    // Set default model based on provider if not specified
    if (!finalModel) {
      finalModel = textProvider === 'venice' ? 'llama-3.3-70b' : 'deepseek/deepseek-chat-v3.1';
    }
    
    if (!finalApiKey || finalApiKey.length === 0) {
      return { success: false, message: 'No API key provided' };
    }

    try {
      const testPrompt = 'Say "Connection test successful" if you can read this message.';
      
      // Determine endpoint based on provider
      let endpoint: string;
      let headers: Record<string, string>;
      let requestBody: any;
      
      if (textProvider === 'venice') {
        const baseUrl = textApiUrl || 'https://api.venice.ai/api/v1';
        endpoint = `${baseUrl}/chat/completions`;
        headers = {
          Authorization: `Bearer ${finalApiKey}`,
          'Content-Type': 'application/json',
        };
        requestBody = {
          model: finalModel,
          messages: [{ role: 'user', content: testPrompt }],
          temperature: 0.3,
          max_tokens: 50,
          stream: false,
          venice_parameters: {
            enable_web_search: "auto",
            include_venice_system_prompt: true
          }
        };
      } else {
        endpoint = 'https://openrouter.ai/api/v1/chat/completions';
        headers = {
          Authorization: `Bearer ${finalApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Character Creator House - Connection Test',
        };
        requestBody = {
          model: finalModel,
          messages: [{ role: 'user', content: testPrompt }],
          temperature: 0.3,
          max_tokens: 50,
          stream: false,
        };
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const raw = await response.text();
        console.error('Connection test failed:', response.status, raw);
        
        const providerName = textProvider === 'venice' ? 'Venice AI' : 'OpenRouter';
        
        if (response.status === 401) return { success: false, message: 'Invalid API key' };
        if (response.status === 403) return { success: false, message: 'API key not permitted for this model' };
        if (response.status === 429) return { success: false, message: 'Rate limit exceeded' };
        if (response.status === 400) return { success: false, message: 'Bad request - check model name' };
        if (response.status >= 500) return { success: false, message: `${providerName} server error` };
        
        return { success: false, message: `HTTP ${response.status}` };
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      
      if (typeof content === 'string' && content.trim().length > 0) {
        console.log('Connection test successful:', content);
        const providerName = textProvider === 'venice' ? 'Venice AI' : 'OpenRouter';
        return { success: true, message: `${providerName} API working: ${content.slice(0, 50)}...` };
      } else {
        return { success: false, message: 'Invalid response format' };
      }
      
    } catch (err) {
      console.error('Connection test error:', err);
      return { success: false, message: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  static async generateImage(
    prompt: string,
    options?: {
      model?: string;
      negative_prompt?: string;
      width?: number;
      height?: number;
      steps?: number; // 20-50 recommended
      cfg_scale?: number; // 1-20, default 7.5
      style_preset?: string;
      sampler?: string; // e.g., "ddim", "euler", etc. if supported
      seed?: number;
      variants?: number; // 1-4
      format?: 'png' | 'webp' | 'jpeg';
      hide_watermark?: boolean; // ensure watermark is hidden by default
    }
  ): Promise<string | null> {
    console.log('=== Generating image with Venice AI ===');
    console.log('Prompt:', prompt);

    try {
      // Get house settings from repository storage
      const houseConfig = await repositoryStorage.get('house_config') as any;
      console.log('📦 Retrieved house config from repository storage for image generation');

  const imageProvider = houseConfig?.aiSettings?.imageProvider;
  const imageApiKey = houseConfig?.aiSettings?.imageApiKey;
  const imageApiUrl = houseConfig?.aiSettings?.imageApiUrl;

      // Map deprecated models to current alternatives
  const rawModel = options?.model || houseConfig?.aiSettings?.imageModel || 'venice-sd35';
      const deprecatedMap: Record<string, string> = {
        'flux-dev': 'qwen-image',
        'flux-dev-uncensored': 'lustify-sdxl',
        'stable-diffusion-3.5': 'qwen-image',
        'pony-realism': 'lustify-sdxl',
        // Common user-entered/legacy aliases
        'wai-Illustrious': 'qwen-image',
      };
      const imageModel = deprecatedMap[rawModel] || rawModel;

      console.log('Image model:', imageModel);

      if (!imageProvider || imageProvider === 'none') {
        console.log('Image generation disabled');
        return null;
      }

      if (imageProvider !== 'venice') {
        console.log('Unsupported image provider:', imageProvider);
        return null;
      }

      if (!imageApiKey || typeof imageApiKey !== 'string' || imageApiKey.trim().length === 0) {
        throw new Error('Venice AI API key is required. Please configure it in House Settings.');
      }

      // Venice AI API endpoint
      const apiUrl = imageApiUrl || 'https://api.venice.ai/api/v1';

      // Build request per Venice native API /image/generate
      const reqWidth = options?.width || 1024;
      const reqHeight = options?.height || 1024;
      // Steps: clamp by model constraints (e.g., qwen-image <= 8)
      let reqSteps = options?.steps ?? 30; // 20-50 recommended for SD-like models
      const modelKey = String(imageModel || '').toLowerCase();
      if (modelKey === 'qwen-image' || modelKey.includes('qwen-image')) {
        reqSteps = Math.min(reqSteps, 8);
      }
      const reqCfg = options?.cfg_scale ?? 7.5;
      const reqSeed = options?.seed ?? Math.floor(Math.random() * 1_000_000);
      const reqVariants = Math.max(1, Math.min(options?.variants ?? 1, 4));
      const reqFormat = options?.format || 'webp';

      const requestBody: any = {
        model: imageModel,
        prompt,
        width: reqWidth,
        height: reqHeight,
        steps: reqSteps,
        cfg_scale: reqCfg,
        seed: reqSeed,
        variants: reqVariants,
        format: reqFormat,
        // Default to hiding watermark unless explicitly disabled
        hide_watermark: options?.hide_watermark ?? true,
      };
      if (options?.negative_prompt) requestBody.negative_prompt = options.negative_prompt;
      if (options?.style_preset) requestBody.style_preset = options.style_preset;
      if (options?.sampler) requestBody.sampler = options.sampler;

      console.log('Making Venice AI request to:', `${apiUrl}/image/generate`);
      console.log('Request body:', { ...requestBody, prompt: prompt.slice(0, 50) + '...' });

      const response = await fetch(`${apiUrl}/image/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${imageApiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Venice AI response status:', response.status);

      if (!response.ok) {
        const raw = await response.text();
        console.error('Venice AI error response:', raw);
        // If invalid style_preset, retry once without it
        if (response.status === 400) {
          try {
            const j = JSON.parse(raw);
            const msg = j?.details?.style_preset?._errors?.[0] || j?.issues?.[0]?.message || '';
            if (String(msg).toLowerCase().includes('style')) {
              console.warn('⚠️ Retrying image generation without style_preset');
              const retryBody = { ...requestBody };
              delete (retryBody as any).style_preset;
              const retryResp = await fetch(`${apiUrl}/image/generate`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${imageApiKey.trim()}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(retryBody),
              });
              if (retryResp.ok) {
                const data = await retryResp.json();
                console.log('Venice AI retry response data keys:', Object.keys(data));
                const images = Array.isArray(data?.images)
                  ? data.images
                  : Array.isArray(data?.data)
                    ? data.data
                    : [];
                if (images && images.length > 0) {
                  const imageData = images[0];
                  const fmt = reqFormat || 'webp';
                  if (typeof imageData === 'string') {
                    return imageData.startsWith('data:') ? imageData : `data:image/${fmt};base64,${imageData}`;
                  } else if (imageData?.url) {
                    return imageData.url;
                  } else if (imageData?.b64_json) {
                    return `data:image/${fmt};base64,${imageData.b64_json}`;
                  }
                }
              } else {
                const retryRaw = await retryResp.text();
                console.error('Venice AI retry error response:', retryRaw);
              }
            }
            // If steps are too big, retry with the maximum allowed
            const issues = j?.issues || [];
            const stepsIssue = issues.find((it: any) => String(it?.path?.[0]) === 'steps' && (it?.code === 'too_big' || /less than or equal/i.test(String(it?.message))));
            if (stepsIssue) {
              const max = typeof stepsIssue.maximum === 'number' ? stepsIssue.maximum : 8;
              console.warn(`⚠️ Retrying image generation with steps clamped to ${max}`);
              const retryBody = { ...requestBody, steps: Math.min(reqSteps, max) };
              const retryResp = await fetch(`${apiUrl}/image/generate`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${imageApiKey.trim()}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(retryBody),
              });
              if (retryResp.ok) {
                const data = await retryResp.json();
                console.log('Venice AI retry (steps) response data keys:', Object.keys(data));
                const images = Array.isArray(data?.images)
                  ? data.images
                  : Array.isArray(data?.data)
                    ? data.data
                    : [];
                if (images && images.length > 0) {
                  const imageData = images[0];
                  const fmt = reqFormat || 'webp';
                  if (typeof imageData === 'string') {
                    return imageData.startsWith('data:') ? imageData : `data:image/${fmt};base64,${imageData}`;
                  } else if (imageData?.url) {
                    return imageData.url;
                  } else if (imageData?.b64_json) {
                    return `data:image/${fmt};base64,${imageData.b64_json}`;
                  }
                }
              } else {
                const retryRaw = await retryResp.text();
                console.error('Venice AI retry (steps) error response:', retryRaw);
              }
            }
          } catch {}
        }
        if (response.status === 401) throw new Error('401 Unauthorized: Invalid Venice AI API key.');
        if (response.status === 402) throw new Error('402 Payment Required: Check your Venice AI balance or plan.');
        if (response.status === 403) throw new Error('403 Forbidden: API key not permitted.');
        if (response.status === 429) throw new Error('429 Rate limit exceeded.');
        if (response.status === 400) {
          let msg = '400 Bad Request';
          try { msg = (JSON.parse(raw)?.error?.message) || msg; } catch {}
          throw new Error(msg);
        }
        if (response.status >= 500) throw new Error(`Venice AI server error (${response.status}).`);
        throw new Error(`Venice AI error ${response.status}: ${raw}`);
      }

      const data = await response.json();
      console.log('Venice AI response data keys:', Object.keys(data));

      // Venice native returns an images array; tolerate other shapes
      const images = Array.isArray(data?.images)
        ? data.images
        : Array.isArray(data?.data)
          ? data.data
          : [];

      if (!images || images.length === 0) {
        console.error('No images in response:', data);
        throw new Error('No images returned from Venice AI');
      }

      // For base64 images, we need to convert to data URL (return the first)
      const imageData = images[0];
      let imageUrl: string;

      if (typeof imageData === 'string' && imageData.startsWith('data:')) {
        // Already a data URL
        imageUrl = imageData;
      } else if (typeof imageData === 'string') {
        // Assume it's base64 content without header
        const fmt = reqFormat || 'webp';
        imageUrl = `data:image/${fmt};base64,${imageData}`;
      } else if (imageData.url) {
        // Direct URL
        imageUrl = imageData.url;
      } else if (imageData.b64_json) {
        const fmt = reqFormat || 'webp';
        imageUrl = `data:image/${fmt};base64,${imageData.b64_json}`;
      } else {
        console.error('Unexpected image data format:', imageData);
        throw new Error('Unexpected image data format from Venice AI');
      }

      console.log('Image generated successfully, URL length:', imageUrl.length);
      return imageUrl;

    } catch (err) {
      console.error('Image generation error:', err);
      if (err instanceof Error) throw err;
      throw new Error(String(err));
    }
  }
}

// Legacy class for backward compatibility
export class AIServiceLegacy {
  private getHouse: () => House;

  constructor(getHouse: () => House) {
    this.getHouse = getHouse;
  }

  configure(getHouse: () => House) {
    this.getHouse = getHouse;
  }

  async generateResponse(prompt: string): Promise<string> {
    const house = this.getHouse();
    // Use new structured fields with fallback to legacy fields
    const textApiKey = house.aiSettings?.textApiKey || house.aiSettings?.apiKey;
    const textModel = house.aiSettings?.textModel || house.aiSettings?.model;
    
    return AIService.generateResponse(
      prompt, 
      textApiKey, 
      textModel
    );
  }

  async generateImage(prompt: string): Promise<string | null> {
    return AIService.generateImage(prompt);
  }
}
