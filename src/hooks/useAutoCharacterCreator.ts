import { useEffect, useState } from 'react';
import { useKV } from '@github/spark/hooks';
import { Character, AutoCharacterConfig } from '@/types';
import { generateRandomCharacter } from '@/lib/characterGenerator';
import { useHouse } from '@/hooks/useHouse';

export const useAutoCharacterCreator = () => {
  const { house, updateHouse } = useHouse();
  const [config, setConfig] = useKV<AutoCharacterConfig>('auto-character-config', {
    themes: ['fantasy', 'sci-fi', 'modern', 'historical'],
    personalities: ['friendly', 'mysterious', 'cheerful', 'serious', 'playful'],
    roles: ['warrior', 'mage', 'scholar', 'artist', 'merchant'],
    rarityWeights: {
      common: 70,
      rare: 25,
      legendary: 5
    }
  });
  const [isCreating, setIsCreating] = useState(false);
  const [nextCreationTime, setNextCreationTime] = useState<Date | null>(null);

  const createRandomCharacter = async (): Promise<Character> => {
    setIsCreating(true);
    try {
      const character = await generateRandomCharacter(config, house);
      
      // Add to house
      const updatedHouse = {
        ...house,
        characters: [...(house.characters || []), character]
      };
      await updateHouse(updatedHouse);
      
      return character;
    } finally {
      setIsCreating(false);
    }
  };

  const scheduleNextCreation = () => {
    if (!house?.autoCreator?.enabled) return;
    
    const interval = (house.autoCreator?.interval || 30) * 60 * 1000; // Convert minutes to ms
    const nextTime = new Date(Date.now() + interval);
    setNextCreationTime(nextTime);
    
    setTimeout(() => {
      if ((house.characters?.length || 0) < (house.autoCreator?.maxCharacters || 20)) {
        createRandomCharacter().then(() => {
          scheduleNextCreation();
        });
      }
    }, interval);
  };

  useEffect(() => {
    if (house?.autoCreator?.enabled) {
      scheduleNextCreation();
    }
  }, [house?.autoCreator?.enabled, house?.autoCreator?.interval]);

  const toggleAutoCreator = async (enabled: boolean) => {
    const updatedHouse = {
      ...house,
      autoCreator: {
        ...house?.autoCreator,
        enabled
      }
    };
    await updateHouse(updatedHouse);
  };

  const updateAutoCreatorConfig = async (newConfig: Partial<{
    enabled: boolean;
    interval: number;
    maxCharacters: number;
    themes: string[];
  }>) => {
    const updatedHouse = {
      ...house,
      autoCreator: {
        ...house?.autoCreator,
        ...newConfig
      }
    };
    await updateHouse(updatedHouse);
  };

  return {
    config,
    setConfig,
    createRandomCharacter,
    isCreating,
    nextCreationTime,
    toggleAutoCreator,
    updateAutoCreatorConfig,
    isEnabled: house?.autoCreator?.enabled || false,
    maxCharacters: house?.autoCreator?.maxCharacters || 20,
    interval: house?.autoCreator?.interval || 30
  };
};