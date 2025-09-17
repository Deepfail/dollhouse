// Hook stub - legacy storage removed
import { useState } from 'react';

export function useAutoCharacterCreator() {
  const [isCreating] = useState(false);
  const [config] = useState({
    themes: [] as string[],
    rarityWeights: { common: 70, rare: 25, legendary: 5 }
  });
  const [nextCreationTime] = useState<Date | null>(null);
  const [isEnabled] = useState(false);
  const [maxCharacters] = useState(10);
  const [interval] = useState(30); // 30 minutes

  return {
    isCreating,
    startCreating: () => console.log('Auto creator disabled'),
    stopCreating: () => console.log('Auto creator disabled'),
    config,
    setConfig: (newConfig: any) => console.log('Auto creator disabled', newConfig),
    createRandomCharacter: () => {
      console.log('Auto creator disabled');
      return { name: 'Test Character', rarity: 'common' };
    },
    nextCreationTime,
    toggleAutoCreator: () => console.log('Auto creator disabled'),
    updateAutoCreatorConfig: (settings: { maxCharacters: number; interval: number }) => 
      console.log('Auto creator disabled', settings),
    isEnabled,
    maxCharacters,
    interval
  };
}
