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
