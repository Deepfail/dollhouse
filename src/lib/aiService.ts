import { House } from '@/types';

export class AIService {
  private model: string = 'gpt-4o';

  constructor(house: House) {
    this.configure(house);
  }

  configure(house: House) {
    // Use Spark's supported models
    this.model = house.aiSettings?.model || 'gpt-4o';
    
    // Map any unsupported models to Spark's supported ones
    if (this.model.includes('deepseek') || this.model.includes('openrouter')) {
      // For Spark environment, use built-in models
      this.model = 'gpt-4o'; // Default to gpt-4o as it's supported by Spark
    }
  }

  async generateResponse(prompt: string): Promise<string> {
    try {
      // Check if spark is available
      if (!window.spark || !window.spark.llm || !window.spark.llmPrompt) {
        throw new Error('Spark AI service is not available. This app requires Spark environment to function.');
      }

      // Use Spark's required prompt template system
      const formattedPrompt = window.spark.llmPrompt`${prompt}`;
      const response = await window.spark.llm(formattedPrompt, this.model);
      
      if (!response) {
        throw new Error('No response from AI service');
      }
      
      return response;
    } catch (error) {
      console.error('AI service error:', error);
      
      if (error instanceof Error) {
        // Check for specific API errors
        if (error.message.includes('400')) {
          throw new Error('Invalid request to AI service. Please check your message and try again.');
        } else if (error.message.includes('401') || error.message.includes('403')) {
          throw new Error('AI service authentication failed. This may be a temporary issue.');
        } else if (error.message.includes('429')) {
          throw new Error('AI service rate limit exceeded. Please wait a moment and try again.');
        } else if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
          throw new Error('AI service is temporarily unavailable. Please try again in a few moments.');
        }
      }
      
      throw new Error(`AI service error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateImage(prompt: string, house: House): Promise<string | null> {
    // Image generation not implemented for Spark environment
    return null;
  }
}