import { repositoryStorage } from '@/hooks/useRepositoryStorage';
import { legacyStorage } from '@/lib/legacyStorage';
import { logger } from '@/lib/logger';
import { StorageAdapter } from '@/storage/adapters';

export interface HouseConfigPromptSnapshot {
  chatPrompt?: string;
  worldPrompt?: string;
  copilotMainPrompt?: string;
  copilotPersonality?: string;
  copilotPrompt?: string;
}

export interface ImageSettingsPromptSnapshot {
  negativePrompt?: string;
}

export interface AdditionalPromptSnapshot {
  houseConfig?: HouseConfigPromptSnapshot;
  imageSettings?: ImageSettingsPromptSnapshot;
}

export interface AdditionalPromptImportResult {
  houseFieldsUpdated: number;
  imageFieldsUpdated: number;
  warnings: string[];
}

export interface PromptExportFile extends AdditionalPromptSnapshot {
  version: number;
  exportedAt: string;
  prompts: Record<string, string>;
}

export const PROMPT_EXPORT_VERSION = 2;

const HOUSE_CONFIG_KEY = 'house_config';
const IMAGE_SETTINGS_KEY = 'image-settings';
const HOUSE_STORAGE_KEY = 'house';

const HOUSE_PROMPT_FIELDS: Array<keyof HouseConfigPromptSnapshot> = [
  'chatPrompt',
  'worldPrompt',
  'copilotMainPrompt',
  'copilotPersonality',
  'copilotPrompt',
];

const IMAGE_PROMPT_FIELDS: Array<keyof ImageSettingsPromptSnapshot> = [
  'negativePrompt',
];

export async function gatherAdditionalPromptSnapshot(): Promise<AdditionalPromptSnapshot> {
  const snapshot: AdditionalPromptSnapshot = {};

  try {
    const config = (await repositoryStorage.get<Record<string, unknown>>(HOUSE_CONFIG_KEY)) ?? undefined;
    if (config) {
      const data: HouseConfigPromptSnapshot = {};
      for (const field of HOUSE_PROMPT_FIELDS) {
        const value = config[field as string];
        if (typeof value === 'string') {
          data[field] = value;
        }
      }
      if (Object.keys(data).length > 0) {
        snapshot.houseConfig = data;
      }
    }
  } catch (error) {
    logger.warn('[promptExport] Failed to read house_config prompts', error);
  }

  try {
    const storedHouse = (await StorageAdapter.getSetting(HOUSE_STORAGE_KEY)) as
      | Record<string, unknown>
      | null;
    if (storedHouse) {
      const target = (snapshot.houseConfig ??= {});
      const fields: Array<keyof HouseConfigPromptSnapshot> = [
        'worldPrompt',
        'copilotPrompt',
      ];
      for (const field of fields) {
        if (target[field]) continue;
        const value = storedHouse[field as string];
        if (typeof value === 'string') {
          target[field] = value;
        }
      }
      if (Object.keys(target).length === 0) {
        delete snapshot.houseConfig;
      }
    }
  } catch (error) {
    logger.warn('[promptExport] Failed to read house storage prompts', error);
  }

  try {
    const imageSettings = (await repositoryStorage.get<Record<string, unknown>>(IMAGE_SETTINGS_KEY)) ?? undefined;
    const data: ImageSettingsPromptSnapshot = {};
    if (imageSettings) {
      for (const field of IMAGE_PROMPT_FIELDS) {
        const value = imageSettings[field as string];
        if (typeof value === 'string') {
          data[field] = value;
        }
      }
    }

    if (!data.negativePrompt) {
      const legacyRaw = legacyStorage.getItem(IMAGE_SETTINGS_KEY);
      if (legacyRaw) {
        try {
          const parsed = JSON.parse(legacyRaw) as Record<string, unknown>;
          const fallback = parsed.negativePrompt;
          if (typeof fallback === 'string') {
            data.negativePrompt = fallback;
          }
        } catch (parseError) {
          logger.debug('[promptExport] Failed to parse legacy image settings', parseError);
        }
      }
    }

    if (Object.keys(data).length > 0) {
      snapshot.imageSettings = data;
    }
  } catch (error) {
    logger.warn('[promptExport] Failed to read image settings prompts', error);
  }

  return snapshot;
}

export async function buildPromptExportPayload(prompts: Record<string, string>): Promise<PromptExportFile> {
  const additional = await gatherAdditionalPromptSnapshot();
  const payload: PromptExportFile = {
    version: PROMPT_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    prompts,
  };

  if (additional.houseConfig && Object.keys(additional.houseConfig).length > 0) {
    payload.houseConfig = additional.houseConfig;
  }

  if (additional.imageSettings && Object.keys(additional.imageSettings).length > 0) {
    payload.imageSettings = additional.imageSettings;
  }

  return payload;
}

export async function applyAdditionalPromptData(snapshot: AdditionalPromptSnapshot): Promise<AdditionalPromptImportResult> {
  const result: AdditionalPromptImportResult = {
    houseFieldsUpdated: 0,
    imageFieldsUpdated: 0,
    warnings: [],
  };

  if (snapshot.houseConfig && Object.keys(snapshot.houseConfig).length > 0) {
    try {
      const existing = (await repositoryStorage.get<Record<string, unknown>>(HOUSE_CONFIG_KEY)) ?? {};
      const merged = { ...existing } as Record<string, unknown>;
      for (const [key, value] of Object.entries(snapshot.houseConfig)) {
        if (typeof value === 'string') {
          merged[key] = value;
          result.houseFieldsUpdated += 1;
        }
      }
      await repositoryStorage.set(HOUSE_CONFIG_KEY, merged);
    } catch (error) {
      logger.warn('[promptExport] Failed to apply house_config prompts', error);
      result.warnings.push('houseConfig');
      result.houseFieldsUpdated = 0;
    }
  }

  if (snapshot.imageSettings && Object.keys(snapshot.imageSettings).length > 0) {
    try {
      const existing = (await repositoryStorage.get<Record<string, unknown>>(IMAGE_SETTINGS_KEY)) ?? {};
      const merged = { ...existing } as Record<string, unknown>;
      for (const [key, value] of Object.entries(snapshot.imageSettings)) {
        if (typeof value === 'string') {
          merged[key] = value;
          result.imageFieldsUpdated += 1;
        }
      }
      await repositoryStorage.set(IMAGE_SETTINGS_KEY, merged);
      try {
        legacyStorage.setItem(IMAGE_SETTINGS_KEY, JSON.stringify(merged));
      } catch (legacyError) {
        logger.debug('[promptExport] Failed to sync legacy image settings', legacyError);
      }
    } catch (error) {
      logger.warn('[promptExport] Failed to apply image settings prompts', error);
      result.warnings.push('imageSettings');
      result.imageFieldsUpdated = 0;
    }
  }

  return result;
}
