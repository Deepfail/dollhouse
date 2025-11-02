import { FILE_STORAGE_UPDATED_EVENT } from '@/constants/events';
import { logger } from '@/lib/logger';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getDb, saveDatabase } from '../lib/db';

export function useFileStorage<T>(key: string, defaultValue: T) {
  const [data, setData] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const defaultValueRef = useRef(defaultValue);
  
  // Update ref when defaultValue changes
  useEffect(() => {
    defaultValueRef.current = defaultValue;
  }, [defaultValue]);

  const loadData = useCallback(
    async (options?: { showLoading?: boolean }) => {
      const showLoading = options?.showLoading === true;
      if (showLoading) {
        setIsLoading(true);
      }

      try {
        logger.log(`🔍 Loading file storage data for key: ${key}`);
        const { db } = await getDb();
        const rows: any[] = [];

        db.exec({
          sql: 'SELECT value FROM settings WHERE key = ?',
          bind: [key],
          rowMode: 'object',
          callback: (r: any) => rows.push(r),
        });

        if (rows.length > 0) {
          try {
            const parsed = JSON.parse(rows[0].value);
            logger.log(`✅ Loaded file storage data for ${key}:`, parsed);
            setData(parsed);
          } catch (parseError) {
            logger.error(`❌ Failed to parse file storage data for ${key}:`, parseError);
            setData(defaultValueRef.current);
          }
        } else {
          logger.log(`📝 No data found for ${key}, using default value`);
          setData(defaultValueRef.current);
        }
      } catch (error) {
        logger.error(`❌ Failed to load file storage data for ${key}:`, error);
        setData(defaultValueRef.current);
      } finally {
        setIsLoading(false);
      }
    },
    [key],
  );

  // Load data from database on mount
  useEffect(() => {
    void loadData({ showLoading: true });
  }, [loadData]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handler = (event: Event) => {
      const { detail } = event as CustomEvent<{ key?: string }>;
      if (detail?.key !== key) {
        return;
      }
      void loadData();
    };

    window.addEventListener(FILE_STORAGE_UPDATED_EVENT, handler as EventListener);
    return () => {
      window.removeEventListener(FILE_STORAGE_UPDATED_EVENT, handler as EventListener);
    };
  }, [key, loadData]);

  // Save data to database
  const setDataAndSave = useCallback(async (newData: T | ((prev: T) => T)) => {
    try {
      const updatedData = typeof newData === 'function' ? (newData as (prev: T) => T)(data) : newData;
      
  logger.log(`💾 Saving file storage data for ${key}:`, updatedData);
      const { db } = await getDb();
      
      const serializedData = JSON.stringify(updatedData);
      
      // Warn about large data that might cause performance issues
      if (serializedData.length > 100000) {
  logger.warn(`⚠️ Large data detected for ${key}: ${serializedData.length} characters`);
      }
      
      // Wrap in a transaction and use changes() to detect affected rows
      db.exec('BEGIN');
      const before: any[] = [];
      db.exec({ sql: 'SELECT total_changes() AS c', rowMode: 'object', callback: (r: any) => before.push(r) });
      db.exec({ sql: 'UPDATE settings SET value = ? WHERE key = ?', bind: [serializedData, key] });
      const after: any[] = [];
      db.exec({ sql: 'SELECT total_changes() AS c', rowMode: 'object', callback: (r: any) => after.push(r) });
      const changed = (after[0]?.c ?? 0) - (before[0]?.c ?? 0);
      if (changed === 0) {
        db.exec({ sql: 'INSERT INTO settings (key, value) VALUES (?, ?)', bind: [key, serializedData] });
      }
      db.exec('COMMIT');
      
      // Ensure database is persisted to OPFS
      await saveDatabase();
      
      // Update local state immediately for better UX
      setData(updatedData);
  logger.log(`✅ Saved file storage data for ${key}`);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(FILE_STORAGE_UPDATED_EVENT, {
            detail: { key },
          }),
        );
      }
      
      // Optional: Verify the data was saved (but don't fail if verification has issues)
      try {
        const verifyRows: any[] = [];
        db.exec({
          sql: 'SELECT value FROM settings WHERE key = ?',
          bind: [key],
          rowMode: 'object',
          callback: (r: any) => verifyRows.push(r)
        });
        
        if (verifyRows.length > 0) {
          const retrievedData = JSON.parse(verifyRows[0].value);
          if (JSON.stringify(retrievedData) !== serializedData) {
            logger.warn(`⚠️ Verification mismatch for ${key} - data may be corrupted`);
          }
        }
      } catch (verifyError) {
        // Only warn once per page load for verification issues
  logger.warn(`⚠️ Verification failed for ${key}:`, verifyError);
        // Don't throw here - the data was saved, verification just failed
      }
    } catch (error) {
  logger.error(`❌ Failed to save file storage data for ${key}:`, error);
    }
  }, [key, data]);

  return {
    data,
    setData: setDataAndSave,
    isLoading
  };
}