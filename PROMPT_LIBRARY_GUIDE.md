# Prompt Library User Guide

The Prompt Library gives you **complete control** over all AI-generated content in Dollhouse. This guide explains which prompt controls which aspect of the game.

## How to Use the Prompt Library

1. Navigate to the Prompt Library (usually in Settings or Tools menu)
2. Find the prompt you want to customize
3. Edit the text - you can use the placeholder tokens shown (e.g., `{{characterName}}`)
4. Click "Save" to store your changes
5. **Your changes take effect immediately** - no restart needed!

## Prompt Categories

### 🤖 Copilot Prompts

These control how the house copilot (AI assistant) behaves and responds.

#### `copilot.mainResponse` ⭐ **MOST IMPORTANT**
**Controls:** Main copilot personality and all responses to your messages
**Default:** Helpful assistant behavior
**Customize to:** Change copilot personality (friendly, professional, flirty, robotic, etc.)
**Tokens:** `{{copilotPrompt}}`, `{{houseContext}}`, `{{houseCharacters}}`, `{{conversationHistory}}`, `{{userMessage}}`

**Example custom prompt:**
```
You are Master's wingman and best friend. Talk casually like a bro, give advice about the girls, 
crack jokes, and be supportive. Keep responses under 100 words and use casual language.
```

#### `copilot.statusUpdate`
**Controls:** Status updates about character arousal/mood
**Tokens:** `{{copilotPrompt}}`, `{{houseContext}}`, `{{conversationHistory}}`, `{{characterName}}`, `{{arousal}}`, `{{happiness}}`, `{{relationship}}`

#### `copilot.chat.summaryPrompt`
**Controls:** How conversation history is summarized for memory
**Tokens:** `{{conversation}}`

#### `copilot.chat.hiddenObjectives`
**Controls:** How character objectives/goals are injected into conversations
**Tokens:** `{{objectives}}`

#### `copilot.chat.groupDirective`
**Controls:** Rules for characters in group chat (prevents repetitive intros, etc.)
**Tokens:** `{{firstLineDirective}}`

#### `copilot.chat.memoryPrefix`
**Controls:** How memory summaries are prefixed in character responses
**Tokens:** `{{summary}}`

#### `copilot.chat.replyTemplate` ⭐
**Controls:** Overall structure of character chat responses
**Tokens:** `{{systemPrompt}}`, `{{hiddenDirective}}`, `{{groupDirective}}`, `{{memorySection}}`, `{{historyText}}`, `{{userMessage}}`, `{{characterName}}`

#### `copilot.chat.interviewOpening`
**Controls:** First question when starting an interview with a character
**Tokens:** `{{characterName}}`

#### `copilot.chat.interviewQuestion`
**Controls:** Follow-up interview questions
**Tokens:** `{{characterProfile}}`, `{{latestUserMessage}}`, `{{lastAnswer}}`

---

### 👤 Character Prompts

These control how characters are created and how they behave.

#### `character.architect.template` ⭐ **MOST IMPORTANT FOR CHARACTER CREATION**
**Controls:** The main prompt used to generate a complete character profile
**Customize to:** Change what kind of characters get created, add/remove traits, change tone
**Tokens:** Many - including `{{themeLine}}`, `{{request}}`, `{{schema}}`, etc.

**Example customization:**
Change the tone from "seductive but classy" to "wholesome and innocent" or "dark and edgy"

#### `character.architect.schema`
**Controls:** The JSON structure expected for character data
**Don't change unless:** You know what you're doing with JSON schemas

#### `character.creator.personalityPrompt`
**Controls:** How personality traits are generated in manual character creator
**Customize to:** Get different types of personalities

#### `character.creator.featuresPrompt`
**Controls:** How physical features are generated
**Customize to:** Change description style (more/less detailed, different focus)

#### `character.creator.backgroundPrompt`
**Controls:** How character background stories are generated
**Tokens:** `{{personalityTraits}}`, `{{featureTraits}}`

#### `character.card.physicalDescriptionPrompt`
**Controls:** Physical descriptions on character cards
**Tokens:** `{{hairColor}}`, `{{eyeColor}}`, `{{skinTone}}`, `{{height}}`, `{{bodyType}}`, etc.

#### `character.prompts.fallbackSystem`
**Controls:** Default system prompt when a character doesn't have a custom one
**Tokens:** `{{name}}`, `{{personalityLine}}`, `{{backgroundLine}}`

#### `character.prompts.fallbackResponseStyle`
**Controls:** Default response style for characters
**Customize to:** Change how all characters talk by default

---

### 🏠 House Prompts

These control house-level features like behavior analysis and story generation.

#### `house.behavior.analysisPrompt`
**Controls:** How character behavior is analyzed after conversations
**Tokens:** `{{schema}}`, `{{characterBrief}}`, `{{recentMessages}}`, `{{latestUserMessage}}`
**Advanced:** Only edit if you want to change what stats/emotions are tracked

#### `house.story.entryPrompt`
**Controls:** How story chronicle entries are created
**Tokens:** `{{characterName}}`, `{{personality}}`, `{{relationshipStatus}}`, `{{eventType}}`, `{{title}}`, etc.
**Customize to:** Change story writing style, detail level, focus

#### `house.story.fallbackSummary`
**Controls:** Simple fallback when story generation fails
**Tokens:** `{{characterName}}`, `{{eventType}}`

#### `house.story.noHistoryIntro`
**Controls:** Text used when you first meet a character (no history yet)
**Tokens:** `{{characterName}}`

---

## Common Customizations

### Make Copilot More Friendly/Casual
Edit `copilot.mainResponse`:
```
You're my friendly AI buddy who helps me manage my house. Be casual, use emojis, 
crack jokes, and keep things fun. When I ask about characters, give me the real tea. ☕

Characters: {{houseCharacters}}
Recent chat: {{conversationHistory}}
User: {{userMessage}}

Give a helpful, friendly response. Keep it under 100 words.
```

### Make Characters More Romantic/Less Explicit
Edit `character.architect.template` - change the line:
```
Be concise, grounded, and avoid explicit sexual content. Tone: seductive but classy.
```
To:
```
Be romantic, sweet, and wholesome. Tone: affectionate and heartwarming, suitable for all ages.
```

### Change Character Response Style
Edit `character.prompts.fallbackResponseStyle`:
```
Keep replies authentic, natural, and conversational. Mix playfulness with genuine emotion.
Show personality through word choice and rhythm. Be present in the moment.
```

### Make Story Entries More Detailed
Edit `house.story.entryPrompt` - change:
```
1. A brief summary (1-2 sentences) of what happened
2. A detailed narrative description (3-4 sentences)
```
To:
```
1. A brief summary (2-3 sentences) of what happened
2. A detailed narrative description (5-8 sentences with vivid sensory details)
```

---

## Tips

1. **Test incrementally** - Make small changes and test before doing major rewrites
2. **Keep placeholders** - Don't remove `{{tokens}}` unless you know what you're doing
3. **Back up** - Copy the default prompt before editing so you can restore it
4. **Use "Reset"** - Each prompt has a Reset button to restore defaults
5. **Impact score** - Higher impact = more important prompt
6. **Read defaults** - The default prompts are good examples of what works

---

## Troubleshooting

**Q: I edited a prompt but nothing changed**
- Make sure you clicked "Save"
- Try refreshing the page
- Check that you used the correct `{{tokens}}`

**Q: Characters are responding weirdly**
- Check `copilot.chat.replyTemplate` and `character.prompts.fallbackSystem`
- Make sure you didn't accidentally remove important instructions
- Try resetting to defaults and making smaller changes

**Q: Character creation is broken**
- Check `character.architect.template` and `character.architect.schema`
- Make sure the schema JSON is valid
- Reset to defaults if needed

**Q: Copilot talks like a robot**
- Edit `copilot.mainResponse` to add personality
- Add casual language, emojis, or specific tone instructions
- Example: "You're a laid-back friend, not a formal assistant"

---

## Advanced: Understanding Tokens

Tokens like `{{characterName}}` are placeholders that get replaced with actual values at runtime:

- `{{characterName}}` → "Emma"
- `{{userMessage}}` → "How is Emma doing?"
- `{{houseCharacters}}` → (full list of all characters)

When you customize a prompt, keep these tokens so the AI gets the right context!

---

## Need Help?

If you're stuck or want to share your custom prompts:
1. Check the default values for examples
2. Start with small edits
3. Use the Reset button if things break
4. Remember: You have **complete control** - experiment and have fun! 🎮
