import { getDb, saveDatabase } from '../lib/db';
import { uuid } from '../lib/uuid';

export async function listMessages(chatId: string) {
  const { db } = await getDb();
  const rows: any[] = [];
  db.exec({
    sql: 'SELECT * FROM messages WHERE session_id=? ORDER BY created_at ASC',
    bind: [chatId],
    rowMode: 'object',
    callback: (r: any) => rows.push(r)
  });
  return rows;
}

export async function createMessage(input: { session_id: string; character_id?: string; content: string; message_type?: string; metadata?: string }) {
  const { db } = await getDb();
  const now = Date.now();
  const id = uuid();
  db.exec({
    sql: `INSERT INTO messages (id,session_id,character_id,content,message_type,metadata,created_at) VALUES (?,?,?,?,?,?,?)`,
    bind: [id, input.session_id, input.character_id ?? null, input.content, input.message_type ?? 'chat', input.metadata ?? null, now]
  });
  await saveDatabase();
  return { id };
}

export async function updateMessage(id: string, patch: Partial<{ content: string; metadata: string }>) {
  const { db } = await getDb();
  const current = await getMessageById(id);
  if (!current) throw new Error(`Message ${id} not found`);
  
  const content = patch.content ?? current.content;
  const metadata = patch.metadata ?? current.metadata;
  
  db.exec({
    sql: `UPDATE messages SET content=?, metadata=? WHERE id=?`,
    bind: [content, metadata, id]
  });
  await saveDatabase();
}

export async function deleteMessage(id: string) {
  const { db } = await getDb();
  db.exec({
    sql: `DELETE FROM messages WHERE id=?`,
    bind: [id]
  });
  await saveDatabase();
}

export async function getMessageById(id: string) {
  const { db } = await getDb();
  const rows: any[] = [];
  db.exec({
    sql: 'SELECT * FROM messages WHERE id=? LIMIT 1',
    bind: [id],
    rowMode: 'object',
    callback: (r: any) => rows.push(r)
  });
  return rows[0] || null;
}
