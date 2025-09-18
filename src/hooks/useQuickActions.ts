// Hook stub - legacy storage removed

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

export const AVAILABLE_ACTIONS = [
  { id: 'gather-all', label: 'Gather All', icon: 'House', action: 'gatherAll', enabled: true, customizable: false, description: 'Move all characters to the main common room' },
  { id: 'rest-all', label: 'Rest All', icon: 'Bed', action: 'restAll', enabled: true, customizable: false, description: 'Increase arousal for all characters who need it' },
  { id: 'feed-all', label: 'Feed All', icon: 'Heart', action: 'feedAll', enabled: true, customizable: false, description: 'Increase happiness and relationship for all characters' },
  { id: 'check-status', label: 'Check Status', icon: 'ChartBar', action: 'checkStatus', enabled: true, customizable: false, description: 'Check the status of all characters' },
  { id: 'custom-scene', label: 'Custom Scene', icon: 'Sparkle', action: 'customScene', enabled: true, customizable: false, description: 'Create custom scenes using natural language commands with the copilot' }
];


import { useState } from 'react';
import { useHouseFileStorage } from './useHouseFileStorage';

export function useQuickActions() {
  const { house, updateCharacter } = useHouseFileStorage();
  const [quickActions, setQuickActions] = useState<QuickAction[]>(AVAILABLE_ACTIONS);

  const executeAction = async (actionId: string) => {
    const action = quickActions?.find((a: QuickAction) => a.id === actionId);
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
      case 'customScene':
        // This action shows instructions for using custom scene commands
        window && window.alert && window.alert('To create custom scenes, chat with the copilot using commands like "send Sasha into my room"');
        break;
      default:
        break;
    }
  };

  const gatherAllCharacters = async () => {
    if (!house.characters || house.characters.length === 0) return;
    const mainRoom = house.rooms.find(r => r.name.toLowerCase().includes('common') || r.type === 'shared') || house.rooms[0];
    if (!mainRoom) return;
    for (const character of house.characters) {
      await updateCharacter(character.id, { ...character, roomId: mainRoom.id });
    }
  };

  const restAllCharacters = async () => {
    if (!house.characters || house.characters.length === 0) return;
    for (const character of house.characters) {
      await updateCharacter(character.id, { ...character, stats: { ...character.stats, wet: Math.min(100, (character.stats?.wet || 0) + 25) } });
    }
  };

  const feedAllCharacters = async () => {
    if (!house.characters || house.characters.length === 0) return;
    for (const character of house.characters) {
      await updateCharacter(character.id, { ...character, stats: { ...character.stats, happiness: Math.min(100, (character.stats?.happiness || 0) + 10), love: Math.min(100, (character.stats?.love || 0) + 2) } });
    }
  };

  const checkAllStatus = async () => {
    if (!house.characters || house.characters.length === 0) return;
    // Could show a toast or alert with status summary
  };

  const addQuickAction = (action: Omit<QuickAction, 'id'>) => {
    const newAction: QuickAction = {
      ...action,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    setQuickActions((current: QuickAction[] = AVAILABLE_ACTIONS) => [...current, newAction]);
    return newAction.id;
  };

  const updateQuickAction = (actionId: string, updates: Partial<QuickAction>) => {
    setQuickActions((current: QuickAction[] = AVAILABLE_ACTIONS) =>
      current.map((action: QuickAction) =>
        action.id === actionId ? { ...action, ...updates } : action
      )
    );
  };

  const removeQuickAction = (actionId: string) => {
    setQuickActions((current: QuickAction[] = AVAILABLE_ACTIONS) =>
      current.filter((action: QuickAction) =>
        action.id !== actionId || !action.customizable
      )
    );
  };

  const resetQuickActions = () => {
    setQuickActions(AVAILABLE_ACTIONS);
  };

  return {
    quickActions: quickActions || AVAILABLE_ACTIONS,
    executeAction,
    addQuickAction,
    updateQuickAction,
    removeQuickAction,
    resetQuickActions
  };
}
