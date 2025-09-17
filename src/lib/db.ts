// src/lib/db.ts
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

let db: any = null;
let isInitialized = false;
const DB_STORAGE_KEY = 'dollhouse-sqlite-db';

// Ensure default settings exist in the database
async function ensureDefaultSettings(db: any) {
  console.log('🔧 Ensuring default settings exist...');

  // Check if copilot_presets setting exists
  const presetRows: any[] = [];
  db.exec({
    sql: 'SELECT value FROM settings WHERE key = ?',
    bind: ['copilot_presets'],
    rowMode: 'object',
    callback: (r: any) => presetRows.push(r)
  });

  if (presetRows.length === 0) {
    console.log('🔧 Initializing default copilot presets...');
    const defaultPresets = [
      {
        id: 'default',
        name: 'Default',
        systemPrompt: 'You are a helpful AI assistant for character creation and roleplaying. Help users create engaging, detailed characters with rich personalities and backgrounds.',
        params: { temperature: 0.8, max_tokens: 1000, top_p: 0.9 }
      }
    ];

    db.exec({
      sql: 'INSERT INTO settings (key, value) VALUES (?, ?)',
      bind: ['copilot_presets', JSON.stringify(defaultPresets)]
    });
    console.log('✅ Default copilot presets initialized');
  }

  // Check if current_preset setting exists
  const currentRows: any[] = [];
  db.exec({
    sql: 'SELECT value FROM settings WHERE key = ?',
    bind: ['current_preset'],
    rowMode: 'object',
    callback: (r: any) => currentRows.push(r)
  });

  if (currentRows.length === 0) {
    console.log('🔧 Setting default current preset...');
    db.exec({
      sql: 'INSERT INTO settings (key, value) VALUES (?, ?)',
      bind: ['current_preset', 'default']
    });
    console.log('✅ Default current preset set');
  }

  // Check if house_config setting exists
  const houseConfigRows: any[] = [];
  db.exec({
    sql: 'SELECT value FROM settings WHERE key = ?',
    bind: ['house_config'],
    rowMode: 'object',
    callback: (r: any) => houseConfigRows.push(r)
  });

  if (houseConfigRows.length === 0) {
    console.log('🔧 Initializing default house config...');
    const defaultHouseConfig = {
      name: 'Digital Dollhouse',
      worldPrompt: '',
      copilotPrompt: 'You are a helpful AI assistant monitoring the digital dollhouse. You help manage character relationships, suggest activities, and ensure everyone has a good time.',
      copilotMaxTokens: 1000,
      aiSettings: {
        textProvider: 'openrouter',
        textModel: 'deepseek/deepseek-chat',
        imageProvider: 'venice',
        imageModel: 'venice-sd35'
      },
      autoCreator: {
        enabled: false,
        interval: 60,
        maxCharacters: 10,
        themes: ['fantasy', 'modern', 'sci-fi']
      }
    };

    db.exec({
      sql: 'INSERT INTO settings (key, value) VALUES (?, ?)',
      bind: ['house_config', JSON.stringify(defaultHouseConfig)]
    });
    console.log('✅ Default house config initialized');
  }

  // Migrate any corrupted character data
  try {
    console.log('🔧 Checking for corrupted character data...');
    const characterRows: any[] = [];
    db.exec({
      sql: 'SELECT id, traits_json, tags_json FROM characters',
      rowMode: 'object',
      callback: (r: any) => characterRows.push(r)
    });

    let fixedCount = 0;
    for (const row of characterRows) {
      let needsUpdate = false;
      let newTraitsJson = row.traits_json;
      let newTagsJson = row.tags_json;

      // Check traits_json
      if (row.traits_json) {
        try {
          const parsed = JSON.parse(row.traits_json);
          if (!Array.isArray(parsed)) {
            newTraitsJson = JSON.stringify([]);
            needsUpdate = true;
          }
        } catch {
          newTraitsJson = JSON.stringify([]);
          needsUpdate = true;
        }
      }

      // Check tags_json
      if (row.tags_json) {
        try {
          const parsed = JSON.parse(row.tags_json);
          if (!Array.isArray(parsed)) {
            newTagsJson = JSON.stringify([]);
            needsUpdate = true;
          }
        } catch {
          newTagsJson = JSON.stringify([]);
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        db.exec({
          sql: 'UPDATE characters SET traits_json = ?, tags_json = ? WHERE id = ?',
          bind: [newTraitsJson, newTagsJson, row.id]
        });
        fixedCount++;
      }
    }

    if (fixedCount > 0) {
      console.log(`✅ Fixed ${fixedCount} corrupted character records`);
    } else {
      console.log('✅ No corrupted character data found');
    }
  } catch (migrationError) {
    console.error('⚠️ Failed to migrate character data:', migrationError);
  }

  console.log('✅ Default settings ensured');
}

async function saveDatabaseToStorage() {
  if (!db) return;

  try {
    console.log('💾 Exporting database as SQL dump...');

    // Get all table names
    const tables: any[] = [];
    db.exec({
      sql: "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      rowMode: 'object',
      callback: (r: any) => tables.push(r)
    });

    console.log('💾 Found tables:', tables.map(t => t.name));

    let sqlDump = '';

    // Export schema for each table
    for (const table of tables) {
      const tableName = table.name;

      // Get CREATE statement
      const createStmts: any[] = [];
      db.exec({
        sql: `SELECT sql FROM sqlite_master WHERE type='table' AND name=?`,
        bind: [tableName],
        rowMode: 'object',
        callback: (r: any) => createStmts.push(r)
      });

      if (createStmts[0]?.sql) {
        sqlDump += createStmts[0].sql + ';\n';
      }

      // Get all data from table
      const rows: any[] = [];
      try {
        db.exec({
          sql: `SELECT * FROM ${tableName}`,
          rowMode: 'object',
          callback: (r: any) => rows.push(r)
        });

        // Generate INSERT statements
        for (const row of rows) {
          const columns = Object.keys(row);
          const values = columns.map(col => {
            const val = row[col];
            if (val === null) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            return val;
          });
          sqlDump += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
        }
      } catch (error) {
        console.warn(`💾 Could not export data from table ${tableName}:`, error);
      }
    }

    console.log('💾 SQL dump length:', sqlDump.length);
    localStorage.setItem(DB_STORAGE_KEY, sqlDump);
    console.log('💾 Database saved to localStorage as SQL dump');
  } catch (error) {
    console.error('❌ Failed to save database to localStorage:', error);
  }
}async function loadDatabaseFromStorage(sqlite3: any): Promise<any | null> {
  try {
    const storedData = localStorage.getItem(DB_STORAGE_KEY);
    if (!storedData) {
      console.log('📭 No stored database found, starting fresh');
      return null;
    }

    console.log('📥 Loading database from SQL dump, length:', storedData.length);

    // Create new database
    const importedDb = new sqlite3.oo1.DB(':memory:', 'c');
    console.log('📥 Created new database, executing SQL dump...');

    // Execute the SQL dump
    importedDb.exec(storedData);
    console.log('📥 Database loaded from localStorage SQL dump');

    // Test the imported database
    try {
      const testRows: any[] = [];
      importedDb.exec({
        sql: 'SELECT COUNT(*) as count FROM sqlite_master',
        rowMode: 'object',
        callback: (r: any) => testRows.push(r)
      });
      console.log('📥 Imported database test:', testRows[0]);
    } catch (testError) {
      console.error('📥 Imported database test failed:', testError);
    }

    return importedDb;
  } catch (error) {
    console.error('❌ Failed to load database from localStorage:', error);
    return null;
  }
}export async function getDb(): Promise<{ db: any }> {
  if (db && isInitialized) {
    return { db };
  }

  try {
    console.log('🔧 Loading and initializing SQLite3...');

    // Initialize SQLite WASM directly (no worker)
    const sqlite3 = await sqlite3InitModule({
      print: console.log,
      printErr: console.error,
    });

    console.log('✅ SQLite initialized successfully');

    // Try to load existing database from localStorage
    db = await loadDatabaseFromStorage(sqlite3);

    if (db) {
      console.log('📥 Loaded database from localStorage, checking existing tables...');
      try {
        const tables: any[] = [];
        db.exec({
          sql: "SELECT name FROM sqlite_master WHERE type='table'",
          rowMode: 'object',
          callback: (r: any) => tables.push(r)
        });
        console.log('📥 Existing tables:', tables.map(t => t.name));
      } catch (tableCheckError) {
        console.error('📥 Failed to check existing tables:', tableCheckError);
      }
    } else {
      // Create new in-memory database
      db = new sqlite3.oo1.DB(':memory:', 'c');
      console.log('🆕 Created new in-memory database');
    }

    // Test the database with a simple operation
    try {
      db.exec({
        sql: 'SELECT 1 as test',
        rowMode: 'object',
        callback: (row: any) => console.log('🧪 Database test query result:', row)
      });
      console.log('✅ Database test query successful');
    } catch (testError) {
      console.error('❌ Database test query failed:', testError);
      throw testError;
    }

    // Ensure default settings exist (run this after database is ready)
    try {
      await ensureDefaultSettings(db);
    } catch (settingsError) {
      console.error('⚠️ Failed to ensure default settings:', settingsError);
      // Don't throw - settings are not critical for basic functionality
    }

    // Configure database settings and create schema
    try {
      db.exec(`
        PRAGMA journal_mode=WAL;
        PRAGMA foreign_keys=ON;

        CREATE TABLE IF NOT EXISTS test_persistence (
          id INTEGER PRIMARY KEY,
          data TEXT
        );

        CREATE TABLE IF NOT EXISTS characters (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          avatar_path TEXT,
          bio TEXT,
          traits_json TEXT,
          tags_json TEXT,
          system_prompt TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS rooms (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          type TEXT NOT NULL DEFAULT 'general',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS room_members (
          room_id TEXT NOT NULL,
          character_id TEXT NOT NULL,
          joined_at TEXT NOT NULL,
          PRIMARY KEY (room_id, character_id),
          FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
          FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS chat_sessions (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL CHECK (type IN ('individual', 'group', 'scene')),
          title TEXT,
          room_id TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS session_participants (
          session_id TEXT NOT NULL,
          character_id TEXT NOT NULL,
          joined_at TEXT NOT NULL,
          PRIMARY KEY (session_id, character_id),
          FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
          FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          character_id TEXT,
          content TEXT NOT NULL,
          message_type TEXT NOT NULL DEFAULT 'chat',
          metadata TEXT, -- JSON data
          created_at TEXT NOT NULL,
          FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
          FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL
        );

        -- Indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
        CREATE INDEX IF NOT EXISTS idx_messages_character_id ON messages(character_id);
        CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS api_keys (
          id TEXT PRIMARY KEY,
          provider TEXT NOT NULL,
          name TEXT NOT NULL,
          key_encrypted TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS assets (
          id TEXT PRIMARY KEY,
          owner_type TEXT NOT NULL,
          owner_id TEXT NOT NULL,
          kind TEXT NOT NULL,
          path TEXT NOT NULL,
          meta_json TEXT,
          created_at TEXT NOT NULL
        );
      `);

      console.log('✅ Database schema initialized');

      // Debug: Check what tables exist after schema creation
      try {
        const tables: any[] = [];
        db.exec({
          sql: "SELECT name FROM sqlite_master WHERE type='table'",
          rowMode: 'object',
          callback: (r: any) => tables.push(r)
        });
        console.log('✅ Tables after schema creation:', tables.map(t => t.name));
      } catch (tableCheckError) {
        console.error('✅ Failed to check tables after schema:', tableCheckError);
      }
    } catch (schemaError) {
      console.error('❌ Database schema creation failed:', schemaError);
      throw schemaError;
    }
    isInitialized = true;
    return { db };
  } catch (err) {
    console.error('❌ Database initialization failed:', err);
    db = null;
    throw new Error(
      `Database initialization failed: ${err}. Make sure you're running in a secure context (HTTPS or localhost) with proper headers.`
    );
  }
}

export async function saveDatabase(): Promise<void> {
  await saveDatabaseToStorage();
}

export async function checkPersistence(): Promise<{ isPersistent: boolean; testData?: string; canWrite?: boolean }> {
  try {
    const { db } = await getDb();
    
    // Try to write test data
    try {
      db.exec({
        sql: 'INSERT OR REPLACE INTO test_persistence (id, data) VALUES (1, ?)',
        bind: [`test-${Date.now()}`]
      });
      // Save immediately
      await saveDatabaseToStorage();
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
    
    return {
      isPersistent: true,
      testData: row?.data,
      canWrite: true
    };
  } catch (error) {
    console.error('❌ Persistence check failed:', error);
    return { isPersistent: false, canWrite: false };
  }
}