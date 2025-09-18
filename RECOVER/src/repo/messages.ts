import { getDb } from '../lib/db';
import { uuid } from '../lib/uuid';

export async function listMessages(chatId: string) {
  const db = await getDb();
  const rows: any[] = [];
  db.exec({ sql: 'SELECT * FROM messages WHERE chat_id=? ORDER BY created_at ASC', bind: [chatId], rowMode: 'object', callback: (r:any)=>rows.push(r) });
  return rows;
}

export async function createMessage(input: { chat_id: string; role: string; content: string; meta_json?: string }) {
  const db = await getDb();
  const now = Date.now();
  const id = uuid();
  db.exec({ sql: `INSERT INTO messages (id,chat_id,role,content,meta_json,created_at) VALUES (?,?,?,?,?,?)`, bind: [id, input.chat_id, input.role, input.content, input.meta_json ?? '{}', now] });
  return { id };
}

export async function updateMessage(id: string, patch: Partial<{ content: string; meta_json: string }>) {
  const db = await getDb();
  const current = await getMessageById(id);
  if (!current) throw new Error(`Message ${id} not found`);
  
  const content = patch.content ?? current.content;
  const meta_json = patch.meta_json ?? current.meta_json;
  
  db.exec({ sql: `UPDATE messages SET content=?, meta_json=? WHERE id=?`, bind: [content, meta_json, id] });
}

export async function deleteMessage(id: string) {
  const db = await getDb();
  db.exec({ sql: `DELETE FROM messages WHERE id=?`, bind: [id] });
}

export async function getMessageById(id: string) {
  const db = await getDb();
  const rows: any[] = [];
  db.exec({ sql: 'SELECT * FROM messages WHERE id=? LIMIT 1', bind: [id], rowMode: 'object', callback: (r:any)=>rows.push(r) });
  return rows[0] || null;
}
