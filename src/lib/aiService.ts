import { House } from '@/types';

export class AIService {
  private apiKey: string | null = null;
  private model: string = 'deepseek/deepseek-chat-v3.1';
  private provider: string = 'openrouter';

  constructor(house: House) {
    this.configure(house);
  }

  configure(house: House) {
    this.apiKey = house.aiSettings?.apiKey || null;
    this.model = house.aiSettings?.model || 'deepseek/deepseek-chat-v3.1';
    this.provider = house.aiSettings?.provider || 'openrouter';
  }

  async generateResponse(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('API key not configured. Please configure your AI settings in House Settings.');
    }

    if (this.provider === 'openrouter') {
      return this.callOpenRouter(prompt);
    }

    throw new Error(`Unsupported AI provider: ${this.provider}`);
  }

  private async callOpenRouter(prompt: string): Promise<string> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Character Creator House'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from OpenRouter API');
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error('OpenRouter API call failed:', error);
      if (error instanceof Error) {
        throw new Error(`AI service error: ${error.message}`);
      }
      throw new Error('Unknown error occurred while calling AI service');
    }
  }

  async generateImage(prompt: string, house: House): Promise<string | null> {
    const imageApiKey = house.aiSettings?.imageApiKey;
    const imageProvider = house.aiSettings?.imageProvider;

    if (!imageApiKey || imageProvider !== 'venice') {
      return null;
    }

    try {
      const response = await fetch('https://api.venice.ai/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${imageApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          model: 'venice-1',
          n: 1,
          size: '512x512',
          response_format: 'url'
        })
      });

      if (!response.ok) {
        console.error('Venice AI API error:', response.status, response.statusText);
        return null;
      }

      const data = await response.json();
      return data.data?.[0]?.url || null;
    } catch (error) {
      console.error('Venice AI image generation failed:', error);
      return null;
    }
  }
}