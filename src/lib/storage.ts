// Storage abstraction layer - now using repository instead of browserStorage

export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
}

class RepositoryStorageAdapter implements StorageAdapter {
  async get<T>(key: string): Promise<T | null> {
    try {
      const { getSetting } = await import('../repo/settings');
      return await getSetting<T>(key);
    } catch (error) {
      console.error('Error getting from repository storage:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      const { setSetting } = await import('../repo/settings');
      const { queryClient } = await import('./query');
      await setSetting(key, value);
      queryClient.invalidateQueries({ queryKey: ['settings', key] });
    } catch (error) {
      console.error('Error setting to repository storage:', error);
    }
  }
}

class DisabledStorageAdapter implements StorageAdapter {
  async get<T>(key: string): Promise<T | null> {
    console.warn(`Storage disabled - get called for key "${key}"`);
    return null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    console.warn(`Storage disabled - set called for key "${key}"`);
  }
}

// Create storage instance - use repository storage only
export const storage: StorageAdapter = (() => {
  console.log('Using repository storage');
  return new RepositoryStorageAdapter();
})();

// Helper function to check if running in Spark environment
export const isSparkEnvironment = (): boolean => {
  // Always return false - we're using repository storage now
  return false;
};