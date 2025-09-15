import { getSetting } from '@/repo/settings';
import { queryClient, queryKeys } from '@/lib/query';

export interface LLMParams {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  top_k?: number;
}

export interface CopilotPreset {
  id: string;
  name: string;
  systemPrompt: string;
  params: LLMParams;
}

export interface CharacterDraft {
  bio?: string;
  traits?: Record<string, any>;
  tags?: string[];
  assets?: string[];
  system_prompt?: string;
}

/**
 * Get the active copilot preset from settings
 */
export async function getActivePreset(): Promise<CopilotPreset | null> {
  try {
    const currentPresetId = await getSetting('current_preset');
    if (!currentPresetId) return null;

    const presetsData = await getSetting('copilot_presets');
    if (!presetsData) return null;

    const presets: CopilotPreset[] = JSON.parse(presetsData);
    return presets.find(p => p.id === currentPresetId) || null;
  } catch (error) {
    console.error('Error getting active preset:', error);
    return null;
  }
}

/**
 * Get saved API provider and key from settings
 */
export async function getApiConfig() {
  try {
    const provider = await getSetting('ai_provider') || 'openrouter';
    const apiKey = await getSetting('ai_api_key') || '';
    const apiUrl = await getSetting('ai_api_url') || '';
    
    return { provider, apiKey, apiUrl };
  } catch (error) {
    console.error('Error getting API config:', error);
    return { provider: 'openrouter', apiKey: '', apiUrl: '' };
  }
}

/**
 * Generate character draft using LLM with active preset and saved credentials
 */
export async function generateCharacterDraft(
  characterData: {
    name?: string;
    bio?: string;
    traits?: Record<string, any>;
    tags?: string[];
    system_prompt?: string;
  },
  guidance?: string
): Promise<CharacterDraft> {
  try {
    const [activePreset, apiConfig] = await Promise.all([
      getActivePreset(),
      getApiConfig()
    ]);

    if (!apiConfig.apiKey) {
      throw new Error('No API key configured. Please set up your AI provider in settings.');
    }

    // Build the prompt using active preset system prompt
    const systemPrompt = activePreset?.systemPrompt || 
      'You are a helpful AI assistant that generates character details.';

    const characterContext = Object.entries(characterData)
      .filter(([_, value]) => value)
      .map(([key, value]) => {
        if (key === 'traits' && typeof value === 'object') {
          return `${key}: ${JSON.stringify(value)}`;
        }
        if (Array.isArray(value)) {
          return `${key}: ${value.join(', ')}`;
        }
        return `${key}: ${value}`;
      })
      .join('\n');

    const userPrompt = `Generate enhanced character details for the following character:

${characterContext}

${guidance ? `\nSpecial guidance: ${guidance}` : ''}

Please provide a JSON response with any combination of these fields that would enhance the character:
- bio: Enhanced character background and personality
- traits: Object with physical/personality traits as key-value pairs
- tags: Array of relevant tags/categories
- system_prompt: AI system instructions for roleplaying this character

Focus on making the character more interesting and detailed while maintaining consistency.`;

    // Use the configured API
    const response = await callLLMAPI(
      apiConfig,
      systemPrompt,
      userPrompt,
      activePreset?.params
    );

    // Parse the response as JSON
    let parsed: CharacterDraft;
    try {
      parsed = JSON.parse(response);
    } catch {
      // If not valid JSON, extract what we can
      parsed = {
        bio: response,
      };
    }

    // Invalidate character queries to trigger UI updates
    queryClient.invalidateQueries({ queryKey: queryKeys.characters.all });

    return parsed;
  } catch (error) {
    console.error('Error generating character draft:', error);
    throw error;
  }
}

/**
 * Make API call to configured LLM provider
 */
async function callLLMAPI(
  config: { provider: string; apiKey: string; apiUrl?: string },
  systemPrompt: string,
  userPrompt: string,
  params?: LLMParams
): Promise<string> {
  const { provider, apiKey, apiUrl } = config;

  if (provider === 'openrouter') {
    return callOpenRouter(apiKey, systemPrompt, userPrompt, params);
  } else if (provider === 'venice') {
    return callVenice(apiKey, systemPrompt, userPrompt, params);
  } else if (apiUrl) {
    return callCustomAPI(apiUrl, apiKey, systemPrompt, userPrompt, params);
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }
}

async function callOpenRouter(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  params?: LLMParams
): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Dollhouse Character Creator',
    },
    body: JSON.stringify({
      model: 'deepseek/deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: params?.temperature || 0.8,
      max_tokens: params?.max_tokens || 1000,
      top_p: params?.top_p || 0.9,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

async function callVenice(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  params?: LLMParams
): Promise<string> {
  const response = await fetch('https://api.venice.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'venice/anthropic/claude-3-sonnet',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: params?.temperature || 0.8,
      max_tokens: params?.max_tokens || 1000,
      top_p: params?.top_p || 0.9,
    }),
  });

  if (!response.ok) {
    throw new Error(`Venice API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

async function callCustomAPI(
  apiUrl: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  params?: LLMParams
): Promise<string> {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: params?.temperature || 0.8,
      max_tokens: params?.max_tokens || 1000,
      top_p: params?.top_p || 0.9,
    }),
  });

  if (!response.ok) {
    throw new Error(`Custom API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || data.response || '';
}