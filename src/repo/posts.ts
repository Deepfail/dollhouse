import { logger } from '@/lib/logger';
import { getDb, saveDatabase } from '../lib/db';
import { uuid } from '../lib/uuid';

export interface CharacterPost {
  id: string;
  character_id: string;
  content: string;
  image_url?: string;
  likes_count: number;
  created_at: Date;
  post_type: 'feed' | 'story' | 'memory';
}

export async function getCharacterPosts(characterId: string): Promise<CharacterPost[]> {
  logger.log('🔍 Getting posts for character:', characterId);
  try {
    const { db } = await getDb();
    const rows: any[] = [];
    db.exec({
      sql: 'SELECT * FROM character_posts WHERE character_id = ? ORDER BY created_at DESC',
      bind: [characterId],
      rowMode: 'object',
      callback: (r: any) => rows.push(r)
    });
    
    return rows.map(row => ({
      id: row.id,
      character_id: row.character_id,
      content: row.content,
      image_url: row.image_url,
      likes_count: row.likes_count || 0,
      created_at: new Date(parseInt(row.created_at)),
      post_type: row.post_type || 'feed'
    }));
  } catch (error) {
    logger.error('❌ Failed to get character posts:', error);
    return [];
  }
}

export async function createCharacterPost(post: {
  character_id: string;
  content: string;
  image_url?: string;
  post_type?: 'feed' | 'story' | 'memory';
}): Promise<string> {
  const { db } = await getDb();
  const id = uuid();
  const now = Date.now();
  
  db.exec({
    sql: `INSERT INTO character_posts (id, character_id, content, image_url, likes_count, created_at, post_type)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    bind: [
      id,
      post.character_id,
      post.content,
      post.image_url || null,
      0,
      now,
      post.post_type || 'feed'
    ]
  });
  
  await saveDatabase();
  return id;
}

export async function likePost(postId: string): Promise<void> {
  const { db } = await getDb();
  db.exec({
    sql: 'UPDATE character_posts SET likes_count = likes_count + 1 WHERE id = ?',
    bind: [postId]
  });
  await saveDatabase();
}

export async function deletePost(postId: string): Promise<void> {
  const { db } = await getDb();
  db.exec({
    sql: 'DELETE FROM character_posts WHERE id = ?',
    bind: [postId]
  });
  await saveDatabase();
}

// Generate some sample posts for a character
export async function generateSamplePosts(characterId: string): Promise<void> {
  const samplePosts = [
    {
      content: "Just had the most amazing day! ✨ Feeling grateful for all the little moments that make life special.",
      image_url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400",
      post_type: 'feed' as const
    },
    {
      content: "Coffee thoughts: Why do the best conversations happen at 2am? 🌙☕",
      post_type: 'feed' as const
    },
    {
      content: "Trying out a new hobby today! Sometimes stepping out of your comfort zone is exactly what you need 💫",
      image_url: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400",
      post_type: 'feed' as const
    },
    {
      content: "Rainy day vibes got me thinking about cozy moments and good books 📚🌧️",
      post_type: 'feed' as const
    }
  ];

  for (const post of samplePosts) {
    await createCharacterPost({
      character_id: characterId,
      ...post
    });
  }
}