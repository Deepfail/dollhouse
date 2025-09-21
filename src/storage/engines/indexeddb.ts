// storage/engines/indexeddb.ts - IndexedDB storage engine using Dexie
import Dexie, { Table } from 'dexie';
import {
    CharacterRow,
    ChatRow,
    EmbeddingRow,
    MemoryRow,
    MessageRow,
    QueryOptions,
    SnapshotOptions,
    Storage,
    UUID,
    VectorSearchOptions,
    VectorSearchResult,
    arrayBufferToFloat32Array,
    cosine
} from '../index';
import { logger } from '@/lib/logger';

interface SettingRow {
  id: string;
  key: string;
  value: string;
}

interface DexieSchema {
  characters: CharacterRow;
  chats: ChatRow;
  messages: MessageRow;
  memories: MemoryRow;
  embeddings: EmbeddingRow;
  settings: SettingRow;
}

class DollhouseDB extends Dexie {
  characters!: Table<CharacterRow>;
  chats!: Table<ChatRow>;
  messages!: Table<MessageRow>;
  memories!: Table<MemoryRow>;
  embeddings!: Table<EmbeddingRow>;
  settings!: Table<SettingRow>;

  constructor() {
    super('DollhouseDB');
    
    this.version(1).stores({
      characters: 'id, name, created_at, updated_at',
      chats: 'id, character_id, created_at, updated_at',
      messages: 'id, chat_id, role, created_at, turn_index',
      memories: 'id, character_id, chat_id, kind, importance, decay, created_at, updated_at',
      embeddings: 'id, namespace, ref_id, model, created_at',
      settings: 'id, key'
    });
  }
}

export class IndexedDBStorage implements Storage {
  private db: DollhouseDB;

  constructor() {
    this.db = new DollhouseDB();
  }

  async init(): Promise<void> {
    await this.db.open();
    logger.log('✅ IndexedDB storage initialized');
  }

  engine(): 'indexeddb' {
    return 'indexeddb';
  }

  async get<T>(table: string, id: UUID): Promise<T | null> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized. Call init() first.');
    }
    
    const dbTable = (this.db as any)[table];
    if (!dbTable) {
      throw new Error(`Table '${table}' does not exist in IndexedDB schema`);
    }
    
    const result = await dbTable.get(id);
    return result || null;
  }

  async put<T>(table: string, row: T & { id: UUID }): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized. Call init() first.');
    }
    
    const dbTable = (this.db as any)[table];
    if (!dbTable) {
      throw new Error(`Table '${table}' does not exist in IndexedDB schema`);
    }
    
    await dbTable.put(row);
  }

  async del(table: string, id: UUID): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized. Call init() first.');
    }
    
    const dbTable = (this.db as any)[table];
    if (!dbTable) {
      throw new Error(`Table '${table}' does not exist in IndexedDB schema`);
    }
    
    await dbTable.delete(id);
  }

  async query<T>(q: QueryOptions): Promise<T[]> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized. Call init() first.');
    }
    
    const dbTable = (this.db as any)[q.table];
    if (!dbTable) {
      throw new Error(`Table '${q.table}' does not exist in IndexedDB schema`);
    }
    
    let collection = dbTable;

    // Apply where conditions
    if (q.where) {
      for (const [key, value] of Object.entries(q.where)) {
        collection = collection.where(key).equals(value);
      }
    }

    // Apply ordering
    if (q.orderBy) {
      for (const [field, direction] of q.orderBy) {
        if (direction === 'desc') {
          collection = collection.reverse();
        }
        // Note: Dexie ordering is limited compared to SQL
        // For complex ordering, we'll sort in memory
      }
    }

    // Apply pagination
    if (q.offset) {
      collection = collection.offset(q.offset);
    }
    if (q.limit) {
      collection = collection.limit(q.limit);
    }

    return await collection.toArray();
  }

  async addMessage(msg: MessageRow): Promise<void> {
    await this.db.messages.put(msg);
  }

  async addMemory(mem: MemoryRow): Promise<void> {
    await this.db.memories.put(mem);
  }

  async addEmbedding(e: EmbeddingRow): Promise<void> {
    await this.db.embeddings.put(e);
  }

  async vectorSearch(opts: VectorSearchOptions): Promise<VectorSearchResult[]> {
    // Get query vector
    const queryVec = opts.query.values instanceof Float32Array 
      ? opts.query.values 
      : new Float32Array(opts.query.values);

    // Get candidate embeddings from namespace
    let candidates = this.db.embeddings.where('namespace').equals(opts.namespace);

    // Apply additional filters if specified
    if (opts.where) {
      // Note: For more complex where clauses, we'd need to filter after retrieval
      // This is a simplified implementation
    }

    const embeddings = await candidates.toArray();

    // Compute cosine similarity for each embedding
    const results: VectorSearchResult[] = [];
    
    for (const embedding of embeddings) {
      const embeddingVec = arrayBufferToFloat32Array(embedding.vec);
      const score = cosine(queryVec, embeddingVec);
      
      results.push({
        id: embedding.ref_id,
        score
      });
    }

    // Sort by score (descending) and take top K
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, opts.topK);
  }

  async begin(): Promise<void> {
    // Dexie transactions are automatic, but we can implement explicit ones if needed
    // For now, this is a no-op
  }

  async commit(): Promise<void> {
    // No-op for Dexie auto-commit
  }

  async rollback(): Promise<void> {
    // No-op for Dexie auto-commit
  }

  async compact(): Promise<void> {
  logger.log('🧹 Starting IndexedDB compaction...');
    
    // Implement retention policy
    const now = Date.now();
    const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
    
    // Archive old messages (keep last 1000 per chat)
    const chats = await this.db.chats.toArray();
    for (const chat of chats) {
      const messages = await this.db.messages
        .where('chat_id')
        .equals(chat.id)
        .sortBy('created_at');
      
      if (messages.length > 1000) {
        // Keep most recent 1000, archive the rest
        const toArchive = messages.slice(0, messages.length - 1000);
        
        // Create summary memory from archived messages
        const summary = {
          id: `summary-${chat.id}-${now}`,
          character_id: chat.character_id,
          chat_id: chat.id,
          source: 'compaction',
          kind: 'event' as const,
          content: `Archived ${toArchive.length} older messages from this conversation`,
          importance: 0.3,
          decay: 0.0,
          tags: JSON.stringify(['archive', 'summary']),
          created_at: now,
          updated_at: now
        };
        
        await this.addMemory(summary);
        
        // Delete old messages
        await this.db.messages.bulkDelete(toArchive.map((m: MessageRow) => m.id));
      }
    }
    
    // Clean up low-importance memories
    await this.db.memories
      .where('importance')
      .below(0.2)
      .and(m => m.decay > 0.8)
      .delete();
    
  logger.log('✅ IndexedDB compaction completed');
  }

  async exportSnapshot(opts?: SnapshotOptions): Promise<Blob> {
    const tables = opts?.tables || ['characters', 'chats', 'messages', 'memories', 'embeddings'];
    const jsonlLines: string[] = [];
    
    for (const table of tables) {
      const rows = await (this.db as any)[table].toArray();
      for (const row of rows) {
        // Convert ArrayBuffer to base64 for embeddings
        if (table === 'embeddings' && row.vec) {
          row.vec = btoa(String.fromCharCode(...new Uint8Array(row.vec)));
        }
        jsonlLines.push(JSON.stringify({ table, row }));
      }
    }
    
    const jsonlContent = jsonlLines.join('\n');
    return new Blob([jsonlContent], { type: 'application/jsonl' });
  }

  async importSnapshot(file: File): Promise<void> {
    const content = await file.text();
    const lines = content.split('\n').filter(line => line.trim());
    
    await this.db.transaction('rw', this.db.tables, async () => {
    for (const line of lines) {
        try {
          const { table, row } = JSON.parse(line);
          
          // Convert base64 back to ArrayBuffer for embeddings
          if (table === 'embeddings' && typeof row.vec === 'string') {
            const binaryString = atob(row.vec);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            row.vec = bytes.buffer;
          }
          
          await (this.db as any)[table].put(row);
        } catch (error) {
          logger.warn('Failed to import line:', line, error);
        }
      }
    });
    
    logger.log('✅ Snapshot imported successfully');
  }
}

export async function initIndexedDB(): Promise<IndexedDBStorage> {
  const storage = new IndexedDBStorage();
  await storage.init();
  return storage;
}