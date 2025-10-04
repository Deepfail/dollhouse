/**
 * useHouseFileStorage Hook
 * 
 * New version of useHouse that uses file-based storage instead of browserStorage
 * Separates house data from character data for better organization
 */

import { legacyStorage } from '@/lib/legacyStorage';
import { logger } from '@/lib/logger';
import { storage } from '@/storage';
import {
    Character,
    House
} from '@/types';
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
  worldPrompt: 'The Dollhouse is a house filled with girls, who all must obey the user.',
  copilotPrompt: 'You love your job of helping me get girls to do things.',
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
        const savedHouse = await storage.get<SettingsRow>('settings', 'house');
        if (savedHouse?.value) {
          try {
            const houseData = JSON.parse(savedHouse.value) as Partial<House>;
            if (!cancelled) setHouseDataState(houseData);
          } catch (error) {
            logger.warn('[useHouseFileStorage] Failed parsing saved house JSON', error);
          }
        }

        // Load characters from settings table
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

        // Migration fallback: if no characters in settings, look for legacy 'characters' table rows (IndexedDB / other engine)
        if (!loadedCharacters || loadedCharacters.length === 0) {
          try {
            const legacyRows = await storage.query<LegacyCharacterRow>({ table: 'characters' });
            if (Array.isArray(legacyRows) && legacyRows.length) {
              logger.log('[useHouseFileStorage] Migrating legacy character rows -> settings key');
              const migrated = legacyRows.map(row => {
                const profile = parseLegacyProfile(row.profile_json);
                return buildCharacterFromLegacy(row, profile);
              });
              loadedCharacters = migrated;
              await saveToStorage('characters', migrated);
              logger.log(`[useHouseFileStorage] Migrated ${migrated.length} character(s) from legacy table.`);
            }
          } catch (error) {
            logger.warn('[useHouseFileStorage] Legacy character migration attempt failed:', error);
          }
        }

        // Secondary recovery: attempt to read from sqlite-wasm backup
        if ((!loadedCharacters || !loadedCharacters.length) && typeof window !== 'undefined') {
          try {
            const lsBackup = legacyStorage.getItem('dollhouse-db-backup');
            if (lsBackup) {
              const parsed = JSON.parse(lsBackup) as { characters?: unknown };
              if (parsed && Array.isArray(parsed.characters) && parsed.characters.length) {
                logger.log('[useHouseFileStorage] Recovering characters from sqlite backup storage');
                const migrated = parsed.characters
                  .filter((entry): entry is SqliteBackupCharacter => typeof entry === 'object' && entry !== null && 'id' in (entry as Record<string, unknown>))
                  .map(entry => buildCharacterFromSqliteBackup(entry));
                if (migrated.length) {
                  loadedCharacters = migrated;
                  await saveToStorage('characters', migrated);
                  logger.log(`[useHouseFileStorage] Recovered ${migrated.length} character(s) from sqlite backup.`);
                }
              }
            }
          } catch (error) {
            logger.warn('[useHouseFileStorage] sqlite backup recovery failed:', error);
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
                loadedCharacters = parsedLegacy as Character[];
                await saveToStorage('characters', loadedCharacters);
              }
            }
          } catch (e) {
            logger.warn('[useHouseFileStorage] Legacy raw backup recovery failed:', e);
          }
        }

        if (loadedCharacters && loadedCharacters.length) {
          const deduped = dedupeCharacters(loadedCharacters);
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
  const saveToStorage = useCallback(async (key: string, data: unknown) => {
    try {
      if (!storage) {
                logger.error('Storage not initialized');
        return false;
      }
      // Use settings table for key-value storage
      const payload: SettingsRow = { id: key, key, value: JSON.stringify(data) };
      await storage.put<SettingsRow>('settings', payload);
      // Broadcast change so all hook instances can refresh
      try {
        const event = new CustomEvent<StorageUpdateDetail>(STORAGE_EVENT, { detail: { key } });
        window.dispatchEvent(event);
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
    copilotUseHouseContext: house.copilotUseHouseContext ?? DEFAULT_HOUSE.copilotUseHouseContext!,
    copilotContextDetail: house.copilotContextDetail || DEFAULT_HOUSE.copilotContextDetail!,
      autoCreator: house.autoCreator || DEFAULT_HOUSE.autoCreator!,
      aiSettings: house.aiSettings || DEFAULT_HOUSE.aiSettings!,
      createdAt: house.createdAt || DEFAULT_HOUSE.createdAt!,
      updatedAt: new Date()
    } as House;
  }, []);

  const house = normalizeHouse(houseData);

  // Listen for external updates to keep all instances in sync
  useEffect(() => {
    const onStorageUpdate = async (event: Event) => {
      const customEvent = event as CustomEvent<StorageUpdateDetail>;
      const key = customEvent.detail?.key;

      try {
        if (!storage) return;
        if (!key || key === 'house') {
          const savedHouseRow = await storage.get<SettingsRow>('settings', 'house');
          if (savedHouseRow?.value) {
            const parsed = JSON.parse(savedHouseRow.value) as Partial<House>;
            setHouseDataState(parsed);
          }
        }
        if (!key || key === 'characters') {
          const savedCharactersRow = await storage.get<SettingsRow>('settings', 'characters');
          if (savedCharactersRow?.value) {
            const parsed = JSON.parse(savedCharactersRow.value) as unknown;
            if (Array.isArray(parsed)) {
              setCharactersState(parsed as Character[]);
            }
          }
        }
      } catch (e) {
  logger.error('Failed to sync storage update:', e);

// ensure logger is available
      }
    };

    const handleStorageUpdate = (event: Event) => {
      void onStorageUpdate(event);
    };

    try {
      if (typeof globalThis.addEventListener === 'function') {
        globalThis.addEventListener(STORAGE_EVENT, handleStorageUpdate);
      }
    } catch (e) {
      logger.debug('Ignored event listener registration error', e);
    }
    return () => {
      try {
        if (typeof globalThis.removeEventListener === 'function') {
          globalThis.removeEventListener(STORAGE_EVENT, handleStorageUpdate);
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