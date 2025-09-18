// src/lib/db.ts
let sqlite3: any;
let db: any;

export async function getDb() {
  if (db) return db;

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

  // OPFS is optional (non-secure contexts); init if available
  if (sqlite3?.opfs?.init) {
    await sqlite3.opfs.init();
  }

  // Persistent DB file in OPFS
  db = new sqlite3.oo1.OpfsDb('dollhouse/data.db'); // path is virtual inside OPFS

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

    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
      role TEXT NOT NULL,              -- 'user' | 'assistant' | 'system' | 'narrator'
      content TEXT NOT NULL,
      meta_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS convo_summaries (
      chat_id TEXT PRIMARY KEY REFERENCES chats(id) ON DELETE CASCADE,
      summary TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      owner_type TEXT NOT NULL,        -- 'character' | 'message' | 'system'
      owner_id TEXT NOT NULL,
      kind TEXT NOT NULL,              -- 'image' | 'thumb' | 'voice' | 'other'
      path TEXT NOT NULL,
      meta_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_messages_chat
      ON messages(chat_id, created_at);

    CREATE INDEX IF NOT EXISTS idx_chats_character
      ON chats(character_id, created_at);

    CREATE INDEX IF NOT EXISTS idx_assets_owner
      ON assets(owner_type, owner_id);
  `);

  return db;
}
