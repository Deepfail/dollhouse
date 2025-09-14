import { House } from '@/types';
import { simpleStorage } from '@/hooks/useSimpleStorage';

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
    
    // Try to get API settings directly from KV if not provided
    let finalApiKey = apiKey;
    let finalModel = model;
    let textProvider = 'openrouter';
    let textApiUrl = '';
    
    if (!finalApiKey) {
      try {
        const house = simpleStorage.get<House>('character-house');
        console.log('📦 Retrieved house from localStorage for AI service:', !!house);
        console.log('🔧 Raw house AI settings:', JSON.stringify(house?.aiSettings, null, 2));
        
        // Use new structured fields with fallback to legacy fields
        const textApiKey = house?.aiSettings?.textApiKey || house?.aiSettings?.apiKey;
        const textModel = house?.aiSettings?.textModel || house?.aiSettings?.model;
        textProvider = house?.aiSettings?.textProvider || house?.aiSettings?.provider || 'openrouter';
        textApiUrl = house?.aiSettings?.textApiUrl || '';
        
        console.log('🔍 Detected values:');
        console.log('  - textProvider:', textProvider);
        console.log('  - textApiKey exists:', !!textApiKey);
        console.log('  - textModel:', textModel);
        console.log('  - textApiUrl:', textApiUrl);
        
        if (textApiKey && textModel) {
          finalApiKey = textApiKey.trim();
          finalModel = textModel || finalModel;
          
          console.log('✅ Using localStorage settings:');
          console.log('  - API Key length:', finalApiKey?.length);
          console.log('  - Model:', finalModel);
          console.log('  - Provider:', textProvider);
        }
      } catch (error) {
        console.error('❌ Failed to get house settings from localStorage:', error);
      }
    }
    
    // Set default model based on provider if not specified
    if (!finalModel) {
      finalModel = textProvider === 'venice' ? 'llama-3.3-70b' : 'deepseek/deepseek-chat-v3.1';
    }
    
    if (!finalApiKey || finalApiKey.length === 0) {
      throw new Error(`${textProvider === 'venice' ? 'Venice AI' : 'OpenRouter'} API key is required. Please configure it in House Settings.`);
    }

    try {
      console.log('🚀 Routing to provider:', textProvider);
      // Route to appropriate provider
      if (textProvider === 'venice') {
        console.log('📍 Using Venice AI endpoint');
        return await this.generateVeniceResponse(prompt, finalApiKey, finalModel, textApiUrl, options);
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
        include_venice_system_prompt: true
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
        const house = simpleStorage.get<House>('character-house');
        // Use new structured fields with fallback to legacy fields
        finalApiKey = (house?.aiSettings?.textApiKey || house?.aiSettings?.apiKey)?.trim();
        finalModel = house?.aiSettings?.textModel || house?.aiSettings?.model;
        textProvider = house?.aiSettings?.textProvider || house?.aiSettings?.provider || 'openrouter';
        textApiUrl = house?.aiSettings?.textApiUrl || '';
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

  static async generateImage(prompt: string): Promise<string | null> {
    console.log('=== Generating image with Venice AI ===');
    console.log('Prompt:', prompt);

    try {
      // Get house settings from localStorage
      const house = simpleStorage.get<House>('character-house');
      console.log('Retrieved house from localStorage for image generation:', !!house);

      const imageProvider = house?.aiSettings?.imageProvider;
      const imageApiKey = house?.aiSettings?.imageApiKey;
      const imageApiUrl = house?.aiSettings?.imageApiUrl;

      const imageModel = house?.aiSettings?.imageModel || 'venice-sd35';

      console.log('Image model:', imageModel);

      if (!imageProvider || imageProvider === 'none') {
        console.log('Image generation disabled');
        return null;
      }

      if (imageProvider !== 'venice') {
        console.log('Unsupported image provider:', imageProvider);
        return null;
      }

      if (!imageApiKey || imageApiKey.trim().length === 0) {
        throw new Error('Venice AI API key is required. Please configure it in House Settings.');
      }

      // Venice AI API endpoint
      const apiUrl = imageApiUrl || 'https://api.venice.ai/api/v1';

      const requestBody = {
        model: imageModel, // Use selected model from settings
        prompt: prompt,
        height: 1024,
        width: 1024,
        steps: 8, // Venice AI limit is 8 steps max
        cfg_scale: 7.5,
        seed: Math.floor(Math.random() * 1000000), // Random seed for variety
        safe_mode: false, // Allow uncensored content
        return_binary: false, // Return base64 encoded images
        format: 'webp' // WebP format for better compression
      };

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
        if (response.status === 401) throw new Error('401 Unauthorized: Invalid Venice AI API key.');
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

      // Venice AI returns images array with base64 encoded images
      if (!data.images || !Array.isArray(data.images) || data.images.length === 0) {
        console.error('No images in response:', data);
        throw new Error('No images returned from Venice AI');
      }

      // For base64 images, we need to convert to data URL
      const imageData = data.images[0];
      let imageUrl: string;

      if (typeof imageData === 'string' && imageData.startsWith('data:')) {
        // Already a data URL
        imageUrl = imageData;
      } else if (typeof imageData === 'string' && imageData.includes('base64')) {
        // Base64 string, convert to data URL
        imageUrl = `data:image/webp;base64,${imageData}`;
      } else if (typeof imageData === 'string') {
        // Assume it's base64 encoded
        imageUrl = `data:image/webp;base64,${imageData}`;
      } else if (imageData.url) {
        // Direct URL
        imageUrl = imageData.url;
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
