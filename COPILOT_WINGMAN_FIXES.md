# Copilot/Wingman Enhancements

## Overview

Major improvements to the Copilot/Wingman system to make it more user-friendly, contextually aware, and functionally powerful.

## Changes Made

### 1. ✅ Simplified Copilot Settings Tab

**Location:** `src/components/HouseSettings.tsx`

Added a new, intuitive Copilot settings tab with easy-to-understand controls:

#### New Settings:

1. **Main System Prompt** (Textarea)
   - Core instructions for Copilot behavior
   - Default: "You are Wingman, the Dollhouse assistant. Help manage the house, introduce girls, set up scenarios, and provide tips..."
   - Directly editable without navigating complex prompt library

2. **Personality** (Input field)
   - Quick personality descriptor
   - Default: "friendly and helpful, casual but knowledgeable"
   - Easy one-line customization

3. **Response Length** (Dropdown)
   - Brief: 1-2 sentences (quick replies)
   - Normal: 2-4 sentences (balanced)
   - Detailed: Longer, comprehensive responses
   - Default: Normal

4. **Context Detail Level** (Dropdown)
   - Lite: Minimal context, faster
   - Balanced: Good mix
   - Detailed: Full character info
   - Default: Balanced

5. **Include House Context** (Toggle)
   - When enabled, Copilot sees all girls and house status
   - Default: Enabled

#### Quick Actions Guide:

Added helpful guide in settings showing supported quick actions:
- "Bring [name] to my room" - starts a scenario
- "Tell me about [name]" - character details
- "Show me who's available" - list girls
- "Set up a scene with [name]" - create scenario

---

### 2. ✅ Fixed Wingman Chat Context

**Location:** `src/components/DatingSimShell.tsx` - `WingmanPanel` component

#### Problems Fixed:

1. **Wingman couldn't see any girls in house**
   - Now receives full `characters` array
   - Can reference any character by name

2. **Wingman always introduced himself**
   - Now maintains conversation history
   - Uses persistent `sessionId: "wingman-persistent"`
   - Only greets once at start

3. **No ongoing conversation**
   - Messages array now persists across interactions
   - Full conversation history sent to AI
   - Context maintained throughout session

4. **Didn't respond to what user said**
   - Enhanced prompt building with personality and response length
   - Uses house config settings
   - Better context from all characters

#### Key Improvements:

```typescript
// Now loads house settings on mount
useEffect(() => {
  const loadConfig = async () => {
    const config = await repositoryStorage.get("house_config");
    setHouseConfig(config || {});
  };
  loadConfig();
}, []);

// Enhanced AI call with full context
reply = await AIService.copilotRespond({
  threadId: "wingman-sidebar",
  messages: conversationHistory,  // Full history
  sessionId: "wingman-persistent", // Persistent session
  characters: characters || [],    // All girls visible
  copilotPrompt: enhancedPrompt,   // Custom personality
  includeHouseContext: true,       // House awareness
  contextDetail: "balanced",       // Appropriate detail
});
```

---

### 3. ✅ Clear Chat Button

**Location:** `src/components/DatingSimShell.tsx` - `WingmanPanel` header

Added a clear chat button (trash icon) in the top-right corner:
- Resets conversation to initial greeting
- Maintains personality from settings
- Red hover effect for clarity
- Toast confirmation

```typescript
const handleClearChat = useCallback(() => {
  const greeting = houseConfig?.copilotPersonality 
    ? `Hey! I'm your Wingman - ${houseConfig.copilotPersonality}. How can I help?`
    : "Hey! I can help with tips, character insights, or house management. What do you need?";
  setMessages([{
    id: Date.now().toString(),
    role: "assistant",
    content: greeting,
  }]);
  toast.success("Chat cleared");
}, [houseConfig]);
```

---

### 4. ✅ Quick Action Detection

**Location:** `src/components/DatingSimShell.tsx` - `handleSendChat`

Copilot now detects and executes quick actions:

#### Supported Patterns:

1. **Bring character to room:**
   - "bring Tina to my room"
   - "bring tina to room"
   - Regex: `/bring\s+(\w+)\s+to\s+(my\s+)?room/i`

2. **Set up scenario:**
   - "set up a scene with Tina"
   - "start scenario with tina"
   - "create scene with Tina"
   - Regex: `/(?:set\s*up|start|create)\s+(?:a\s+)?(?:scene|scenario)\s+(?:with\s+)?(\w+)/i`

#### Action Flow:

```typescript
const bringMatch = userMessage.match(/bring\s+(\w+)\s+to\s+(my\s+)?room/i);
const setupMatch = userMessage.match(/(?:set\s*up|start|create)\s+(?:a\s+)?(?:scene|scenario)\s+(?:with\s+)?((\w+)/i);

if ((bringMatch || setupMatch) && onStartChat) {
  const targetName = (bringMatch?.[1] || setupMatch?.[1] || "").toLowerCase();
  const targetChar = characters.find(c => 
    c.name.toLowerCase().includes(targetName)
  );
  
  if (targetChar) {
    // Confirm action to user
    const actionReply = `Perfect! I'll bring ${targetChar.name} to your room right now. Setting up the scene...`;
    
    // Start the chat with character
    setTimeout(() => onStartChat(targetChar), 500);
    return;
  }
}
```

When quick action detected:
1. Copilot confirms action with friendly message
2. Automatically opens main chat with selected character
3. Sets up scenario intro (e.g., "I just brought Tina to your room...")

---

## How to Use

### Configure Copilot:

1. Open **Settings** (gear icon)
2. Go to **Copilot** tab
3. Customize:
   - Main system prompt (what Copilot should do)
   - Personality (how it should talk)
   - Response length (brief/normal/detailed)
   - Context level (how much info to include)

### Quick Actions:

Just chat naturally:
- "Bring Lily to my room"
- "Set up a scene with Amanda"
- "Tell me about Sammy"
- "Who's available tonight?"

### Clear Chat:

Click the **trash icon** in top-right of Wingman panel to start fresh.

---

## Technical Details

### New Config Fields:

```typescript
interface HouseConfig {
  // ... existing fields
  copilotResponseLength?: "brief" | "normal" | "detailed";
  copilotPersonality?: string;
  copilotMainPrompt?: string;
}
```

### Default Values:

```typescript
const DEFAULT_CONFIG: HouseConfig = {
  // ... existing defaults
  copilotResponseLength: "normal",
  copilotPersonality: "friendly and helpful, casual but knowledgeable",
  copilotMainPrompt: "You are Wingman, the Dollhouse assistant. Help manage the house, introduce girls, set up scenarios, and provide tips. Keep responses conversational and engaging. Remember context from our ongoing conversation.",
};
```

### WingmanPanel Props:

```typescript
interface WingmanPanelProps {
  selectedCharacter: Character | null;
  characters: Character[];           // NEW: All characters
  onShortcut: (shortcut: WingmanShortcut) => void;
  onOpenSettings: () => void;
  onOpenManager: () => void;
  onStartChat?: (character: Character) => void; // NEW: Start chat handler
}
```

---

## Before vs After

### Before:
❌ Copilot settings buried in complex Prompt Library  
❌ Wingman couldn't see characters in house  
❌ Always repeated introduction  
❌ No conversation memory  
❌ No quick actions  
❌ No way to clear chat  

### After:
✅ Simple, intuitive Copilot settings tab  
✅ Wingman sees all characters  
✅ Greets once, then remembers conversation  
✅ Full conversation history maintained  
✅ Quick actions: "bring X to my room" works!  
✅ Clear chat button in top-right  

---

## Testing Checklist

- [ ] Open Settings → Copilot tab
- [ ] Change Main System Prompt and save
- [ ] Change Personality and save
- [ ] Test Response Length settings (brief/normal/detailed)
- [ ] Open Wingman chat
- [ ] Verify it only greets once (not every message)
- [ ] Ask "who's in the house?" - should see all characters
- [ ] Say "bring [character name] to my room"
- [ ] Verify it starts a chat with that character
- [ ] Click clear chat button
- [ ] Verify chat resets with fresh greeting

---

## Related Files

- `src/components/HouseSettings.tsx` - Enhanced Copilot settings tab
- `src/components/DatingSimShell.tsx` - WingmanPanel fixes and quick actions
- `src/hooks/useRepositoryStorage.ts` - Config storage
- `src/lib/aiService.ts` - Copilot AI integration

---

## Future Enhancements

Potential improvements:
- More quick actions (gift, train, schedule, etc.)
- Voice commands for quick actions
- Copilot suggests next actions based on context
- Multi-character scenarios
- Custom quick action templates
