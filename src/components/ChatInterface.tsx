import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCharacters } from '@/hooks/useCharacters';
import { useChat } from '@/hooks/useChat';
import { ArrowLeft, ChatCircle, PaperPlane, Users } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface ChatInterfaceProps {
  sessionId?: string | null;
  onBack?: () => void;
  onStartChat?: (characterId: string) => Promise<void>;
  onStartGroupChat?: (sessionId?: string) => Promise<void>;
}

export function ChatInterface({ sessionId, onBack, onStartChat, onStartGroupChat }: ChatInterfaceProps) {
  const { characters } = useCharacters();
  const { sessions, sendMessage, getSessionMessages } = useChat();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sessionMessages, setSessionMessages] = useState<any[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const session = sessions?.find(s => s.id === sessionId);
  const sessionCharacters = characters?.filter(c => session?.participantIds.includes(c.id)) || [];

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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white/50 backdrop-blur-sm dark:bg-gray-800/50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">
              {session.type === 'group' ? 'Group Chat' : 'Individual Chat'}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users size={14} />
              <span>{sessionCharacters.length} participant{sessionCharacters.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {/* Participant Avatars */}
        <div className="flex -space-x-2">
          {sessionCharacters.slice(0, 4).map((character) => (
            <Avatar key={character.id} className="w-8 h-8 border-2 border-white">
              <AvatarImage src={character.avatar} alt={character.name} />
              <AvatarFallback className="text-xs">
                {character.name.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          ))}
          {sessionCharacters.length > 4 && (
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full border-2 border-white flex items-center justify-center text-xs">
              +{sessionCharacters.length - 4}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-4xl mx-auto">
          {sessionMessages.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <ChatCircle size={32} className="mx-auto mb-4 opacity-50" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            sessionMessages.map((msg: any) => {
              const sender = characters?.find(c => c.id === msg.senderId);
              const isUser = msg.senderId === 'user';

              return (
                <div key={msg.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {!isUser && (
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={sender?.avatar} alt={sender?.name} />
                      <AvatarFallback className="text-xs">
                        {sender?.name?.slice(0, 2) || '?'}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div className={`max-w-[70%] ${isUser ? 'order-first' : ''}`}>
                    {!isUser && sender && (
                      <div className="text-xs text-muted-foreground mb-1">
                        {sender.name}
                      </div>
                    )}

                    <div className={`rounded-lg px-3 py-2 ${
                      isUser
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>

                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
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
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t bg-white/50 backdrop-blur-sm dark:bg-gray-800/50">
        <div className="max-w-4xl mx-auto flex gap-2">
          <Input
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isSending}
            className="flex-1"
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
