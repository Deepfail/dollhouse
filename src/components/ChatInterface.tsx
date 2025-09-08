import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChat } from '@/hooks/useChat';
import { useHouse } from '@/hooks/useHouse';
import { ChatMessage } from '@/types';
import { Send, MessageCircle, Users, Camera } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatInterfaceProps {
  sessionId: string | null;
}

export function ChatInterface({ sessionId }: ChatInterfaceProps) {
  const { activeSession, sendMessage } = useChat();
  const { house } = useHouse();
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !activeSession) return;

    await sendMessage(message);
    setMessage('');

    // Simulate typing indicators
    if (activeSession.participantIds.length > 0) {
      const typingCharacters = activeSession.participantIds.slice(0, Math.min(2, activeSession.participantIds.length));
      setIsTyping(typingCharacters);
      
      setTimeout(() => {
        setIsTyping([]);
      }, 2000);
    }
  };

  const getCharacter = (characterId: string) => {
    return house.characters.find(c => c.id === characterId);
  };

  if (!activeSession) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <Card className="p-8 text-center max-w-md">
          <MessageCircle size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Active Chat</h3>
          <p className="text-muted-foreground mb-4">
            Select a character or start a group chat to begin conversation.
          </p>
        </Card>
      </div>
    );
  }

  const participants = activeSession.participantIds
    .map(id => getCharacter(id))
    .filter(Boolean);

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Chat Header */}
      <div className="border-b border-border p-4 bg-card">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {participants.slice(0, 3).map((character, index) => (
              <Avatar key={character!.id} className={`border-2 border-card ${index > 0 ? 'ml-2' : ''}`}>
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {character!.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {activeSession.type === 'group' ? (
                <Users size={20} className="text-muted-foreground" />
              ) : (
                <MessageCircle size={20} className="text-muted-foreground" />
              )}
              <h2 className="font-semibold">
                {activeSession.type === 'group' 
                  ? `Group Chat (${participants.length})`
                  : participants[0]?.name || 'Chat'
                }
              </h2>
            </div>
            
            <div className="flex items-center gap-2 mt-1">
              {participants.map(character => (
                <Badge key={character!.id} variant="secondary" className="text-xs">
                  {character!.name}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost">
              <Camera size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {activeSession.messages.map((msg, index) => {
              const character = msg.characterId ? getCharacter(msg.characterId) : null;
              const isUser = !msg.characterId;
              const showAvatar = !isUser && (
                index === 0 || 
                activeSession.messages[index - 1].characterId !== msg.characterId
              );

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="flex-shrink-0">
                      {showAvatar ? (
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                            {character?.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-8 h-8" />
                      )}
                    </div>
                  )}
                  
                  <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[70%]`}>
                    {!isUser && showAvatar && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{character?.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.timestamp).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                    )}
                    
                    <div className={`rounded-2xl px-4 py-2 ${
                      isUser 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-card border border-border'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    
                    {isUser && (
                      <span className="text-xs text-muted-foreground mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Typing Indicators */}
          <AnimatePresence>
            {isTyping.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex gap-3"
              >
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                    ...
                  </AvatarFallback>
                </Avatar>
                <div className="bg-card border border-border rounded-2xl px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {isTyping.length === 1 
                        ? `${getCharacter(isTyping[0])?.name} is typing...`
                        : 'Multiple people are typing...'
                      }
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="border-t border-border p-4 bg-card">
        <form onSubmit={handleSendMessage} className="flex gap-3">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Message ${activeSession.type === 'group' ? 'the group' : participants[0]?.name || '...'}`}
            className="flex-1"
            autoFocus
          />
          <Button type="submit" disabled={!message.trim()}>
            <Send size={16} />
          </Button>
        </form>
      </div>
    </div>
  );
}