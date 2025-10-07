/**
 * Prompt Migration Utility
 * 
 * Migrates old prompt storage systems to the centralized Prompt Library
 */

import { legacyStorage } from './legacyStorage';
import { logger } from './logger';
import { setPromptOverride } from './prompts';
import { repositoryStorage } from '@/hooks/useRepositoryStorage';

const MIGRATION_FLAG = 'prompts_migrated_v1';

interface OldHouseConfig {
  copilotPrompt?: string;
  worldPrompt?: string;
}

interface OldWingmanConfig {
  systemPrompt?: string;
  extraPrompts?: string[];
}

/**
 * Migrate old prompt storage to the centralized Prompt Library
 */
export async function migrateOldPrompts(): Promise<void> {
  // Check if already migrated
  const alreadyMigrated = legacyStorage.getItem(MIGRATION_FLAG);
  if (alreadyMigrated === 'true') {
    logger.debug('[promptMigration] Already migrated, skipping');
    return;
  }

  logger.log('[promptMigration] Starting prompt migration...');
  let migratedCount = 0;

  try {
    // Migrate from house_config (repositoryStorage)
    const houseConfig = await repositoryStorage.get<OldHouseConfig>('house_config');
    
    if (houseConfig?.copilotPrompt?.trim()) {
      logger.log('[promptMigration] Migrating copilotPrompt from house_config');
      await setPromptOverride('copilot.mainResponse', houseConfig.copilotPrompt);
      migratedCount++;
    }

    if (houseConfig?.worldPrompt?.trim()) {
      logger.log('[promptMigration] Migrating worldPrompt from house_config');
      await setPromptOverride('house.world.description', houseConfig.worldPrompt);
      migratedCount++;
    }

    // Migrate from wingman_settings (legacyStorage)
    const wingmanRaw = legacyStorage.getItem('wingman_settings');
    if (wingmanRaw) {
      const wingmanConfig: OldWingmanConfig = JSON.parse(wingmanRaw);
      
      if (wingmanConfig?.systemPrompt?.trim()) {
        logger.log('[promptMigration] Migrating wingman systemPrompt');
        await setPromptOverride('copilot.wingman.systemPrompt', wingmanConfig.systemPrompt);
        migratedCount++;
      }
    }

    // Migrate interview prompt
    const interviewPrompt = legacyStorage.getItem('interview_prompt');
    if (interviewPrompt?.trim()) {
      logger.log('[promptMigration] Migrating interview_prompt');
      await setPromptOverride('copilot.interview.template', interviewPrompt);
      migratedCount++;
    }

    // Migrate copilot greeting
    const copilotGreeting = legacyStorage.getItem('copilot_greeting');
    if (copilotGreeting?.trim()) {
      logger.log('[promptMigration] Migrating copilot_greeting');
      await setPromptOverride('copilot.wingman.greeting', copilotGreeting);
      migratedCount++;
    }

    // Mark as migrated
    legacyStorage.setItem(MIGRATION_FLAG, 'true');
    logger.log(`[promptMigration] ✅ Migration complete! Migrated ${migratedCount} prompts`);
  } catch (error) {
    logger.error('[promptMigration] Migration failed:', error);
    throw error;
  }
}

/**
 * Check if prompts need migration
 */
export function needsMigration(): boolean {
  return legacyStorage.getItem(MIGRATION_FLAG) !== 'true';
}

/**
 * Reset migration flag (for testing)
 */
export function resetMigration(): void {
  legacyStorage.removeItem(MIGRATION_FLAG);
  logger.log('[promptMigration] Migration flag reset');
}
