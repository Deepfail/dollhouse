# Prompt System Audit & Fix Plan

## Current State Analysis

### ✅ What's Working

1. **Prompt Library exists** (`src/lib/prompts.ts`)
   - 60+ prompts defined with categories (character, copilot, house)
   - `formatPrompt()` function to apply user overrides
   - Storage system for user customizations

2. **UI exists** (`src/components/PromptLibrary.tsx`)
   - Accessible via HouseSettings > Prompts tab
   - Users can edit and save prompt overrides
   - Prompts organized by category

3. **Core AI Service uses it**
   - `AIService.copilotRespond()` uses `formatPrompt('copilot.mainResponse', ...)`
   - Character generation uses prompt library
   - Story system uses prompt library

### ❌ Issues Found

#### 1. **Multiple Prompt Storage Systems**

The app has THREE different prompt storage locations:

**a) Prompt Library (Correct System)**

- Storage key: `'prompt-overrides'`
- Used by: Character generation, AI responses, story system
- Location: `src/lib/prompts.ts`

**b) House Settings (Duplicate)**

- Storage key: `'house_config'`
- Fields: `copilotPrompt`, `worldPrompt`
- Location: `src/components/HouseSettings.tsx`
- **PROBLEM**: These duplicate the prompt library but don't sync!

**c) Wingman Settings (Duplicate)**

- Storage key: `'wingman_settings'`
- Fields: `systemPrompt`, `extraPrompts`
- Location: `src/components/WingmanSettings.tsx`
- **PROBLEM**: Separate storage, not using prompt library!

#### 2. **Missing Prompt Definitions**

Some prompts are hardcoded and not in the library:

- Interview prompts (in WingmanSettings)
- Copilot greeting (in WingmanSettings)
- Some legacy prompts in useHouse.ts

#### 3. **User Confusion**

Users edit prompts in multiple places:

1. House Settings > Copilot tab → `copilotPrompt`
2. House Settings > Prompts tab → Prompt Library
3. Wingman Settings → `systemPrompt`

These all control the SAME thing (copilot behavior) but don't sync!

## Fix Plan

### Phase 1: Consolidate Storage ✅ PRIORITY

**Goal**: All prompts should go through the Prompt Library system

#### Step 1: Add Missing Prompts to Library

Add these to `src/lib/prompts.ts`:

- `copilot.wingman.systemPrompt`
- `copilot.wingman.greeting`
- `copilot.interview.template`
- `house.world.description` (merge with existing worldPrompt)

#### Step 2: Migrate HouseSettings

Update `src/components/HouseSettings.tsx`:

- Remove `copilotPrompt` and `worldPrompt` input fields
- Add a note: "Edit prompts in the Prompts tab"
- Keep only config options (max tokens, context settings)

#### Step 3: Migrate WingmanSettings

Update `src/components/WingmanSettings.tsx`:

- Remove prompt editing
- Use `formatPrompt()` to read values
- Add link to Prompt Library

#### Step 4: Update Default House

Update `src/hooks/useHouseFileStorage.ts`:

- Remove hardcoded `copilotPrompt` and `worldPrompt` from DEFAULT_HOUSE
- Use prompt library defaults instead

### Phase 2: Ensure All Code Uses formatPrompt() ✅

Audit and fix:

- [x] `src/lib/aiService.ts` - Already using it ✅
- [x] `src/hooks/useChat.ts` - Already using it ✅
- [x] `src/hooks/useStorySystem.ts` - Already using it ✅
- [x] `src/lib/characterGenerator.ts` - Check usage
- [x] `src/lib/characterProfileBuilder.ts` - Already using it ✅
- [ ] `src/components/Copilot.tsx` - Check usage
- [ ] `src/components/CopilotNew.tsx` - Check usage
- [ ] Any other files with hardcoded prompts

### Phase 3: User Education 📚

Create clear documentation:

1. Update `PROMPT_LIBRARY_GUIDE.md` with:
   - How to find the Prompt Library
   - What each prompt controls
   - Examples of customization

2. Add in-app help:
   - Tooltips in Prompt Library
   - "What's this?" buttons
   - Link from HouseSettings to guide

## Migration Path for Users

For users with existing custom prompts:

```typescript
// On app startup, migrate old prompts to new system
async function migrateOldPrompts() {
  const houseConfig = await repositoryStorage.get("house_config");
  const wingmanConfig = legacyStorage.getItem("wingman_settings");

  if (houseConfig?.copilotPrompt) {
    await setPromptOverride("copilot.mainResponse", houseConfig.copilotPrompt);
  }

  if (houseConfig?.worldPrompt) {
    await setPromptOverride("house.world.description", houseConfig.worldPrompt);
  }

  if (wingmanConfig?.systemPrompt) {
    await setPromptOverride(
      "copilot.wingman.systemPrompt",
      wingmanConfig.systemPrompt
    );
  }

  // Mark migration complete
  legacyStorage.setItem("prompts_migrated", "true");
}
```

## Testing Checklist

After fixes:

- [ ] Edit copilot personality in Prompt Library → Verify copilot responds differently
- [ ] Edit character creation prompt → Verify new characters match style
- [ ] Edit story prompt → Verify story entries use new style
- [ ] Verify no duplicate prompt fields exist
- [ ] Test that prompt changes take effect immediately (no restart)
- [ ] Verify prompts persist across sessions

## Implementation Priority

**IMMEDIATE (Do Now)**:

1. Add missing prompts to library
2. Update HouseSettings to remove duplicate fields
3. Add migration script for existing users

**SOON**: 4. Update WingmanSettings 5. Audit all AI calls for hardcoded prompts 6. Add user documentation

**LATER**: 7. Add in-app help/tutorials 8. Create prompt templates/presets 9. Add import/export for prompt collections
