import { useState, useEffect, useCallback } from 'react';

// DEPRECATED: Local storage implementation of useKV hook - replaced by repository storage
// This hook is disabled and redirects to repository storage
export function useKV<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  console.warn(`useKV is deprecated for key "${key}". Use useRepositoryKV from useRepositoryStorage instead.`);
  
  const [value, setValue] = useState<T>(defaultValue);

  const setStoredValue = useCallback((newValue: T | ((prev: T) => T)) => {
    const updatedValue = typeof newValue === 'function' 
      ? (newValue as (prev: T) => T)(value) 
      : newValue;
    setValue(updatedValue);
    console.warn(`useKV setStoredValue called for "${key}" but localStorage is disabled. Use useRepositoryKV instead.`);
  }, [key, value]);

  return [value, setStoredValue];
}