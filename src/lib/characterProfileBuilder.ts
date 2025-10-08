import { AIService } from "@/lib/aiService";
import { logger } from "@/lib/logger";
import { Character } from "@/types";
import { formatPrompt, getPromptValue } from "./prompts";

interface CharacterProfileSpec {
  request: string;
  name?: string;
  theme?: string;
  existing?: Partial<Character>;
  mode?: "replace" | "preserve";
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
  let s = response?.trim() ?? "";
  if (s.startsWith("```json"))
    s = s.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  else if (s.startsWith("```"))
    s = s.replace(/^```\s*/, "").replace(/\s*```$/, "");
  return s;
};

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const sanitizeList = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : String(item)))
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const buildPrompt = (spec: CharacterProfileSpec): string => {
  const existing = spec.existing || {};
  return formatPrompt("character.architect.template", {
    themeLine: spec.theme
      ? formatPrompt("character.architect.themeLine", { theme: spec.theme })
      : "",
    preferredNameLine: spec.name
      ? formatPrompt("character.architect.preferredNameLine", {
          name: spec.name,
        })
      : "",
    existingNameLine: existing.name
      ? formatPrompt("character.architect.existingNameLine", {
          name: existing.name,
        })
      : "",
    existingPersonalityLine: existing.personality
      ? formatPrompt("character.architect.existingPersonalityLine", {
          personality: existing.personality,
        })
      : "",
    existingDescriptionLine: existing.description
      ? formatPrompt("character.architect.existingDescriptionLine", {
          description: existing.description,
        })
      : "",
    existingAppearanceLine: existing.appearance
      ? formatPrompt("character.architect.existingAppearanceLine", {
          appearance: existing.appearance,
        })
      : "",
    existingFeaturesLine:
      existing.features && existing.features.length
        ? formatPrompt("character.architect.existingFeaturesLine", {
            features: existing.features.join(", "),
          })
        : "",
    request: spec.request,
    schema: getPromptValue("character.architect.schema"),
    backstoryWarning: getPromptValue("character.architect.backstoryWarning"),
    scenarioReminder: getPromptValue("character.architect.scenarioReminder"),
    escapeInstruction: getPromptValue("character.architect.escapeInstruction"),
    responseStyleGuide: getPromptValue("character.generator.responseStyleGuide"),
    originScenarioGuide: getPromptValue("character.generator.originScenarioGuide"),
  });
};

const tryParseProfileJson = (raw: string): CharacterProfile | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return {
      name: normalizeString(parsed.name),
      role: normalizeString(parsed.role),
      job: normalizeString(parsed.job),
      age: typeof parsed.age === "number" ? parsed.age : undefined,
      gender: normalizeString(parsed.gender),
      description: normalizeString(parsed.description),
      personalitySummary:
        normalizeString(parsed.personalitySummary),
      personalityTraits: sanitizeList(parsed.personalityTraits),
      appearance: normalizeString(parsed.appearance),
      features: sanitizeList(parsed.features),
      backstory: normalizeString(parsed.backstory),
      imagePrompt: normalizeString(parsed.imagePrompt),
      prompts:
        parsed.prompts && typeof parsed.prompts === "object"
          ? {
              system: normalizeString(parsed.prompts.system),
              description: normalizeString(parsed.prompts.description),
              personality: normalizeString(parsed.prompts.personality),
              background: normalizeString(parsed.prompts.background),
              appearance: normalizeString(parsed.prompts.appearance),
              responseStyle: normalizeString(parsed.prompts.responseStyle),
              originScenario: normalizeString(parsed.prompts.originScenario),
            }
          : undefined,
      likes: sanitizeList(parsed.likes),
      dislikes: sanitizeList(parsed.dislikes),
      turnOns: sanitizeList(parsed.turnOns),
      turnOffs: sanitizeList(parsed.turnOffs),
    };
  } catch (error) {
    logger.warn(
      "[characterProfileBuilder] Failed to parse JSON profile",
      error
    );
    return null;
  }
};

const attemptJsonRepair = async (
  broken: string
): Promise<CharacterProfile | null> => {
  try {
    const repairPrompt = formatPrompt("character.jsonRepair", {
      brokenJson: broken,
    });
    const repaired = await AIService.generateResponse(
      repairPrompt,
      undefined,
      undefined,
      {
        temperature: 0.1,
        max_tokens: 800,
        top_p: 0.2,
      }
    );
    const cleanedRepair = cleanJsonResponse(repaired ?? "");
    if (!cleanedRepair) {
      return null;
    }
    const parsed = tryParseProfileJson(cleanedRepair);
    if (!parsed) {
      logger.warn(
        "[characterProfileBuilder] JSON repair attempt failed to parse"
      );
    }
    return parsed;
  } catch (error) {
    logger.warn("[characterProfileBuilder] JSON repair attempt failed", error);
    return null;
  }
};

export async function generateCharacterProfile(
  spec: CharacterProfileSpec
): Promise<CharacterProfile | null> {
  try {
    const prompt = buildPrompt(spec);
    const response = await AIService.generateResponse(
      prompt,
      undefined,
      undefined,
      {
        temperature: 0.95,
        max_tokens: 650,
        top_p: 0.95,
      }
    );

    if (!response || /AI provider not configured/i.test(response)) {
      logger.warn(
        "[characterProfileBuilder] AI response empty or provider missing"
      );
      return null;
    }

    const cleaned = cleanJsonResponse(response);
    const parsed = tryParseProfileJson(cleaned);
    if (parsed) {
      return parsed;
    }

    const repaired = await attemptJsonRepair(cleaned);
    if (repaired) {
      return repaired;
    }

    return null;
  } catch (error) {
    logger.error("[characterProfileBuilder] Profile generation failed", error);
    return null;
  }
}

const shouldReplace = (
  mode: "replace" | "preserve",
  current?: string | string[]
): boolean => {
  if (mode === "replace") return true;
  if (Array.isArray(current)) return current.length === 0;
  return !current || !String(current).trim();
};

const mergeUnique = (
  existing: string[] = [],
  additions: string[] = []
): string[] => {
  const set = new Set<string>();
  existing.forEach((item) => set.add(item.trim()));
  additions.forEach((item) => {
    const trimmed = item.trim();
    if (trimmed) set.add(trimmed);
  });
  return Array.from(set);
};

export async function populateCharacterProfile(
  character: Character,
  spec: CharacterProfileSpec
): Promise<Character> {
  const mode = spec.mode ?? "replace";
  const profile = await generateCharacterProfile(spec);
  if (!profile) {
    logger.warn(
      "[characterProfileBuilder] Using existing character data without AI enrichment"
    );
    const existingPrompts = character.prompts ?? {};
    const fallbackSystem = formatPrompt("character.prompts.fallbackSystem", {
      name: character.name,
      personalityLine: character.personality
        ? `Your personality: ${character.personality}. `
        : "",
      backgroundLine: character.description
        ? `Background: ${character.description}`
        : "",
    });
    character.prompts = {
      system: existingPrompts.system || fallbackSystem,
      description: existingPrompts.description || character.description || "",
      personality: existingPrompts.personality || character.personality || "",
      background: existingPrompts.background || character.description || "",
      appearance:
        existingPrompts.appearance ||
        character.appearance ||
        character.imageDescription ||
        "",
      responseStyle:
        existingPrompts.responseStyle ||
        getPromptValue("character.prompts.fallbackResponseStyle"),
      originScenario:
        existingPrompts.originScenario ||
        formatPrompt("character.prompts.defaultOriginScenario", {
          name: character.name,
        }),
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
    character.gender = profile.gender as Character["gender"];
  }
  // NEVER override age if it's already set - user's age is sacred!
  if (
    profile.age &&
    shouldReplace(mode, character.age as unknown as string) &&
    !character.age
  ) {
    character.age = profile.age;
  }
  if (
    profile.personalitySummary &&
    shouldReplace(mode, character.personality)
  ) {
    character.personality = profile.personalitySummary;
  }
  if (profile.description && shouldReplace(mode, character.description)) {
    character.description = profile.backstory
      ? `${profile.description}\n\nBackstory: ${profile.backstory}`
      : profile.description;
  } else if (profile.backstory && mode === "replace") {
    character.description =
      `${character.description}\n\nBackstory: ${profile.backstory}`.trim();
  }

  if (profile.appearance && shouldReplace(mode, character.appearance)) {
    character.appearance = profile.appearance;
  }
  if (profile.features && profile.features.length) {
    character.features = mergeUnique(character.features, profile.features);
  }
  if (profile.personalityTraits && profile.personalityTraits.length) {
    character.personalities = mergeUnique(
      character.personalities,
      profile.personalityTraits
    );
  }

  if (profile.imagePrompt && shouldReplace(mode, character.imageDescription)) {
    character.imageDescription = profile.imagePrompt;
  }

  const fallbackSystem = formatPrompt("character.prompts.fallbackSystem", {
    name: character.name,
    personalityLine: character.personality
      ? `Your personality: ${character.personality}. `
      : "",
    backgroundLine: character.description
      ? `Background: ${character.description}`
      : "",
  });

  character.prompts = {
    system:
      profile.prompts?.system || character.prompts?.system || fallbackSystem,
    description:
      profile.prompts?.description ||
      character.prompts?.description ||
      profile.description ||
      character.description ||
      "",
    personality:
      profile.prompts?.personality ||
      character.prompts?.personality ||
      character.personality ||
      "",
    background:
      profile.prompts?.background ||
      character.prompts?.background ||
      profile.backstory ||
      character.description ||
      "",
    appearance:
      profile.prompts?.appearance ||
      character.prompts?.appearance ||
      profile.appearance ||
      character.appearance ||
      character.imageDescription ||
      "",
    responseStyle:
      profile.prompts?.responseStyle ||
      character.prompts?.responseStyle ||
      getPromptValue("character.prompts.fallbackResponseStyle"),
    originScenario:
      profile.prompts?.originScenario ||
      character.prompts?.originScenario ||
      formatPrompt("character.prompts.defaultOriginScenario", {
        name: character.name,
      }),
  };

  character.preferences = {
    ...(character.preferences || {}),
    likes: mergeUnique(
      character.preferences?.likes as string[] | undefined,
      profile.likes
    ),
    dislikes: mergeUnique(
      character.preferences?.dislikes as string[] | undefined,
      profile.dislikes
    ),
    turnOns: mergeUnique(
      character.preferences?.turnOns as string[] | undefined,
      profile.turnOns
    ),
    turnOffs: mergeUnique(
      character.preferences?.turnOffs as string[] | undefined,
      profile.turnOffs
    ),
  };

  if (character.progression) {
    character.progression.userPreferences = {
      likes: mergeUnique(
        character.progression.userPreferences?.likes,
        profile.likes
      ),
      dislikes: mergeUnique(
        character.progression.userPreferences?.dislikes,
        profile.dislikes
      ),
      turnOns: mergeUnique(
        character.progression.userPreferences?.turnOns,
        profile.turnOns
      ),
      turnOffs: mergeUnique(
        character.progression.userPreferences?.turnOffs,
        profile.turnOffs
      ),
    };
  }

  character.updatedAt = new Date();
  return character;
}

export async function ensureCharacterPrompts(
  character: Character,
  spec: Omit<CharacterProfileSpec, "mode">
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
  return populateCharacterProfile(character, { ...spec, mode: "preserve" });
}
