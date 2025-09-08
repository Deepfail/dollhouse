export interface Character {
  id: string;
  name: string;
  description: string;
  personality: string;
  appearance: string;
  avatar?: string;
  roomId?: string;
  
  // Stats & Progression
  stats: {
    relationship: number; // 0-100
    energy: number; // 0-100
    happiness: number; // 0-100
    experience: number;
    level: number;
  };
  
  // Customizable traits
  role: string;
  skills: string[];
  classes: string[];
  unlocks: string[];
  
  // AI Configuration
  prompts: {
    system: string;
    personality: string;
    background: string;
  };
  
  // Interaction data
  lastInteraction?: Date;
  conversationHistory: ChatMessage[];
  memories: string[];
  preferences: Record<string, any>;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  type: 'private' | 'shared' | 'facility';
  capacity: number;
  residents: string[]; // Character IDs
  facilities: string[];
  unlocked: boolean;
  cost?: number;
  
  // Visual customization
  theme?: string;
  decorations: string[];
  
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  characterId?: string; // undefined for user messages
  content: string;
  timestamp: Date;
  type: 'text' | 'action' | 'system' | 'image';
  metadata?: Record<string, any>;
}

export interface ChatSession {
  id: string;
  type: 'individual' | 'group' | 'scene';
  participantIds: string[]; // Character IDs
  messages: ChatMessage[];
  context?: string;
  active: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface Gift {
  id: string;
  name: string;
  description: string;
  cost: number;
  rarity: 'common' | 'rare' | 'legendary';
  effects: {
    relationship?: number;
    happiness?: number;
    energy?: number;
  };
  icon: string;
}

export interface House {
  id: string;
  name: string;
  description: string;
  rooms: Room[];
  characters: Character[];
  currency: number;
  
  // Global settings
  worldPrompt: string;
  copilotPrompt: string;
  
  // AI Configuration  
  aiSettings: {
    provider: 'openrouter' | 'local';
    model: string;
    apiKey?: string;
    imageProvider: 'venice' | 'none';
    imageApiKey?: string;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

export interface CopilotUpdate {
  id: string;
  type: 'behavior' | 'need' | 'alert' | 'suggestion';
  characterId?: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: Date;
  handled: boolean;
}

export type AIModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
  contextLength: number;
};

export const AVAILABLE_MODELS: AIModel[] = [
  {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek Chat',
    provider: 'OpenRouter',
    description: 'Latest DeepSeek model',
    contextLength: 64000
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenRouter', 
    description: 'OpenAI GPT-4 Omni',
    contextLength: 128000
  },
  {
    id: 'deepseek/deepseek-r1',
    name: 'DeepSeek R1',
    provider: 'OpenRouter',
    description: 'DeepSeek R1 reasoning model',
    contextLength: 64000
  }
];