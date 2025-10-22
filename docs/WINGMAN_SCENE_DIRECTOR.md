# Wingman Scene Director

## Overview

The Wingman Scene Director is an intelligent conversational system that allows you to set up complex multi-character scenes using natural language commands. Wingman asks follow-up questions to gather all necessary context, then automatically generates scene prompts and character-specific hidden motivations.

## Example Flow

```
User: Send Bella to Mike's room

Wingman: Should I tell her why she's being sent, or what she'll be doing?

User: Just tell her I said it will be good for her, and tell her to relax, and that Mike is very important to me.

Wingman: How should Bella prepare? Should she dress up, be casual, or anything specific?

User: Tell her to dress up and do her makeup

Wingman: Got it, anything else?

User: No.

Wingman: **Scene Set:**

Bella knocks nervously on Mike's door, her makeup done perfectly, dressed to impress. The door opens...

*Opening in main chat now...*
```

## How It Works

### 1. Natural Language Parsing

The system detects scene-related keywords:

- **send/bring/tell/ask** - Sending a character somewhere
- **setup/create/start/begin** - Creating a new scene
- **arrange/organize** - Organizing characters
- **introduce/meet** - Character introductions

It automatically identifies mentioned character names and locations.

### 2. Intelligent Follow-Up Questions

Based on what's missing, Wingman asks contextual questions:

- Who should be involved?
- Where should they go?
- What should they know/not know?
- How should they prepare?
- Any special instructions?

### 3. Scene Generation

Once enough information is gathered (or user says "no"/"that's it"), Wingman generates:

#### Scene Prompt

A vivid 2-3 sentence third-person description shown in Wingman chat:

> "Bella knocks nervously on Mike's door, her makeup done perfectly. The door opens..."

#### Character Hidden Prompts

Private motivations/knowledge for each character:

**Bella's hidden prompt:**

> "I don't know what I'm here for, but user wants me to and thinks it will be good for me. I should try to relax...this guy is really important to user, so I really need to try to make him like me."

**Mike's hidden prompt:**

> "User sent Bella to see me. She's been told I'm important to the user, so she'll be trying to impress me."

#### Initial Message

First line of dialogue/action to kick off the scene:

> "Mike stands in the doorway looking the girl up and down before smiling: 'You must be Bella...wow, you're even prettier than I've heard...Please...come in.'"

### 4. Scene Launch

The scene is automatically:

1. Created as a new chat session with all participants
2. Scene description posted in Wingman chat
3. Character hidden prompts saved to each character
4. Initial message sent in main chat
5. Chat switches to the new scene

## Technical Implementation

### Files

- **`src/lib/wingmanSceneDirector.ts`** - Core scene director logic
  - `WingmanSceneDirector` class manages conversation state
  - `parseSceneCommand()` extracts intent from natural language
  - `generateFollowUpQuestion()` creates contextual questions
  - `generateSceneSetup()` uses AI to generate full scene

- **`src/components/DatingSimShell.tsx`** - Integration
  - `handleStartScene()` creates session and applies scene setup
  - `WingmanPanel` detects scene commands and routes to director
  - Stores character hidden prompts in character data

### Data Flow

```
User Input
  ↓
parseSceneCommand() → Extract characters, location, intent
  ↓
generateFollowUpQuestion() → Ask what's missing
  ↓
[User provides more info] → Repeat until complete
  ↓
generateSceneSetup() → AI generates full scene
  ↓
handleStartScene() → Create session, apply prompts
  ↓
Main chat opens with scene active
```

### Scene Setup Object

```typescript
interface SceneSetup {
  scenePrompt: string; // Narrative scene description
  characterHiddenPrompts: Record<string, string>; // charId -> secret knowledge
  initialMessage?: string; // First message to send
  participantIds: string[]; // Characters involved
}
```

## Usage Tips

### Quick Commands

- `"Send [girl] to [person]'s room"`
- `"Setup a scene with [girl] and [person]"`
- `"Bring [girl] to my room"`
- `"Create a scenario with [characters]"`

### Conversation Tips

- Be specific about what characters should know/not know
- Mention mood/tone (nervous, excited, confident)
- Specify preparation (dress up, casual, specific outfit)
- End with "no" or "that's it" when satisfied

### Character Hidden Prompts

These are **secret instructions** that only the character "knows":

- What they were told by the user
- What they DON'T know about the situation
- Their emotional state/motivations
- Special instructions to follow

The AI uses these to roleplay the character more authentically based on their limited knowledge.

## Future Enhancements

- [ ] Scene templates for common scenarios
- [ ] Visual scene builder UI
- [ ] Save/load scene presets
- [ ] Multi-stage scene progression
- [ ] Scene memory across sessions
- [ ] Voice commands for scene setup
