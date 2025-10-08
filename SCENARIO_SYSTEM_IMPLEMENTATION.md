# Scenario System Implementation

## Overview
Implemented a comprehensive scenario/scene system that ensures characters respond appropriately to the mood, tone, and context of scenes created by Wingman.

## Problem Solved
When users asked Wingman to create scenarios (e.g., "create a scary haunted house scene with Bella"), characters would respond with generic happy/excited reactions instead of matching the scenario's mood (scared, tense, romantic, etc.).

## Solution

### 1. **New Scene Context Prompt** (`house.scene.contextPrompt`)

**Location:** Settings → General → Scene & Scenario System

**Purpose:** Automatically injects scenario context into character responses to ensure they match the scene's mood and tone.

**Default Template:**
```
CURRENT SCENARIO: {{sceneDescription}}

IMPORTANT: Respond to this scenario appropriately. Match the mood, tone, and situation described above.
If it's scary, be frightened or cautious. If it's romantic, be affectionate. If it's tense, show appropriate stress or concern.
Your emotions and reactions should authentically reflect the scenario context.
```

**Impact:** 75 (High Priority)

### 2. **Integration Points**

#### A. Scene Session Loading
When a chat session is linked to a scene, the system now:
- Loads the scene session data from storage
- Extracts the scene description
- Formats it using the `house.scene.contextPrompt` template
- Injects it into character responses

#### B. Hidden Goals/Objectives
Character hidden goals are now properly loaded from BOTH:
- `session_goals` database table (manually set goals)
- Scene session `hiddenGoals` field (goals set when creating the scene)

The system merges these and includes them in the character's prompt via the existing `copilot.chat.hiddenObjectives` template.

#### C. Prompt Template Update
Updated `copilot.chat.replyTemplate` to include:
- `{{sceneDirective}}` - Scene context injection point
- Positioned after system prompt and hidden objectives
- Before group directive and memory sections

### 3. **Workflow**

```
User: "Wingman, create a scary haunted house scenario with Bella"
  ↓
Wingman creates scene session with:
  - description: "You're exploring a dark, creepy haunted mansion..."
  - hiddenGoals: { "bella-id": { goal: "Act scared and cautious", priority: "high" } }
  ↓
When Bella responds:
  ✅ System loads scene context
  ✅ Injects scenario description via house.scene.contextPrompt
  ✅ Loads hidden goal "Act scared and cautious"
  ✅ Bella responds appropriately frightened/cautious
```

### 4. **Code Changes**

#### `/workspaces/dollhouse/src/lib/prompts.ts`
- Added `house.scene.contextPrompt` prompt definition
- Added `sceneDirective` placeholder to `copilot.chat.replyTemplate`
- Updated type union to include new prompt key

#### `/workspaces/dollhouse/src/hooks/useChat.ts`
In `generateCharacterResponses` function:
- Added scene session loading logic
- Checks if `chatSessionId` matches current session
- Extracts scene description and formats with template
- Merges scene `hiddenGoals` with `session_goals` table
- Injects `sceneDirective` into character prompt

#### `/workspaces/dollhouse/src/components/HouseSettings.tsx`
- Added new section: "Scene & Scenario System" in General tab
- Displays scene context prompt with clear description
- Link to edit in Prompt Library

## Benefits

✅ **Context-Aware Responses**: Characters now respond appropriately to scenario mood/tone
✅ **Hidden Objectives Active**: Character goals from scenes are properly loaded and used
✅ **User-Friendly**: Scene context prompt is visible and editable in settings
✅ **Flexible**: Works for any scenario type (scary, romantic, tense, action, etc.)
✅ **Backward Compatible**: Scenes without descriptions still work normally

## Testing Scenarios

### Test 1: Scary Scene
```
User: "Wingman, create a scary scenario with Bella in a haunted house"
Expected: Bella responds frightened, cautious, mentions the creepy atmosphere
```

### Test 2: Romantic Scene
```
User: "Set up a romantic candlelit dinner with Aria"
Expected: Aria responds affectionately, mentions the romantic setting
```

### Test 3: Tense Scene
```
User: "Create a tense confrontation scene with Kyia"
Expected: Kyia shows stress, concern, addresses the tension
```

### Test 4: Hidden Goals
```
SceneCreator: Set hidden goal "Try to seduce the user" for character
Expected: Character subtly works toward goal without mentioning it explicitly
```

## Customization

Users can customize the scene context prompt in:
**Settings → General → Scene & Scenario System → Edit in Prompt Library**

Example custom template:
```
SCENE SETTING: {{sceneDescription}}

React authentically to this situation. Show genuine emotions that fit the context.
Your personality should shine through while respecting the scene's atmosphere.
```

## Future Enhancements

- [ ] Add scene mood detection (auto-classify as scary, romantic, tense, etc.)
- [ ] Create scene template library (pre-made scenarios)
- [ ] Add scene-specific character stat modifiers (fear, arousal, etc.)
- [ ] Multi-character scene coordination (characters react to each other)
- [ ] Scene progression system (escalate or de-escalate based on user actions)

## Notes

- Scene descriptions are user-created via Wingman chat commands
- The `house.scene.contextPrompt` template can be edited in Prompt Library
- Hidden goals are NEVER shown to the user, only guide character behavior
- Scene context is injected BEFORE group directive but AFTER hidden objectives
- System gracefully handles missing scene data (no errors if scene not found)
