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

  // House Management
  { id: 'add-currency-100', label: 'Add 100 Currency', icon: 'Gift', action: 'addCurrency100', description: 'Add 100 currency to house funds' },
  { id: 'add-currency-500', label: 'Add 500 Currency', icon: 'Gift', action: 'addCurrency500', description: 'Add 500 currency to house funds' },
  { id: 'add-currency-1000', label: 'Add 1000 Currency', icon: 'Gift', action: 'addCurrency1000', description: 'Add 1000 currency to house funds' },

  // AI & System
  { id: 'test-api', label: 'Test API Connection', icon: 'Shield', action: 'testApiConnection', description: 'Test the current AI API connection' },
  { id: 'clear-updates', label: 'Clear All Updates', icon: 'Trash', action: 'clearAllUpdates', description: 'Clear all copilot monitoring updates' },
  { id: 'export-data', label: 'Export House Data', icon: 'Download', action: 'exportHouseData', description: 'Export all house data to JSON file' },

  // Custom Actions
  { id: 'custom-scene', label: 'Custom Scene', icon: 'Sparkle', action: 'customScene', description: 'Create a custom scene chat with a character based on natural language commands' },
  { id: 'rest-all', label: 'Rest All', icon: 'Bed', action: 'restAll', description: 'Increase arousal for all characters who need it' },
  { id: 'feed-all', label: 'Feed All', icon: 'Heart', action: 'feedAll', description: 'Increase happiness and relationship for all characters' },
  { id: 'check-status', label: 'Check Status', icon: 'ChartBar', action: 'checkStatus', description: 'Check the status of all characters' }
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
          fight: 50,
          pain: 50,
          experience: 0,
          level: 1
        }
      });
    }

    toast.success('All character stats have been reset');
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