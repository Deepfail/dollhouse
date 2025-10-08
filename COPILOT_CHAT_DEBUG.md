# Copilot Chat Debugging Guide

## Current Implementation

### Fixed Issues:

1. ✅ Correct `useChat()` hook API usage
2. ✅ Proper message state management
3. ✅ Fixed sendMessage parameters (sessionId, content, senderId, options)
4. ✅ Integrated with AIService.copilotRespond
5. ✅ Added console logging for debugging

### How to Debug:

1. **Open Browser Console** (F12)
2. **Look for these logs:**

   ```
   Session init effect { sessionsLoaded: true/false, sessions: [...] }
   Existing copilot session: {...} or undefined
   Creating new copilot session...
   Created copilot session: "session-id"
   handleSendChat called { chatDraft: "...", copilotSessionId: "...", isResponding: false }
   Sending message: "..."
   ```

3. **Check for Errors:**
   - Session creation failures
   - sendMessage failures
   - AIService.copilotRespond failures

### Expected Flow:

1. **Component Mounts:**
   - `sessionsLoaded` becomes true
   - Checks for existing 'copilot' type session
   - If not found, creates new one
   - Sets `copilotSessionId` in state
   - Sends welcome message
   - Refreshes messages to display welcome

2. **User Types Message:**
   - Input value updates `chatDraft` state
   - Button becomes enabled (not disabled)

3. **User Presses Enter or Clicks Send:**
   - Form onSubmit fires
   - `event.preventDefault()` called
   - `handleSendChat()` invoked
   - Logs: "handleSendChat called"
   - Checks: `chatDraft.trim()`, `copilotSessionId`, `!isResponding`
   - If all pass, logs: "Sending message"
   - Clears input (`setChatDraft('')`)
   - Sets responding state (`setIsResponding(true)`)
   - Sends user message
   - Refreshes to show user message
   - Calls AIService for response
   - Sends copilot response
   - Refreshes to show copilot response
   - Sets responding state back (`setIsResponding(false)`)

### Common Issues & Solutions:

#### Issue: Button/Enter doesn't work

**Check:**

- Is `handleSendChat` being called? (check console)
- Is `copilotSessionId` set? (check console log)
- Is `chatDraft` empty? (type something)
- Is `isResponding` stuck at true?

**Solution:**

- If sessionId is null: Session creation failed
- If chatDraft is empty: Input not updating state
- If isResponding stuck: Previous error left it in bad state

#### Issue: Messages not displaying

**Check:**

- Is `refreshMessages` being called?
- Are messages being added to state?
- Check `messages` array in React DevTools

**Solution:**

- Verify `getSessionMessages` returns data
- Check message structure matches ChatMessage interface
- Ensure `setMessages` is being called

#### Issue: AI not responding

**Check:**

- Is AIService.copilotRespond defined?
- Check network tab for API calls
- Look for error logs

**Solution:**

- Verify AI service is configured
- Check API keys/endpoints
- Handle fallback gracefully

### Manual Test Steps:

1. **Open app in browser**
2. **Open console (F12)**
3. **Navigate to wingman sidebar** (should be on right, desktop only)
4. **Check Chat tab is active** (should be default)
5. **Look for console logs:**
   - Session init
   - Session creation or existing session found
6. **Type a message** in the input
7. **Press Enter or click Send button**
8. **Check console for:**
   - "handleSendChat called"
   - "Sending message"
9. **Watch for:**
   - Message appears in chat
   - Loading indicator shows
   - AI response appears
   - Loading indicator disappears

### Code Locations:

- **Component**: `/workspaces/dollhouse/src/components/DatingSimShell.tsx`
- **Function**: `WingmanPanel` (line ~763)
- **Session Init**: useEffect around line ~873
- **Send Handler**: handleSendChat around line ~915
- **Form**: TabsContent around line ~1066

### Key Dependencies:

```typescript
const {
  sessions,
  sessionsLoaded,
  createSession,
  sendMessage: sendChatMessage,
  getSessionMessages,
} = useChat();
```

### State Variables:

```typescript
const [activeTab, setActiveTab] = useState<"chat" | "tools">("chat");
const [chatDraft, setChatDraft] = useState("");
const [isResponding, setIsResponding] = useState(false);
const [messages, setMessages] = useState<ChatMessage[]>([]);
const [copilotSessionId, setCopilotSessionId] = useState<string | null>(null);
```

### Next Steps if Still Broken:

1. Check if form is actually submitting (add log in onSubmit)
2. Check if Input is updating state (add log in onChange)
3. Check if Button is receiving click (add log in onClick)
4. Verify useCallback dependencies are correct
5. Check React DevTools for component state
6. Verify no parent component preventing events
7. Check for CSS issues (pointer-events: none, etc.)
