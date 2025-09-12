import { useEffect, useState, useRef } from 'react';
import { useSimpleStorage } from './useSimpleStorage';
import { Character, AutoCharacterConfig, AVAILABLE_PERSONALITIES, AVAILABLE_ROLES } from '@/types';
import { generateRandomCharacter } from '@/lib/characterGenerator';
import { useHouse } from '@/hooks/useHouse';

export const useAutoCharacterCreator = () => {
  const { house, updateHouse } = useHouse();
  const [config, setConfig] = useSimpleStorage<AutoCharacterConfig>('auto-character-config', {
    themes: ['college', 'prime', 'fresh'], // Use actual character themes
    personalities: AVAILABLE_PERSONALITIES.slice(0, 10), // Use first 10 personalities as defaults
    roles: AVAILABLE_ROLES.slice(0, 10), // Use first 10 roles as defaults
    rarityWeights: {
      common: 70,
      rare: 25,
      legendary: 5
    }
  });
  const [isCreating, setIsCreating] = useState(false);
  const [nextCreationTime, setNextCreationTime] = useState<Date | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const createRandomCharacter = async (): Promise<Character> => {
    setIsCreating(true);
    try {
      const character = await generateRandomCharacter(config, house);
      
      // Assign to first available room (same logic as CharacterCreator)
      const availableRooms = house.rooms?.filter(room => room.id !== 'unassigned') || [];
      const targetRoom = availableRooms.length > 0 ? availableRooms[0] : null;
      
      if (targetRoom) {
        character.roomId = targetRoom.id;
        // Update room residents
        targetRoom.residents = [...(targetRoom.residents || []), character.id];
      }
      
      // Add to house
      const updatedHouse = {
        ...house,
        characters: [...(house.characters || []), character],
        rooms: house.rooms?.map(room => 
          room.id === targetRoom?.id ? targetRoom : room
        ) || house.rooms
      };
      await updateHouse(updatedHouse);
      
      return character;
    } finally {
      setIsCreating(false);
    }
  };

  const scheduleNextCreation = () => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (!house?.autoCreator?.enabled) return;
    
    const interval = (house.autoCreator?.interval || 30) * 60 * 1000; // Convert minutes to ms
    const nextTime = new Date(Date.now() + interval);
    setNextCreationTime(nextTime);
    
    timeoutRef.current = setTimeout(() => {
      // Check current house state at execution time
      const currentHouse = house; // This will be the latest house from the hook
      if ((currentHouse.characters?.length || 0) < (currentHouse.autoCreator?.maxCharacters || 20)) {
        createRandomCharacter().then(() => {
          if (currentHouse.autoCreator?.enabled) {
            scheduleNextCreation();
          }
        });
      }
    }, interval);
  };

  useEffect(() => {
    if (house?.autoCreator?.enabled) {
      scheduleNextCreation();
    } else {
      // Clear timeout if disabled
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        setNextCreationTime(null);
      }
    }
    
    // Cleanup on unmount
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