import { House } from '@/types';

type GetHouse = () => House;

export class AIService {
  private getHouse: GetHouse;

  constructor(getHouse: GetHouse) {
    this.getHouse = getHouse;
  }

  // for compatibility if you need to swap the getter later
  configure(getHouse: GetHouse) {
    this.getHouse = getHouse;
  }

  async generateResponse(prompt: string): Promise<string> {
    const house = this.getHouse(); // always fresh
    const provider = house.aiSettings?.provider || 'openrouter';
    if (provider !== 'openrouter') {
      throw new Error(`Unsupported AI provider: ${provider}. Only OpenRouter is supported.`);
    }
    return this.generateOpenRouterResponse(prompt, house);
  }

  private async generateOpenRouterResponse(prompt: string, house: House): Promise<string> {
    try {
      const apiKey = (house.aiSettings?.apiKey || '').trim();
      if (!apiKey) throw new Error('OpenRouter API key is required. Please configure it in House Settings.');

      // ✅ double-check model slug actually exists
      const model = (house.aiSettings?.model || 'deepseek/deepseek-chat').trim();

      const requestBody = {
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: house.aiSettings?.temperature ?? 0.7,
        max_tokens: house.aiSettings?.maxTokens ?? 512, // 200 was tiny and causes truncation
        stream: false,
      };

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          // Browser-safe attribution headers per OpenRouter guidance:
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Character Creator House',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const raw = await response.text();
        // normalize common cases to clear messages
        if (response.status === 401) throw new Error('401 Unauthorized: Invalid OpenRouter API key.');
        if (response.status === 403) throw new Error('403 Forbidden: Key not permitted for this origin or model.');
        if (response.status === 429) throw new Error('429 Rate limit exceeded.');
        if (response.status === 400) {
          let msg = '400 Bad Request';
          try { msg = (JSON.parse(raw)?.error?.message) || msg; } catch {}
          throw new Error(msg);
        }
        if (response.status >= 500) throw new Error(`OpenRouter server error (${response.status}).`);
        throw new Error(`OpenRouter error ${response.status}: ${raw}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') throw new Error('Invalid response from OpenRouter API');
      return content;
    } catch (err) {
      // bubble up concise messages to the UI
      if (err instanceof Error) throw err;
      throw new Error(String(err));
    }
  }

  async generateImage(prompt: string): Promise<string | null> {
    const house = this.getHouse();
    if (house.aiSettings?.imageProvider !== 'venice') return null;
    const apiKey = (house.aiSettings?.imageApiKey || '').trim();
    if (!apiKey) throw new Error('Venice AI API key is required for image generation.');
    // TODO: implement
    return null;
  }
}
