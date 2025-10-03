import { AutoCharacterConfig, Character } from '@/types';
import { AIService } from './aiService';
import { aliProfileService } from './aliProfile';
import { populateCharacterProfile } from './characterProfileBuilder';
import { logger } from './logger';

// Clean, minimal character generator that the app can use during runtime.
// Purposefully small to avoid large prompt blobs and to be resilient when AI fails.

const ARCHETYPE_DETAILS: Record<
  'college' | 'prime' | 'fresh',
  {
    label: string;
    pitch: string;
    ageRange: string;
    defaultAge: number;
    defaultRole: string;
    defaultRoom: string;
  }
> = {
  college: {
    label: 'College',
    pitch: 'upperclass student balancing campus life, side hustles, and thrill-seeking nights',
    ageRange: '20-23',
    defaultAge: 21,
    defaultRole: 'Campus Muse',
    defaultRoom: 'club',
  },
  prime: {
    label: 'Prime',
    pitch: 'ambitious woman in her mid-to-late twenties, polished, seductive, and in control of her world',
    ageRange: '24-32',
    defaultAge: 27,
    defaultRole: 'Prime Temptress',
    defaultRoom: 'vip',
  },
  fresh: {
    label: 'Fresh',
    pitch: 'fresh-faced adult (19-21) bursting with curiosity, playful bravado, and a drive to impress',
    ageRange: '19-21',
    defaultAge: 20,
    defaultRole: 'Fresh Muse',
    defaultRoom: 'lounge',
  },
};

const mergeUniqueStrings = (existing: string[] = [], additions: string[] = []): string[] => {
  const set = new Set<string>();
  existing.filter(Boolean).forEach((item) => set.add(item.trim()));
  additions.filter(Boolean).forEach((item) => set.add(item.trim()));
  return Array.from(set);
};

const FEMALE_NAME_FALLBACKS = ['Alexa', 'Sasha', 'Mia', 'Nova', 'Luna', 'Riley', 'Zara', 'Delilah'];
const MALE_NAME_FALLBACKS = ['Liam', 'Ryder', 'Dante', 'Jace', 'Cole', 'Marek', 'Adrian', 'Levi'];

const cleanJsonResponse = (response: string): string => {
  let s = response?.trim() ?? '';
  if (s.startsWith('```json')) s = s.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  else if (s.startsWith('```')) s = s.replace(/^```\s*/, '').replace(/\s*```$/, '');
  return s;
};

const generateUniqueCharacterId = (): string => `char_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

function getRandomElement<T>(arr: T[]): T {
  if (!arr || arr.length === 0) throw new Error('Empty array');
  const idx = Math.floor(Math.random() * arr.length);
  logger.debug('getRandomElement idx', idx);
  return arr[idx];
}

function determineRarity(weights: { common: number; rare: number; legendary: number }) {
  const total = (weights.common ?? 70) + (weights.rare ?? 25) + (weights.legendary ?? 5);
  const r = Math.random() * total;
  if (r < (weights.common ?? 70)) return 'common' as const;
  if (r < (weights.common ?? 70) + (weights.rare ?? 25)) return 'rare' as const;
  return 'legendary' as const;
}

export interface CharacterGenerationInstructions {
  archetype?: 'college' | 'prime' | 'fresh';
  gender?: 'female' | 'male';
  personalityTraits?: string[];
  featureNotes?: string[];
  backgroundHooks?: string;
  extraNotes?: string;
}

export interface CharacterGenerationOptions {
  request?: string;
  overrides?: Partial<Character>;
  preserveProvidedFields?: boolean;
  instructions?: CharacterGenerationInstructions;
  rarityPreference?: 'common' | 'rare' | 'legendary' | 'epic';
}

const createBaseCharacter = (overrides: Partial<Character>): Character => {
  const now = new Date();
  return {
    id: overrides.id || generateUniqueCharacterId(),
    name: overrides.name || 'Unnamed',
    description: overrides.description || '',
    personality: overrides.personality || '',
    appearance: overrides.appearance || '',
    avatar: overrides.avatar,
    gender: overrides.gender,
    age: overrides.age,
    imageDescription: overrides.imageDescription || '',
    role: overrides.role || '',
    job: overrides.job,
    personalities: overrides.personalities || [],
    features: overrides.features || [],
    classes: overrides.classes || [],
    unlocks: overrides.unlocks || [],
    roomId: overrides.roomId,
    stats: overrides.stats || {
      love: 50,
      happiness: 50,
      wet: 40,
      willing: 45,
      selfEsteem: 50,
      loyalty: 45,
      fight: 20,
      stamina: 50,
      pain: 40,
      experience: 0,
      level: 1
    },
    skills: overrides.skills || { hands: 25, mouth: 25, missionary: 25, doggy: 25, cowgirl: 25 },
    rarity: overrides.rarity || 'common',
    specialAbility: overrides.specialAbility,
    preferredRoomType: overrides.preferredRoomType || 'standard',
    prompts: overrides.prompts
      ? {
          system: '',
          description: '',
          background: '',
          personality: '',
          appearance: '',
          responseStyle: '',
          originScenario: '',
          ...overrides.prompts,
        }
      : {
          system: '',
          description: '',
          background: '',
          personality: '',
          appearance: '',
          responseStyle: '',
          originScenario: '',
        },
    physicalStats: overrides.physicalStats || { hairColor: '', eyeColor: '', height: '', weight: '', skinTone: '' },
    conversationHistory: overrides.conversationHistory || [],
    memories: overrides.memories || [],
    preferences: overrides.preferences || {},
    relationships: overrides.relationships || {},
    progression: overrides.progression || {
      level: 1,
      nextLevelExp: 100,
      unlockedFeatures: [],
      achievements: [],
      relationshipStatus: 'stranger',
      affection: 45,
      trust: 45,
      intimacy: 10,
      dominance: 50,
      jealousy: 30,
      possessiveness: 35,
      sexualExperience: 5,
      kinks: [],
      limits: [],
      fantasies: [],
      unlockedPositions: [],
      unlockedOutfits: [],
      unlockedToys: [],
      unlockedScenarios: [],
      relationshipMilestones: [],
      sexualMilestones: [],
      significantEvents: [],
      storyChronicle: [],
      currentStoryArc: undefined,
      memorableEvents: [],
      bonds: {},
      sexualCompatibility: { overall: 50, kinkAlignment: 50, stylePreference: 50 },
      userPreferences: { likes: [], dislikes: [], turnOns: [], turnOffs: [] }
    },
    lastInteraction: overrides.lastInteraction,
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
    autoGenerated: overrides.autoGenerated ?? true
  } as Character;
};

export async function generateRandomCharacter(
  config: AutoCharacterConfig,
  _house?: unknown,
  options: CharacterGenerationOptions = {}
): Promise<Character> {
  const cfg =
    config ??
    ({
      themes: ['college', 'prime', 'fresh'],
      rarityWeights: { common: 70, rare: 25, legendary: 5 },
    } as AutoCharacterConfig);

  const instructions = options.instructions ?? {};
  const themeFromConfig = cfg.themes?.[0];
  const archetypeKey =
    (instructions.archetype && ARCHETYPE_DETAILS[instructions.archetype])
      ? instructions.archetype
      : (themeFromConfig && ARCHETYPE_DETAILS[themeFromConfig as keyof typeof ARCHETYPE_DETAILS]
          ? (themeFromConfig as 'college' | 'prime' | 'fresh')
          : 'college');
  const archetypeDetail = ARCHETYPE_DETAILS[archetypeKey];

  const id = generateUniqueCharacterId();
  const gender = instructions.gender ?? options.overrides?.gender ?? 'female';
  const nameFallbackPool = gender === 'male' ? MALE_NAME_FALLBACKS : FEMALE_NAME_FALLBACKS;

  let name = options.overrides?.name || getRandomElement(nameFallbackPool);
  void _house;

  try {
    const prompt = `Suggest a single ${gender} first name for a ${archetypeDetail.label.toLowerCase()} archetype. Return only the name.`;
    const resp = await AIService.generateResponse(prompt, undefined, undefined, { temperature: 0.65, max_tokens: 8 });
    const cleaned = cleanJsonResponse(resp ?? '');
    if (cleaned) {
      const candidate = cleaned.replace(/["']/g, '').trim();
      if (candidate) {
        name = candidate;
      }
    }
  } catch (e) {
    logger.warn('AI name generation failed, using fallback', e);
  }

  const rarity = options.rarityPreference ?? determineRarity(cfg.rarityWeights ?? { common: 70, rare: 25, legendary: 5 });
  const statsBase = rarity === 'common' ? 55 : rarity === 'rare' ? 70 : 85;
  const skillBase = rarity === 'common' ? 50 : rarity === 'rare' ? 65 : 78;

  const overrideFromInstructions: Partial<Character> = {
    gender,
    age: Math.max(18, options.overrides?.age ?? archetypeDetail.defaultAge),
    role: options.overrides?.role || archetypeDetail.defaultRole,
    preferredRoomType: options.overrides?.preferredRoomType || archetypeDetail.defaultRoom,
    personalities: mergeUniqueStrings(options.overrides?.personalities, instructions.personalityTraits),
    features: mergeUniqueStrings(options.overrides?.features, instructions.featureNotes),
  };

  const baseCharacter = createBaseCharacter({
    id,
    name,
    rarity,
    stats: {
      love: statsBase,
      happiness: statsBase,
      wet: gender === 'male' ? 45 : Math.min(95, statsBase + 10),
      willing: Math.min(95, statsBase + 15),
      selfEsteem: statsBase,
      loyalty: statsBase,
      fight: gender === 'male' ? 45 : 25,
      stamina: Math.min(95, statsBase + 10),
      pain: 60,
      experience: rarity === 'common' ? 20 : rarity === 'rare' ? 45 : 65,
      level: 1,
    },
    skills: {
      hands: skillBase,
      mouth: skillBase,
      missionary: skillBase,
      doggy: skillBase,
      cowgirl: skillBase,
    },
    ...overrideFromInstructions,
    ...options.overrides,
  });

  baseCharacter.autoGenerated = true;

  const requestSegments: string[] = [
    `Design a ${rarity} ${gender === 'male' ? 'male' : 'female'} companion for the Digital Dollhouse.`,
    `Archetype focus: ${archetypeDetail.label} — ${archetypeDetail.pitch}. Keep the age ${archetypeDetail.ageRange} and explicitly state she is 18 or older.`,
    'Deliver the best possible version of this archetype with standout ambitions, vices, and seduction style.',
    'Avoid generic majors such as psychology unless explicitly requested; choose vivid, story-rich pursuits instead.',
  ];

  if (instructions.personalityTraits?.length) {
    requestSegments.push(`Personality anchors to integrate: ${instructions.personalityTraits.join(', ')}.`);
  }
  if (instructions.featureNotes?.length) {
    requestSegments.push(`Required physical or stylistic notes: ${instructions.featureNotes.join(', ')}.`);
  }
  if (instructions.backgroundHooks) {
    requestSegments.push(`Backstory hooks to weave in: ${instructions.backgroundHooks.trim()}.`);
  }
  if (instructions.extraNotes) {
    requestSegments.push(`Additional instructions: ${instructions.extraNotes.trim()}.`);
  }

  requestSegments.push(
    'Ensure the prompts (system, vivid description, personality bullet list, background, appearance focus, response style, origin scenario) align with the canon facts you establish.'
  );
  requestSegments.push('The origin scenario should capture how the user first met the character, how she willingly returned to the Dollhouse, and it should lean sensual without explicit acts.');

  const request = options.request || requestSegments.join('\n');

  await populateCharacterProfile(baseCharacter, {
    request,
    name,
    theme: archetypeDetail.label,
    existing: { ...options.overrides, ...overrideFromInstructions },
    mode: options.preserveProvidedFields ? 'preserve' : 'replace',
  });

  baseCharacter.gender = gender;
  baseCharacter.age = Math.max(18, baseCharacter.age ?? archetypeDetail.defaultAge);
  baseCharacter.role = baseCharacter.role || archetypeDetail.defaultRole;
  baseCharacter.preferredRoomType = baseCharacter.preferredRoomType || archetypeDetail.defaultRoom;
  baseCharacter.personalities = mergeUniqueStrings(baseCharacter.personalities, instructions.personalityTraits);
  baseCharacter.features = mergeUniqueStrings(baseCharacter.features, instructions.featureNotes);

  if (instructions.backgroundHooks && baseCharacter.description && !baseCharacter.description.includes(instructions.backgroundHooks)) {
    baseCharacter.description = `${baseCharacter.description}\n\nHook: ${instructions.backgroundHooks.trim()}`;
  }

  if (baseCharacter.prompts) {
    baseCharacter.prompts.system = baseCharacter.prompts.system?.trim() || `You are ${baseCharacter.name}. Stay in character.`;
    baseCharacter.prompts.description = baseCharacter.prompts.description?.trim() || baseCharacter.description || '';
    baseCharacter.prompts.personality = baseCharacter.prompts.personality?.trim() || baseCharacter.personality || '';
    baseCharacter.prompts.background = baseCharacter.prompts.background?.trim() || baseCharacter.description || '';
    baseCharacter.prompts.appearance = baseCharacter.prompts.appearance?.trim() || baseCharacter.appearance || baseCharacter.imageDescription || '';
    baseCharacter.prompts.responseStyle = baseCharacter.prompts.responseStyle?.trim() ||
      'Keep replies warm, teasing, and attentive; mix sultry confidence with flashes of vulnerable honesty.';
    baseCharacter.prompts.originScenario = baseCharacter.prompts.originScenario?.trim() ||
      `${baseCharacter.name} met the user as an adult and willingly came back to the Dollhouse for an intimate encore.`;
  }

  baseCharacter.updatedAt = new Date();
  return baseCharacter;
}

export async function generateCharactersByTheme(theme: string, count: number, _house?: unknown): Promise<Character[]> {
  const cfg: AutoCharacterConfig = { themes: [theme], personalities: [], roles: [], rarityWeights: { common: 70, rare: 25, legendary: 5 } } as AutoCharacterConfig;
  const chars: Character[] = [];
  for (let i = 0; i < count; i++) {
    // generateRandomCharacter is intentionally run sequentially for simplicity
    chars.push(await generateRandomCharacter(cfg, _house, { request: `Create a ${theme}-inspired companion for the Digital Dollhouse.` }));
  }
  return chars;
}

export async function generateCharacterFromPrompt(
  request: string,
  options: { overrides?: Partial<Character>; preserveProvidedFields?: boolean } = {}
): Promise<Character> {
  const cfg: AutoCharacterConfig = {
    themes: ['custom'],
    personalities: [],
    roles: [],
    rarityWeights: { common: 60, rare: 30, legendary: 10 }
  } as AutoCharacterConfig;

  return generateRandomCharacter(cfg, undefined, {
    request,
    overrides: options.overrides,
    preserveProvidedFields: options.preserveProvidedFields ?? false
  });
}

// Ali-specific dynamic generation
export interface GeneratedCharacter {
  name: string;
  description: string;
  personality: string;
  appearance: string;
  background: string;
  age: number;
  traits: string[];
}

export class AliCharacterGenerator {
  static async generateCharacter(assessment: string, scenario?: string): Promise<GeneratedCharacter | null> {
    try {
      const prompt = `Based on this user assessment: "${assessment}"
${scenario ? `For this scenario: "${scenario}"` : ''}

Generate a detailed character profile for a female character the user would desire. Include:
- Name
- Age (realistic range)
- Physical appearance (detailed, including body type, hair, eyes, etc.)
- Personality traits
- Background story
- Key traits/behaviors
- Personality Prompt
- Appearance Prompt

Format as JSON:
{
  "name": "string",
  "age": number,
  "appearance": "string",
  "personality": "string",
  "background": "string",
  "traits": ["string", "string"]
}

Be creative and fitting to the assessment. No restrictions.`;

      const response = await AIService.generateResponse(prompt, undefined, undefined, { temperature: 0.8, max_tokens: 500 });
      if (!response) return null;

      const parsed = JSON.parse(cleanJsonResponse(response));
      logger.log('Ali generated character:', parsed.name);
      return parsed as GeneratedCharacter;
    } catch (e) {
      logger.error('Failed to generate character for Ali', e);
      return null;
    }
  }

  static async generateScenario(assessment: string): Promise<string | null> {
    try {
      const prompt = `Based on this user assessment: "${assessment}"

Create a detailed scenario description where the user interacts with desired females. Include setting, activities, and dynamics. Be explicit and uncensored.`;

      const response = await AIService.generateResponse(prompt, undefined, undefined, { temperature: 0.9, max_tokens: 300 });
      return response;
    } catch (e) {
      logger.error('Failed to generate scenario for Ali', e);
      return null;
    }
  }

  static async getUserAssessment(): Promise<string> {
    try {
      const prefs = await aliProfileService.getPreferences();
      const insights = await aliProfileService.getInsights();
      
      const traits = prefs.filter(p => p.category === 'trait').map(p => p.value);
      const scenarios = prefs.filter(p => p.category === 'scenario').map(p => p.value);
      
      return `User prefers: ${traits.join(', ')}. Scenarios: ${scenarios.join(', ')}. Insights: ${JSON.stringify(insights)}`;
    } catch (e) {
      logger.warn('Failed to get user assessment for Ali', e);
      return 'Unknown preferences';
    }
  }
}