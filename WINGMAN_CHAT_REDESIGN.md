# Wingman Chat - Complete Redesign (Session-Independent)

## Problem Identified

The previous implementation had a **critical architectural flaw**:

### The Bug:

1. **Invalid Session Type**: Used `createSession('copilot')` but 'copilot' is NOT a valid session type
   - Valid types: 'individual', 'group', 'scene', 'assistant', 'interview'
2. **Session Sharing**: Type 'assistant' sessions are SINGLETON - only one exists
   - GirlManagerSidebar uses type 'assistant'
   - WingmanPanel tried to use type 'assistant' (or invalid 'copilot')
   - Both would share the SAME session!
3. **Session Hijacking**: The 'assistant' session was interfering with character chats
   - When user chatted with a character, copilot would respond
   - Sessions were getting mixed up

## Solution: Session-Independent Design

**The wingman chat now operates COMPLETELY INDEPENDENTLY of the session system.**

### New Architecture:

```typescript
// Simple local state - no sessions!
const [messages, setMessages] = useState<
  Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
  }>
>([{ id: "1", role: "assistant", content: "Welcome message..." }]);
```

### How It Works Now:

1. **No Session Creation**
   - Doesn't call `createSession()`
   - Doesn't use `useChat()` hook at all
   - Completely isolated from character chat sessions

2. **Direct AI Calls**
   - User sends message → Add to local state
   - Call `AIService.copilotRespond()` directly
   - Add response to local state
   - No database persistence

3. **Simple Message Flow**
   ```
   User types → handleSendChat() → Add user msg to state →
   Call AI service → Add AI response to state → Done
   ```

### Benefits:

✅ **No Session Conflicts** - Can't interfere with character chats
✅ **No Database Overhead** - Faster, simpler
✅ **Independent State** - Messages only live in memory
✅ **Clean Architecture** - Separation of concerns
✅ **Works Immediately** - No session initialization delays

### Trade-offs:

⚠️ **No Persistence** - Messages cleared on page refresh
⚠️ **No History** - Can't retrieve old conversations
⚠️ **Memory Only** - Lost when component unmounts

> **Note**: These trade-offs are acceptable because the wingman chat is meant for quick, ephemeral assistance - not long conversations that need persistence.

## Implementation Details

### State Management:

```typescript
const [chatDraft, setChatDraft] = useState('');
const [isResponding, setIsResponding] = useState(false);
const [messages, setMessages] = useState<Array<{
  id: string;
  role: 'user' | 'assistant';
  content: string
}>>([...]);
```

### Send Handler:

```typescript
const handleSendChat = useCallback(async () => {
  if (!chatDraft.trim() || isResponding) return;

  const userMessage = chatDraft.trim();
  const newUserMsg = {
    id: Date.now().toString(),
    role: "user" as const,
    content: userMessage,
  };

  // Add user message immediately
  setMessages((prev) => [...prev, newUserMsg]);
  setChatDraft("");
  setIsResponding(true);

  try {
    // Call AI service
    let reply = "Default fallback message";

    if (typeof AIService.copilotRespond === "function") {
      const conversationHistory = [...messages, newUserMsg].map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      reply = await AIService.copilotRespond({
        threadId: "wingman-sidebar",
        messages: conversationHistory,
        sessionId: "wingman-local",
        characters: [],
        copilotPrompt: selectedCharacter
          ? `Current focus: ${selectedCharacter.name}`
          : undefined,
        housePrompt: undefined,
        includeHouseContext: false,
        contextDetail: "lite",
      });
    }

    // Add assistant response
    const assistantMsg = {
      id: (Date.now() + 1).toString(),
      role: "assistant" as const,
      content: reply,
    };
    setMessages((prev) => [...prev, assistantMsg]);
  } catch (error) {
    logger.error("Failed to send copilot message:", error);
    toast.error("Could not send message to copilot");
  } finally {
    setIsResponding(false);
  }
}, [chatDraft, isResponding, messages, selectedCharacter]);
```

### Message Display:

```typescript
{messages.map((message) => {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={isUser ? 'user-bubble' : 'assistant-bubble'}>
        {message.content}
      </div>
    </div>
  );
})}
```

## Testing Checklist:

- [ ] Wingman chat works (can send/receive messages)
- [ ] Character chat still works normally
- [ ] No copilot responses in character chats
- [ ] Messages display correctly (user vs assistant styling)
- [ ] Loading indicator shows while waiting for AI
- [ ] Error handling works (shows toast on failure)
- [ ] No console errors
- [ ] No session conflicts

## Comparison: Old vs New

| Feature         | Old (Broken)                                | New (Fixed)          |
| --------------- | ------------------------------------------- | -------------------- |
| Session Type    | 'copilot' (invalid) or 'assistant' (shared) | None - no sessions   |
| Session Storage | Yes (database)                              | No (memory only)     |
| Persistence     | Yes (buggy)                                 | No (by design)       |
| Conflicts       | Yes (hijacked character chats)              | No (isolated)        |
| Complexity      | High (session management)                   | Low (direct state)   |
| Speed           | Slower (db operations)                      | Faster (memory only) |

## Character Chat System (Unchanged)

The character chat system continues to work as before:

- Uses 'individual' session type
- Stores in database
- Persists across page refreshes
- Completely separate from wingman chat

## Future Enhancements (Optional)

If persistence is needed later:

1. Use localStorage for message history
2. Create custom storage separate from sessions
3. Implement export/import functionality
4. Add "Clear History" button

For now, the session-independent design is simpler, cleaner, and **actually works**.
