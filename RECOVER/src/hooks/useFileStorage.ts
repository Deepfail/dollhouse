/**
 * useFileStorage Hook
 * 
 * Replaces the old useSimpleStorage hook with proper file-based storage
 */

import { useState, useEffect, useCallback } from 'react';
import { fileStorage } from '@/lib/fileStorage';
import { toast } from 'sonner';

export function useFileStorage<T>(filename: string, defaultValue: T) {
  const [data, setData] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [filename]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const loadedData = await fileStorage.readFile<T>(filename);
      
      if (loadedData !== null) {
        setData(loadedData);
      } else {
        // File doesn't exist, create it with default value
        await fileStorage.writeFile(filename, defaultValue);
        setData(defaultValue);
      }
    } catch (err) {
      const errorMessage = `Failed to load ${filename}: ${err}`;
      setError(errorMessage);
      console.error(errorMessage);
      toast.error(errorMessage);
      setData(defaultValue);
    } finally {
      setIsLoading(false);
    }
  }, [filename, defaultValue]);

  const saveData = useCallback(async (newData: T) => {
    try {
      setError(null);
      await fileStorage.writeFile(filename, newData);
      setData(newData);
      return true;
    } catch (err) {
      const errorMessage = `Failed to save ${filename}: ${err}`;
      setError(errorMessage);
      console.error(errorMessage);
      toast.error(errorMessage);
      return false;
    }
  }, [filename]);

  const updateData = useCallback(async (updater: (current: T) => T) => {
    const newData = updater(data);
    return await saveData(newData);
  }, [data, saveData]);

  const deleteFile = useCallback(async () => {
    try {
      // Sets file content to null to mark as deleted (actual file deletion is not supported by fileStorage)
      
      await fileStorage.writeFile(filename, null);
      setData(defaultValue);
      return true;
    } catch (err) {
      const errorMessage = `Failed to delete ${filename}: ${err}`;
      setError(errorMessage);
      console.error(errorMessage);
      toast.error(errorMessage);
      return false;
    }
  }, [filename, defaultValue]);

  return {
    data,
    setData: saveData,
    updateData,
    deleteFile,
    reload: loadData,
    isLoading,
    error,
    hasError: error !== null
  };
}

export default useFileStorage;