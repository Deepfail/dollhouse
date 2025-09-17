import { getDb, saveDatabase } from '../lib/db';

export async function listSettings() {
  const { db } = await getDb();
  const rows: any[] = [];
  db.exec({
    sql: 'SELECT * FROM settings ORDER BY key',
    rowMode: 'object',
    callback: (r: any) => rows.push(r)
  });
  return rows;
}

export async function getSetting<T = any>(key: string): Promise<T | null> {
  console.log(`🔍 Getting setting ${key}...`);
  const { db } = await getDb();
  const rows: any[] = [];
  db.exec({
    sql: 'SELECT value FROM settings WHERE key=? LIMIT 1',
    bind: [key],
    rowMode: 'object',
    callback: (r: any) => rows.push(r)
  });
  const row = rows[0];
  if (!row) {
    console.log(`❌ Setting ${key} not found`);
    return null;
  }
  
  try {
    const parsed = JSON.parse(row.value);
    console.log(`✅ Setting ${key} loaded:`, parsed);
    return parsed;
  } catch {
    console.log(`✅ Setting ${key} loaded (string):`, row.value);
    return row.value as T;
  }
}

export async function setSetting<T = any>(key: string, value: T): Promise<void> {
  console.log(`💾 Setting ${key} to:`, value);
  const { db } = await getDb();
  const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
  
  // Use UPSERT (INSERT OR REPLACE)
  db.exec({
    sql: `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
    bind: [key, serializedValue]
  });
  
  console.log(`✅ Setting ${key} saved to database`);
  
  // Save database to localStorage
  await saveDatabase();
}

export async function deleteSetting(key: string): Promise<void> {
  const { db } = await getDb();
  db.exec({
    sql: `DELETE FROM settings WHERE key=?`,
    bind: [key]
  });
}

export async function getSettingsAsObject(): Promise<Record<string, any>> {
  const settings = await listSettings();
  const result: Record<string, any> = {};
  
  for (const setting of settings) {
    try {
      result[setting.key] = JSON.parse(setting.value);
    } catch {
      result[setting.key] = setting.value;
    }
  }
  
  return result;
}