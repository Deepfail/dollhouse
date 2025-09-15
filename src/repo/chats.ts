import { getDb } from '../lib/db';
import { uuid } from '../lib/uuid';

export async function listChats() {
  const db = await getDb();
  const rows: any[] = [];
  db.exec({ sql: 'SELECT * FROM chats ORDER BY updated_at DESC', rowMode: 'object', callback: (r:any)=>rows.push(r) });
  return rows;
}

export async function listChatsByCharacter(characterId: string) {
  const db = await getDb();
  const rows: any[] = [];
  db.exec({ sql: 'SELECT * FROM chats WHERE character_id=? ORDER BY updated_at DESC', bind: [characterId], rowMode: 'object', callback: (r:any)=>rows.push(r) });
  return rows;
}

export async function createChat(input: { character_id: string; title: string }) {
  const db = await getDb();
  const now = Date.now();
  const id = uuid();
  db.exec({
    sql: `INSERT INTO chats (id,character_id,title,created_at,updated_at) VALUES (?,?,?,?,?)`,
    bind: [id, input.character_id, input.title, now, now]
  });
  return { id };
}

export async function updateChat(id: string, patch: Partial<{ title: string }>) {
  const db = await getDb();
  const now = Date.now();
  const current = await getChatById(id);
  if (!current) throw new Error(`Chat ${id} not found`);
  
  const title = patch.title ?? current.title;
  
  db.exec({ sql: `UPDATE chats SET title=?, updated_at=? WHERE id=?`, bind: [title, now, id] });
}

export async function deleteChat(id: string) {
  const db = await getDb();
  // Also delete related messages and convo_summaries
  db.exec({ sql: `DELETE FROM messages WHERE chat_id=?`, bind: [id] });
  db.exec({ sql: `DELETE FROM convo_summaries WHERE chat_id=?`, bind: [id] });
  db.exec({ sql: `DELETE FROM chats WHERE id=?`, bind: [id] });
}

export async function getChatById(id: string) {
  const db = await getDb();
  const rows: any[] = [];
  db.exec({ sql: 'SELECT * FROM chats WHERE id=? LIMIT 1', bind: [id], rowMode: 'object', callback: (r:any)=>rows.push(r) });
  return rows[0] || null;
}

export async function touchChatUpdatedAt(id: string) {
  const db = await getDb();
  const now = Date.now();
  db.exec({ sql: `UPDATE chats SET updated_at=? WHERE id=?`, bind: [now, id] });
}