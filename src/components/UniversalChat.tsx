import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useChat } from '@/hooks/useChat';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { logger } from '@/lib/logger';
import { PaperPlaneRight, Users, User, Crown } from '@phosphor-icons/react';
import type { ChatMessage } from '@/types';

interface UniversalChatProps {
  sessionId: string | null;
  onClose?: () => void;
}

export function UniversalChat({ sessionId, onClose }: UniversalChatProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<any>(null);
  
  const { getSessionMessages, sendMessage, sessions } = useChat();
  const { characters } = useHouseFileStorage();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSession, setCurrentSession] = useState<any>(null);

  // Load session and messages
  useEffect(() => {
    if (!sessionId) return;
    
    const loadMessages = async () => {
      try {
        logger.log('🔄 Loading messages for universal chat:', sessionId);
        const msgs = await getSessionMessages(sessionId);
        setMessages(msgs || []);
        
        // Find current session info
        const session = sessions.find(s => s.id === sessionId);
        setCurrentSession(session);
        
        logger.log('📨 Loaded messages:', msgs?.length || 0);
      } catch (e) {
        logger.error('Failed to load messages:', e);
      }
    };
    
    loadMessages();
  }, [sessionId, getSessionMessages, sessions]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!message.trim() || !sessionId || isTyping) return;
    
    const userMessage = message.trim();
    setMessage('');
    setIsTyping(true);
    
    try {
      logger.log('📤 Sending message to universal chat:', sessionId);
      await sendMessage(sessionId, userMessage, 'user');
      
      // Reload messages
      const updatedMessages = await getSessionMessages(sessionId);
      setMessages(updatedMessages || []);
      
    } catch (e) {
      logger.error('Failed to send message:', e);
    } finally {
      setIsTyping(false);
    }
  };

  const getCharacterInfo = (characterId: string | null | undefined) => {
    if (!characterId) return { name: 'User', avatar: null, color: 'bg-blue-500' };
    const char = characters?.find(c => c.id === characterId);
    return {
      name: char?.name || 'Unknown',
      avatar: char?.avatar || null,
      color: 'bg-purple-500' // char?.color || 'bg-purple-500'
    };
  };

  const getSessionTitle = () => {
    if (!currentSession) return 'Chat';
    
    const participantNames = currentSession.participantIds?.map((id: string) => {
      const char = characters?.find(c => c.id === id);
      return char?.name || 'Unknown';
    }).join(', ') || 'Empty';
    
    const typeIcon = currentSession.type === 'group' ? <Users size={16} /> : 
                    currentSession.type === 'scene' ? <Crown size={16} /> : 
                    <User size={16} />;
    
    return (
      <div className="flex items-center gap-2">
        {typeIcon}
        <span className="capitalize">{currentSession.type}</span>
        <span className="text-gray-400">•</span>
        <span className="text-sm">{participantNames}</span>
      </div>
    );
  };

  if (!sessionId) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0f0f0f] text-white">
        <div className="text-center">
          <Users size={48} className="mx-auto mb-4 text-gray-500" />
          <h3 className="text-lg font-semibold mb-2">No Chat Selected</h3>
          <p className="text-gray-400">Ask Ali to start a chat or select an existing one</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#0f0f0f] text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-700 p-4 bg-[#1a1a1a]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-lg font-semibold">
              {getSessionTitle()}
            </div>
            <Badge variant="secondary" className="text-xs">
              {messages.length} messages
            </Badge>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg) => {
            const charInfo = getCharacterInfo(msg.characterId);
            const isUser = !msg.characterId;
            
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={charInfo.avatar || undefined} />
                    <AvatarFallback className={`${charInfo.color} text-white text-xs`}>
                      {charInfo.name[0]}
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div className={`max-w-[70%] ${isUser ? 'order-first' : ''}`}>
                  {!isUser && (
                    <div className="text-xs text-gray-400 mb-1 px-2">
                      {charInfo.name}
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      isUser
                        ? 'bg-blue-600 text-white ml-auto'
                        : 'bg-[#1a1a1a] border border-gray-700'
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap">
                      {msg.content}
                    </div>
                    <div className={`text-xs mt-1 ${isUser ? 'text-blue-200' : 'text-gray-500'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                </div>
                
                {isUser && (
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="bg-blue-500 text-white text-xs">
                      U
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })}
          
          {isTyping && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                <div className="animate-pulse text-xs">...</div>
              </div>
              <div className="bg-[#1a1a1a] border border-gray-700 rounded-2xl px-4 py-2">
                <div className="text-sm text-gray-400">Typing...</div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-gray-700 p-4 bg-[#1a1a1a]">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type your message..."
            className="flex-1 bg-[#0f0f0f] border-gray-600 focus:border-blue-500 text-white"
            disabled={isTyping}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || isTyping}
            className="bg-blue-600 hover:bg-blue-700 px-4"
          >
            <PaperPlaneRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}