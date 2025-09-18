// hooks/useAutoCharacterCreator.ts - Auto character creator using new storage
import { createCharacter, getSetting, setSetting } from '@/storage/adapters';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface AutoCreatorConfig {
  themes: string[];
  rarityWeights: { common: number; rare: number; legendary: number };
  maxCharacters: number;
  interval: number; // minutes
  enabled: boolean;
}

const DEFAULT_CONFIG: AutoCreatorConfig = {
  themes: ['fantasy', 'modern', 'sci-fi', 'anime', 'realistic'],
  rarityWeights: { common: 70, rare: 25, legendary: 5 },
  maxCharacters: 10,
  interval: 30,
  enabled: false
};

const CHARACTER_NAMES = [
  'Aria', 'Luna', 'Zara', 'Nova', 'Iris', 'Eden', 'Sage', 'Ember', 'Celeste', 'Violet',
  'Raven', 'Scarlett', 'Aurora', 'Willow', 'Ivy', 'Rose', 'Lily', 'Jasmine', 'Ruby', 'Pearl'
];

const CHARACTER_TRAITS = [
  'adventurous', 'creative', 'mysterious', 'cheerful', 'elegant', 'playful', 'wise', 'bold',
  'gentle', 'witty', 'charming', 'confident', 'dreamy', 'energetic', 'graceful', 'independent'
];

export function useAutoCharacterCreator() {
  const [isCreating, setIsCreating] = useState(false);
  const [config, setConfig] = useState<AutoCreatorConfig>(DEFAULT_CONFIG);
  const [nextCreationTime, setNextCreationTime] = useState<Date | null>(null);

  // Load config from storage
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const storedConfig = await getSetting('auto_character_creator_config');
      if (storedConfig) {
        setConfig({ ...DEFAULT_CONFIG, ...storedConfig });
      }
    } catch (error) {
      console.error('Failed to load auto creator config:', error);
    }
  };

  const saveConfig = async (newConfig: Partial<AutoCreatorConfig>) => {
    try {
      const updatedConfig = { ...config, ...newConfig };
      setConfig(updatedConfig);
      await setSetting('auto_character_creator_config', updatedConfig);
    } catch (error) {
      console.error('Failed to save auto creator config:', error);
      toast.error('Failed to save settings');
    }
  };

  const generateRandomCharacter = () => {
    const name = CHARACTER_NAMES[Math.floor(Math.random() * CHARACTER_NAMES.length)];
    const trait1 = CHARACTER_TRAITS[Math.floor(Math.random() * CHARACTER_TRAITS.length)];
    const trait2 = CHARACTER_TRAITS[Math.floor(Math.random() * CHARACTER_TRAITS.length)];
    const theme = config.themes[Math.floor(Math.random() * config.themes.length)];
    
    // Determine rarity based on weights
    const random = Math.random() * 100;
    let rarity: 'common' | 'rare' | 'legendary';
    if (random <= config.rarityWeights.common) {
      rarity = 'common';
    } else if (random <= config.rarityWeights.common + config.rarityWeights.rare) {
      rarity = 'rare';
    } else {
      rarity = 'legendary';
    }

    return {
      name,
      description: `A ${trait1} and ${trait2} character from the ${theme} realm.`,
      personality: `${trait1}, ${trait2}`,
      appearance: `A ${rarity} character with a ${theme} aesthetic.`,
      rarity
    };
  };

  const createRandomCharacter = useCallback(async () => {
    try {
      setIsCreating(true);
      
      const characterData = generateRandomCharacter();
      
      const characterId = await createCharacter({
        name: characterData.name,
        description: characterData.description,
        personality: characterData.personality,
        appearance: characterData.appearance
      });

      console.log('✨ Auto-created character:', characterData.name, characterId);
      toast.success(`Created ${characterData.name} (${characterData.rarity})!`);
      
      return characterData;
    } catch (error) {
      console.error('Failed to create random character:', error);
      toast.error('Failed to create character');
      throw error;
    } finally {
      setIsCreating(false);
    }
  }, [config]);

  const startCreating = useCallback(async () => {
    if (!config.enabled) {
      await saveConfig({ enabled: true });
    }
    
    const intervalMs = config.interval * 60 * 1000; // Convert minutes to milliseconds
    const nextTime = new Date(Date.now() + intervalMs);
    setNextCreationTime(nextTime);
    
    console.log('🤖 Auto character creator started');
    toast.success('Auto character creator enabled!');
  }, [config, saveConfig]);

  const stopCreating = useCallback(async () => {
    await saveConfig({ enabled: false });
    setNextCreationTime(null);
    
    console.log('🛑 Auto character creator stopped');
    toast.info('Auto character creator disabled');
  }, [saveConfig]);

  const toggleAutoCreator = useCallback(async () => {
    if (config.enabled) {
      await stopCreating();
    } else {
      await startCreating();
    }
  }, [config.enabled, startCreating, stopCreating]);

  const updateAutoCreatorConfig = useCallback(async (settings: { maxCharacters: number; interval: number }) => {
    await saveConfig(settings);
    toast.success('Auto creator settings updated');
  }, [saveConfig]);

  // Auto creation timer effect
  useEffect(() => {
    if (!config.enabled || !nextCreationTime) return;

    const timeUntilNext = nextCreationTime.getTime() - Date.now();
    if (timeUntilNext <= 0) return;

    const timer = setTimeout(async () => {
      try {
        // Check character count before creating
        // TODO: Get actual character count from storage
        const canCreate = true; // For now, always allow creation
        
        if (canCreate) {
          await createRandomCharacter();
          
          // Schedule next creation
          const intervalMs = config.interval * 60 * 1000;
          const nextTime = new Date(Date.now() + intervalMs);
          setNextCreationTime(nextTime);
        } else {
          console.log('🚫 Max characters reached, auto creator paused');
          await stopCreating();
        }
      } catch (error) {
        console.error('Auto creation failed:', error);
      }
    }, timeUntilNext);

    return () => clearTimeout(timer);
  }, [config, nextCreationTime, createRandomCharacter, stopCreating]);

  return {
    isCreating,
    startCreating,
    stopCreating,
    config,
    setConfig: saveConfig,
    createRandomCharacter,
    nextCreationTime,
    toggleAutoCreator,
    updateAutoCreatorConfig,
    isEnabled: config.enabled,
    maxCharacters: config.maxCharacters,
    interval: config.interval
  };
}