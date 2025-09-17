// src/lib/sqlite-init.ts
// Custom SQLite initialization for better error handling

let sqlite3: any = null;
let initPromise: Promise<any> | null = null;

export async function initSQLite() {
  if (sqlite3) return sqlite3;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log('🔧 Loading SQLite WASM module...');

      // Try multiple import strategies
      let sqlite3InitModule: any;
      
      try {
        // Standard import
        const mod = await import('@sqlite.org/sqlite-wasm');
        sqlite3InitModule = mod.default;
        console.log('✅ SQLite module imported successfully');
      } catch (importErr) {
        console.error('❌ Failed to import SQLite module:', importErr);
        throw importErr;
      }

      if (!sqlite3InitModule) {
        throw new Error('SQLite initialization module not found');
      }

      console.log('🔧 Initializing SQLite WASM...');
      
      // Initialize with simpler configuration first
      sqlite3 = await sqlite3InitModule({
        print: (...args: any[]) => console.log('[SQLite]', ...args),
        printErr: (...args: any[]) => console.error('[SQLite Error]', ...args),
      });

      console.log('✅ SQLite WASM initialized successfully!');
      console.log('📦 SQLite version:', sqlite3.version.libVersion);
      
      return sqlite3;
    } catch (err) {
      console.error('❌ SQLite initialization failed:', err);
      sqlite3 = null;
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
}

export { sqlite3 };
