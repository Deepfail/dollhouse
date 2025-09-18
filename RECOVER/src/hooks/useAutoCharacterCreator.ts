import { useEffect, useState, useRef } from 'react';
import { useFileStorage } from './useFileStorage';
import { Character, AutoCharacterConfig, AVAILABLE_PERSONALITIES, AVAILABLE_ROLES } from '@/types';
import { generateRandomCharacter } from '@/lib/characterGenerator';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';

export const useAutoCharacterCreator = () => {
  const { house, updateHouse, addCharacter } = useHouseFileStorage();
  const { data: config, setData: setConfig } = useFileStorage<AutoCharacterConfig>('auto-character-config.json', {
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
  const isCreatingRef = useRef(false); // Ref to track creation state across renders

  const createRandomCharacter = async (): Promise<Character> => {
    console.log('=== createRandomCharacter called ===');
    console.log('isCreating:', isCreating, 'isCreatingRef.current:', isCreatingRef.current);
    
    // Enhanced duplicate prevention - reject if already creating or recent creation
    if (isCreating || isCreatingRef.current) {
      console.log('Already creating a character, skipping...');
      return Promise.reject('Already creating character');
    }
    
    // Check if a character was created very recently (within last 2 seconds)
    const recentCharacters = house.characters?.filter(char => {
      const createdAt = new Date(char.createdAt);
      const timeDiff = Date.now() - createdAt.getTime();
      return timeDiff < 2000; // 2 seconds
    }) || [];
    
    if (recentCharacters.length > 0) {
      console.log('Character created very recently, preventing duplicate creation');
      return Promise.reject('Recent character creation detected');
    }
    
    setIsCreating(true);
    isCreatingRef.current = true;
    
    try {
      console.log('Starting character creation...');
      const character = await generateRandomCharacter(config, house);
      
      console.log('Generated character:', character.name, 'with ID:', character.id);
      
      // Double-check current house state at time of addition
      const currentCharacters = house.characters || [];
      const nameExists = currentCharacters.some(c => c.name === character.name);
      const idExists = currentCharacters.some(c => c.id === character.id);
      
      if (nameExists) {
        console.warn('Character with this name already exists:', character.name);
        return Promise.reject('Character name already exists');
      }
      
      if (idExists) {
        console.warn('Character with this ID already exists:', character.id);
        return Promise.reject('Character ID already exists');
      }
      
      // Use the proper addCharacter function from useHouse instead of direct house update
      // This ensures proper room residents sync and initialization
      console.log('Adding character to house:', character.name);
      addCharacter(character);
      
      console.log('Character creation completed successfully:', character.name);
      return character;
    } catch (error) {
      console.error('Error in createRandomCharacter:', error);
      throw error;
    } finally {
      // Add small delay before allowing next creation
      setTimeout(() => {
        setIsCreating(false);
        isCreatingRef.current = false;
      }, 500);
    }
  };

  const scheduleNextCreation = () => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      console.log('Clearing existing timeout');
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (!house?.autoCreator?.enabled) {
      console.log('Auto creator is disabled, not scheduling');
      return;
    }
    
    const interval = (house.autoCreator?.interval || 30) * 60 * 1000; // Convert minutes to ms
    const nextTime = new Date(Date.now() + interval);
    setNextCreationTime(nextTime);
    
    console.log(`Scheduling next character creation in ${interval}ms (${house.autoCreator?.interval || 30} minutes)`);
    
    timeoutRef.current = setTimeout(() => {
      console.log('Auto creation timer triggered');
      // Check current house state at execution time
      const currentHouse = house; // This will be the latest house from the hook
      const currentCharacterCount = currentHouse.characters?.length || 0;
      const maxCharacters = currentHouse.autoCreator?.maxCharacters || 20;
      
      console.log(`Current characters: ${currentCharacterCount}, Max: ${maxCharacters}`);
      
      if (currentCharacterCount < maxCharacters) {
        console.log('Creating new character automatically...');
        createRandomCharacter().then((character) => {
          console.log('Auto-created character:', character.name);
          if (currentHouse.autoCreator?.enabled) {
            console.log('Scheduling next creation...');
            scheduleNextCreation();
          }
        }).catch((error) => {
          console.error('Failed to auto-create character:', error);
          // Still schedule next creation even if this one failed
          if (currentHouse.autoCreator?.enabled) {
            scheduleNextCreation();
          }
        });
      } else {
        console.log('Max characters reached, not creating');
        // Still schedule next creation to check again later
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