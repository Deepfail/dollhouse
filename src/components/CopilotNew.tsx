import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFileStorage } from '@/hooks/useFileStorage';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { QuickAction, useQuickActions } from '@/hooks/useQuickActions';
import { useSceneMode } from '@/hooks/useSceneMode';
import { repositoryStorage } from '@/hooks/useRepositoryStorage';
import { AIService } from '@/lib/aiService';
import { generateCharacterFromPrompt } from '@/lib/characterGenerator';
import { Character, CopilotUpdate } from '@/types';
import {
  Chat,
  CheckCircle as Check,
  House,
  PaperPlaneRight,
  Robot,
  Gear as Settings,
  Sparkle,
  Trash,
  User,
  UsersThree,
  XCircle as X
} from '@phosphor-icons/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface CopilotMessage {
  id: string;
  sender: 'user' | 'copilot';
  content: string;
  timestamp: Date;
  imageData?: string;
}

type StoredHouseConfig = {
  copilotPrompt?: string;
  worldPrompt?: string;
  copilotMaxTokens?: number;
  copilotUseHouseContext?: boolean;
  copilotContextDetail?: 'lite' | 'balanced' | 'detailed';
};

interface CopilotProps {
  onStartChat?: (characterId: string) => void;
  onStartGroupChat?: (sessionId?: string) => void;
  onStartScene?: (sessionId: string) => void;
}

export function CopilotNew({ onStartChat, onStartGroupChat, onStartScene }: CopilotProps = {}) {
  const { house, characters, addCharacter } = useHouseFileStorage();
  const roster = (house.characters && house.characters.length ? house.characters : characters) || [];
  const { quickActions, executeAction } = useQuickActions();
  const { createSceneSession } = useSceneMode();
  const { data: updates, setData: setUpdates } = useFileStorage<CopilotUpdate[]>('copilot-updates.json', []);
  const { data: chatMessages, setData: setChatMessages } = useFileStorage<CopilotMessage[]>('copilot-chat.json', []);
  const { data: forceUpdate } = useFileStorage<number>('settings-force-update.json', 0);
  const [houseConfig, setHouseConfig] = useState<StoredHouseConfig | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'status'>('chat');
  const [pendingCharacterCreation, setPendingCharacterCreation] = useState<{ seed?: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const safeUpdates = updates || [];
  const safeChatMessages = chatMessages || [];

  const effectiveCopilotPrompt = (houseConfig?.copilotPrompt ?? house.copilotPrompt ?? '').trim();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const cfg = await repositoryStorage.get<StoredHouseConfig>('house_config');
        if (active) {
          setHouseConfig(cfg ?? null);
        }
      } catch {
        if (active) {
          setHouseConfig(null);
        }
      }
      if (active) {
        setConfigLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [forceUpdate]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [safeChatMessages, isTyping]);

  // Initialize copilot with welcome message if chat is empty
  useEffect(() => {
    if (!configLoaded) return;
    if (safeChatMessages.length === 0) {
      const welcomeMessage: CopilotMessage = {
        id: `welcome-${Date.now()}`,
        sender: 'copilot',
        content: effectiveCopilotPrompt
          ? effectiveCopilotPrompt
          : "Oh...hey boss! Umm hold on one sec... *fapp fapp fapp fapp fapp* *moans loudly* Oh man...so freaking adorable.. HEY sry boss how can i help boss?! *wipes his hands*",
        timestamp: new Date()
      };
      setChatMessages([welcomeMessage]);
    }
  }, [configLoaded, safeChatMessages.length, effectiveCopilotPrompt, setChatMessages]);

  // Parse natural language commands for character interaction
  const parseNaturalLanguageCommand = (message: string): { type: 'chat' | 'scene' | null, characterId: string | null, context: string } | null => {
    // Patterns for "send [character] to my room" etc. (should launch chat, not scene)
    const sendPatterns = [
      /send\s+([\w\s]+?)\s+(?:to|into)\s+my\s+room/i,
      /bring\s+([\w\s]+?)\s+(?:to|into)\s+my\s+room/i,
      /invite\s+([\w\s]+?)\s+(?:to|into)\s+my\s+room/i,
      /call\s+([\w\s]+?)\s+(?:to|into)\s+my\s+room/i,
      /summon\s+([\w\s]+?)\s+(?:to|into)\s+my\s+room/i,
      /take\s+([\w\s]+?)\s+(?:to|into)\s+my\s+room/i,
      /lead\s+([\w\s]+?)\s+(?:to|into)\s+my\s+room/i,
      /get\s+([\w\s]+?)\s+to\s+come\s+(?:to|into)\s+my\s+room/i,
      /have\s+([\w\s]+?)\s+come\s+(?:to|into)\s+my\s+room/i,
      /(?:tell|ask)\s+([\w\s]+?)\s+to\s+come\s+(?:to|into)\s+my\s+room/i
    ];

    // Check for send/bring to room patterns first (chat commands)
    for (const pattern of sendPatterns) {
      const match = message.match(pattern);
      if (match) {
        const characterName = match[1].trim();
        const character = roster.find(c =>
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
          /with\s+([\w\s]+)/i,
          /([\w\s]+)\s+(?:should|will|can)/i,
          /have\s+([\w\s]+?)\s+/i,
          /make\s+([\w\s]+?)\s+/
        ];

        for (const pattern of characterPatterns) {
          const charMatch = customPrompt.match(pattern);
          if (charMatch) {
            const characterName = charMatch[1].trim();
            const character = roster.find(c =>
              c.name.toLowerCase() === characterName.toLowerCase()
            );
            if (character) {
              characterId = character.id;
              break;
            }
          }
        }
        
        // If no specific character found, use the first available character
        if (!characterId && roster.length > 0) {
          characterId = roster[0].id;
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
      const character = roster.find(c => c.id === characterId);
      if (!character) {
        toast.error('Character not found');
        return;
      }

  let sceneDescription: string;

      if (customPrompt) {
        // Use the custom prompt exactly as specified by the user
        sceneDescription = `Custom scenario: ${customPrompt}\n\nYou are ${character.name} with personality: ${character.personality}. Stay in character and respond naturally to this scenario.`;
        
      } else {
        // Generate an intimate scene
        const timeOfDay = new Date().getHours();
        const timeContext = timeOfDay >= 18 || timeOfDay <= 6 ? 'evening' : 'afternoon';

        sceneDescription = `It's ${timeContext} and you're spending intimate time with ${character.name} in your private space. The atmosphere is warm and inviting, perfect for deep connection.`;
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

  const isCharacterCreationCommand = (message: string): boolean => {
    const lowered = message.toLowerCase();
    const patterns = [
      /create\s+(?:a\s+)?(?:new\s+)?(?:girl|character)/,
      /generate\s+(?:a\s+)?(?:girl|character)/,
      /make\s+(?:me\s+)?(?:a\s+)?(?:girl|character)/,
      /design\s+(?:a\s+)?(?:girl|character)/,
      /build\s+(?:a\s+)?(?:girl|character)/,
      /(add|spawn)\s+(?:a\s+)?(?:girl|character)/
    ];
    return patterns.some((pattern) => pattern.test(lowered));
  };

  const promptForCharacterDetails = (seed: string, history: CopilotMessage[]) => {
    const examples = [
      '"Give me a shy art student who secretly models goth fashion on the side."',
      '"Create a confident club promoter with neon hair and zero patience for posers."',
      '"I want a soft-spoken farm girl who is obsessed with robotics and me."'
    ];

    const promptMessage: CopilotMessage = {
      id: `creation-intro-${Date.now()}`,
      sender: 'copilot',
      content: [
        "Let's craft someone new together!",
        'Tell me the vibe you want: personality, looks, boundaries to respect, favorite outfits—anything important.',
        `Examples you can riff on:
${examples.map((example) => `• ${example}`).join('\n')}`,
        'If you change your mind, just say "cancel".'
      ].join('\n\n'),
      timestamp: new Date()
    };

    setPendingCharacterCreation({ seed });
    setChatMessages([...history, promptMessage]);
    setIsTyping(false);
  };

  const summarizeCharacter = (character: Character): string => {
    const personality = character.personality || character.prompts?.personality || '';
    const description = character.description?.split('\n')[0] || '';
    const likes = (character.progression?.userPreferences?.likes || []).slice(0, 2).join(', ');
    const summaryParts: string[] = [];
    summaryParts.push(`${character.name} is ready.`);
    if (personality) summaryParts.push(`Personality: ${personality}`);
    if (description) summaryParts.push(description);
    if (likes) summaryParts.push(`She lights up for: ${likes}.`);
    summaryParts.push(`Say "Call ${character.name} into my room" when you want her over.`);
    return summaryParts.join('\n');
  };

  const completeCharacterCreation = async (
    userDetails: string,
    history: CopilotMessage[]
  ) => {
    const pendingSeed = pendingCharacterCreation?.seed || '';
    const cancelMatch = /(cancel|never mind|stop)/i;
    if (cancelMatch.test(userDetails)) {
      const cancelMessage: CopilotMessage = {
        id: `creation-cancel-${Date.now()}`,
        sender: 'copilot',
        content: 'No worries, character creation cancelled. Ask anytime when you want to craft someone new.',
        timestamp: new Date()
      };
      setPendingCharacterCreation(null);
      setChatMessages([...history, cancelMessage]);
      setIsTyping(false);
      return;
    }

    const rosterNames = roster.map((char) => char.name).join(', ');
    const combinedRequest = [pendingSeed.trim(), userDetails.trim()].filter(Boolean).join('\n\n');
    const prompt = `User brief for new companion:\n${combinedRequest}\n\nExisting roster (avoid duplicates): ${rosterNames || 'None yet'}`;

    let workingMessage: CopilotMessage | null = null;
    try {
      workingMessage = {
        id: `creation-working-${Date.now()}`,
        sender: 'copilot',
        content: 'Got it! Let me build her profile…',
        timestamp: new Date()
      };
      setChatMessages([...history, workingMessage]);
      const character = await generateCharacterFromPrompt(prompt);

      let added = await addCharacter(character);
      if (!added) {
        character.name = `${character.name} ${Math.floor(10 + Math.random() * 90)}`;
        character.id = `char_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        added = await addCharacter(character);
      }

      if (!added) {
        const failureMessage: CopilotMessage = {
          id: `creation-fail-${Date.now()}`,
          sender: 'copilot',
          content: "I couldn't add her—looks like there's already someone too similar. Maybe tweak the concept and try again?",
          timestamp: new Date()
        };
        setChatMessages([...history, workingMessage, failureMessage]);
        setPendingCharacterCreation(null);
        setIsTyping(false);
        return;
      }

      const summaryMessage: CopilotMessage = {
        id: `creation-summary-${Date.now()}`,
        sender: 'copilot',
        content: summarizeCharacter(character),
        timestamp: new Date()
      };

      setChatMessages([...history, workingMessage, summaryMessage]);
    } catch (error) {
      console.error('Character creation via copilot failed:', error);
      const errorMessage: CopilotMessage = {
        id: `creation-error-${Date.now()}`,
        sender: 'copilot',
        content: 'Something glitched while building her. Double-check your AI settings and we can try again.',
        timestamp: new Date()
      };
      if (workingMessage) {
        setChatMessages([...history, workingMessage, errorMessage]);
      } else {
        setChatMessages([...history, errorMessage]);
      }
    } finally {
      setPendingCharacterCreation(null);
      setIsTyping(false);
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
      if (pendingCharacterCreation) {
        await completeCharacterCreation(userMessage.content, updatedMessages);
        return;
      }

      if (isCharacterCreationCommand(userMessage.content)) {
        promptForCharacterDetails(userMessage.content, updatedMessages);
        return;
      }

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
          const character = roster.find(c => c.id === nlCommand.characterId);
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

      // Generate AI response for general conversation using the dedicated copilot handler
      const historyForModel: { role: 'user' | 'assistant'; content: string }[] = [...updatedMessages]
        .slice(-10)
        .map((message) => ({
          role: message.sender === 'user' ? 'user' : 'assistant',
          content: message.content
        }));

      let currentConfig = houseConfig;
      try {
        const fetchedConfig = await repositoryStorage.get<StoredHouseConfig>('house_config');
        if (fetchedConfig) {
          currentConfig = fetchedConfig;
          setHouseConfig(fetchedConfig);
        }
      } catch {
        // ignore repository load failure and fall back to existing state
      }
      setConfigLoaded(true);

      const copilotPrompt = (currentConfig?.copilotPrompt ?? house.copilotPrompt ?? '').trim();
      const housePrompt = (currentConfig?.worldPrompt ?? house.worldPrompt ?? '').trim();
      const maxTokensSetting = currentConfig?.copilotMaxTokens ?? house.copilotMaxTokens ?? 512;
      const includeContextSetting = currentConfig?.copilotUseHouseContext ?? house.copilotUseHouseContext ?? true;
      const contextDetailSetting = currentConfig?.copilotContextDetail ?? house.copilotContextDetail ?? 'balanced';
      const maxTokens = Math.max(1, Math.min(Math.floor(maxTokensSetting ?? 512), 4000));
      const response = await AIService.copilotRespond({
        threadId: 'copilot-main',
        messages: historyForModel,
        characters: roster,
        copilotPrompt: copilotPrompt || undefined,
        housePrompt: housePrompt || undefined,
        maxTokens,
        includeHouseContext: includeContextSetting,
        contextDetail: contextDetailSetting,
      });
      
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

  const clearAllChats = useCallback(async () => {
    await setChatMessages([]);
    setInputMessage('');
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = 0;
    }
    toast.success('Chat history cleared');
  }, [setChatMessages]);

  const deleteMessage = (messageId: string) => {
    setChatMessages(safeChatMessages.filter(m => m.id !== messageId));
  };

  const renderUpdateIcon = (type: CopilotUpdate['type']) => {
    switch (type) {
      case 'behavior':
        return <User size={14} className="text-blue-400" />;
      case 'need':
        return <House size={14} className="text-green-400" />;
      case 'alert':
        return <Settings size={14} className="text-yellow-400" />;
      case 'suggestion':
        return <Sparkle size={14} className="text-purple-400" />;
      case 'scenario':
        return <Chat size={14} className="text-pink-400" />;
      default:
        return null;
    }
  };

  const markUpdateAsHandled = (updateId: string) => {
    setUpdates(safeUpdates.map(u => 
      u.id === updateId ? { ...u, handled: true } : u
    ));
  };

  const getUnhandledUpdatesCount = () => {
    return safeUpdates.filter(u => !u.handled).length;
  };

  const handleQuickAction = async (action: QuickAction) => {
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
      const statusMessage = `House Status: ${roster.length} characters, Average happiness: ${
        roster.length > 0 
          ? Math.round(roster.reduce((sum, c) => sum + (c.stats?.happiness || 0), 0) / roster.length)
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden border-l border-zinc-800 bg-[#18181b] text-white">
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
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'chat' | 'status')} className="flex flex-1 min-h-0 flex-col overflow-hidden">
        <div className="flex-shrink-0 px-4 pt-4">
          <TabsList className="grid w-full grid-cols-2 rounded-lg bg-zinc-900">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <Chat size={16} />
              Chat
            </TabsTrigger>
            <TabsTrigger value="status" className="flex items-center gap-2">
              <House size={16} />
              Status
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="flex flex-1 min-h-0 flex-col overflow-hidden px-4 pb-4 pt-4">
          {/* Chat Messages */}
          <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
            <div ref={chatScrollRef} className="flex-1 min-h-0 overflow-y-auto">
              <div className="space-y-4 pb-6">
                {safeChatMessages.map(message => (
                  <div
                    key={message.id}
                    className={`flex group ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`relative max-w-[85%] rounded-2xl px-4 py-3 ${
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
                            className="max-w-full rounded-lg"
                            style={{ maxHeight: '200px' }}
                          />
                        </div>
                      )}
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      <p
                        className={`mt-2 text-xs ${
                          message.sender === 'user' ? 'text-blue-200' : 'text-zinc-400'
                        }`}
                      >
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
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 p-0 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                      >
                        <X size={12} />
                      </Button>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl bg-zinc-800 px-4 py-3">
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" />
                        <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: '0.1s' }} />
                        <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t border-zinc-800 pb-4 pt-4">
            {safeChatMessages.length > 0 && (
              <div className="mb-3 flex justify-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void clearAllChats()}
                  className="bg-zinc-900 text-xs text-white hover:bg-zinc-800"
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
                className="flex-1 border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500"
              />
              <Button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isTyping}
                className="bg-blue-600 px-3 hover:bg-blue-700"
              >
                <PaperPlaneRight size={16} />
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="status" className="flex flex-1 min-h-0 flex-col overflow-hidden px-4 pb-4 pt-4">
          {/* House Overview */}
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-3">House Status</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xl font-bold text-blue-400">{roster.length}</div>
                  <div className="text-xs text-zinc-400">Characters</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-green-400">
                    {roster.length > 0 
                      ? Math.round(roster.reduce((sum, c) => sum + (c.stats?.happiness || 0), 0) / roster.length)
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

          <Separator className="-mx-4 mt-4 bg-zinc-800" />

          {/* Recent Updates */}
          <div className="flex flex-1 min-h-0 flex-col pt-4">
            <div className="pb-2">
              <h4 className="font-medium">Recent Updates</h4>
            </div>

            <div className="flex-1 min-h-0">
              <div className="h-full overflow-y-auto space-y-2 pb-4">
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
                        ? roster.find(c => c.id === update.characterId)
                        : null;
                      
                      return (
                        <Card key={update.id} className={`p-3 bg-zinc-900 border-zinc-800 transition-all ${
                          update.handled ? 'opacity-60' : 'border-l-4 border-l-blue-500'
                        }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {renderUpdateIcon(update.type)}
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
            </div>
          </div>

          <Separator className="-mx-4 mt-4 bg-zinc-800" />

          {/* Quick Actions */}
          <div className="pt-4">
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
              {onStartGroupChat && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onStartGroupChat()}
                  className="col-span-2 h-8 justify-center bg-blue-600 text-white hover:bg-blue-500"
                >
                  <UsersThree size={14} className="mr-2" />
                  Start Group Chat
                </Button>
              )}
            </div>
            {quickActions.filter(action => action.enabled).length > 6 && (
              <p className="text-xs text-zinc-500 text-center mt-2">
                +{quickActions.filter(action => action.enabled).length - 6} more actions available
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}