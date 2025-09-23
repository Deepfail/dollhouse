import { logger } from '@/lib/logger';
import { getDb, saveDatabase } from '../lib/db';

export async function listSettings(): Promise<Array<Record<string, unknown>>> {
  const { db } = await getDb();
  const rows: Array<Record<string, unknown>> = [];
  db.exec({
    sql: 'SELECT * FROM settings ORDER BY key',
    rowMode: 'object',
    callback: (r: Record<string, unknown>) => rows.push(r)
  });
  return rows;
}

export async function getSetting<T = unknown>(key: string): Promise<T | null> {
  logger.log(`🔍 Getting setting ${key}...`);
  const { db } = await getDb();
  const rows: Array<Record<string, unknown>> = [];
  db.exec({
    sql: 'SELECT value FROM settings WHERE key=? LIMIT 1',
    bind: [key],
    rowMode: 'object',
    callback: (r: Record<string, unknown>) => rows.push(r)
  });
  const row = rows[0];
  if (!row) {
    logger.log(`❌ Setting ${key} not found`);
    return null;
  }
  
  try {
    const parsed = JSON.parse(String((row as Record<string, unknown>).value));
    logger.log(`✅ Setting ${key} loaded:`, parsed);
    return parsed as T;
  } catch {
    logger.log(`✅ Setting ${key} loaded (string):`, (row as Record<string, unknown>).value);
    return ((row as Record<string, unknown>).value as unknown) as T;
  }
}

export async function setSetting<T = unknown>(key: string, value: T): Promise<void> {
  logger.log(`💾 Setting ${key} to:`, value);
  const { db } = await getDb();
  const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
  
  // Use UPSERT (INSERT OR REPLACE)
  db.exec({
    sql: `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
    bind: [key, serializedValue]
  });
  
  logger.log(`✅ Setting ${key} saved to database`);
  
  // Database auto-saves with OPFS
  await saveDatabase();
}

export async function deleteSetting(key: string): Promise<void> {
  const { db } = await getDb();
  db.exec({
    sql: `DELETE FROM settings WHERE key=?`,
    bind: [key]
  });
}

export async function getSettingsAsObject(): Promise<Record<string, unknown>> {
  const settings = await listSettings();
  const result: Record<string, unknown> = {};
  
  for (const setting of settings) {
    try {
      const k = String((setting as Record<string, unknown>).key);
      result[k] = JSON.parse(String((setting as Record<string, unknown>).value));
    } catch {
      const k = String((setting as Record<string, unknown>).key);
      result[k] = (setting as Record<string, unknown>).value;
    }
  }
  
  return result;
}