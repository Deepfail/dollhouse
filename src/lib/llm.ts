import { repositoryStorage } from '@/hooks/useRepositoryStorage';
import { queryClient, queryKeys } from '@/lib/query';
import { getSetting } from '@/repo/settings';

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
  appearance?: string;
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
    // Try new unified settings first
    const houseConfig = await repositoryStorage.get('house_config') as any;
    if (houseConfig?.aiSettings) {
      const settings = houseConfig.aiSettings;
      const textProvider = settings.textProvider || 'openrouter';
      
      // Get provider-specific settings
      let apiKey = '';
      let textModel = '';
      let textApiUrl = '';
      
      if (textProvider === 'venice') {
        apiKey = settings.veniceTextApiKey || settings.textApiKey || '';
        textModel = settings.veniceTextModel || settings.textModel || 'venice-large';
        textApiUrl = settings.veniceTextApiUrl || settings.textApiUrl || '';
      } else {
        apiKey = settings.openrouterTextApiKey || settings.textApiKey || '';
        textModel = settings.openrouterTextModel || settings.textModel || 'deepseek/deepseek-chat-v3.1';
        textApiUrl = '';
      }
      
      return { 
        provider: textProvider, 
        apiKey, 
        apiUrl: textApiUrl,
        model: textModel
      };
    }
    
    // Fallback to legacy settings
    const provider = await getSetting('ai_provider') || 'openrouter';
    const apiKey = await getSetting('ai_api_key') || '';
    const apiUrl = await getSetting('ai_api_url') || '';
    
    return { provider, apiKey, apiUrl, model: 'deepseek/deepseek-chat-v3.1' };
  } catch (error) {
    console.error('Error getting API config:', error);
    return { provider: 'openrouter', apiKey: '', apiUrl: '', model: 'deepseek/deepseek-chat-v3.1' };
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
- appearance: A vivid, tasteful physical appearance description focused on overall looks and outfits. Keep it under 150 words. Highlight clothing style and how cute or attractive she looks in it; include non-explicit body type descriptors (e.g., petite, slim, curvy, busty, flat chest, athletic, thick thighs, bubble butt) when relevant. Avoid explicit sexual content, age mentions, or graphic details.

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
  config: { provider: string; apiKey: string; apiUrl?: string; model?: string },
  systemPrompt: string,
  userPrompt: string,
  params?: LLMParams
): Promise<string> {
  const { provider, apiKey, apiUrl, model } = config;

  if (provider === 'openrouter') {
    return callOpenRouter(apiKey, systemPrompt, userPrompt, model, params);
  } else if (provider === 'venice') {
    return callVenice(apiKey, systemPrompt, userPrompt, model, apiUrl, params);
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
  model?: string,
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
      model: model || 'deepseek/deepseek-chat-v3.1',
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
  model?: string,
  apiUrl?: string,
  params?: LLMParams
): Promise<string> {
  const baseUrl = apiUrl || 'https://api.venice.ai/api/v1';
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || 'llama-3.3-70b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: params?.temperature ?? 0.8,
      max_tokens: params?.max_tokens ?? 1000,
      top_p: params?.top_p ?? 0.9,
      venice_parameters: {
        enable_web_search: 'auto',
        enable_web_citations: true,
        include_venice_system_prompt: true,
        strip_thinking_response: false
      }
    }),
  });

  if (!response.ok) {
    const raw = await response.text();
    if (response.status === 401) throw new Error('401 Unauthorized: Invalid Venice AI API key.');
    if (response.status === 402) throw new Error('402 Payment Required: Check Venice AI billing.');
    if (response.status === 403) throw new Error('403 Forbidden: Venice AI key not permitted.');
    if (response.status === 429) throw new Error('429 Rate limit exceeded.');
    if (response.status >= 500) throw new Error(`Venice API server error (${response.status}).`);
    throw new Error(`Venice API error: ${raw || response.statusText}`);
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