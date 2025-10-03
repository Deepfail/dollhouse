import { AIService } from '@/lib/aiService';
import { logger } from '@/lib/logger';
import { Character } from '@/types';

interface CharacterProfileSpec {
  request: string;
  name?: string;
  theme?: string;
  existing?: Partial<Character>;
  mode?: 'replace' | 'preserve';
}

interface CharacterProfile {
  name?: string;
  role?: string;
  job?: string;
  age?: number;
  gender?: string;
  description?: string;
  personalitySummary?: string;
  personalityTraits?: string[];
  appearance?: string;
  features?: string[];
  backstory?: string;
  imagePrompt?: string;
  prompts?: {
    system?: string;
    description?: string;
    personality?: string;
    background?: string;
    appearance?: string;
    responseStyle?: string;
    originScenario?: string;
  };
  likes?: string[];
  dislikes?: string[];
  turnOns?: string[];
  turnOffs?: string[];
}

const cleanJsonResponse = (response: string): string => {
  let s = response?.trim() ?? '';
  if (s.startsWith('```json')) s = s.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  else if (s.startsWith('```')) s = s.replace(/^```\s*/, '').replace(/\s*```$/, '');
  return s;
};

const sanitizeList = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map(item => (typeof item === 'string' ? item.trim() : String(item)))
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }
  return [];
};

const buildPrompt = (spec: CharacterProfileSpec): string => {
  const existing = spec.existing || {};
  const parts: string[] = [];
  parts.push('You are the Character Architect for the Digital Dollhouse, an AI-powered relationship and simulation game.');
  parts.push('Design an original female character aligned with the user\'s request.');
  parts.push('Be concise, grounded, and avoid explicit sexual content. Tone: seductive but classy.');
  parts.push('Produce canonical facts that future conversations can rely on.');
  parts.push('Every character must be explicitly 18 or older. For "fresh" archetypes, frame them as 19-21 with a youthful yet adult vibe.');
  parts.push('Avoid generic or repetitive majors such as psychology unless explicitly requested; prefer distinctive studies, hustles, or passions.');
  if (spec.theme) {
    parts.push(`Theme emphasis: ${spec.theme}.`);
  }
  if (spec.name) {
    parts.push(`If you propose a different name, include it, but prefer to keep the existing name "${spec.name}" unless it clearly conflicts with the request.`);
  }
  if (existing.name) {
    parts.push(`Existing name: ${existing.name}`);
  }
  if (existing.personality) {
    parts.push(`Existing personality summary: ${existing.personality}`);
  }
  if (existing.description) {
    parts.push(`Existing description/backstory: ${existing.description}`);
  }
  if (existing.appearance) {
    parts.push(`Existing appearance notes: ${existing.appearance}`);
  }
  if (existing.features && existing.features.length) {
    parts.push(`Existing features to retain: ${existing.features.join(', ')}.`);
  }
  parts.push('User request (authoritative):');
  parts.push(spec.request);
  parts.push('Return JSON with the following shape (no markdown fences):');
  parts.push(`{
  "name": "string",
  "role": "string",
  "job": "string",
  "age": number,
  "gender": "female",
  "description": "Concise overview with core traits",
  "personalitySummary": "One or two sentences describing personality",
  "personalityTraits": ["trait", ...],
  "appearance": "Rich physical description",
  "features": ["feature", ...],
  "backstory": "Three to four sentence backstory",
  "imagePrompt": "Stable diffusion style prompt",
  "prompts": {
    "system": "System instructions for roleplaying this character",
    "description": "Succinct description prompt highlighting her hook in two sentences",
    "personality": "Bullet-style personality prompt that begins with the character's explicit personality traits",
    "background": "Narrative background prompt rooted in her history and motivations",
    "appearance": "Sensory description of how she looks, dresses, and carries herself",
    "responseStyle": "Unique description of how she replies in chat (tone, pacing, signature moves)",
    "originScenario": "Two to three sentence prompt describing how the user first met her and how she willingly returned to the Dollhouse"
  },
  "likes": ["like", ...],
  "dislikes": ["dislike", ...],
  "turnOns": ["turn on", ...],
  "turnOffs": ["turn off", ...]
}`);
  parts.push('Keep values short but expressive. All strings must be under 400 characters.');
  parts.push('Ensure the backstory is an actual history (upbringing, pivotal events, motivations) and that every prompt aligns with these canon facts.');
  parts.push('Origin scenarios should be sensual yet consensual, grounded in her backstory, and never reference minors.');
  return parts.join('\n');
};

export async function generateCharacterProfile(spec: CharacterProfileSpec): Promise<CharacterProfile | null> {
  try {
    const prompt = buildPrompt(spec);
    const response = await AIService.generateResponse(prompt, undefined, undefined, {
      temperature: 0.8,
      max_tokens: 650,
      top_p: 0.9
    });

    if (!response || /AI provider not configured/i.test(response)) {
      logger.warn('[characterProfileBuilder] AI response empty or provider missing');
      return null;
    }

    const cleaned = cleanJsonResponse(response);
    try {
      const parsed = JSON.parse(cleaned);
      return {
        name: typeof parsed.name === 'string' ? parsed.name.trim() : undefined,
        role: typeof parsed.role === 'string' ? parsed.role.trim() : undefined,
        job: typeof parsed.job === 'string' ? parsed.job.trim() : undefined,
        age: typeof parsed.age === 'number' ? parsed.age : undefined,
        gender: typeof parsed.gender === 'string' ? parsed.gender.trim() : undefined,
        description: typeof parsed.description === 'string' ? parsed.description.trim() : undefined,
        personalitySummary: typeof parsed.personalitySummary === 'string' ? parsed.personalitySummary.trim() : undefined,
        personalityTraits: sanitizeList(parsed.personalityTraits),
        appearance: typeof parsed.appearance === 'string' ? parsed.appearance.trim() : undefined,
        features: sanitizeList(parsed.features),
        backstory: typeof parsed.backstory === 'string' ? parsed.backstory.trim() : undefined,
        imagePrompt: typeof parsed.imagePrompt === 'string' ? parsed.imagePrompt.trim() : undefined,
        prompts: parsed.prompts && typeof parsed.prompts === 'object'
          ? {
              system: typeof parsed.prompts.system === 'string' ? parsed.prompts.system.trim() : undefined,
              description: typeof parsed.prompts.description === 'string' ? parsed.prompts.description.trim() : undefined,
              personality: typeof parsed.prompts.personality === 'string' ? parsed.prompts.personality.trim() : undefined,
              background: typeof parsed.prompts.background === 'string' ? parsed.prompts.background.trim() : undefined,
              appearance: typeof parsed.prompts.appearance === 'string' ? parsed.prompts.appearance.trim() : undefined,
              responseStyle: typeof parsed.prompts.responseStyle === 'string' ? parsed.prompts.responseStyle.trim() : undefined,
              originScenario: typeof parsed.prompts.originScenario === 'string' ? parsed.prompts.originScenario.trim() : undefined
            }
          : undefined,
        likes: sanitizeList(parsed.likes),
        dislikes: sanitizeList(parsed.dislikes),
        turnOns: sanitizeList(parsed.turnOns),
        turnOffs: sanitizeList(parsed.turnOffs)
      };
    } catch (error) {
      logger.warn('[characterProfileBuilder] Failed to parse JSON profile', error);
      return null;
    }
  } catch (error) {
    logger.error('[characterProfileBuilder] Profile generation failed', error);
    return null;
  }
}

const shouldReplace = (mode: 'replace' | 'preserve', current?: string | string[]): boolean => {
  if (mode === 'replace') return true;
  if (Array.isArray(current)) return current.length === 0;
  return !current || !String(current).trim();
};

const mergeUnique = (existing: string[] = [], additions: string[] = []): string[] => {
  const set = new Set<string>();
  existing.forEach(item => set.add(item.trim()));
  additions.forEach(item => {
    const trimmed = item.trim();
    if (trimmed) set.add(trimmed);
  });
  return Array.from(set);
};

export async function populateCharacterProfile(
  character: Character,
  spec: CharacterProfileSpec
): Promise<Character> {
  const mode = spec.mode ?? 'replace';
  const profile = await generateCharacterProfile(spec);
  if (!profile) {
    logger.warn('[characterProfileBuilder] Using existing character data without AI enrichment');
    const existingPrompts = character.prompts ?? {};
    character.prompts = {
      system: existingPrompts.system || `You are ${character.name}. Respond as this character.`,
      description: existingPrompts.description || character.description || '',
      personality: existingPrompts.personality || character.personality || '',
      background: existingPrompts.background || character.description || '',
      appearance: existingPrompts.appearance || character.appearance || character.imageDescription || '',
      responseStyle:
        existingPrompts.responseStyle ||
        'Keep replies playful, attentive, and a little daring. Mirror the user’s energy while staying affectionate.',
      originScenario:
        existingPrompts.originScenario ||
        `${character.name} first crossed paths with the user as an adult and willingly chose to return to the Dollhouse, curious and excited for more.`,
    };
    return character;
  }

  if (profile.name && shouldReplace(mode, character.name)) {
    character.name = profile.name;
  }
  if (profile.role && shouldReplace(mode, character.role)) {
    character.role = profile.role;
  }
  if (profile.job && shouldReplace(mode, character.job)) {
    character.job = profile.job;
  }
  if (profile.gender && shouldReplace(mode, character.gender)) {
    character.gender = profile.gender as Character['gender'];
  }
  if (profile.age && shouldReplace(mode, character.age as unknown as string)) {
    character.age = profile.age;
  }
  if (profile.personalitySummary && shouldReplace(mode, character.personality)) {
    character.personality = profile.personalitySummary;
  }
  if (profile.description && shouldReplace(mode, character.description)) {
    character.description = profile.backstory
      ? `${profile.description}\n\nBackstory: ${profile.backstory}`
      : profile.description;
  } else if (profile.backstory && mode === 'replace') {
    character.description = `${character.description}\n\nBackstory: ${profile.backstory}`.trim();
  }

  if (profile.appearance && shouldReplace(mode, character.appearance)) {
    character.appearance = profile.appearance;
  }
  if (profile.features && profile.features.length) {
    character.features = mergeUnique(character.features, profile.features);
  }
  if (profile.personalityTraits && profile.personalityTraits.length) {
    character.personalities = mergeUnique(character.personalities, profile.personalityTraits);
  }

  if (profile.imagePrompt && shouldReplace(mode, character.imageDescription)) {
    character.imageDescription = profile.imagePrompt;
  }

  character.prompts = {
    system: profile.prompts?.system || character.prompts?.system || `You are ${character.name}. Stay in character.`,
    description: profile.prompts?.description || character.prompts?.description || profile.description || character.description || '',
    personality: profile.prompts?.personality || character.prompts?.personality || character.personality || '',
    background: profile.prompts?.background || character.prompts?.background || profile.backstory || character.description || '',
    appearance: profile.prompts?.appearance || character.prompts?.appearance || profile.appearance || character.appearance || character.imageDescription || '',
    responseStyle:
      profile.prompts?.responseStyle ||
      character.prompts?.responseStyle ||
      'Keep replies warm, teasing, and anchored in her desires. Balance confidence with moments of vulnerability.',
    originScenario:
      profile.prompts?.originScenario ||
      character.prompts?.originScenario ||
      `${character.name} met the user as an adult in the Dollhouse orbit and willingly came back for a night that escalated into sensual territory.`,
  };

  character.preferences = {
    ...(character.preferences || {}),
    likes: mergeUnique(character.preferences?.likes as string[] | undefined, profile.likes),
    dislikes: mergeUnique(character.preferences?.dislikes as string[] | undefined, profile.dislikes),
    turnOns: mergeUnique(character.preferences?.turnOns as string[] | undefined, profile.turnOns),
    turnOffs: mergeUnique(character.preferences?.turnOffs as string[] | undefined, profile.turnOffs)
  };

  if (character.progression) {
    character.progression.userPreferences = {
      likes: mergeUnique(character.progression.userPreferences?.likes, profile.likes),
      dislikes: mergeUnique(character.progression.userPreferences?.dislikes, profile.dislikes),
      turnOns: mergeUnique(character.progression.userPreferences?.turnOns, profile.turnOns),
      turnOffs: mergeUnique(character.progression.userPreferences?.turnOffs, profile.turnOffs)
    };
  }

  character.updatedAt = new Date();
  return character;
}

export async function ensureCharacterPrompts(
  character: Character,
  spec: Omit<CharacterProfileSpec, 'mode'>
): Promise<Character> {
  if (
    character.prompts?.system &&
    character.prompts.description &&
    character.prompts.personality &&
    character.prompts.background &&
    character.prompts.appearance &&
    character.prompts.responseStyle &&
    character.prompts.originScenario
  ) {
    return character;
  }
  return populateCharacterProfile(character, { ...spec, mode: 'preserve' });
}
