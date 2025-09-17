// Hook stub - legacy storage removed

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: string;
  enabled: boolean;
  isCustom: boolean;
  customizable?: boolean;
  description?: string;
}

export const AVAILABLE_ACTIONS = [
  { id: 'gather', label: 'Gather All', action: 'gatherAllCharacters', description: 'Gather all characters to the common area' },
  { id: 'rest', label: 'Rest All', action: 'restAllCharacters', description: 'Put all characters to rest' },
  { id: 'feed', label: 'Feed All', action: 'feedAllCharacters', description: 'Feed all characters' }
];

export function useQuickActions() {
  return {
    quickActions: [] as QuickAction[],
    addQuickAction: (action: any) => console.log('Quick actions disabled', action),
    updateQuickAction: (id: string, updates: any) => console.log('Quick actions disabled', id, updates),
    removeQuickAction: (actionId: string) => console.log('Quick actions disabled', actionId),
    resetQuickActions: () => console.log('Quick actions disabled'),
    gatherAllCharacters: () => console.log('Quick actions disabled'),
    restAllCharacters: () => console.log('Quick actions disabled'),
    feedAllCharacters: () => console.log('Quick actions disabled')
  };
}
