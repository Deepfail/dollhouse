// Hook stub - legacy storage removed
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { generateRandomCharacter, type CharacterGenerationOptions } from '@/lib/characterGenerator';
import { ensureUniqueCharacter } from '@/lib/characterUtils';
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
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCreatingRef = useRef(false);

  const resolveGenerationConfig = (options: CharacterGenerationOptions | undefined): AutoCharacterConfig => {
    const baseConfig = config ?? {
      themes: ['college', 'prime', 'fresh'],
      personalities: AVAILABLE_PERSONALITIES ? AVAILABLE_PERSONALITIES.slice(0, 10) : [],
      roles: AVAILABLE_ROLES ? AVAILABLE_ROLES.slice(0, 10) : [],
      rarityWeights: {
        common: 70,
        rare: 25,
        legendary: 5,
      },
    };

    if (!options?.instructions?.archetype) {
      return baseConfig;
    }

    const archetype = options.instructions.archetype;
    const existingThemes = baseConfig.themes ?? [];
    return {
      ...baseConfig,
      themes: [archetype, ...existingThemes.filter((theme) => theme !== archetype)],
    };
  };

  const generateCharacterDraft = async (options: CharacterGenerationOptions = {}): Promise<Character> => {
    const roster = house.characters || [];
    const generationConfig = resolveGenerationConfig(options);
    const generated = await generateRandomCharacter(generationConfig, house, options);
    return ensureUniqueCharacter(generated, roster);
  };

  const createRandomCharacter = async (options: CharacterGenerationOptions = {}): Promise<Character> => {
    if (isCreating || isCreatingRef.current) {
      throw new Error('the auto-creator is already busy finishing another request');
    }

    const roster = house.characters || [];
    const maxCharacters = house.autoCreator?.maxCharacters ?? 20;
    if (roster.length >= maxCharacters) {
      throw new Error(`the house is already at its ${maxCharacters} character limit`);
    }

    const recentCharacters = roster.filter((char) => {
      const createdAt = char.createdAt ? new Date(char.createdAt) : null;
      if (!createdAt) return false;
      return Date.now() - createdAt.getTime() < 2000;
    });
    if (recentCharacters.length > 0) {
      throw new Error('a character was just created—give me a moment before spinning up another');
    }

    setIsCreating(true);
    isCreatingRef.current = true;
    try {
      const uniqueCharacter = await generateCharacterDraft(options);
      const added = await addCharacter(uniqueCharacter);
      if (!added) {
        throw new Error('I could not save her to the roster');
      }
      return uniqueCharacter;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unexpected error while generating a character');
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
    generateCharacterDraft,
    isCreating,
    nextCreationTime,
    toggleAutoCreator,
    updateAutoCreatorConfig,
    isEnabled: house?.autoCreator?.enabled || false,
    maxCharacters: house?.autoCreator?.maxCharacters || 20,
    interval: house?.autoCreator?.interval || 30
  };
};
