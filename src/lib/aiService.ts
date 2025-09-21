/* eslint-disable @typescript-eslint/no-explicit-any */
import { repositoryStorage } from '@/hooks/useRepositoryStorage';
import { logger } from '@/lib/logger';

const safeFetch = async (input: any, init?: any): Promise<any> => {
  const f = (globalThis as any).fetch;
  if (typeof f === 'undefined') throw new Error('fetch not available');
  return f(input, init);
};

export interface LLMOptions {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  top_k?: number;
}

export class AIService {
  static async getApiConfig() {
    try {
      const cfg = (await repositoryStorage.get<Record<string, unknown>>('house_config')) as Record<string, unknown> | null;
      if (cfg && typeof cfg === 'object' && 'aiSettings' in cfg) {
          const s = (cfg as any).aiSettings;
        const provider = s.textProvider || 'openrouter';
        if (provider === 'venice') {
          return {
            provider: 'venice',
            apiKey: s.veniceTextApiKey || s.textApiKey || '',
            apiUrl: s.veniceTextApiUrl || s.textApiUrl || '',
            model: s.veniceTextModel || s.textModel || 'venice-large',
          };
        }

        return {
          provider: 'openrouter',
          apiKey: s.openrouterTextApiKey || s.textApiKey || '',
          apiUrl: '',
          model: s.openrouterTextModel || s.textModel || 'deepseek/deepseek-chat-v3.1',
        };
      }

      const legacy = (await repositoryStorage.get<Record<string, unknown>>('ai_settings')) as Record<string, unknown> | null;
      if (legacy && typeof legacy === 'object') {
        const l = legacy as any;
        return {
          provider: l.provider || 'openrouter',
          apiKey: l.apiKey || '',
          apiUrl: l.apiUrl || '',
          model: l.model || 'deepseek/deepseek-chat-v3.1',
        };
      }

      return { provider: 'openrouter', apiKey: '', apiUrl: '', model: 'deepseek/deepseek-chat-v3.1' };
    } catch (err) {
      logger.error('AIService.getApiConfig failed', err);
      return { provider: 'openrouter', apiKey: '', apiUrl: '', model: 'deepseek/deepseek-chat-v3.1' };
    }
  }

  static async generateResponse(
    prompt: string,
    overrideApiKey?: string,
    overrideModel?: string,
    options?: LLMOptions
  ): Promise<string> {
    const cfg = await AIService.getApiConfig();
    const apiKey = overrideApiKey ?? cfg.apiKey;
    const model = overrideModel ?? cfg.model;

    if (!apiKey) {
      logger.warn('AIService.generateResponse called but API key is not configured');
      return 'AI provider not configured. Please set up your AI provider in Settings.';
    }

    try {
      if (cfg.provider === 'venice') {
        return AIService.callVenice(apiKey, prompt, model, cfg.apiUrl, options);
      }

      return AIService.callOpenRouter(apiKey, prompt, model, options);
    } catch (err) {
      logger.error('AIService.generateResponse failed', err);
      return `AI error: ${(err as Error)?.message ?? String(err)}`;
    }
  }

  static async generateImage(prompt: string, _options?: Record<string, unknown>): Promise<string> {
    // Keep parameters referenced to satisfy linters
    void prompt;
    void _options;
    const cfg = await AIService.getApiConfig();
    if (!cfg.apiKey) {
      logger.warn('AIService.generateImage called but API key is not configured');
      return '';
    }

    logger.log('AIService.generateImage: image generation not implemented in this build');
    return '';
  }

  private static async callOpenRouter(
    apiKey: string,
    prompt: string,
    model?: string,
    params?: LLMOptions
  ): Promise<string> {
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const body = {
      model: model || 'deepseek/deepseek-chat-v3.1',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt },
      ],
      temperature: params?.temperature ?? 0.8,
      max_tokens: params?.max_tokens ?? 1000,
      top_p: params?.top_p ?? 0.9,
    };

    // use module-level safeFetch

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'Dollhouse AI Service',
    };

    try {
      const ref = typeof globalThis !== 'undefined' && (globalThis as any)?.location?.origin ? (globalThis as any).location.origin : '';
      if (ref) headers['HTTP-Referer'] = ref;
    } catch {
      // ignore
    }

    const res = await safeFetch(url, { method: 'POST', headers, body: JSON.stringify(body) });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`OpenRouter API error: ${res.status} ${res.statusText} ${txt}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  private static async callVenice(
    apiKey: string,
    prompt: string,
    model?: string,
    apiUrl?: string,
    params?: LLMOptions
  ): Promise<string> {
    const base = apiUrl || 'https://api.venice.ai/api/v1';
    const url = `${base}/chat/completions`;
    const body = {
      model: model || 'llama-3.3-70b',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt },
      ],
      temperature: params?.temperature ?? 0.8,
      max_tokens: params?.max_tokens ?? 1000,
      top_p: params?.top_p ?? 0.9,
    };

    const headers2: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    try {
      const ref = typeof globalThis !== 'undefined' && (globalThis as any)?.location?.origin ? (globalThis as any).location.origin : '';
      if (ref) headers2['HTTP-Referer'] = ref;
    } catch {
      // ignore
    }

    const res = await safeFetch(url, { method: 'POST', headers: headers2, body: JSON.stringify(body) });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Venice API error: ${res.status} ${res.statusText} ${txt}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }
}

export const generateResponse = AIService.generateResponse.bind(AIService);
export const generateImage = AIService.generateImage.bind(AIService);
