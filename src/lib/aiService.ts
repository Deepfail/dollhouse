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
    
    if (provider === 'spark') {
      return this.generateSparkResponse(prompt);
    } else if (provider === 'openrouter') {
      return this.generateOpenRouterResponse(prompt);
    }
    
    throw new Error(`Unsupported AI provider: ${provider}`);
  }

  private async generateSparkResponse(prompt: string): Promise<string> {
    try {
      // Check if spark is available
      if (!window.spark || !window.spark.llm || !window.spark.llmPrompt) {
        throw new Error('Spark AI service is not available. This app requires a Spark environment to function.');
      }

      const model = this.house.aiSettings?.model || 'gpt-4o';
      
      console.log('Using Spark AI with model:', model);
      
      // Use Spark's required prompt template system
      const formattedPrompt = window.spark.llmPrompt`${prompt}`;
      const response = await window.spark.llm(formattedPrompt, model);
      
      if (!response) {
        throw new Error('No response from Spark AI service');
      }
      
      return response;
    } catch (error) {
      console.error('Spark AI service error:', error);
      throw this.handleAPIError(error);
    }
  }

  private async generateOpenRouterResponse(prompt: string): Promise<string> {
    try {
      const apiKey = this.house.aiSettings?.apiKey;
      if (!apiKey) {
        throw new Error('OpenRouter API key is required. Please configure it in House Settings.');
      }

      const model = this.house.aiSettings?.model || 'deepseek/deepseek-chat-v3.1';
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Character Creator House'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid OpenRouter API key. Please check your settings.');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        } else if (response.status >= 500) {
          throw new Error('OpenRouter service is temporarily unavailable.');
        }
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response from OpenRouter API');
      }

      return data.choices[0].message.content;
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