import { AIService } from "./aiService";
import { logger } from "./logger";
import type { Character } from "@/types";

type BuilderStatus = "idle" | "awaitingConfirmation";

type BuilderContext = {
  characters?: Character[];
  housePrompt?: string;
};

interface CharacterPitch {
  name: string;
  age: number;
  summary: string;
  originStory: string;
  personalityTraits: string[];
  physicalTraits: string[];
  motivations: string;
  suggestedRole: string;
  houseFit: string;
  tags: string[];
  prompts: Partial<Character["prompts"]>;
  sampleDialogue?: string;
}

export type WingmanCharacterBuilderResult =
  | { type: "none" }
  | { type: "message"; message: string }
  | { type: "create"; message: string; character: Character }
  | { type: "error"; message: string };

const generateId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `wingman-${Math.random().toString(36).slice(2, 10)}`;
};

const defaultPrompts: Character["prompts"] = {
  system: "",
  description: "",
  background: "",
  personality: "",
  appearance: "",
  responseStyle: "",
  originScenario: "",
};

export class WingmanCharacterBuilder {
  private context: BuilderContext = {};
  private status: BuilderStatus = "idle";
  private pitch: CharacterPitch | undefined;

  updateContext(context: BuilderContext) {
    this.context = { ...this.context, ...context };
  }

  reset() {
    this.status = "idle";
    this.pitch = undefined;
  }

  async processInput(input: string): Promise<WingmanCharacterBuilderResult> {
    const trimmed = input.trim();
    if (!trimmed) {
      return { type: "none" };
    }

    if (this.status === "idle") {
      if (!this.shouldStartPitch(trimmed)) {
        return { type: "none" };
      }

      try {
        const pitch = await this.generatePitch({ request: trimmed });
        this.pitch = pitch;
        this.status = "awaitingConfirmation";
        return {
          type: "message",
          message: this.buildPitchMessage(pitch),
        };
      } catch (error) {
        logger.error("WingmanCharacterBuilder failed to generate pitch", error);
        return {
          type: "error",
          message: "I lost the thread on that one. Mind trying again in a moment?",
        };
      }
    }

    if (!this.pitch) {
      this.reset();
      return { type: "none" };
    }

    if (this.isAffirmative(trimmed)) {
      const character = this.buildCharacterFromPitch(this.pitch);
      const confirmationMessage = `Done. ${this.pitch.name} will be ready momentarily.`;
      this.reset();
      return { type: "create", message: confirmationMessage, character };
    }

    if (this.isNegative(trimmed)) {
      const response = "No problem. If you want someone else, just say the word.";
      this.reset();
      return { type: "message", message: response };
    }

    try {
      const pitch = await this.generatePitch({ request: trimmed, existing: this.pitch });
      this.pitch = pitch;
      this.status = "awaitingConfirmation";
      return {
        type: "message",
        message: this.buildPitchMessage(pitch, true),
      };
    } catch (error) {
      logger.error("WingmanCharacterBuilder failed to revise pitch", error);
      return {
        type: "error",
        message: "I couldn't reshape her just yet. Want to try that tweak again?",
      };
    }
  }

  private shouldStartPitch(message: string): boolean {
    const keywords = /obtain|new\s+girl|bring\s+(?:her|someone)|find\s+(?:me\s+)?a\s+girl|recruit|another\s+girl|introduce\s+me|get\s+me\s+someone|someone\s+you\s+can\s+obtain|tell\s+me\s+about\s+a\s+girl/i;
    return keywords.test(message);
  }

  private isAffirmative(message: string): boolean {
    return /\b(obtain|bring\s+her|bring\s+her\s+by|bring\s+her\s+by\s+the\s+house|yes|sure|do\s+it|grab\s+her|get\s+her|absolutely|make\s+it\s+happen)\b/i.test(message);
  }

  private isNegative(message: string): boolean {
    return /\b(no|nah|not\s+now|later|maybe\s+later|pass|cancel|stop)\b/i.test(message);
  }

  private async generatePitch(params: {
    request: string;
    existing?: CharacterPitch;
  }): Promise<CharacterPitch> {
    const existingNames = this.context.characters?.map((c) => c.name).join(", ");
    const housePrompt = this.context.housePrompt?.trim();

    const instruction = params.existing
      ? `You previously proposed this candidate (JSON):\n${JSON.stringify(params.existing)}\n\nThe user said: "${params.request}". Update the candidate to honour the request while keeping her believable and adult.`
      : `The user asked: "${params.request}". Propose a woman, someone Wingman can "obtain" for the Dollhouse.`;

    const prompt = `You are Wingman, an experienced fixer sourcing companions for an exclusive house.\n\n${instruction}\n\nHouse context:${housePrompt ? `\n- ${housePrompt}` : "\n- Exclusive, indulgent mansion."}\n${existingNames ? `\nExisting residents to avoid duplicating: ${existingNames}.` : ""}\n\nReturn ONLY valid JSON with this shape:\n{\n  "name": string,\n  "age": number,\n  "summary": string,\n  "originStory": string (3-4 sentences),\n  "personalityTraits": string[],\n  "physicalTraits": string[],\n  "motivations": string,\n  "suggestedRole": string,\n  "houseFit": string,\n  "tags": string[],\n  "sampleDialogue": string,\n  "prompts": {\n     "system": string,\n     "description": string,\n     "background": string,\n     "personality": string,\n     "appearance": string,\n     "responseStyle": string,\n     "originScenario": string\n  }\n}\n\nRules:\n- Make her compelling and distinct.\n- Prompts must be tailored to her specifics.\n- Do not wrap the JSON in markdown fences.`;

    const response = await AIService.generateText({
      prompt,
      maxTokens: 900,
      temperature: 0.85,
    });

    if (!response) {
      throw new Error("Empty response from AI");
    }

    const cleaned = response.replace(/```json\s*/gi, "").replace(/```/g, "").trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch (error) {
      logger.error("Failed to parse character pitch JSON", error, cleaned);
      throw error;
    }

    return this.sanitizePitch(parsed);
  }

  private sanitizePitch(raw: unknown): CharacterPitch {
    if (!raw || typeof raw !== "object") {
      throw new Error("Invalid pitch payload");
    }

    const data = raw as Record<string, unknown>;

    const coerceString = (key: string, fallback = ""): string => {
      const value = data[key];
      return typeof value === "string" ? value.trim() : fallback;
    };

    const coerceNumber = (key: string, fallback: number): number => {
      const value = data[key];
      if (typeof value === "number" && Number.isFinite(value)) {
        return Math.round(value);
      }
      if (typeof value === "string") {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isNaN(parsed)) {
          return parsed;
        }
      }
      return fallback;
    };

    const coerceStringArray = (key: string): string[] => {
      const value = data[key];
      if (Array.isArray(value)) {
        return value
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter((item) => item.length > 0);
      }
      if (typeof value === "string" && value.trim()) {
        return value
          .split(/[,\n]/)
          .map((item) => item.trim())
          .filter((item) => item.length > 0);
      }
      return [];
    };

    const promptsRaw = data.prompts;
    const prompts: Partial<Character["prompts"]> = { ...defaultPrompts };
    if (promptsRaw && typeof promptsRaw === "object") {
      Object.entries(promptsRaw as Record<string, unknown>).forEach(([key, value]) => {
        if (typeof value === "string" && key in prompts) {
          prompts[key as keyof Character["prompts"]] = value.trim();
        }
      });
    }

    const pitch: CharacterPitch = {
      name: coerceString("name", "Unnamed") || "Unnamed",
      age: coerceNumber("age", 20),
      summary: coerceString("summary", ""),
      originStory: coerceString("originStory", ""),
      personalityTraits: coerceStringArray("personalityTraits"),
      physicalTraits: coerceStringArray("physicalTraits"),
      motivations: coerceString("motivations", ""),
      suggestedRole: coerceString("suggestedRole", "Companion"),
      houseFit: coerceString("houseFit", ""),
      tags: coerceStringArray("tags"),
      prompts,
      sampleDialogue: coerceString("sampleDialogue", ""),
    };

    return pitch;
  }

  private buildPitchMessage(pitch: CharacterPitch, isRevision = false): string {
    const blocks: string[] = [];

    if (isRevision) {
      blocks.push("All right, here's how she looks after that tweak:");
    }

    blocks.push(`I can secure **${pitch.name}**, a ${pitch.age}-year-old ${pitch.suggestedRole.toLowerCase()}. ${pitch.summary}`);

    if (pitch.originStory) {
      blocks.push(`Backstory: ${pitch.originStory}`);
    }

    if (pitch.motivations) {
      blocks.push(`What drives her: ${pitch.motivations}`);
    }

    if (pitch.houseFit) {
      blocks.push(`Why she'd suit the Dollhouse: ${pitch.houseFit}`);
    }

    if (pitch.personalityTraits.length > 0) {
      blocks.push(`Personality markers: ${pitch.personalityTraits.join(", ")}.`);
    }

    if (pitch.physicalTraits.length > 0) {
      blocks.push(`Physical notes: ${pitch.physicalTraits.join(", ")}.`);
    }

    if (pitch.sampleDialogue) {
      blocks.push(`Imagine her whispering: “${pitch.sampleDialogue}”`);
    }

    blocks.push("Would you like me to obtain her, or should I bring her by the house?");

    return blocks.join("\n\n");
  }

  private buildCharacterFromPitch(pitch: CharacterPitch): Character {
    const now = new Date();
    const prompts: Character["prompts"] = {
      ...defaultPrompts,
      ...pitch.prompts,
    } as Character["prompts"];

    const sanitizeText = (value: string, fallback = "") =>
      value && value.trim().length > 0 ? value.trim() : fallback;

    return {
      id: generateId(),
      name: pitch.name,
      gender: "female",
      age: pitch.age,
      description: sanitizeText(prompts.background || pitch.summary, pitch.summary),
      personality: sanitizeText(prompts.personality || pitch.personalityTraits.join(", "), pitch.personalityTraits.join(", ")), 
      appearance: sanitizeText(prompts.appearance || pitch.physicalTraits.join(", "), pitch.physicalTraits.join(", ")),
      avatar: undefined,
      roomId: undefined,
      stats: {
        love: 55,
        happiness: 55,
        wet: 45,
        willing: 50,
        selfEsteem: 55,
        loyalty: 50,
        fight: 25,
        stamina: 55,
        pain: 35,
        experience: 10,
        level: 1,
      },
      skills: {
        hands: 35,
        mouth: 40,
        missionary: 35,
        doggy: 35,
        cowgirl: 30,
      },
      role: pitch.suggestedRole || "Companion",
      job: undefined,
      personalities: pitch.personalityTraits,
      features: pitch.physicalTraits,
      classes: [],
      unlocks: [],
      rarity: "common",
      specialAbility: undefined,
      preferredRoomType: "shared",
      imageDescription: sanitizeText(prompts.appearance || pitch.physicalTraits.join(", ")),
      physicalStats: {
        hairColor: "",
        eyeColor: "",
        height: "",
        weight: "",
        skinTone: "",
      },
      prompts,
      lastInteraction: undefined,
      conversationHistory: [],
      memories: [],
      preferences: { tags: pitch.tags },
      relationships: {},
      progression: {
        level: 1,
        nextLevelExp: 100,
        unlockedFeatures: [],
        achievements: [],
        relationshipStatus: "stranger",
        affection: 55,
        trust: 50,
        intimacy: 20,
        dominance: 50,
        jealousy: 25,
        possessiveness: 30,
        sexualExperience: 10,
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
          overall: 55,
          kinkAlignment: 55,
          stylePreference: 50,
        },
        userPreferences: {
          likes: [],
          dislikes: [],
          turnOns: [],
          turnOffs: [],
        },
      },
      createdAt: now,
      updatedAt: now,
      autoGenerated: true,
    };
  }
}
