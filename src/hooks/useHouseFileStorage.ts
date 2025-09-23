/**
 * useHouseFileStorage Hook
 * 
 * New version of useHouse that uses file-based storage instead of browserStorage
 * Separates house data from character data for better organization
 */

import { legacyStorage } from '@/lib/legacyStorage';
import { logger } from '@/lib/logger';
import { storage } from '@/storage';
import { Character, House } from '@/types';
import { useCallback, useEffect, useState } from 'react';
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
  const [houseData, setHouseDataState] = useState<Partial<House>>(DEFAULT_HOUSE);
  const [characters, setCharactersState] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const STORAGE_EVENT = 'house-storage-updated';

  const dedupeCharacters = useCallback((list: Character[]): Character[] => {
    const byId = new Set<string>();
    const byName = new Set<string>();
    const out: Character[] = [];
    for (const c of list) {
      const idKey = c.id;
      const nameKey = (c.name || '').trim().toLowerCase();
      if (byId.has(idKey) || (nameKey && byName.has(nameKey))) {
        continue;
      }
      byId.add(idKey);
      if (nameKey) byName.add(nameKey);
      out.push(c);
    }
    return out;
  }, []);

  // Load data from storage on mount
  useEffect(() => {
  let cancelled = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const loadData = async (attempt = 0) => {
      try {
        setIsLoading(true);

        if (!storage) {
          if (attempt < 5) {
            logger.warn('[useHouseFileStorage] Storage not ready, retrying...', attempt + 1);
            retryTimer = setTimeout(() => loadData(attempt + 1), 300 + attempt * 200);
            return;
          } else {
            logger.error('[useHouseFileStorage] Storage not initialized after retries');
            return;
          }
        }

        // Load house data from settings table
        const savedHouse = await storage.get('settings', 'house');
        if (savedHouse && (savedHouse as { value?: string }).value) {
          try {
            const houseData = JSON.parse((savedHouse as { value: string }).value);
            if (!cancelled) setHouseDataState(houseData);
          } catch {
            logger.warn('[useHouseFileStorage] Failed parsing saved house JSON');
          }
        }

        // Load characters from settings table
        let loadedCharacters: unknown[] | null = null;
        const savedCharacters = await storage.get('settings', 'characters');
        if (savedCharacters && (savedCharacters as { value?: string }).value) {
          try {
            const charactersData = JSON.parse((savedCharacters as { value: string }).value);
            if (Array.isArray(charactersData)) {
              loadedCharacters = charactersData;
            }
          } catch {
            logger.warn('[useHouseFileStorage] Failed parsing saved characters JSON');
          }
        }

        // Migration fallback: if no characters in settings, look for legacy 'characters' table rows (IndexedDB / other engine)
        if (!loadedCharacters || loadedCharacters.length === 0) {
          try {
            const legacyRows = await storage.query<{ id: string; profile_json?: string; name?: string; created_at?: string; updated_at?: string } | any>({ table: 'characters' });
            if (Array.isArray(legacyRows) && legacyRows.length) {
              logger.log('[useHouseFileStorage] Migrating legacy character rows -> settings key');
              // Each legacy row has profile_json with original character shape (maybe partial)
              const migrated: Character[] = legacyRows.map(r => {
                let profile: Record<string, unknown> = {};
                try { profile = r.profile_json ? JSON.parse(r.profile_json) : {}; } catch {
                  // ignore parse errors per legacy tolerance
                }
                return {
                  // Core identity
                  id: r.id,
                  name: r.name || profile.name || 'Unnamed',
                  // Basic required fields with fallbacks
                  description: profile.description || profile.bio || '',
                  personality: profile.personality || profile.prompts?.personality || '',
                  appearance: profile.appearance || profile.imageDescription || '',
                  avatar: profile.avatar,
                  gender: profile.gender,
                  age: profile.age,
                  roomId: profile.roomId,
                  // Stats (ensure structure)
                  stats: profile.stats || { love:0,happiness:0,wet:0,willing:0,selfEsteem:0,loyalty:0,fight:0,stamina:0,pain:0,experience:0,level:1 },
                  skills: profile.skills || { hands:0,mouth:0,missionary:0,doggy:0,cowgirl:0 },
                  role: profile.role || 'character',
                  personalities: profile.personalities || [],
                  features: profile.features || [],
                  classes: profile.classes || [],
                  unlocks: profile.unlocks || [],
                  rarity: profile.rarity || 'common',
                  specialAbility: profile.specialAbility,
                  preferredRoomType: profile.preferredRoomType,
                  imageDescription: profile.imageDescription,
                  physicalStats: profile.physicalStats,
                  prompts: profile.prompts || { system: profile.prompts?.system || '', personality: profile.prompts?.personality || '', background: profile.prompts?.background || '' },
                  lastInteraction: profile.lastInteraction ? new Date(profile.lastInteraction) : undefined,
                  conversationHistory: profile.conversationHistory || [],
                  memories: profile.memories || [],
                  preferences: profile.preferences || {},
                  relationships: profile.relationships || {},
                  progression: profile.progression || {
                    level: 1, nextLevelExp: 100, unlockedFeatures: [], achievements: [],
                    relationshipStatus: 'stranger', affection:0, trust:0, intimacy:0, dominance:50, jealousy:0, possessiveness:0,
                    sexualExperience:0, kinks:[], limits:[], fantasies:[], unlockedPositions:[], unlockedOutfits:[], unlockedToys:[], unlockedScenarios:[],
                    relationshipMilestones:[], sexualMilestones:[], significantEvents:[], storyChronicle:[], memorableEvents:[], bonds:{}, sexualCompatibility:{ overall:0,kinkAlignment:0,stylePreference:0 },
                    userPreferences:{ likes:[], dislikes:[], turnOns:[], turnOffs:[] }
                  },
                  createdAt: profile.createdAt ? new Date(profile.createdAt) : new Date(r.created_at || Date.now()),
                  updatedAt: profile.updatedAt ? new Date(profile.updatedAt) : new Date(r.updated_at || Date.now()),
                  autoGenerated: profile.autoGenerated
                } as Character;
              });
              loadedCharacters = migrated;
              // Persist migrated list
              await saveToStorage('characters', migrated);
              logger.log(`[useHouseFileStorage] Migrated ${migrated.length} character(s) from legacy table.`);
            }
          } catch (e) {
              logger.warn('[useHouseFileStorage] Legacy character migration attempt failed:', e);
          }
        }

  // Secondary recovery: attempt to read from sqlite-wasm backup (if our unified db previously persisted characters in messages/participants schema)
        if ((!loadedCharacters || !loadedCharacters.length) && typeof window !== 'undefined') {
          try {
              const lsBackup = legacyStorage.getItem('dollhouse-db-backup');
            if (lsBackup) {
              const parsed = JSON.parse(lsBackup);
              if (parsed && Array.isArray(parsed.characters) && parsed.characters.length) {
                logger.log('[useHouseFileStorage] Recovering characters from sqlite backup storage');
                // sqlite row structure: id, name, avatar_path, bio, traits_json, tags_json, system_prompt
                const migrated = parsed.characters.map((r: any) => {
                  let traits: any = {}; let tags: any = {};
                  try { traits = r.traits_json ? JSON.parse(r.traits_json) : {}; } catch {}
                  try { tags = r.tags_json ? JSON.parse(r.tags_json) : {}; } catch {}
                  return {
                    id: r.id,
                    name: r.name || 'Unnamed',
                    description: r.bio || '',
                    personality: traits.personality || '',
                    appearance: traits.appearance || '',
                    avatar: r.avatar_path || traits.avatar,
                    gender: traits.gender,
                    age: traits.age,
                    roomId: traits.roomId,
                    stats: traits.stats || { love:0,happiness:0,wet:0,willing:0,selfEsteem:0,loyalty:0,fight:0,stamina:0,pain:0,experience:0,level:1 },
                    skills: traits.skills || { hands:0,mouth:0,missionary:0,doggy:0,cowgirl:0 },
                    role: traits.role || 'character',
                    personalities: traits.personalities || [],
                    features: traits.features || [],
                    classes: traits.classes || [],
                    unlocks: traits.unlocks || [],
                    rarity: traits.rarity || 'common',
                    specialAbility: traits.specialAbility,
                    preferredRoomType: traits.preferredRoomType,
                    imageDescription: traits.imageDescription,
                    physicalStats: traits.physicalStats,
                    prompts: traits.prompts || { system: r.system_prompt || '', personality: traits.prompts?.personality || '', background: traits.prompts?.background || '' },
                    lastInteraction: traits.lastInteraction ? new Date(traits.lastInteraction) : undefined,
                    conversationHistory: traits.conversationHistory || [],
                    memories: traits.memories || [],
                    preferences: traits.preferences || {},
                    relationships: traits.relationships || {},
                    progression: traits.progression || {
                      level: 1, nextLevelExp: 100, unlockedFeatures: [], achievements: [],
                      relationshipStatus: 'stranger', affection:0, trust:0, intimacy:0, dominance:50, jealousy:0, possessiveness:0,
                      sexualExperience:0, kinks:[], limits:[], fantasies:[], unlockedPositions:[], unlockedOutfits:[], unlockedToys:[], unlockedScenarios:[],
                      relationshipMilestones:[], sexualMilestones:[], significantEvents:[], storyChronicle:[], memorableEvents:[], bonds:{}, sexualCompatibility:{ overall:0,kinkAlignment:0,stylePreference:0 },
                      userPreferences:{ likes:[], dislikes:[], turnOns:[], turnOffs:[] }
                    },
                    createdAt: r.created_at ? new Date(r.created_at) : new Date(),
                    updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
                    autoGenerated: traits.autoGenerated
                  } as Character;
                });
                if (migrated.length) {
                  loadedCharacters = migrated;
                  await saveToStorage('characters', migrated);
                  logger.log(`[useHouseFileStorage] Recovered ${migrated.length} character(s) from sqlite backup.`);
                }
              }
            }
          } catch (e) {
            logger.warn('[useHouseFileStorage] sqlite backup recovery failed:', e);
          }
        }

        // Tertiary recovery: look for a raw legacy JSON blob in legacy backup (older builds may have stored directly)
        if ((!loadedCharacters || !loadedCharacters.length) && typeof window !== 'undefined') {
          try {
            const legacyRaw = legacyStorage.getItem('characters');
            if (legacyRaw) {
              const parsedLegacy = JSON.parse(legacyRaw);
              if (Array.isArray(parsedLegacy) && parsedLegacy.length) {
                logger.log('[useHouseFileStorage] Recovering characters from legacy backup key');
                loadedCharacters = parsedLegacy;
                await saveToStorage('characters', parsedLegacy);
              }
            }
          } catch (e) {
            logger.warn('[useHouseFileStorage] Legacy raw backup recovery failed:', e);
          }
        }

                if (loadedCharacters && Array.isArray(loadedCharacters) && loadedCharacters.length) {
          const deduped = dedupeCharacters(loadedCharacters as Character[]);
          if (!cancelled) setCharactersState(deduped);
          if (deduped.length !== loadedCharacters.length) {
            await saveToStorage('characters', deduped);
          }
          logger.log('[useHouseFileStorage] Loaded characters:', deduped.map(c => c.name));
        } else {
          logger.log('[useHouseFileStorage] No characters found in settings or legacy sources.');
        }
      } catch (error) {
        logger.error('Failed to load house data:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  // Expose an imperative recovery helper for debugging/manual rescue
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        // attach a recover helper for debugging in browser environments
        (window as unknown as { recoverCharacters?: () => Promise<void> }).recoverCharacters = async () => {
          logger.log('[recoverCharacters] Manual recovery triggered');
          try {
            const event = new CustomEvent('force-recover');
            window.dispatchEvent(event);
          } catch (e) {
            logger.debug('Ignored error while triggering recoverCharacters', e);
          }
        };
      }
    } catch (e) {
      logger.debug('Ignored environment error while initializing recoverCharacters', e);
    }
  }, []);

  // Save data to storage helper
  const saveToStorage = useCallback(async (key: string, data: any) => {
    try {
      if (!storage) {
                logger.error('Storage not initialized');
        return false;
      }
      // Use settings table for key-value storage
      await storage.put('settings', { id: key, key: key, value: JSON.stringify(data) });
      // Broadcast change so all hook instances can refresh
      try {
        window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: { key } } as any));
      } catch {
        // ignore if not in browser
      }
      return true;
    } catch (error) {
      logger.error(`Failed to save ${key}:`, error);
      return false;
    }
  }, []);

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

  // Listen for external updates to keep all instances in sync
  useEffect(() => {
    const onStorageUpdate = async (ev: Event) => {
      const detail = (ev as CustomEvent).detail || {};
      const key = detail.key as string | undefined;

      try {
        if (!storage) return;
        if (!key || key === 'house') {
          const savedHouse = await storage.get('settings', 'house');
          if (savedHouse && (savedHouse as any).value) {
            const parsed = JSON.parse((savedHouse as any).value);
            setHouseDataState(parsed);
          }
        }
        if (!key || key === 'characters') {
          const savedCharacters = await storage.get('settings', 'characters');
          if (savedCharacters && (savedCharacters as any).value) {
            const parsed = JSON.parse((savedCharacters as any).value);
            if (Array.isArray(parsed)) {
              setCharactersState(parsed);
            }
          }
        }
      } catch (e) {
  logger.error('Failed to sync storage update:', e);

// ensure logger is available
      }
    };

    try {
      if (typeof (globalThis as any).addEventListener === 'function') {
        (globalThis as any).addEventListener(STORAGE_EVENT, onStorageUpdate as any);
      }
    } catch (e) {
      logger.debug('Ignored event listener registration error', e);
    }
    return () => {
      try {
        if (typeof (globalThis as any).removeEventListener === 'function') {
          (globalThis as any).removeEventListener(STORAGE_EVENT, onStorageUpdate as any);
        }
      } catch (e) {
        logger.debug('Ignored event listener removal error', e);
      }
    };
  }, []);

  // Ensure in-memory state stays deduped even if duplicates slip in
  useEffect(() => {
    const deduped = dedupeCharacters(characters);
    if (deduped.length !== characters.length) {
      setCharactersState(deduped);
      // Persist the cleaned list
      saveToStorage('characters', deduped);
    }
  }, [characters, dedupeCharacters, saveToStorage]);

  // Character management functions
  const addCharacter = useCallback(async (character: Character): Promise<boolean> => {
    try {
      // Check for duplicates
      const existingCharacter = characters.find(c => 
        c.id === character.id || 
        c.name.toLowerCase() === character.name.toLowerCase()
      );
      
      if (existingCharacter) {
        logger.warn('Character already exists:', character.name);
        return false;
      }

  const newCharacters = dedupeCharacters([...characters, character]);
      const success = await saveToStorage('characters', newCharacters);
      
      if (success) {
        setCharactersState(newCharacters);
  logger.log('Character added successfully:', character.name);
  logger.log('[useHouseFileStorage] Characters after add:', newCharacters.map(c => c.name));
        toast.success(`${character.name} joined the house!`);
      }
      
      return success;
      } catch (error) {
      logger.error('Failed to add character:', error);
      toast.error('Failed to add character');
      return false;
    }
  }, [characters, saveToStorage]);

  const removeCharacter = useCallback(async (characterId: string): Promise<boolean> => {
    try {
      const character = characters.find(c => c.id === characterId);
      if (!character) {
        logger.warn('Character not found:', characterId);
        return false;
      }

  const newCharacters = dedupeCharacters(characters.filter(c => c.id !== characterId));
      const success = await saveToStorage('characters', newCharacters);
      
      if (success) {
        setCharactersState(newCharacters);
  logger.log('Character removed successfully:', character.name);
        toast.success(`${character.name} left the house`);
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to remove character:', error);
      toast.error('Failed to remove character');
      return false;
    }
  }, [characters, saveToStorage]);

  const updateCharacter = useCallback(async (characterId: string, updates: Partial<Character>): Promise<boolean> => {
    try {
      const newCharacters = dedupeCharacters(
        characters.map(c => 
          c.id === characterId 
            ? { ...c, ...updates, updatedAt: new Date() }
            : c
        )
      );
      
      const success = await saveToStorage('characters', newCharacters);
      
      if (success) {
        setCharactersState(newCharacters);
        logger.log('Character updated successfully:', characterId);
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to update character:', error);
      toast.error('Failed to update character');
      return false;
    }
  }, [characters, saveToStorage]);

  // House management functions
  const updateHouse = useCallback(async (updates: Partial<House>): Promise<boolean> => {
    try {
      const newHouseData = {
        ...houseData,
        ...updates,
        updatedAt: new Date()
      };
      
      const success = await saveToStorage('house', newHouseData);
      
      if (success) {
        setHouseDataState(newHouseData);
        logger.log('House updated successfully');
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to update house:', error);
      toast.error('Failed to update house');
      return false;
    }
  }, [houseData, saveToStorage]);

  const addRoom = useCallback(async (room: House['rooms'][0]): Promise<boolean> => {
    try {
      const newHouseData = {
        ...houseData,
        rooms: [...(houseData.rooms || []), room],
        updatedAt: new Date()
      };
      
      const success = await saveToStorage('house', newHouseData);
      
      if (success) {
        setHouseDataState(newHouseData);
        logger.log('Room added successfully:', room.name);
        toast.success(`${room.name} added to the house!`);
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to add room:', error);
      toast.error('Failed to add room');
      return false;
    }
  }, [houseData, saveToStorage]);

  const removeRoom = useCallback(async (roomId: string): Promise<boolean> => {
    try {
      const newHouseData = {
        ...houseData,
        rooms: (houseData.rooms || []).filter(r => r.id !== roomId),
        updatedAt: new Date()
      };
      
      const success = await saveToStorage('house', newHouseData);
      
      if (success) {
        setHouseDataState(newHouseData);
        logger.log('Room removed successfully:', roomId);
        toast.success('Room removed from the house');
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to remove room:', error);
      toast.error('Failed to remove room');
      return false;
    }
  }, [houseData, saveToStorage]);

  // Character room assignment
  const assignCharacterToRoom = useCallback(async (characterId: string, roomId: string): Promise<boolean> => {
    try {
      // Update character's room
      const characterSuccess = await updateCharacter(characterId, { roomId: roomId });
      
      if (!characterSuccess) return false;

      // Update room's residents
      const newHouseData = {
        ...houseData,
        rooms: (houseData.rooms || []).map(room => 
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
      };
      
      const roomSuccess = await saveToStorage('house', newHouseData);
      
      if (roomSuccess) {
        setHouseDataState(newHouseData);
        logger.log('Character assigned to room successfully:', characterId, roomId);
      }
      
      return roomSuccess;
    } catch (error) {
      logger.error('Failed to assign character to room:', error);
      toast.error('Failed to assign character to room');
      return false;
    }
  }, [updateCharacter, houseData, saveToStorage]);

  // Get characters in a specific room
  const getCharactersInRoom = useCallback((roomId: string): Character[] => {
    return characters.filter(character => character.roomId === roomId);
  }, [characters]);

  // Get available rooms for a character
  const getAvailableRooms = useCallback(() => {
    return house.rooms.filter(room => room.unlocked);
  }, [house.rooms]);

  // Add characters to the house object for backward compatibility
  const houseWithCharacters = {
    ...house,
    characters: characters || []
  };

  return {
    // Data
    house: houseWithCharacters,
    characters,
    
    // Loading and error states
    isLoading,
    hasError: false,
    
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
    setHouseData: setHouseDataState,
    setCharacters: setCharactersState
  };
}

export default useHouseFileStorage;