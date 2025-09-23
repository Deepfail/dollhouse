import { logger } from '@/lib/logger';
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
  logger.log('🔍 Getting DM conversation for character:', characterId);
  try {
    const { db } = await getDb();
    
    // Check if conversation exists
    const rows: Record<string, unknown>[] = [];
    db.exec({
      sql: 'SELECT id FROM character_dm_conversations WHERE character_id = ?',
      bind: [characterId],
      rowMode: 'object',
      callback: (r: Record<string, unknown>) => rows.push(r)
    });
    
    if (rows.length > 0) {
      return String((rows[0] as Record<string, unknown>).id);
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
    logger.error('❌ Failed to get/create DM conversation:', error);
    throw error;
  }
}

export async function getDMMessages(conversationId: string): Promise<DMMessage[]> {
  logger.log('📨 Getting DM messages for conversation:', conversationId);
  try {
    const { db } = await getDb();
    const rows: Record<string, unknown>[] = [];
    db.exec({
      sql: 'SELECT * FROM character_dm_messages WHERE conversation_id = ? ORDER BY created_at ASC',
      bind: [conversationId],
      rowMode: 'object',
      callback: (r: Record<string, unknown>) => rows.push(r)
    });
    
    return rows.map(row => ({
      id: String((row as Record<string, unknown>).id),
      conversation_id: String((row as Record<string, unknown>).conversation_id),
      sender_type: String((row as Record<string, unknown>).sender_type) as 'user' | 'character',
      content: String((row as Record<string, unknown>).content),
      created_at: new Date(Number((row as Record<string, unknown>).created_at)),
      read_at: (row as Record<string, unknown>).read_at ? new Date(Number((row as Record<string, unknown>).read_at)) : undefined
    } as DMMessage));
  } catch (error) {
    logger.error('❌ Failed to get DM messages:', error);
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
    const rows: Record<string, unknown>[] = [];
    db.exec({
      sql: 'SELECT * FROM character_dm_conversations ORDER BY last_message_at DESC',
      rowMode: 'object',
      callback: (r: Record<string, unknown>) => rows.push(r)
    });
    
    return rows.map(row => ({
      id: String((row as Record<string, unknown>).id),
      character_id: String((row as Record<string, unknown>).character_id),
      last_message_at: new Date(Number((row as Record<string, unknown>).last_message_at)),
      unread_count: Number((row as Record<string, unknown>).unread_count) || 0,
      created_at: new Date(Number((row as Record<string, unknown>).created_at))
    } as DMConversation));
  } catch (error) {
    logger.error('❌ Failed to get DM conversations:', error);
    return [];
  }
}