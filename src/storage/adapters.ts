// storage/adapters.ts - Bridge between old app interface and new storage
import { v4 as uuidv4 } from 'uuid';
import { CharacterRow, ChatRow, MessageRow, storage } from './index';
import { logger } from '@/lib/logger';

// Helper to ensure storage is initialized
function getInitializedStorage() {
  if (!storage) {
    throw new Error('Storage not initialized. Please wait for app to fully load.');
  }
  return storage;
}

// Legacy Character type (from the old app)
export interface LegacyCharacter {
  id: string;
  name: string;
  description?: string;
  personality?: string;
  appearance?: string;
  avatar?: string;
  // ... other legacy fields
  createdAt?: Date;
  updatedAt?: Date;
}

// Legacy Message type  
export interface LegacyMessage {
  id: string;
  sessionId: string;
  senderId?: string; // null for user, characterId for character
  content: string;
  createdAt: Date;
}

// Legacy Session type
export interface LegacySession {
  id: string;
  type: 'individual' | 'group' | 'scene';
  participantIds: string[];
  messages?: LegacyMessage[];
  title?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Adapter functions to bridge old and new systems
export class StorageAdapter {
  
  // Characters
  static async getCharacters(): Promise<LegacyCharacter[]> {
    const storage = getInitializedStorage();
    const characters = await storage.query<CharacterRow>({ table: 'characters' });
    
    return characters.map((char: any) => {
      const profile = JSON.parse(char.profile_json);
      return {
        id: char.id,
        name: char.name,
        description: profile.description || '',
        personality: profile.personality || '',
        appearance: profile.appearance || '',
        avatar: profile.avatar || '',
        createdAt: new Date(char.created_at),
        updatedAt: new Date(char.updated_at)
      };
    });
  }

  static async createCharacter(character: Partial<LegacyCharacter>): Promise<string> {
    const storage = getInitializedStorage();
    const id = character.id || uuidv4();
    const now = Date.now();
    
    const profile = {
      description: character.description || '',
      personality: character.personality || '',
      appearance: character.appearance || '',
      avatar: character.avatar || ''
    };
    
    const characterRow: CharacterRow = {
      id,
      name: character.name || 'Unnamed Character',
      profile_json: JSON.stringify(profile),
      created_at: now,
      updated_at: now
    };
    
    await storage.put('characters', characterRow);
    return id;
  }

  static async updateCharacter(id: string, updates: Partial<LegacyCharacter>): Promise<void> {
    const storage = getInitializedStorage();
    const existing = await storage.get<CharacterRow>('characters', id);
    
    if (!existing) {
      throw new Error(`Character ${id} not found`);
    }
    
    const profile = JSON.parse(existing.profile_json);
    
    // Update profile with new values
    if (updates.description !== undefined) profile.description = updates.description;
    if (updates.personality !== undefined) profile.personality = updates.personality;
    if (updates.appearance !== undefined) profile.appearance = updates.appearance;
    if (updates.avatar !== undefined) profile.avatar = updates.avatar;
    
    const updated: CharacterRow = {
      ...existing,
      name: updates.name || existing.name,
      profile_json: JSON.stringify(profile),
      updated_at: Date.now()
    };
    
    await storage.put('characters', updated);
  }

  static async deleteCharacter(id: string): Promise<void> {
    const storage = getInitializedStorage();
    await storage.del('characters', id);
  }

  // Chat Sessions
  static async getSessions(): Promise<LegacySession[]> {
    const storage = getInitializedStorage();
    const chats = await storage.query<ChatRow>({ table: 'chats' });
    
    const sessions: LegacySession[] = [];
    
    for (const chat of chats) {
      // Get messages for this chat
      const messages = await storage.query<MessageRow>({
        table: 'messages',
        where: { chat_id: chat.id },
        orderBy: [['created_at', 'asc']]
      });
      
      const legacyMessages: LegacyMessage[] = messages.map((msg: any) => ({
        id: msg.id,
        sessionId: msg.chat_id,
        senderId: msg.role === 'user' ? undefined : msg.role, // Simplified mapping
        content: msg.content,
        createdAt: new Date(msg.created_at)
      }));
      
      sessions.push({
        id: chat.id,
        type: 'individual', // Simplified for now
        participantIds: [chat.character_id],
        messages: legacyMessages,
        title: chat.title,
        createdAt: new Date(chat.created_at),
        updatedAt: new Date(chat.updated_at)
      });
    }
    
    return sessions;
  }

  static async createSession(type: 'individual' | 'group' | 'scene', participantIds: string[], title?: string): Promise<string> {
    const storage = getInitializedStorage();
    const id = uuidv4();
    const now = Date.now();
    
    if (type === 'individual' && participantIds.length === 1) {
      // Create a chat for individual character
      const chatRow: ChatRow = {
        id,
        character_id: participantIds[0],
        title: title,
        created_at: now,
        updated_at: now
      };
      
      await storage.put('chats', chatRow);
    } else {
      // For group/scene chats, we'll need to extend the schema
      // For now, create a chat with the first participant
      const chatRow: ChatRow = {
        id,
        character_id: participantIds[0] || 'system',
        title: title || `${type} chat`,
        created_at: now,
        updated_at: now
      };
      
      await storage.put('chats', chatRow);
    }
    
    return id;
  }

  static async addMessage(sessionId: string, content: string, senderId?: string): Promise<string> {
    const storage = getInitializedStorage();
    const messageId = uuidv4();
    const now = Date.now();
    
    // Determine role based on senderId
    const role = senderId ? 'assistant' : 'user';
    
    const message: MessageRow = {
      id: messageId,
      chat_id: sessionId,
      role,
      content,
      meta_json: JSON.stringify({}),
      created_at: now,
      turn_index: 0 // Will be updated with proper indexing later
    };
    
    await storage.addMessage(message);
    return messageId;
  }

  // Settings
  static async getSetting(key: string): Promise<any> {
    const storage = getInitializedStorage();
    const result = await storage.get('settings', key);
    return result ? JSON.parse((result as any).value) : null;
  }

  static async setSetting(key: string, value: any): Promise<void> {
    const storage = getInitializedStorage();
    await storage.put('settings', {
      id: key,
      key,
      value: JSON.stringify(value)
    });
  }

  // Character Posts for Feed
  static async getCharacterPosts(characterId: string): Promise<any[]> {
    const storage = getInitializedStorage();
    
    // For now, return some mock posts until we have the full posts table
    // Later this will query the character_posts table
    return [
      {
        id: 'post1',
        character_id: characterId,
        content: 'Just another day in the dollhouse! 💫',
        image_url: null,
        likes_count: 12,
        created_at: Date.now() - 86400000, // 1 day ago
        post_type: 'feed'
      },
      {
        id: 'post2', 
        character_id: characterId,
        content: 'Feeling creative today! 🎨',
        image_url: '/api/placeholder/300/400',
        likes_count: 8,
        created_at: Date.now() - 172800000, // 2 days ago
        post_type: 'feed'
      }
    ];
  }

  static async createCharacterPost(characterId: string, content: string, imageUrl?: string): Promise<string> {
    const storage = getInitializedStorage();
    const postId = uuidv4();
    const now = Date.now();
    
    const post = {
      id: postId,
      character_id: characterId,
      content,
      image_url: imageUrl || null,
      likes_count: 0,
      created_at: now,
      post_type: 'feed'
    };
    
    // For now, store in a mock way until we have the posts table
    // Later this will use: await storage.put('character_posts', post);
  logger.log('📝 Created character post:', post);
    
    return postId;
  }

  // Character DMs
  static async getCharacterDMs(characterId: string): Promise<any[]> {
    const storage = getInitializedStorage();
    
    // Get DM conversations for this character
    // For now, return mock data
    return [
      {
        id: 'dm1',
        character_id: characterId,
        last_message: 'Hey there! How are you doing? 😊',
        last_message_at: Date.now() - 3600000, // 1 hour ago
        unread_count: 2,
        created_at: Date.now() - 86400000
      }
    ];
  }

  // Character Stories
  static async getCharacterStories(characterId: string): Promise<any[]> {
    const storage = getInitializedStorage();
    
    // Get story content for this character
    // For now, return mock data
    return [
      {
        id: 'story1',
        character_id: characterId,
        title: 'My Journey to the Dollhouse',
        content: 'It all started when I first arrived here...',
        image_url: '/api/placeholder/300/500',
        created_at: Date.now() - 604800000, // 1 week ago
        views: 45
      },
      {
        id: 'story2',
        character_id: characterId, 
        title: 'Dreams and Aspirations',
        content: 'Sometimes I wonder what lies beyond these walls...',
        image_url: null,
        created_at: Date.now() - 1209600000, // 2 weeks ago
        views: 23
      }
    ];
  }
}

// Export adapter functions to replace old storage
export const {
  getCharacters,
  createCharacter,
  updateCharacter,
  deleteCharacter,
  getSessions,
  createSession,
  addMessage,
  getSetting,
  setSetting,
  getCharacterPosts,
  createCharacterPost,
  getCharacterDMs,
  getCharacterStories
} = StorageAdapter;