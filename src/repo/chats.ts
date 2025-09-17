import { getDb, saveDatabase } from '../lib/db';
import { uuid } from '../lib/uuid';

export async function listChats() {
  const { db } = await getDb();
  const rows: any[] = [];
  db.exec({
    sql: 'SELECT * FROM chat_sessions ORDER BY updated_at DESC',
    rowMode: 'object',
    callback: (r: any) => rows.push(r)
  });
  return rows;
}

export async function listChatsByCharacter(characterId: string) {
  const { db } = await getDb();
  const rows: any[] = [];
  db.exec({
    sql: 'SELECT cs.* FROM chat_sessions cs JOIN session_participants sp ON cs.id = sp.session_id WHERE sp.character_id=? ORDER BY cs.updated_at DESC',
    bind: [characterId],
    rowMode: 'object',
    callback: (r: any) => rows.push(r)
  });
  return rows;
}

export async function createChat(input: { type: string; title?: string; room_id?: string; participantIds: string[] }) {
  const { db } = await getDb();
  const now = Date.now();
  const id = uuid();
  db.exec({
    sql: `INSERT INTO chat_sessions (id,type,title,room_id,created_at,updated_at) VALUES (?,?,?,?,?,?)`,
    bind: [id, input.type, input.title ?? null, input.room_id ?? null, now, now]
  });
  
  // Add participants
  for (const participantId of input.participantIds) {
    db.exec({
      sql: `INSERT INTO session_participants (session_id,character_id,joined_at) VALUES (?,?,?)`,
      bind: [id, participantId, now]
    });
  }
  
  await saveDatabase();
  return { id };
}

export async function updateChat(id: string, patch: Partial<{ title: string }>) {
  const { db } = await getDb();
  const now = Date.now();
  const current = await getChatById(id);
  if (!current) throw new Error(`Chat ${id} not found`);
  
  const title = patch.title ?? current.title;
  
  db.exec({
    sql: `UPDATE chat_sessions SET title=?, updated_at=? WHERE id=?`,
    bind: [title, now, id]
  });
  await saveDatabase();
}

export async function deleteChat(id: string) {
  const { db } = await getDb();
  // Also delete related messages and participants
  db.exec({
    sql: `DELETE FROM messages WHERE session_id=?`,
    bind: [id]
  });
  db.exec({
    sql: `DELETE FROM session_participants WHERE session_id=?`,
    bind: [id]
  });
  db.exec({
    sql: `DELETE FROM chat_sessions WHERE id=?`,
    bind: [id]
  });
  await saveDatabase();
}

export async function getChatById(id: string) {
  const { db } = await getDb();
  const rows: any[] = [];
  db.exec({
    sql: 'SELECT * FROM chat_sessions WHERE id=? LIMIT 1',
    bind: [id],
    rowMode: 'object',
    callback: (r: any) => rows.push(r)
  });
  return rows[0] || null;
}

export async function touchChatUpdatedAt(id: string) {
  const { db } = await getDb();
  const now = Date.now();
  db.exec({
    sql: `UPDATE chat_sessions SET updated_at=? WHERE id=?`,
    bind: [now, id]
  });
  await saveDatabase();
}