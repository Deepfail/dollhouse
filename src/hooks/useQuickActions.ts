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
  { id: 'custom-scene', label: 'Custom Scene', icon: 'Sparkle', action: 'customScene', enabled: true, customizable: false, description: 'Create custom scenes using natural language commands with the copilot' },
  { id: 'compliment', label: 'Compliment', icon: 'Sparkle', action: 'compliment', enabled: true, customizable: false, description: 'Boost affection with a sincere compliment' },
  { id: 'gift', label: 'Send Gift', icon: 'Heart', action: 'gift', enabled: true, customizable: false, description: 'Send a thoughtful gift to raise happiness' },
  { id: 'flirt', label: 'Flirt', icon: 'Fire', action: 'flirt', enabled: true, customizable: false, description: 'Turn up the heat with playful flirting' },
  { id: 'ask-question', label: 'Ask Question', icon: 'Question', action: 'askQuestion', enabled: true, customizable: false, description: 'Deepen trust with a curious question' },
  { id: 'punish', label: 'Punish', icon: 'Warning', action: 'punish', enabled: true, customizable: false, description: 'Set boundaries when she steps out of line' },
  { id: 'train', label: 'Train', icon: 'Barbell', action: 'train', enabled: true, customizable: false, description: 'Run a focused training session' },
  { id: 'photo-shoot', label: 'Photo Shoot', icon: 'Camera', action: 'photoShoot', enabled: true, customizable: false, description: 'Stage a glamorous shoot to boost confidence' },
  { id: 'visit', label: 'Visit', icon: 'DoorOpen', action: 'visit', enabled: true, customizable: false, description: 'Drop by her room for a surprise check-in' }
];


import { useState } from 'react';
import { toast } from 'sonner';
import type { Character } from '@/types';
import { useHouseFileStorage } from './useHouseFileStorage';

interface QuickActionContext {
  characterId?: string;
}

const clamp = (value: number) => Math.max(0, Math.min(100, value));

export function useQuickActions() {
  const { house, updateCharacter } = useHouseFileStorage();
  const [quickActions, setQuickActions] = useState<QuickAction[]>(AVAILABLE_ACTIONS);

  const pickCharacter = async (context?: QuickActionContext): Promise<Character | null> => {
    const characterId = context?.characterId;
    if (!characterId) {
      toast.error('Pick a character first');
      return null;
    }
    const character = house?.characters?.find((row) => row.id === characterId) ?? null;
    if (!character) {
      toast.error('Character not found');
      return null;
    }
    return character;
  };

  const executeAction = async (actionId: string, context?: QuickActionContext) => {
    const action = quickActions?.find((a: QuickAction) => a.id === actionId);
    if (action && !action.enabled) return;

    const handlerKey = action?.action ?? actionId;

    switch (handlerKey) {
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
        if (typeof window !== 'undefined' && typeof window.alert === 'function') {
          window.alert('To create custom scenes, chat with the copilot using commands like "send Sasha into my room"');
        }
        break;
      case 'compliment':
        { const character = await pickCharacter(context); if (!character) break;
          await updateCharacter(character.id, {
            stats: {
              ...character.stats,
              happiness: clamp((character.stats?.happiness ?? 0) + 6),
            },
            progression: {
              ...character.progression,
              affection: clamp((character.progression?.affection ?? 0) + 5),
              trust: clamp((character.progression?.trust ?? 0) + 3),
            },
            lastInteraction: new Date(),
          });
          toast.success(`Compliment queued for ${character.name}.`);
        }
        break;
      case 'gift':
      case 'sendGift':
      case 'send-gift':
        { const character = await pickCharacter(context); if (!character) break;
          await updateCharacter(character.id, {
            stats: {
              ...character.stats,
              happiness: clamp((character.stats?.happiness ?? 0) + 10),
              love: clamp((character.stats?.love ?? 0) + 4),
            },
            progression: {
              ...character.progression,
              affection: clamp((character.progression?.affection ?? 0) + 6),
              intimacy: clamp((character.progression?.intimacy ?? 0) + 4),
            },
            lastInteraction: new Date(),
          });
          toast.success(`Sent a gift to ${character.name}.`);
        }
        break;
      case 'flirt':
        { const character = await pickCharacter(context); if (!character) break;
          await updateCharacter(character.id, {
            stats: {
              ...character.stats,
              wet: clamp((character.stats?.wet ?? 0) + 8),
            },
            progression: {
              ...character.progression,
              intimacy: clamp((character.progression?.intimacy ?? 0) + 5),
            },
            lastInteraction: new Date(),
          });
          toast.success(`Turned up the flirt energy with ${character.name}.`);
        }
        break;
      case 'askQuestion':
        { const character = await pickCharacter(context); if (!character) break;
          await updateCharacter(character.id, {
            progression: {
              ...character.progression,
              trust: clamp((character.progression?.trust ?? 0) + 5),
              intimacy: clamp((character.progression?.intimacy ?? 0) + 3),
            },
            lastInteraction: new Date(),
          });
          toast.success(`Logged a personal question for ${character.name}.`);
        }
        break;
      case 'punish':
        { const character = await pickCharacter(context); if (!character) break;
          await updateCharacter(character.id, {
            stats: {
              ...character.stats,
              happiness: clamp((character.stats?.happiness ?? 0) - 6),
              loyalty: clamp((character.stats?.loyalty ?? 0) + 4),
            },
            progression: {
              ...character.progression,
              dominance: clamp((character.progression?.dominance ?? 0) + 6),
            },
            lastInteraction: new Date(),
          });
          toast.warning(`${character.name} felt the sting—watch her mood tonight.`);
        }
        break;
      case 'train':
        { const character = await pickCharacter(context); if (!character) break;
          await updateCharacter(character.id, {
            stats: {
              ...character.stats,
              stamina: clamp((character.stats?.stamina ?? 0) - 4),
              experience: clamp((character.stats?.experience ?? 0) + 6),
            },
            skills: {
              ...character.skills,
              hands: clamp((character.skills?.hands ?? 0) + 4),
              mouth: clamp((character.skills?.mouth ?? 0) + 3),
            },
            lastInteraction: new Date(),
          });
          toast.success(`Training session prepped for ${character.name}.`);
        }
        break;
      case 'photoShoot':
        { const character = await pickCharacter(context); if (!character) break;
          await updateCharacter(character.id, {
            stats: {
              ...character.stats,
              selfEsteem: clamp((character.stats?.selfEsteem ?? 0) + 8),
            },
            progression: {
              ...character.progression,
              affection: clamp((character.progression?.affection ?? 0) + 2),
            },
            lastInteraction: new Date(),
          });
          toast.success(`Photo shoot booked for ${character.name}.`);
        }
        break;
      case 'visit':
        { const character = await pickCharacter(context); if (!character) break;
          await updateCharacter(character.id, {
            lastInteraction: new Date(),
          });
          toast.success(`${character.name} knows you're on the way.`);
        }
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
