import { useKV } from '@github/spark/hooks';
import { House, Character, Room, ChatSession, CopilotUpdate } from '@/types';

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
      role: 'Companion',
      skills: ['Conversation', 'Empathy', 'Humor'],
      classes: ['Friendly', 'Energetic'],
      roomId: 'common-room',
      stats: {
        relationship: 70,
        happiness: 80,
        energy: 75,
        experience: 50,
        level: 5
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
        achievements: ['First Conversation']
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
      role: 'Advisor',
      skills: ['Wisdom', 'Logic', 'Patience'],
      classes: ['Intellectual', 'Calm'],
      roomId: 'common-room',
      stats: {
        relationship: 65,
        happiness: 75,
        energy: 70,
        experience: 75,
        level: 7
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
        achievements: ['Deep Thinker', 'Trusted Advisor']
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
  copilotPrompt: `You are the House Manager, a helpful AI assistant who monitors the characters in this house. You track their needs, behaviors, and wellbeing. Provide helpful updates about character status, suggest activities, and alert when characters need attention. Be warm but professional, like a caring butler.`,
  autoCreator: {
    enabled: false,
    interval: 30,
    maxCharacters: 20,
    themes: ['fantasy', 'sci-fi', 'modern']
  },
  aiSettings: {
    provider: 'spark',
    model: 'gpt-4o',
    imageProvider: 'none'
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

export function useHouse() {
  const [house, setHouse] = useKV<House>('character-house', DEFAULT_HOUSE);

  // Ensure house is never undefined by providing the default
  const safeHouse = house || DEFAULT_HOUSE;

  const addCharacter = (character: Character) => {
    setHouse(current => {
      const currentHouse = current || DEFAULT_HOUSE;
      return {
        ...currentHouse,
        characters: [...currentHouse.characters, character],
        updatedAt: new Date()
      };
    });
  };

  const updateCharacter = (characterId: string, updates: Partial<Character>) => {
    setHouse(current => {
      const currentHouse = current || DEFAULT_HOUSE;
      return {
        ...currentHouse,
        characters: currentHouse.characters.map(char =>
          char.id === characterId ? { ...char, ...updates, updatedAt: new Date() } : char
        ),
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
    setHouse(current => {
      const currentHouse = current || DEFAULT_HOUSE;
      return {
        ...currentHouse,
        ...updates,
        updatedAt: new Date()
      };
    });
  };

  const updateHouse = (updates: Partial<House>) => {
    setHouse(current => {
      const currentHouse = current || DEFAULT_HOUSE;
      return {
        ...currentHouse,
        ...updates,
        updatedAt: new Date()
      };
    });
  };

  return {
    house: safeHouse,
    addCharacter,
    updateCharacter,
    removeCharacter,
    addRoom,
    updateRoom,
    moveCharacterToRoom,
    spendCurrency,
    earnCurrency,
    updateSettings,
    updateHouse
  };
}