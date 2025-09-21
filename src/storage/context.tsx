// storage/context.tsx - React context for storage initialization
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Storage } from './index';
import { getStorageStatus, initStorage } from './init';
import { logger } from '@/lib/logger';

interface StorageContextValue {
  storage: Storage | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  status: string;
}

const StorageContext = createContext<StorageContextValue>({
  storage: null,
  isInitialized: false,
  isLoading: true,
  error: null,
  status: 'initializing...'
});

export function useStorage() {
  const context = useContext(StorageContext);
  if (!context.isInitialized && !context.isLoading) {
    throw new Error('Storage failed to initialize');
  }
  return context;
}

export function StorageProvider({ children }: { children: React.ReactNode }) {
  const [storage, setStorage] = useState<Storage | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('initializing...');

  useEffect(() => {
    const initialize = async () => {
      try {
  // initialization starting
        logger.log('🔧 Initializing unified storage system...');
        
        const storageInstance = await initStorage();
        setStorage(storageInstance);
        
        logger.log('✅ Storage initialized successfully!');
        
        // Get storage status for UI
        const statusInfo = getStorageStatus();
        logger.log('💾 Storage status:', statusInfo);
        
        if (statusInfo) {
          const statusMsg = `✅ ${statusInfo.engine.toUpperCase()} ready (${statusInfo.capabilities.persistence ? 'persistent' : 'memory backup'})`;
          setStatus(`${statusMsg} - ${Object.values(statusInfo.capabilities).filter(Boolean).length}/${Object.keys(statusInfo.capabilities).length} features`);
        } else {
          setStatus('⚠️ Storage status unknown');
        }
        
        setIsInitialized(true);
      } catch (err) {
        logger.error('❌ Storage initialization failed:', err);
        setError(err instanceof Error ? err.message : String(err));
        setStatus(`❌ Storage failed: ${err}`);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  const value: StorageContextValue = {
    storage,
    isInitialized,
    isLoading,
    error,
    status
  };

  return (
    <StorageContext.Provider value={value}>
      {children}
    </StorageContext.Provider>
  );
}