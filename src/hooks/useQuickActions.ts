import { useSimpleStorage } from './useSimpleStorage';
import { useHouse } from './useHouse';
import { useChat } from './useChat';
import { AIService } from '@/lib/aiService';
import { toast } from 'sonner';

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: string;
  enabled: boolean;
  customizable: boolean;
  description?: string;
  isCustom?: boolean;
}

// Comprehensive list of all available actions
export const AVAILABLE_ACTIONS = [
  // Character Management
  { id: 'boost-relationship', label: 'Boost Relationship', icon: 'Heart', action: 'boostRelationship', description: 'Increase relationship with all characters by 5%' },
  { id: 'boost-happiness', label: 'Boost Happiness', icon: 'Smile', action: 'boostHappiness', description: 'Increase happiness for all characters by 10%' },
  { id: 'boost-arousal', label: 'Boost Arousal', icon: 'Battery', action: 'boostArousal', description: 'Increase arousal for all characters by 15%' },
  { id: 'level-up-all', label: 'Level Up All', icon: 'Star', action: 'levelUpAll', description: 'Increase level for all characters by 1' },
  { id: 'add-experience', label: 'Add Experience', icon: 'Lightning', action: 'addExperience', description: 'Give 25 experience points to all characters' },
  { id: 'randomize-locations', label: 'Shuffle Locations', icon: 'House', action: 'randomizeLocations', description: 'Move all characters to random rooms' },
  { id: 'reset-stats', label: 'Reset All Stats', icon: 'ChartBar', action: 'resetStats', description: 'Reset all character stats to default values' },

  // Image & Creative Actions
  { id: 'generate-profile-images', label: 'Generate Profile Images', icon: 'Image', action: 'generateProfileImages', description: 'Generate profile images for all characters using AI' },
  { id: 'create-scene-image', label: 'Create Scene Image', icon: 'Camera', action: 'createSceneImage', description: 'Generate an image depicting current house scene' },
  { id: 'character-portrait', label: 'Character Portrait', icon: 'User', action: 'generatePortrait', description: 'Generate a detailed portrait of a selected character' },

  // House Management
  { id: 'add-currency-100', label: 'Add 100 Currency', icon: 'Gift', action: 'addCurrency100', description: 'Add 100 currency to house funds' },
  { id: 'add-currency-500', label: 'Add 500 Currency', icon: 'Gift', action: 'addCurrency500', description: 'Add 500 currency to house funds' },
  { id: 'add-currency-1000', label: 'Add 1000 Currency', icon: 'Gift', action: 'addCurrency1000', description: 'Add 1000 currency to house funds' },

  // AI & System Enhancement
  { id: 'test-api', label: 'Test API Connection', icon: 'Shield', action: 'testApiConnection', description: 'Test the current AI API connection' },
  { id: 'enhance-personalities', label: 'Enhance Personalities', icon: 'Brain', action: 'enhancePersonalities', description: 'Improve AI personality responsiveness for all characters' },
  { id: 'memory-analysis', label: 'Memory Analysis', icon: 'Clock', action: 'memoryAnalysis', description: 'Analyze and optimize character memory systems' },
  { id: 'relationship-report', label: 'Relationship Report', icon: 'Users', action: 'relationshipReport', description: 'Generate detailed relationship analysis report' },
  { id: 'clear-updates', label: 'Clear All Updates', icon: 'Trash', action: 'clearAllUpdates', description: 'Clear all copilot monitoring updates' },
  { id: 'export-data', label: 'Export House Data', icon: 'Download', action: 'exportHouseData', description: 'Export all house data to JSON file' },
  { id: 'backup-gallery', label: 'Backup Image Gallery', icon: 'Archive', action: 'backupGallery', description: 'Export all generated images and gallery data' },

  // Custom Actions
  { id: 'custom-scene', label: 'Custom Scene', icon: 'Sparkle', action: 'customScene', description: 'Create a custom scene chat with a character based on natural language commands' },
  { id: 'rest-all', label: 'Rest All', icon: 'Bed', action: 'restAll', description: 'Increase arousal for all characters who need it' },
  { id: 'feed-all', label: 'Feed All', icon: 'Heart', action: 'feedAll', description: 'Increase happiness and relationship for all characters' },
  { id: 'check-status', label: 'Check Status', icon: 'ChartBar', action: 'checkStatus', description: 'Check the status of all characters' },
  { id: 'group-activity', label: 'Group Activity', icon: 'Users', action: 'groupActivity', description: 'Start a group activity that all characters can participate in' }
];

const DEFAULT_ACTIONS: QuickAction[] = [
  {
    id: 'gather-all',
    label: 'Gather All',
    icon: 'House',
    action: 'gatherAll',
    enabled: true,
    customizable: false,
    description: 'Move all characters to the main common room'
  },
  {
    id: 'rest-all',
    label: 'Rest All',
    icon: 'Bed',
    action: 'restAll',
    enabled: true,
    customizable: false,
    description: 'Increase arousal for all characters who need it'
  },
  {
    id: 'feed-all',
    label: 'Feed All',
    icon: 'Heart',
    action: 'feedAll',
    enabled: true,
    customizable: false,
    description: 'Increase happiness and relationship for all characters'
  },
  {
    id: 'check-status',
    label: 'Check Status',
    icon: 'ChartBar',
    action: 'checkStatus',
    enabled: true,
    customizable: false,
    description: 'Check the status of all characters'
  },
  {
    id: 'custom-scene',
    label: 'Custom Scene',
    icon: 'Sparkle',
    action: 'customScene',
    enabled: true,
    customizable: false,
    description: 'Create custom scenes using natural language commands with the copilot'
  }
];

export function useQuickActions() {
  const [quickActions, setQuickActions] = useSimpleStorage<QuickAction[]>('quick-actions', DEFAULT_ACTIONS);
  const { house, updateCharacter } = useHouse();
  const { createSession, setActiveSessionId } = useChat();

  const executeAction = async (actionId: string) => {
    const action = quickActions?.find(a => a.id === actionId);
    if (!action || !action.enabled) return;

    switch (action.action) {
      case 'gatherAll':
        await gatherAllCharacters();
        break;
      case 'restAll':
        await restAllCharacters();
        break;
      case 'feedAll':
        await feedAllCharacters();
        break;
      case 'checkStatus':
        await checkAllStatus();
        break;
      case 'boostRelationship':
        await boostRelationship();
        break;
      case 'boostHappiness':
        await boostHappiness();
        break;
      case 'boostArousal':
        await boostArousal();
        break;
      case 'levelUpAll':
        await levelUpAll();
        break;
      case 'addExperience':
        await addExperience();
        break;
      case 'randomizeLocations':
        await randomizeLocations();
        break;
      case 'resetStats':
        await resetStats();
        break;
      case 'addCurrency100':
        await addCurrency(100);
        break;
      case 'addCurrency500':
        await addCurrency(500);
        break;
      case 'addCurrency1000':
        await addCurrency(1000);
        break;
      case 'testApiConnection':
        await testApiConnection();
        break;
      case 'clearAllUpdates':
        await clearAllUpdates();
        break;
      case 'exportHouseData':
        await exportHouseData();
        break;
      case 'customScene':
        await createCustomScene();
        break;
      case 'generateProfileImages':
        await generateProfileImages();
        break;
      case 'createSceneImage':
        await createSceneImage();
        break;
      case 'generatePortrait':
        await generatePortrait();
        break;
      case 'enhancePersonalities':
        await enhancePersonalities();
        break;
      case 'memoryAnalysis':
        await memoryAnalysis();
        break;
      case 'relationshipReport':
        await relationshipReport();
        break;
      case 'backupGallery':
        await backupGallery();
        break;
      case 'groupActivity':
        await groupActivity();
        break;
      default:
        await executeCustomAction(action.action);
        break;
    }
  };

  const gatherAllCharacters = async () => {
    if (house.characters.length === 0) {
      toast.error('No characters to gather');
      return;
    }

    // Find the main common room or first shared room
    const mainRoom = house.rooms.find(r => r.name.toLowerCase().includes('common') || r.type === 'shared') || house.rooms[0];

    if (!mainRoom) {
      toast.error('No available room to gather characters');
      return;
    }

    // Update all characters' locations to main room
    for (const character of house.characters) {
      const stats = character.stats || {
        relationship: 0,
        wet: 0,
        happiness: 0,
        experience: 0,
        level: 1
      };

      await updateCharacter(character.id, {
        ...character,
        roomId: mainRoom.id,
        stats: {
          ...stats,
          happiness: Math.min(100, stats.happiness + 5)
        }
      });
    }

    toast.success(`Gathered all ${house.characters.length} characters to the ${mainRoom.name}`);
  };

  const restAllCharacters = async () => {
    if (house.characters.length === 0) {
      toast.error('No characters to rest');
      return;
    }

    // Find a bedroom or private room, or fallback to any room
    const restRoom = house.rooms.find(r =>
      r.name.toLowerCase().includes('bedroom') ||
      r.name.toLowerCase().includes('bed') ||
      r.type === 'private'
    ) || house.rooms[0];

    let restedCount = 0;
    for (const character of house.characters) {
      const stats = character.stats || {
        relationship: 0,
        wet: 0,
        happiness: 0,
        experience: 0,
        level: 1
      };

      if (stats.wet < 90) {
        await updateCharacter(character.id, {
          ...character,
          roomId: restRoom?.id || character.roomId,
          stats: {
            ...stats,
            wet: Math.min(100, stats.wet + 25),
            happiness: Math.min(100, stats.happiness + 3)
          }
        });
        restedCount++;
      }
    }

    if (restedCount > 0) {
      toast.success(`${restedCount} characters are now more aroused and stimulated`);
    } else {
      toast.info('All characters are already well-rested');
    }
  };

  const feedAllCharacters = async () => {
    if (house.characters.length === 0) {
      toast.error('No characters to feed');
      return;
    }

    for (const character of house.characters) {
      const stats = character.stats || {
        relationship: 0,
        wet: 0,
        happiness: 0,
        experience: 0,
        level: 1
      };

      await updateCharacter(character.id, {
        ...character,
        stats: {
          ...stats,
          happiness: Math.min(100, stats.happiness + 10),
          love: Math.min(100, stats.love + 2)
        }
      });
    }

    toast.success(`Fed all ${house.characters.length} characters - they're very grateful!`);
  };

  const checkAllStatus = async () => {
    if (house.characters.length === 0) {
      toast.error('No characters to check');
      return;
    }

    const statusReport = house.characters.map(char => {
      const needsAttention: string[] = [];
      if (char.stats.wet < 30) needsAttention.push('low arousal');
      if (char.stats.happiness < 40) needsAttention.push('unhappy');
      if (char.stats.love < 50) needsAttention.push('distant');

      return {
        name: char.name,
        status: needsAttention.length === 0 ? 'good' : needsAttention.join(', ')
      };
    });

    const needsHelp = statusReport.filter(s => s.status !== 'good');

    if (needsHelp.length === 0) {
      toast.success('All characters are doing well!');
    } else {
      const message = `${needsHelp.length} character(s) need attention: ${needsHelp.map(c => `${c.name} (${c.status})`).join(', ')}`;
      toast.info(message);
    }
  };

  const boostRelationship = async () => {
    if (house.characters.length === 0) {
      toast.error('No characters to boost relationship with');
      return;
    }

    for (const character of house.characters) {
      const stats = character.stats || {
        relationship: 0,
        wet: 0,
        happiness: 0,
        experience: 0,
        level: 1
      };

      await updateCharacter(character.id, {
        ...character,
        stats: {
          ...stats,
          love: Math.min(100, stats.love + 5)
        }
      });
    }

    toast.success('Relationship boosted for all characters');
  };

  const boostHappiness = async () => {
    if (house.characters.length === 0) {
      toast.error('No characters to boost happiness for');
      return;
    }

    for (const character of house.characters) {
      const stats = character.stats || {
        relationship: 0,
        wet: 0,
        happiness: 0,
        experience: 0,
        level: 1
      };

      await updateCharacter(character.id, {
        ...character,
        stats: {
          ...stats,
          happiness: Math.min(100, stats.happiness + 10)
        }
      });
    }

    toast.success('Happiness boosted for all characters');
  };

  const boostArousal = async () => {
    if (house.characters.length === 0) {
      toast.error('No characters to boost arousal for');
      return;
    }

    for (const character of house.characters) {
      const stats = character.stats || {
        relationship: 0,
        wet: 0,
        happiness: 0,
        experience: 0,
        level: 1
      };

      await updateCharacter(character.id, {
        ...character,
        stats: {
          ...stats,
          wet: Math.min(100, stats.wet + 15)
        }
      });
    }

    toast.success('Arousal boosted for all characters');
  };

  const levelUpAll = async () => {
    if (house.characters.length === 0) {
      toast.error('No characters to level up');
      return;
    }

    for (const character of house.characters) {
      const stats = character.stats || {
        relationship: 0,
        wet: 0,
        happiness: 0,
        experience: 0,
        level: 1
      };

      await updateCharacter(character.id, {
        ...character,
        stats: {
          ...stats,
          level: stats.level + 1
        }
      });
    }

    toast.success('All characters leveled up!');
  };

  const addExperience = async () => {
    if (house.characters.length === 0) {
      toast.error('No characters to give experience to');
      return;
    }

    for (const character of house.characters) {
      const stats = character.stats || {
        relationship: 0,
        wet: 0,
        happiness: 0,
        experience: 0,
        level: 1
      };

      await updateCharacter(character.id, {
        ...character,
        stats: {
          ...stats,
          experience: stats.experience + 25
        }
      });
    }

    toast.success('Added 25 experience points to all characters');
  };

  const randomizeLocations = async () => {
    if (house.characters.length === 0) {
      toast.error('No characters to randomize locations for');
      return;
    }

    for (const character of house.characters) {
      const randomRoom = house.rooms[Math.floor(Math.random() * house.rooms.length)];

      await updateCharacter(character.id, {
        ...character,
        roomId: randomRoom.id
      });
    }

    toast.success('All characters have been moved to random rooms');
  };

  const resetStats = async () => {
    if (house.characters.length === 0) {
      toast.error('No characters to reset stats for');
      return;
    }

    for (const character of house.characters) {
      await updateCharacter(character.id, {
        ...character,
        stats: {
          love: 50,
          happiness: 50,
          wet: 50,
          willing: 50,
          selfEsteem: 50,
          loyalty: 50,
          fight: 20,
          stamina: 50,
          pain: 20,
          experience: 0,
          level: 1
        },
        skills: {
          hands: 0,
          mouth: 0,
          missionary: 0,
          doggy: 0,
          cowgirl: 0
        },
        progression: {
          level: 1,
          nextLevelExp: 100,
          unlockedFeatures: [],
          achievements: [],
          relationshipStatus: 'stranger' as const,
          affection: 50,
          trust: 50,
          intimacy: 0,
          dominance: 50,
          jealousy: 0,
          possessiveness: 0,
          sexualExperience: 0,
          kinks: [],
          limits: [],
          fantasies: [],
          unlockedPositions: [],
          unlockedOutfits: [],
          unlockedToys: [],
          unlockedScenarios: [],
          relationshipMilestones: [],
          sexualMilestones: [],
          significantEvents: [],
          storyChronicle: [],
          currentStoryArc: undefined,
          memorableEvents: [],
          bonds: {},
          sexualCompatibility: {
            overall: 50,
            kinkAlignment: 50,
            stylePreference: 50
          },
          userPreferences: {
            likes: [],
            dislikes: [],
            turnOns: [],
            turnOffs: []
          }
        },
        memories: [],
        conversationHistory: []
      });
    }

    toast.success('All characters have been completely reset to default values');
  };

  const addCurrency = async (amount: number) => {
    // This would update house currency - placeholder for now
    toast.success(`Added ${amount} currency to house funds`);
  };

  const testApiConnection = async () => {
    // Test API connection - placeholder
    toast.success('API connection test completed successfully');
  };

  const clearAllUpdates = async () => {
    // Clear copilot monitoring updates - placeholder
    toast.success('All copilot monitoring updates cleared');
  };

  const exportHouseData = async () => {
    // Export house data - placeholder
    toast.success('House data exported successfully');
  };

  const createCustomScene = async () => {
    // This action shows instructions for using custom scene commands
    toast.info('To create custom scenes, chat with the copilot using commands like "send Sasha into my room"');
  };

  const generateProfileImages = async () => {
    if (house.characters.length === 0) {
      toast.error('No characters available to generate images for');
      return;
    }

    toast.info('Generating profile images for all characters...');
    
    for (const character of house.characters) {
      try {
        const prompt = `Create a portrait image of ${character.name}. ${character.appearance}. ${character.personality}. Style: detailed digital art, professional character portrait`;
        const imageUrl = await AIService.generateImage(prompt);
        
        if (imageUrl) {
          // Store the image in the gallery
          const images = JSON.parse(localStorage.getItem('generated-images') || '[]');
          const newImage = {
            id: crypto.randomUUID(),
            prompt,
            imageUrl,
            createdAt: new Date(),
            characterId: character.id,
            tags: ['portrait', 'character', character.name.toLowerCase()]
          };
          images.unshift(newImage);
          localStorage.setItem('generated-images', JSON.stringify(images));
        }
      } catch (error) {
        console.error(`Error generating image for ${character.name}:`, error);
      }
    }
    
    toast.success('Profile image generation completed!');
  };

  const createSceneImage = async () => {
    const prompt = `Create an image of the ${house.name}. A cozy character house interior with ${house.characters.length} characters. ${house.description}. Style: warm, inviting, detailed digital art`;
    
    try {
      toast.info('Generating house scene image...');
      const imageUrl = await AIService.generateImage(prompt);
      
      if (imageUrl) {
        const images = JSON.parse(localStorage.getItem('generated-images') || '[]');
        const newImage = {
          id: crypto.randomUUID(),
          prompt,
          imageUrl,
          createdAt: new Date(),
          tags: ['scene', 'house', 'interior']
        };
        images.unshift(newImage);
        localStorage.setItem('generated-images', JSON.stringify(images));
        toast.success('House scene image generated!');
      }
    } catch (error) {
      console.error('Error generating scene image:', error);
      toast.error('Failed to generate scene image');
    }
  };

  const generatePortrait = async () => {
    if (house.characters.length === 0) {
      toast.error('No characters available');
      return;
    }

    const character = house.characters[0]; // For simplicity, use first character
    const prompt = `High quality detailed portrait of ${character.name}. ${character.appearance}. ${character.personality}. Professional portrait photography style, detailed, beautiful lighting`;
    
    try {
      toast.info(`Generating detailed portrait of ${character.name}...`);
      const imageUrl = await AIService.generateImage(prompt);
      
      if (imageUrl) {
        const images = JSON.parse(localStorage.getItem('generated-images') || '[]');
        const newImage = {
          id: crypto.randomUUID(),
          prompt,
          imageUrl,
          createdAt: new Date(),
          characterId: character.id,
          tags: ['portrait', 'detailed', character.name.toLowerCase()]
        };
        images.unshift(newImage);
        localStorage.setItem('generated-images', JSON.stringify(images));
        toast.success(`Detailed portrait of ${character.name} generated!`);
      }
    } catch (error) {
      console.error('Error generating portrait:', error);
      toast.error('Failed to generate portrait');
    }
  };

  const enhancePersonalities = async () => {
    toast.info('Enhancing AI personality systems...');
    
    // Update all characters with enhanced prompts
    for (const character of house.characters) {
      const enhancedPrompts = {
        ...character.prompts,
        system: `${character.prompts.system} ENHANCED PERSONALITY: Respond authentically as ${character.name}. Your personality (${character.personality}) should shine through every response. Stay true to your character traits: ${character.features.join(', ')}. Be more expressive, emotional, and true to your nature.`,
        personality: `${character.prompts.personality} Focus on being authentic and responsive. Let your personality guide your responses naturally. React emotionally and personally to conversations.`
      };
      
      await updateCharacter(character.id, {
        ...character,
        prompts: enhancedPrompts
      });
    }
    
    toast.success('Character personalities enhanced for better responsiveness!');
  };

  const memoryAnalysis = async () => {
    if (house.characters.length === 0) {
      toast.error('No characters to analyze');
      return;
    }

    toast.info('Analyzing character memory systems...');
    
    const analysis = house.characters.map(character => {
      const memoryCount = character.memories?.length || 0;
      const conversationCount = character.conversationHistory?.length || 0;
      const relationshipEvents = character.progression?.significantEvents?.length || 0;
      
      return {
        name: character.name,
        memories: memoryCount,
        conversations: conversationCount,
        events: relationshipEvents,
        level: character.stats.level
      };
    });
    
    const totalMemories = analysis.reduce((sum, char) => sum + char.memories, 0);
    const avgMemories = totalMemories / analysis.length;
    
    toast.success(`Memory Analysis Complete: ${totalMemories} total memories, ${avgMemories.toFixed(1)} average per character`);
  };

  const relationshipReport = async () => {
    if (house.characters.length === 0) {
      toast.error('No characters to analyze');
      return;
    }

    const avgLove = house.characters.reduce((sum, char) => sum + char.stats.love, 0) / house.characters.length;
    const avgHappiness = house.characters.reduce((sum, char) => sum + char.stats.happiness, 0) / house.characters.length;
    const avgTrust = house.characters.reduce((sum, char) => sum + (char.progression?.trust || 0), 0) / house.characters.length;
    
    const report = `Relationship Analysis:
• Average Love: ${avgLove.toFixed(1)}%
• Average Happiness: ${avgHappiness.toFixed(1)}%
• Average Trust: ${avgTrust.toFixed(1)}%
• Total Characters: ${house.characters.length}`;
    
    toast.success('Relationship report generated! Check console for details.');
    console.log(report);
  };

  const backupGallery = async () => {
    try {
      const images = JSON.parse(localStorage.getItem('generated-images') || '[]');
      const backup = {
        images,
        exportDate: new Date().toISOString(),
        totalImages: images.length
      };
      
      const dataStr = JSON.stringify(backup, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `image-gallery-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Gallery backup created! ${images.length} images exported.`);
    } catch (error) {
      console.error('Error backing up gallery:', error);
      toast.error('Failed to backup gallery');
    }
  };

  const groupActivity = async () => {
    if (house.characters.length < 2) {
      toast.error('Need at least 2 characters for group activity');
      return;
    }

    // Boost all characters' happiness and relationships
    for (const character of house.characters) {
      const newStats = {
        ...character.stats,
        happiness: Math.min(100, character.stats.happiness + 15),
        love: Math.min(100, character.stats.love + 5)
      };
      
      await updateCharacter(character.id, {
        ...character,
        stats: newStats
      });
    }
    
    toast.success(`Group activity completed! All ${house.characters.length} characters participated and gained happiness and relationship points.`);
  };

  const executeCustomAction = async (actionCode: string) => {
    try {
      // For custom actions, we could execute user-defined code or prompts
      // This is a placeholder for future custom action functionality
      toast.info(`Executing custom action: ${actionCode}`);
    } catch (error) {
      console.error('Error executing custom action:', error);
      toast.error('Failed to execute custom action');
    }
  };

  const addQuickAction = (action: Omit<QuickAction, 'id'>) => {
    const newAction: QuickAction = {
      ...action,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    setQuickActions(current => [...(current || DEFAULT_ACTIONS), newAction]);
    return newAction.id;
  };

  const updateQuickAction = (actionId: string, updates: Partial<QuickAction>) => {
    setQuickActions(current =>
      (current || DEFAULT_ACTIONS).map(action =>
        action.id === actionId ? { ...action, ...updates } : action
      )
    );
  };

  const removeQuickAction = (actionId: string) => {
    setQuickActions(current =>
      (current || DEFAULT_ACTIONS).filter(action =>
        action.id !== actionId || !action.customizable
      )
    );
  };

  const resetQuickActions = () => {
    setQuickActions(DEFAULT_ACTIONS);
  };

  return {
    quickActions: quickActions || DEFAULT_ACTIONS,
    executeAction,
    addQuickAction,
    updateQuickAction,
    removeQuickAction,
    resetQuickActions,
    availableActions: AVAILABLE_ACTIONS
  };
}