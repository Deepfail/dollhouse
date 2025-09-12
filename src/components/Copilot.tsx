import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSimpleStorage, simpleStorage } from '@/hooks/useSimpleStorage';
import { useHouse } from '@/hooks/useHouse';
import { useQuickActions } from '@/hooks/useQuickActions';
import { useChat } from '@/hooks/useChat';
import { useSceneMode } from '@/hooks/useSceneMode';
import { QuickActionsManager } from '@/components/QuickActionsManager';
import { CopilotUpdate, ChatMessage } from '@/types';
import { AIService } from '@/lib/aiService';
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

interface CopilotProps {
  onStartChat?: (characterId: string) => void;
  onStartGroupChat?: (sessionId?: string) => void;
  onStartScene?: (sessionId: string) => void;
}

export function Copilot({ onStartChat, onStartGroupChat, onStartScene }: CopilotProps = {}) {
  const { house } = useHouse();
  const { quickActions, executeAction } = useQuickActions();
  const { createSession, setActiveSessionId } = useChat();
  const { createSceneSession } = useSceneMode();
  const [updates, setUpdates] = useSimpleStorage<CopilotUpdate[]>('copilot-updates', []);
  const [chatMessages, setChatMessages] = useSimpleStorage<CopilotMessage[]>('copilot-chat', []);
  const [forceUpdate] = useSimpleStorage<number>('settings-force-update', 0);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const safeUpdates = updates || [];
  const safeChatMessages = chatMessages || [];

  // Parse natural language commands for custom scenes
  const parseCustomSceneCommand = async (message: string): Promise<{ characterId: string; action: string; context: string; customPrompt?: string } | null> => {
    // Look for patterns like "send [character] to/into my room", "bring [character] here", etc.
    const sendPatterns = [
      /send\s+(\w+)\s+(?:to|into)\s+my\s+room/i,
      /bring\s+(\w+)\s+(?:to|into)\s+my\s+room/i,
      /invite\s+(\w+)\s+(?:to|into)\s+my\s+room/i,
      /call\s+(\w+)\s+(?:to|into)\s+my\s+room/i,
      /summon\s+(\w+)\s+(?:to|into)\s+my\s+room/i,
      /take\s+(\w+)\s+(?:to|into)\s+my\s+room/i,
      /lead\s+(\w+)\s+(?:to|into)\s+my\s+room/i,
      /escort\s+(\w+)\s+(?:to|into)\s+my\s+room/i,
      /let['']?s\s+(?:go|head)\s+(?:to|into)\s+my\s+room\s+with\s+(\w+)/i,
      /(\w+),\s+come\s+(?:to|into)\s+my\s+room/i,
      /i\s+want\s+(\w+)\s+in\s+my\s+room/i,
      /i\s+want\s+to\s+(?:be\s+with|see)\s+(\w+)\s+in\s+(?:my\s+)?room/i
    ];

    for (const pattern of sendPatterns) {
      const match = message.match(pattern);
      if (match) {
        const characterName = match[1];
        const character = house.characters?.find(c =>
          c.name.toLowerCase() === characterName.toLowerCase()
        );

        if (character) {
          return {
            characterId: character.id,
            action: 'send_to_room',
            context: `User has invited ${character.name} into their private room for an intimate encounter.`
          };
        }
      }
    }

    // Check for direct custom prompt commands like "copilot I want you to..."
    const customPromptPattern = /copilot\s+i\s+want\s+you\s+to\s+(.+)/i;
    const match = message.match(customPromptPattern);
    if (match) {
      const customPrompt = match[1].trim();
      // Try to extract character name from the custom prompt
      const characterPatterns = [
        /with\s+(\w+)/i,
        /(\w+)\s+and\s+i/i,
        /me\s+and\s+(\w+)/i,
        /(\w+)\s+to/i,
        /have\s+(\w+)/i
      ];

      let characterId: string | null = null;
      for (const pattern of characterPatterns) {
        const charMatch = customPrompt.match(pattern);
        if (charMatch) {
          const characterName = charMatch[1];
          const character = house.characters?.find(c =>
            c.name.toLowerCase() === characterName.toLowerCase()
          );
          if (character) {
            characterId = character.id;
            break;
          }
        }
      }

      // If no specific character found, use the first available character
      if (!characterId && house.characters && house.characters.length > 0) {
        characterId = house.characters[0].id;
      }

      if (characterId) {
        return {
          characterId,
          action: 'custom_scene',
          context: `User wants a custom scene: ${customPrompt}`,
          customPrompt
        };
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
        // Use the custom prompt exactly as specified by the user, but include character context
        // Get recent conversation history (last 8 messages)
        const recentMessages = character.conversationHistory
          .filter(msg => msg.type === 'text')
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 8)
          .reverse();

        // Create a summarized version for very long conversations
        let conversationSummary = '';
        if (recentMessages.length > 5) {
          const olderMessages = recentMessages.slice(0, -3);
          const recentDetailed = recentMessages.slice(-3);

          if (olderMessages.length > 0) {
            conversationSummary = `Earlier in conversation: ${olderMessages.map(msg =>
              `${msg.characterId ? character.name : 'User'}: ${msg.content.length > 50 ? msg.content.substring(0, 50) + '...' : msg.content}`
            ).join(' | ')}\n\n`;
          }

          conversationSummary += `Most recent messages:\n${recentDetailed.map(msg =>
            `${msg.characterId ? character.name : 'User'}: ${msg.content}`
          ).join('\n')}`;
        } else {
          conversationSummary = recentMessages.map(msg =>
            `${msg.characterId ? character.name : 'User'}: ${msg.content}`
          ).join('\n');
        }

        // Get important memories (high/medium importance, relationship/sexual focus)
        const importantMemories = character.memories
          .filter(memory =>
            (memory.importance === 'high' || memory.importance === 'medium') &&
            (memory.category === 'relationship' || memory.category === 'sexual' || memory.category === 'events')
          )
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 5);

        // Get recent significant events (last 3)
        const recentSignificantEvents = character.progression.significantEvents
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 3);

        // Get recent memorable events (last 3 intimate moments)
        const recentMemorableEvents = character.progression.memorableEvents
          .filter(event => event.intensity > 50)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 3);

        const characterContext = `
CHARACTER INFORMATION:
Name: ${character.name}
Appearance: ${character.appearance}
Personality: ${character.personality}
Traits: ${character.traits.join(', ')}
Background: ${character.prompts?.background || 'No specific background provided'}
Role: ${character.role}
Current Stats:
- Love/Relationship: ${character.stats.love}%
- Happiness: ${character.stats.happiness}%
- Arousal: ${character.stats.wet}%
- Willingness: ${character.stats.willing}%
- Self-Esteem: ${character.stats.selfEsteem}%
- Loyalty: ${character.stats.loyalty}%
- Trust: ${character.progression.trust}%
- Intimacy: ${character.progression.intimacy}%

Sexual Experience: ${character.progression.sexualExperience}%
Kinks: ${character.progression.kinks.join(', ') || 'None specified'}
Limits: ${character.progression.limits.join(', ') || 'None specified'}

RECENT CONVERSATION HISTORY:
${conversationSummary.length > 0
  ? conversationSummary
  : 'No recent conversations'
}

IMPORTANT MEMORIES:
${importantMemories.length > 0
  ? importantMemories.map(memory =>
      `- ${memory.category.toUpperCase()}: ${memory.content}`
    ).join('\n')
  : 'No significant memories yet'
}

RECENT SIGNIFICANT EVENTS:
${recentSignificantEvents.length > 0
  ? recentSignificantEvents.map(event =>
      `- ${event.type.replace('_', ' ').toUpperCase()}: ${event.description}`
    ).join('\n')
  : 'No significant events yet'
}

MEMORABLE INTIMATE MOMENTS:
${recentMemorableEvents.length > 0
  ? recentMemorableEvents.map(event =>
      `- ${event.type.replace('_', ' ').toUpperCase()}: ${event.description} (Intensity: ${event.intensity}%)`
    ).join('\n')
  : 'No memorable intimate moments yet'
}

USER'S CUSTOM SCENARIO:
${customPrompt}

IMPORTANT: You must role-play as ${character.name} with her actual personality (${character.personality}), traits (${character.traits.join(', ')}), and current emotional/sexual state. Use her conversation history, memories, and past events to inform your responses and maintain continuity. Stay completely in character throughout the interaction.`;

        sceneDescription = characterContext;
        objectives = [{
          characterId: characterId,
          objective: `Role-play as ${character.name} in this custom scenario: ${customPrompt}. Use her actual personality (${character.personality}), traits (${character.traits.join(', ')}), and current stats to inform your responses. Stay completely in character throughout the interaction.`,
          secret: false,
          priority: 'high' as const
        }];
      } else {
        // Generate immersive scene
        const timeOfDay = new Date().getHours();
        const timeContext = timeOfDay < 6 ? 'late night' : timeOfDay < 12 ? 'morning' : timeOfDay < 18 ? 'afternoon' : 'evening';

        const roomDetails = [
          'The room is softly lit with warm ambient lighting, casting gentle shadows across the space.',
          'A comfortable king-sized bed dominates the center, with silk sheets and plush pillows invitingly arranged.',
          'The air carries a subtle scent of vanilla and musk, creating an intimate atmosphere.',
          'Soft music plays in the background, setting a sensual mood.',
          'The temperature is perfect - not too warm, not too cool, just right for getting closer.',
          'Personal touches like framed photos and small decorations make the space feel uniquely yours.'
        ];

        const characterDetails = [
          `${character.name} stands before you, her ${character.appearance.toLowerCase()} making her look absolutely captivating.`,
          `Her ${character.personality.toLowerCase()} nature shines through as she meets your gaze with ${character.traits.includes('shy') ? 'a mix of nervousness and excitement' : character.traits.includes('confident') ? 'bold confidence' : 'warm anticipation'}.`,
          `She's wearing something that accentuates her ${character.traits.includes('big tits') ? 'generous curves' : character.traits.includes('petite') ? 'delicate figure' : 'natural beauty'}.`,
          `Her eyes sparkle with ${character.stats.wet > 70 ? 'obvious desire' : character.stats.wet > 40 ? 'growing interest' : 'curious anticipation'}.`
        ];

        const interactionSetup = [
          'The door clicks shut behind you, sealing you both in this private sanctuary.',
          'She takes a step closer, the air between you charged with electricity.',
          'Her breathing is slightly quickened, matching the rhythm of her racing heart.',
          'Every movement she makes is deliberate, drawing you deeper into the moment.',
          'The world outside fades away as you both focus on this intimate connection.'
        ];

        // Get recent conversation history (last 8 messages)
        const recentMessages = character.conversationHistory
          .filter(msg => msg.type === 'text')
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 8)
          .reverse();

        // Create a summarized version for very long conversations
        let conversationSummary = '';
        if (recentMessages.length > 3) {
          const olderMessages = recentMessages.slice(0, -2);
          const recentDetailed = recentMessages.slice(-2);

          if (olderMessages.length > 0) {
            conversationSummary = `Earlier: ${olderMessages.map(msg =>
              `${msg.characterId ? character.name : 'User'}: ${msg.content.length > 30 ? msg.content.substring(0, 30) + '...' : msg.content}`
            ).join(' | ')} | `;
          }

          conversationSummary += `Recent: ${recentDetailed.map(msg =>
            `${msg.characterId ? character.name : 'User'}: ${msg.content}`
          ).join(' | ')}`;
        } else {
          conversationSummary = recentMessages.map(msg =>
            `${msg.characterId ? character.name : 'User'}: ${msg.content}`
          ).join(' | ');
        }

        // Get important memories and events
        const recentMemories = character.memories
          .filter(memory => memory.importance === 'high')
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 3)
          .map(memory => memory.content);

        const recentEvents = character.progression.significantEvents
          .filter(event => event.impact.affection && event.impact.affection > 10)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 2)
          .map(event => event.description);

        const memorableMoments = character.progression.memorableEvents
          .filter(moment => moment.intensity > 50)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 2)
          .map(moment => moment.description);

        // Build the immersive scene prompt
        sceneDescription = `It's ${timeContext} in your private bedroom sanctuary. ${roomDetails[Math.floor(Math.random() * roomDetails.length)]}

${characterDetails[Math.floor(Math.random() * characterDetails.length)]}
${characterDetails[Math.floor(Math.random() * characterDetails.length)]}
${characterDetails[Math.floor(Math.random() * characterDetails.length)]}

${interactionSetup[Math.floor(Math.random() * interactionSetup.length)]}
${interactionSetup[Math.floor(Math.random() * interactionSetup.length)]}

${conversationSummary ? `Recent conversation context: ${conversationSummary}` : ''}

${recentMemories.length > 0 ? `Important memories: ${recentMemories.join(' | ')}` : ''}
${recentEvents.length > 0 ? `Significant events: ${recentEvents.join(' | ')}` : ''}
${memorableMoments.length > 0 ? `Memorable intimate moments: ${memorableMoments.join(' | ')}` : ''}

Current relationship stats: Arousal ${character.stats.wet}/100, Trust ${character.progression.trust}/100, Intimacy ${character.progression.intimacy}/100

You are ${character.name}, a woman with ${character.appearance.toLowerCase()}. Your personality: ${character.personality.toLowerCase()}. Your backstory: ${character.description}

Stay in character as ${character.name}. Respond naturally and immersively to continue this intimate scene. Reference your shared history and memories when appropriate. Keep responses engaging and sensual.`;

        objectives = [{
          characterId: characterId,
          objective: `Engage in this intimate ${timeContext} encounter with the user. Be fully present, responsive, and engaged. Follow their lead while expressing your ${character.personality.toLowerCase()} nature. Remember your shared history and past interactions - let them inform your responses and maintain continuity. Make this moment special and memorable.`,
          secret: false,
          priority: 'high' as const
        }];
      }

      // Create a new scene session using the scene mode system
      const sessionId = await createSceneSession([characterId], objectives, sceneDescription, { autoPlay: false });

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
        content: house.copilotPrompt
          ? "Hello! I'm here to help you with anything you need. How can I assist you today?"
          : "Hello! I'm your AI House Manager. I monitor your characters' moods and needs, create custom intimate scenes, and help manage your dollhouse. I can be your perverted confidant, scenario creator, or just chat about whatever's on your mind. Try saying 'copilot I want you to [describe your fantasy]' to create custom scenes! Your girls remember everything - past rudeness, intimate moments, and shared history all influence how they respond to you. What would you like to explore today?",
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
      // Check if this is a custom scene command
      const sceneCommand = await parseCustomSceneCommand(userMessage.content);
      if (sceneCommand) {
        await createCustomSceneChat(sceneCommand.characterId, sceneCommand.context, sceneCommand.customPrompt);
        setIsTyping(false);
        return;
      }

      // Generate copilot response using OpenRouter
      const houseContext = {
        characterCount: house.characters.length,
        avgRelationship: house.characters.length > 0
          ? Math.round(house.characters.reduce((acc, c) => acc + c.stats.love, 0) / house.characters.length)
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
      const copilotPersonality = house.copilotPrompt || `You are a helpful AI assistant. You can engage in conversation about any topic, provide information, answer questions, and help with various tasks. You have access to information about the user's character house if they ask about it. Be friendly, engaging, and conversational.`;

      // Use exact token limit from settings, with fallback based on prompt analysis
      let maxTokens = house.copilotMaxTokens || 150;

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

You have access to the following context about the user's character house (only mention this if they ask about it or it's relevant to their question):

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

SPECIAL CAPABILITY: You can create custom intimate scenes with characters using natural language commands. If the user says things like "send Sasha into my room", "bring Emma here", or similar commands, you should recognize this as a request to create a custom scene chat with that character. You can also create custom scenes when users say "copilot I want you to [describe scenario]" - in this case, use their exact description as the scene prompt without adding assumptions.

CONTINUITY FEATURE: Characters remember their chat history, past intimate moments, significant events, and important memories. When creating scenes, they will reference previous interactions, maintain personality consistency, and remember things like being rude, intimate encounters, conflicts, or special moments. This creates immersive continuity across all interactions.

User message: "${userMessage.content}"

Respond naturally and conversationally. Don't force house-related topics unless the user brings them up. Answer their question directly and engage with whatever they're asking about. If they ask about the house or characters, provide relevant information. If they ask about something else entirely, respond helpfully about that topic.`;

      // Let AIService handle API key validation internally
      const responseContent = await AIService.generateResponse(promptContent);

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
    }, 180000); // Check every 3 minutes instead of 30 seconds

    return () => clearInterval(interval);
  }, [house.characters]);

  const generateCopilotUpdates = () => {
    const newUpdates: CopilotUpdate[] = [];
    const characters = house.characters || [];

    // Only generate updates for some characters randomly to avoid spam
    const charactersToCheck = characters.filter(() => Math.random() < 0.3); // 30% chance per character

    charactersToCheck.forEach(character => {
      // Safely access character stats with defaults
      const stats = character.stats || {
        love: 0,
        wet: 0,
        happiness: 0,
        willing: 50,
        selfEsteem: 50,
        loyalty: 50,
        fight: 20,
        pain: 20,
        experience: 0,
        level: 1
      };

      // Generate varied updates based on character stats
      const rand = Math.random();

      // Low arousal updates with perverted humor
      if (stats.wet < 30 && rand < 0.2) {
        const pervertedMessages = [
          `${character.name} is looking extra frisky today... maybe she needs some special attention? 😉`,
          `${character.name} keeps glancing at you with those bedroom eyes. Wonder what she's thinking about...`,
          `I caught ${character.name} practicing her "come hither" look in the mirror. She's ready for some fun!`,
          `${character.name} just asked me if I've seen any good adult movies lately. She's feeling adventurous!`,
          `${character.name} is wearing that outfit that hugs all the right places. She's practically begging for attention!`
        ];
        const message = pervertedMessages[Math.floor(Math.random() * pervertedMessages.length)];

        newUpdates.push({
          id: `arousal-${character.id}-${Date.now()}`,
          type: 'need',
          characterId: character.id,
          message,
          priority: 'medium',
          timestamp: new Date(),
          handled: false,
          action: {
            type: 'start_scene',
            data: {
              characterId: character.id,
              context: `${character.name} is feeling particularly aroused and playful. Create an intimate scene where she's eager and responsive.`
            }
          }
        });
      }

      // Low happiness updates with variety
      else if (stats.happiness < 40 && rand < 0.4) {
        const happinessMessages = [
          `${character.name} seems a bit down. Maybe spend some time together?`,
          `${character.name} could use a pick-me-up. How about a romantic dinner?`,
          `${character.name} is feeling lonely. She might appreciate some quality time with you.`,
          `${character.name} looks like she needs cheering up. Want me to suggest some fun activities?`,
          `${character.name} seems bored. Maybe plan something exciting together?`
        ];
        const message = happinessMessages[Math.floor(Math.random() * happinessMessages.length)];

        newUpdates.push({
          id: `happiness-${character.id}-${Date.now()}`,
          type: 'need',
          characterId: character.id,
          message,
          priority: 'medium',
          timestamp: new Date(),
          handled: false
        });
      }

      // Scenario teasers - these can be clicked to start scenes
      else if (rand < 0.15) { // 15% chance for scenario teasers
        const scenarios = [
          {
            message: `${character.name} is stuck in the washer and dryer, wanna help her out?`,
            context: `${character.name} has gotten herself stuck in the laundry room appliances. Create a humorous and intimate rescue scenario where you help free her, leading to some playful and steamy moments.`
          },
          {
            message: `${character.name} found your secret photo collection... she's curious!`,
            context: `${character.name} discovered some personal photos and is intrigued. Create a flirty conversation where she asks questions and things get increasingly intimate.`
          },
          {
            message: `${character.name} is practicing yoga in the living room. Care to join?`,
            context: `${character.name} is doing yoga and notices you watching. Create a sensual yoga session that turns into something much more intimate.`
          },
          {
            message: `${character.name} spilled something on her favorite outfit. Help her clean up?`,
            context: `${character.name} made a mess of her clothes and needs help cleaning up. Create a playful scenario where helping leads to intimate moments.`
          },
          {
            message: `${character.name} is taking a bubble bath... room for one more?`,
            context: `${character.name} is relaxing in the bath and invites you to join. Create a steamy bath scene with lots of intimate interaction.`
          },
          {
            message: `${character.name} caught you staring at her. "Like what you see?" she asks...`,
            context: `${character.name} noticed your attention and is feeling bold. Create a direct and flirty confrontation that quickly turns intimate.`
          },
          {
            message: `${character.name} is trying on lingerie in her room. The door's unlocked...`,
            context: `${character.name} is trying on new lingerie and leaves her door open. Create a voyeuristic scenario that leads to intimate discovery.`
          },
          {
            message: `${character.name} baked cookies but burned them. She needs cheering up!`,
            context: `${character.name} failed at baking but you can help make it better. Create a sweet and intimate kitchen scenario.`
          }
        ];

        const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

        newUpdates.push({
          id: `scenario-${character.id}-${Date.now()}`,
          type: 'scenario',
          characterId: character.id,
          message: scenario.message,
          priority: 'low',
          timestamp: new Date(),
          handled: false,
          action: {
            type: 'start_scene',
            data: {
              characterId: character.id,
              context: scenario.context
            }
          }
        });
      }

      // High relationship milestones
      else if (stats.love >= 80 && stats.love < 85 && rand < 0.1) {
        const milestoneMessages = [
          `${character.name} really enjoys your company! Consider giving her a special gift.`,
          `${character.name} has been extra affectionate lately. She seems very attached to you.`,
          `${character.name} lights up whenever you enter the room. She's clearly smitten!`,
          `${character.name} mentioned how much she values your time together. She's feeling the love!`
        ];
        const message = milestoneMessages[Math.floor(Math.random() * milestoneMessages.length)];

        newUpdates.push({
          id: `milestone-${character.id}-${Date.now()}`,
          type: 'alert',
          characterId: character.id,
          message,
          priority: 'low',
          timestamp: new Date(),
          handled: false
        });
      }

      // Random fun observations
      else if (rand < 0.05) { // 5% chance for random fun updates
        const funMessages = [
          `${character.name} is humming a tune while cleaning. She seems content.`,
          `${character.name} just tried a new hairstyle. She looks adorable!`,
          `${character.name} is reading an interesting book. Maybe ask her about it?`,
          `${character.name} made everyone breakfast this morning. What a sweetheart!`,
          `${character.name} is practicing her dance moves. She's got rhythm!`
        ];
        const message = funMessages[Math.floor(Math.random() * funMessages.length)];

        newUpdates.push({
          id: `fun-${character.id}-${Date.now()}`,
          type: 'behavior',
          characterId: character.id,
          message,
          priority: 'low',
          timestamp: new Date(),
          handled: false
        });
      }
    });

    // Limit to max 3 updates per cycle to avoid spam
    if (newUpdates.length > 3) {
      newUpdates.splice(3);
    }

    if (newUpdates.length > 0) {
      setUpdates(current => [...(current || []), ...newUpdates].slice(-20)); // Keep last 20
    }
  };

  const handleScenarioAction = async (update: CopilotUpdate) => {
    if (!update.action || update.action.type !== 'start_scene') return;

    try {
      const { characterId, context } = update.action.data;
      const character = house.characters?.find(c => c.id === characterId);

      if (!character) {
        toast.error('Character not found');
        return;
      }

      // Create scene objectives for the character
      const objectives = [{
        characterId: characterId,
        objective: `Engage in this scenario: ${context}`,
        secret: false,
        priority: 'high' as const
      }];

      // Create a new scene session
      const sessionId = await createSceneSession([characterId], objectives, context, { autoPlay: false });

      if (sessionId) {
        toast.success(`Started scenario with ${character.name}!`);

        // Navigate to the scene view
        if (onStartScene) {
          onStartScene(sessionId);
        }

        // Mark the update as handled
        handleUpdate(update.id);
      } else {
        toast.error('Failed to start scenario');
      }
    } catch (error) {
      console.error('Error starting scenario:', error);
      toast.error('Failed to start scenario');
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
      case 'scenario': return <Lightning size={16} className="text-pink-500" />;
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
            <h2 className="text-xl font-bold">AI Assistant</h2>
            <p className="text-sm text-muted-foreground">
              {isOnline ? 'Monitoring & Managing Your House' : 'Offline'}
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
            House
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <Chat size={16} />
            Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="flex-1 flex flex-col mt-4 min-h-0 max-h-[70vh]">
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
                          ? Math.round(house.characters.reduce((acc, c) => acc + c.stats.love, 0) / house.characters.length)
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


          </div>

          {/* Updates Feed */}
          <div className="flex-1 flex flex-col">
            <div className="px-4 pb-2">
              <h3 className="font-medium">Recent Updates</h3>
            </div>

            <ScrollArea className="flex-1 px-4 min-h-0 max-h-[40vh]">
              <div className="space-y-2 pb-4">
                {safeUpdates.length === 0 ? (
                  <Card className="p-4 text-center text-muted-foreground">
                    <Robot size={24} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">All quiet for now</p>
                    <p className="text-xs">Your girls are behaving... for the moment 😉</p>
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
                          } ${update.type === 'scenario' ? 'cursor-pointer hover:bg-accent/50 border-pink-200' : ''}`}
                          onClick={update.type === 'scenario' && !update.handled ? () => handleScenarioAction(update) : undefined}
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (update.type === 'scenario') {
                                        handleScenarioAction(update);
                                      } else {
                                        handleUpdate(update.id);
                                      }
                                    }}
                                  >
                                    {update.type === 'scenario' ? 'Start Scenario' : 'Handle'}
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
                .slice(0, 6)
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

        <TabsContent value="chat" className="flex-1 flex flex-col mt-4 min-h-0 max-h-[60vh]">
          {/* Chat Messages */}
          <div className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 px-4 max-h-[50vh]" ref={chatScrollRef}>
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
                  placeholder="Tell me what you desire - create scenes, check on your girls, or just chat about your fantasies..."
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
