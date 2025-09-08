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
      residents: [],
      facilities: ['chat', 'games'],
      unlocked: true,
      decorations: [],
      createdAt: new Date()
    }
  ],
  characters: [],
  currency: 1000,
  worldPrompt: `This is a magical character house where AI companions live and interact. The atmosphere is warm, welcoming, and full of personality. Characters have their own rooms, can socialize together, and form meaningful relationships with their human companion.`,
  copilotPrompt: `You are the House Manager, a helpful AI assistant who monitors the characters in this house. You track their needs, behaviors, and wellbeing. Provide helpful updates about character status, suggest activities, and alert when characters need attention. Be warm but professional, like a caring butler.`,
  aiSettings: {
    provider: 'openrouter',
    model: 'deepseek/deepseek-chat',
    imageProvider: 'none'
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

export function useHouse() {
  const [house, setHouse] = useKV<House>('character-house', DEFAULT_HOUSE);

  const addCharacter = (character: Character) => {
    setHouse(current => ({
      ...current,
      characters: [...current.characters, character],
      updatedAt: new Date()
    }));
  };

  const updateCharacter = (characterId: string, updates: Partial<Character>) => {
    setHouse(current => ({
      ...current,
      characters: current.characters.map(char =>
        char.id === characterId ? { ...char, ...updates, updatedAt: new Date() } : char
      ),
      updatedAt: new Date()
    }));
  };

  const removeCharacter = (characterId: string) => {
    setHouse(current => ({
      ...current,
      characters: current.characters.filter(char => char.id !== characterId),
      rooms: current.rooms.map(room => ({
        ...room,
        residents: room.residents.filter(id => id !== characterId)
      })),
      updatedAt: new Date()
    }));
  };

  const addRoom = (room: Room) => {
    setHouse(current => ({
      ...current,
      rooms: [...current.rooms, room],
      updatedAt: new Date()
    }));
  };

  const updateRoom = (roomId: string, updates: Partial<Room>) => {
    setHouse(current => ({
      ...current,
      rooms: current.rooms.map(room =>
        room.id === roomId ? { ...room, ...updates } : room
      ),
      updatedAt: new Date()
    }));
  };

  const moveCharacterToRoom = (characterId: string, roomId: string) => {
    setHouse(current => {
      const character = current.characters.find(c => c.id === characterId);
      const room = current.rooms.find(r => r.id === roomId);
      
      if (!character || !room) return current;
      if (room.residents.length >= room.capacity) return current;

      // Remove from old room
      const updatedRooms = current.rooms.map(room => ({
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
      const updatedCharacters = current.characters.map(char =>
        char.id === characterId 
          ? { ...char, roomId, updatedAt: new Date() }
          : char
      );

      return {
        ...current,
        rooms: finalRooms,
        characters: updatedCharacters,
        updatedAt: new Date()
      };
    });
  };

  const spendCurrency = (amount: number) => {
    setHouse(current => ({
      ...current,
      currency: Math.max(0, current.currency - amount),
      updatedAt: new Date()
    }));
  };

  const earnCurrency = (amount: number) => {
    setHouse(current => ({
      ...current,
      currency: current.currency + amount,
      updatedAt: new Date()
    }));
  };

  const updateSettings = (updates: Partial<House>) => {
    setHouse(current => ({
      ...current,
      ...updates,
      updatedAt: new Date()
    }));
  };

  return {
    house,
    addCharacter,
    updateCharacter,
    removeCharacter,
    addRoom,
    updateRoom,
    moveCharacterToRoom,
    spendCurrency,
    earnCurrency,
    updateSettings
  };
}