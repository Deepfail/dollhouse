import { useState, useEffect } from 'react';

// Dead simple localStorage hook - NO SPARK NONSENSE
export function useSimpleStorage<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      console.log(`[useSimpleStorage] Loading key "${key}":`, item ? 'found' : 'not found');
      if (item) {
        const parsed = JSON.parse(item);
        console.log(`[useSimpleStorage] Parsed value for "${key}":`, parsed);
        return parsed;
      }
      console.log(`[useSimpleStorage] Using default value for "${key}":`, defaultValue);
      return defaultValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      console.log(`[useSimpleStorage] Setting key "${key}" to:`, valueToStore);
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
      console.log(`[useSimpleStorage] Successfully saved key "${key}" to localStorage`);
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}

// Simple storage functions - NO SPARK KV
export const simpleStorage = {
  get<T>(key: string): T | null {
    try {
      const item = window.localStorage.getItem(key);
      console.log(`[simpleStorage] Getting key "${key}":`, item ? 'found' : 'not found');
      if (item) {
        const parsed = JSON.parse(item);
        console.log(`[simpleStorage] Parsed value for "${key}":`, parsed);
        return parsed;
      }
      return null;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return null;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      console.log(`[simpleStorage] Setting key "${key}" to:`, value);
      window.localStorage.setItem(key, JSON.stringify(value));
      console.log(`[simpleStorage] Successfully saved key "${key}" to localStorage`);
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  },

  remove(key: string): void {
    try {
      console.log(`[simpleStorage] Removing key "${key}"`);
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }
};