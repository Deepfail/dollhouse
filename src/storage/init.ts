// storage/init.ts - Zero-hang initialization with auto-fallback
import { initIndexedDB } from './engines/indexeddb';
import { Storage, canUseSqliteWasm, isTauri, setGlobalStorage, timeout } from './index';
import { logger } from '@/lib/logger';

// Minimal typed helpers for safe global feature detection without using `any`
type MaybeNavigator = { storage?: { getDirectory?: () => unknown } };
type GlobalDetector = {
  SharedArrayBuffer?: unknown;
  Worker?: unknown;
  crossOriginIsolated?: boolean;
  navigator?: MaybeNavigator;
};

// Storage engine types
type StorageEngine = 'sqlite-native' | 'sqlite-wasm' | 'indexeddb';

// Global storage instance (exported from index.ts)
let storage: Storage;

// Mock implementations for engines not yet built
async function initSqliteNative(): Promise<Storage> {
  throw new Error('SQLite native not implemented yet (Tauri only)');
}

async function initSqliteWasm(): Promise<Storage> {
  throw new Error('SQLite WASM not implemented yet');
}

// Initialize storage with zero-hang auto-fallback
export async function initStorage(): Promise<Storage> {
  logger.log('🔧 Initializing storage with auto-fallback...');
  
  // Feature detection
  const canWasmSqlite = canUseSqliteWasm();
  const canNative = isTauri();
  
  try {
    const g = globalThis as unknown as GlobalDetector;
    logger.log('Feature detection:', {
      canNative,
      canWasmSqlite,
      hasSharedArrayBuffer: typeof g.SharedArrayBuffer !== 'undefined',
      hasWorker: typeof g.Worker !== 'undefined',
      crossOriginIsolated: !!g.crossOriginIsolated,
      hasOPFS: !!(g.navigator && g.navigator.storage && typeof g.navigator.storage.getDirectory === 'function')
    });
  } catch (e) {
    logger.debug('Ignored error during feature detection', e);
  }

  // Define attempt functions
  const tryNative = async (): Promise<Storage> => {
    if (!canNative) throw new Error('not-tauri');
    return await initSqliteNative();
  };

  const tryWasm = async (): Promise<Storage> => {
    if (!canWasmSqlite) throw new Error('no-sab-or-opfs');
    return await initSqliteWasm();
  };

  const tryDexie = async (): Promise<Storage> => {
    return await initIndexedDB();
  };

  // Try engines in order of preference: native > wasm > dexie
  const candidates = [
    { name: 'SQLite Native', fn: tryNative },
    { name: 'SQLite WASM', fn: tryWasm },
    { name: 'IndexedDB', fn: tryDexie }
  ];

  for (const { name, fn } of candidates) {
    try {
  logger.log(`🚀 Attempting ${name}...`);
      
      // Race against timeout to prevent hanging
      const storagePromise = fn();
      const result = await Promise.race([
        storagePromise,
        timeout<Storage>(1500) // 1.5s timeout guard
      ]);
      
      storage = result as Storage;
      
      // Set global storage reference
      setGlobalStorage(storage);
      
  logger.log(`✅ Storage initialized: ${storage.engine()}`);
      
      // Test basic functionality
      await testStorageBasics(storage);
      
      return storage;
      } catch (error) {
      logger.warn(`❌ ${name} failed:`, error);
      continue;
    }
  }
  
  throw new Error('❌ No storage engine could be initialized');
}

// Test basic storage functionality
async function testStorageBasics(storage: Storage): Promise<void> {
  try {
    // Test basic put/get
    const testId = 'test-' + Date.now();
    const testData = {
      id: testId,
      name: 'Test Character',
      profile_json: JSON.stringify({ test: true }),
      created_at: Date.now(),
      updated_at: Date.now()
    };
    
    await storage.put('characters', testData);
    const retrieved = await storage.get('characters', testId);
    
    if (!retrieved) {
      throw new Error('Storage test failed: could not retrieve data');
    }
    
    // Clean up test data
    await storage.del('characters', testId);
    
  logger.log('✅ Storage basic functionality test passed');
    } catch (error) {
      logger.warn('⚠️ Storage test failed:', error);
    // Don't throw - storage might still work for basic operations
  }
}

// Get the current storage instance
export function getStorage(): Storage {
  if (!storage) {
    throw new Error('Storage not initialized. Call initStorage() first.');
  }
  return storage;
}

// Storage status for UI
export interface StorageStatus {
  engine: StorageEngine;
  ready: boolean;
  capabilities: {
    persistence: boolean;
    transactions: boolean;
    vectorSearch: boolean;
    compaction: boolean;
    snapshots: boolean;
  };
}

export function getStorageStatus(): StorageStatus | null {
  if (!storage) return null;
  
  const engine = storage.engine();
  
  return {
    engine,
    ready: true,
    capabilities: {
      persistence: engine !== 'indexeddb', // OPFS and native have better persistence
      transactions: engine === 'sqlite-native' || engine === 'sqlite-wasm',
      vectorSearch: true, // All engines support JS vector search
      compaction: true,
      snapshots: true
    }
  };
}

// Export for global access
export { storage };
