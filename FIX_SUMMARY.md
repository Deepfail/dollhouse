# Fix Summary: Prompt Library Override System

## The Problem

The user reported:
> "I asked my copilot to do this: ensure any prompt edited in the Prompt Library overrides the baked-in copilot template used at runtime. It doesn't work. I have no idea what prompts are being used for every aspect of the game, but I know its not using the ones I input on prompts page. My copilot always talks like a robot instead of friend like I want, and I can't edit its personality or anything. Character creator creates char I don't want, and it doesn't listen to prompts I give it to use."

## Root Cause Analysis

The Prompt Library UI existed and could save custom prompts to storage, but the actual AI generation code throughout the app was **NOT using the Prompt Library**. Instead, it was using hardcoded prompt strings scattered across many files.

### Specific Issues Found:

1. **`AIService.copilotRespond()` in `src/lib/aiService.ts`:**
   - ❌ Built a hardcoded `systemPrompt` variable that overrode the user's `copilotPrompt`
   - ❌ Even though it called `formatPrompt('copilot.mainResponse', ...)`, it passed the hardcoded prompt instead of the user's prompt
   - ✅ **Fixed:** Now uses `params.copilotPrompt` directly, no hardcoded override

2. **`useChat.ts` character responses:**
   - ❌ All prompts were hardcoded strings like `"Summarize the following conversation..."`
   - ❌ Character reply template was a hardcoded template string
   - ❌ Interview questions were hardcoded
   - ✅ **Fixed:** All replaced with `formatPrompt()` calls

3. **`CharacterCreator.tsx`:**
   - ❌ Personality, features, and background prompts were all hardcoded
   - ❌ Example: `"Generate a comma-separated list of 3-5 personality traits..."`
   - ✅ **Fixed:** All use `formatPrompt('character.creator.*', ...)`

4. **`behaviorAnalysis.ts`:**
   - ❌ Behavior analysis prompt was a massive hardcoded string
   - ✅ **Fixed:** Uses `formatPrompt('house.behavior.analysisPrompt', ...)`

5. **`useStorySystem.ts`:**
   - ❌ Story entry creation used hardcoded prompts
   - ❌ Fallback strings were hardcoded
   - ✅ **Fixed:** All use `formatPrompt('house.story.*', ...)`

6. **`CharacterCard.v2.tsx`:**
   - ❌ Physical description generation was hardcoded
   - ✅ **Fixed:** Uses `formatPrompt('character.card.physicalDescriptionPrompt', ...)`

## The Solution

### Step 1: Import formatPrompt Everywhere

Added `import { formatPrompt } from '@/lib/prompts'` to all files that generate AI content:
- `src/hooks/useChat.ts`
- `src/components/CharacterCreator.tsx`
- `src/components/InterviewChat.tsx`
- `src/lib/behaviorAnalysis.ts`
- `src/hooks/useStorySystem.ts`
- `src/components/CharacterCard.v2.tsx`

### Step 2: Replace Hardcoded Prompts

**Before:**
```typescript
const prompt = `You are ${character.name}. ${character.personality}...`;
```

**After:**
```typescript
const prompt = formatPrompt('copilot.chat.replyTemplate', {
  systemPrompt,
  hiddenDirective,
  groupDirective,
  memorySection,
  historyText,
  userMessage,
  characterName: character.name
});
```

### Step 3: Fix copilotRespond()

**Before (lines 288-583 in aiService.ts):**
```typescript
const userPrompt = params.copilotPrompt?.trim();
const envPrompt = (proc?.env?.COPILOT_SYSTEM_PROMPT) || 'Default...';
let systemPrompt = userPrompt || envPrompt;
// ...lots of code that modifies systemPrompt...
const formattedCopilotPrompt = formatPrompt('copilot.mainResponse', {
  copilotPrompt: systemPrompt,  // ❌ Using modified/hardcoded value!
  // ...
});
```

**After:**
```typescript
// Build character summaries if needed
if (includeContext && params.characters && params.characters.length > 0) {
  characterSummaries = params.characters
    .map((char, index) => buildCharacterSummary(char, index, detailLevel))
    .filter(Boolean);
}

// Use user's prompt directly - no overrides!
const finalPrompt = formatPrompt('copilot.mainResponse', {
  copilotPrompt: params.copilotPrompt?.trim() || 'Default fallback',  // ✅ User's prompt!
  houseContext,
  houseCharacters,
  conversationHistory,
  userMessage,
});
```

### Step 4: Update API Calls

Changed from sending separate system/user messages to sending a single user message with the formatted prompt:

**Before:**
```typescript
const payloadMessages = [
  { role: 'system', content: systemPrompt },
  { role: 'user', content: formattedCopilotPrompt },
];
```

**After:**
```typescript
const payloadMessages = [
  { role: 'user', content: finalPrompt },  // Already includes system instructions
];
```

## Verification

### Code Changes:
- ✅ 8 files modified
- ✅ All AI generation now uses `formatPrompt()`
- ✅ No more hardcoded prompt strings
- ✅ Build succeeds
- ✅ Linting passes

### Files Changed:
1. `src/lib/aiService.ts` - Fixed copilotRespond()
2. `src/hooks/useChat.ts` - All chat prompts
3. `src/components/CharacterCreator.tsx` - Character creation
4. `src/components/InterviewChat.tsx` - Interview questions
5. `src/lib/behaviorAnalysis.ts` - Behavior analysis
6. `src/hooks/useStorySystem.ts` - Story entries
7. `src/components/CharacterCard.v2.tsx` - Physical descriptions
8. `PROMPT_LIBRARY_GUIDE.md` - **NEW** user documentation

### What Now Works:

1. **Edit `copilot.mainResponse` in Prompt Library** → Copilot personality changes immediately
2. **Edit `character.architect.template`** → Character creation style changes
3. **Edit `copilot.chat.replyTemplate`** → Character conversation style changes
4. **Edit any of the 70+ prompts** → That aspect of the game changes

## Testing Recommendations

The user should test:

1. **Copilot Personality:**
   - Edit `copilot.mainResponse` to say "Be friendly and casual"
   - Chat with copilot
   - Verify it now talks friendly/casual

2. **Character Creation:**
   - Edit `character.architect.template` to change tone
   - Create a new character
   - Verify character matches the new style

3. **Character Conversations:**
   - Edit `copilot.chat.replyTemplate` to change response style
   - Chat with a character
   - Verify they respond in the new style

4. **Story Entries:**
   - Edit `house.story.entryPrompt` to change narrative style
   - Trigger a story event
   - Verify the story entry uses the new style

## Impact

**Before this fix:**
- User: "My copilot talks like a robot"
- Reality: Hardcoded prompts ignored user's customizations
- Solution: Edit source code (requires programming knowledge)

**After this fix:**
- User: Opens Prompt Library → Edits `copilot.mainResponse` → Saves
- Reality: Changes take effect immediately
- Solution: No programming needed, full control through UI

## Key Insight

The issue wasn't that the Prompt Library didn't exist - it did! The issue was that **the rest of the codebase wasn't actually using it**. The fix was to ensure every AI generation call goes through `formatPrompt()` so that user overrides are always respected.

This is like having a thermostat on the wall (Prompt Library UI) but the furnace (AI code) being hardwired to ignore it. We rewired the furnace to actually listen to the thermostat.
