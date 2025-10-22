import type { Character } from "@/types";
import { AIService } from "./aiService";
import { logger } from "./logger";

/**
 * Wingman Scene Director
 * Handles natural language scene commands with intelligent follow-up questions,
 * scene prompt generation, and character-specific hidden prompts.
 */

export interface SceneCommand {
  rawCommand: string;
  intent?: "send" | "setup" | "arrange" | "introduce" | "unknown";
  characters?: string[]; // character names/IDs
  location?: string;
  action?: string;
  complete: boolean; // whether we have enough info to generate the scene
}

export interface SceneSetup {
  scenePrompt: string; // What gets displayed in Wingman chat as scene description
  characterHiddenPrompts: Record<string, string>; // character ID -> their secret motivation/knowledge
  initialMessage?: string; // Optional first message to kick off the scene (from a character)
  participantIds: string[]; // Character IDs involved
}

export interface WingmanConversationState {
  command?: SceneCommand;
  clarifications: Array<{ question: string; answer: string }>;
  awaitingAnswer: boolean;
  currentQuestion?: string;
}

/**
 * Parse a natural language command to extract scene intent
 */
export function parseSceneCommand(
  input: string,
  availableCharacters: Character[]
): SceneCommand {
  const lower = input.toLowerCase().trim();

  // Extract character names from input
  const mentionedCharacters: string[] = [];
  availableCharacters.forEach((char) => {
    if (lower.includes(char.name.toLowerCase()) || lower.includes(char.id)) {
      mentionedCharacters.push(char.id);
    }
  });

  // Detect intent
  let intent: SceneCommand["intent"] = "unknown";
  if (/send|tell|ask|bring/i.test(lower)) {
    intent = "send";
  } else if (/setup|create|start|begin/i.test(lower)) {
    intent = "setup";
  } else if (/arrange|organize|get ready/i.test(lower)) {
    intent = "arrange";
  } else if (/introduce|meet/i.test(lower)) {
    intent = "introduce";
  }

  // Extract location (room, place, etc.)
  const locationMatch = lower.match(
    /(?:to|in|at)\s+(?:the\s+)?([a-z0-9'\s]+?)(?:'s)?\s+(?:room|house|place|office|apartment)/i
  );
  const location = locationMatch ? locationMatch[0] : undefined;

  // Simple completeness check
  const complete =
    mentionedCharacters.length >= 2 ||
    (mentionedCharacters.length === 1 && location);

  return {
    rawCommand: input,
    intent,
    characters: mentionedCharacters,
    location,
    complete,
  };
}

/**
 * Generate intelligent follow-up question based on what's missing
 */
export async function generateFollowUpQuestion(
  state: WingmanConversationState,
  characters: Character[]
): Promise<string> {
  const cmd = state.command;
  if (!cmd) return "What would you like me to set up?";

  // Check what we're missing
  if (!cmd.characters || cmd.characters.length === 0) {
    return "Who should be involved in this scene?";
  }

  if (cmd.characters.length === 1 && !cmd.location) {
    const char = characters.find((c) => c.id === cmd.characters![0]);
    return `Where should I send ${char?.name || "them"}?`;
  }

  if (cmd.intent === "send" && cmd.characters.length >= 2) {
    // We have sender and receiver, ask about context
    const asked = state.clarifications.some(
      (c) =>
        c.question.toLowerCase().includes("why") ||
        c.question.toLowerCase().includes("what should") ||
        c.question.toLowerCase().includes("tell")
    );

    if (!asked) {
      const receiver = characters.find((c) => c.id === cmd.characters![1]);
      return `Should I tell ${receiver?.name || "them"} why they're being sent, or what they'll be doing?`;
    }

    // Ask about mood/preparation
    const askedPrep = state.clarifications.some(
      (c) =>
        c.question.toLowerCase().includes("prepare") ||
        c.question.toLowerCase().includes("dress") ||
        c.question.toLowerCase().includes("mood")
    );

    if (!askedPrep) {
      const sender = characters.find((c) => c.id === cmd.characters![0]);
      return `How should ${sender?.name || "they"} prepare? Should they dress up, be casual, or anything specific?`;
    }

    // Ask about recipient's expectations
    const askedRecipient = state.clarifications.some(
      (c) =>
        c.question.toLowerCase().includes("important") ||
        c.question.toLowerCase().includes("special")
    );

    if (!askedRecipient) {
      const receiver = characters.find((c) => c.id === cmd.characters![1]);
      return `Anything else ${receiver?.name || "they"} should know?`;
    }

    // Final check
    return "Got it, anything else?";
  }

  return "What else should I know about this scene?";
}

/**
 * Generate the complete scene setup using AI
 */
export async function generateSceneSetup(
  state: WingmanConversationState,
  characters: Character[],
  houseConfig?: { worldPrompt?: string }
): Promise<SceneSetup> {
  const cmd = state.command;
  if (!cmd || !cmd.characters || cmd.characters.length === 0) {
    throw new Error("Insufficient information to generate scene");
  }

  // Build context from conversation
  const conversationContext = state.clarifications
    .map((c) => `Q: ${c.question}\nA: ${c.answer}`)
    .join("\n\n");

  const participantCharacters = characters.filter((c) =>
    cmd.characters!.includes(c.id)
  );
  const characterContext = participantCharacters
    .map((c) => `${c.name}: ${c.background || c.personality || "No details"}`)
    .join("\n");

  // Generate scene using AI
  const prompt = `You are a creative scene director for an interactive story. Generate a scene setup based on this user command and conversation:

ORIGINAL COMMAND: ${cmd.rawCommand}

CONVERSATION:
${conversationContext}

AVAILABLE CHARACTERS:
${characterContext}

${houseConfig?.worldPrompt ? `WORLD CONTEXT:\n${houseConfig.worldPrompt}\n` : ""}

Generate a JSON response with:
1. "scenePrompt": A vivid 2-3 sentence scene description from third-person perspective using the ACTUAL character names (like: "${participantCharacters[0]?.name || "The first character"} knocks nervously on ${participantCharacters[1]?.name || "the door"}, ${participantCharacters[0]?.gender === "female" ? "her" : "his"} makeup done perfectly. The door opens...")
2. "characterHiddenPrompts": An object with character IDs as keys and their secret thoughts/motivations as values (what they know/don't know, their private feelings, instructions they received from the user)
3. "initialMessage": The first line of dialogue or action from the most relevant character to start the scene, using their actual name
4. "participantIds": Array of character IDs involved

Make it engaging, slightly dramatic, and ensure each character has realistic private knowledge/motivations based on the conversation.
Use the characters' ACTUAL NAMES from the character list above - never use placeholders like "Girl1" or "Male1".

Return ONLY valid JSON, no markdown:`;

  try {
    const response = await AIService.generateText({
      prompt,
      maxTokens: 1000,
      temperature: 0.8,
    });

    // Parse AI response
    let parsed: SceneSetup;
    try {
      // Remove markdown code blocks if present
      const cleaned = response
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      logger.error("Failed to parse scene setup JSON", parseError, response);

      // Fallback manual generation
      parsed = generateFallbackScene(cmd, participantCharacters, state);
    }

    // Ensure participant IDs are set
    if (!parsed.participantIds || parsed.participantIds.length === 0) {
      parsed.participantIds = cmd.characters;
    }

    return parsed;
  } catch (error) {
    logger.error("Failed to generate scene setup", error);
    return generateFallbackScene(cmd, participantCharacters, state);
  }
}

/**
 * Fallback scene generation if AI fails
 */
function generateFallbackScene(
  cmd: SceneCommand,
  characters: Character[],
  state: WingmanConversationState
): SceneSetup {
  const char1 = characters[0];
  const char2 = characters[1];

  const scenePrompt = char2
    ? `${char1?.name || "Someone"} approaches ${char2?.name || "them"} ${cmd.location || "in the house"}. The atmosphere is charged with anticipation...`
    : `${char1?.name || "Someone"} arrives ${cmd.location || "at the location"}, uncertain of what awaits...`;

  const characterHiddenPrompts: Record<string, string> = {};

  if (char1) {
    const userInstructions = state.clarifications
      .filter((c) => c.answer)
      .map((c) => c.answer)
      .join(". ");

    characterHiddenPrompts[char1.id] = userInstructions
      ? `The user told me: "${userInstructions}". I should act accordingly, even if I don't fully understand why.`
      : "I'm here because the user wanted me to be. I should be open to what happens next.";
  }

  if (char2) {
    characterHiddenPrompts[char2.id] =
      "Someone is coming to see me. I should be myself and see what they want.";
  }

  const initialMessage = char2
    ? `${char2.name} ${char2.gender === "male" ? "stands" : "stands"} in the doorway, looking ${char1?.name || "the visitor"} up and down before smiling slightly. "You must be ${char1?.name || "here"}..."`
    : `${char1?.name || "They"} take a deep breath and step forward...`;

  return {
    scenePrompt,
    characterHiddenPrompts,
    initialMessage,
    participantIds: cmd.characters || [],
  };
}

/**
 * Main Wingman scene director flow
 * Handles the conversational back-and-forth and scene generation
 */
export class WingmanSceneDirector {
  private state: WingmanConversationState = {
    clarifications: [],
    awaitingAnswer: false,
  };

  constructor(
    private characters: Character[],
    private houseConfig?: { worldPrompt?: string }
  ) {}

  /**
   * Process user input - either initial command or follow-up answer
   */
  async processInput(input: string): Promise<{
    type: "question" | "scene" | "acknowledgment";
    message: string;
    scene?: SceneSetup;
  }> {
    // If we're not awaiting an answer, this is a new command
    if (!this.state.awaitingAnswer) {
      this.state.command = parseSceneCommand(input, this.characters);

      // If command is complete enough, ask first follow-up
      if (
        this.state.command.characters &&
        this.state.command.characters.length > 0
      ) {
        const question = await generateFollowUpQuestion(
          this.state,
          this.characters
        );
        this.state.currentQuestion = question;
        this.state.awaitingAnswer = true;

        return {
          type: "question",
          message: question,
        };
      }

      // Not enough info, ask for clarification
      return {
        type: "question",
        message:
          "I'm not sure who you want me to work with. Can you mention specific names?",
      };
    }

    // We're awaiting an answer - record it
    if (this.state.currentQuestion) {
      this.state.clarifications.push({
        question: this.state.currentQuestion,
        answer: input,
      });
    }

    // Check if user says "no", "nothing", "that's it", etc.
    const isDone =
      /^(no|nothing|nope|that'?s it|done|go ahead|start)\.?$/i.test(
        input.trim()
      );

    console.log("🎯 Scene Director check:", {
      isDone,
      clarificationCount: this.state.clarifications.length,
      shouldGenerate: isDone || this.state.clarifications.length >= 3,
      input: input.trim(),
    });

    if (isDone || this.state.clarifications.length >= 3) {
      // Generate the scene!
      console.log("🎬 Generating scene with state:", this.state);
      try {
        const scene = await generateSceneSetup(
          this.state,
          this.characters,
          this.houseConfig
        );
        console.log("✅ Scene generated successfully:", scene);

        // Reset state for next command
        this.state = {
          clarifications: [],
          awaitingAnswer: false,
        };

        return {
          type: "scene",
          message: scene.scenePrompt,
          scene,
        };
      } catch (error) {
        console.error("❌ Scene generation failed:", error);
        logger.error("Scene generation failed", error);
        return {
          type: "acknowledgment",
          message:
            "I had trouble setting that up. Can you try rephrasing your request?",
        };
      }
    }

    // Ask next follow-up question
    const nextQuestion = await generateFollowUpQuestion(
      this.state,
      this.characters
    );
    this.state.currentQuestion = nextQuestion;

    return {
      type: "question",
      message: nextQuestion,
    };
  }

  /**
   * Reset the conversation state
   */
  reset(): void {
    this.state = {
      clarifications: [],
      awaitingAnswer: false,
    };
  }

  /**
   * Get current state (for debugging or persistence)
   */
  getState(): WingmanConversationState {
    return { ...this.state };
  }
}

/**
 * Character Workshop - Collaborative character creation with Wingman
 */

export interface CharacterWorkshopState {
  characterDraft: Partial<Character>;
  conversationHistory: Array<{ question: string; answer: string }>;
  currentTopic?: 'basics' | 'personality' | 'background' | 'appearance' | 'preferences' | 'finalize';
  awaitingAnswer: boolean;
}

export class CharacterWorkshop {
  private state: CharacterWorkshopState;

  constructor() {
    this.state = {
      characterDraft: {},
      conversationHistory: [],
      awaitingAnswer: false,
    };
  }

  async processInput(userInput: string): Promise<{
    type: 'question' | 'suggestion' | 'complete';
    message: string;
    characterData?: Partial<Character>;
  }> {
    // Record the answer if we were waiting for one
    if (this.state.awaitingAnswer && this.state.conversationHistory.length > 0) {
      const lastIndex = this.state.conversationHistory.length - 1;
      if (this.state.conversationHistory[lastIndex]) {
        this.state.conversationHistory[lastIndex].answer = userInput;
      }
    }

    // Check if user wants to finish
    const isDone = /^(done|finished|that'?s it|create her|make her|looks good|perfect)$/i.test(userInput.trim());
    
    if (isDone && Object.keys(this.state.characterDraft).length > 0) {
      // Finalize and return character
      return {
        type: 'complete',
        message: "Awesome! Let me put together your new girl. Give me a sec...",
        characterData: this.state.characterDraft,
      };
    }

    // Determine next topic to explore
    const nextTopic = this.determineNextTopic();
    
    // Generate conversational response with suggestions
    const response = await this.generateWingmanResponse(userInput, nextTopic);
    
    // Update state
    this.state.currentTopic = nextTopic;
    this.state.awaitingAnswer = true;
    this.state.conversationHistory.push({
      question: response.message,
      answer: '', // Will be filled on next input
    });

    // Extract and update character draft from conversation
    await this.updateCharacterDraft(userInput);

    return {
      type: response.type,
      message: response.message,
    };
  }

  private determineNextTopic(): 'basics' | 'personality' | 'background' | 'appearance' | 'preferences' | 'finalize' {
    const draft = this.state.characterDraft;
    
    if (!draft.name) return 'basics';
    if (!draft.personality && !draft.description) return 'personality';
    if (!draft.background) return 'background';
    if (!draft.physicalDescription) return 'appearance';
    if (!draft.preferences) return 'preferences';
    
    return 'finalize';
  }

  private async generateWingmanResponse(
    userInput: string,
    topic: string
  ): Promise<{ type: 'question' | 'suggestion'; message: string }> {
    // Build conversation context
    const conversationContext = this.state.conversationHistory
      .filter(h => h.answer)
      .map(h => `Wingman: ${h.question}\nYou: ${h.answer}`)
      .join('\n\n');

    const draftSummary = this.summarizeCharacterDraft();

    const prompt = `You are Wingman, a cool, opinionated friend helping design a new character for an adult interactive story game. You're thoughtful, have good taste, and aren't afraid to make suggestions or push back if something doesn't quite fit.

CONVERSATION SO FAR:
${conversationContext || 'Just starting the conversation.'}

CHARACTER DRAFT SO FAR:
${draftSummary || 'Nothing yet - just starting!'}

CURRENT TOPIC: ${topic}
USER JUST SAID: "${userInput}"

Your job:
- Be conversational and friendly, like talking to a buddy
- Ask ONE specific question about the current topic (${topic})
- Make suggestions based on what they've said
- Share your thoughts - "I think..." or "What if we..." or "That could work, but..."
- Push back gently if something seems generic or could be more interesting
- Keep it natural - no formal structure, just chat
- Reference what they said and build on it
- Maximum 3-4 sentences

Examples of good responses:
- "Interesting! So you want her shy but with a wild side underneath. I like that contrast. What's her look - girl-next-door type or more alternative?"
- "A nurse, okay. But like... boring hospital scrubs nurse, or that sexy night shift nurse who's seen some shit and has stories? Big difference."
- "Nah man, 'bubbly and outgoing' is too generic. What makes HER bubbly different from every other bubbly girl? Give me something specific."

Your response (just the message, be natural):`;

    try {
      const response = await AIService.generateText({
        prompt,
        maxTokens: 200,
        temperature: 0.9,
      });

      return {
        type: 'question',
        message: response.trim(),
      };
    } catch (error) {
      logger.error('Failed to generate wingman workshop response', error);
      // Fallback
      return {
        type: 'question',
        message: this.getFallbackQuestion(topic),
      };
    }
  }

  private getFallbackQuestion(topic: string): string {
    switch (topic) {
      case 'basics':
        return "Let's start with the basics - what's her name? And give me a quick vibe check - what type of girl are we going for?";
      case 'personality':
        return "Cool name! Now let's dig into her personality. What's she like? Don't just say 'nice' or 'sweet' - give me something with edge.";
      case 'background':
        return "Okay, backstory time. What's her deal? Where's she from, what does she do, what shaped her into who she is?";
      case 'appearance':
        return "Let's paint a picture - what does she look like? Hair, eyes, body type, style. Make it vivid.";
      case 'preferences':
        return "Last thing - what's she into? What turns her on, what's her vibe in intimate situations?";
      default:
        return "Alright, I think we've got a solid character here. Want to create her or keep tweaking?";
    }
  }

  private async updateCharacterDraft(userInput: string): Promise<void> {
    // Use AI to extract structured data from conversation
    const conversationContext = this.state.conversationHistory
      .slice(-3) // Last 3 exchanges
      .map(h => `Q: ${h.question}\nA: ${h.answer}`)
      .join('\n\n');

    const extractPrompt = `Extract character information from this conversation:

${conversationContext}
Latest input: "${userInput}"

Current character draft:
${JSON.stringify(this.state.characterDraft, null, 2)}

Extract and return ONLY a JSON object with any new character fields you can determine. Include only fields that are clearly stated or strongly implied. Valid fields:
- name (string)
- age (number, 18-50)
- personality (string, detailed)
- background (string, their history/story)
- description (string, brief overview)
- physicalDescription (string, detailed appearance)
- gender ("female" or "male")
- occupation (string)

Return ONLY valid JSON, no markdown:`;

    try {
      const response = await AIService.generateText({
        prompt: extractPrompt,
        maxTokens: 400,
        temperature: 0.3,
      });

      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const extracted = JSON.parse(cleaned);

      // Merge with existing draft
      this.state.characterDraft = {
        ...this.state.characterDraft,
        ...extracted,
      };

      logger.log('Updated character draft:', this.state.characterDraft);
    } catch (error) {
      logger.warn('Failed to extract character data, continuing conversation', error);
    }
  }

  private summarizeCharacterDraft(): string {
    const draft = this.state.characterDraft;
    const parts: string[] = [];

    if (draft.name) parts.push(`Name: ${draft.name}`);
    if (draft.age) parts.push(`Age: ${draft.age}`);
    if (draft.personality) parts.push(`Personality: ${draft.personality}`);
    if (draft.background) parts.push(`Background: ${draft.background}`);
    if (draft.physicalDescription) parts.push(`Appearance: ${draft.physicalDescription}`);
    if (draft.occupation) parts.push(`Occupation: ${draft.occupation}`);

    return parts.length > 0 ? parts.join('\n') : '';
  }

  reset(): void {
    this.state = {
      characterDraft: {},
      conversationHistory: [],
      awaitingAnswer: false,
    };
  }

  getState(): CharacterWorkshopState {
    return { ...this.state };
  }

  getCharacterDraft(): Partial<Character> {
    return { ...this.state.characterDraft };
  }
}
