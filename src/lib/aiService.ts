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
  static async copilotRespond(params: {
    threadId: string;
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
    sessionId?: string;
    characters?: any[];
    copilotPrompt?: string;
    housePrompt?: string;
    maxTokens?: number;
    temperature?: number;
    includeHouseContext?: boolean;
    contextDetail?: 'lite' | 'balanced' | 'detailed';
  }): Promise<string> {
    // For now we ignore threadId beyond potential future continuity usage
    const proc: any = (typeof globalThis !== 'undefined' && (globalThis as any).process) ? (globalThis as any).process : undefined;

    const userPrompt = params.copilotPrompt?.trim();
    const envPrompt = (proc?.env?.COPILOT_SYSTEM_PROMPT)
      || 'You are Wingman (the in-app developer/creative copilot) for Dollhouse. Be concise, context-aware, and tool-aware.';

    const hasCustomPrompt = Boolean(userPrompt);
    const includeContext = params.includeHouseContext ?? true;
    let systemPrompt = userPrompt || envPrompt;
  const promptAdditions: string[] = [];
  const detailLevel: 'lite' | 'balanced' | 'detailed' = params.contextDetail ?? 'balanced';
  const detailRank: Record<'lite' | 'balanced' | 'detailed', number> = { lite: 0, balanced: 1, detailed: 2 };
  const allowDetail = (level: 'lite' | 'balanced' | 'detailed') => detailRank[detailLevel] >= detailRank[level];

    const truncate = (value: unknown, max = 180): string => {
      if (!value) return '';
      const text = String(value).replace(/\s+/g, ' ').trim();
      if (!text) return '';
      return text.length > max ? `${text.slice(0, max - 3)}...` : text;
    };

    const toList = (value: unknown): string[] => {
      if (!value) return [];
      if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
      if (typeof value === 'string') {
        return value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      }
      return [];
    };

    const formatList = (label: string, items: string[], limit = 5): string | null => {
      if (!items.length) return null;
      const sliced = items.slice(0, limit);
      const suffix = items.length > limit ? '...' : '';
      return `${label}: ${sliced.join(', ')}${suffix}`;
    };

    const formatStats = (label: string, stats: Record<string, unknown>, keys: string[]): string | null => {
      if (!stats) return null;
      const parts = keys
        .map((key) => {
          const value = stats[key];
          if (typeof value !== 'number') return null;
          return `${key}:${Math.round(value)}`;
        })
        .filter(Boolean) as string[];
      if (!parts.length) return null;
      return `${label}: ${parts.join(', ')}`;
    };

    const buildCharacterSummary = (char: any, index: number, level: 'lite' | 'balanced' | 'detailed'): string | null => {
      if (!char || !char.name) return null;

      const sections: string[] = [];
      const headerDetails: string[] = [];
      if (char.role) headerDetails.push(String(char.role));
      if (char.gender) headerDetails.push(String(char.gender));
      if (char.age) headerDetails.push(`age ${char.age}`);

      const headerSuffix = headerDetails.length ? ` (${headerDetails.join(', ')})` : '';
      sections.push(`${index + 1}. ${char.name}${headerSuffix}`);

      const summaryLimit = level === 'lite' ? 140 : level === 'balanced' ? 200 : 220;
      if (char.description) sections.push(`Summary: ${truncate(char.description, summaryLimit)}`);
      if (allowDetail('balanced') && char.appearance) {
        const appearanceLimit = level === 'detailed' ? 200 : 160;
        sections.push(`Appearance: ${truncate(char.appearance, appearanceLimit)}`);
      }

      if (allowDetail('balanced')) {
        const personalityTraits = toList(char.personalities);
        if (char.personality) personalityTraits.unshift(String(char.personality));
        const personalityLine = formatList('Personality', personalityTraits, level === 'detailed' ? 6 : 4);
        if (personalityLine) sections.push(personalityLine);
      }

      if (allowDetail('detailed')) {
        const featureLine = formatList('Features', toList(char.features));
        if (featureLine) sections.push(featureLine);
      }

      if (allowDetail('detailed') && char.skills) {
        const skillLine = formatStats('Skills', char.skills, ['hands', 'mouth', 'missionary', 'doggy', 'cowgirl']);
        if (skillLine) sections.push(skillLine);
      }

      if (char.stats) {
        const statKeys = level === 'detailed'
          ? ['love', 'happiness', 'wet', 'willing', 'loyalty', 'fight']
          : ['love', 'happiness'];
        const label = level === 'lite' ? 'Mood' : 'Core stats';
        const coreStats = formatStats(label, char.stats, statKeys);
        if (coreStats) sections.push(coreStats);
      }

      const progression = char.progression || {};
      if (allowDetail('balanced') && progression.relationshipStatus) {
        const relationshipKeys = level === 'detailed'
          ? ['affection', 'trust', 'intimacy', 'dominance', 'jealousy', 'possessiveness']
          : ['affection', 'trust', 'intimacy'];
        const relationshipStats = formatStats('Relationship', progression, relationshipKeys);
        sections.push(`Status: ${String(progression.relationshipStatus)}`);
        if (relationshipStats) sections.push(relationshipStats);
      }

      if (allowDetail('detailed') && typeof progression.sexualExperience === 'number') {
        sections.push(`Sexual experience: ${Math.round(progression.sexualExperience)}`);
      }

      if (allowDetail('detailed')) {
        const kinksLine = formatList('Kinks', toList(progression.kinks));
        if (kinksLine) sections.push(kinksLine);
        const limitsLine = formatList('Limits', toList(progression.limits));
        if (limitsLine) sections.push(limitsLine);
      }

      if (allowDetail('balanced')) {
        const preferences = progression.userPreferences || {};
        const likesLine = formatList('Likes', toList(preferences.likes));
        if (likesLine) sections.push(likesLine);
        const dislikesLine = formatList('Dislikes', toList(preferences.dislikes));
        if (dislikesLine) sections.push(dislikesLine);
        if (allowDetail('detailed')) {
          const turnOns = formatList('Turn ons', toList(preferences.turnOns));
          if (turnOns) sections.push(turnOns);
          const turnOffs = formatList('Turn offs', toList(preferences.turnOffs));
          if (turnOffs) sections.push(turnOffs);
        }
      }

      if (allowDetail('detailed') && char.prompts) {
        if (char.prompts.description) sections.push(`Prompt - description: ${truncate(char.prompts.description, 200)}`);
        if (char.prompts.personality) sections.push(`Prompt - personality: ${truncate(char.prompts.personality, 200)}`);
        if (char.prompts.background) sections.push(`Prompt - background: ${truncate(char.prompts.background, 200)}`);
        if (char.prompts.appearance) sections.push(`Prompt - appearance: ${truncate(char.prompts.appearance, 200)}`);
        if (char.prompts.responseStyle) sections.push(`Prompt - response style: ${truncate(char.prompts.responseStyle, 160)}`);
        if (char.prompts.originScenario) sections.push(`Prompt - origin scenario: ${truncate(char.prompts.originScenario, 180)}`);
      }

      if (allowDetail('detailed')) {
        const memories = Array.isArray(char.memories) ? char.memories : [];
        const notableMemories = memories
          .filter((memory: any) => memory && (memory.importance === 'high' || memory.importance === 'medium'))
          .slice(-3)
          .map((memory: any) => `${memory.importance || 'low'}: ${truncate(memory.content, 150)}`);
        if (notableMemories.length) {
          sections.push(`Key memories: ${notableMemories.join(' | ')}`);
        }

        if (progression.significantEvents && Array.isArray(progression.significantEvents)) {
          const significant = progression.significantEvents.slice(-2).map((event: any) => `${event.type || 'event'}: ${truncate(event.description, 140)}`);
          if (significant.length) {
            sections.push(`Recent events: ${significant.join(' | ')}`);
          }
        }
      }

      if (allowDetail('detailed')) {
        const conversationHistory = Array.isArray(char.conversationHistory) ? char.conversationHistory : [];
        if (conversationHistory.length) {
          const recentMessages = conversationHistory
            .slice(-3)
            .map((msg: any) => {
              if (!msg || !msg.content) return null;
              const speaker = msg.characterId ? char.name : 'User';
              return `${speaker}: ${truncate(msg.content, 140)}`;
            })
            .filter(Boolean) as string[];
          if (recentMessages.length) {
            sections.push(`Recent chats: ${recentMessages.join(' | ')}`);
          }
        }
      }

      if (allowDetail('balanced') && char.behaviorProfile && char.behaviorProfile.summary) {
        const label = level === 'lite' ? 'Vibe check' : 'Behavior summary';
        sections.push(`${label}: ${truncate(char.behaviorProfile.summary, 160)}`);
      }

      if (allowDetail('detailed') && char.progression && Array.isArray(char.progression.memorableEvents)) {
        const moments = char.progression.memorableEvents.slice(-2).map((event: any) => truncate(event.description, 120));
        if (moments.length) {
          sections.push(`Memorable moments: ${moments.join(' | ')}`);
        }
      }

      return sections.join('\n');
    };

    if (!hasCustomPrompt) {
      try {
        const isInterview = params.sessionId && await AIService.isInterviewSession(params.sessionId);
        if (isInterview) {
          const interviewPrompt = await AIService.getInterviewPrompt();
          if (interviewPrompt) {
            systemPrompt = interviewPrompt;
          }
        } else {
          const wingKey = 'wingman_settings';
          let stored: string | null = null;
          try {
            const lsMod = await import('@/lib/legacyStorage');
            stored = (lsMod as any).legacyStorage.getItem(wingKey);
          } catch { /* ignore storage load error */ }

          if (stored) {
            const parsed = JSON.parse(stored || '{}');
            if (parsed.systemPrompt) {
              systemPrompt = parsed.systemPrompt;
            }
            const extras: string[] = Array.isArray(parsed.extraPrompts) ? parsed.extraPrompts : [];
            if (extras.length) {
              promptAdditions.push(...extras);
            }
          }
        }
      } catch (e) {
        logger.warn('Failed to load system prompt settings', e);
      }

      if (includeContext && params.housePrompt?.trim()) {
        promptAdditions.push(`House Context: ${params.housePrompt.trim()}`);
      }

      if (includeContext) {
        try {
          const aliMod = await import('@/lib/aliProfile');
          const assessment = await aliMod.aliProfileService.getUserAssessment();
          if (assessment && assessment !== 'Unknown preferences') {
            promptAdditions.push(`User Assessment: ${assessment}`);
          }
        } catch (e) {
          logger.warn('Failed to load user assessment for Wingman', e);
        }
      }

      if (includeContext && params.characters && params.characters.length > 0) {
        const characterSummaries = params.characters
          .map((char: any, index: number) => buildCharacterSummary(char, index, detailLevel))
          .filter(Boolean) as string[];
        if (characterSummaries.length) {
          const rosterLabel = detailLevel === 'lite'
            ? 'House Roster (friend mode):'
            : detailLevel === 'balanced'
              ? 'House Roster (balanced):'
              : 'House Roster (analyst mode):';
          const rosterPrompt = [rosterLabel, ...characterSummaries, 'Reference these characters exactly as described. Offer guidance about them but never impersonate them or invent new roster members.'].join('\n\n');
          promptAdditions.push(rosterPrompt);
        }
      }

      promptAdditions.push(
        'Wingman Ground Rules:\n'
        + '- Stay in your Wingman persona. You are the user\'s creative copilot, not an in-world character.\n'
        + '- Respond in first-person as the assistant (e.g., "I can help you").\n'
        + '- When the user asks about characters, describe options, plans, or next steps instead of roleplaying them.\n'
        + '- Keep the tone collaborative, insightful, and actionable. Provide clear suggestions or follow-up questions.\n'
        + '- If the user requests roleplay, politely redirect them to start a chat with the character instead.'
      );
    } else {
      if (includeContext && params.housePrompt?.trim()) {
        promptAdditions.push(`House Context: ${params.housePrompt.trim()}`);
      }

      if (includeContext && params.characters && params.characters.length > 0) {
        const characterSummaries = params.characters
          .map((char: any, index: number) => buildCharacterSummary(char, index, detailLevel))
          .filter(Boolean) as string[];
        if (characterSummaries.length) {
          const rosterLabel = detailLevel === 'lite'
            ? 'Current House Roster (friend mode):'
            : detailLevel === 'balanced'
              ? 'Current House Roster (balanced):'
              : 'Current House Roster (analyst mode):';
          const rosterPrompt = [rosterLabel, ...characterSummaries, 'Use only the characters listed above. Do not invent new house members.'].join('\n\n');
          promptAdditions.push(rosterPrompt);
        }
      }
    }

    systemPrompt = [systemPrompt, ...promptAdditions].join('\n\n');

    const maxTokens = Number.isFinite(params.maxTokens) ? Math.max(1, Math.min(Math.floor(params.maxTokens as number), 4000)) : 512;
    const temperature = typeof params.temperature === 'number' ? params.temperature : 0.2;

    // Load configuration and resolve provider/model/api key
    let cfgForCopilot: { provider?: string; apiKey?: string; model?: string; apiUrl?: string } | null = null;
    try {
      cfgForCopilot = (await AIService.getApiConfig()) as any;
    } catch {
      cfgForCopilot = null;
    }

    const provider: 'openrouter' | 'venice' = cfgForCopilot?.provider === 'venice' ? 'venice' : 'openrouter';
    const envCopilotModel = proc?.env?.COPILOT_MODEL;
    const envOpenRouterModel = proc?.env?.OPENROUTER_MODEL;
    const envVeniceModel = proc?.env?.VENICE_COPILOT_MODEL || proc?.env?.VENICE_MODEL;

    const model = provider === 'venice'
      ? (cfgForCopilot?.model || envVeniceModel || 'llama-3.3-70b')
      : (envOpenRouterModel || envCopilotModel || cfgForCopilot?.model || 'openai/gpt-4.1-mini');

    const apiUrl = provider === 'venice' ? (cfgForCopilot?.apiUrl || '') : '';

    let apiKey = '';
    if (provider === 'venice') {
      apiKey = proc?.env?.VENICE_API_KEY || proc?.env?.VENICE_TEXT_API_KEY || cfgForCopilot?.apiKey || '';
    } else {
      apiKey = proc?.env?.OPENROUTER_API_KEY || cfgForCopilot?.apiKey || '';
    }

    if (!apiKey) {
      logger.warn('copilotRespond: no API key (env or stored config)');
      const last = params.messages[params.messages.length - 1];
      return AIService.generateAssistantReply('[no api key] ' + (last?.content || ''));
    }

    const payloadMessages = [{ role: 'system', content: systemPrompt }, ...params.messages];

    if (provider === 'venice') {
      const veniceHeaders: Record<string, string> = {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      };
      try {
        const ref = typeof globalThis !== 'undefined' && (globalThis as any)?.location?.origin ? (globalThis as any).location.origin : 'http://localhost';
        if (ref) veniceHeaders['HTTP-Referer'] = ref;
      } catch { /* ignore */ }

      const veniceBody = {
        model,
        messages: payloadMessages,
        temperature,
        max_tokens: maxTokens,
        top_p: 0.9,
      };

      const baseUrl = apiUrl || 'https://api.venice.ai/api/v1';
      try {
        const res = await safeFetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: veniceHeaders,
          body: JSON.stringify(veniceBody),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`Venice error ${res.status}: ${text.slice(0, 200)}`);
        }
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        return typeof content === 'string' ? content : '';
      } catch (e) {
        logger.error('copilotRespond Venice call failed; falling back to generateAssistantReply', e);
        const last = params.messages[params.messages.length - 1];
        return AIService.generateAssistantReply(last?.content || '');
      }
    }

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
        body: JSON.stringify({
          model,
          messages: payloadMessages,
          temperature,
          max_tokens: maxTokens,
        })
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`OpenRouter error ${res.status}: ${text.slice(0, 200)}`);
      }
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      return typeof content === 'string' ? content : '';
    } catch (e) {
      logger.error('copilotRespond OpenRouter call failed; falling back to generateAssistantReply', e);
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
