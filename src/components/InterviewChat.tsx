import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChat } from '@/hooks/useChat';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { AIService } from '@/lib/aiService';
import { logger } from '@/lib/logger';
import { useCallback, useEffect, useState } from 'react';

interface InterviewChatProps {
  sessionId: string;
  onExit?: () => void;
}

// Mobile-style interview chat: user, copilot (interviewer), character.
export function InterviewChat({ sessionId, onExit }: InterviewChatProps) {
  const { sessions, getSessionMessages, sendMessage } = useChat();
  const { characters } = useHouseFileStorage();
  interface Msg { id: string; characterId?: string; content: string }
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  // For simplicity, we'll query the container by id after render
  const scrollContainerId = `interview-scroll-${sessionId}`;

  const session = sessions.find(s => s.id === sessionId);
  const character = characters?.find(c => session?.participantIds.includes(c.id));

  const load = useCallback(async () => {
    if (!sessionId) return;
    const msgs = await getSessionMessages(sessionId);
    setMessages(msgs);
  }, [sessionId, getSessionMessages]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    try {
      interface DocLike { getElementById(id: string): HTMLElementLike | null }
      interface HTMLElementLike { scrollTop: number; scrollHeight: number }
      const g = globalThis as unknown as { document?: DocLike };
      const d = g.document;
      if (!d) return;
      const el = d.getElementById(scrollContainerId) as HTMLElementLike | null;
      if (el) { el.scrollTop = el.scrollHeight; }
    } catch (e) { logger.warn('Interview scroll sync failed', e); }
  }, [messages, scrollContainerId]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setLoading(true);
    try {
      await sendMessage(sessionId, text, 'user', { copilot: true });
      await load();
      // Generate follow-up question from copilot interviewer
      let follow = '';
      try {
  const history = messages.concat([{ id: 'temp', content: text, characterId: undefined } as Msg]);
        const lastCharReply = [...history].reverse().find(m => m.characterId === character?.id);
        const charProfile = character ? `${character.name}: ${character.personality}. ${character.description}` : 'the character';
        const prompt = `You are an interviewer (house Copilot) asking thoughtful, concise questions to learn about ${charProfile}. Recent user message: ${text}. ${lastCharReply ? 'Their last answer: ' + lastCharReply.content : ''}\nCraft the next single, natural interview question. Avoid repeating earlier questions.`;
        follow = await AIService.generateResponse(prompt, undefined, undefined, { temperature: 0.7, max_tokens: 90 });
      } catch (e) {
        logger.warn('Follow-up generation failed', e);
        follow = "What else would you like to share?";
      }
      await sendMessage(sessionId, follow, 'copilot', { copilot: true });
      await load();
    } finally {
      setLoading(false);
    }
  }, [input, sendMessage, sessionId, load, character, messages]);

  if (!session || !character) {
    return <div className="p-4 text-sm text-gray-400">Interview session not found.</div>;
  }

  const renderBubble = (m: Msg) => {
    const isUser = !m.characterId; // user messages have no characterId
    const isCopilot = m.characterId === 'copilot'; // we stored copilot via senderId 'copilot'
    const bubbleColor = isUser ? 'bg-gradient-to-r from-[#4facfe] to-[#667eea]' : isCopilot ? 'bg-[rgba(255,19,114,0.18)] border border-[#ff1372]/40' : 'bg-[rgba(67,233,123,0.18)] border border-[#43e97b]/40';
    const align = isUser ? 'ml-auto' : 'mr-auto';
    const textColor = isUser ? 'text-white' : 'text-gray-200';
    return (
      <div key={m.id} className={`flex flex-col max-w-[80%] ${align} gap-1`}>        
        <div className={`rounded-2xl px-4 py-2 whitespace-pre-wrap text-sm shadow-sm ${bubbleColor} ${textColor}`}>{m.content}</div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a]">
      <div className="p-3 flex items-center gap-3 border-b border-gray-800 bg-[#0f0f0f]">
        <Button variant="ghost" size="sm" onClick={onExit}>Back</Button>
        <Avatar className="w-8 h-8">
          <AvatarImage src={character?.avatar} />
          <AvatarFallback>{character?.name?.slice(0,2)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-white">Interview: {character?.name}</span>
          <span className="text-[10px] uppercase tracking-wide text-[#ff1372]">Live</span>
        </div>
      </div>
  <div id={scrollContainerId} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(renderBubble)}
        {loading && <div className="text-xs text-gray-500">Thinking…</div>}
      </div>
      <div className="p-3 border-t border-gray-800 flex gap-2 bg-[#0f0f0f]">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Ask or respond…"
        />
        <Button disabled={!input.trim() || loading} onClick={handleSend}>Send</Button>
      </div>
    </div>
  );
}
