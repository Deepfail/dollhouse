import { useState, useEffect } from 'react';

// DEPRECATED: browserStorage hook - replaced by repository storage
export function useSimpleStorage<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  console.warn(`useSimpleStorage is deprecated for key "${key}". Use useRepositoryKV from useRepositoryStorage instead.`);
  
  const [storedValue, setStoredValue] = useState<T>(defaultValue);

  const setValue = (value: T | ((prev: T) => T)) => {
    const valueToStore = value instanceof Function ? value(storedValue) : value;
    setStoredValue(valueToStore);
    console.warn(`useSimpleStorage setValue called for "${key}" but browserStorage is disabled. Use useRepositoryKV instead.`);
  };

  return [storedValue, setValue];
}

// DEPRECATED: Simple storage functions - replaced by repository storage
export const simpleStorage = {
  get<T>(key: string): T | null {
    console.warn(`simpleStorage.get called for "${key}" but browserStorage is disabled. Use repositoryStorage instead.`);
    return null;
  },

  set<T>(key: string, value: T): void {
    console.warn(`simpleStorage.set called for "${key}" but browserStorage is disabled. Use repositoryStorage instead.`);
  },

  remove(key: string): void {
    console.warn(`simpleStorage.remove called for "${key}" but browserStorage is disabled. Use repositoryStorage instead.`);
  }
};