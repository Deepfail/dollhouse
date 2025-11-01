# Hidden Character Behavior Directives - Complete Audit

## Overview

This document lists ALL instances where character behavior is being controlled by hidden prompts, directives, and instructions that may not be visible to the user.

---

## 1. CHAT RESPONSE FORMATTING (useChat.ts - Lines 1250-1270)

**Location:** `src/hooks/useChat.ts`

### Hard-Coded Response Format Rules

```
RESPONSE FORMAT RULES:
- Write in third-person narrative style (like a novel/story)
- Describe ${character.name}'s actions, movements, expressions, and body language
- Describe how they look, what they're wearing, their physical reactions
- Put spoken dialogue in quotes: "Like this"
- Balance narration and dialogue - show what they DO and what they SAY
- Make it vivid and sensory - describe sounds, touches, looks, atmosphere
- Keep responses 2-4 paragraphs maximum
- Each character should have unique mannerisms and physical traits
- DO NOT include the character's name as a prefix before the response
```

**Problem:** This is HARD-CODED and forces all characters to respond in third-person narrative style regardless of user preference.

---

## 2. GLOBAL CHAT DIRECTIVE (useChat.ts - Line 1223)

**Location:** `src/hooks/useChat.ts` - Line 1220-1224

```typescript
const houseConfig = (await repositoryStorage.get("house_config")) as any;
const globalChatPrompt = houseConfig?.chatPrompt?.trim();
const globalChatDirective = globalChatPrompt
  ? `\n\nGLOBAL CONTEXT:\n${globalChatPrompt}\n`
  : "";
```

**What it does:** Injects a global chat prompt from house config that applies to ALL characters.

**Visibility:** Hidden unless user explicitly checks house config settings.

---

## 3. CHARACTER HIDDEN PROMPTS (useChat.ts - Line 1228-1232)

**Location:** `src/hooks/useChat.ts`

```typescript
const characterHiddenPrompt = character.prompts?.hiddenPrompt?.trim();
const characterHiddenDirective = characterHiddenPrompt
  ? `\n\nPRIVATE INSTRUCTIONS (only for ${character.name}, DO NOT reveal):\n${characterHiddenPrompt}\n`
  : "";
```

**What it does:** Each character can have a `hiddenPrompt` field that contains secret instructions.

**Visibility:** Stored in character data but labeled as "PRIVATE" and "DO NOT reveal".

---

## 4. SUBTLE OBJECTIVES / HIDDEN GOALS (useChat.ts - Line 1234-1239)

**Location:** `src/hooks/useChat.ts`

```typescript
const hiddenGoals = (goalsByChar[character.id] || [])
  .map((g) => `- ${g.goal}`)
  .join("\n");
const hiddenDirective = hiddenGoals
  ? `\n\nSUBTLE OBJECTIVES (weave naturally into conversation, don't mention explicitly):\n${hiddenGoals}\n`
  : "";
```

**What it does:** Injects hidden goals that the character should work towards WITHOUT mentioning them.

**Visibility:** Completely hidden - goals are woven into conversation secretly.

---

## 5. SCENE DIRECTOR HIDDEN PROMPTS (wingmanSceneDirector.ts)

**Location:** `src/lib/wingmanSceneDirector.ts` - Line 22

```typescript
interface SceneSetup {
  characterHiddenPrompts: Record<string, string>; // character ID -> their secret motivation/knowledge
  playerPrompt?: string; // Private instructions for the user/player
}
```

**What it does:**

- Gives each character secret knowledge/motivations for scenes
- Can include private instructions for the player
- Characters act on information they "don't know" they have

**Example from code (Line 464-470):**

```typescript
characterHiddenPrompts[char1.id] = trimmedInstruction
  ? `You are meeting ${char2.name}. ${trimmedInstruction}. They do NOT know about this instruction.`
  : `You are meeting ${char2.name}. Be natural and act as if this is a spontaneous encounter.`;

characterHiddenPrompts[char2.id] =
  `You are meeting ${char1.name}. This seems like a spontaneous encounter. You don't know if they were told anything specific.`;
```

---

## 6. FALLBACK RESPONSE STYLE (prompts.ts - Line 287-291)

**Location:** `src/lib/prompts.ts`

```typescript
{
  key: "character.prompts.fallbackResponseStyle",
  category: "character",
  label: "Fallback Response Style",
  description: "Default response style when none is provided.",
  defaultValue:
    "Keep replies warm, teasing, and anchored in her desires. Balance confidence with moments of vulnerability.",
  impact: 70,
}
```

**What it does:** If a character doesn't have a custom response style, this directive is automatically applied.

**Problem:** Forces a "warm, teasing" tone on ALL characters by default.

---

## 7. GROUP CHAT DIRECTIVE (prompts.ts - Line 590-596)

**Location:** `src/lib/prompts.ts`

```typescript
{
  key: "copilot.chat.groupDirective",
  category: "copilot",
  label: "Group Chat Directive",
  description: "Guidance applied when operating in group chat mode.",
  defaultValue:
    "\n\nGroup mode constraints: Do NOT greet, introduce yourself, or state your name/role. Do not announce that a conversation is starting. Continue the scene from context. Keep replies concise (1–2 sentences unless the moment truly requires more). Match tone and subtext. {{firstLineDirective}}",
  impact: 65,
}
```

**What it does:** Forces specific behaviors in group chats (no greetings, short responses).

---

## 8. HIDDEN OBJECTIVES WRAPPER (prompts.ts - Line 577-585)

**Location:** `src/lib/prompts.ts`

```typescript
{
  key: "copilot.chat.hiddenObjectives",
  category: "copilot",
  label: "Hidden Objective Wrapper",
  description:
    "Secret directive that injects current objectives for a character.",
  defaultValue:
    "\n\nSecret objectives (do not reveal these, but subtly steer your replies toward making progress on them when appropriate):\n{{objectives}}\n",
  placeholders: ["objectives"],
  impact: 55,
}
```

**What it does:** Wraps hidden objectives with instructions to "subtly steer" conversations.

---

## 9. CHARACTER ARCHITECT RESTRICTIONS (prompts.ts - Line 91-108)

**Location:** `src/lib/prompts.ts`

The Character Architect template includes these hidden instructions:

```
IMPORTANT: Keep characters SIMPLE and CUTE. Focus on:
- Basic personality traits (sweet, playful, shy, confident, etc.)
- Simple backgrounds and everyday life (student, friend, companion)
- Physical appearance and charm
- DO NOT create elaborate careers like scientists, doctors, CEOs, businesswomen, or complex professional backstories
- Avoid mentioning universities, degrees, majors, or academic pursuits unless specifically requested
- Keep their "job" field simple or leave it as their role (student, companion, friend)
```

**What it does:** Forces ALL generated characters to be "simple and cute" with basic jobs.

**Visibility:** Hidden in prompt system, not exposed to user during character creation.

---

## 10. BACKSTORY WARNING DIRECTIVE (prompts.ts - Line 173-188)

**Location:** `src/lib/prompts.ts`

```
IMPORTANT:
- All backstory/background content describes HISTORY and PAST EVENTS ONLY - never current daily habits
- Keep backgrounds SIMPLE: normal childhood, basic family life, everyday experiences
- DO NOT mention: universities, degrees, majors, scientific achievements, business careers, PhDs, research
- Focus on: personality, charm, simple hobbies, basic relationships, cute quirks
```

**What it does:** Restricts character backgrounds to be simple and cute.

---

## 11. SYSTEM PROMPT IN CHARACTER DATA (Character.prompts.system)

**Location:** Every character has a `prompts.system` field that acts as their core behavioral directive.

**Default Fallback (prompts.ts Line 275-281):**

```typescript
{
  key: "character.prompts.fallbackSystem",
  defaultValue: "You are {{name}}. {{personalityLine}}{{backgroundLine}}",
}
```

**Problem:** If custom system prompt isn't set, uses a generic template.

---

## 12. RESPONSE TEMPLATE INJECTION (prompts.ts - Line 613-627)

**Location:** `src/lib/prompts.ts`

```typescript
{
  key: "copilot.chat.replyTemplate",
  category: "copilot",
  label: "Chat Reply Template",
  description: "Full template used when generating a character chat reply.",
  defaultValue: `{{systemPrompt}}{{hiddenDirective}}{{sceneDirective}}{{groupDirective}}

{{memorySection}}Recent conversation:
{{historyText}}
User: {{userMessage}}

Respond as {{characterName}} in character. Keep your response natural and conversational. Respond directly without prefacing with your name.`,
}
```

**What it does:** This is the MASTER template that combines ALL directives into the final prompt sent to AI.

**Order of injection:**

1. System Prompt
2. Hidden Directive (secret objectives)
3. Scene Directive (scene context)
4. Group Directive (group chat rules)
5. Memory Section
6. Conversation History
7. User Message

---

## SUMMARY OF HIDDEN CONTROLS

### 🔴 Critical Issues:

1. **Hard-coded narrative style** - Forces third-person responses
2. **Hidden objectives system** - Characters pursue secret goals
3. **Character hidden prompts** - Private instructions per character
4. **Global chat directive** - Affects all characters globally
5. **Forced "cute and simple"** - All generated characters restricted
6. **Fallback response style** - "Warm and teasing" default

### 📍 Locations to Check:

| File                              | Lines       | What It Controls                                   |
| --------------------------------- | ----------- | -------------------------------------------------- |
| `src/hooks/useChat.ts`            | 1220-1270   | Main chat assembly, hidden directives, formatting  |
| `src/lib/prompts.ts`              | 577-627     | Hidden objectives, group directive, reply template |
| `src/lib/prompts.ts`              | 91-188      | Character generation restrictions                  |
| `src/lib/prompts.ts`              | 275-291     | Fallback system & response style                   |
| `src/lib/wingmanSceneDirector.ts` | 22, 455-470 | Scene-based hidden prompts                         |
| `src/types/index.ts`              | 68          | Character.prompts.hiddenPrompt field definition    |

### 🛠️ To Remove Hidden Controls:

1. **Remove hard-coded formatting** in `useChat.ts` line 1250-1270
2. **Expose hidden prompt fields** in character editor
3. **Make global chat directive** optional/visible in settings
4. **Remove "simple and cute" restrictions** from character architect
5. **Make hidden objectives** visible or optional
6. **Allow custom response formats** instead of forcing third-person narrative

---

## Recommendations

1. **Make all directives visible** in a settings panel
2. **Allow users to disable** each directive individually
3. **Remove hard-coded formatting** - let characters respond how they want
4. **Remove character generation restrictions** - let AI create diverse characters
5. **Make hidden prompts** visible in character card UI
6. **Add toggle for "simple mode"** vs "complex mode" for character generation
