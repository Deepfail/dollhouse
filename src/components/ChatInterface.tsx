import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChat } from '@/hooks/useChat';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { getDb } from '@/lib/db';
import { ArrowLeft, CaretDown, CaretUp, ChatCircle, PaperPlane, Users } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';


interface ChatInterfaceProps {
  sessionId?: string | null;
  onBack?: () => void;
  onStartChat?: (characterId: string) => Promise<void>;
  onStartGroupChat?: (sessionId?: string) => Promise<void>;
}

export function ChatInterface({ sessionId, onBack, onStartChat, onStartGroupChat }: ChatInterfaceProps) {
  const { characters } = useHouseFileStorage();
  const { sessions, sendMessage, getSessionMessages, updateSessionGoal } = useChat();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sessionMessages, setSessionMessages] = useState<any[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>({});

  const session = sessions?.find((s: any) => s.id === sessionId);
  const sessionCharacters = characters?.filter((c: any) => session?.participantIds.includes(c.id)) || [];
  const [showDirector, setShowDirector] = useState(false);
  const [hiddenGoals, setHiddenGoals] = useState<Record<string, { goal: string; priority: string }>>({});

  useEffect(() => {
    if (!sessionId) {
      setSessionMessages([]);
      return;
    }

    const loadMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const messages = await getSessionMessages(sessionId);
        setSessionMessages(messages);
      } catch (error) {
        console.error('Failed to load messages:', error);
        setSessionMessages([]);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadMessages();
  }, [sessionId, getSessionMessages]);

  // Load hidden goals for this chat session from DB
  useEffect(() => {
    const loadGoals = async () => {
      try {
        if (!sessionId) {
          setHiddenGoals({});
          return;
        }
        const { db } = await getDb();
        const rows: any[] = [];
        db.exec({
          sql: 'SELECT character_id, goal_text, priority FROM session_goals WHERE session_id = ?',
          bind: [sessionId],
          rowMode: 'object',
          callback: (r: any) => rows.push(r)
        });
        const byChar: Record<string, { goal: string; priority: string }> = {};
        for (const r of rows) {
          byChar[r.character_id] = { goal: r.goal_text, priority: r.priority };
        }
        setHiddenGoals(byChar);
      } catch (e) {
        console.warn('Failed to load hidden goals:', e);
        setHiddenGoals({});
      }
    };
    loadGoals();
  }, [sessionId]);

  useEffect(() => {
    if (!session) {
      console.log('No session found for ID:', sessionId);
    } else {
      console.log('Chat session loaded:', session);
    }
  }, [session, sessionId]);

  const handleSendMessage = async () => {
    if (!message.trim() || !sessionId || isSending) return;

    setIsSending(true);
    setIsTyping(true);
    try {
      await sendMessage(sessionId, message.trim(), 'user');
      setMessage('');
      
      // Reload messages
      const messages = await getSessionMessages(sessionId);
      setSessionMessages(messages);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!session) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <ChatCircle size={48} className="mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Chat Session Not Found</h3>
          <p className="text-muted-foreground mb-4">The requested chat session could not be loaded.</p>
          <Button onClick={onBack}>
            <ArrowLeft size={16} className="mr-2" />
            Back to House
          </Button>
        </div>
      </div>
    );
  }

  // Simple helpers
  const toggleReaction = (msgId: string, emoji: string) => {
    setReactions(prev => {
      const current = prev[msgId] || {};
      const has = current[emoji] && current[emoji] > 0;
      const next = { ...current };
      if (has) delete next[emoji]; else next[emoji] = 1;
      return { ...prev, [msgId]: next };
    });
  };

  const parseImageFromContent = (text: string): { isImage: boolean; src?: string; caption?: string } => {
    if (!text) return { isImage: false };
    const trimmed = text.trim();
    if (trimmed.startsWith('data:image')) return { isImage: true, src: trimmed, caption: '' };
    const match = trimmed.match(/(https?:\/\/\S+\.(?:png|jpg|jpeg|webp|gif))(.*)$/i);
    if (match) {
      const url = match[1];
      const rest = match[2]?.trim() || '';
      const onlyUrl = trimmed === url;
      return { isImage: true, src: url, caption: onlyUrl ? '' : rest };
    }
    return { isImage: false };
  };

  // Seen/delivered status for the latest user message
  const lastUserIndex = [...sessionMessages].map((m, i) => ({ m, i })).filter(x => !x.m.characterId).pop()?.i ?? -1;
  const seenAfterLastUser = lastUserIndex >= 0 && sessionMessages.slice(lastUserIndex + 1).some(m => !!m.characterId);

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/40 dark:bg-zinc-900/60">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="text-base sm:text-lg font-semibold">
              {session.type === 'group' ? 'Group Chat' : 'Individual Chat'}
            </h1>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <Users size={14} />
              <span>{sessionCharacters.length} participant{sessionCharacters.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
        {/* Director Panel Toggle */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowDirector(v => !v)}>
            {showDirector ? <CaretUp size={14} className="mr-1" /> : <CaretDown size={14} className="mr-1" />}
            Director
          </Button>
        </div>
        {/* Participant Avatars */}
        <div className="hidden sm:flex -space-x-2">
          {sessionCharacters.slice(0, 4).map((character) => (
            <Avatar key={character.id} className="w-8 h-8 border-2 border-white shadow-sm">
              <AvatarImage src={character.avatar} alt={character.name} />
              <AvatarFallback className="text-xs">
                {character.name.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          ))}
          {sessionCharacters.length > 4 && (
            <div className="w-8 h-8 bg-zinc-200 dark:bg-zinc-700 rounded-full border-2 border-white flex items-center justify-center text-xs">
              +{sessionCharacters.length - 4}
            </div>
          )}
        </div>
      </div>

      {/* Director Panel Content */}
      {showDirector && (
        <div className="border-b p-3 sm:p-4 bg-white/60 dark:bg-zinc-900/50 text-sm">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-3">
            {sessionCharacters.map((c: any) => {
              const g = hiddenGoals[c.id];
              return (
                <div key={c.id} className="p-3 rounded-lg border bg-white shadow-sm dark:bg-zinc-900/70 space-y-2">
                  <div className="font-medium">{c.name}</div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Priority</span>
                    <select
                      className="px-2 py-1 rounded-md border bg-white dark:bg-zinc-800 text-xs"
                      value={g?.priority || 'medium'}
                      onChange={async (e) => {
                        const pr = (e.target.value as 'low'|'medium'|'high');
                        const text = g?.goal || '';
                        if (!sessionId) return;
                        await updateSessionGoal(sessionId, c.id, text, pr);
                        // Update local state immediately for responsiveness
                        setHiddenGoals(prev => ({ ...prev, [c.id]: { goal: text, priority: pr } }));
                      }}
                    >
                      <option value="low">low</option>
                      <option value="medium">medium</option>
                      <option value="high">high</option>
                    </select>
                  </div>
                  <textarea
                    className="w-full min-h-[80px] text-sm rounded-md border bg-white dark:bg-zinc-800 p-2"
                    placeholder="Enter or edit hidden objective..."
                    defaultValue={g?.goal || ''}
                    onBlur={async (e) => {
                      const text = e.target.value;
                      const pr = (g?.priority as 'low'|'medium'|'high') || 'medium';
                      if (!sessionId) return;
                      await updateSessionGoal(sessionId, c.id, text, pr);
                      setHiddenGoals(prev => ({ ...prev, [c.id]: { goal: text, priority: pr } }));
                    }}
                  />
                  {!g?.goal && (
                    <div className="text-[11px] text-muted-foreground">Tip: click into the box to set a secret objective.</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-3 sm:p-4">
        <div className="space-y-3 sm:space-y-4 max-w-3xl md:max-w-4xl mx-auto">
          {sessionMessages.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <ChatCircle size={32} className="mx-auto mb-4 opacity-50" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            sessionMessages.map((msg: any) => {
              const sender = characters?.find(c => c.id === msg.characterId);
              const isUser = !msg.characterId; // User messages have null characterId
              const isSystem = typeof msg.content === 'string' && msg.content.startsWith('[System] ');
              const img = !isSystem ? parseImageFromContent(String(msg.content || '')) : { isImage: false };

              return (
                <div key={msg.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {!isUser && (
                    <Avatar className="w-8 h-8 flex-shrink-0 shadow-sm">
                      <AvatarImage src={sender?.avatar} alt={sender?.name} />
                      <AvatarFallback className="text-xs">
                        {sender?.name?.slice(0, 2) || '?'}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div className={`group relative max-w-[75%] sm:max-w-[70%] ${isUser ? 'order-first' : ''}`}>
                    {!isUser && sender && !isSystem && (
                      <div className="text-xs text-muted-foreground mb-1">
                        {sender.name}
                      </div>
                    )}

                    {isSystem ? (
                      <div className="rounded-md px-3 py-2 bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-800">
                        <p className="text-xs whitespace-pre-wrap">{msg.content.replace('[System] ', '')}</p>
                      </div>
                    ) : (
                      <div
                        className={`rounded-2xl px-3 py-2 shadow ${
                          isUser
                            ? 'bg-blue-600 text-white dark:bg-blue-500'
                            : 'bg-white border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700'
                        }`}
                        onDoubleClick={() => toggleReaction(msg.id, '❤️')}
                      >
                        {img.isImage && img.src ? (
                          <div className="overflow-hidden rounded-xl mb-1">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img.src} alt={img.caption || 'image'} className="max-h-96 w-full object-cover" />
                          </div>
                        ) : null}
                        {(!img.isImage || (img.caption && img.caption.length > 0)) && (
                          <p className="text-sm whitespace-pre-wrap">{img.isImage ? img.caption : msg.content}</p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-1">
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                        {isUser && msg === sessionMessages[lastUserIndex] && (
                          <span className="ml-2">{seenAfterLastUser ? 'Seen' : 'Delivered'}</span>
                        )}
                      </div>
                      {/* Reactions strip */}
                      {reactions[msg.id] && Object.keys(reactions[msg.id]).length > 0 && (
                        <div className="flex items-center gap-1 text-xs rounded-full px-2 py-0.5 bg-white border border-zinc-200 shadow-sm dark:bg-zinc-800 dark:border-zinc-700">
                          {Object.entries(reactions[msg.id]).map(([emoji, count]) => (
                            <span key={emoji} className="inline-flex items-center gap-1">
                              <span>{emoji}</span>
                              <span className="text-[10px] text-muted-foreground">{count}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quick reaction picker on hover */}
                    {!isSystem && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -right-2 -top-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full shadow px-2 py-0.5 text-sm">
                        {['❤️','😂','👍','😮'].map(e => (
                          <button key={e} className="mx-0.5" onClick={() => toggleReaction(msg.id, e)} aria-label={`React ${e}`}>
                            {e}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className="text-xs">You</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })
          )}
          {/* Typing indicator */}
          {isTyping && sessionCharacters.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pl-10">
              <div className="w-6 h-6 rounded-full bg-white border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 flex items-center justify-center shadow-sm">
                <span className="inline-flex">
                  <span className="w-1 h-1 bg-zinc-400 rounded-full animate-bounce [animation-delay:-.3s] mr-0.5"></span>
                  <span className="w-1 h-1 bg-zinc-400 rounded-full animate-bounce [animation-delay:-.15s] mr-0.5"></span>
                  <span className="w-1 h-1 bg-zinc-400 rounded-full animate-bounce"></span>
                </span>
              </div>
              <span>{sessionCharacters[0].name}{sessionCharacters.length > 1 ? ' and others' : ''} are typing…</span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-3 sm:p-4 border-t bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/40 dark:bg-zinc-900/60">
        <div className="max-w-3xl md:max-w-4xl mx-auto flex gap-2">
          <Input
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isSending}
            className="flex-1 bg-white dark:bg-zinc-800"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || isSending}
            size="sm"
          >
            {isSending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <PaperPlane size={16} />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
