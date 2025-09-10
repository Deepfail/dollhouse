import { House } from '@/types';

export class AIService {
  private house: House;

  constructor(house: House) {
    this.house = house;
  }

  configure(house: House) {
    this.house = house;
  }

  async generateResponse(prompt: string): Promise<string> {
    const provider = this.house.aiSettings?.provider || 'openrouter';
    
    if (provider === 'openrouter') {
      return this.generateOpenRouterResponse(prompt);
    }
    
    throw new Error(`Unsupported AI provider: ${provider}. Only OpenRouter is supported.`);
  }



  private async generateOpenRouterResponse(prompt: string): Promise<string> {
    try {
      const apiKey = this.house.aiSettings?.apiKey;
      if (!apiKey) {
        throw new Error('OpenRouter API key is required. Please configure it in House Settings.');
      }

      const model = this.house.aiSettings?.model || 'deepseek/deepseek-chat-v3.1';
      
      console.log('Making OpenRouter API call:', {
        model,
        promptLength: prompt.length,
        hasApiKey: !!apiKey
      });
      
      const requestBody = {
        model: model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 200,
        stream: false
      };
      
      console.log('Request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Character Creator House'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenRouter API error response:', errorText);
        
        if (response.status === 401) {
          throw new Error('Invalid OpenRouter API key. Please check your settings.');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        } else if (response.status >= 500) {
          throw new Error('OpenRouter service is temporarily unavailable.');
        } else if (response.status === 400) {
          let errorMessage = 'Invalid request to OpenRouter API';
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.error && errorData.error.message) {
              errorMessage = errorData.error.message;
            }
          } catch (e) {
            // Ignore JSON parse error
          }
          throw new Error(`OpenRouter API error: ${errorMessage}`);
        }
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Response data:', data);
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response from OpenRouter API');
      }

      const content = data.choices[0].message.content;
      console.log('Generated content:', content);
      
      return content;
    } catch (error) {
      console.error('OpenRouter API error:', error);
      throw this.handleAPIError(error);
    }
  }

  private handleAPIError(error: any): Error {
    if (error instanceof Error) {
      // Check for specific API errors
      if (error.message.includes('400')) {
        return new Error('Invalid request to AI service. Please check your message and try again.');
      } else if (error.message.includes('401') || error.message.includes('403')) {
        return new Error('AI service authentication failed. Please check your API key.');
      } else if (error.message.includes('429')) {
        return new Error('AI service rate limit exceeded. Please wait a moment and try again.');
      } else if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
        return new Error('AI service is temporarily unavailable. Please try again in a few moments.');
      }
      return error;
    }
    
    return new Error(`AI service error: ${error}`);
  }

  async generateImage(prompt: string): Promise<string | null> {
    const imageProvider = this.house.aiSettings?.imageProvider;
    
    if (imageProvider === 'venice') {
      return this.generateVeniceImage(prompt);
    }
    
    return null;
  }

  private async generateVeniceImage(prompt: string): Promise<string | null> {
    try {
      const apiKey = this.house.aiSettings?.imageApiKey;
      if (!apiKey) {
        throw new Error('Venice AI API key is required for image generation.');
      }

      // Venice AI API implementation would go here
      // For now, return null as Venice AI integration needs specific API details
      console.log('Venice AI image generation not yet implemented');
      return null;
    } catch (error) {
      console.error('Venice AI error:', error);
      return null;
    }
  }
}