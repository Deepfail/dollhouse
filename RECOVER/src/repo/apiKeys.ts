import { getDb } from '../lib/db';
import { uuid } from '../lib/uuid';

export async function listApiKeys() {
  const db = await getDb();
  const rows: any[] = [];
  db.exec({ sql: 'SELECT id,provider,name,created_at,updated_at FROM api_keys ORDER BY updated_at DESC', rowMode: 'object', callback: (r:any)=>rows.push(r) });
  return rows;
}

export async function createApiKey(input: { provider: string; name: string; key_encrypted: string }) {
  const db = await getDb();
  const now = Date.now();
  const id = uuid();
  db.exec({
    sql: `INSERT INTO api_keys (id,provider,name,key_encrypted,created_at,updated_at) VALUES (?,?,?,?,?,?)`,
    bind: [id, input.provider, input.name, input.key_encrypted, now, now]
  });
  return { id };
}

export async function updateApiKey(id: string, patch: Partial<{ provider: string; name: string; key_encrypted: string }>) {
  const db = await getDb();
  const now = Date.now();
  const current = await getApiKeyById(id);
  if (!current) throw new Error(`API Key ${id} not found`);
  
  const provider = patch.provider ?? current.provider;
  const name = patch.name ?? current.name;
  const key_encrypted = patch.key_encrypted ?? current.key_encrypted;
  
  db.exec({ sql: `UPDATE api_keys SET provider=?, name=?, key_encrypted=?, updated_at=? WHERE id=?`, bind: [provider, name, key_encrypted, now, id] });
}

export async function deleteApiKey(id: string) {
  const db = await getDb();
  db.exec({ sql: `DELETE FROM api_keys WHERE id=?`, bind: [id] });
}

export async function getApiKeyById(id: string) {
  const db = await getDb();
  const rows: any[] = [];
  db.exec({ sql: 'SELECT * FROM api_keys WHERE id=? LIMIT 1', bind: [id], rowMode: 'object', callback: (r:any)=>rows.push(r) });
  return rows[0] || null;
}

export async function getApiKeyByProvider(provider: string) {
  const db = await getDb();
  const rows: any[] = [];
  db.exec({ sql: 'SELECT * FROM api_keys WHERE provider=? ORDER BY updated_at DESC LIMIT 1', bind: [provider], rowMode: 'object', callback: (r:any)=>rows.push(r) });
  return rows[0] || null;
}