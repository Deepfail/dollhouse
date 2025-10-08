# Character Creator: Response Style & Origin Scenario Prompts

## Problem

The character creator was falling back to hardcoded default values for:
- **Response Style** - How the character communicates
- **Origin Scenario** - First meeting story

The AI wasn't reliably generating these fields because there were no detailed instructions on **how** to create them.

## Solution

Added two new customizable prompts that provide detailed guidance to the AI on how to generate these fields:

### 1. Response Style Generation Guide

**Prompt Key:** `character.generator.responseStyleGuide`

**Location:** Settings → Prompts → Character Prompts

**Default Value:**
```
Define her unique voice: Does she speak in short bursts or flowing sentences? Is she playful and teasing, or serious and direct? Include specific verbal patterns (pet names, catchphrases, dialect quirks), emotional tells (when she gets flustered, defensive, flirty), pacing (rapid-fire vs deliberate), and any signature communication habits that make her distinct.
```

**Impact:** This guide is embedded in the character creation prompt schema, telling the AI exactly what to include in the `responseStyle` field.

---

### 2. Origin Scenario Generation Guide

**Prompt Key:** `character.generator.originScenarioGuide`

**Location:** Settings → Prompts → Character Prompts

**Default Value:**
```
Craft a vivid 2-3 sentence story: Where did they meet? (Be specific - rooftop party, art gallery, coffee shop, etc.) What sparked the chemistry? What made her choose to come to the Dollhouse? Make it feel real, sensual but tasteful, and true to her personality and background. She must be clearly portrayed as an adult making her own choice.
```

**Impact:** This guide is embedded in the character creation prompt schema, telling the AI exactly what to include in the `originScenario` field.

---

## How It Works

### Before (Fallback Only):

```typescript
// In characterProfileBuilder.ts
responseStyle: 
  existingPrompts.responseStyle ||
  "Keep replies warm, teasing, and attentive; mix sultry confidence with flashes of vulnerable honesty."

originScenario:
  existingPrompts.originScenario ||
  "{{name}} met the user as an adult and willingly came back to the Dollhouse for an intimate encore."
```

The AI had **no guidance** on what to put in these fields, so it often left them empty, triggering the fallback.

### After (Guided Generation):

The JSON schema sent to the AI now includes detailed instructions:

```json
{
  "prompts": {
    "responseStyle": "How she communicates: tone, rhythm, verbal quirks, emotional patterns. Define her unique voice: Does she speak in short bursts or flowing sentences?...",
    "originScenario": "2-3 sentences: compelling first meeting story and how she came to the Dollhouse. Craft a vivid story: Where did they meet?..."
  }
}
```

The AI now has **specific guidance** on:
- What elements to include (verbal patterns, emotional tells, pacing)
- How long it should be (2-3 sentences)
- What tone to use (sensual but tasteful)
- What to avoid (generic scenarios)

---

## Customization

You can now customize these prompts in **Settings → Prompts → Character Prompts**:

### Example Customizations:

#### More Directive Response Style:
```
Describe her communication style in 3-4 sentences. Include: 1) sentence length and pacing, 2) emotional expressiveness, 3) use of slang or formal language, 4) any verbal tics or catchphrases. Make it specific to her personality and background.
```

#### More Structured Origin Scenario:
```
Write a 3-sentence origin story following this structure:
1. Where and when they first met (specific location and context)
2. What attraction or chemistry sparked between them
3. Her decision to join the Dollhouse (must show clear adult consent and agency)
Keep it sensual, tasteful, and character-appropriate.
```

#### Brief/Minimal Version:
```
One sentence describing her unique communication style.
```

---

## Technical Details

### Files Changed:

1. **src/lib/prompts.ts**
   - Added `character.generator.responseStyleGuide` prompt definition
   - Added `character.generator.originScenarioGuide` prompt definition
   - Updated `character.architect.schema` to include `{{responseStyleGuide}}` and `{{originScenarioGuide}}` placeholders
   - Added these prompts to the PromptKey type and placeholders array

2. **src/lib/characterProfileBuilder.ts**
   - Updated `buildPrompt()` function to pass `responseStyleGuide` and `originScenarioGuide` to the template
   - These values are now injected into the schema that the AI sees

### Prompt Flow:

```
User creates character
    ↓
buildPrompt() loads:
    - character.architect.template (main prompt)
    - character.architect.schema (JSON structure)
    - character.generator.responseStyleGuide (NEW)
    - character.generator.originScenarioGuide (NEW)
    ↓
formatPrompt() injects guides into schema:
    "responseStyle": "... {{responseStyleGuide}}"
    "originScenario": "... {{originScenarioGuide}}"
    ↓
AI sees detailed instructions for each field
    ↓
AI generates responseStyle and originScenario
    ↓
If AI still fails to generate them, fallbacks still exist as safety net
```

---

## Testing

To test these changes:

1. **Open Character Creator**
2. **Create a new character** (any archetype)
3. **Check the generated prompts** after creation:
   - Click "Edit Prompts" on the character card
   - Verify `Response Style` is populated with character-specific communication patterns
   - Verify `Origin Scenario` is populated with a compelling first-meeting story

4. **Customize the guides** (optional):
   - Open Settings → Prompts → Character Prompts
   - Find "Response Style Generation Guide"
   - Edit to your preference
   - Create a new character and verify it follows your custom guidance

---

## Benefits

✅ **More consistent generation** - AI now has clear instructions, less likely to leave fields blank  
✅ **Better quality** - Guides prompt the AI to include specific elements (verbal patterns, emotional tells, specific locations)  
✅ **Fully customizable** - You can edit these guides in Settings to match your preferred style  
✅ **Fallbacks still work** - If AI still fails, hardcoded fallbacks ensure characters always have these fields  
✅ **No breaking changes** - Existing characters unaffected, only impacts new character generation  

---

## Related Prompts

These prompts work alongside other character generation prompts:

- `character.architect.template` - Main character creation prompt
- `character.architect.schema` - JSON structure definition
- `character.generator.promptAlignment` - Ensures all prompts align with character facts
- `character.prompts.fallbackResponseStyle` - Fallback value when generation fails
- `character.prompts.defaultOriginScenario` - Fallback value when generation fails

All editable in **Settings → Prompts → Character Prompts**!
