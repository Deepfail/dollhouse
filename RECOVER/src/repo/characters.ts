import { getDb } from '../lib/db';
import { uuid } from '../lib/uuid';

export async function listCharacters() {
  const db = await getDb();
  const rows: any[] = [];
  db.exec({ sql: 'SELECT * FROM characters ORDER BY updated_at DESC', rowMode: 'object', callback: (r:any)=>rows.push(r) });
  return rows;
}

export async function createCharacter(input: { name: string; traits?: any; tags?: any; bio?: string; system_prompt?: string; avatar_path?: string; }) {
  const db = await getDb();
  const now = Date.now();
  const id = uuid();
  db.exec({
    sql: `INSERT INTO characters (id,name,avatar_path,bio,traits_json,tags_json,system_prompt,created_at,updated_at)
          VALUES (?,?,?,?,?,?,?, ?, ?)`,
    bind: [id, input.name, input.avatar_path ?? null, input.bio ?? '', JSON.stringify(input.traits ?? {}),
           JSON.stringify(input.tags ?? []), input.system_prompt ?? '', now, now]
  });
  return { id };
}

export async function updateCharacter(id: string, patch: Partial<{ name:string; bio:string; traits:any; tags:any; system_prompt:string; avatar_path:string; }>) {
  const db = await getDb();
  const now = Date.now();
  const row = await listCharacters().then(rs => rs.find((r:any)=>r.id===id));
  const name = patch.name ?? row?.name;
  const bio = patch.bio ?? row?.bio ?? '';
  const traits = JSON.stringify(patch.traits ?? JSON.parse(row?.traits_json ?? '{}'));
  const tags = JSON.stringify(patch.tags ?? JSON.parse(row?.tags_json ?? '[]'));
  const sys = patch.system_prompt ?? row?.system_prompt ?? '';
  const avatar = patch.avatar_path ?? row?.avatar_path ?? null;
  db.exec({ sql:
    `UPDATE characters SET name=?, avatar_path=?, bio=?, traits_json=?, tags_json=?, system_prompt=?, updated_at=? WHERE id=?`,
    bind: [name, avatar, bio, traits, tags, sys, now, id]
  });
}

export async function deleteCharacter(id: string) {
  const db = await getDb();
  db.exec({ sql: `DELETE FROM characters WHERE id=?`, bind: [id] });
}
