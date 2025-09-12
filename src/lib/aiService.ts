import { House } from '@/types';
import { simpleStorage } from '@/hooks/useSimpleStorage';

// Direct OpenRouter service - no reliance on house state getter which might be stale
export class AIService {
  
  static async generateResponse(prompt: string, apiKey?: string, model?: string, options?: { temperature?: number; max_tokens?: number }): Promise<string> {
    console.log('=== AIService.generateResponse called ===');
    console.log('Prompt length:', prompt.length);
    console.log('API Key provided directly:', !!apiKey);
    console.log('Model provided directly:', model);
    
    // Try to get API settings directly from KV if not provided
    let finalApiKey = apiKey;
    let finalModel = model || 'deepseek/deepseek-chat-v3.1';
    
    if (!finalApiKey) {
      try {
        const house = simpleStorage.get<House>('character-house');
        console.log('Retrieved house from localStorage for AI service:', !!house);
        console.log('House AI settings:', house?.aiSettings);
        
        // Use new structured fields with fallback to legacy fields
        const textApiKey = house?.aiSettings?.textApiKey || house?.aiSettings?.apiKey;
        const textModel = house?.aiSettings?.textModel || house?.aiSettings?.model;
        
        if (textApiKey && textModel) {
          finalApiKey = textApiKey.trim();
          finalModel = textModel || finalModel;
          
          console.log('Using localStorage Text API Key:', !!finalApiKey);
          console.log('Using localStorage Text Model:', finalModel);
        }
      } catch (error) {
        console.error('Failed to get house settings from localStorage:', error);
      }
    }
    
    if (!finalApiKey || finalApiKey.length === 0) {
      throw new Error('OpenRouter API key is required. Please configure it in House Settings.');
    }

    try {
      const requestBody = {
        model: finalModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.max_tokens ?? 512,
        stream: false,
      };

      console.log('Making OpenRouter request with:', {
        model: finalModel,
        apiKeyLength: finalApiKey.length,
        promptLength: prompt.length
      });

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${finalApiKey}`,
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
      
      console.log('AI response generated successfully, length:', content.length);
      return content;
      
    } catch (err) {
      console.error('AIService error:', err);
      if (err instanceof Error) throw err;
      throw new Error(String(err));
    }
  }

  static async testConnection(apiKey?: string, model?: string): Promise<{ success: boolean; message: string }> {
    console.log('=== Testing API Connection ===');
    
    let finalApiKey = apiKey;
    let finalModel = model || 'deepseek/deepseek-chat-v3.1';
    
    if (!finalApiKey) {
      try {
        const house = simpleStorage.get<House>('character-house');
        // Use new structured fields with fallback to legacy fields
        finalApiKey = (house?.aiSettings?.textApiKey || house?.aiSettings?.apiKey)?.trim();
        finalModel = house?.aiSettings?.textModel || house?.aiSettings?.model || finalModel;
      } catch (error) {
        return { success: false, message: 'Failed to get API settings from storage' };
      }
    }
    
    if (!finalApiKey || finalApiKey.length === 0) {
      return { success: false, message: 'No API key provided' };
    }

    try {
      const testPrompt = 'Say "Connection test successful" if you can read this message.';
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${finalApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Character Creator House - Connection Test',
        },
        body: JSON.stringify({
          model: finalModel,
          messages: [{ role: 'user', content: testPrompt }],
          temperature: 0.3,
          max_tokens: 50,
          stream: false,
        }),
      });

      if (!response.ok) {
        const raw = await response.text();
        console.error('Connection test failed:', response.status, raw);
        
        if (response.status === 401) return { success: false, message: 'Invalid API key' };
        if (response.status === 403) return { success: false, message: 'API key not permitted for this model' };
        if (response.status === 429) return { success: false, message: 'Rate limit exceeded' };
        if (response.status === 400) return { success: false, message: 'Bad request - check model name' };
        if (response.status >= 500) return { success: false, message: 'OpenRouter server error' };
        
        return { success: false, message: `HTTP ${response.status}` };
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      
      if (typeof content === 'string' && content.trim().length > 0) {
        console.log('Connection test successful:', content);
        return { success: true, message: `API working: ${content.slice(0, 50)}...` };
      } else {
        return { success: false, message: 'Invalid response format' };
      }
      
    } catch (err) {
      console.error('Connection test error:', err);
      return { success: false, message: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  static async generateImage(prompt: string): Promise<string | null> {
    // TODO: implement Venice AI image generation
    console.log('Image generation requested but not implemented yet');
    return null;
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
