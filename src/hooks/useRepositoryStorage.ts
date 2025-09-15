import { useState, useEffect } from 'react';
import { getSetting, setSetting } from '../repo/settings';
import { queryClient } from '../lib/query';

/**
 * Hook that replaces browserStorage usage with the settings repository
 * This provides a similar API to useLocalKV but uses the database instead
 */
export function useRepositoryKV<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(defaultValue);
  const [loaded, setLoaded] = useState(false);

  // Load initial value from database
  useEffect(() => {
    const loadValue = async () => {
      try {
        const storedValue = await getSetting<T>(key);
        if (storedValue !== null) {
          setValue(storedValue);
        }
      } catch (error) {
        console.error(`Error loading setting "${key}":`, error);
      } finally {
        setLoaded(true);
      }
    };
    loadValue();
  }, [key]);

  const setStoredValue = async (newValue: T | ((prev: T) => T)) => {
    try {
      const updatedValue = typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(value) 
        : newValue;
      
      setValue(updatedValue);
      await setSetting(key, updatedValue);
      
      // Invalidate React Query cache for settings
      queryClient.invalidateQueries({ queryKey: ['settings', key] });
    } catch (error) {
      console.error(`Error setting setting "${key}":`, error);
    }
  };

  return [value, setStoredValue];
}

/**
 * Simple storage replacement using the settings repository
 */
export const repositoryStorage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      return await getSetting<T>(key);
    } catch (error) {
      console.warn(`Error reading setting "${key}":`, error);
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await setSetting(key, value);
      queryClient.invalidateQueries({ queryKey: ['settings', key] });
    } catch (error) {
      console.error(`Error setting setting "${key}":`, error);
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await setSetting(key, null);
      queryClient.invalidateQueries({ queryKey: ['settings', key] });
    } catch (error) {
      console.error(`Error removing setting "${key}":`, error);
    }
  }
};