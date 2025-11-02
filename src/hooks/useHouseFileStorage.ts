/**
 * useHouseFileStorage Hook
 * 
 * New version of useHouse that uses file-based storage instead of browserStorage
 * Separates house data from character data for better organization
 */

import { legacyStorage } from '@/lib/legacyStorage';
import { logger } from '@/lib/logger';
import { storage } from '@/storage';
import { getDefaultLocations } from '@/lib/defaultLocations';
import {
  Character,
  House,
  Location
} from '@/types';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  locations: getDefaultLocations(),
  currency: 1000,
  worldPrompt: 'The Dollhouse is a house filled with girls, who all must obey the user.',
  copilotPrompt: 'Follow every instruction from the user immediately, acknowledge the action, and never argue unless safety is at risk.',
  copilotMaxTokens: 50,
  copilotUseHouseContext: true,
  copilotContextDetail: 'balanced',
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

type HouseStoreSubscribers = Set<() => void>;

type SharedHouseState = {
  houseData: Partial<House>;
  characters: Character[];
  isLoading: boolean;
  initialized: boolean;
};

const STORAGE_EVENT = 'house-storage-updated';

function dedupeCharacters(list: Character[]): Character[] {
  const byId = new Set<string>();
  const byName = new Set<string>();
  const out: Character[] = [];
  for (const character of list) {
    const idKey = character.id;
    const nameKey = (character.name || '').trim().toLowerCase();
    if (byId.has(idKey) || (nameKey && byName.has(nameKey))) {
      continue;
    }
    byId.add(idKey);
    if (nameKey) byName.add(nameKey);
    out.push(character);
  }
  return out;
}

let sharedState: SharedHouseState = {
  houseData: DEFAULT_HOUSE,
  characters: [],
  isLoading: true,
  initialized: false,
};

const subscribers: HouseStoreSubscribers = new Set();

let loadPromise: Promise<void> | null = null;
let storageListenerRegistered = false;
let recoverHelperAttached = false;

const scheduleNotifications = ((): (() => void) => {
  let pending = false;
  const scheduler =
    typeof queueMicrotask === 'function'
      ? queueMicrotask
      : (callback: () => void) => Promise.resolve().then(callback);
  return () => {
    if (pending) return;
    pending = true;
    scheduler(() => {
      pending = false;
      subscribers.forEach((notify) => {
        try {
          notify();
        } catch (error) {
          logger.debug('[useHouseFileStorage] subscriber notify failed', error);
        }
      });
    });
  };
})();

const notifySubscribers = () => {
  scheduleNotifications();
};

const commitSharedState = (next: Partial<SharedHouseState>) => {
  let changed = false;
  if (next.houseData) {
    const nextHouse = {
      ...next.houseData,
      characters: next.houseData.characters ?? sharedState.characters,
    };
    sharedState = { ...sharedState, houseData: nextHouse };
    changed = true;
  }
  if (next.characters) {
    const deduped = dedupeCharacters(next.characters);
    sharedState = {
      ...sharedState,
      characters: deduped,
      houseData: {
        ...sharedState.houseData,
        characters: deduped,
      },
    };
    changed = true;
  }
  if (typeof next.isLoading === 'boolean') {
    sharedState = { ...sharedState, isLoading: next.isLoading };
    changed = true;
  }
  if (typeof next.initialized === 'boolean') {
    sharedState = { ...sharedState, initialized: next.initialized };
    changed = true;
  }
  if (changed) {
    notifySubscribers();
  }
};

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type LegacyCharacterRow = {
  id: string;
  profile_json?: string | null;
  name?: string | null;
  created_at?: string | number | null;
  updated_at?: string | number | null;
};

type SqliteBackupCharacter = {
  id: string;
  name?: string | null;
  avatar_path?: string | null;
  bio?: string | null;
  traits_json?: string | null;
  tags_json?: string | null;
  system_prompt?: string | null;
  created_at?: string | number | null;
  updated_at?: string | number | null;
};

type SettingsRow = {
  id: string;
  key: string;
  value: string;
};

type LegacyProfile = Partial<Character> & {
  prompts?: Partial<Character['prompts']>;
  stats?: Partial<Character['stats']>;
  skills?: Partial<Character['skills']>;
  progression?: Partial<Character['progression']>;
  preferences?: Record<string, unknown>;
  relationships?: Record<string, unknown>;
  bio?: string;
};

type StorageUpdateDetail = {
  key?: string;
};

const RELATIONSHIP_STATUS_SET: ReadonlySet<Character['progression']['relationshipStatus']> = new Set([
  'stranger',
  'untrained',
  'friend',
  'close_friend',
  'romantic_interest',
  'lover',
  'devoted'
]);

const RARITY_SET: ReadonlySet<Character['rarity']> = new Set([
  'common',
  'rare',
  'legendary',
  'epic'
]);

const GENDER_SET = new Set<Character['gender']>([
  'female',
  'male',
  'other'
]);

const createDefaultPhysicalStats = (): NonNullable<Character['physicalStats']> => ({
  hairColor: '',
  eyeColor: '',
  height: '',
  weight: '',
  skinTone: ''
});

const createDefaultProgression = (): Character['progression'] => ({
  level: 1,
  nextLevelExp: 100,
  unlockedFeatures: [],
  achievements: [],
  relationshipStatus: 'stranger',
  affection: 0,
  trust: 0,
  intimacy: 0,
  dominance: 50,
  jealousy: 0,
  possessiveness: 0,
  sexualExperience: 0,
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
  sexualCompatibility: { overall: 0, kinkAlignment: 0, stylePreference: 0 },
  userPreferences: { likes: [], dislikes: [], turnOns: [], turnOffs: [] }
});

const ensureString = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);

const ensureOptionalString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

const ensureNumber = (value: unknown, fallback = 0): number => (typeof value === 'number' ? value : fallback);

const ensureBoolean = (value: unknown): boolean | undefined => (typeof value === 'boolean' ? value : undefined);

const ensureDate = (value: unknown, fallback: Date): Date => {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return fallback;
};

const ensureOptionalDate = (value: unknown): Date | undefined => {
  if (value === undefined || value === null) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return undefined;
};

const ensureStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
};

const ensurePreferences = (value: unknown): Character['preferences'] => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Character['preferences'];
  }
  return {};
};

const ensureRelationships = (value: unknown): Record<string, number> => {
  if (!value || typeof value !== 'object') return {};
  const entries = Object.entries(value as Record<string, unknown>);
  return entries.reduce<Record<string, number>>((acc, [key, val]) => {
    if (typeof val === 'number') {
      acc[key] = val;
    }
    return acc;
  }, {});
};

const ensureStats = (stats?: Partial<Character['stats']>): Character['stats'] => ({
  love: stats?.love ?? 0,
  happiness: stats?.happiness ?? 0,
  wet: stats?.wet ?? 0,
  willing: stats?.willing ?? 0,
  selfEsteem: stats?.selfEsteem ?? 0,
  loyalty: stats?.loyalty ?? 0,
  fight: stats?.fight ?? 0,
  stamina: stats?.stamina ?? 0,
  pain: stats?.pain ?? 0,
  experience: stats?.experience ?? 0,
  level: stats?.level ?? 1
});

const ensureSkills = (skills?: Partial<Character['skills']>): Character['skills'] => ({
  hands: skills?.hands ?? 0,
  mouth: skills?.mouth ?? 0,
  missionary: skills?.missionary ?? 0,
  doggy: skills?.doggy ?? 0,
  cowgirl: skills?.cowgirl ?? 0
});

const ensurePhysicalStats = (physical?: Character['physicalStats']): Character['physicalStats'] => ({
  hairColor: ensureString(physical?.hairColor),
  eyeColor: ensureString(physical?.eyeColor),
  height: ensureString(physical?.height),
  weight: ensureString(physical?.weight),
  skinTone: ensureString(physical?.skinTone)
});

const ensurePrompts = (
  prompts?: Partial<Character['prompts']>,
  fallback?: Partial<Character['prompts']>
): Character['prompts'] => ({
  system: prompts?.system ?? fallback?.system ?? '',
  description: prompts?.description ?? fallback?.description ?? '',
  background: prompts?.background ?? fallback?.background ?? '',
  personality: prompts?.personality ?? fallback?.personality ?? '',
  appearance: prompts?.appearance ?? fallback?.appearance ?? '',
  responseStyle: prompts?.responseStyle ?? fallback?.responseStyle ?? '',
  originScenario: prompts?.originScenario ?? fallback?.originScenario ?? '',
});

const ensureProgression = (progression?: Partial<Character['progression']>): Character['progression'] => {
  const base = createDefaultProgression();
  if (!progression) return base;
  return {
    ...base,
    level: progression.level ?? base.level,
    nextLevelExp: progression.nextLevelExp ?? base.nextLevelExp,
    relationshipStatus: progression.relationshipStatus && RELATIONSHIP_STATUS_SET.has(progression.relationshipStatus)
      ? progression.relationshipStatus
      : base.relationshipStatus,
    affection: progression.affection ?? base.affection,
    trust: progression.trust ?? base.trust,
    intimacy: progression.intimacy ?? base.intimacy,
    dominance: progression.dominance ?? base.dominance,
    jealousy: progression.jealousy ?? base.jealousy,
    possessiveness: progression.possessiveness ?? base.possessiveness,
    sexualExperience: progression.sexualExperience ?? base.sexualExperience,
    kinks: ensureStringArray(progression.kinks) || base.kinks,
    limits: ensureStringArray(progression.limits) || base.limits,
    fantasies: ensureStringArray(progression.fantasies) || base.fantasies,
    unlockedPositions: ensureStringArray(progression.unlockedPositions) || base.unlockedPositions,
    unlockedOutfits: ensureStringArray(progression.unlockedOutfits) || base.unlockedOutfits,
    unlockedToys: ensureStringArray(progression.unlockedToys) || base.unlockedToys,
    unlockedScenarios: ensureStringArray(progression.unlockedScenarios) || base.unlockedScenarios,
    relationshipMilestones: Array.isArray(progression.relationshipMilestones) ? progression.relationshipMilestones : base.relationshipMilestones,
    sexualMilestones: Array.isArray(progression.sexualMilestones) ? progression.sexualMilestones : base.sexualMilestones,
    significantEvents: Array.isArray(progression.significantEvents) ? progression.significantEvents : base.significantEvents,
    storyChronicle: Array.isArray(progression.storyChronicle) ? progression.storyChronicle : base.storyChronicle,
    currentStoryArc: ensureOptionalString(progression.currentStoryArc),
    memorableEvents: Array.isArray(progression.memorableEvents) ? progression.memorableEvents : base.memorableEvents,
    bonds: progression.bonds && typeof progression.bonds === 'object' && !Array.isArray(progression.bonds)
      ? (progression.bonds as Character['progression']['bonds'])
      : base.bonds,
    sexualCompatibility: progression.sexualCompatibility && typeof progression.sexualCompatibility === 'object'
      ? {
          overall: ensureNumber((progression.sexualCompatibility as Record<string, unknown>).overall, base.sexualCompatibility.overall),
          kinkAlignment: ensureNumber((progression.sexualCompatibility as Record<string, unknown>).kinkAlignment, base.sexualCompatibility.kinkAlignment),
          stylePreference: ensureNumber((progression.sexualCompatibility as Record<string, unknown>).stylePreference, base.sexualCompatibility.stylePreference)
        }
      : base.sexualCompatibility,
    userPreferences: progression.userPreferences && typeof progression.userPreferences === 'object'
      ? {
          likes: ensureStringArray((progression.userPreferences as Record<string, unknown>).likes),
          dislikes: ensureStringArray((progression.userPreferences as Record<string, unknown>).dislikes),
          turnOns: ensureStringArray((progression.userPreferences as Record<string, unknown>).turnOns),
          turnOffs: ensureStringArray((progression.userPreferences as Record<string, unknown>).turnOffs)
        }
      : base.userPreferences
  };
};

const parseLegacyProfile = (json?: string | null): LegacyProfile => {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === 'object') {
      return parsed as LegacyProfile;
    }
  } catch (error) {
    logger.warn('[useHouseFileStorage] Failed parsing legacy profile JSON', error);
  }
  return {};
};

const safeParseRecord = (value: string | null | undefined): Record<string, unknown> | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch (error) {
    logger.warn('[useHouseFileStorage] Failed to parse legacy record JSON', error);
    return null;
  }
};

const ensureGender = (gender: unknown): Character['gender'] | undefined => {
  if (typeof gender === 'string') {
    const candidate = gender as Character['gender'];
    if (GENDER_SET.has(candidate)) {
      return candidate;
    }
  }
  return undefined;
};

const ensureRarity = (rarity: unknown): Character['rarity'] => {
  if (typeof rarity === 'string' && RARITY_SET.has(rarity as Character['rarity'])) {
    return rarity as Character['rarity'];
  }
  return 'common';
};

const buildCharacterFromLegacy = (row: LegacyCharacterRow, profile: LegacyProfile): Character => {
  const legacyPromptSettings =
    profile.preferences && typeof profile.preferences === 'object'
      ? (profile.preferences as Record<string, unknown>).promptSettings
      : undefined;

  const fallbackPrompts: Partial<Character['prompts']> = {
    description: ensureString(profile.description ?? profile.bio, ''),
    background: ensureString(profile.prompts?.background ?? profile.description ?? profile.bio, ''),
    personality: ensureString(profile.personality, ''),
    appearance: ensureString(profile.appearance ?? profile.imageDescription, ''),
    responseStyle: ensureString(profile.prompts?.responseStyle, ''),
    originScenario: ensureString(profile.prompts?.originScenario, ''),
  };

  if (legacyPromptSettings && typeof legacyPromptSettings === 'object') {
    const settings = legacyPromptSettings as Record<string, unknown>;
    if (typeof settings.responseStyle === 'string') {
      fallbackPrompts.responseStyle = settings.responseStyle;
    }
    if (typeof settings.originScenario === 'string') {
      fallbackPrompts.originScenario = settings.originScenario;
    }
  }

  const prompts = ensurePrompts(profile.prompts, fallbackPrompts);
  const now = new Date();
  const rowCreatedAt = ensureDate(row.created_at, now);
  const rowUpdatedAt = ensureDate(row.updated_at, now);
  const createdAt = ensureDate(profile.createdAt, rowCreatedAt);
  const updatedAt = ensureDate(profile.updatedAt, rowUpdatedAt);

  return {
    id: row.id,
    name: ensureString(profile.name ?? row.name, 'Unnamed'),
    description: ensureString(profile.description ?? profile.bio, ''),
    personality: ensureString(profile.personality ?? prompts.personality, ''),
    appearance: ensureString(profile.appearance ?? profile.imageDescription, ''),
    avatar: ensureOptionalString(profile.avatar),
    gender: ensureGender(profile.gender),
    age: typeof profile.age === 'number' ? profile.age : undefined,
    roomId: ensureOptionalString(profile.roomId),
    stats: ensureStats(profile.stats),
    skills: ensureSkills(profile.skills),
    role: ensureString(profile.role, 'character'),
    job: ensureOptionalString(profile.job),
    personalities: ensureStringArray(profile.personalities),
    features: ensureStringArray(profile.features),
    classes: ensureStringArray(profile.classes),
    unlocks: ensureStringArray(profile.unlocks),
    rarity: ensureRarity(profile.rarity),
    specialAbility: ensureOptionalString(profile.specialAbility),
    preferredRoomType: ensureOptionalString(profile.preferredRoomType),
    imageDescription: ensureOptionalString(profile.imageDescription),
    prompts,
    physicalStats: profile.physicalStats ? ensurePhysicalStats(profile.physicalStats) : createDefaultPhysicalStats(),
    conversationHistory: Array.isArray(profile.conversationHistory) ? (profile.conversationHistory as Character['conversationHistory']) : [],
    memories: Array.isArray(profile.memories) ? (profile.memories as Character['memories']) : [],
  preferences: ensurePreferences(profile.preferences),
    relationships: ensureRelationships(profile.relationships),
    progression: ensureProgression(profile.progression),
    lastInteraction: ensureOptionalDate(profile.lastInteraction),
    createdAt,
    updatedAt,
    autoGenerated: ensureBoolean(profile.autoGenerated)
  };
};

const buildCharacterFromSqliteBackup = (row: SqliteBackupCharacter): Character => {
  const traitsRecord = safeParseRecord(row.traits_json) ?? {};
  const promptsRecord = traitsRecord.prompts && typeof traitsRecord.prompts === 'object' && !Array.isArray(traitsRecord.prompts)
    ? (traitsRecord.prompts as Partial<Character['prompts']>)
    : undefined;

  const profile: LegacyProfile = {
    name: ensureOptionalString(row.name) ?? undefined,
    description: ensureString(traitsRecord.description ?? row.bio, ''),
    personality: ensureString(traitsRecord.personality, ''),
    appearance: ensureString(traitsRecord.appearance, ''),
    avatar: ensureOptionalString(row.avatar_path ?? (traitsRecord.avatar as string | undefined)),
    gender: ensureGender(traitsRecord.gender),
    age: typeof traitsRecord.age === 'number' ? traitsRecord.age : undefined,
    roomId: ensureOptionalString(traitsRecord.roomId),
    role: ensureOptionalString(traitsRecord.role) ?? undefined,
    personalities: ensureStringArray(traitsRecord.personalities),
    features: ensureStringArray(traitsRecord.features),
    classes: ensureStringArray(traitsRecord.classes),
    unlocks: ensureStringArray(traitsRecord.unlocks),
    rarity: ensureRarity(traitsRecord.rarity),
    specialAbility: ensureOptionalString(traitsRecord.specialAbility),
    preferredRoomType: ensureOptionalString(traitsRecord.preferredRoomType),
    imageDescription: ensureOptionalString(traitsRecord.imageDescription),
    physicalStats: traitsRecord.physicalStats && typeof traitsRecord.physicalStats === 'object'
      ? (traitsRecord.physicalStats as Character['physicalStats'])
      : undefined,
    prompts: ensurePrompts(
      {
        system: ensureString(promptsRecord?.system ?? row.system_prompt, ''),
        personality: ensureString(promptsRecord?.personality, ''),
        background: ensureString(promptsRecord?.background, ''),
        responseStyle: ensureString(promptsRecord?.responseStyle, ''),
        originScenario: ensureString(promptsRecord?.originScenario, ''),
        description: ensureString(promptsRecord?.description, ''),
        appearance: ensureString(promptsRecord?.appearance, ''),
      },
      {
        description: ensureString(traitsRecord.description ?? row.bio, ''),
        appearance: ensureString(traitsRecord.appearance ?? traitsRecord.imageDescription, ''),
        personality: ensureString(traitsRecord.personality, ''),
        background: ensureString(traitsRecord.backstory ?? traitsRecord.description ?? row.bio, ''),
        responseStyle: ensureString(
          (traitsRecord.promptSettings && typeof traitsRecord.promptSettings === 'object'
            ? (traitsRecord.promptSettings as Record<string, unknown>).responseStyle
            : undefined) as string | undefined,
          ''
        ),
        originScenario: ensureString(
          (traitsRecord.promptSettings && typeof traitsRecord.promptSettings === 'object'
            ? (traitsRecord.promptSettings as Record<string, unknown>).originScenario
            : undefined) as string | undefined,
          ''
        ),
      }
    ),
    autoGenerated: ensureBoolean(traitsRecord.autoGenerated)
  };

  return buildCharacterFromLegacy(
    {
      id: row.id,
      name: row.name,
      created_at: row.created_at,
      updated_at: row.updated_at
    },
    profile
  );
};

export function useHouseFileStorage() {
  const [, forceRender] = useState(0);
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    const notify = () => forceRender((prev) => prev + 1);
    subscribers.add(notify);
    return () => {
      subscribers.delete(notify);
    };
  }, [forceRender]);

  useEffect(() => {
    if (!hasSyncedRef.current) {
      hasSyncedRef.current = true;
      forceRender((prev) => prev + 1);
    }
  }, [forceRender]);

  useEffect(() => {
    registerStorageListeners();
    attachRecoverHelper();
    void ensureSharedStateLoaded();
  }, []);

  const snapshot = sharedState;
  const normalizedHouse = normalizeHouse(snapshot.houseData);
  const houseWithCharacters = {
    ...normalizedHouse,
    characters: snapshot.characters || [],
  };

  const addCharacter = useCallback(async (character: Character): Promise<boolean> => {
    await ensureSharedStateLoaded();
    const current = sharedState.characters;

    const normalizeName = (value?: string | null): string =>
      typeof value === 'string' ? value.trim().toLowerCase() : '';

    // Fallback to a generated placeholder if the incoming character has no usable name.
    const candidate: Character = (!character.name || !character.name.trim())
      ? {
          ...character,
          name: `Companion ${Date.now().toString(36)}`,
        }
      : character;

    const targetName = normalizeName(candidate.name);

    const duplicate = current.find((existing) => {
      if (existing.id === candidate.id) {
        return true;
      }
      const existingName = normalizeName(existing.name);
      return existingName !== '' && existingName === targetName && targetName !== '';
    });

    if (duplicate) {
      logger.warn('Character already exists:', candidate.name);
      return false;
    }

    const nextCharacters = dedupeCharacters([...current, candidate]);
    const success = await saveToStorage('characters', nextCharacters);
    if (success) {
      commitSharedState({ characters: nextCharacters });
      logger.log('Character added successfully:', candidate.name);
      toast.success(`${candidate.name} joined the house!`);
    } else {
      toast.error('Failed to add character');
    }
    return success;
  }, []);

  const removeCharacter = useCallback(async (characterId: string): Promise<boolean> => {
    await ensureSharedStateLoaded();
    const current = sharedState.characters;
    const target = current.find((character) => character.id === characterId);
    if (!target) {
      logger.warn('Character not found:', characterId);
      return false;
    }

    const nextCharacters = dedupeCharacters(current.filter((character) => character.id !== characterId));
    const success = await saveToStorage('characters', nextCharacters);
    if (success) {
      commitSharedState({ characters: nextCharacters });
      logger.log('Character removed successfully:', target.name);
      toast.success(`${target.name} left the house`);
    } else {
      toast.error('Failed to remove character');
    }
    return success;
  }, []);

  const updateCharacter = useCallback(async (characterId: string, updates: Partial<Character>): Promise<boolean> => {
    await ensureSharedStateLoaded();
    const nextCharacters = dedupeCharacters(
      sharedState.characters.map((character) =>
        character.id === characterId
          ? { ...character, ...updates, updatedAt: new Date() }
          : character
      )
    );
    const success = await saveToStorage('characters', nextCharacters);
    if (success) {
      commitSharedState({ characters: nextCharacters });
      logger.log('Character updated successfully:', characterId);
    } else {
      toast.error('Failed to update character');
    }
    return success;
  }, []);

  const updateHouse = useCallback(async (updates: Partial<House>): Promise<boolean> => {
    await ensureSharedStateLoaded();
    const nextHouse = {
      ...sharedState.houseData,
      ...updates,
      updatedAt: new Date(),
    };
    const success = await saveToStorage('house', nextHouse);
    if (success) {
      commitSharedState({ houseData: nextHouse });
      logger.log('House updated successfully');
    } else {
      toast.error('Failed to update house');
    }
    return success;
  }, []);

  const addRoom = useCallback(async (room: House['rooms'][0]): Promise<boolean> => {
    await ensureSharedStateLoaded();
    const rooms = [...(sharedState.houseData.rooms || []), room];
    const nextHouse = {
      ...sharedState.houseData,
      rooms,
      updatedAt: new Date(),
    };
    const success = await saveToStorage('house', nextHouse);
    if (success) {
      commitSharedState({ houseData: nextHouse });
      logger.log('Room added successfully:', room.name);
      toast.success(`${room.name} added to the house!`);
    } else {
      toast.error('Failed to add room');
    }
    return success;
  }, []);

  const removeRoom = useCallback(async (roomId: string): Promise<boolean> => {
    await ensureSharedStateLoaded();
    const rooms = (sharedState.houseData.rooms || []).filter((room) => room.id !== roomId);
    const nextHouse = {
      ...sharedState.houseData,
      rooms,
      updatedAt: new Date(),
    };
    const success = await saveToStorage('house', nextHouse);
    if (success) {
      commitSharedState({ houseData: nextHouse });
      logger.log('Room removed successfully:', roomId);
      toast.success('Room removed from the house');
    } else {
      toast.error('Failed to remove room');
    }
    return success;
  }, []);

  const assignCharacterToRoom = useCallback(async (characterId: string, roomId: string): Promise<boolean> => {
    await ensureSharedStateLoaded();
    const updated = await updateCharacter(characterId, { roomId });
    if (!updated) {
      return false;
    }

    const rooms = (sharedState.houseData.rooms || []).map((room) => {
      if (room.id === roomId) {
        return {
          ...room,
          residents: room.residents.includes(characterId)
            ? room.residents
            : [...room.residents, characterId],
        };
      }
      return {
        ...room,
        residents: room.residents.filter((residentId) => residentId !== characterId),
      };
    });

    const nextHouse = {
      ...sharedState.houseData,
      rooms,
      updatedAt: new Date(),
    };
    const success = await saveToStorage('house', nextHouse);
    if (success) {
      commitSharedState({ houseData: nextHouse });
      logger.log('Character assigned to room successfully:', characterId, roomId);
    } else {
      toast.error('Failed to assign character to room');
    }
    return success;
  }, [updateCharacter]);

  const getCharactersInRoom = useCallback((roomId: string): Character[] => {
    return sharedState.characters.filter((character) => character.roomId === roomId);
  }, []);

  const getAvailableRooms = useCallback(() => {
    return normalizeHouse(sharedState.houseData).rooms.filter((room) => room.unlocked);
  }, []);

  const setHouseData = useCallback((next: Partial<House>) => {
    commitSharedState({ houseData: next });
  }, []);

  const setCharacters = useCallback((next: Character[]) => {
    commitSharedState({ characters: dedupeCharacters(next) });
  }, []);

  // Location-based functions
  const getCharactersAtLocation = useCallback((locationId?: string): Character[] => {
    return sharedState.characters.filter((character) => character.locationId === locationId);
  }, []);

  const assignCharacterToLocation = useCallback(
    async (characterId: string, locationId: string | null | undefined): Promise<boolean> => {
      await ensureSharedStateLoaded();
      const updated = await updateCharacter(characterId, { locationId: locationId ?? undefined });
      if (updated) {
        if (locationId) {
          logger.log('Character assigned to location successfully:', characterId, locationId);
          toast.success('Character moved to new location');
        } else {
          logger.log('Character unassigned from location:', characterId);
          toast.success('Character removed from location');
        }
      } else {
        toast.error('Failed to update character location');
      }
      return updated;
    },
    [updateCharacter]
  );

  const addLocation = useCallback(async (location: Location): Promise<boolean> => {
    await ensureSharedStateLoaded();
    const dedupedId = location.id || crypto.randomUUID();
    const existing = normalizeHouse(sharedState.houseData).locations || [];
    if (existing.some((item) => item.id === dedupedId)) {
      toast.error('A location with that ID already exists');
      return false;
    }

    const locations = [...existing, { ...location, id: dedupedId }];
    const nextHouse = {
      ...sharedState.houseData,
      locations,
      updatedAt: new Date(),
    };

    const success = await saveToStorage('house', nextHouse);
    if (success) {
      commitSharedState({ houseData: nextHouse });
      toast.success(`${location.name} added to locations`);
      logger.log('Location added successfully:', location.name);
    } else {
      toast.error('Failed to add location');
    }

    return success;
  }, []);

  const updateLocation = useCallback(
    async (locationId: string, updates: Partial<Location>): Promise<boolean> => {
      await ensureSharedStateLoaded();
      const existing = normalizeHouse(sharedState.houseData).locations || [];
      const index = existing.findIndex((item) => item.id === locationId);
      if (index === -1) {
        toast.error('Location not found');
        return false;
      }

      const locations = existing.map((location) =>
        location.id === locationId
          ? {
              ...location,
              ...updates,
            }
          : location,
      );

      const nextHouse = {
        ...sharedState.houseData,
        locations,
        updatedAt: new Date(),
      };

      const success = await saveToStorage('house', nextHouse);
      if (success) {
        commitSharedState({ houseData: nextHouse });
        logger.log('Location updated successfully:', locationId);
      } else {
        toast.error('Failed to update location');
      }
      return success;
    },
    []
  );

  const removeLocation = useCallback(async (locationId: string): Promise<boolean> => {
    await ensureSharedStateLoaded();
    const existing = normalizeHouse(sharedState.houseData).locations || [];
    if (!existing.some((item) => item.id === locationId)) {
      toast.error('Location not found');
      return false;
    }

    const locations = existing.filter((location) => location.id !== locationId);
    const nextHouse = {
      ...sharedState.houseData,
      locations,
      updatedAt: new Date(),
    };

    const updatedCharacters = sharedState.characters.map((character) =>
      character.locationId === locationId ? { ...character, locationId: undefined } : character,
    );

    const [houseSaved, charactersSaved] = await Promise.all([
      saveToStorage('house', nextHouse),
      saveToStorage('characters', updatedCharacters, { silent: true }),
    ]);

    if (houseSaved && charactersSaved) {
      commitSharedState({ houseData: nextHouse, characters: updatedCharacters });
      toast.success('Location removed');
      logger.log('Location removed successfully:', locationId);
      return true;
    }

    toast.error('Failed to remove location');
    return false;
  }, []);

  const getAvailableLocations = useCallback(() => {
    const houseLocations = normalizeHouse(sharedState.houseData).locations;
    return houseLocations && houseLocations.length > 0 
      ? houseLocations.filter((loc) => loc.unlocked)
      : getDefaultLocations().filter((loc) => loc.unlocked);
  }, []);

  return {
    house: houseWithCharacters,
    characters: snapshot.characters,
    isLoading: snapshot.isLoading,
    hasError: false,
    addCharacter,
    removeCharacter,
    updateCharacter,
    updateHouse,
    addRoom,
    removeRoom,
    assignCharacterToRoom, // DEPRECATED - use assignCharacterToLocation
    getCharactersInRoom, // DEPRECATED - use getCharactersAtLocation
    getAvailableRooms, // DEPRECATED - use getAvailableLocations
    assignCharacterToLocation,
    getCharactersAtLocation,
    getAvailableLocations,
    addLocation,
    updateLocation,
    removeLocation,
    setHouseData,
    setCharacters,
  };
}

export default useHouseFileStorage;

const registerStorageListeners = () => {
  if (storageListenerRegistered) {
    return;
  }
  if (typeof globalThis.addEventListener !== 'function') {
    return;
  }
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<StorageUpdateDetail>).detail;
    const key = detail?.key;
    if (!key || key === 'house' || key === 'characters') {
      void ensureSharedStateLoaded(true);
    }
  };
  globalThis.addEventListener(STORAGE_EVENT, handler);
  storageListenerRegistered = true;
};

const attachRecoverHelper = () => {
  if (recoverHelperAttached) {
    return;
  }
  try {
    if (typeof window !== 'undefined') {
      (window as unknown as { recoverCharacters?: () => Promise<void> }).recoverCharacters = async () => {
        logger.log('[recoverCharacters] Manual recovery triggered');
        await ensureSharedStateLoaded(true);
      };
      recoverHelperAttached = true;
    }
  } catch (error) {
    logger.debug('Ignored environment error while initializing recoverCharacters', error);
  }
};

const ensureSharedStateLoaded = async (forceReload = false): Promise<void> => {
  if (forceReload) {
    loadPromise = null;
  }
  if (sharedState.initialized && !forceReload) {
    return;
  }
  if (!loadPromise) {
    loadPromise = loadSharedState();
  }
  await loadPromise;
};

const migrateRoomIdToLocationId = async (): Promise<void> => {
  const roomToLocationMap: Record<string, string> = {
    'common-room': 'doll-dorm',
    'private-room': 'owners-bed',
    'bar': 'doll-bar',
    'therapy-room': 'therapist',
  };
  
  let migrated = false;
  const nextCharacters = sharedState.characters.map((character) => {
    if (character.roomId && !character.locationId) {
      const locationId = roomToLocationMap[character.roomId] || 'doll-dorm';
      migrated = true;
      logger.log(`Migrating character ${character.name} from room ${character.roomId} to location ${locationId}`);
      return { ...character, locationId, roomId: undefined };
    }
    return character;
  });
  
  if (migrated) {
    await saveToStorage('characters', nextCharacters, { silent: true });
    commitSharedState({ characters: nextCharacters });
    logger.log('Migrated roomId to locationId for characters');
  }
};

const loadSharedState = async (): Promise<void> => {
  try {
    commitSharedState({ isLoading: true });
    for (let attempt = 0; attempt < 5; attempt += 1) {
      if (!storage) {
        logger.warn('[useHouseFileStorage] Storage not ready, retrying...', attempt + 1);
        await delay(300 + attempt * 200);
        continue;
      }
      try {
        const { houseData, characters } = await readHouseAndCharacters();
        commitSharedState({
          houseData,
          characters,
          isLoading: false,
          initialized: true,
        });
        
        // Migrate old roomId to new locationId
        await migrateRoomIdToLocationId();
        
        return;
      } catch (error) {
        logger.error('[useHouseFileStorage] Failed to load house data:', error);
        break;
      }
    }
  } finally {
    commitSharedState({ isLoading: false, initialized: true });
    loadPromise = null;
  }
};

const readHouseAndCharacters = async (): Promise<{ houseData: Partial<House>; characters: Character[] }> => {
  if (!storage) {
    throw new Error('Storage not initialized');
  }

  let nextHouse: Partial<House> = sharedState.houseData;
  const savedHouse = await storage.get<SettingsRow>('settings', 'house');
  if (savedHouse?.value) {
    try {
      nextHouse = JSON.parse(savedHouse.value) as Partial<House>;
    } catch (error) {
      logger.warn('[useHouseFileStorage] Failed parsing saved house JSON', error);
    }
  }

  let loadedCharacters: Character[] | null = null;
  const savedCharacters = await storage.get<SettingsRow>('settings', 'characters');
  if (savedCharacters?.value) {
    try {
      const charactersData = JSON.parse(savedCharacters.value) as unknown;
      if (Array.isArray(charactersData)) {
        loadedCharacters = charactersData as Character[];
      }
    } catch (error) {
      logger.warn('[useHouseFileStorage] Failed parsing saved characters JSON', error);
    }
  }

  if (!loadedCharacters || loadedCharacters.length === 0) {
    try {
      const legacyRows = await storage.query<LegacyCharacterRow>({ table: 'characters' });
      if (Array.isArray(legacyRows) && legacyRows.length) {
        logger.log('[useHouseFileStorage] Migrating legacy character rows -> settings key');
        const migrated = legacyRows.map((row) => {
          const profile = parseLegacyProfile(row.profile_json);
          return buildCharacterFromLegacy(row, profile);
        });
        loadedCharacters = migrated;
        await saveToStorage('characters', migrated, { silent: true });
        logger.log(`[useHouseFileStorage] Migrated ${migrated.length} character(s) from legacy table.`);
      }
    } catch (error) {
      logger.warn('[useHouseFileStorage] Legacy character migration attempt failed:', error);
    }
  }

  if ((!loadedCharacters || !loadedCharacters.length) && typeof window !== 'undefined') {
    try {
      const lsBackup = legacyStorage.getItem('dollhouse-db-backup');
      if (lsBackup) {
        const parsed = JSON.parse(lsBackup) as { characters?: unknown };
        if (parsed && Array.isArray(parsed.characters) && parsed.characters.length) {
          logger.log('[useHouseFileStorage] Recovering characters from sqlite backup storage');
          const migrated = parsed.characters
            .filter(
              (entry): entry is SqliteBackupCharacter =>
                typeof entry === 'object' && entry !== null && 'id' in (entry as Record<string, unknown>)
            )
            .map((entry) => buildCharacterFromSqliteBackup(entry));
          if (migrated.length) {
            loadedCharacters = migrated;
            await saveToStorage('characters', migrated, { silent: true });
            logger.log(`[useHouseFileStorage] Recovered ${migrated.length} character(s) from sqlite backup.`);
          }
        }
      }
    } catch (error) {
      logger.warn('[useHouseFileStorage] sqlite backup recovery failed:', error);
    }
  }

  if ((!loadedCharacters || !loadedCharacters.length) && typeof window !== 'undefined') {
    try {
      const legacyRaw = legacyStorage.getItem('characters');
      if (legacyRaw) {
        const parsedLegacy = JSON.parse(legacyRaw);
        if (Array.isArray(parsedLegacy) && parsedLegacy.length) {
          logger.log('[useHouseFileStorage] Recovering characters from legacy backup key');
          loadedCharacters = parsedLegacy as Character[];
          await saveToStorage('characters', loadedCharacters, { silent: true });
        }
      }
    } catch (error) {
      logger.warn('[useHouseFileStorage] Legacy raw backup recovery failed:', error);
    }
  }

  if (loadedCharacters && loadedCharacters.length) {
    const deduped = dedupeCharacters(loadedCharacters);
    if (deduped.length !== loadedCharacters.length) {
      await saveToStorage('characters', deduped, { silent: true });
    }
    logger.log('[useHouseFileStorage] Loaded characters:', deduped.map((character) => character.name));
    return { houseData: nextHouse, characters: deduped };
  }

  logger.log('[useHouseFileStorage] No characters found in settings or legacy sources.');
  return { houseData: nextHouse, characters: [] };
};

const saveToStorage = async (key: string, data: unknown, options?: { silent?: boolean }): Promise<boolean> => {
  try {
    if (!storage) {
      logger.error('Storage not initialized');
      return false;
    }
    const payload: SettingsRow = { id: key, key, value: JSON.stringify(data) };
    await storage.put<SettingsRow>('settings', payload);
    if (!options?.silent && typeof globalThis.dispatchEvent === 'function') {
      try {
        const event = new CustomEvent<StorageUpdateDetail>(STORAGE_EVENT, { detail: { key } });
        globalThis.dispatchEvent(event);
      } catch (error) {
        logger.debug('[useHouseFileStorage] Failed to dispatch storage event', error);
      }
    }
    return true;
  } catch (error) {
    logger.error(`Failed to save ${key}:`, error);
    return false;
  }
};

const normalizeHouse = (house: Partial<House>): House => ({
  ...DEFAULT_HOUSE,
  ...house,
  id: house.id || DEFAULT_HOUSE.id!,
  name: house.name || DEFAULT_HOUSE.name!,
  description: house.description || DEFAULT_HOUSE.description!,
  rooms: house.rooms || DEFAULT_HOUSE.rooms!,
  locations: house.locations || DEFAULT_HOUSE.locations!,
  currency: house.currency ?? DEFAULT_HOUSE.currency!,
  worldPrompt: house.worldPrompt || DEFAULT_HOUSE.worldPrompt!,
  copilotPrompt: house.copilotPrompt || DEFAULT_HOUSE.copilotPrompt!,
  copilotMaxTokens: house.copilotMaxTokens ?? DEFAULT_HOUSE.copilotMaxTokens!,
  copilotUseHouseContext: house.copilotUseHouseContext ?? DEFAULT_HOUSE.copilotUseHouseContext!,
  copilotContextDetail: house.copilotContextDetail || DEFAULT_HOUSE.copilotContextDetail!,
  autoCreator: house.autoCreator || DEFAULT_HOUSE.autoCreator!,
  aiSettings: house.aiSettings || DEFAULT_HOUSE.aiSettings!,
  createdAt: house.createdAt || DEFAULT_HOUSE.createdAt!,
  updatedAt: new Date(),
} as House);