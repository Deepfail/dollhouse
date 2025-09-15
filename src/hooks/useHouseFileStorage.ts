/**
 * useHouseFileStorage Hook
 * 
 * New version of useHouse that uses file-based storage instead of browserStorage
 * Separates house data from character data for better organization
 */

import { useState, useEffect, useCallback } from 'react';
import { House, Character } from '@/types';
import { useFileStorage } from './useFileStorage';
import { toast } from 'sonner';

const DEFAULT_HOUSE: Partial<House> = {
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
  currency: 1000,
  worldPrompt: 'Welcome to your Character Creator House!',
  copilotPrompt: 'You are a helpful House Manager AI.',
  copilotMaxTokens: 75,
  autoCreator: {
    enabled: false,
    interval: 30,
    maxCharacters: 20,
    themes: ['college', 'prime', 'fresh']
  },
  aiSettings: {
    textProvider: 'openrouter',
    textModel: 'deepseek/deepseek-chat-v3.1',
    textApiKey: '',
    textApiUrl: '',
    imageProvider: 'venice',
    imageModel: 'lustify-sdxl',
    imageApiKey: '',
    imageApiUrl: ''
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

export function useHouseFileStorage() {
  // Separate file storage for house and characters
  const {
    data: houseData,
    setData: setHouseData,
    updateData: updateHouseData,
    isLoading: houseLoading,
    error: houseError
  } = useFileStorage<Partial<House>>('house', DEFAULT_HOUSE);

  const {
    data: characters,
    setData: setCharacters,
    updateData: updateCharacters,
    isLoading: charactersLoading,
    error: charactersError
  } = useFileStorage<Character[]>('characters', []);

  // Combine loading states
  const isLoading = houseLoading || charactersLoading;
  const error = houseError || charactersError;

  // Normalize house data to ensure required fields exist
  const normalizeHouse = useCallback((house: Partial<House>): House => {
    return {
      ...DEFAULT_HOUSE,
      ...house,
      id: house.id || DEFAULT_HOUSE.id!,
      name: house.name || DEFAULT_HOUSE.name!,
      description: house.description || DEFAULT_HOUSE.description!,
      rooms: house.rooms || DEFAULT_HOUSE.rooms!,
      currency: house.currency ?? DEFAULT_HOUSE.currency!,
      worldPrompt: house.worldPrompt || DEFAULT_HOUSE.worldPrompt!,
      copilotPrompt: house.copilotPrompt || DEFAULT_HOUSE.copilotPrompt!,
      copilotMaxTokens: house.copilotMaxTokens ?? DEFAULT_HOUSE.copilotMaxTokens!,
      autoCreator: house.autoCreator || DEFAULT_HOUSE.autoCreator!,
      aiSettings: house.aiSettings || DEFAULT_HOUSE.aiSettings!,
      createdAt: house.createdAt || DEFAULT_HOUSE.createdAt!,
      updatedAt: new Date()
    } as House;
  }, []);

  const house = normalizeHouse(houseData);

  // Character management functions
  const addCharacter = useCallback(async (character: Character): Promise<boolean> => {
    try {
      // Check for duplicates
      const existingCharacter = characters.find(c => 
        c.id === character.id || 
        c.name.toLowerCase() === character.name.toLowerCase()
      );
      
      if (existingCharacter) {
        console.warn('Character already exists:', character.name);
        return false;
      }

      const success = await updateCharacters(current => [...current, character]);
      
      if (success) {
        console.log('Character added successfully:', character.name);
        toast.success(`${character.name} joined the house!`);
      }
      
      return success;
    } catch (error) {
      console.error('Failed to add character:', error);
      toast.error('Failed to add character');
      return false;
    }
  }, [characters, updateCharacters]);

  const removeCharacter = useCallback(async (characterId: string): Promise<boolean> => {
    try {
      const character = characters.find(c => c.id === characterId);
      if (!character) {
        console.warn('Character not found:', characterId);
        return false;
      }

      const success = await updateCharacters(current => 
        current.filter(c => c.id !== characterId)
      );
      
      if (success) {
        console.log('Character removed successfully:', character.name);
        toast.success(`${character.name} left the house`);
      }
      
      return success;
    } catch (error) {
      console.error('Failed to remove character:', error);
      toast.error('Failed to remove character');
      return false;
    }
  }, [characters, updateCharacters]);

  const updateCharacter = useCallback(async (characterId: string, updates: Partial<Character>): Promise<boolean> => {
    try {
      const success = await updateCharacters(current => 
        current.map(c => 
          c.id === characterId 
            ? { ...c, ...updates, updatedAt: new Date() }
            : c
        )
      );
      
      if (success) {
        console.log('Character updated successfully:', characterId);
      }
      
      return success;
    } catch (error) {
      console.error('Failed to update character:', error);
      toast.error('Failed to update character');
      return false;
    }
  }, [updateCharacters]);

  // House management functions
  const updateHouse = useCallback(async (updates: Partial<House>): Promise<boolean> => {
    try {
      const success = await updateHouseData(current => ({
        ...current,
        ...updates,
        updatedAt: new Date()
      }));
      
      if (success) {
        console.log('House updated successfully');
      }
      
      return success;
    } catch (error) {
      console.error('Failed to update house:', error);
      toast.error('Failed to update house');
      return false;
    }
  }, [updateHouseData]);

  const addRoom = useCallback(async (room: House['rooms'][0]): Promise<boolean> => {
    try {
      const success = await updateHouseData(current => ({
        ...current,
        rooms: [...(current.rooms || []), room],
        updatedAt: new Date()
      }));
      
      if (success) {
        console.log('Room added successfully:', room.name);
        toast.success(`${room.name} added to the house!`);
      }
      
      return success;
    } catch (error) {
      console.error('Failed to add room:', error);
      toast.error('Failed to add room');
      return false;
    }
  }, [updateHouseData]);

  const removeRoom = useCallback(async (roomId: string): Promise<boolean> => {
    try {
      const success = await updateHouseData(current => ({
        ...current,
        rooms: (current.rooms || []).filter(r => r.id !== roomId),
        updatedAt: new Date()
      }));
      
      if (success) {
        console.log('Room removed successfully:', roomId);
        toast.success('Room removed from the house');
      }
      
      return success;
    } catch (error) {
      console.error('Failed to remove room:', error);
      toast.error('Failed to remove room');
      return false;
    }
  }, [updateHouseData]);

  // Character room assignment
  const assignCharacterToRoom = useCallback(async (characterId: string, roomId: string): Promise<boolean> => {
    try {
      // Update character's room
      const characterSuccess = await updateCharacter(characterId, { roomId: roomId });
      
      if (!characterSuccess) return false;

      // Update room's residents
      const roomSuccess = await updateHouseData(current => ({
        ...current,
        rooms: (current.rooms || []).map(room => 
          room.id === roomId 
            ? { 
                ...room, 
                residents: room.residents.includes(characterId) 
                  ? room.residents 
                  : [...room.residents, characterId]
              }
            : {
                ...room,
                residents: room.residents.filter(id => id !== characterId)
              }
        ),
        updatedAt: new Date()
      }));
      
      if (roomSuccess) {
        console.log('Character assigned to room successfully:', characterId, roomId);
      }
      
      return roomSuccess;
    } catch (error) {
      console.error('Failed to assign character to room:', error);
      toast.error('Failed to assign character to room');
      return false;
    }
  }, [updateCharacter, updateHouseData]);

  // Get characters in a specific room
  const getCharactersInRoom = useCallback((roomId: string): Character[] => {
    return characters.filter(character => character.roomId === roomId);
  }, [characters]);

  // Get available rooms for a character
  const getAvailableRooms = useCallback(() => {
    return house.rooms.filter(room => room.unlocked);
  }, [house.rooms]);

  return {
    // Data
    house,
    characters,
    
    // Loading and error states
    isLoading,
    error,
    hasError: error !== null,
    
    // Character operations
    addCharacter,
    removeCharacter,
    updateCharacter,
    
    // House operations
    updateHouse,
    addRoom,
    removeRoom,
    
    // Room management
    assignCharacterToRoom,
    getCharactersInRoom,
    getAvailableRooms,
    
    // Direct access to storage functions if needed
    setHouseData,
    setCharacters
  };
}

export default useHouseFileStorage;