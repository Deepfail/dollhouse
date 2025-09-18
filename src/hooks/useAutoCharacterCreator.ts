// Hook stub - legacy storage removed
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { generateRandomCharacter } from '@/lib/characterGenerator';
import { AutoCharacterConfig, AVAILABLE_PERSONALITIES, AVAILABLE_ROLES, Character } from '@/types';
import { useEffect, useRef, useState } from 'react';
import { useFileStorage } from './useFileStorage';

export const useAutoCharacterCreator = () => {
  const { house, updateHouse, addCharacter } = useHouseFileStorage();
  const { data: config, setData: setConfig } = useFileStorage<AutoCharacterConfig>('auto-character-config.json', {
    themes: ['college', 'prime', 'fresh'],
    personalities: AVAILABLE_PERSONALITIES ? AVAILABLE_PERSONALITIES.slice(0, 10) : [],
    roles: AVAILABLE_ROLES ? AVAILABLE_ROLES.slice(0, 10) : [],
    rarityWeights: {
      common: 70,
      rare: 25,
      legendary: 5
    }
  });
  const [isCreating, setIsCreating] = useState(false);
  const [nextCreationTime, setNextCreationTime] = useState<Date | null>(null);
  const timeoutRef = useRef<any>(null);
  const isCreatingRef = useRef(false);

  const createRandomCharacter = async (): Promise<Character> => {
    if (isCreating || isCreatingRef.current) {
      return Promise.reject('Already creating character');
    }
    const recentCharacters = house.characters?.filter(char => {
      const createdAt = new Date(char.createdAt);
      const timeDiff = Date.now() - createdAt.getTime();
      return timeDiff < 2000;
    }) || [];
    if (recentCharacters.length > 0) {
      return Promise.reject('Recent character creation detected');
    }
    setIsCreating(true);
    isCreatingRef.current = true;
    try {
      const character = await generateRandomCharacter(config, house);
      const currentCharacters = house.characters || [];
      const nameExists = currentCharacters.some(c => c.name === character.name);
      const idExists = currentCharacters.some(c => c.id === character.id);
      if (nameExists) {
        return Promise.reject('Character name already exists');
      }
      if (idExists) {
        return Promise.reject('Character ID already exists');
      }
      addCharacter(character);
      return character;
    } catch (error) {
      throw error;
    } finally {
      setTimeout(() => {
        setIsCreating(false);
        isCreatingRef.current = false;
      }, 500);
    }
  };

  const scheduleNextCreation = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (!house?.autoCreator?.enabled) {
      return;
    }
    const interval = (house.autoCreator?.interval || 30) * 60 * 1000;
    const nextTime = new Date(Date.now() + interval);
    setNextCreationTime(nextTime);
    timeoutRef.current = setTimeout(() => {
      const currentHouse = house;
      const currentCharacterCount = currentHouse.characters?.length || 0;
      const maxCharacters = currentHouse.autoCreator?.maxCharacters || 20;
      if (currentCharacterCount < maxCharacters) {
        createRandomCharacter().then(() => {
          if (currentHouse.autoCreator?.enabled) {
            scheduleNextCreation();
          }
        }).catch(() => {
          if (currentHouse.autoCreator?.enabled) {
            scheduleNextCreation();
          }
        });
      } else {
        if (currentHouse.autoCreator?.enabled) {
          scheduleNextCreation();
        }
      }
    }, interval);
  };

  useEffect(() => {
    if (house?.autoCreator?.enabled) {
      scheduleNextCreation();
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        setNextCreationTime(null);
      }
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
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
