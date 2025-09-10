import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useKV } from '@github/spark/hooks';
import { useHouse } from '@/hooks/useHouse';
import { useQuickActions } from '@/hooks/useQuickActions';
import { QuickActionsManager } from '@/components/QuickActionsManager';
import { CopilotUpdate } from '@/types';
import { toast } from 'sonner';
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
  Gift
} from '@phosphor-icons/react';

interface CopilotMessage {
  id: string;
  sender: 'user' | 'copilot';
  content: string;
  timestamp: Date;
}

export function Copilot() {
  const { house } = useHouse();
  const { quickActions, executeAction } = useQuickActions();
  const [updates, setUpdates] = useKV<CopilotUpdate[]>('copilot-updates', []);
  const [chatMessages, setChatMessages] = useKV<CopilotMessage[]>('copilot-chat', []);
  const [forceUpdate] = useKV<number>('settings-force-update', 0); // React to settings changes
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Debug logging for API status
  useEffect(() => {
    console.log('=== Copilot API Status Debug ===');
    console.log('House AI Settings:', house.aiSettings);
    console.log('Provider:', house.aiSettings?.provider);
    console.log('Has API Key:', !!house.aiSettings?.apiKey);
    console.log('API Key Value:', house.aiSettings?.apiKey ? `${house.aiSettings.apiKey.slice(0, 8)}...` : 'empty');
    console.log('Model:', house.aiSettings?.model);
    console.log('Force Update Trigger:', forceUpdate);
  }, [house.aiSettings, forceUpdate]);

  // Ensure updates is never undefined
  const safeUpdates = updates || [];
  const safeChatMessages = chatMessages || [];

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [safeChatMessages]);

  // Initialize copilot with welcome message if chat is empty
  useEffect(() => {
    if (safeChatMessages.length === 0) {
      const welcomeMessage: CopilotMessage = {
        id: `welcome-${Date.now()}`,
        sender: 'copilot',
        content: "Hello! I'm your House Manager. I monitor your characters' well-being, help manage your house, and assist with any questions you might have. How can I help you today?",
        timestamp: new Date()
      };
      setChatMessages([welcomeMessage]);
    }
  }, []);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: CopilotMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    // Add user message
    setChatMessages(current => [...(current || []), userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      // Generate copilot response using OpenRouter
      const houseContext = {
        characterCount: house.characters.length,
        avgRelationship: house.characters.length > 0 
          ? Math.round(house.characters.reduce((acc, c) => acc + c.stats.relationship, 0) / house.characters.length)
          : 0,
        avgHappiness: house.characters.length > 0 
          ? Math.round(house.characters.reduce((acc, c) => acc + c.stats.happiness, 0) / house.characters.length)
          : 0,
        avgEnergy: house.characters.length > 0 
          ? Math.round(house.characters.reduce((acc, c) => acc + c.stats.wet, 0) / house.characters.length)
          : 0,
        characters: house.characters.map(c => ({ name: c.name, role: c.role, stats: c.stats })),
        aiProvider: house.aiSettings?.provider,
        hasApiKey: !!house.aiSettings?.apiKey
      };

      // Use the custom copilot prompt from house settings, with fallback
      const copilotPersonality = house.copilotPrompt || `You are a helpful House Manager copilot for a character creator house application. You monitor characters, provide status updates, and assist users with managing their virtual house and characters.`;

      // Use exact token limit from settings, with fallback based on prompt analysis
      let maxTokens = house.copilotMaxTokens || 100;
      
      // If no custom limit is set, try to infer from prompt
      if (!house.copilotMaxTokens) {
        const promptLower = copilotPersonality.toLowerCase();
        if (promptLower.includes('2-3 sentences') || promptLower.includes('brief') || promptLower.includes('short')) {
          maxTokens = 75;
        } else if (promptLower.includes('1 sentence') || promptLower.includes('very brief')) {
          maxTokens = 50;
        } else if (promptLower.includes('detailed') || promptLower.includes('long') || promptLower.includes('comprehensive')) {
          maxTokens = 300;
        } else if (promptLower.includes('paragraph')) {
          maxTokens = 150;
        }
      }
      
      const promptContent = `${copilotPersonality}

Current house status:
- ${houseContext.characterCount} characters
- Average relationship: ${houseContext.avgRelationship}%
- Average happiness: ${houseContext.avgHappiness}%  
- Average energy: ${houseContext.avgEnergy}%
- AI Provider: ${houseContext.aiProvider || 'openrouter'}
- API Key configured: ${houseContext.hasApiKey ? 'Yes' : 'No'}
- World Setting: ${house.worldPrompt || 'Default character house setting'}

Characters: ${JSON.stringify(houseContext.characters)}

Recent updates: ${JSON.stringify(safeUpdates.slice(-3))}

User message: "${userMessage.content}"

Respond according to your personality and role as defined above. Be helpful and stay in character. KEEP IT BRIEF AND WITHIN THE TOKEN LIMIT.`;

      const apiKey = house.aiSettings?.apiKey;
      if (!apiKey) {
        throw new Error('OpenRouter API key not configured');
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Character Creator House'
        },
        body: JSON.stringify({
          model: house.aiSettings.model || 'deepseek/deepseek-chat-v3.1',
          messages: [
            {
              role: 'user',
              content: promptContent
            }
          ],
          temperature: 0.7,
          max_tokens: maxTokens
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const data = await response.json();
      const responseContent = data.choices[0]?.message?.content;

      if (!responseContent) {
        throw new Error('Empty response from OpenRouter');
      }

      const copilotMessage: CopilotMessage = {
        id: `copilot-${Date.now()}`,
        sender: 'copilot',
        content: responseContent,
        timestamp: new Date()
      };

      setChatMessages(current => [...(current || []), copilotMessage]);
    } catch (error) {
      console.error('Error generating copilot response:', error);
      const errorMessage: CopilotMessage = {
        id: `error-${Date.now()}`,
        sender: 'copilot',
        content: "I apologize, but I'm having trouble processing your message right now. Please try again or check your AI settings.",
        timestamp: new Date()
      };
      setChatMessages(current => [...(current || []), errorMessage]);
      toast.error('Failed to get copilot response');
    } finally {
      setIsTyping(false);
    }
  };

  const getIconComponent = (iconName: string) => {
    const iconMap: Record<string, any> = {
      House,
      Bed,
      Heart,
      ChartBar,
      Star,
      Lightning,
      Shield,
      Gift
    };
    return iconMap[iconName] || Star;
  };

  const handleQuickAction = async (actionId: string) => {
    try {
      await executeAction(actionId);
    } catch (error) {
      console.error('Error executing quick action:', error);
      toast.error('Failed to execute quick action');
    }
  };
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  // Simulate copilot monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      generateCopilotUpdates();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [house.characters]);

  const generateCopilotUpdates = () => {
    const newUpdates: CopilotUpdate[] = [];

    house.characters.forEach(character => {
      // Safely access character stats with defaults
      const stats = character.stats || {
        relationship: 0,
        wet: 0,
        happiness: 0,
        experience: 0,
        level: 1
      };

      // Check for low stats
      if (stats.wet < 30) {
        newUpdates.push({
          id: `arousal-${character.id}-${Date.now()}`,
          type: 'need',
          characterId: character.id,
          message: `${character.name} seems less aroused and could use some stimulation.`,
          priority: 'medium',
          timestamp: new Date(),
          handled: false
        });
      }

      if (stats.happiness < 40) {
        newUpdates.push({
          id: `happiness-${character.id}-${Date.now()}`,
          type: 'need',
          characterId: character.id,
          message: `${character.name} seems a bit down. Maybe spend some time together?`,
          priority: 'medium',
          timestamp: new Date(),
          handled: false
        });
      }

      // Check for high relationship milestones
      if (stats.relationship >= 80 && stats.relationship < 85) {
        newUpdates.push({
          id: `milestone-${character.id}-${Date.now()}`,
          type: 'alert',
          characterId: character.id,
          message: `${character.name} really enjoys your company! Consider giving them a special gift.`,
          priority: 'low',
          timestamp: new Date(),
          handled: false
        });
      }
    });

    if (newUpdates.length > 0) {
      setUpdates(current => [...(current || []), ...newUpdates].slice(-20)); // Keep last 20
    }
  };

  const handleUpdate = (updateId: string) => {
    setUpdates(current =>
      (current || []).map(update =>
        update.id === updateId ? { ...update, handled: true } : update
      )
    );
  };

  const clearAllUpdates = () => {
    setUpdates([]);
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle size={16} className="text-red-500" />;
      case 'medium': return <Info size={16} className="text-yellow-500" />;
      default: return <CheckCircle size={16} className="text-blue-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'behavior': return <Star size={16} className="text-purple-500" />;
      case 'need': return <Heart size={16} className="text-red-500" />;
      case 'alert': return <Bell size={16} className="text-yellow-500" />;
      default: return <Info size={16} className="text-blue-500" />;
    }
  };

  const unhandledUpdates = safeUpdates.filter(u => !u.handled);

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <Robot size={24} className="text-accent" />
            {isOnline && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-card"></div>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold">House Manager</h2>
            <p className="text-sm text-muted-foreground">
              {isOnline ? 'Online & Monitoring' : 'Offline'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={unhandledUpdates.length > 0 ? 'destructive' : 'secondary'}>
            {unhandledUpdates.length} pending
          </Badge>
          {unhandledUpdates.length > 0 && (
            <Button size="sm" variant="ghost" onClick={clearAllUpdates}>
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Tabs for Status and Chat */}
      <Tabs defaultValue="status" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mx-6 mt-4">
          <TabsTrigger value="status" className="flex items-center gap-2">
            <House size={16} />
            Status
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <Chat size={16} />
            Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="flex-1 flex flex-col mt-4">
          {/* House Overview */}
          <div className="p-4 space-y-4">
            <div>
              <h3 className="font-medium mb-3">House Status</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <Heart size={16} className="text-red-500" />
                    <div>
                      <p className="font-medium">
                        {house.characters.length > 0 
                          ? Math.round(house.characters.reduce((acc, c) => acc + c.stats.relationship, 0) / house.characters.length)
                          : 0}%
                      </p>
                      <p className="text-xs text-muted-foreground">Avg Relationship</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <Smile size={16} className="text-yellow-500" />
                    <div>
                      <p className="font-medium">
                        {house.characters.length > 0 
                          ? Math.round(house.characters.reduce((acc, c) => acc + c.stats.happiness, 0) / house.characters.length)
                          : 0}%
                      </p>
                      <p className="text-xs text-muted-foreground">Avg Happiness</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <Battery size={16} className="text-blue-500" />
                    <div>
                      <p className="font-medium">
                        {house.characters.length > 0 
                          ? Math.round(house.characters.reduce((acc, c) => acc + c.stats.wet, 0) / house.characters.length)
                          : 0}%
                      </p>
                      <p className="text-xs text-muted-foreground">Avg Arousal</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-purple-500" />
                    <div>
                      <p className="font-medium">{house.characters.filter(c => 
                        c.lastInteraction && 
                        Date.now() - new Date(c.lastInteraction).getTime() < 24 * 60 * 60 * 1000
                      ).length}</p>
                      <p className="text-xs text-muted-foreground">Active Today</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* API Status */}
            <div>
              <h3 className="font-medium mb-3">AI Service Status</h3>
              <Card className="p-3">
                <div className="flex items-center gap-2">
                  {house.aiSettings?.provider === 'openrouter' ? (
                    house.aiSettings?.apiKey && house.aiSettings.apiKey.length > 0 ? (
                      <>
                        <Check size={16} className="text-green-500" />
                        <div>
                          <p className="font-medium text-green-600">OpenRouter Connected</p>
                          <p className="text-xs text-muted-foreground">
                            Model: {house.aiSettings.model}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Key: {house.aiSettings.apiKey.slice(0, 8)}... ({house.aiSettings.apiKey.length} chars)
                          </p>
                          <p className="text-xs text-green-500">
                            Update #{forceUpdate || 0}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <X size={16} className="text-red-500" />
                        <div>
                          <p className="font-medium text-red-600">API Key Required</p>
                          <p className="text-xs text-muted-foreground">
                            Configure in House Settings → API tab
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Provider: {house.aiSettings?.provider || 'none'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Key Status: {house.aiSettings?.apiKey ? `${house.aiSettings.apiKey.length} chars` : 'empty'}
                          </p>
                        </div>
                      </>
                    )
                  ) : (
                    <>
                      <Check size={16} className="text-green-500" />
                      <div>
                        <p className="font-medium text-green-600">Spark AI Ready</p>
                        <p className="text-xs text-muted-foreground">
                          Model: {house.aiSettings?.model || 'gpt-4o'}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            </div>
          </div>

          {/* Updates Feed */}
          <div className="flex-1 flex flex-col">
            <div className="px-4 pb-2">
              <h3 className="font-medium">Recent Updates</h3>
            </div>
            
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-2 pb-4">
                {safeUpdates.length === 0 ? (
                  <Card className="p-4 text-center text-muted-foreground">
                    <Robot size={24} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">All quiet for now</p>
                    <p className="text-xs">I'll keep an eye on things!</p>
                  </Card>
                ) : (
                  safeUpdates
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map(update => {
                      const character = update.characterId 
                        ? house.characters.find(c => c.id === update.characterId)
                        : null;

                      return (
                        <Card
                          key={update.id}
                          className={`p-3 ${update.handled ? 'opacity-60' : ''} ${
                            update.priority === 'high' ? 'border-red-200' : 
                            update.priority === 'medium' ? 'border-yellow-200' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              {getTypeIcon(update.type)}
                            </div>
                            
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                {character && (
                                  <Badge variant="outline" className="text-xs">
                                    {character.name}
                                  </Badge>
                                )}
                                {getPriorityIcon(update.priority)}
                              </div>
                              
                              <p className="text-sm">{update.message}</p>
                              
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                  {new Date(update.timestamp).toLocaleTimeString()}
                                </span>
                                
                                {!update.handled && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => handleUpdate(update.id)}
                                  >
                                    Handle
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Quick Actions */}
          <div className="p-4 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">Quick Actions</h3>
              <QuickActionsManager />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {quickActions
                .filter(action => action.enabled)
                .slice(0, 6) // Show max 6 actions in the grid
                .map(action => {
                  const IconComponent = getIconComponent(action.icon);
                  return (
                    <Button
                      key={action.id}
                      size="sm"
                      variant="outline"
                      className="text-xs h-auto py-2 flex flex-col gap-1"
                      onClick={() => handleQuickAction(action.id)}
                    >
                      <IconComponent size={16} />
                      <span className="text-xs leading-tight">{action.label}</span>
                    </Button>
                  );
                })}
            </div>
            
            {quickActions.filter(action => action.enabled).length > 6 && (
              <p className="text-xs text-muted-foreground text-center">
                +{quickActions.filter(action => action.enabled).length - 6} more actions available
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="chat" className="flex-1 flex flex-col mt-4">
          {/* Chat Messages */}
          <div className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 px-4" ref={chatScrollRef}>
              <div className="space-y-4 pb-4">
                {safeChatMessages.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.sender === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-muted text-muted-foreground rounded-lg p-3 max-w-[80%]">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Chat Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about your house or characters..."
                  disabled={isTyping}
                  className="flex-1"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isTyping}
                  size="sm"
                  className="flex-shrink-0"
                >
                  <PaperPlaneRight size={16} />
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}