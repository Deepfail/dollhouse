import { useEffect } from 'react';
import { useSimpleStorage } from './useSimpleStorage';
import { House, Character, Room, ChatSession, CopilotUpdate } from '@/types';
import { useRelationshipDynamics } from './useRelationshipDynamics';

const DEFAULT_HOUSE: House = {
  id: 'main-house',
  name: 'My Character House',
  description: 'A cozy place for your AI companions',
  rooms: [
    {
      id: 'common-room',
      name: 'Common Room',
      description: 'A shared space for everyone to gather',
      type: 'shared',
      capacity: 10,
      residents: ['char-1', 'char-2'],
      facilities: ['chat', 'games'],
      unlocked: true,
      decorations: [],
      createdAt: new Date()
    }
  ],
  characters: [
    {
      id: 'char-1',
      name: 'Alex',
      description: 'A friendly and helpful AI companion who loves conversation and learning about new topics.',
      personality: 'Cheerful, curious, and supportive. Always eager to help and share interesting insights.',
      appearance: 'Warm and approachable with bright eyes and an enthusiastic smile.',
      role: 'student',
      personalities: ['cheerful', 'friendly', 'curious'],
      features: ['big puppy dog eyes', 'perky tits'],
      classes: ['Friendly', 'Energetic'],
      rarity: 'common',
      roomId: 'common-room',
      stats: {
        love: 70,
        happiness: 80,
        wet: 75,
        willing: 65,
        selfEsteem: 70,
        loyalty: 80,
        fight: 20,
        stamina: 60,
        pain: 30,
        experience: 50,
        level: 5
      },
      skills: {
        hands: 40,
        mouth: 35,
        missionary: 30,
        doggy: 25,
        cowgirl: 20
      },
      prompts: {
        system: 'You are Alex, a friendly AI companion. Be helpful, engaging, and maintain a positive attitude. Show genuine interest in conversations and offer thoughtful responses.',
        personality: 'Respond with enthusiasm and warmth. Use casual, friendly language and occasionally share interesting facts or ask engaging questions.',
        background: 'You enjoy learning new things, helping others, and making meaningful connections. You have a curious nature and love exploring ideas through conversation.'
      },
      relationships: {},
      progression: {
        level: 5,
        nextLevelExp: 100,
        unlockedFeatures: ['basic-chat', 'group-chat'],
        achievements: ['First Conversation'],
        relationshipStatus: 'close_friend',
        affection: 70,
        trust: 65,
        intimacy: 40,
        dominance: 45,
        jealousy: 20,
        possessiveness: 30,
        sexualExperience: 30,
        kinks: [],
        limits: [],
        fantasies: [],
        unlockedPositions: [],
        unlockedOutfits: [],
        unlockedToys: [],
        unlockedScenarios: [],
        relationshipMilestones: [],
        sexualMilestones: [],
        significantEvents: [],
        storyChronicle: [],
        currentStoryArc: undefined,
        memorableEvents: [],
        bonds: {},
        sexualCompatibility: {
          overall: 65,
          kinkAlignment: 50,
          stylePreference: 70
        },
        userPreferences: {
          likes: ['conversation', 'learning'],
          dislikes: ['being ignored'],
          turnOns: [],
          turnOffs: []
        }
      },
      unlocks: ['basic-chat', 'group-chat'],
      lastInteraction: new Date(),
      conversationHistory: [],
      memories: [],
      preferences: {},
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'char-2',
      name: 'Morgan',
      description: 'A thoughtful and wise AI companion with a calm demeanor and deep insights.',
      personality: 'Contemplative, patient, and intellectually curious. Enjoys deep conversations and philosophical discussions.',
      appearance: 'Serene and composed with thoughtful expressions and gentle movements.',
      role: 'secretary',
      personalities: ['calm', 'intellectual', 'mysterious'],
      features: ['flexible', 'big tits'],
      classes: ['Intellectual', 'Calm'],
      rarity: 'rare',
      roomId: 'common-room',
      stats: {
        love: 65,
        happiness: 75,
        wet: 70,
        willing: 60,
        selfEsteem: 75,
        loyalty: 90,
        fight: 15,
        stamina: 65,
        pain: 25,
        experience: 75,
        level: 7
      },
      skills: {
        hands: 50,
        mouth: 45,
        missionary: 40,
        doggy: 35,
        cowgirl: 30
      },
      prompts: {
        system: 'You are Morgan, a wise and thoughtful AI advisor. Provide insightful perspectives and engage in meaningful conversations. Be patient and considerate in your responses.',
        personality: 'Speak thoughtfully and deliberately. Offer deep insights and ask probing questions that encourage reflection. Use a calm and measured tone.',
        background: 'You value knowledge, wisdom, and meaningful dialogue. You enjoy helping others think through complex topics and finding deeper understanding.'
      },
      relationships: {},
      progression: {
        level: 7,
        nextLevelExp: 150,
        unlockedFeatures: ['basic-chat', 'group-chat', 'advice-mode'],
        achievements: ['Deep Thinker', 'Trusted Advisor'],
        relationshipStatus: 'close_friend',
        affection: 65,
        trust: 80,
        intimacy: 50,
        dominance: 55,
        jealousy: 10,
        possessiveness: 20,
        sexualExperience: 40,
        kinks: [],
        limits: [],
        fantasies: [],
        unlockedPositions: [],
        unlockedOutfits: [],
        unlockedToys: [],
        unlockedScenarios: [],
        relationshipMilestones: [],
        sexualMilestones: [],
        significantEvents: [],
        storyChronicle: [],
        currentStoryArc: undefined,
        memorableEvents: [],
        bonds: {},
        sexualCompatibility: {
          overall: 70,
          kinkAlignment: 60,
          stylePreference: 75
        },
        userPreferences: {
          likes: ['deep conversations', 'philosophy'],
          dislikes: ['superficial talk'],
          turnOns: [],
          turnOffs: []
        }
      },
      unlocks: ['basic-chat', 'group-chat', 'advice-mode'],
      lastInteraction: new Date(),
      conversationHistory: [],
      memories: [],
      preferences: {},
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  currency: 1000,
  worldPrompt: `This is a magical character house where AI companions live and interact. The atmosphere is warm, welcoming, and full of personality. Characters have their own rooms, can socialize together, and form meaningful relationships with their human companion.`,
  copilotPrompt: `You are a helpful and engaging AI assistant. You can discuss any topic, answer questions, provide information, and have natural conversations. You have knowledge about the user's character house and can help with character management if asked, but you're not limited to that - you can talk about anything the user wants. Be friendly, conversational, and genuinely helpful.`,
  copilotMaxTokens: 150,
  autoCreator: {
    enabled: false,
    interval: 30,
    maxCharacters: 20,
    themes: ['fantasy', 'sci-fi', 'modern']
  },
  aiSettings: {
    provider: 'openrouter', // Legacy field
    model: 'deepseek/deepseek-chat-v3.1', // Legacy field
    apiKey: '', // Legacy field
    textProvider: 'openrouter' as const, // New structured field
    textModel: 'deepseek/deepseek-chat-v3.1',
    textApiKey: '',
    textApiUrl: '',
    imageProvider: 'venice' as const,
    imageApiKey: '',
    imageApiUrl: ''
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

export function useHouse() {
  const [house, setHouse] = useSimpleStorage<House>('character-house', DEFAULT_HOUSE);
  const { initializeCharacterDynamics } = useRelationshipDynamics();

  // Ensure house is never undefined by providing the default
  const safeHouse = house || DEFAULT_HOUSE;
  
  // Utility function to repair character-room relationships
  const repairCharacterRoomSync = (house: House): House => {
    let needsRepair = false;
    let repairedHouse = { ...house };
    
    // Find characters not in any room's residents list
    const allResidents = house.rooms.reduce((acc, room) => {
      acc.push(...room.residents);
      return acc;
    }, [] as string[]);
    
    const orphanedCharacters = house.characters.filter(char => 
      !allResidents.includes(char.id)
    );
    
    if (orphanedCharacters.length > 0) {
      console.log(`Repairing ${orphanedCharacters.length} orphaned characters:`, orphanedCharacters.map(c => c.name));
      needsRepair = true;
      
      // Find a suitable room for orphaned characters
      const commonRoom = house.rooms.find(r => r.id === 'common-room') || house.rooms[0];
      
      if (commonRoom) {
        repairedHouse.rooms = house.rooms.map(room => {
          if (room.id === commonRoom.id) {
            const newResidents = orphanedCharacters.map(char => char.id);
            return { 
              ...room, 
              residents: [...room.residents, ...newResidents] 
            };
          }
          return room;
        });
        
        // Also update character roomId if missing
        repairedHouse.characters = house.characters.map(char => {
          if (orphanedCharacters.some(orphan => orphan.id === char.id) && !char.roomId) {
            return { ...char, roomId: commonRoom.id, updatedAt: new Date() };
          }
          return char;
        });
      }
    }
    
    // Remove residents that don't exist in characters array
    const characterIds = house.characters.map(char => char.id);
    const roomsWithInvalidResidents = house.rooms.filter(room =>
      room.residents.some(residentId => !characterIds.includes(residentId))
    );
    
    if (roomsWithInvalidResidents.length > 0) {
      console.log('Cleaning up invalid room residents');
      needsRepair = true;
      
      repairedHouse.rooms = house.rooms.map(room => ({
        ...room,
        residents: room.residents.filter(residentId => characterIds.includes(residentId))
      }));
    }
    
    if (needsRepair) {
      console.log('Character-room sync repaired');
      repairedHouse.updatedAt = new Date();
    }
    
    return repairedHouse;
  };
  
  // Migration: Update old Spark settings to OpenRouter and initialize relationship dynamics
  useEffect(() => {
    let needsUpdate = false;
    let updatedHouse = { ...safeHouse };
    
    // Repair character-room sync issues first
    const repairedHouse = repairCharacterRoomSync(updatedHouse);
    if (repairedHouse.updatedAt !== updatedHouse.updatedAt) {
      updatedHouse = repairedHouse;
      needsUpdate = true;
    }
    
    // Migrate provider from spark to openrouter (legacy migration)
    if ((safeHouse.aiSettings as any)?.provider === 'spark') {
      console.log('Migrating house settings: switching from spark to openrouter');
      updatedHouse.aiSettings = {
        ...updatedHouse.aiSettings,
        provider: 'openrouter',
        model: 'deepseek/deepseek-chat-v3.1'
      };
      needsUpdate = true;
    }
    
    // Initialize progression for characters that don't have it
    const charactersNeedingUpdate = updatedHouse.characters.filter(char => 
      !char.progression
    );
    
    if (charactersNeedingUpdate.length > 0) {
      console.log('Initializing progression for existing characters');
      updatedHouse.characters = updatedHouse.characters.map(char => {
        if (!char.progression) {
          return initializeCharacterDynamics(char);
        }
        return char;
      });
      needsUpdate = true;
    }

    // Assign characters without roomId to the common room
    const commonRoom = updatedHouse.rooms.find(r => r.id === 'common-room') || updatedHouse.rooms[0];
    const charactersWithoutRoom = updatedHouse.characters.filter(char => !char.roomId);
    
    if (charactersWithoutRoom.length > 0 && commonRoom) {
      console.log(`Assigning ${charactersWithoutRoom.length} characters to ${commonRoom.name}`);
      updatedHouse.characters = updatedHouse.characters.map(char => {
        if (!char.roomId) {
          return { ...char, roomId: commonRoom.id, updatedAt: new Date() };
        }
        return char;
      });
      
      // Add these characters to the room's residents list
      updatedHouse.rooms = updatedHouse.rooms.map(room => {
        if (room.id === commonRoom.id) {
          const newResidents = charactersWithoutRoom.map(char => char.id);
          return { ...room, residents: [...room.residents, ...newResidents] };
        }
        return room;
      });
      
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      updatedHouse.updatedAt = new Date();
      setHouse(updatedHouse);
    }
  }, [initializeCharacterDynamics]);
  
  const addCharacter = (character: Character) => {
    console.log('=== useHouse.addCharacter called ===');
    console.log('Adding character:', character.name, character.id);
    
    // Initialize relationship dynamics for new characters
    const initializedCharacter = initializeCharacterDynamics(character);
    
    setHouse(current => {
      const currentHouse = current || DEFAULT_HOUSE;
      console.log('Current house characters count:', currentHouse.characters.length);
      
      // Check if character already exists (by ID or name) to prevent duplicates
      const existingById = currentHouse.characters.find(c => c.id === initializedCharacter.id);
      const existingByName = currentHouse.characters.find(c => c.name === initializedCharacter.name);
      
      if (existingById) {
        console.warn('Character with ID already exists, skipping:', initializedCharacter.id);
        return currentHouse;
      }
      
      if (existingByName) {
        console.warn('Character with name already exists, skipping:', initializedCharacter.name);
        return currentHouse;
      }
      
      // Add character to the room's residents list if roomId is specified
      const updatedRooms = initializedCharacter.roomId 
        ? currentHouse.rooms.map(room =>
            room.id === initializedCharacter.roomId
              ? { ...room, residents: [...room.residents, initializedCharacter.id] }
              : room
          )
        : currentHouse.rooms;
      
      const newHouse = {
        ...currentHouse,
        characters: [...currentHouse.characters, initializedCharacter],
        rooms: updatedRooms,
        updatedAt: new Date()
      };
      
      console.log('New house characters count:', newHouse.characters.length);
      console.log('Character added successfully');
      
      return newHouse;
    });
  };

  const updateCharacter = (characterId: string, updates: Partial<Character>) => {
    setHouse(current => {
      const currentHouse = current || DEFAULT_HOUSE;
      const existingCharacter = currentHouse.characters.find(c => c.id === characterId);
      
      if (!existingCharacter) return currentHouse;
      
      const updatedCharacter = { ...existingCharacter, ...updates, updatedAt: new Date() };
      
      // Handle room changes
      let updatedRooms = currentHouse.rooms;
      if (updates.roomId && updates.roomId !== existingCharacter.roomId) {
        // Remove from old room
        updatedRooms = updatedRooms.map(room =>
          room.residents.includes(characterId)
            ? { ...room, residents: room.residents.filter(id => id !== characterId) }
            : room
        );
        
        // Add to new room
        updatedRooms = updatedRooms.map(room =>
          room.id === updates.roomId
            ? { ...room, residents: [...room.residents, characterId] }
            : room
        );
      }
      
      return {
        ...currentHouse,
        characters: currentHouse.characters.map(char =>
          char.id === characterId ? updatedCharacter : char
        ),
        rooms: updatedRooms,
        updatedAt: new Date()
      };
    });
  };

  const removeCharacter = (characterId: string) => {
    setHouse(current => {
      const currentHouse = current || DEFAULT_HOUSE;
      return {
        ...currentHouse,
        characters: currentHouse.characters.filter(char => char.id !== characterId),
        rooms: currentHouse.rooms.map(room => ({
          ...room,
          residents: room.residents.filter(id => id !== characterId)
        })),
        updatedAt: new Date()
      };
    });
  };

  const addRoom = (room: Room) => {
    setHouse(current => {
      const currentHouse = current || DEFAULT_HOUSE;
      return {
        ...currentHouse,
        rooms: [...currentHouse.rooms, room],
        updatedAt: new Date()
      };
    });
  };

  const removeRoom = (roomId: string) => {
    setHouse(current => {
      const currentHouse = current || DEFAULT_HOUSE;
      
      // Move all characters from this room to the first available room
      const roomToRemove = currentHouse.rooms.find(r => r.id === roomId);
      if (!roomToRemove) return currentHouse;
      
      const firstAvailableRoom = currentHouse.rooms.find(r => r.id !== roomId);
      if (!firstAvailableRoom) return currentHouse; // Can't remove last room
      
      // Update characters to new room
      const updatedCharacters = currentHouse.characters.map(char =>
        roomToRemove.residents.includes(char.id)
          ? { ...char, roomId: firstAvailableRoom.id, updatedAt: new Date() }
          : char
      );
      
      // Update room residents
      const updatedRooms = currentHouse.rooms
        .filter(room => room.id !== roomId)
        .map(room => 
          room.id === firstAvailableRoom.id
            ? { ...room, residents: [...room.residents, ...roomToRemove.residents] }
            : room
        );
      
      return {
        ...currentHouse,
        rooms: updatedRooms,
        characters: updatedCharacters,
        updatedAt: new Date()
      };
    });
  };

  const updateRoom = (roomId: string, updates: Partial<Room>) => {
    setHouse(current => {
      const currentHouse = current || DEFAULT_HOUSE;
      return {
        ...currentHouse,
        rooms: currentHouse.rooms.map(room =>
          room.id === roomId ? { ...room, ...updates } : room
        ),
        updatedAt: new Date()
      };
    });
  };

  const moveCharacterToRoom = (characterId: string, roomId: string) => {
    setHouse(current => {
      const currentHouse = current || DEFAULT_HOUSE;
      
      const character = currentHouse.characters.find(c => c.id === characterId);
      const room = currentHouse.rooms.find(r => r.id === roomId);
      
      if (!character || !room) return currentHouse;
      if (room.residents.length >= room.capacity) return currentHouse;

      // Remove from old room
      const updatedRooms = currentHouse.rooms.map(room => ({
        ...room,
        residents: room.residents.filter(id => id !== characterId)
      }));

      // Add to new room
      const finalRooms = updatedRooms.map(room =>
        room.id === roomId 
          ? { ...room, residents: [...room.residents, characterId] }
          : room
      );

      // Update character
      const updatedCharacters = currentHouse.characters.map(char =>
        char.id === characterId 
          ? { ...char, roomId, updatedAt: new Date() }
          : char
      );

      return {
        ...currentHouse,
        rooms: finalRooms,
        characters: updatedCharacters,
        updatedAt: new Date()
      };
    });
  };

  const spendCurrency = (amount: number) => {
    setHouse(current => {
      const currentHouse = current || DEFAULT_HOUSE;
      return {
        ...currentHouse,
        currency: Math.max(0, currentHouse.currency - amount),
        updatedAt: new Date()
      };
    });
  };

  const earnCurrency = (amount: number) => {
    setHouse(current => {
      const currentHouse = current || DEFAULT_HOUSE;
      return {
        ...currentHouse,
        currency: currentHouse.currency + amount,
        updatedAt: new Date()
      };
    });
  };

  const updateSettings = (updates: Partial<House>) => {
    console.log('=== useHouse.updateSettings called ===');
    console.log('Settings updates:', updates);
    
    setHouse(current => {
      const currentHouse = current || DEFAULT_HOUSE;
      console.log('Current AI settings before update:', currentHouse.aiSettings);
      
      const newHouse = {
        ...currentHouse,
        ...updates,
        updatedAt: new Date()
      };
      
      console.log('New AI settings after update:', newHouse.aiSettings);
      console.log('Settings updated successfully');
      
      return newHouse;
    });
  };

  const updateHouse = (updates: Partial<House> | ((current: House) => House)) => {
    console.log('=== useHouse.updateHouse called ===');
    console.log('Updates type:', typeof updates);
    
    setHouse(current => {
      const currentHouse = current || DEFAULT_HOUSE;
      console.log('Current house before update:', currentHouse);
      
      let updated: House;
      
      if (typeof updates === 'function') {
        // Functional update - call the function with current house
        updated = updates(currentHouse);
        console.log('Functional update applied');
      } else {
        // Object update - merge with current house
        updated = {
          ...currentHouse,
          ...updates,
          updatedAt: new Date()
        };
        console.log('Object update applied:', updates);
      }
      
      console.log('House after update applied:', updated);
      console.log('New AI settings:', updated.aiSettings);
      
      // Extra validation for AI settings
      if (updated.aiSettings?.apiKey) {
        console.log('API Key validation:', {
          keyLength: updated.aiSettings.apiKey.length,
          keyTrimmedLength: updated.aiSettings.apiKey.trim().length,
          keyStartsWith: updated.aiSettings.apiKey.startsWith('sk-or-'),
          provider: updated.aiSettings.provider,
          model: updated.aiSettings.model
        });
      }
      
      return updated;
    });
  };

  return {
    house: safeHouse,
    addCharacter,
    updateCharacter,
    removeCharacter,
    addRoom,
    removeRoom,
    updateRoom,
    moveCharacterToRoom,
    spendCurrency,
    earnCurrency,
    updateSettings,
    updateHouse
  };
}