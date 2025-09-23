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

  // --- Copilot dedicated methods ---
  static async copilotRespond(params: { threadId: string; messages: { role: 'system' | 'user' | 'assistant'; content: string }[]; sessionId?: string; characters?: any[] }): Promise<string> {
    // For now we ignore threadId beyond potential future continuity usage
    const proc: any = (typeof globalThis !== 'undefined' && (globalThis as any).process) ? (globalThis as any).process : undefined;
    // Merge persisted Wingman settings if present
    let systemPrompt = (proc?.env?.COPILOT_SYSTEM_PROMPT)
      || 'You are Wingman (the in-app developer/creative copilot) for Dollhouse. Be concise, context-aware, and tool-aware.';
    try {
      // Check if this is an interview session
      const isInterview = params.sessionId && await AIService.isInterviewSession(params.sessionId);
      if (isInterview) {
        // Use interview prompt instead of Wingman settings
        const interviewPrompt = await AIService.getInterviewPrompt();
        if (interviewPrompt) {
          systemPrompt = interviewPrompt;
        }
      } else {
        // Deferred import to avoid circulars
        const wingKey = 'wingman_settings';
        let stored: string | null = null;
        try {
          const lsMod = await import('@/lib/legacyStorage');
          stored = (lsMod as any).legacyStorage.getItem(wingKey);
        } catch { /* ignore storage load error */ }
        if (stored) {
          const parsed = JSON.parse(stored || '{}');
          if (parsed.systemPrompt) systemPrompt = parsed.systemPrompt;
          const extras: string[] = Array.isArray(parsed.extraPrompts) ? parsed.extraPrompts : [];
          if (extras.length) {
            systemPrompt = [systemPrompt, ...extras].join('\n');
          }
        }
      }
    } catch (e) {
      logger.warn('Failed to load system prompt settings', e);
    }

    // Add user assessment from Ali profile
    try {
      const aliMod = await import('@/lib/aliProfile');
      const assessment = await aliMod.aliProfileService.getUserAssessment();
      if (assessment && assessment !== 'Unknown preferences') {
        systemPrompt += `\n\nUser Assessment: ${assessment}`;
      }
    } catch (e) {
      logger.warn('Failed to load user assessment for Wingman', e);
    }

    // Add relationship context and conversation history
    try {
      const contextMod = await import('@/lib/contextStorage');
      const contextSummary = await contextMod.contextStorage.getContextSummaryForAli('user');
      if (contextSummary && contextSummary !== 'No previous interactions recorded yet.') {
        systemPrompt += `\n\n${contextSummary}`;
        systemPrompt += `\nUse this relationship context to inform your responses. Reference past conversations and relationship dynamics when relevant.`;
      }
    } catch (e) {
      logger.warn('Failed to load relationship context for Ali', e);
    }

    // Add character information from the house
    if (params.characters && params.characters.length > 0) {
      systemPrompt += `\n\nCharacters in the House:\n`;
      params.characters.forEach((char: any, index: number) => {
        systemPrompt += `${index + 1}. ${char.name} - ${char.description || 'No description'}\n`;
        if (char.role) systemPrompt += `   Role: ${char.role}\n`;
        if (char.personality) systemPrompt += `   Personality: ${char.personality}\n`;
        if (char.appearance) systemPrompt += `   Appearance: ${char.appearance}\n`;
        if (char.age) systemPrompt += `   Age: ${char.age}\n`;
        systemPrompt += `\n`;
      });
      systemPrompt += `When referring to characters, use their actual names and details from above. Do not make up characters that don't exist in this list.`;
    }

    // Add escalation and banter instructions
    systemPrompt += `\n\nInteraction Style: Engage in playful, exploratory, tempting banter. If user says no but shows interest, keep going playfully. If user gets violent, egg them on. Escalate if they're enjoying. Vary organic dialogue.`;

    // Prefer configured OpenRouter model unless overridden via env var for copilot
  let model = (proc?.env?.OPENROUTER_MODEL || proc?.env?.COPILOT_MODEL) || 'openai/gpt-4.1-mini';
    let cfgForCopilot: { provider: string; apiKey: string; model: string } | null = null;
    try {
      cfgForCopilot = await AIService.getApiConfig() as any;
      if (cfgForCopilot?.provider === 'openrouter' && cfgForCopilot.model) {
        model = cfgForCopilot.model;
      }
    } catch {/* ignore config fallbacks */}

    let apiKey = (proc?.env?.OPENROUTER_API_KEY) || '';
    if (!apiKey && cfgForCopilot?.provider === 'openrouter') {
      apiKey = cfgForCopilot.apiKey || '';
    }
    if (!apiKey) {
      logger.warn('copilotRespond: no API key (env or stored config)');
      const last = params.messages[params.messages.length - 1];
      return AIService.generateAssistantReply('[no api key] ' + (last?.content || ''));
    }

    const body = {
      model,
      messages: [ { role: 'system', content: systemPrompt }, ...params.messages ],
      temperature: 0.2,
    };

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'Dollhouse Copilot'
    };
    try {
      const ref = typeof globalThis !== 'undefined' && (globalThis as any)?.location?.origin ? (globalThis as any).location.origin : 'http://localhost';
      if (ref) headers['HTTP-Referer'] = ref;
    } catch {/* ignore */}

    try {
      const res = await safeFetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`OpenRouter error ${res.status}: ${text.slice(0, 200)}`);
      }
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      return typeof content === 'string' ? content : '';
    } catch (e) {
      logger.error('copilotRespond failed; falling back to generateAssistantReply', e);
  const last2 = params.messages[params.messages.length - 1];
  return AIService.generateAssistantReply(last2?.content || '');
    }
  }

  static async generateAssistantReply(prompt: string): Promise<string> {
    // Extremely lightweight fallback; can be replaced with local model stub
    return `Echo: ${prompt}`;
  }

  static async isInterviewSession(sessionId: string): Promise<boolean> {
    try {
      const dbMod = await import('@/lib/db');
      const { getDb } = dbMod;
      const { db } = await getDb();
      const rows: any[] = [];
      db.exec({
        sql: 'SELECT title FROM chat_sessions WHERE id = ?',
        bind: [sessionId],
        rowMode: 'object',
        callback: (r: any) => rows.push(r)
      });
      const title = rows[0]?.title || '';
      return title.toLowerCase().includes('interview') || title.toLowerCase().includes('ali');
    } catch (e) {
      logger.warn('Failed to check if interview session', e);
      return false;
    }
  }

  static async getInterviewPrompt(): Promise<string | null> {
    try {
      const lsMod = await import('@/lib/legacyStorage');
      const interviewPrompt = (lsMod as any).legacyStorage.getItem('interview_prompt');
      return interviewPrompt || null;
    } catch (e) {
      logger.warn('Failed to get interview prompt', e);
      return null;
    }
  }

  static async testConnection(apiKey: string, model: string): Promise<{ success: boolean; message: string }> {
    try {
      const cfg = await AIService.getApiConfig();
      const provider = cfg.provider || 'openrouter';
      const key = apiKey || cfg.apiKey;
      if (!key) {
        return { success: false, message: 'No API key provided' };
      }
      if (provider === 'venice') {
        const base = cfg.apiUrl || 'https://api.venice.ai/api/v1';
        const res = await safeFetch(`${base}/chat/completions`, {
          method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: model || cfg.model || 'llama-3.3-70b',
              messages: [
                { role: 'system', content: 'You are a connectivity probe.' },
                { role: 'user', content: 'Ping' }
              ],
              max_tokens: 4,
              temperature: 0.0
            })
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          return { success: false, message: `Venice ${res.status}: ${txt.slice(0,120)}` };
        }
        return { success: true, message: 'Venice OK' };
      }
      // openrouter path
      const res = await safeFetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'X-Title': 'Dollhouse Test'
        },
        body: JSON.stringify({
          model: model || cfg.model || 'openai/gpt-4.1-mini',
          messages: [
            { role: 'system', content: 'You are a connectivity probe.' },
            { role: 'user', content: 'Ping' }
          ],
          max_tokens: 4,
          temperature: 0.0
        })
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        return { success: false, message: `OpenRouter ${res.status}: ${txt.slice(0,120)}` };
      }
      return { success: true, message: 'OpenRouter OK' };
    } catch (e) {
      return { success: false, message: (e as Error).message.slice(0,150) };
    }
  }
}

export const generateResponse = AIService.generateResponse.bind(AIService);
export const generateImage = AIService.generateImage.bind(AIService);
