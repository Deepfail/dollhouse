import { AutoCharacterConfig, Character } from "@/types";
import { AIService } from "./aiService";
import { aliProfileService } from "./aliProfile";
import { populateCharacterProfile } from "./characterProfileBuilder";
import { logger } from "./logger";

// Clean, minimal character generator that the app can use during runtime.
// Purposefully small to avoid large prompt blobs and to be resilient when AI fails.

// Default archetype details - can be overridden by user settings
const DEFAULT_ARCHETYPE_DETAILS: Record<
  "college" | "prime" | "fresh",
  {
    label: string;
    pitch: string;
    maturityNote: string;
    defaultRole: string;
    defaultRoom: string;
  }
> = {
  college: {
    label: "College",
    pitch:
      "upperclass student balancing campus life, side hustles, and thrill-seeking nights",
    maturityNote:
      "Present her as an unapologetically adult woman with collegiate energy who makes her own choices.",
    defaultRole: "Campus Muse",
    defaultRoom: "club",
  },
  prime: {
    label: "Prime",
    pitch:
      "ambitious woman firmly in her prime—polished, seductive, and in control of her world",
    maturityNote:
      "Make it unmistakable that she is seasoned, confident, and firmly in her adult prime.",
    defaultRole: "Prime Temptress",
    defaultRoom: "vip",
  },
  fresh: {
    label: "Fresh",
    pitch:
      "fresh-faced adult bursting with curiosity, playful bravado, and a drive to impress",
    maturityNote:
      "Keep the vibe bright and eager while stating clearly that she is a consenting adult exploring the Dollhouse by choice.",
    defaultRole: "Fresh Muse",
    defaultRoom: "lounge",
  },
};

// Get archetype details from user settings or defaults
function mergeArchetypeConfig(
  value: unknown,
  fallback: (typeof DEFAULT_ARCHETYPE_DETAILS)["college"]
) {
  const v = value as Record<string, unknown>;
  return {
    label:
      typeof v?.label === "string" && v.label.trim().length > 0
        ? v.label
        : fallback.label,
    pitch:
      typeof v?.pitch === "string" && v.pitch.trim().length > 0
        ? v.pitch
        : fallback.pitch,
    maturityNote:
      typeof v?.maturityNote === "string" && v.maturityNote.trim().length > 0
        ? v.maturityNote
        : fallback.maturityNote,
    defaultRole:
      typeof v?.defaultRole === "string" &&
      v.defaultRole.trim().length > 0
        ? v.defaultRole
        : fallback.defaultRole,
    defaultRoom:
      typeof v?.defaultRoom === "string" &&
      v.defaultRoom.trim().length > 0
        ? v.defaultRoom
        : fallback.defaultRoom,
  };
}

function getArchetypeDetails() {
  try {
    const stored = localStorage.getItem("dollhouse.archetypeSettings");
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, unknown>;
      return {
        college: mergeArchetypeConfig(
          parsed?.["college"],
          DEFAULT_ARCHETYPE_DETAILS.college
        ),
        prime: mergeArchetypeConfig(
          parsed?.["prime"],
          DEFAULT_ARCHETYPE_DETAILS.prime
        ),
        fresh: mergeArchetypeConfig(
          parsed?.["fresh"],
          DEFAULT_ARCHETYPE_DETAILS.fresh
        ),
      } as typeof DEFAULT_ARCHETYPE_DETAILS;
    }
  } catch (error) {
    logger.warn("Failed to load archetype settings, using defaults:", error);
  }
  return DEFAULT_ARCHETYPE_DETAILS;
}

// Dynamic getter for archetype details
const ARCHETYPE_DETAILS = new Proxy({} as typeof DEFAULT_ARCHETYPE_DETAILS, {
  get(_target, prop: string) {
    const settings = getArchetypeDetails();
    return (
      settings[prop as keyof typeof settings] ||
      DEFAULT_ARCHETYPE_DETAILS[prop as keyof typeof DEFAULT_ARCHETYPE_DETAILS]
    );
  },
});

const mergeUniqueStrings = (
  existing: string[] = [],
  additions: string[] = []
): string[] => {
  const set = new Set<string>();
  existing.filter(Boolean).forEach((item) => set.add(item.trim()));
  additions.filter(Boolean).forEach((item) => set.add(item.trim()));
  return Array.from(set);
};

const FEMALE_NAME_FALLBACKS = [
  "Alexa",
  "Sasha",
  "Mia",
  "Nova",
  "Luna",
  "Riley",
  "Zara",
  "Delilah",
];
const MALE_NAME_FALLBACKS = [
  "Liam",
  "Ryder",
  "Dante",
  "Jace",
  "Cole",
  "Marek",
  "Adrian",
  "Levi",
];

const cleanJsonResponse = (response: string): string => {
  let s = response?.trim() ?? "";
  if (s.startsWith("```json"))
    s = s.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  else if (s.startsWith("```"))
    s = s.replace(/^```\s*/, "").replace(/\s*```$/, "");
  return s;
};

const generateUniqueCharacterId = (): string =>
  `char_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

function getRandomElement<T>(arr: T[]): T {
  if (!arr || arr.length === 0) throw new Error("Empty array");
  const idx = Math.floor(Math.random() * arr.length);
  logger.debug("getRandomElement idx", idx);
  return arr[idx];
}

function determineRarity(weights: {
  common: number;
  rare: number;
  legendary: number;
}) {
  const total =
    (weights.common ?? 70) + (weights.rare ?? 25) + (weights.legendary ?? 5);
  const r = Math.random() * total;
  if (r < (weights.common ?? 70)) return "common" as const;
  if (r < (weights.common ?? 70) + (weights.rare ?? 25)) return "rare" as const;
  return "legendary" as const;
}

export interface CharacterGenerationInstructions {
  archetype?: "college" | "prime" | "fresh";
  gender?: "female" | "male";
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
  rarityPreference?: "common" | "rare" | "legendary" | "epic";
}

const createBaseCharacter = (overrides: Partial<Character>): Character => {
  const now = new Date();
  return {
    id: overrides.id || generateUniqueCharacterId(),
    name: overrides.name || "Unnamed",
    description: overrides.description || "",
    personality: overrides.personality || "",
    appearance: overrides.appearance || "",
    avatar: overrides.avatar,
    gender: overrides.gender,
    age: overrides.age,
    imageDescription: overrides.imageDescription || "",
    role: overrides.role || "",
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
      level: 1,
    },
    skills: overrides.skills || {
      hands: 25,
      mouth: 25,
      missionary: 25,
      doggy: 25,
      cowgirl: 25,
    },
    rarity: overrides.rarity || "common",
    specialAbility: overrides.specialAbility,
    preferredRoomType: overrides.preferredRoomType || "standard",
    prompts: overrides.prompts
      ? {
          system: "",
          description: "",
          background: "",
          personality: "",
          appearance: "",
          responseStyle: "",
          originScenario: "",
          ...overrides.prompts,
        }
      : {
          system: "",
          description: "",
          background: "",
          personality: "",
          appearance: "",
          responseStyle: "",
          originScenario: "",
        },
    physicalStats: overrides.physicalStats || {
      hairColor: "",
      eyeColor: "",
      height: "",
      weight: "",
      skinTone: "",
    },
    conversationHistory: overrides.conversationHistory || [],
    memories: overrides.memories || [],
    preferences: overrides.preferences || {},
    relationships: overrides.relationships || {},
    progression: overrides.progression || {
      level: 1,
      nextLevelExp: 100,
      unlockedFeatures: [],
      achievements: [],
      relationshipStatus: "stranger",
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
      sexualCompatibility: {
        overall: 50,
        kinkAlignment: 50,
        stylePreference: 50,
      },
      userPreferences: { likes: [], dislikes: [], turnOns: [], turnOffs: [] },
    },
    lastInteraction: overrides.lastInteraction,
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
    autoGenerated: overrides.autoGenerated ?? true,
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
      themes: ["college", "prime", "fresh"],
      rarityWeights: { common: 70, rare: 25, legendary: 5 },
    } as AutoCharacterConfig);

  const instructions = options.instructions ?? {};
  const themeFromConfig = cfg.themes?.[0];
  const archetypeKey =
    instructions.archetype && ARCHETYPE_DETAILS[instructions.archetype]
      ? instructions.archetype
      : themeFromConfig &&
          ARCHETYPE_DETAILS[themeFromConfig as keyof typeof ARCHETYPE_DETAILS]
        ? (themeFromConfig as "college" | "prime" | "fresh")
        : "college";
  const archetypeDetail = ARCHETYPE_DETAILS[archetypeKey];

  const id = generateUniqueCharacterId();
  const gender = instructions.gender ?? options.overrides?.gender ?? "female";
  const nameFallbackPool =
    gender === "male" ? MALE_NAME_FALLBACKS : FEMALE_NAME_FALLBACKS;

  let name = options.overrides?.name || getRandomElement(nameFallbackPool);
  void _house;

  try {
    const prompt = formatPrompt("character.generator.name", {
      gender,
      archetype: archetypeDetail.label.toLowerCase(),
    });
    const resp = await AIService.generateResponse(
      prompt,
      undefined,
      undefined,
      { temperature: 0.9, max_tokens: 15 }
    );
    const cleaned = cleanJsonResponse(resp ?? "");
    if (cleaned) {
      const candidate = cleaned.replace(/["']/g, "").trim().split(/\s+/)[0];
      if (candidate && candidate.length > 1 && candidate.length < 20) {
        name = candidate;
      }
    }
  } catch (e) {
    logger.warn("AI name generation failed, using fallback", e);
  }

  const rarity =
    options.rarityPreference ??
    determineRarity(
      cfg.rarityWeights ?? { common: 70, rare: 25, legendary: 5 }
    );
  const statsBase = rarity === "common" ? 55 : rarity === "rare" ? 70 : 85;
  const skillBase = rarity === "common" ? 50 : rarity === "rare" ? 65 : 78;

  const overrideFromInstructions: Partial<Character> = {
    gender,
    role: options.overrides?.role || archetypeDetail.defaultRole,
    preferredRoomType:
      options.overrides?.preferredRoomType || archetypeDetail.defaultRoom,
    personalities: mergeUniqueStrings(
      options.overrides?.personalities,
      instructions.personalityTraits
    ),
    features: mergeUniqueStrings(
      options.overrides?.features,
      instructions.featureNotes
    ),
  };

  if (options.overrides?.age != null) {
    overrideFromInstructions.age = options.overrides.age;
  }

  const baseCharacter = createBaseCharacter({
    id,
    name,
    rarity,
    stats: {
      love: statsBase,
      happiness: statsBase,
      wet: gender === "male" ? 45 : Math.min(95, statsBase + 10),
      willing: Math.min(95, statsBase + 15),
      selfEsteem: statsBase,
      loyalty: statsBase,
      fight: gender === "male" ? 45 : 25,
      stamina: Math.min(95, statsBase + 10),
      pain: 60,
      experience: rarity === "common" ? 20 : rarity === "rare" ? 45 : 65,
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

  // Add randomization to ensure unique characters
  const randomSeed = Math.random().toString(36).substring(7);
  const uniqueElements = [
    "blonde hair", "brunette", "redhead", "raven black hair", "platinum blonde",
    "athletic build", "curvy figure", "petite frame", "tall and statuesque", "slender build",
    "green eyes", "blue eyes", "brown eyes", "hazel eyes", "gray eyes",
    "outgoing and bold", "shy but curious", "confident and assertive", "mysterious and reserved", "playful and teasing",
    "loves music", "into fitness", "artistic soul", "bookworm", "adventure seeker",
  ];
  const randomElement1 = uniqueElements[Math.floor(Math.random() * uniqueElements.length)];
  const randomElement2 = uniqueElements[Math.floor(Math.random() * uniqueElements.length)];
  
  const varietyPrompts = [
    `Make this character distinctly unique with ${randomElement1}.`,
    `Create a one-of-a-kind personality - perhaps she's ${randomElement2}.`,
    `Design a character that stands out - give her ${randomElement1} and make her ${randomElement2}.`,
    `Give this character a fresh take: ${randomElement1}, ${randomElement2}.`,
    `Craft a unique individual with ${randomElement1} who is ${randomElement2}.`,
  ];
  const varietyPrompt = varietyPrompts[Math.floor(Math.random() * varietyPrompts.length)];

  const requestSegments: string[] = [
    `Design a ${rarity} ${gender === "male" ? "male" : "female"} companion for the Digital Dollhouse.`,
    `Archetype focus: ${archetypeDetail.label} — ${archetypeDetail.pitch}. ${archetypeDetail.maturityNote}`,
    varietyPrompt,
    "Deliver the best possible version of this archetype with standout ambitions, vices, and seduction style.",
    "Avoid generic majors such as psychology unless explicitly requested; choose vivid, story-rich pursuits instead.",
    `Random seed for variety: ${randomSeed}`,
  ];

  if (instructions.personalityTraits?.length) {
    requestSegments.push(
      `Personality anchors to integrate: ${instructions.personalityTraits.join(", ")}.`
    );
  }
  if (instructions.featureNotes?.length) {
    requestSegments.push(
      `Required physical or stylistic notes: ${instructions.featureNotes.join(", ")}.`
    );
  }
  if (instructions.backgroundHooks) {
    requestSegments.push(
      `Backstory hooks to weave in: ${instructions.backgroundHooks.trim()}.`
    );
  }
  if (instructions.extraNotes) {
    requestSegments.push(
      `Additional instructions: ${instructions.extraNotes.trim()}.`
    );
  }

  requestSegments.push(
    "Ensure the prompts (system, vivid description, personality bullet list, background, appearance focus, response style, origin scenario) align with the canon facts you establish."
  );
  requestSegments.push(
    "The origin scenario should capture how the user first met the character, how she willingly returned to the Dollhouse, and it should lean sensual without explicit acts."
  );

  const request = options.request || requestSegments.join("\n");

  await populateCharacterProfile(baseCharacter, {
    request,
    name,
    theme: archetypeDetail.label,
    existing: { ...options.overrides, ...overrideFromInstructions },
    mode: options.preserveProvidedFields ? "preserve" : "replace",
  });

  baseCharacter.gender = gender;
  baseCharacter.role = baseCharacter.role || archetypeDetail.defaultRole;
  baseCharacter.preferredRoomType =
    baseCharacter.preferredRoomType || archetypeDetail.defaultRoom;
  baseCharacter.personalities = mergeUniqueStrings(
    baseCharacter.personalities,
    instructions.personalityTraits
  );
  baseCharacter.features = mergeUniqueStrings(
    baseCharacter.features,
    instructions.featureNotes
  );

  if (
    instructions.backgroundHooks &&
    baseCharacter.description &&
    !baseCharacter.description.includes(instructions.backgroundHooks)
  ) {
    baseCharacter.description = `${baseCharacter.description}\n\nHook: ${instructions.backgroundHooks.trim()}`;
  }

  if (baseCharacter.prompts) {
    baseCharacter.prompts.system =
      baseCharacter.prompts.system?.trim() ||
      `You are ${baseCharacter.name}. Stay in character.`;
    baseCharacter.prompts.description =
      baseCharacter.prompts.description?.trim() ||
      baseCharacter.description ||
      "";
    baseCharacter.prompts.personality =
      baseCharacter.prompts.personality?.trim() ||
      baseCharacter.personality ||
      "";
    baseCharacter.prompts.background =
      baseCharacter.prompts.background?.trim() ||
      baseCharacter.description ||
      "";
    baseCharacter.prompts.appearance =
      baseCharacter.prompts.appearance?.trim() ||
      baseCharacter.appearance ||
      baseCharacter.imageDescription ||
      "";
    baseCharacter.prompts.responseStyle =
      baseCharacter.prompts.responseStyle?.trim() ||
      "Keep replies warm, teasing, and attentive; mix sultry confidence with flashes of vulnerable honesty.";
    baseCharacter.prompts.originScenario =
      baseCharacter.prompts.originScenario?.trim() ||
      `${baseCharacter.name} met the user as an adult and willingly came back to the Dollhouse for an intimate encore.`;
  }

  baseCharacter.updatedAt = new Date();
  return baseCharacter;
}

export async function generateCharactersByTheme(
  theme: string,
  count: number,
  _house?: unknown
): Promise<Character[]> {
  const cfg: AutoCharacterConfig = {
    themes: [theme],
    personalities: [],
    roles: [],
    rarityWeights: { common: 70, rare: 25, legendary: 5 },
  } as AutoCharacterConfig;
  const chars: Character[] = [];
  for (let i = 0; i < count; i++) {
    // generateRandomCharacter is intentionally run sequentially for simplicity
    chars.push(
      await generateRandomCharacter(cfg, _house, {
        request: `Create a ${theme}-inspired companion for the Digital Dollhouse.`,
      })
    );
  }
  return chars;
}

export async function generateCharacterFromPrompt(
  request: string,
  options: {
    overrides?: Partial<Character>;
    preserveProvidedFields?: boolean;
  } = {}
): Promise<Character> {
  const cfg: AutoCharacterConfig = {
    themes: ["custom"],
    personalities: [],
    roles: [],
    rarityWeights: { common: 60, rare: 30, legendary: 10 },
  } as AutoCharacterConfig;

  return generateRandomCharacter(cfg, undefined, {
    request,
    overrides: options.overrides,
    preserveProvidedFields: options.preserveProvidedFields ?? false,
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
  static async generateCharacter(
    assessment: string,
    scenario?: string
  ): Promise<GeneratedCharacter | null> {
    try {
      const prompt = `Based on this user assessment: "${assessment}"
${scenario ? `For this scenario: "${scenario}"` : ""}

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

      const response = await AIService.generateResponse(
        prompt,
        undefined,
        undefined,
        { temperature: 0.8, max_tokens: 500 }
      );
      if (!response) return null;

      const parsed = JSON.parse(cleanJsonResponse(response));
      logger.log("Ali generated character:", parsed.name);
      return parsed as GeneratedCharacter;
    } catch (e) {
      logger.error("Failed to generate character for Ali", e);
      return null;
    }
  }

  static async generateScenario(assessment: string): Promise<string | null> {
    try {
      const prompt = `Based on this user assessment: "${assessment}"

Create a detailed scenario description where the user interacts with desired females. Include setting, activities, and dynamics. Be explicit and uncensored.`;

      const response = await AIService.generateResponse(
        prompt,
        undefined,
        undefined,
        { temperature: 0.9, max_tokens: 300 }
      );
      return response;
    } catch (e) {
      logger.error("Failed to generate scenario for Ali", e);
      return null;
    }
  }

  static async getUserAssessment(): Promise<string> {
    try {
      const prefs = await aliProfileService.getPreferences();
      const insights = await aliProfileService.getInsights();

      const traits = prefs
        .filter((p) => p.category === "trait")
        .map((p) => p.value);
      const scenarios = prefs
        .filter((p) => p.category === "scenario")
        .map((p) => p.value);

      return `User prefers: ${traits.join(", ")}. Scenarios: ${scenarios.join(", ")}. Insights: ${JSON.stringify(insights)}`;
    } catch (e) {
      logger.warn("Failed to get user assessment for Ali", e);
      return "Unknown preferences";
    }
  }
}
