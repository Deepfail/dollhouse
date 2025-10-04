/* eslint-disable @typescript-eslint/no-explicit-any */
import { repositoryStorage } from '@/hooks/useRepositoryStorage';
import { logger } from '@/lib/logger';
import { formatPrompt } from '@/lib/prompts';

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
    void _options; // Keep parameter referenced
    logger.log('AIService.generateImage called with prompt:', prompt.slice(0, 50) + '...');

    try {
      // Get house settings from repository storage
      const cfg = (await repositoryStorage.get<Record<string, unknown>>('house_config')) as Record<string, unknown> | null;
      
      let imageProvider = 'none';
      let imageApiKey = '';
      let imageApiUrl = '';
      let imageModel = 'venice-sd35';

      if (cfg && typeof cfg === 'object' && 'aiSettings' in cfg) {
        const s = (cfg as any).aiSettings;
        imageProvider = s.imageProvider || 'none';
        imageApiKey = s.imageApiKey || '';
        imageApiUrl = s.imageApiUrl || '';
        imageModel = s.imageModel || 'venice-sd35';
      }

      if (!imageProvider || imageProvider === 'none') {
        logger.warn('Image generation disabled in settings');
        return '';
      }

      if (!imageApiKey || imageApiKey.trim().length === 0) {
        logger.warn('Image API key not configured');
        return '';
      }

      // Currently only Venice AI is supported for image generation
      if (imageProvider === 'venice') {
        return AIService.generateVeniceImage(imageApiKey.trim(), prompt, imageModel, imageApiUrl);
      } else if (imageProvider === 'openrouter') {
        // OpenRouter doesn't support image generation directly, log and return empty
        logger.warn('OpenRouter does not support image generation');
        return '';
      }

      logger.warn('Unsupported image provider:', imageProvider);
      return '';
    } catch (err) {
      logger.error('AIService.generateImage failed', err);
      return '';
    }
  }

  private static async generateVeniceImage(
    apiKey: string,
    prompt: string,
    model: string,
    apiUrl?: string
  ): Promise<string> {
    const base = apiUrl || 'https://api.venice.ai/api/v1';
    const url = `${base}/image/generate`;

    const requestBody = {
      model: model || 'venice-sd35',
      prompt: prompt,
      height: 1024,
      width: 1024,
      steps: 8,
      cfg_scale: 7.5,
      seed: Math.floor(Math.random() * 1000000),
      safe_mode: false,
      return_binary: false,
      format: 'webp'
    };

    logger.log('Making Venice AI image request to:', url);

    const res = await safeFetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const txt = await res.text();
      logger.error('Venice AI image error:', res.status, txt);
      throw new Error(`Venice AI image error: ${res.status} ${txt}`);
    }

    const data = await res.json();
    
    if (!data.images || !Array.isArray(data.images) || data.images.length === 0) {
      throw new Error('No images returned from Venice AI');
    }

    const imageData = data.images[0];
    let imageUrl: string;

    if (typeof imageData === 'string' && imageData.startsWith('data:')) {
      imageUrl = imageData;
    } else if (typeof imageData === 'string' && imageData.includes('base64')) {
      imageUrl = `data:image/webp;base64,${imageData}`;
    } else if (typeof imageData === 'string') {
      imageUrl = `data:image/webp;base64,${imageData}`;
    } else if (imageData.url) {
      imageUrl = imageData.url;
    } else {
      throw new Error('Unexpected image data format from Venice AI');
    }

    logger.log('Image generated successfully, URL length:', imageUrl.length);
    return imageUrl;
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
    const includeContext = params.includeHouseContext ?? true;
    const detailLevel: 'lite' | 'balanced' | 'detailed' = params.contextDetail ?? 'balanced';
    const detailRank: Record<'lite' | 'balanced' | 'detailed', number> = { lite: 0, balanced: 1, detailed: 2 };
    const allowDetail = (level: 'lite' | 'balanced' | 'detailed') => detailRank[detailLevel] >= detailRank[level];

    let characterSummaries: string[] = [];

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

    // Build character summaries if we have characters and context is enabled
    if (includeContext && params.characters && params.characters.length > 0) {
      characterSummaries = params.characters
        .map((char: any, index: number) => buildCharacterSummary(char, index, detailLevel))
        .filter(Boolean) as string[];
    }

    // Prepare variables for the formatPrompt call

    const nonSystemMessages = params.messages.filter((msg) => msg.role === 'assistant' || msg.role === 'user');
    const lastUserIndex = (() => {
      for (let i = nonSystemMessages.length - 1; i >= 0; i -= 1) {
        if (nonSystemMessages[i].role === 'user') {
          return i;
        }
      }
      return -1;
    })();

    const historySliceEnd = lastUserIndex >= 0 ? lastUserIndex : nonSystemMessages.length;
    const RECENT_HISTORY_LIMIT = 14;
    const historyEntries = nonSystemMessages
      .slice(Math.max(0, historySliceEnd - RECENT_HISTORY_LIMIT), historySliceEnd)
      .map((entry) => {
        const speaker = entry.role === 'assistant' ? 'Copilot' : 'User';
        return `${speaker}: ${truncate(entry.content, 320)}`;
      });

    const conversationHistoryText = historyEntries.length ? historyEntries.join('\n') : 'No prior conversation.';
    const userMessageText = lastUserIndex >= 0
      ? nonSystemMessages[lastUserIndex].content
      : (nonSystemMessages[nonSystemMessages.length - 1]?.content ?? '');

    const houseContextText = includeContext && params.housePrompt?.trim() ? params.housePrompt.trim() : '';
    const houseCharactersText = characterSummaries.length ? characterSummaries.join('\n\n') : 'Unavailable';

    // Use the prompt library's copilot.mainResponse template with user's custom copilotPrompt
    // This ensures ANY edits to the prompt in the Prompt Library are respected
    const finalPrompt = formatPrompt('copilot.mainResponse', {
      copilotPrompt: params.copilotPrompt?.trim() || 'You are a helpful AI assistant for the Dollhouse game.',
      houseContext: houseContextText,
      houseCharacters: houseCharactersText,
      conversationHistory: conversationHistoryText,
      userMessage: userMessageText,
    });

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
      return AIService.generateAssistantReply('[no api key] ' + finalPrompt);
    }

    // Send the formatted prompt as a single user message
    // The copilot.mainResponse template already includes the system instructions
    const payloadMessages = [
      { role: 'user', content: finalPrompt },
    ];

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
        return AIService.generateAssistantReply(finalPrompt);
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
      return AIService.generateAssistantReply(finalPrompt);
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
