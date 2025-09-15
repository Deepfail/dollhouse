let sqlite: any;
let db: any;

export async function getDb() {
  if (db) return db;
  // sqlite-wasm is an optional runtime dependency; keep this file as a minimal stub.
  try {
    // @ts-ignore - optional dependency
    const mod = await import('@sqlite.org/sqlite-wasm');
    sqlite = await mod.default();
    // open_vfs is a placeholder API — adjust to the actual sqlite-wasm API if different
    db = await sqlite.open_vfs('opfs:/dollhouse/data.db', 'c');
  } catch (err) {
    throw new Error('sqlite-wasm is not installed. Install @sqlite.org/sqlite-wasm or adapt src/lib/db.ts to your runtime.');
  }
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;`);
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY, provider TEXT NOT NULL, key_value TEXT NOT NULL,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, avatar_path TEXT, bio TEXT DEFAULT '',
      traits_json TEXT NOT NULL, tags_json TEXT NOT NULL, system_prompt TEXT DEFAULT '',
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY, character_id TEXT NOT NULL, title TEXT NOT NULL,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY, chat_id TEXT NOT NULL, role TEXT NOT NULL,
      content TEXT NOT NULL, meta_json TEXT NOT NULL, created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS convo_summaries (chat_id TEXT PRIMARY KEY, summary TEXT NOT NULL, updated_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY, owner_type TEXT NOT NULL, owner_id TEXT NOT NULL,
      kind TEXT NOT NULL, path TEXT NOT NULL, meta_json TEXT NOT NULL, created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id, created_at);
  `);
  return db;
}
