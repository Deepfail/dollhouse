import { House } from '@/types';

export class AIService {
  private model: string = 'gpt-4o';

  constructor(house: House) {
    this.configure(house);
  }

  configure(house: House) {
    // Use a supported model that works with Spark
    this.model = house.aiSettings?.model || 'gpt-4o';
    
    // Map deepseek models to supported ones
    if (this.model.includes('deepseek')) {
      this.model = 'gpt-4o'; // Fallback to supported model
    }
  }

  async generateResponse(prompt: string): Promise<string> {
    try {
      // Use Spark's built-in LLM API 
      const response = await (window as any).spark?.llm?.(prompt, this.model);
      
      if (!response) {
        throw new Error('No response from AI service');
      }
      
      return response;
    } catch (error) {
      console.error('AI service error:', error);
      throw new Error(`AI service error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateImage(prompt: string, house: House): Promise<string | null> {
    // Image generation not implemented for Spark environment
    return null;
  }
}