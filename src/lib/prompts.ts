import { legacyStorage } from '@/lib/legacyStorage';
import { logger } from '@/lib/logger';

export type PromptCategory = 'character' | 'copilot' | 'house';

export interface PromptDefinition {
  key: PromptKey;
  category: PromptCategory;
  label: string;
  description: string;
  defaultValue: string;
  placeholders?: string[];
  impact: number;
}

const STORAGE_KEY = 'prompt-overrides';

type PromptOverrideMap = Record<string, string>;

type PromptKey =
  | 'character.architect.template'
  | 'character.architect.schema'
  | 'character.architect.backstoryWarning'
  | 'character.architect.scenarioReminder'
  | 'character.architect.escapeInstruction'
  | 'character.architect.themeLine'
  | 'character.architect.preferredNameLine'
  | 'character.architect.existingNameLine'
  | 'character.architect.existingPersonalityLine'
  | 'character.architect.existingDescriptionLine'
  | 'character.architect.existingAppearanceLine'
  | 'character.architect.existingFeaturesLine'
  | 'character.jsonRepair'
  | 'character.prompts.fallbackSystem'
  | 'character.prompts.fallbackResponseStyle'
  | 'character.prompts.defaultOriginScenario'
  | 'character.prompts.hookTag'
  | 'character.generator.name'
  | 'character.generator.requestBase'
  | 'character.generator.personalityAnchorsLine'
  | 'character.generator.featureNotesLine'
  | 'character.generator.backgroundHooksLine'
  | 'character.generator.extraNotesLine'
  | 'character.generator.promptAlignment'
  | 'character.generator.originReminder'
  | 'character.creator.personalityPrompt'
  | 'character.creator.featuresPrompt'
  | 'character.creator.backgroundPrompt'
  | 'character.creator.imagePrompt'
  | 'character.card.physicalDescriptionPrompt'
  | 'character.ali.profilePrompt'
  | 'character.ali.scenarioPrompt'
  | 'character.llm.systemPrompt'
  | 'character.llm.enhancePrompt'
  | 'copilot.chat.summaryPrompt'
  | 'copilot.chat.hiddenObjectives'
  | 'copilot.chat.groupDirective'
  | 'copilot.chat.memoryPrefix'
  | 'copilot.chat.replyTemplate'
  | 'copilot.chat.interviewOpening'
  | 'copilot.chat.interviewQuestion'
  | 'copilot.chat.newCompanionBrief'
  | 'copilot.statusUpdate'
  | 'copilot.mainResponse'
  | 'house.behavior.analysisPrompt'
  | 'house.story.entryPrompt'
  | 'house.story.fallbackSummary'
  | 'house.story.noHistoryIntro'
  | 'house.story.modeTemplate'
  | 'house.story.significantIntro'
  | 'house.story.significantLine'
  | 'house.story.modeFooter';

const PROMPT_DEFINITIONS: PromptDefinition[] = [
  {
    key: 'character.architect.template',
    category: 'character',
    label: 'Character Architect Core Prompt',
    description: 'Primary instructions used when generating a new character profile.',
    defaultValue: `You are the Character Architect for Dollhouse, an AI-powered relationship and simulation game.
Design an original female character aligned with the user's request.
Be concise, grounded, and avoid explicit sexual content. Tone: seductive but classy.
Produce canonical facts that future conversations can rely on.
Every character must be explicitly 18 or older. For "fresh" archetypes, frame them as 19-21 with a youthful yet adult vibe.
Avoid generic or repetitive majors such as psychology unless explicitly requested; prefer distinctive studies, hustles, or passions.
{{themeLine}}
{{preferredNameLine}}
{{existingNameLine}}
{{existingPersonalityLine}}
{{existingDescriptionLine}}
{{existingAppearanceLine}}
{{existingFeaturesLine}}
User request (authoritative):
{{request}}

Return JSON with the following shape (no markdown fences):
{{schema}}

Keep values short but expressive. All strings must be under 400 characters.
{{backstoryWarning}}
{{scenarioReminder}}
{{escapeInstruction}}`,
    placeholders: [
      'themeLine',
      'preferredNameLine',
      'existingNameLine',
      'existingPersonalityLine',
      'existingDescriptionLine',
      'existingAppearanceLine',
      'existingFeaturesLine',
      'request',
      'schema',
      'backstoryWarning',
      'scenarioReminder',
      'escapeInstruction',
    ],
    impact: 100,
  },
  {
    key: 'character.architect.schema',
    category: 'character',
    label: 'Character Architect JSON Schema',
    description: 'Schema block returned as part of the architect prompt.',
    defaultValue: `{
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
  "backstory": "Three to four sentence backstory describing her past, upbringing, pivotal life events, and how she came to be who she is today. NOT current activities or behavior.",
  "imagePrompt": "Stable diffusion style prompt",
  "prompts": {
    "system": "System instructions for roleplaying this character",
    "description": "Succinct description prompt highlighting her hook in two sentences",
    "personality": "Bullet-style personality prompt that begins with the character's explicit personality traits",
    "background": "Narrative background prompt about her PAST and HISTORY - where she grew up, family background, formative experiences, education, what led her to her current situation. This should be about PAST EVENTS, not current behavior.",
    "appearance": "Sensory description of how she looks, dresses, and carries herself",
    "responseStyle": "Unique description of how she replies in chat (tone, pacing, signature moves)",
    "originScenario": "Two to three sentence prompt describing how the user first met her and how she willingly returned to the Dollhouse"
  },
  "likes": ["like", ...],
  "dislikes": ["dislike", ...],
  "turnOns": ["turn on", ...],
  "turnOffs": ["turn off", ...]
}`,
    impact: 90,
  },
  {
    key: 'character.architect.backstoryWarning',
    category: 'character',
    label: 'Backstory Guidance',
    description: 'Reminder that the backstory should focus on past events.',
    defaultValue:
      'CRITICAL: The "backstory" and "background" prompt MUST describe PAST EVENTS and HISTORY. Examples: where she grew up, family life, education, pivotal moments that shaped her. DO NOT describe current habits or daily activities.',
    impact: 85,
  },
  {
    key: 'character.architect.scenarioReminder',
    category: 'character',
    label: 'Origin Scenario Reminder',
    description: 'Instruction for including an origin scenario that fits the character.',
    defaultValue: 'Random scenario fitting of the character and her age.',
    impact: 60,
  },
  {
    key: 'character.architect.escapeInstruction',
    category: 'character',
    label: 'JSON Escape Instruction',
    description: 'Instruction telling the model how to escape quotes and newlines.',
    defaultValue: 'Escape quotation marks as \" and replace raw newlines in strings with \\n to keep the JSON valid.',
    impact: 55,
  },
  {
    key: 'character.architect.themeLine',
    category: 'character',
    label: 'Theme Line',
    description: 'Optional line injected when a theme is supplied.',
    defaultValue: 'Theme emphasis: {{theme}}.',
    placeholders: ['theme'],
    impact: 40,
  },
  {
    key: 'character.architect.preferredNameLine',
    category: 'character',
    label: 'Preferred Name Guidance',
    description: 'Guidance when a specific name is preferred.',
    defaultValue: 'Prefer to keep the existing name "{{name}}" unless it clearly conflicts with the request.',
    placeholders: ['name'],
    impact: 40,
  },
  {
    key: 'character.architect.existingNameLine',
    category: 'character',
    label: 'Existing Name Line',
    description: 'Line describing the current character name.',
    defaultValue: 'Existing name: {{name}}',
    placeholders: ['name'],
    impact: 35,
  },
  {
    key: 'character.architect.existingPersonalityLine',
    category: 'character',
    label: 'Existing Personality Line',
    description: 'Line describing existing personality notes.',
    defaultValue: 'Existing personality summary: {{personality}}',
    placeholders: ['personality'],
    impact: 35,
  },
  {
    key: 'character.architect.existingDescriptionLine',
    category: 'character',
    label: 'Existing Description Line',
    description: 'Line describing current description/backstory.',
    defaultValue: 'Existing description/backstory: {{description}}',
    placeholders: ['description'],
    impact: 35,
  },
  {
    key: 'character.architect.existingAppearanceLine',
    category: 'character',
    label: 'Existing Appearance Line',
    description: 'Line describing existing appearance notes.',
    defaultValue: 'Existing appearance notes: {{appearance}}',
    placeholders: ['appearance'],
    impact: 30,
  },
  {
    key: 'character.architect.existingFeaturesLine',
    category: 'character',
    label: 'Existing Features Line',
    description: 'Line listing features that should be retained.',
    defaultValue: 'Existing features to retain: {{features}}.',
    placeholders: ['features'],
    impact: 30,
  },
  {
    key: 'character.jsonRepair',
    category: 'character',
    label: 'JSON Repair Prompt',
    description: 'Used when asking the AI to repair malformed JSON.',
    defaultValue:
      'You are a strict JSON mechanic. Fix the following broken JSON so it is valid strict JSON that matches the requested schema. Only return the corrected JSON with no commentary. Broken JSON:\n{{brokenJson}}',
    placeholders: ['brokenJson'],
    impact: 80,
  },
  {
    key: 'character.prompts.fallbackSystem',
    category: 'character',
    label: 'Fallback System Prompt',
    description: 'System instructions applied when a character has no stored system prompt.',
    defaultValue:
      'You are {{name}}. {{personalityLine}}{{backgroundLine}}',
    placeholders: ['name', 'personalityLine', 'backgroundLine'],
    impact: 85,
  },
  {
    key: 'character.prompts.fallbackResponseStyle',
    category: 'character',
    label: 'Fallback Response Style',
    description: 'Default response style when none is provided.',
    defaultValue:
      'Keep replies warm, teasing, and anchored in her desires. Balance confidence with moments of vulnerability.',
    impact: 70,
  },
  {
    key: 'character.prompts.defaultOriginScenario',
    category: 'character',
    label: 'Fallback Origin Scenario',
    description: 'Origin scenario used when the character lacks one.',
    defaultValue:
      '{{name}} met the user as an adult in the Dollhouse orbit and willingly came back for a night that escalated into sensual territory.',
    placeholders: ['name'],
    impact: 65,
  },
  {
    key: 'character.prompts.hookTag',
    category: 'character',
    label: 'Hook Tag Suffix',
    description: 'Suffix appended when adding a background hook to descriptions.',
    defaultValue: 'Hook: {{hook}}',
    placeholders: ['hook'],
    impact: 25,
  },
  {
    key: 'character.generator.name',
    category: 'character',
    label: 'Name Generation Prompt',
    description: 'Prompt used to pick a character name based on archetype.',
    defaultValue:
      'Suggest a single {{gender}} first name for a {{archetype}} archetype. Return only the name.',
    placeholders: ['gender', 'archetype'],
    impact: 60,
  },
  {
    key: 'character.generator.requestBase',
    category: 'character',
    label: 'Character Generator Request',
    description: 'Base request issued when asking the AI to design a character.',
    defaultValue: `Design a {{rarity}} {{genderDescriptor}} companion for the Digital Dollhouse.
Archetype focus: {{archetypeLabel}} — {{archetypePitch}}. Keep the age {{ageRange}} and explicitly state they are 18 or older.
Deliver the best possible version of this archetype with standout ambitions, vices, and seduction style.
Avoid generic majors such as psychology unless explicitly requested; choose vivid, story-rich pursuits instead.
{{personalityAnchors}}{{featureNotes}}{{backgroundHooks}}{{extraNotes}}`,
    placeholders: [
      'rarity',
      'genderDescriptor',
      'archetypeLabel',
      'archetypePitch',
      'ageRange',
      'personalityAnchors',
      'featureNotes',
      'backgroundHooks',
      'extraNotes',
    ],
    impact: 95,
  },
  {
    key: 'character.generator.personalityAnchorsLine',
    category: 'character',
    label: 'Generator Personality Anchors',
    description: 'Line describing required personality traits.',
    defaultValue: 'Personality anchors to integrate: {{traits}}.',
    placeholders: ['traits'],
    impact: 45,
  },
  {
    key: 'character.generator.featureNotesLine',
    category: 'character',
    label: 'Generator Feature Notes',
    description: 'Line describing required physical or stylistic notes.',
    defaultValue: 'Required physical or stylistic notes: {{notes}}.',
    placeholders: ['notes'],
    impact: 45,
  },
  {
    key: 'character.generator.backgroundHooksLine',
    category: 'character',
    label: 'Generator Background Hooks',
    description: 'Line describing background hooks to weave in.',
    defaultValue: 'Backstory hooks to weave in: {{hooks}}.',
    placeholders: ['hooks'],
    impact: 45,
  },
  {
    key: 'character.generator.extraNotesLine',
    category: 'character',
    label: 'Generator Extra Notes',
    description: 'Line describing additional instructions.',
    defaultValue: 'Additional instructions: {{notes}}.',
    placeholders: ['notes'],
    impact: 40,
  },
  {
    key: 'character.generator.promptAlignment',
    category: 'character',
    label: 'Prompt Alignment Reminder',
    description: 'Instruction reminding the model to align generated prompts with canon facts.',
    defaultValue:
      'Ensure the prompts (system, vivid description, personality bullet list, background, appearance focus, response style, origin scenario) align with the canon facts you establish.',
    impact: 70,
  },
  {
    key: 'character.generator.originReminder',
    category: 'character',
    label: 'Origin Scenario Reminder (Generator)',
    description: 'Instruction about crafting the origin scenario in the generator.',
    defaultValue:
      'The origin scenario should capture how the user first met the character, how she willingly returned to the Dollhouse, and it should lean sensual without explicit acts.',
    impact: 65,
  },
  {
    key: 'character.creator.personalityPrompt',
    category: 'character',
    label: 'Creator Personality Prompt',
    description: 'Used in the manual character creator to request personality traits.',
    defaultValue:
      'Generate a comma-separated list of 3-5 personality traits for a character. Example: shy, kind, intelligent, playful. Just return the traits, nothing else.',
    impact: 40,
  },
  {
    key: 'character.creator.featuresPrompt',
    category: 'character',
    label: 'Creator Features Prompt',
    description: 'Used in the character creator to request physical features.',
    defaultValue:
      'Generate a comma-separated list of 4-6 physical features for a character. Example: long brown hair, green eyes, tall, athletic build. Just return the features, nothing else.',
    impact: 40,
  },
  {
    key: 'character.creator.backgroundPrompt',
    category: 'character',
    label: 'Creator Background Prompt',
    description: 'Used in the character creator to generate a short background.',
    defaultValue:
      'Create a 2-3 sentence character background for someone who is {{personalityTraits}} and has {{featureTraits}}. Make it interesting but appropriate.',
    placeholders: ['personalityTraits', 'featureTraits'],
    impact: 45,
  },
  {
    key: 'character.creator.imagePrompt',
    category: 'character',
    label: 'Creator Image Prompt',
    description: 'Used to generate an image prompt for a manually created character.',
    defaultValue:
      'Portrait of {{name}}, {{role}}, {{featureSummary}}, {{personalitySummary}}, high quality, detailed',
    placeholders: ['name', 'role', 'featureSummary', 'personalitySummary'],
    impact: 50,
  },
  {
    key: 'character.card.physicalDescriptionPrompt',
    category: 'character',
    label: 'Physical Description Prompt',
    description: 'Used on the character card to create a vivid physical description.',
    defaultValue: `Generate a vivid, sensory physical description (2-3 sentences) for a character with these features:
- Hair: {{hairColor}}
- Eyes: {{eyeColor}}
- Skin: {{skinTone}}
- Height: {{height}}
- Body Type: {{bodyType}}
- Breast Size: {{breastSize}}
- Butt Size: {{buttSize}}
- Physical Traits: {{traits}}

Create a compelling physical description that incorporates these details naturally. Focus on visual appeal and sensory details.`,
    placeholders: [
      'hairColor',
      'eyeColor',
      'skinTone',
      'height',
      'bodyType',
      'breastSize',
      'buttSize',
      'traits',
    ],
    impact: 55,
  },
  {
    key: 'character.ali.profilePrompt',
    category: 'character',
    label: 'Ali Profile Prompt',
    description: 'Prompt used to generate an Ali character profile.',
    defaultValue: `Based on this user assessment: "{{assessment}}"
{{scenarioBlock}}

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

Be creative and fitting to the assessment. No restrictions.`,
    placeholders: ['assessment', 'scenarioBlock'],
    impact: 60,
  },
  {
    key: 'character.ali.scenarioPrompt',
    category: 'character',
    label: 'Ali Scenario Prompt',
    description: 'Prompt used to generate an Ali scenario.',
    defaultValue: `Based on this user assessment: "{{assessment}}"

Create a detailed scenario description where the user interacts with desired females. Include setting, activities, and dynamics. Be explicit and uncensored.`,
    placeholders: ['assessment'],
    impact: 50,
  },
  {
    key: 'character.llm.systemPrompt',
    category: 'character',
    label: 'LLM Enhancement System Prompt',
    description: 'Default system prompt when enhancing characters via the LLM service.',
    defaultValue: 'You are a helpful AI assistant that generates character details.',
    impact: 40,
  },
  {
    key: 'character.llm.enhancePrompt',
    category: 'character',
    label: 'LLM Enhancement User Prompt',
    description: 'Prompt sent when requesting enhanced character details.',
    defaultValue: `Generate enhanced character details for the following character:

{{characterContext}}

{{guidanceBlock}}
Please provide a JSON response with any combination of these fields that would enhance the character:
- bio: Enhanced character background and personality
- traits: Object with physical/personality traits as key-value pairs
- tags: Array of relevant tags/categories
- system_prompt: AI system instructions for roleplaying this character
- appearance: A vivid, tasteful physical appearance description focused on overall looks and outfits. Keep it under 150 words. Highlight clothing style and how cute or attractive she looks in it; include non-explicit body type descriptors (e.g., petite, slim, curvy, busty, flat chest, athletic, thick thighs, bubble butt) when relevant. Avoid explicit sexual content, age mentions, or graphic details.

Focus on making the character more interesting and detailed while maintaining consistency.`,
    placeholders: ['characterContext', 'guidanceBlock'],
    impact: 65,
  },
  {
    key: 'copilot.chat.summaryPrompt',
    category: 'copilot',
    label: 'Conversation Summary Prompt',
    description: 'Prompt used to summarize a conversation for memory compression.',
    defaultValue:
      'Summarize the following conversation succinctly without losing key facts, relationships, objectives, and ongoing threads. Keep it under 250 words.\n\n{{conversation}}',
    placeholders: ['conversation'],
    impact: 70,
  },
  {
    key: 'copilot.chat.hiddenObjectives',
    category: 'copilot',
    label: 'Hidden Objective Wrapper',
    description: 'Secret directive that injects current objectives for a character.',
    defaultValue:
      '\n\nSecret objectives (do not reveal these, but subtly steer your replies toward making progress on them when appropriate):\n{{objectives}}\n',
    placeholders: ['objectives'],
    impact: 55,
  },
  {
    key: 'copilot.chat.groupDirective',
    category: 'copilot',
    label: 'Group Chat Directive',
    description: 'Guidance applied when operating in group chat mode.',
    defaultValue:
      '\n\nGroup mode constraints: Do NOT greet, introduce yourself, or state your name/role. Do not announce that a conversation is starting. Continue the scene from context. Keep replies concise (1–2 sentences unless the moment truly requires more). Match tone and subtext. {{firstLineDirective}}',
    placeholders: ['firstLineDirective'],
    impact: 65,
  },
  {
    key: 'copilot.chat.memoryPrefix',
    category: 'copilot',
    label: 'Memory Prefix',
    description: 'Prefix describing the conversation memory summary.',
    defaultValue: 'Conversation memory summary (do not repeat; use as context):\n{{summary}}\n\n',
    placeholders: ['summary'],
    impact: 50,
  },
  {
    key: 'copilot.chat.replyTemplate',
    category: 'copilot',
    label: 'Chat Reply Template',
    description: 'Full template used when generating a character chat reply.',
    defaultValue: `{{systemPrompt}}{{hiddenDirective}}{{groupDirective}}

{{memorySection}}Recent conversation:
{{historyText}}
User: {{userMessage}}

Respond as {{characterName}} in character. Keep your response natural and conversational. Respond directly without prefacing with your name.`,
    placeholders: [
      'systemPrompt',
      'hiddenDirective',
      'groupDirective',
      'memorySection',
      'historyText',
      'userMessage',
      'characterName',
    ],
    impact: 95,
  },
  {
    key: 'copilot.chat.interviewOpening',
    category: 'copilot',
    label: 'Interview Opening Prompt',
    description: 'Prompt for generating the first interview question.',
    defaultValue:
      'You are the house Copilot interviewing the character {{characterName}}. Craft a concise, engaging first interview question that references one unique aspect of their personality or background. Do NOT answer for them.',
    placeholders: ['characterName'],
    impact: 55,
  },
  {
    key: 'copilot.chat.interviewQuestion',
    category: 'copilot',
    label: 'Interview Follow-up Prompt',
    description: 'Prompt for generating subsequent interview questions.',
    defaultValue:
      'You are an interviewer (house Copilot) asking thoughtful, concise questions to learn about {{characterProfile}}. Recent user message: {{latestUserMessage}}. {{lastAnswer}}\nCraft the next single, natural interview question. Avoid repeating earlier questions.',
    placeholders: ['characterProfile', 'latestUserMessage', 'lastAnswer'],
    impact: 55,
  },
  {
    key: 'copilot.chat.newCompanionBrief',
    category: 'copilot',
    label: 'New Companion Brief',
    description: 'Prompt used by the copilot when briefing a new companion request.',
    defaultValue:
      'User brief for new companion:\n{{request}}\n\nExisting roster (avoid duplicates): {{roster}}',
    placeholders: ['request', 'roster'],
    impact: 45,
  },
  {
    key: 'copilot.statusUpdate',
    category: 'copilot',
    label: 'Status Update Prompt',
    description: 'Prompt used to generate a status update about a character.',
    defaultValue:
      '{{copilotPrompt}}\n\nHouse Context: {{houseContext}}\n\nRecent conversation:\n{{conversationHistory}}\n\nCharacter: {{characterName}}\nArousal Level: {{arousal}}%\nHappiness: {{happiness}}%\nRelationship: {{relationship}}%\n\nGenerate a brief, suggestive status update about {{characterName}}\'s current arousal state. Keep it under 50 words and match the tone of the house setting.',
    placeholders: [
      'copilotPrompt',
      'houseContext',
      'conversationHistory',
      'characterName',
      'arousal',
      'happiness',
      'relationship',
    ],
    impact: 60,
  },
  {
    key: 'copilot.mainResponse',
    category: 'copilot',
    label: 'Copilot Main Response Prompt',
    description: 'Prompt used for main copilot responses.',
    defaultValue:
      '{{copilotPrompt}}\n\nHouse Context: {{houseContext}}\n\nCharacters in house: {{houseCharacters}}\n\nConversation history:\n{{conversationHistory}}\n\nUser: {{userMessage}}\n\nProvide a helpful response as the house copilot. Keep responses under 100 words.',
    placeholders: [
      'copilotPrompt',
      'houseContext',
      'houseCharacters',
      'conversationHistory',
      'userMessage',
    ],
    impact: 75,
  },
  {
    key: 'house.behavior.analysisPrompt',
    category: 'house',
    label: 'Behavior Analysis Prompt',
    description: 'Prompt used to analyze recent chat behavior.',
    defaultValue: `You are an expert behavioral analyst for a romantic AI simulation. Review the conversation and assign each character a precise behavior state with confidence, emotional deltas, and actionable notes for the player.

Provide a STRICT JSON object with the shape:
{{schema}}

If you are unsure, return conservative neutral adjustments. NEVER include explanation outside the JSON.

Character briefs:
{{characterBrief}}

Recent messages:
{{recentMessages}}

Latest user message emphasis: {{latestUserMessage}}`,
    placeholders: ['schema', 'characterBrief', 'recentMessages', 'latestUserMessage'],
    impact: 80,
  },
  {
    key: 'house.story.entryPrompt',
    category: 'house',
    label: 'Story Entry Prompt',
    description: 'Prompt used to create a story entry for the chronicle.',
    defaultValue: `Create a story entry for this character interaction:

Character: {{characterName}}
Personality: {{personality}}
Current Relationship: {{relationshipStatus}}
Current Stats: Love {{love}}, Trust {{trust}}, Intimacy {{intimacy}}

Event Type: {{eventType}}
Title: {{title}}
{{conversationBlock}}{{userActionBlock}}{{characterResponseBlock}}{{customDetailsBlock}}

Generate:
1. A brief summary (1-2 sentences) of what happened
2. A detailed narrative description (3-4 sentences) that captures emotions, reactions, and significance
3. Emotional state before and after (happiness, nervousness, trust, arousal, affection - scale 0-100)
4. Significance level (low/medium/high/pivotal)
5. Relevant tags for this event

Format as JSON:
{
  "summary": "brief summary",
  "details": "detailed narrative",
  "emotionsBefore": {"happiness": 50, "nervousness": 30, "trust": 40, "arousal": 20, "affection": 45},
  "emotionsAfter": {"happiness": 60, "nervousness": 25, "trust": 50, "arousal": 30, "affection": 55},
  "significance": "medium",
  "tags": ["conversation", "trust-building", "nervous"]
}`,
    placeholders: [
      'characterName',
      'personality',
      'relationshipStatus',
      'love',
      'trust',
      'intimacy',
      'eventType',
      'title',
      'conversationBlock',
      'userActionBlock',
      'characterResponseBlock',
      'customDetailsBlock',
    ],
    impact: 70,
  },
  {
    key: 'house.story.fallbackSummary',
    category: 'house',
    label: 'Story Fallback Summary',
    description: 'Fallback used when AI story generation fails.',
    defaultValue: '{{characterName}} and the user had a {{eventType}}.',
    placeholders: ['characterName', 'eventType'],
    impact: 40,
  },
  {
    key: 'house.story.noHistoryIntro',
    category: 'house',
    label: 'No History Intro',
    description: 'Intro used when there is no story history for a character.',
    defaultValue:
      '{{characterName}} is a stranger to you. This is your first real interaction with her. She doesn\'t know you well and may be cautious, scared, or uncertain about your intentions.',
    placeholders: ['characterName'],
    impact: 35,
  },
  {
    key: 'house.story.modeTemplate',
    category: 'house',
    label: 'Story Mode Prompt',
    description: 'Base prompt used when generating story-mode context.',
    defaultValue: `STORY MODE - Maintain continuity and remember your shared history.

{{recentContext}}

Current Relationship: {{relationshipStatus}}
Trust Level: {{trust}}/100
Affection Level: {{affection}}/100
Intimacy Level: {{intimacy}}/100

{{significantIntro}}{{significantEvents}}
Remember and reference your shared experiences. Your responses should reflect your growing relationship and the history you've built together. Act consistently with your established personality and the trust/affection levels you've developed.`,
    placeholders: [
      'recentContext',
      'relationshipStatus',
      'trust',
      'affection',
      'intimacy',
      'significantIntro',
      'significantEvents',
    ],
    impact: 60,
  },
  {
    key: 'house.story.significantIntro',
    category: 'house',
    label: 'Significant Moments Intro',
    description: 'Headline for significant shared moments.',
    defaultValue: 'Important moments between you:',
    impact: 30,
  },
  {
    key: 'house.story.significantLine',
    category: 'house',
    label: 'Significant Moment Line',
    description: 'Bullet describing a significant moment.',
    defaultValue: '- {{title}}: {{summary}}',
    placeholders: ['title', 'summary'],
    impact: 30,
  },
  {
    key: 'house.story.modeFooter',
    category: 'house',
    label: 'Story Mode Footer',
    description: 'Footer appended to the story mode prompt when there are no significant moments.',
    defaultValue: '',
    impact: 10,
  },
];

let overrides: PromptOverrideMap = loadLocalOverrides();
let overridesPromise: Promise<PromptOverrideMap> | null = null;

function loadLocalOverrides(): PromptOverrideMap {
  try {
    const raw = legacyStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as PromptOverrideMap;
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }
    return parsed;
  } catch (error) {
    logger.warn('[prompts] Failed to parse local overrides', error);
    return {};
  }
}

async function loadRemoteOverrides(): Promise<PromptOverrideMap> {
  try {
    const { repositoryStorage } = await import('@/hooks/useRepositoryStorage');
    const remote = await repositoryStorage.get<PromptOverrideMap>(STORAGE_KEY);
    return remote ?? {};
  } catch (error) {
    logger.debug('[prompts] No repository storage available or failed to load overrides', error);
    return {};
  }
}

function persistLocal() {
  try {
    if (Object.keys(overrides).length === 0) {
      legacyStorage.removeItem(STORAGE_KEY);
    } else {
      legacyStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    }
  } catch (error) {
    logger.warn('[prompts] Failed to persist overrides to local storage', error);
  }
}

async function persistRemote() {
  try {
    const { repositoryStorage } = await import('@/hooks/useRepositoryStorage');
    if (Object.keys(overrides).length === 0) {
      await repositoryStorage.remove(STORAGE_KEY);
    } else {
      await repositoryStorage.set(STORAGE_KEY, overrides);
    }
  } catch (error) {
    logger.debug('[prompts] Unable to persist overrides to repository storage', error);
  }
}

async function ensureRemoteSync(): Promise<PromptOverrideMap> {
  if (overridesPromise) {
    return overridesPromise;
  }
  overridesPromise = (async () => {
    const remote = await loadRemoteOverrides();
    if (Object.keys(remote).length > 0) {
      overrides = { ...overrides, ...remote };
      persistLocal();
    }
    overridesPromise = null;
    return overrides;
  })();
  return overridesPromise;
}

void ensureRemoteSync();

function getDefinition(key: PromptKey): PromptDefinition {
  const definition = PROMPT_DEFINITIONS.find((entry) => entry.key === key);
  if (!definition) {
    throw new Error(`Unknown prompt key: ${key as string}`);
  }
  return definition;
}

export function getPromptDefinitions(): PromptDefinition[] {
  return PROMPT_DEFINITIONS.slice();
}

export function getPromptDefinitionsByCategory(): Record<PromptCategory, PromptDefinition[]> {
  return PROMPT_DEFINITIONS.reduce<Record<PromptCategory, PromptDefinition[]>>((acc, definition) => {
    acc[definition.category] = acc[definition.category] ?? [];
    acc[definition.category].push(definition);
    acc[definition.category].sort((a, b) => b.impact - a.impact);
    return acc;
  }, { character: [], copilot: [], house: [] });
}

export function getPromptOverrides(): PromptOverrideMap {
  return { ...overrides };
}

export async function reloadPromptOverrides(): Promise<PromptOverrideMap> {
  overrides = loadLocalOverrides();
  await ensureRemoteSync();
  return { ...overrides };
}

export function getPromptValue(key: PromptKey): string {
  const definition = getDefinition(key);
  const override = overrides[key];
  return override != null && override.trim().length > 0
    ? override
    : definition.defaultValue;
}

function applyVariables(template: string, variables: Record<string, string | number | undefined>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, token: string) => {
    const value = variables[token];
    return value == null ? '' : String(value);
  });
}

function normalizeWhitespace(text: string, trim = true): string {
  let output = text.replace(/\n{3,}/g, '\n\n');
  if (trim) {
    output = output.trim();
  }
  return output;
}

export interface FormatPromptOptions {
  trim?: boolean;
}

export function formatPrompt(
  key: PromptKey,
  variables: Record<string, string | number | undefined> = {},
  options: FormatPromptOptions = {}
): string {
  const template = getPromptValue(key);
  const merged = applyVariables(template, variables);
  return normalizeWhitespace(merged, options.trim !== false);
}

export async function setPromptOverride(key: PromptKey, value: string): Promise<PromptOverrideMap> {
  if (value && value.trim().length > 0) {
    overrides = { ...overrides, [key]: value };
  } else if (overrides[key] != null) {
    const { [key]: _, ...rest } = overrides;
    overrides = rest;
  }
  persistLocal();
  await persistRemote();
  return { ...overrides };
}

export async function resetPromptOverride(key: PromptKey): Promise<PromptOverrideMap> {
  if (overrides[key] != null) {
    const { [key]: _, ...rest } = overrides;
    overrides = rest;
    persistLocal();
    await persistRemote();
  }
  return { ...overrides };
}

export async function resetAllPrompts(): Promise<PromptOverrideMap> {
  overrides = {};
  persistLocal();
  await persistRemote();
  return {};
}

export type { PromptKey };
