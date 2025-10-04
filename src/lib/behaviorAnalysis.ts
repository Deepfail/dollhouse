import { Character, CharacterBehaviorProfile, CharacterMemory, ChatMessage } from '@/types';
import { AIService } from './aiService';
import { formatPrompt } from './prompts';
import { logger } from './logger';
import { uuid } from './uuid';

export interface BehaviorAnalysisInput {
  sessionId: string;
  messages: ChatMessage[];
  characters: Character[];
  latestUserMessage: string;
  maxHistory?: number;
}

export interface BehaviorSignalDeltas {
  affection?: number;
  trust?: number;
  intimacy?: number;
  tension?: number;
  dominance?: number;
}

export interface BehaviorAdjustment {
  characterId: string;
  behavior: string;
  confidence: number;
  summary: string;
  tags: string[];
  signals: BehaviorSignalDeltas;
  statAdjustments: {
    stats?: Partial<Character['stats']>;
    progression?: Partial<Character['progression']>;
  };
  memories: string[];
  recommendedActions: string[];
}

export interface BehaviorAnalysisResult {
  conversationSummary: string;
  followUpSuggestions: string[];
  adjustments: BehaviorAdjustment[];
}

interface ParsedResponseShape {
  conversationSummary?: string;
  followUpSuggestions?: string[];
  characters?: Array<{
    id: string;
    behavior: string;
    confidence?: number;
    summary?: string;
    tags?: string[];
    signals?: BehaviorSignalDeltas;
    statAdjustments?: {
      stats?: Record<string, number>;
      progression?: Record<string, number>;
    };
    memories?: string[];
    recommendedActions?: string[];
  }>;
}

const MAX_ABS_DELTA = 12;
const DEFAULT_RESULT: BehaviorAnalysisResult = {
  conversationSummary: 'Recent conversation captured for analysis.',
  followUpSuggestions: [],
  adjustments: []
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function sanitizeSignal(value: unknown): number | undefined {
  if (typeof value !== 'number' || Number.isNaN(value)) return undefined;
  return clamp(value, -MAX_ABS_DELTA, MAX_ABS_DELTA);
}

function sanitizePercent(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0.5;
  return clamp(value, 0, 1);
}

function extractJsonBlock(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
  return trimmed.slice(firstBrace, lastBrace + 1);
}

function buildPrompt(input: BehaviorAnalysisInput): string {
  const { characters, messages, latestUserMessage, maxHistory = 18 } = input;
  const recentMessages = messages
    .slice(-maxHistory)
    .map(msg => {
      const speaker = msg.characterId
        ? characters.find(c => c.id === msg.characterId)?.name || 'Character'
        : 'User';
      return `${speaker}: ${msg.content}`;
    })
    .join('\n');

  const characterBrief = characters
    .map(c => {
      const behavior = c.behaviorProfile?.dominantBehavior || 'unknown';
      const affection = c.progression?.affection ?? 0;
      const trust = c.progression?.trust ?? 0;
      const intimacy = c.progression?.intimacy ?? 0;
      return `- ${c.name} (id:${c.id})\n  Role: ${c.role || 'unknown'}\n  Personality: ${c.personality || 'n/a'}\n  Current behavior: ${behavior}\n  Relationship: affection ${affection}/100, trust ${trust}/100, intimacy ${intimacy}/100`;
    })
    .join('\n');

  const schema = `{
  "conversationSummary": string,
  "followUpSuggestions": string[],
  "characters": [
    {
      "id": string,
      "behavior": string,
      "confidence": number between 0 and 1,
      "summary": string,
      "tags": string[],
      "signals": {
        "affection"?: number between -12 and 12,
        "trust"?: number between -12 and 12,
        "intimacy"?: number between -12 and 12,
        "tension"?: number between -12 and 12,
        "dominance"?: number between -12 and 12
      },
      "statAdjustments": {
        "stats": { "experience"?: number between -25 and 25, "love"?: number, "happiness"?: number, "wet"?: number, "willing"?: number, "loyalty"?: number },
        "progression": { "affection"?: number, "trust"?: number, "intimacy"?: number, "dominance"?: number, "jealousy"?: number }
      },
      "memories": string[] (each max 120 chars),
      "recommendedActions": string[]
    }
  ]
}`;

  return formatPrompt('house.behavior.analysisPrompt', {
    schema,
    characterBrief,
    recentMessages,
    latestUserMessage
  });
}

function heuristicallyAssess(input: BehaviorAnalysisInput): BehaviorAnalysisResult {
  const { characters, messages } = input;
  if (!messages.length || !characters.length) return DEFAULT_RESULT;

  const latestMsg = messages[messages.length - 1];
  const lower = latestMsg.content.toLowerCase();
  const positiveWords = ['love', 'like', 'care', 'appreciate', 'thanks', 'trust'];
  const negativeWords = ['angry', 'mad', 'upset', 'hate', 'hurt'];
  const tensionWords = ['angry', 'argue', 'fight', 'upset'];

  const contains = (list: string[]) => list.some(word => lower.includes(word));

  const behaviors = characters.map<BehaviorAdjustment>(c => {
    let behavior = 'neutral';
    if (contains(positiveWords)) behavior = 'affectionate';
    if (contains(negativeWords)) behavior = 'defensive';

    return {
      characterId: c.id,
      behavior,
      confidence: behavior === 'neutral' ? 0.4 : 0.55,
      summary: behavior === 'affectionate'
        ? `${c.name} responded warmly to the latest exchange.`
        : behavior === 'defensive'
          ? `${c.name} may feel unsettled after the recent message.`
          : `${c.name} remained neutral during the exchange.`,
      tags: behavior === 'neutral' ? ['steady'] : [behavior],
      signals: {
        affection: contains(positiveWords) ? 2 : contains(negativeWords) ? -2 : 0,
        tension: contains(tensionWords) ? 3 : 0
      },
      statAdjustments: {
        stats: {},
        progression: {}
      },
      memories: [],
      recommendedActions: behavior === 'defensive'
        ? ['Offer reassurance or change the topic to something comforting.']
        : behavior === 'affectionate'
          ? ['Build on the positive momentum with a specific compliment.']
          : []
    };
  });

  return {
    conversationSummary: 'Fallback analysis: insufficient data for AI-driven insights.',
    followUpSuggestions: behaviors.flatMap(b => b.recommendedActions),
    adjustments: behaviors
  };
}

function sanitizeResponse(raw: string, input: BehaviorAnalysisInput): BehaviorAnalysisResult {
  try {
    const jsonBlock = extractJsonBlock(raw);
    if (!jsonBlock) {
      logger.warn('[behaviorAnalysis] No JSON block found in AI response.');
      return heuristicallyAssess(input);
    }

    const parsed = JSON.parse(jsonBlock) as ParsedResponseShape;
    if (!parsed || !Array.isArray(parsed.characters)) {
      logger.warn('[behaviorAnalysis] Parsed response missing characters array.');
      return heuristicallyAssess(input);
    }

    const adjustments: BehaviorAdjustment[] = parsed.characters.map(ch => ({
      characterId: ch.id,
      behavior: ch.behavior || 'neutral',
      confidence: sanitizePercent(ch.confidence),
      summary: ch.summary || 'No summary provided.',
      tags: Array.isArray(ch.tags) ? ch.tags.slice(0, 6) : [],
      signals: {
        affection: sanitizeSignal(ch.signals?.affection),
        trust: sanitizeSignal(ch.signals?.trust),
        intimacy: sanitizeSignal(ch.signals?.intimacy),
        tension: sanitizeSignal(ch.signals?.tension),
        dominance: sanitizeSignal(ch.signals?.dominance)
      },
      statAdjustments: {
        stats: sanitizeNumericMap(ch.statAdjustments?.stats),
        progression: sanitizeNumericMap(ch.statAdjustments?.progression)
      },
      memories: Array.isArray(ch.memories) ? ch.memories.slice(0, 3).map(m => m.slice(0, 160)) : [],
      recommendedActions: Array.isArray(ch.recommendedActions) ? ch.recommendedActions.slice(0, 3) : []
    }));

    return {
      conversationSummary: parsed.conversationSummary || 'Conversation analyzed.',
      followUpSuggestions: Array.isArray(parsed.followUpSuggestions) ? parsed.followUpSuggestions.slice(0, 5) : [],
      adjustments
    };
  } catch (error) {
    logger.warn('[behaviorAnalysis] Failed to parse AI response:', error);
    return heuristicallyAssess(input);
  }
}

function sanitizeNumericMap(source?: Record<string, number>): Record<string, number> | undefined {
  if (!source) return undefined;
  const safeEntries = Object.entries(source)
    .filter(([, value]) => typeof value === 'number' && !Number.isNaN(value))
    .map(([key, value]) => [key, clamp(value, -MAX_ABS_DELTA, MAX_ABS_DELTA)] as const);
  return safeEntries.length ? Object.fromEntries(safeEntries) : undefined;
}

export async function analyzeBehavior(input: BehaviorAnalysisInput): Promise<BehaviorAnalysisResult> {
  try {
    if (!input.characters.length) {
      logger.warn('[behaviorAnalysis] No characters supplied for analysis.');
      return DEFAULT_RESULT;
    }

    const prompt = buildPrompt(input);
    const aiResponse = await AIService.generateResponse(prompt, undefined, undefined, { temperature: 0.3, max_tokens: 600 });
    if (!aiResponse) {
      logger.warn('[behaviorAnalysis] Empty AI response; using heuristic fallback.');
      return heuristicallyAssess(input);
    }

    return sanitizeResponse(aiResponse, input);
  } catch (error) {
    logger.error('[behaviorAnalysis] analyzeBehavior failed:', error);
    return heuristicallyAssess(input);
  }
}

export function createBehaviorProfile(adjustment: BehaviorAdjustment, previous?: CharacterBehaviorProfile): CharacterBehaviorProfile {
  const history = previous?.previousBehaviors ? [...previous.previousBehaviors] : [];
  if (previous?.dominantBehavior) {
    history.push(previous.dominantBehavior);
  }
  return {
    dominantBehavior: adjustment.behavior,
    confidence: adjustment.confidence,
    summary: adjustment.summary,
    tags: adjustment.tags,
    emotionalSignals: {
      affection: adjustment.signals.affection ?? 0,
      trust: adjustment.signals.trust ?? 0,
      intimacy: adjustment.signals.intimacy ?? 0,
      tension: adjustment.signals.tension ?? 0,
      dominance: adjustment.signals.dominance ?? 0
    },
    recommendedActions: adjustment.recommendedActions,
    lastUpdated: new Date(),
    conversationHash: uuid(),
    previousBehaviors: history.slice(-10)
  };
}

export function buildMemoryEntries(character: Character, notes: string[]): CharacterMemory[] {
  if (!notes.length) return [];
  const base = character.memories || [];
  const created = notes.map(content => ({
    id: uuid(),
    category: 'relationship',
    content,
    importance: 'medium',
    timestamp: new Date()
  }) as CharacterMemory);
  const combined = [...base, ...created];
  const MAX_MEMORIES = 120;
  return combined.slice(-MAX_MEMORIES);
}
