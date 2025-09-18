import { getDb, saveDatabase } from '../lib/db';
import { uuid } from '../lib/uuid';

export interface DMConversation {
  id: string;
  character_id: string;
  last_message_at: Date;
  unread_count: number;
  created_at: Date;
}

export interface DMMessage {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'character';
  content: string;
  created_at: Date;
  read_at?: Date;
}

export async function getOrCreateDMConversation(characterId: string): Promise<string> {
  console.log('🔍 Getting DM conversation for character:', characterId);
  try {
    const { db } = await getDb();
    
    // Check if conversation exists
    const rows: any[] = [];
    db.exec({
      sql: 'SELECT id FROM character_dm_conversations WHERE character_id = ?',
      bind: [characterId],
      rowMode: 'object',
      callback: (r: any) => rows.push(r)
    });
    
    if (rows.length > 0) {
      return rows[0].id;
    }
    
    // Create new conversation
    const conversationId = uuid();
    const now = Date.now();
    
    db.exec({
      sql: `INSERT INTO character_dm_conversations (id, character_id, last_message_at, unread_count, created_at)
            VALUES (?, ?, ?, ?, ?)`,
      bind: [conversationId, characterId, now, 0, now]
    });
    
    await saveDatabase();
    return conversationId;
  } catch (error) {
    console.error('❌ Failed to get/create DM conversation:', error);
    throw error;
  }
}

export async function getDMMessages(conversationId: string): Promise<DMMessage[]> {
  console.log('📨 Getting DM messages for conversation:', conversationId);
  try {
    const { db } = await getDb();
    const rows: any[] = [];
    db.exec({
      sql: 'SELECT * FROM character_dm_messages WHERE conversation_id = ? ORDER BY created_at ASC',
      bind: [conversationId],
      rowMode: 'object',
      callback: (r: any) => rows.push(r)
    });
    
    return rows.map(row => ({
      id: row.id,
      conversation_id: row.conversation_id,
      sender_type: row.sender_type,
      content: row.content,
      created_at: new Date(parseInt(row.created_at)),
      read_at: row.read_at ? new Date(parseInt(row.read_at)) : undefined
    }));
  } catch (error) {
    console.error('❌ Failed to get DM messages:', error);
    return [];
  }
}

export async function sendDMMessage(
  conversationId: string,
  senderType: 'user' | 'character',
  content: string
): Promise<string> {
  const { db } = await getDb();
  const messageId = uuid();
  const now = Date.now();
  
  // Insert message
  db.exec({
    sql: `INSERT INTO character_dm_messages (id, conversation_id, sender_type, content, created_at, read_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    bind: [messageId, conversationId, senderType, content, now, senderType === 'user' ? now : null]
  });
  
  // Update conversation last_message_at and unread count
  if (senderType === 'character') {
    db.exec({
      sql: 'UPDATE character_dm_conversations SET last_message_at = ?, unread_count = unread_count + 1 WHERE id = ?',
      bind: [now, conversationId]
    });
  } else {
    db.exec({
      sql: 'UPDATE character_dm_conversations SET last_message_at = ? WHERE id = ?',
      bind: [now, conversationId]
    });
  }
  
  await saveDatabase();
  return messageId;
}

export async function markDMMessagesAsRead(conversationId: string): Promise<void> {
  const { db } = await getDb();
  const now = Date.now();
  
  db.exec({
    sql: 'UPDATE character_dm_messages SET read_at = ? WHERE conversation_id = ? AND sender_type = "character" AND read_at IS NULL',
    bind: [now, conversationId]
  });
  
  db.exec({
    sql: 'UPDATE character_dm_conversations SET unread_count = 0 WHERE id = ?',
    bind: [conversationId]
  });
  
  await saveDatabase();
}

export async function getDMConversations(): Promise<DMConversation[]> {
  try {
    const { db } = await getDb();
    const rows: any[] = [];
    db.exec({
      sql: 'SELECT * FROM character_dm_conversations ORDER BY last_message_at DESC',
      rowMode: 'object',
      callback: (r: any) => rows.push(r)
    });
    
    return rows.map(row => ({
      id: row.id,
      character_id: row.character_id,
      last_message_at: new Date(parseInt(row.last_message_at)),
      unread_count: row.unread_count || 0,
      created_at: new Date(parseInt(row.created_at))
    }));
  } catch (error) {
    console.error('❌ Failed to get DM conversations:', error);
    return [];
  }
}