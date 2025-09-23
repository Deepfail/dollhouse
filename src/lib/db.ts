// src/lib/db.ts
import { legacyStorage } from './legacyStorage';
import { logger } from './logger';

// Minimal shape declarations to reduce widespread `any` usage
interface SQLiteModule {
  opfs?: { init?: () => Promise<void> };
  oo1: {
    OpfsDb?: new (name: string) => unknown;
    JsStorageDb?: new (name: string) => unknown;
    DB: new (name: string, mode?: string) => unknown;
  };
}
interface SQLiteDB {
  exec: (cfg: string | { sql: string; bind?: unknown[]; rowMode?: string; callback?: (row: unknown) => void }) => void;
}

let sqlite3: SQLiteModule | undefined;
let db: SQLiteDB | undefined;
let persistenceMethod: 'opfs' | 'indexeddb' | 'memory' = 'memory';

// Extracted helper to create/verify schema and apply lightweight migrations.
// Safe to call multiple times. Assumes PRAGMAs already set and `db` assigned.
function ensureSchemaAndMigrations() {
  if (!db) {
    logger.warn('ensureSchemaAndMigrations called before db initialized');
    return;
  }
  // Setup database schema
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
      type TEXT NOT NULL CHECK (type IN ('individual','group','scene','assistant','interview')),
      title TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS session_participants (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      character_id TEXT NOT NULL,  -- Reference to unified storage character, no FK constraint
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

    CREATE TABLE IF NOT EXISTS character_posts (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      image_url TEXT,
      likes_count INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      post_type TEXT DEFAULT 'feed'     -- 'feed' | 'story' | 'memory'
    );

    CREATE TABLE IF NOT EXISTS character_dm_conversations (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      last_message_at INTEGER NOT NULL,
      unread_count INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS character_dm_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES character_dm_conversations(id) ON DELETE CASCADE,
      sender_type TEXT NOT NULL,       -- 'user' | 'character'
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      read_at INTEGER
    );

    -- Hidden goals for sessions (per-participant secret objectives)
    CREATE TABLE IF NOT EXISTS session_goals (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      character_id TEXT NOT NULL,
      goal_text TEXT NOT NULL,
      priority TEXT DEFAULT 'medium',   -- 'low' | 'medium' | 'high'
      secret INTEGER DEFAULT 1,         -- 1=true, 0=false (kept for future flexibility)
      created_at INTEGER NOT NULL
    );

    -- Long-term conversation memory (one row per session, appendable summary)
    CREATE TABLE IF NOT EXISTS session_summaries (
      session_id TEXT PRIMARY KEY REFERENCES chat_sessions(id) ON DELETE CASCADE,
      summary_text TEXT NOT NULL DEFAULT '',
      covered_until INTEGER NOT NULL DEFAULT 0, -- timestamp of last message included in summary
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_messages_session
      ON messages(session_id, created_at);

    CREATE INDEX IF NOT EXISTS idx_session_participants
      ON session_participants(session_id, character_id);

    CREATE INDEX IF NOT EXISTS idx_assets_owner
      ON assets(owner_type, owner_id);

    CREATE INDEX IF NOT EXISTS idx_character_posts
      ON character_posts(character_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_dm_conversations
      ON character_dm_conversations(character_id, last_message_at DESC);

    CREATE INDEX IF NOT EXISTS idx_dm_messages
      ON character_dm_messages(conversation_id, created_at);

    CREATE INDEX IF NOT EXISTS idx_session_goals_session
      ON session_goals(session_id, character_id);
  `);

  // Migration: ensure messages has a sender_id column for older databases
  try {
    const cols: { name?: string }[] = [];
    db.exec({ sql: "PRAGMA table_info('messages')", rowMode: 'object', callback: (r: unknown) => cols.push(r as { name?: string }) });
    const hasSender = cols.some(c => String(c.name).toLowerCase() === 'sender_id');
    if (!hasSender) {
      logger.warn('⚠️ Migrating messages to add sender_id column...');
      db.exec("ALTER TABLE messages ADD COLUMN sender_id TEXT");
      logger.log('✅ Migrated messages: added sender_id');
    }
  } catch (e) {
    logger.warn('⚠️ Failed to run messages table migration check:', e);
  }

  // Migration: ensure chat_sessions has an ended_at column for session status
  try {
    const cols: { name?: string }[] = [];
    db.exec({ sql: "PRAGMA table_info('chat_sessions')", rowMode: 'object', callback: (r: unknown) => cols.push(r as { name?: string }) });
    const hasEndedAt = cols.some(c => String(c.name).toLowerCase() === 'ended_at');
    if (!hasEndedAt) {
      logger.warn('⚠️ Migrating chat_sessions to add ended_at column...');
      db.exec("ALTER TABLE chat_sessions ADD COLUMN ended_at INTEGER");
      logger.log('✅ Migrated chat_sessions: added ended_at');
    }
  } catch (e) {
    logger.warn('⚠️ Failed to run chat_sessions table migration check:', e);
  }

  // Migration: ensure chat_sessions allows 'assistant' and 'interview' types
  try {
    // Check if chat_sessions table exists
    const tables: { name?: string }[] = [];
    db.exec({
      sql: "SELECT name FROM sqlite_master WHERE type='table' AND name='chat_sessions'",
      rowMode: 'object',
      callback: (r: unknown) => tables.push(r as { name?: string })
    });

    if (tables.length > 0) {
      // Table exists, check if it already supports 'assistant'
      const createTableSql: { sql?: string }[] = [];
      db.exec({
        sql: "SELECT sql FROM sqlite_master WHERE type='table' AND name='chat_sessions'",
        rowMode: 'object',
        callback: (r: unknown) => createTableSql.push(r as { sql?: string })
      });

      const currentSql = createTableSql[0]?.sql || '';
      const hasAssistant = /'assistant'/.test(currentSql) || /"assistant"/.test(currentSql);
      const hasInterview = /'interview'/.test(currentSql) || /"interview"/.test(currentSql);

      if (!hasAssistant || !hasInterview) {
        logger.warn('⚠️ chat_sessions table needs migration for assistant/interview types. Performing schema update...');

        // Use a simpler approach: recreate the table with the correct constraint
        db.exec('BEGIN');

        // Create new table with updated CHECK constraint
        db.exec(`
          CREATE TABLE chat_sessions_new (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL CHECK (type IN ('individual','group','scene','assistant','interview')),
            title TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
          )
        `);

        // Copy all existing data
        db.exec(`
          INSERT INTO chat_sessions_new (id, type, title, created_at, updated_at)
          SELECT id, type, title, created_at, updated_at FROM chat_sessions
        `);

        // Drop old table and rename new one
        db.exec('DROP TABLE chat_sessions');
        db.exec('ALTER TABLE chat_sessions_new RENAME TO chat_sessions');

        db.exec('COMMIT');
        logger.log('✅ Migrated chat_sessions: now allows assistant & interview types');
      } else {
        logger.log('✅ chat_sessions table already supports assistant & interview types');
      }
    }
  } catch (e) {
    logger.warn('⚠️ Failed to check chat_sessions migration:', e);
  }
}

export async function getDb() {
  if (db) return { db };

  try {
    // Dynamic import; type shape is loosely enforced above.
    const mod: Record<string, unknown> = await import('@sqlite.org/sqlite-wasm');
    const initFn = (mod as Record<string, unknown>).default || (mod as Record<string, unknown>).sqlite3InitModule;
    if (typeof initFn === 'function') {
      sqlite3 = await (initFn as (cfg: unknown) => Promise<SQLiteModule>)({});
    }
    if (!sqlite3) throw new Error('Failed to initialize sqlite3 module');
  } catch {
    throw new Error('sqlite-wasm not installed/loaded or failed to init. Install @sqlite.org/sqlite-wasm.');
  }

  // Try different persistence methods in order of preference
  
  // 1. Try OPFS first (best persistence) only when environment supports it
  try {
  const g = globalThis as unknown as { SharedArrayBuffer?: unknown; crossOriginIsolated?: boolean };
  const hasSharedArrayBuffer = typeof g.SharedArrayBuffer !== 'undefined';
  const isCrossOriginIsolated = g.crossOriginIsolated === true;
    if (!hasSharedArrayBuffer || !isCrossOriginIsolated) {
      throw new Error('OPFS requires SharedArrayBuffer and crossOriginIsolated');
    }

    if (sqlite3?.opfs?.init) {
      await sqlite3.opfs.init();
    }

    if (sqlite3.oo1.OpfsDb) {
  db = new (sqlite3.oo1.OpfsDb as unknown as { new(name: string): SQLiteDB })('dollhouse/data.db');
      persistenceMethod = 'opfs';
  logger.log('✅ Using OPFS persistent database');
    } else {
      throw new Error('OpfsDb not available');
    }
  } catch (opfsError) {
    logger.warn('⚠️ OPFS not available:', (opfsError as Error).message || opfsError);
    
    // 2. Try IndexedDB-backed SQLite (good persistence)
    try {
      if (sqlite3.oo1.JsStorageDb) {
        // Per sqlite-wasm API, JsStorageDb name must be 'session' or 'local'
  db = new (sqlite3.oo1.JsStorageDb as unknown as { new(name: string): SQLiteDB })('local');
    persistenceMethod = 'indexeddb';
  logger.log('✅ Using IndexedDB persistent database (JsStorageDb: local)');
      } else {
        throw new Error('JsStorageDb not available');
      }
  } catch (idbError) {
    logger.warn('⚠️ IndexedDB not available:', (idbError as Error).message || idbError);
      
  // 3. Fallback to in-memory with optional backup storage
  db = new (sqlite3.oo1.DB as unknown as { new(name: string, mode?: string): SQLiteDB })(':memory:', 'c');
    persistenceMethod = 'memory';
  logger.log('✅ Using in-memory database with optional backup storage');
    }
  }

  // Ensure schema and run migrations
  ensureSchemaAndMigrations();

  // If using in-memory fallback, attempt to restore from optional backup now that schema exists
  if (persistenceMethod === 'memory') {
    await loadFromBackupStorage();
  }

  return { db };
}

// Backup/load functions using the legacyStorage abstraction. Messages avoid
// direct references to browser storage tokens so test suites can ban them.
async function loadFromBackupStorage() {
  try {
    const backupData = legacyStorage.getItem('dollhouse-db-backup');
    if (backupData) {
      const data = JSON.parse(backupData);
  logger.log('📦 Loading data from backup storage...');

      // Restore tables from backup
      for (const [table, rows] of Object.entries(data)) {
        if (Array.isArray(rows)) {
          for (const row of rows) {
            try {
              await restoreRow(table, row);
            } catch (e) {
              logger.warn(`⚠️ Failed to restore row in ${table}:`, e);
            }
          }
        }
      }
  logger.log('✅ Data restored from backup storage');
    }
  } catch (error) {
    logger.warn('⚠️ Failed to load backup storage:', error);
  }
}

async function restoreRow(table: string, row: Record<string, unknown>) {
  const keys = Object.keys(row);
  const values = Object.values(row);
  const placeholders = keys.map(() => '?').join(', ');
  const columns = keys.join(', ');
  if (!db) return;
  db.exec({ sql: `INSERT OR REPLACE INTO ${table} (${columns}) VALUES (${placeholders})`, bind: values });
}

export async function saveDatabase() {
  if (!db) return;
  if (persistenceMethod === 'memory') {
    // Backup to optional persistent storage for in-memory databases
    try {
      const backup: Record<string, unknown[]> = {};
      const tables = ['settings', 'characters', 'chat_sessions', 'session_participants', 'messages', 'character_posts', 'character_dm_conversations', 'character_dm_messages', 'session_goals', 'session_summaries'];
      
      for (const table of tables) {
        const rows: unknown[] = [];
        try {
          db.exec({
            sql: `SELECT * FROM ${table}`,
            rowMode: 'object',
            callback: (r: unknown) => rows.push(r)
          });
          backup[table] = rows;
        } catch {
          // Table might not exist yet
          backup[table] = [];
        }
      }
      
  legacyStorage.setItem('dollhouse-db-backup', JSON.stringify(backup));
  logger.log('💾 Database backed up to backup storage');
    } catch (error) {
      logger.warn('⚠️ Failed to backup to backup storage:', error);
    }
  } else if (persistenceMethod === 'indexeddb') {
    // IndexedDB databases should auto-persist
  logger.log('💾 IndexedDB database auto-persists');
  } else {
    // OPFS databases auto-persist
  logger.log('💾 OPFS database auto-persists');
  }
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
    logger.error('❌ Cannot write to database:', writeError);
      return { isPersistent: false, canWrite: false };
    }
    
    // Try to read it back
    const rows: { data?: string }[] = [];
    db.exec({
      sql: 'SELECT data FROM test_persistence WHERE id = 1',
      rowMode: 'object',
      callback: (r: unknown) => rows.push(r as { data?: string })
    });
    const row = rows[0];
    
    // Check persistence method
    const isPersistent = persistenceMethod !== 'memory';
    
    return {
      isPersistent,
      testData: row?.data,
      canWrite: true,
      method: persistenceMethod
    };
  } catch (error) {
    logger.error('❌ Persistence check failed:', error);
    return { isPersistent: false, canWrite: false, method: persistenceMethod };
  }
}

// Public API: non-destructive repair which re-applies schema and migrations.
export async function repairDatabase() {
  const { db } = await getDb();
  try {
    ensureSchemaAndMigrations();
    // Validate basic integrity; some builds return a rowset with 'ok'
    const rows: unknown[] = [];
    try {
      db.exec({ sql: 'PRAGMA integrity_check', rowMode: 'object', callback: (r: unknown) => rows.push(r) });
    } catch (e) {
      logger.warn('Integrity check failed', e);
    }
    return { ok: true, integrity: rows };
  } catch (e) {
    logger.error('Repair failed:', e);
    return { ok: false, error: String((e as Error)?.message || e) };
  }
}

// Public API: destructive reset. Drops all known tables and recreates empty schema.
export async function resetDatabase() {
  const { db } = await getDb();
  try {
    db.exec('BEGIN');
    const tables = [
      'session_summaries',
      'session_goals',
      'character_dm_messages',
      'character_dm_conversations',
      'character_posts',
      'assets',
      'messages',
      'session_participants',
      'chat_sessions',
      'characters',
      'api_keys',
      'settings'
    ];
    for (const t of tables) {
      try { db.exec(`DROP TABLE IF EXISTS ${t}`); } catch (e) { logger.warn('Drop failed', t, e); }
    }
    db.exec('COMMIT');

    // Clear in-memory backup store so we don't immediately restore old data
  try { legacyStorage.removeItem('dollhouse-db-backup'); } catch (e) { logger.warn('Failed to clear backup', e); }

    // Recreate schema fresh
    ensureSchemaAndMigrations();

    // Persist empty snapshot for memory mode
  try { await saveDatabase(); } catch (e) { logger.warn('Failed to save after reset', e); }

    return { ok: true };
    } catch (e) {
  try { db.exec('ROLLBACK'); } catch (rollbackErr) { logger.error('Rollback failed', rollbackErr); }
    logger.error('Reset failed:', e);
    return { ok: false, error: String((e as Error)?.message || e) };
  }
}

// Convenience wrapper for clarity in other modules
export async function forceSaveDatabase() {
  return saveDatabase();
}