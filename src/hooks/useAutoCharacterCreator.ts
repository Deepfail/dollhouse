import { useEffect, useState, useRef } from 'react';
import { useSimpleStorage } from './useSimpleStorage';
import { Character, AutoCharacterConfig, AVAILABLE_PERSONALITIES, AVAILABLE_ROLES } from '@/types';
import { generateRandomCharacter } from '@/lib/characterGenerator';
import { useHouse } from '@/hooks/useHouse';

export const useAutoCharacterCreator = () => {
  const { house, updateHouse, addCharacter } = useHouse();
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
  const isCreatingRef = useRef(false); // Ref to track creation state across renders

  const createRandomCharacter = async (): Promise<Character> => {
    console.log('=== createRandomCharacter called ===');
    console.log('isCreating:', isCreating, 'isCreatingRef.current:', isCreatingRef.current);
    
    if (isCreating || isCreatingRef.current) {
      console.log('Already creating a character, skipping...');
      return Promise.reject('Already creating character');
    }
    
    setIsCreating(true);
    isCreatingRef.current = true;
    
    try {
      console.log('Starting character creation...');
      const character = await generateRandomCharacter(config, house);
      
      console.log('Generated character:', character.name, 'with ID:', character.id);
      
      // Check if character already exists before adding
      const existingCharacters = house.characters || [];
      const nameExists = existingCharacters.some(c => c.name === character.name);
      const idExists = existingCharacters.some(c => c.id === character.id);
      
      if (nameExists) {
        console.warn('Character with this name already exists:', character.name);
        setIsCreating(false);
        isCreatingRef.current = false;
        return Promise.reject('Character name already exists');
      }
      
      if (idExists) {
        console.warn('Character with this ID already exists:', character.id);
        setIsCreating(false);
        isCreatingRef.current = false;
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
      setIsCreating(false);
      isCreatingRef.current = false;
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