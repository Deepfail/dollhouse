// src/lib/db.ts
let sqlite3: any;
let db: any;

export async function getDb() {
  if (db) return { db };

  try {
    // @ts-ignore: provided by @sqlite.org/sqlite-wasm
    const mod = await import('@sqlite.org/sqlite-wasm');
    // Some builds export default as init fn; others export sqlite3InitModule
    const init = (mod as any).default ?? (mod as any).sqlite3InitModule;
    sqlite3 = await init({});
  } catch (err) {
    throw new Error(
      'sqlite-wasm not installed/loaded. `npm i @sqlite.org/sqlite-wasm` and ensure this file matches its API.'
    );
  }

  // Try to use OPFS for persistence, fallback to in-memory
  try {
    // OPFS is optional (non-secure contexts); init if available
    if (sqlite3?.opfs?.init) {
      await sqlite3.opfs.init();
    }

    // Try to create persistent DB file in OPFS
    if (sqlite3.oo1.OpfsDb) {
      db = new sqlite3.oo1.OpfsDb('dollhouse/data.db'); // path is virtual inside OPFS
      console.log('✅ Using OPFS persistent database');
    } else {
      throw new Error('OpfsDb not available');
    }
  } catch (opfsError) {
    console.warn('⚠️ OPFS not available, using in-memory database:', opfsError);
    // Fallback to in-memory database
    db = new sqlite3.oo1.DB(':memory:', 'c');
    console.log('✅ Using in-memory database (data will not persist)');
  }

  db.exec('PRAGMA journal_mode=WAL;');
  db.exec('PRAGMA foreign_keys=ON;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,          -- 'openrouter' | 'venice' | etc.
      key_value TEXT NOT NULL,         -- plain for now; swap to encrypted later
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar_path TEXT,
      bio TEXT DEFAULT '',
      traits_json TEXT NOT NULL,
      tags_json TEXT NOT NULL,
      system_prompt TEXT DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,              -- 'individual' | 'group' | 'scene'
      title TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS session_participants (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      joined_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      sender_id TEXT,                  -- NULL for user, character_id for character
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      owner_type TEXT NOT NULL,        -- 'character' | 'chat' | 'global'
      owner_id TEXT,                   -- foreign key to owner entity
      asset_type TEXT NOT NULL,        -- 'image' | 'audio' | 'video'
      file_path TEXT NOT NULL,         -- path in OPFS
      metadata_json TEXT,              -- format-specific metadata
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_messages_session
      ON messages(session_id, created_at);

    CREATE INDEX IF NOT EXISTS idx_session_participants
      ON session_participants(session_id, character_id);

    CREATE INDEX IF NOT EXISTS idx_assets_owner
      ON assets(owner_type, owner_id);
  `);

  return { db };
}

export async function checkPersistence() {
  try {
    const { db } = await getDb();
    
    // Create test table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS test_persistence (
        id INTEGER PRIMARY KEY,
        data TEXT
      )
    `);
    
    // Try to write test data
    try {
      db.exec({
        sql: 'INSERT OR REPLACE INTO test_persistence (id, data) VALUES (1, ?)',
        bind: [`test-${Date.now()}`]
      });
    } catch (writeError) {
      console.error('❌ Cannot write to database:', writeError);
      return { isPersistent: false, canWrite: false };
    }
    
    // Try to read it back
    const rows: any[] = [];
    db.exec({
      sql: 'SELECT data FROM test_persistence WHERE id = 1',
      rowMode: 'object',
      callback: (r: any) => rows.push(r)
    });
    const row = rows[0];
    
    // Check if we're using OPFS or in-memory
    const isOpfs = db.constructor.name === 'OpfsDb';
    
    return {
      isPersistent: isOpfs,
      testData: row?.data,
      canWrite: true
    };
  } catch (error) {
    console.error('❌ Persistence check failed:', error);
    return { isPersistent: false, canWrite: false };
  }
}

// This function is no longer needed with OPFS, but kept for compatibility
export async function saveDatabaseToStorage() {
  // OPFS databases auto-save, so this is a no-op
  console.log('💾 OPFS database auto-persists');
}

// Alias for compatibility
export const saveDatabase = saveDatabaseToStorage;