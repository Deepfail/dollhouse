import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useFileStorage } from '@/hooks/useFileStorage';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { fileStorage } from '@/lib/fileStorage';
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
  Plus,
  Eye,
  Gear as Settings,
  User,
  Users,
  Sparkle,
  MagnifyingGlass
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

export function CopilotNew({ onStartChat, onStartGroupChat, onStartScene }: CopilotProps = {}) {
  const { house, characters } = useHouseFileStorage();
  const { quickActions, executeAction } = useQuickActions();
  const { createSession, setActiveSessionId } = useChat();
  const { createSceneSession } = useSceneMode();
  const { data: updates, setData: setUpdates } = useFileStorage<CopilotUpdate[]>('copilot-updates.json', []);
  const { data: chatMessages, setData: setChatMessages } = useFileStorage<CopilotMessage[]>('copilot-chat.json', []);
  const { data: forceUpdate } = useFileStorage<number>('settings-force-update.json', 0);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [activeTab, setActiveTab] = useState('status');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const safeUpdates = updates || [];
  const safeChatMessages = chatMessages || [];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [safeChatMessages, isTyping]);

  // Initialize copilot with welcome message if chat is empty
  useEffect(() => {
    if (safeChatMessages.length === 0) {
      const welcomeMessage: CopilotMessage = {
        id: `welcome-${Date.now()}`,
        sender: 'copilot',
        content: house.copilotPrompt
          ? house.copilotPrompt
          : "Welcome! I'm your house copilot. I can help you create characters, start chats, manage scenes, and assist with anything you need in your virtual house. What would you like to do?",
        timestamp: new Date()
      };
      setChatMessages([welcomeMessage]);
    }
  }, []);

  // Parse natural language commands for character interaction
  const parseNaturalLanguageCommand = (message: string): { type: 'chat' | 'scene' | null, characterId: string | null, context: string } | null => {
    const msg = message.toLowerCase();

    // Patterns for "send [character] to my room" etc. (should launch chat, not scene)
    const sendPatterns = [
      /send\s+(\w+)\s+(?:to|into)\s+my\s+room/i,
      /bring\s+(\w+)\s+(?:to|into)\s+my\s+room/i,
      /invite\s+(\w+)\s+(?:to|into)\s+my\s+room/i,
      /call\s+(\w+)\s+(?:to|into)\s+my\s+room/i,
      /summon\s+(\w+)\s+(?:to|into)\s+my\s+room/i,
      /take\s+(\w+)\s+(?:to|into)\s+my\s+room/i,
      /lead\s+(\w+)\s+(?:to|into)\s+my\s+room/i,
      /get\s+(\w+)\s+to\s+come\s+(?:to|into)\s+my\s+room/i,
      /have\s+(\w+)\s+come\s+(?:to|into)\s+my\s+room/i,
      /(?:tell|ask)\s+(\w+)\s+to\s+come\s+(?:to|into)\s+my\s+room/i
    ];

    // Check for send/bring to room patterns first (chat commands)
    for (const pattern of sendPatterns) {
      const match = message.match(pattern);
      if (match) {
        const characterName = match[1];
        const character = characters?.find(c =>
          c.name.toLowerCase() === characterName.toLowerCase()
        );
        if (character) {
          return {
            type: 'chat',
            characterId: character.id,
            context: `User wants ${character.name} to come to their room via: ${message}`
          };
        }
      }
    }

    // Patterns for custom scene creation
    const scenePatterns = [
      /copilot\s+i\s+want\s+you\s+to\s+(.+)/i,
      /create\s+a\s+scene\s+where\s+(.+)/i,
      /set\s+up\s+a\s+scenario\s+where\s+(.+)/i,
      /i\s+want\s+to\s+roleplay\s+(.+)/i,
      /let's\s+have\s+a\s+scene\s+where\s+(.+)/i
    ];

    // Check for scene creation patterns
    for (const pattern of scenePatterns) {
      const match = message.match(pattern);
      if (match) {
        const customPrompt = match[1];
        
        // Try to find a character mentioned in the prompt
        let characterId: string | null = null;
        const characterPatterns = [
          /with\s+(\w+)/i,
          /(\w+)\s+(?:should|will|can)/i,
          /have\s+(\w+)\s+/i,
          /make\s+(\w+)\s+/i
        ];

        for (const pattern of characterPatterns) {
          const charMatch = customPrompt.match(pattern);
          if (charMatch) {
            const characterName = charMatch[1];
            const character = characters?.find(c =>
              c.name.toLowerCase() === characterName.toLowerCase()
            );
            if (character) {
              characterId = character.id;
              break;
            }
          }
        }
        
        // If no specific character found, use the first available character
        if (!characterId && characters && characters.length > 0) {
          characterId = characters[0].id;
        }
        
        if (characterId) {
          return {
            type: 'scene',
            characterId,
            context: `User wants a custom scene: ${customPrompt}`
          };
        }
      }
    }
    
    return null;
  };

  // Parse image generation commands
  const parseImageGenerationCommand = (message: string): string | null => {
    const imagePatterns = [
      /send\s+me\s+(?:a\s+)?pic(?:ture)?(?:\s+of\s+)?(.+)/i,
      /generate\s+(?:a\s+|an\s+)?(?:pic(?:ture)?|image)(?:\s+of\s+)?(.+)/i,
      /show\s+me\s+(?:a\s+|an\s+)?(?:pic(?:ture)?|image)(?:\s+of\s+)?(.+)/i,
      /create\s+(?:a\s+|an\s+)?(?:pic(?:ture)?|image)(?:\s+of\s+)?(.+)/i,
      /draw\s+(?:a\s+|an\s+)?(?:pic(?:ture)?|image)(?:\s+of\s+)?(.+)/i,
      /make\s+(?:a\s+|an\s+)?(?:pic(?:ture)?|image)(?:\s+of\s+)?(.+)/i,
      /visualize\s+(.+)/i,
      /imagine\s+(.+)/i,
      /picture\s+of\s+(.+)/i,
      /image\s+of\s+(.+)/i,
      /pic\s+of\s+(.+)/i,
      /(?:give\s+me|want)\s+(?:a\s+|an\s+)?(?:pic(?:ture)?|image)(?:\s+of\s+)?(.+)/i
    ];

    for (const pattern of imagePatterns) {
      const match = message.match(pattern);
      if (match && match[1] && match[1].trim()) {
        return match[1].trim();
      }
    }
    return null;
  };

  // Create a custom scene chat session
  const createCustomSceneChat = async (characterId: string, context: string, customPrompt?: string) => {
    try {
      const character = house.characters?.find(c => c.id === characterId);
      if (!character) {
        toast.error('Character not found');
        return;
      }

      let sceneDescription: string;
      let objectives: any[];

      if (customPrompt) {
        // Use the custom prompt exactly as specified by the user
        sceneDescription = `Custom scenario: ${customPrompt}\n\nYou are ${character.name} with personality: ${character.personality}. Stay in character and respond naturally to this scenario.`;
        
        objectives = [{
          characterId: characterId,
          objective: `Role-play as ${character.name} in this custom scenario: ${customPrompt}. Use her actual personality (${character.personality}) and stay completely in character throughout the interaction.`,
          secret: false,
          priority: 'high' as const
        }];
      } else {
        // Generate an intimate scene
        const timeOfDay = new Date().getHours();
        const timeContext = timeOfDay >= 18 || timeOfDay <= 6 ? 'evening' : 'afternoon';

        sceneDescription = `It's ${timeContext} and you're spending intimate time with ${character.name} in your private space. The atmosphere is warm and inviting, perfect for deep connection.`;
        
        objectives = [{
          characterId: characterId,
          objective: `Engage in an intimate ${timeContext} encounter with the user. Be responsive, engaging, and true to your personality (${character.personality}). Create a memorable and special moment.`,
          secret: false,
          priority: 'high' as const
        }];
      }

      // Create a new scene session using the scene mode system
      const sessionId = await createSceneSession([characterId], {
        name: customPrompt ? `Custom scene with ${character.name}` : `Intimate scene with ${character.name}`,
        description: sceneDescription
      });

      if (sessionId) {
        toast.success(customPrompt ? `Created custom scene with ${character.name}` : `Created intimate scene with ${character.name}`);

        // Navigate to the scene view
        if (onStartScene) {
          onStartScene(sessionId);
        }
      } else {
        toast.error('Failed to create scene chat');
      }
    } catch (error) {
      console.error('Error creating custom scene:', error);
      toast.error('Failed to create custom scene');
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: CopilotMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    const updatedMessages = [...safeChatMessages, userMessage];
    setChatMessages(updatedMessages);
    setInputMessage('');
    setIsTyping(true);

    try {
      // Check for image generation requests first
      const imagePrompt = parseImageGenerationCommand(userMessage.content);
      if (imagePrompt) {
        try {
          const imageResult = await AIService.generateImage(imagePrompt);
          if (imageResult) {
            const imageMessage: CopilotMessage = {
              id: `img-${Date.now()}`,
              sender: 'copilot',
              content: `Here's the image you requested: ${imagePrompt}`,
              timestamp: new Date(),
              imageData: imageResult
            };
            setChatMessages([...updatedMessages, imageMessage]);
            setIsTyping(false);
            return;
          }
        } catch (error) {
          console.error('Image generation failed:', error);
          const errorMessage: CopilotMessage = {
            id: `error-${Date.now()}`,
            sender: 'copilot',
            content: `Sorry, I couldn't generate that image. ${error instanceof Error ? error.message : 'Please check your AI settings.'}`,
            timestamp: new Date()
          };
          setChatMessages([...updatedMessages, errorMessage]);
          setIsTyping(false);
          return;
        }
      }

      // Check for natural language commands
      const nlCommand = parseNaturalLanguageCommand(userMessage.content);
      if (nlCommand) {
        if (nlCommand.type === 'chat' && nlCommand.characterId) {
          // Start a chat with the character
          if (onStartChat) {
            onStartChat(nlCommand.characterId);
          }
          const character = house.characters?.find(c => c.id === nlCommand.characterId);
          const confirmMessage: CopilotMessage = {
            id: `confirm-${Date.now()}`,
            sender: 'copilot',
            content: `Starting chat with ${character?.name || 'character'}!`,
            timestamp: new Date()
          };
          setChatMessages([...updatedMessages, confirmMessage]);
          setIsTyping(false);
          return;
        } else if (nlCommand.type === 'scene' && nlCommand.characterId) {
          // Create a custom scene
          await createCustomSceneChat(nlCommand.characterId, nlCommand.context);
          setIsTyping(false);
          return;
        }
      }

      // Generate AI response for general conversation
      const settings = await fileStorage.readFile('house-settings.json') as any || {};
      const copilotPrompt = settings.copilotPrompt || 'You are a helpful assistant for a character simulation game.';
      const housePrompt = settings.housePrompt || 'A virtual house with multiple characters.';
      const conversationHistory = safeChatMessages.slice(-10).map(m => 
        `${m.sender}: ${m.content}`
      ).join('\n');

      const prompt = `${copilotPrompt}

House Context: ${housePrompt}

Characters in house: ${house.characters.map(c => c.name).join(', ')}

Conversation history:
${conversationHistory}

User: ${inputMessage}

Provide a helpful response as the house copilot. You can help with:
- Creating characters and managing their stats
- Starting chats or scenes with characters
- Generating images using natural language
- Managing house settings and rooms
- Giving advice about character interactions

Keep responses under 100 words and be helpful and engaging.`;
      
      const response = await AIService.generateResponse(prompt);
      
      const copilotMessage: CopilotMessage = {
        id: `copilot-${Date.now()}`,
        sender: 'copilot',
        content: response,
        timestamp: new Date()
      };

      setChatMessages([...updatedMessages, copilotMessage]);
    } catch (error) {
      console.error('Error generating response:', error);
      const errorMessage: CopilotMessage = {
        id: `error-${Date.now()}`,
        sender: 'copilot',
        content: 'Sorry, I encountered an error. Please check your AI settings or try again.',
        timestamp: new Date()
      };
      setChatMessages([...updatedMessages, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearAllChats = () => {
    setChatMessages([]);
    toast.success('Chat history cleared');
  };

  const deleteMessage = (messageId: string) => {
    setChatMessages(safeChatMessages.filter(m => m.id !== messageId));
  };

  const markUpdateAsHandled = (updateId: string) => {
    setUpdates(safeUpdates.map(u => 
      u.id === updateId ? { ...u, handled: true } : u
    ));
  };

  const getUnhandledUpdatesCount = () => {
    return safeUpdates.filter(u => !u.handled).length;
  };

  const generateCharacterStatusMessage = (character: any) => {
    const messages = [
      `${character.name} is currently feeling ${character.stats.happiness > 70 ? 'happy' : character.stats.happiness > 40 ? 'content' : 'a bit down'}.`,
      `Energy level: ${character.stats.energy}%`,
      `Relationship level: ${character.stats.love}%`
    ];
    
    if (character.stats.wet > 50) {
      messages.push(`She seems quite excited lately... 💕`);
    }
    
    return messages.join(' ');
  };

  const handleQuickAction = async (action: any) => {
    if (action.label.includes('Create')) {
      // Trigger character creation
      const message = "I'd like to help you create a new character! What kind of character are you looking for?";
      const copilotMessage: CopilotMessage = {
        id: `action-${Date.now()}`,
        sender: 'copilot',
        content: message,
        timestamp: new Date()
      };
      setChatMessages([...safeChatMessages, copilotMessage]);
    } else if (action.label.includes('Status')) {
      // Show house status
      const statusMessage = `House Status: ${house.characters.length} characters, Average happiness: ${
        house.characters.length > 0 
          ? Math.round(house.characters.reduce((sum, c) => sum + (c.stats?.happiness || 0), 0) / house.characters.length)
          : 0
      }%`;
      const copilotMessage: CopilotMessage = {
        id: `status-${Date.now()}`,
        sender: 'copilot',
        content: statusMessage,
        timestamp: new Date()
      };
      setChatMessages([...safeChatMessages, copilotMessage]);
    }
    
    await executeAction(action.id);
  };

  return (
    <div className="h-full flex flex-col bg-[#18181b] text-white border-l border-zinc-800">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <Robot size={20} className="text-white" />
              </div>
              {getUnhandledUpdatesCount() > 0 && (
                <Badge className="absolute -top-1 -right-1 w-4 h-4 p-0 flex items-center justify-center text-xs bg-red-500">
                  {getUnhandledUpdatesCount()}
                </Badge>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-lg">Copilot</h3>
              <p className="text-xs text-zinc-400">Your house assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
        </div>
      </div>

      {/* Tabs for Status and Chat */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mx-4 mt-4 bg-zinc-900 rounded-lg">
          <TabsTrigger value="status" className="flex items-center gap-2">
            <House size={16} />
            Status
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <Chat size={16} />
            Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="flex-1 flex flex-col mt-4 min-h-0">
          {/* House Overview */}
          <div className="p-4 space-y-4">
            <div>
              <h4 className="font-medium mb-3">House Status</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xl font-bold text-blue-400">{house.characters.length}</div>
                  <div className="text-xs text-zinc-400">Characters</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-green-400">
                    {house.characters.length > 0 
                      ? Math.round(house.characters.reduce((sum, c) => sum + (c.stats?.happiness || 0), 0) / house.characters.length)
                      : 0}%
                  </div>
                  <div className="text-xs text-zinc-400">Happiness</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-pink-500">${house.currency || 1000}</div>
                  <div className="text-xs text-zinc-400">Funds</div>
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Recent Updates */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-4 pb-2">
              <h4 className="font-medium">Recent Updates</h4>
            </div>

            <ScrollArea className="flex-1 px-4">
              <div className="space-y-2 pb-4">
                {safeUpdates.length === 0 ? (
                  <Card className="p-4 text-center bg-zinc-900 text-zinc-400 border-zinc-800">
                    <Robot size={24} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">All quiet for now</p>
                    <p className="text-xs">Your characters are behaving... for the moment 😉</p>
                  </Card>
                ) : (
                  safeUpdates
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map(update => {
                      const character = update.characterId
                        ? house.characters.find(c => c.id === update.characterId)
                        : null;
                      
                      return (
                        <Card key={update.id} className={`p-3 bg-zinc-900 border-zinc-800 transition-all ${
                          update.handled ? 'opacity-60' : 'border-l-4 border-l-blue-500'
                        }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {update.type === 'character_status' && <User size={14} className="text-blue-400" />}
                                {update.type === 'house_event' && <House size={14} className="text-green-400" />}
                                {update.type === 'system' && <Settings size={14} className="text-yellow-400" />}
                                <span className="text-sm font-medium">
                                  {character ? character.name : 'House System'}
                                </span>
                                <span className="text-xs text-zinc-500">
                                  {new Date(update.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-sm text-zinc-300">{update.message}</p>
                            </div>
                            {!update.handled && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => markUpdateAsHandled(update.id)}
                                className="w-6 h-6 p-0"
                              >
                                <Check size={12} />
                              </Button>
                            )}
                          </div>
                        </Card>
                      );
                    })
                )}
              </div>
            </ScrollArea>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Quick Actions */}
          <div className="p-4">
            <h4 className="font-medium mb-3">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.filter(action => action.enabled).slice(0, 6).map(action => (
                <Button
                  key={action.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction(action)}
                  className="h-8 text-xs justify-start bg-zinc-900 border-zinc-700 hover:bg-zinc-800"
                >
                  <Sparkle size={12} className="mr-1" />
                  {action.label.length > 15 ? action.label.slice(0, 15) + '...' : action.label}
                </Button>
              ))}
            </div>
            {quickActions.filter(action => action.enabled).length > 6 && (
              <p className="text-xs text-zinc-500 text-center mt-2">
                +{quickActions.filter(action => action.enabled).length - 6} more actions available
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="chat" className="flex-1 flex flex-col mt-4 min-h-0">
          {/* Chat Messages */}
          <div className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 px-4" ref={chatScrollRef}>
              <div className="space-y-4 pb-4">
                {safeChatMessages.map(message => (
                  <div
                    key={message.id}
                    className={`flex group ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 relative ${
                        message.sender === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-800 text-zinc-100'
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
                      <p className={`text-xs mt-2 ${
                        message.sender === 'user' ? 'text-blue-200' : 'text-zinc-400'
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
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-zinc-800 rounded-2xl px-4 py-3 max-w-[85%]">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-zinc-800">
            {safeChatMessages.length > 0 && (
              <div className="mb-3 flex justify-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearAllChats}
                  className="text-xs bg-zinc-900 border-zinc-700 hover:bg-zinc-800"
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
                className="flex-1 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
              />
              <Button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isTyping}
                className="px-3 bg-blue-600 hover:bg-blue-700"
              >
                <PaperPlaneRight size={16} />
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}