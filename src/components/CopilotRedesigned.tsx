import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useSimpleStorage, simpleStorage } from '@/hooks/useSimpleStorage';
import { useHouse } from '@/hooks/useHouse';
import { useQuickActions } from '@/hooks/useQuickActions';
import { useChat } from '@/hooks/useChat';
import { useSceneMode } from '@/hooks/useSceneMode';
import { CopilotUpdate, ChatMessage } from '@/types';
import { AIService } from '@/lib/aiService';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Robot,
  Bell,
  CheckCircle,
  Warning as AlertTriangle,
  Info,
  Heart,
  BatteryMedium as Battery,
  Smiley as Smile,
  Star,
  Clock,
  Key,
  CheckCircle as Check,
  XCircle as X,
  PaperPlaneRight,
  Chat,
  House,
  Bed,
  ChartBar,
  Lightning,
  Shield,
  Gift,
  Trash,
  Archive,
  Notification,
  Minus,
  Plus
} from '@phosphor-icons/react';

interface CopilotMessage {
  id: string;
  sender: 'user' | 'copilot';
  content: string;
  timestamp: Date;
  imageData?: string;
}

interface CopilotProps {
  onStartChat?: (characterId: string) => void;
  onStartGroupChat?: (sessionId?: string) => void;
  onStartScene?: (sessionId: string) => void;
}

export function CopilotRedesigned({ onStartChat, onStartGroupChat, onStartScene }: CopilotProps = {}) {
  const { house } = useHouse();
  const { quickActions, executeAction } = useQuickActions();
  const { createSession, setActiveSessionId } = useChat();
  const { createSceneSession } = useSceneMode();
  const [updates, setUpdates] = useSimpleStorage<CopilotUpdate[]>('copilot-updates', []);
  const [chatMessages, setChatMessages] = useSimpleStorage<CopilotMessage[]>('copilot-chat', []);
  const [forceUpdate] = useSimpleStorage<number>('settings-force-update', 0);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const safeUpdates = updates || [];
  const safeChatMessages = chatMessages || [];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [safeChatMessages, isTyping]);

  // Dynamic message generation functions (like the original)
  const generateArousalMessage = async (character: any) => {
    const settings = simpleStorage.get('house-settings') as any || {};
    const copilotPrompt = settings.copilotPrompt || 'You are a helpful assistant for a character simulation game.';
    const housePrompt = settings.housePrompt || 'A virtual house with multiple characters.';
    const conversationHistory = safeChatMessages.slice(-5).map(m => 
      `${m.sender}: ${m.content}`
    ).join('\n');

    try {
      const prompt = `${copilotPrompt}\n\nHouse Context: ${housePrompt}\n\nRecent conversation:\n${conversationHistory}\n\nCharacter: ${character.name}\nArousal Level: ${character.stats.wet}%\nHappiness: ${character.stats.happiness}%\nRelationship: ${character.stats.love}%\n\nGenerate a brief, suggestive status update about ${character.name}'s current arousal state. Keep it under 50 words and match the tone of the house setting.`;
      
      const response = await AIService.generateResponse(prompt);
      return response.trim();
    } catch (error) {
      console.error('Error generating arousal message:', error);
      return `${character.name} is feeling particularly heated today... 🔥`;
    }
  };

  const clearAllChats = () => {
    setChatMessages([]);
    toast.success('Chat history cleared');
  };

  const deleteMessage = (messageId: string) => {
    setChatMessages(prev => prev.filter(m => m.id !== messageId));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && inputMessage.trim()) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;

    const userMessage: CopilotMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      // Check for image generation commands
      const imagePrompt = parseImageGenerationCommand(inputMessage);
      if (imagePrompt) {
        await generateImageResponse(imagePrompt);
        return;
      }

      // Generate text response
      const settings = simpleStorage.get('house-settings') as any || {};
      const copilotPrompt = settings.copilotPrompt || 'You are a helpful assistant for a character simulation game.';
      const housePrompt = settings.housePrompt || 'A virtual house with multiple characters.';
      const conversationHistory = safeChatMessages.slice(-10).map(m => 
        `${m.sender}: ${m.content}`
      ).join('\n');

      const prompt = `${copilotPrompt}\n\nHouse Context: ${housePrompt}\n\nCharacters in house: ${house.characters.map(c => c.name).join(', ')}\n\nConversation history:\n${conversationHistory}\n\nUser: ${inputMessage}\n\nProvide a helpful response as the house copilot. Keep responses under 100 words.`;
      
      const response = await AIService.generateResponse(prompt);
      
      const copilotMessage: CopilotMessage = {
        id: `msg-${Date.now()}-copilot`,
        sender: 'copilot',
        content: response.trim(),
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, copilotMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to get response');
    } finally {
      setIsTyping(false);
    }
  };

  const parseImageGenerationCommand = (message: string): string | null => {
    const imagePatterns = [
      /(?:send|show|give)\s+me\s+(?:a\s+|an\s+)?(?:pic(?:ture)?|image)(?:\s+of\s+)?(.+)/i,
      /(?:generate|create|make)\s+(?:a\s+|an\s+)?(?:pic(?:ture)?|image)(?:\s+of\s+)?(.+)/i,
      /(?:picture|image|pic)\s+of\s+(.+)/i
    ];

    for (const pattern of imagePatterns) {
      const match = message.match(pattern);
      if (match && match[1]?.trim()) {
        return match[1].trim();
      }
    }
    return null;
  };

  const generateImageResponse = async (prompt: string) => {
    try {
      const imageData = await AIService.generateImage(prompt);
      
      const copilotMessage: CopilotMessage = {
        id: `msg-${Date.now()}-image`,
        sender: 'copilot',
        content: `Here's your image: ${prompt}`,
        timestamp: new Date(),
        imageData: imageData || undefined
      };

      setChatMessages(prev => [...prev, copilotMessage]);
    } catch (error) {
      console.error('Error generating image:', error);
      const errorMessage: CopilotMessage = {
        id: `msg-${Date.now()}-error`,
        sender: 'copilot',
        content: `Sorry, I couldn't generate that image. ${error instanceof Error ? error.message : 'Unknown error occurred.'}`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    }
  };

  const getUnhandledUpdatesCount = () => {
    return safeUpdates.filter(u => !u.handled).length;
  };

  const dismissAllNotifications = () => {
    setUpdates(prev => prev.map(u => ({ ...u, handled: true })));
    setShowNotifications(false);
    toast.success('All notifications dismissed');
  };

  if (isMinimized) {
    return (
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <Button
          onClick={() => setIsMinimized(false)}
          className="relative rounded-full w-14 h-14 bg-primary hover:bg-primary/90 shadow-lg"
        >
          <Robot size={24} />
          {getUnhandledUpdatesCount() > 0 && (
            <Badge className="absolute -top-2 -right-2 w-6 h-6 p-0 flex items-center justify-center">
              {getUnhandledUpdatesCount()}
            </Badge>
          )}
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed bottom-4 right-4 w-96 h-[600px] z-50"
    >
      <Card className="h-full flex flex-col bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-2xl border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Robot size={24} className="text-primary" />
              {getUnhandledUpdatesCount() > 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
            <div>
              <h3 className="font-semibold">Copilot</h3>
              <p className="text-xs text-muted-foreground">Your house assistant</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {getUnhandledUpdatesCount() > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative"
              >
                <Bell size={16} />
                <Badge className="absolute -top-1 -right-1 w-4 h-4 p-0 text-xs">
                  {getUnhandledUpdatesCount()}
                </Badge>
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsMinimized(true)}
            >
              <Minus size={16} />
            </Button>
          </div>
        </div>

        {/* Notifications Panel */}
        <AnimatePresence>
          {showNotifications && getUnhandledUpdatesCount() > 0 && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="border-b bg-orange-50 dark:bg-orange-950/20 overflow-hidden"
            >
              <div className="p-3 space-y-2 max-h-32 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-orange-800 dark:text-orange-200">
                    {getUnhandledUpdatesCount()} Notifications
                  </h4>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={dismissAllNotifications}
                    className="text-xs h-6 px-2"
                  >
                    Dismiss All
                  </Button>
                </div>
                {safeUpdates
                  .filter(u => !u.handled)
                  .slice(0, 3)
                  .map(update => {
                    const character = update.characterId 
                      ? house.characters.find(c => c.id === update.characterId)
                      : null;
                    
                    return (
                      <div key={update.id} className="text-xs p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                        {character && (
                          <Badge variant="outline" className="text-xs mb-1">
                            {character.name}
                          </Badge>
                        )}
                        <p>{update.message}</p>
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Quick Stats */}
          <div className="p-3 bg-gray-50/50 dark:bg-gray-800/50 border-b">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-bold text-primary">
                  {house.characters?.length || 0}
                </div>
                <div className="text-xs text-muted-foreground">Characters</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-500">
                  {house.characters?.length > 0
                    ? Math.round(house.characters.reduce((acc, c) => acc + c.stats.happiness, 0) / house.characters.length)
                    : 0}%
                </div>
                <div className="text-xs text-muted-foreground">Happiness</div>
              </div>
              <div>
                <div className="text-lg font-bold text-pink-500">
                  ${house.currency || 0}
                </div>
                <div className="text-xs text-muted-foreground">Funds</div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {safeChatMessages.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <Robot size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Welcome! I'm your house copilot.</p>
                  <p className="text-xs">Ask me anything about your characters or house.</p>
                </div>
              )}

              {safeChatMessages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex group ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 relative ${
                      message.sender === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-gray-100 dark:bg-gray-800 text-foreground'
                    }`}
                  >
                    {message.imageData && (
                      <div className="mb-2">
                        <img
                          src={message.imageData}
                          alt="Generated image"
                          className="max-w-full h-auto rounded-lg"
                          style={{ maxHeight: '200px' }}
                        />
                      </div>
                    )}
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}>
                      {new Date(message.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                    
                    {/* Delete button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMessage(message.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-full"
                    >
                      <X size={12} />
                    </Button>
                  </div>
                </motion.div>
              ))}

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-2 max-w-[85%]">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t bg-white dark:bg-gray-900">
            {safeChatMessages.length > 0 && (
              <div className="mb-3 flex justify-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearAllChats}
                  className="text-xs"
                >
                  <Trash size={12} className="mr-1" />
                  Clear Chat
                </Button>
              </div>
            )}
            
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your characters, request images, or chat..."
                disabled={isTyping}
                className="flex-1 rounded-full"
              />
              <Button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isTyping}
                size="sm"
                className="rounded-full w-10 h-10 p-0"
              >
                <PaperPlaneRight size={16} />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}