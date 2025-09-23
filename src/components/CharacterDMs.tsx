import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { logger } from '@/lib/logger';
import { getCharacterDMs } from '@/storage/adapters';
import { ChatCircle, PaperPlane } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface DMConversation {
  id: string;
  character_id: string;
  last_message: string;
  last_message_at: number;
  unread_count: number;
  created_at: number;
}

interface CharacterDMsProps {
  characterId: string;
}

export function CharacterDMs({ characterId }: CharacterDMsProps) {
  const { characters } = useHouseFileStorage();
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<DMConversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const character = characters?.find((c: any) => c.id === characterId);

  useEffect(() => {
    loadConversations();
  }, [characterId]);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const dms = await getCharacterDMs(characterId);
      setConversations(dms);
      
      // Auto-select first conversation if exists
      if (dms.length > 0) {
        setActiveConversation(dms[0]);
      }
    } catch (error) {
  logger.error('Failed to load DMs:', error);
      toast.error('Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversation) return;
    
    try {
      // TODO: Implement actual message sending with new storage
  logger.log('Sending message:', newMessage);
      
      // Update UI optimistically
      setActiveConversation(prev => prev ? {
        ...prev,
        last_message: newMessage.trim(),
        last_message_at: Date.now()
      } : null);
      
      setNewMessage('');
      toast.success('Message sent!');
    } catch (error) {
  logger.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {conversations.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <ChatCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No conversations yet</p>
            <p className="text-sm text-muted-foreground">Start chatting with {character?.name}</p>
            <Button 
              className="mt-4" 
              onClick={() => {
                // TODO: Start new conversation
                toast.info('Direct messaging coming soon!');
              }}
            >
              Start Conversation
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Conversation List */}
          <div className="border-b">
            <ScrollArea className="h-32">
              <div className="p-4 space-y-2">
                {conversations.map((conv) => (
                  <Card 
                    key={conv.id}
                    className={`p-3 cursor-pointer transition-colors hover:bg-accent ${
                      activeConversation?.id === conv.id ? 'bg-accent' : ''
                    }`}
                    onClick={() => setActiveConversation(conv)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={character?.avatar} alt={character?.name} />
                        <AvatarFallback>
                          {character?.name?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{character?.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(conv.last_message_at)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.last_message}
                        </p>
                      </div>
                      {conv.unread_count > 0 && (
                        <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-xs text-primary-foreground">
                            {conv.unread_count}
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Active Conversation */}
          {activeConversation && (
            <>
              {/* Messages Area */}
              <div className="flex-1 p-4">
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    <div className="text-center text-sm text-muted-foreground">
                      Conversation with {character?.name}
                    </div>
                    
                    {/* Sample message */}
                    <div className="flex gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={character?.avatar} alt={character?.name} />
                        <AvatarFallback>
                          {character?.name?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-muted rounded-lg p-3 max-w-xs">
                          <p className="text-sm">{activeConversation.last_message}</p>
                        </div>
                        <span className="text-xs text-muted-foreground mt-1 block">
                          {formatTime(activeConversation.last_message_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </div>

              {/* Message Input */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Message ${character?.name}...`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    size="icon"
                  >
                    <PaperPlane className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}