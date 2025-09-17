import { getDb, saveDatabase } from '../lib/db';
import { uuid } from '../lib/uuid';

export async function listAssets() {
  const { db } = await getDb();
  const rows: any[] = [];
  db.exec({
    sql: 'SELECT * FROM assets ORDER BY created_at DESC',
    rowMode: 'object',
    callback: (r: any) => rows.push(r)
  });
  return rows;
}

export async function listAssetsByOwner(ownerType: string, ownerId: string) {
  const { db } = await getDb();
  const rows: any[] = [];
  db.exec({
    sql: 'SELECT * FROM assets WHERE owner_type=? AND owner_id=? ORDER BY created_at DESC',
    bind: [ownerType, ownerId],
    rowMode: 'object',
    callback: (r: any) => rows.push(r)
  });
  return rows;
}

export async function createAsset(input: { owner_type: string; owner_id: string; kind: string; path: string; meta_json?: string }) {
  const { db } = await getDb();
  const now = Date.now();
  const id = uuid();
  db.exec({
    sql: `INSERT INTO assets (id,owner_type,owner_id,kind,path,meta_json,created_at) VALUES (?,?,?,?,?,?,?)`,
    bind: [id, input.owner_type, input.owner_id, input.kind, input.path, input.meta_json ?? '{}', now]
  });
  await saveDatabase();
  return { id };
}

export async function updateAsset(id: string, patch: Partial<{ kind: string; path: string; meta_json: string }>) {
  const { db } = await getDb();
  const current = await getAssetById(id);
  if (!current) throw new Error(`Asset ${id} not found`);
  
  const kind = patch.kind ?? current.kind;
  const path = patch.path ?? current.path;
  const meta_json = patch.meta_json ?? current.meta_json;
  
  db.exec({
    sql: `UPDATE assets SET kind=?, path=?, meta_json=? WHERE id=?`,
    bind: [kind, path, meta_json, id]
  });
  await saveDatabase();
}

export async function deleteAsset(id: string) {
  const { db } = await getDb();
  db.exec({
    sql: `DELETE FROM assets WHERE id=?`,
    bind: [id]
  });
  await saveDatabase();
}

export async function getAssetById(id: string) {
  const { db } = await getDb();
  const rows: any[] = [];
  db.exec({
    sql: 'SELECT * FROM assets WHERE id=? LIMIT 1',
    bind: [id],
    rowMode: 'object',
    callback: (r: any) => rows.push(r)
  });
  return rows[0] || null;
}