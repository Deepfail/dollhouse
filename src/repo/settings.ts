// repo/settings-new.ts - Updated settings using unified storage
import { logger } from '@/lib/logger';
import { StorageAdapter } from '../storage/adapters';

export async function listSettings() {
  // For now, return empty array since we don't have a full settings list in the adapter
  return [];
}

export async function getSetting<T = any>(key: string): Promise<T | null> {
  logger.log(`🔍 Getting setting ${key}...`);
  try {
    const value = await StorageAdapter.getSetting(key);
    if (value === null) {
  logger.log(`❌ Setting ${key} not found`);
      return null;
    }
  logger.log(`✅ Setting ${key} found:`, value);
    return value;
  } catch (error) {
  logger.error(`❌ Failed to get setting ${key}:`, error);
    return null;
  }
}

export async function setSetting<T = any>(key: string, value: T): Promise<void> {
  logger.log(`💾 Setting ${key} to:`, value);
  try {
    await StorageAdapter.setSetting(key, value);
  logger.log(`✅ Setting ${key} saved successfully`);
  } catch (error) {
  logger.error(`❌ Failed to set setting ${key}:`, error);
    throw error;
  }
}

export async function deleteSetting(key: string): Promise<void> {
  logger.log(`🗑️ Deleting setting ${key}...`);
  try {
    await StorageAdapter.setSetting(key, null);
  logger.log(`✅ Setting ${key} deleted`);
  } catch (error) {
  logger.error(`❌ Failed to delete setting ${key}:`, error);
    throw error;
  }
}