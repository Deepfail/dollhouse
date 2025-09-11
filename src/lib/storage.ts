// Storage abstraction layer for both Spark and local environments

export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
}

class LocalStorageAdapter implements StorageAdapter {
  async get<T>(key: string): Promise<T | null> {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error getting from localStorage:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error setting to localStorage:', error);
    }
  }
}

class SparkStorageAdapter implements StorageAdapter {
  async get<T>(key: string): Promise<T | null> {
    try {
      return await (window as any).spark.kv.get(key);
    } catch (error) {
      console.error('Error getting from Spark storage:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await (window as any).spark.kv.set(key, value);
    } catch (error) {
      console.error('Error setting to Spark storage:', error);
    }
  }
}

// Create storage instance based on environment
export const storage: StorageAdapter = (() => {
  // Always use localStorage for local development to avoid Spark KV rate limits
  if (import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('Using localStorage for local development');
    return new LocalStorageAdapter();
  } else if (typeof window !== 'undefined' && (window as any).spark?.kv) {
    console.log('Using Spark storage');
    return new SparkStorageAdapter();
  } else {
    console.log('Using localStorage fallback');
    return new LocalStorageAdapter();
  }
})();

// Helper function to check if running in Spark environment
export const isSparkEnvironment = (): boolean => {
  // For local development, always return false to avoid Spark dependencies
  if (import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return false;
  }
  return typeof window !== 'undefined' && !!(window as any).spark?.kv;
};