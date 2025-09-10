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
import { PaperPlaneTilt as Send, ChatCircle as MessageCircle, Users, Camera, Warning } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatInterfaceProps {
  sessionId: string | null;
  onBack?: () => void;
  onStartChat?: (characterId: string) => void;
  onStartGroupChat?: () => void;
}

export function ChatInterface({ sessionId, onBack, onStartChat, onStartGroupChat }: ChatInterfaceProps) {
  const { sessions, sendMessage, switchToSession, activeSession, setActiveSessionId, clearAllSessions } = useChat();
  const { house } = useHouse();
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use the sessionId if provided, otherwise use the hook's active session
  const currentSession = sessionId ? sessions.find(s => s.id === sessionId) : activeSession;

  // Ensure the hook knows about the sessionId if provided
  useEffect(() => {
    if (sessionId && sessionId !== activeSession?.id) {
      console.log('Setting active session in hook:', sessionId);
      setActiveSessionId(sessionId);
    }
  }, [sessionId, setActiveSessionId]);

  // If we don't have a session, we might be waiting for it to be created
  const isWaitingForSession = sessionId && !currentSession;

  // Debug logging
  console.log('ChatInterface render:', {
    sessionId,
    availableSessions: sessions.map(s => ({ id: s.id.slice(0, 8) + '...', type: s.type, participants: s.participantIds.length })),
    currentSession: currentSession ? { id: currentSession.id.slice(0, 8) + '...', type: currentSession.type, messageCount: currentSession.messages.length } : null,
    isWaitingForSession,
    charactersCount: house.characters?.length || 0,
    aiProvider: house.aiSettings?.provider,
    hasApiKey: !!house.aiSettings?.apiKey
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !currentSession) return;

    await sendMessage(message);
    setMessage('');

    // Simulate typing indicators
    if (currentSession.participantIds.length > 0) {
      const typingCharacters = currentSession.participantIds.slice(0, Math.min(2, currentSession.participantIds.length));
      setIsTyping(typingCharacters);
      
      setTimeout(() => {
        setIsTyping([]);
      }, 2000);
    }
  };

  const getCharacter = (characterId: string) => {
    return house.characters?.find(c => c.id === characterId);
  };

  // Show loading state while waiting for session to sync from KV
  if (isWaitingForSession) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background p-8">
        <Card className="p-8 text-center max-w-md w-full">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <h3 className="text-xl font-semibold">Starting Chat...</h3>
            <p className="text-muted-foreground">
              Setting up your conversation. This should only take a moment.
            </p>
            <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted rounded">
              <strong>Debug Info:</strong><br/>
              Session ID: {sessionId?.slice(0, 12)}...<br/>
              Available Sessions: {sessions.length}<br/>
              Waiting for KV sync...
            </div>
            
            {/* Auto-retry mechanism */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                // Try to find the session again
                const foundSession = sessions.find(s => s.id === sessionId);
                if (foundSession) {
                  setActiveSessionId(sessionId!);
                } else {
                  // Force refresh and try again
                  window.location.reload();
                }
              }}
              className="mt-4"
            >
              Retry Connection
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!currentSession) {
    const provider = house.aiSettings?.provider || 'openrouter';
    const needsApiKey = provider === 'openrouter' && !house.aiSettings?.apiKey;
    const hasCharacters = house.characters && house.characters.length > 0;
    const sparkUnavailable = typeof window === 'undefined' || !window.spark;
    
    return (
      <div className="flex-1 flex items-center justify-center bg-background p-8">
        <Card className="p-8 text-center max-w-md w-full">
          {sparkUnavailable ? (
            <>
              <Warning size={48} className="mx-auto text-yellow-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Spark AI Unavailable</h3>
              <p className="text-muted-foreground mb-4">
                This app requires Spark AI environment to function. Please make sure you're running in a proper Spark environment.
              </p>
              <Button onClick={() => window.location.reload()} variant="default">
                Refresh Page
              </Button>
            </>
          ) : needsApiKey ? (
            <>
              <Warning size={48} className="mx-auto text-yellow-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">API Key Required</h3>
              <p className="text-muted-foreground mb-4">
                You need to configure your OpenRouter API key in House Settings before chatting with characters.
              </p>
              <Button onClick={() => window.location.hash = '#settings'} variant="default">
                Open House Settings
              </Button>
            </>
          ) : !hasCharacters ? (
            <>
              <Warning size={48} className="mx-auto text-yellow-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Characters Found</h3>
              <p className="text-muted-foreground mb-4">
                Create some characters first before starting a chat.
              </p>
            </>
          ) : (
            <>
              <MessageCircle size={48} className="mx-auto text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Start a Conversation</h3>
              <p className="text-muted-foreground mb-6">
                Choose a character to chat with individually or start a group chat.
              </p>
              
              {/* Character Selection */}
              <div className="space-y-3 mb-6">
                <h4 className="text-sm font-medium text-left">Individual Chat</h4>
                <div className="space-y-2">
                  {house.characters?.map(character => (
                    <Button
                      key={character.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => onStartChat?.(character.id)}
                    >
                      <Avatar className="w-6 h-6 mr-3">
                        <AvatarFallback className="text-xs">
                          {character.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{character.name}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {character.role}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Group Chat */}
              {house.characters && house.characters.length > 1 && (
                <>
                  <h4 className="text-sm font-medium text-left mb-3">Group Chat</h4>
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={() => onStartGroupChat?.()}
                  >
                    <Users size={16} className="mr-2" />
                    Start Group Chat ({house.characters.length} characters)
                  </Button>
                </>
              )}

              <div className="text-xs text-muted-foreground mt-6 p-3 bg-muted rounded">
                <div className="mb-3">
                  <strong>Debug Information:</strong><br/>
                  Available characters: {house.characters?.length || 0}<br/>
                  Session ID: {sessionId || 'None'}<br/>
                  Provider: {house.aiSettings?.provider || 'Not set'}<br/>
                  Has API Key: {house.aiSettings?.apiKey ? 'Yes' : 'No'}<br/>
                  Available Sessions: {sessions.length}<br/>
                  Active Session Found: {currentSession ? 'Yes' : 'No'}
                </div>
                
                {/* Debug Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      console.log('=== Manual Test Chat ===');
                      if (house.characters && house.characters.length > 0) {
                        console.log('Starting test chat with first character:', house.characters[0].name);
                        onStartChat?.(house.characters[0].id);
                      } else {
                        console.log('No characters available for test');
                      }
                    }}
                    className="flex-1 text-xs"
                  >
                    🔧 Test Start Chat
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      console.log('=== Force Refresh Sessions ===');
                      // Force trigger a re-render by calling the sessionId check again
                      if (sessionId) {
                        setActiveSessionId(sessionId);
                      }
                    }}
                    className="flex-1 text-xs"
                  >
                    🔄 Refresh
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      console.log('=== Clear All Sessions ===');
                      clearAllSessions();
                    }}
                    className="flex-1 text-xs"
                  >
                    🗑️ Clear Sessions
                  </Button>
                </div>
                
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => {
                      console.log('=== Emergency Test Chat ===');
                      if (house.characters && house.characters.length > 0) {
                        const testCharacter = house.characters[0];
                        console.log('Emergency creating test session for:', testCharacter.name);
                        
                        // Create a session directly bypassing all the complex logic
                        const testSessionId = `test-${Date.now()}`;
                        const testSession = {
                          id: testSessionId,
                          type: 'individual' as const,
                          participantIds: [testCharacter.id],
                          messages: [],
                          active: true,
                          createdAt: new Date(),
                          updatedAt: new Date()
                        };
                        
                        // Try to manually set the session
                        if (typeof window !== 'undefined' && window.spark) {
                          window.spark.kv.set('test-session', testSession).then(() => {
                            console.log('Test session saved to KV');
                            setActiveSessionId(testSessionId);
                            setTimeout(() => window.location.reload(), 500);
                          });
                        } else {
                          console.error('Spark API not available');
                          toast.error('Spark API not available');
                        }
                      }
                    }}
                    className="flex-1 text-xs"
                  >
                    🚨 Emergency Test
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    );
  }

  const participants = currentSession.participantIds
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
              {currentSession.type === 'group' ? (
                <Users size={20} className="text-muted-foreground" />
              ) : (
                <MessageCircle size={20} className="text-muted-foreground" />
              )}
              <h2 className="font-semibold">
                {currentSession.type === 'group' 
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
            {(currentSession.messages || []).map((msg, index) => {
              const character = msg.characterId ? getCharacter(msg.characterId) : null;
              const isUser = !msg.characterId;
              const showAvatar = !isUser && (
                index === 0 || 
                (currentSession.messages && currentSession.messages[index - 1].characterId !== msg.characterId)
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
            placeholder={`Message ${currentSession.type === 'group' ? 'the group' : participants[0]?.name || '...'}`}
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