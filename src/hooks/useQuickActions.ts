import { useKV } from '@github/spark/hooks';
import { useHouse } from './useHouse';
import { toast } from 'sonner';

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: string;
  enabled: boolean;
  customizable: boolean;
}

const DEFAULT_ACTIONS: QuickAction[] = [
  {
    id: 'gather-all',
    label: 'Gather All',
    icon: 'House',
    action: 'gatherAll',
    enabled: true,
    customizable: false
  },
  {
    id: 'rest-all',
    label: 'Rest All',
    icon: 'Bed',
    action: 'restAll',
    enabled: true,
    customizable: false
  },
  {
    id: 'feed-all',
    label: 'Feed All',
    icon: 'Heart',
    action: 'feedAll',
    enabled: true,
    customizable: false
  },
  {
    id: 'check-status',
    label: 'Check Status',
    icon: 'ChartBar',
    action: 'checkStatus',
    enabled: true,
    customizable: false
  }
];

export function useQuickActions() {
  const [quickActions, setQuickActions] = useKV<QuickAction[]>('quick-actions', DEFAULT_ACTIONS);
  const { house, updateCharacter } = useHouse();

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
      await updateCharacter(character.id, {
        ...character,
        roomId: mainRoom.id,
        stats: {
          ...character.stats,
          happiness: Math.min(100, character.stats.happiness + 5)
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
      if (character.stats.energy < 90) {
        await updateCharacter(character.id, {
          ...character,
          roomId: restRoom?.id || character.roomId,
          stats: {
            ...character.stats,
            energy: Math.min(100, character.stats.energy + 25),
            happiness: Math.min(100, character.stats.happiness + 3)
          }
        });
        restedCount++;
      }
    }

    if (restedCount > 0) {
      toast.success(`${restedCount} characters are now resting and recovering energy`);
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
      await updateCharacter(character.id, {
        ...character,
        stats: {
          ...character.stats,
          happiness: Math.min(100, character.stats.happiness + 10),
          relationship: Math.min(100, character.stats.relationship + 2)
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
      const needsAttention = [];
      if (char.stats.energy < 30) needsAttention.push('tired');
      if (char.stats.happiness < 40) needsAttention.push('unhappy');
      if (char.stats.relationship < 50) needsAttention.push('distant');

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
    resetQuickActions
  };
}