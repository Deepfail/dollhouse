# Character Creator Settings

## Overview

Added a comprehensive settings system for configuring character archetypes used in auto-generation.

## What Was Added

### 1. CharacterCreatorSettings Component

**Location:** `/src/components/CharacterCreatorSettings.tsx`

A new dialog that allows users to customize the three character archetypes:

- **College** (default: collegiate adult energy)
- **Prime** (default: peak-confidence professional energy)
- **Fresh** (default: bright, newly adventurous adult energy)

### 2. Settings UI

- **Access:** Click the gear icon (⚙️) in the Character Creator dialog header
- **Tabs:** One tab for each archetype
- **Per-Archetype Settings:**
  - Label (display name)
  - Pitch/Description (what the AI uses to understand the archetype)
  - Adult Tone Reminder (keeps the portrayal clearly grown-up without numbers)
  - Default Role (e.g., "Campus Muse")
  - Default Room Type (e.g., "club", "vip", "lounge")

### 3. Reset Functions

- **Reset Single Archetype:** Button on each tab to reset that archetype to defaults
- **Reset All:** Button at bottom to reset all three archetypes at once

### 4. Persistence

- Settings are saved to `localStorage` under key: `dollhouse.archetypeSettings`
- Settings persist across browser sessions
- Changes apply immediately to all new character generation

## Where Archetypes Are Used

The archetypes defined in settings control:

1. **Character Creator** - Manual character creation with AI assistance
2. **Auto Character Creator** - Automatic background character generation
3. **Character Generator** (`characterGenerator.ts`) - Core generation logic

## Architecture Changes

### Modified Files

#### `/src/lib/characterGenerator.ts`

- Changed `ARCHETYPE_DETAILS` from static const to dynamic Proxy
- Now reads from localStorage via `getArchetypeSettings()`
- Falls back to defaults if localStorage unavailable
- All character generation now respects user-defined archetypes

#### `/src/components/CharacterCreator.tsx`

- Added gear icon button in dialog header
- Added `CharacterCreatorSettings` import
- Added `settingsOpen` state
- Settings dialog opens as overlay on top of creator dialog

### New Files

#### `/src/components/CharacterCreatorSettings.tsx`

- Complete settings UI with tabs
- Form fields for all archetype properties
- Reset functionality
- LocalStorage integration
- Export helper functions:
  - `getArchetypeSettings()` - Load settings
  - `saveArchetypeSettings()` - Save settings

## Default Values

### College Archetype

```typescript
{
  label: 'College',
  pitch: 'upperclass student balancing campus life, side hustles, and thrill-seeking nights',
  maturityNote: 'Describe her as an unapologetically adult woman with collegiate energy who makes her own choices without implying youth.',
  defaultRole: 'Campus Muse',
  defaultRoom: 'club',
}
```

### Prime Archetype

```typescript
{
  label: 'Prime',
  pitch: 'ambitious woman firmly in her prime—polished, seductive, and in control of her world',
  maturityNote: 'Emphasize that she is seasoned, confident, and firmly in her adult prime—experienced without needing numbers.',
  defaultRole: 'Prime Temptress',
  defaultRoom: 'vip',
}
```

### Fresh Archetype

```typescript
{
  label: 'Fresh',
  pitch: 'fresh-faced adult bursting with curiosity, playful bravado, and a drive to impress',
  maturityNote: 'Keep the tone eager and bright while making it explicit she is a consenting adult exploring the Dollhouse by choice.',
  defaultRole: 'Fresh Muse',
  defaultRoom: 'lounge',
}
```

## Usage Instructions

### To Change Archetype Settings:

1. Open Character Creator dialog
2. Click the gear icon (⚙️) in the top right
3. Select the archetype tab you want to edit
4. Modify any of the fields
5. Click "Save Settings"
6. Settings now apply to all future character generation

### To Reset Settings:

- **Single Archetype:** Click "Reset to Default" on that archetype's tab
- **All Archetypes:** Click "Reset All to Defaults" at the bottom
- **Important:** Must click "Save Settings" to persist resets

### To View Current Settings:

- Settings are shown in real-time in the dialog
- Check localStorage key `dollhouse.archetypeSettings` for raw JSON

## How Prompts Work

The "Pitch" field is the most important - it's what gets sent to the AI to define the character archetype:

**Example:** For College archetype:

```
"upperclass student balancing campus life, side hustles, and thrill-seeking nights"
```

This text is inserted into the character generation prompt:

```
Design a {{rarity}} {{gender}} companion for the Digital Dollhouse.
Archetype focus: College — upperclass student balancing campus life,
side hustles, and thrill-seeking nights. Describe her as an
unapologetically adult woman with collegiate energy who makes her own
choices without implying youth.
```

## Technical Details

### Storage Format

```json
{
  "college": {
    "label": "College",
    "pitch": "upperclass student balancing...",
    "maturityNote": "Describe her as an unapologetically adult woman with collegiate energy who makes her own choices without implying youth.",
    "defaultRole": "Campus Muse",
    "defaultRoom": "club"
  },
  "prime": {
    /* ... */
  },
  "fresh": {
    /* ... */
  }
}
```

### Proxy Pattern

The `characterGenerator.ts` uses a JavaScript Proxy to dynamically fetch settings:

- Reads from localStorage on every access
- Falls back to defaults if not found
- No need to reload the app when settings change

### Type Safety

All settings are typed with TypeScript:

```typescript
interface ArchetypeConfig {
  label: string;
  pitch: string;
  maturityNote: string;
  defaultRole: string;
  defaultRoom: string;
}
```

## Future Enhancements

Potential improvements:

- Import/Export settings as JSON files
- Preset templates for different themes
- Preview generated character with current settings
- Integration with other prompt settings
- Custom archetypes (beyond the 3 defaults)

## Related Files

- `/src/components/CharacterCreatorSettings.tsx` - Settings UI
- `/src/lib/characterGenerator.ts` - Generation logic
- `/src/components/CharacterCreator.tsx` - Manual creator
- `/src/components/CharacterAutoCreateDialog.tsx` - Auto creator
- `/src/lib/prompts.ts` - Other prompt configurations
