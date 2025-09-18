// storage/index.ts - Unified storage interface
export type UUID = string;

export interface Vector { 
  values: Float32Array | number[]; 
}

export interface MessageRow {
  id: UUID;
  chat_id: UUID;
  role: 'user' | 'assistant' | 'system';
  content: string;
  meta_json: string;
  created_at: number;
  turn_index?: number;
  token_count?: number;
}

export interface MemoryRow {
  id: UUID;
  character_id?: UUID;
  chat_id?: UUID;
  source: string;
  kind: 'fact' | 'preference' | 'goal' | 'plan' | 'trait' | 'event';
  content: string;
  importance: number;
  decay: number;
  tags: string;
  created_at: number;
  updated_at: number;
}

export interface EmbeddingRow {
  id: UUID;
  namespace: string;
  ref_id: UUID;
  model: string;
  dim: number;
  vec: ArrayBuffer;
  created_at: number;
}

export interface CharacterRow {
  id: UUID;
  name: string;
  profile_json: string;
  created_at: number;
  updated_at: number;
}

export interface ChatRow {
  id: UUID;
  character_id: UUID;
  title?: string;
  created_at: number;
  updated_at: number;
}

export interface QueryOptions {
  table: string;
  where?: Record<string, any>;
  orderBy?: [string, 'asc' | 'desc'][];
  limit?: number;
  offset?: number;
}

export interface VectorSearchOptions {
  namespace: string;
  query: Vector;
  topK: number;
  where?: Record<string, any>;
}

export interface VectorSearchResult {
  id: UUID;
  score: number;
}

export interface SnapshotOptions {
  tables?: string[];
}

export interface Storage {
  // Basic CRUD operations
  get<T>(table: string, id: UUID): Promise<T | null>;
  put<T>(table: string, row: T & { id: UUID }): Promise<void>;
  del(table: string, id: UUID): Promise<void>;
  query<T>(q: QueryOptions): Promise<T[]>;

  // Memory power-ups for LLM context
  addMessage(msg: MessageRow): Promise<void>;
  addMemory(mem: MemoryRow): Promise<void>;
  addEmbedding(e: EmbeddingRow): Promise<void>;
  vectorSearch(opts: VectorSearchOptions): Promise<VectorSearchResult[]>;

  // Transaction support (optional)
  begin?(): Promise<void>;
  commit?(): Promise<void>;
  rollback?(): Promise<void>;

  // Data management
  compact?(): Promise<void>;
  exportSnapshot?(opts?: SnapshotOptions): Promise<Blob>;
  importSnapshot?(file: File): Promise<void>;

  // Engine identification
  engine(): 'sqlite-native' | 'sqlite-wasm' | 'indexeddb';
}

// Global storage instance - will be set by initStorage()
export let storage: Storage | null = null;

// Function to set the global storage instance
export function setGlobalStorage(storageInstance: Storage): void {
  (storage as any) = storageInstance;
}

// Utility functions
export function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0, na = 0, nb = 0;
  const n = a.length;
  for (let i = 0; i < n; i++) {
    const x = a[i], y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}

export function arrayBufferToFloat32Array(buffer: ArrayBuffer): Float32Array {
  return new Float32Array(buffer);
}

export function float32ArrayToArrayBuffer(array: Float32Array): ArrayBuffer {
  return array.buffer instanceof ArrayBuffer 
    ? array.buffer.slice(array.byteOffset, array.byteOffset + array.byteLength)
    : new ArrayBuffer(0);
}

// Feature detection helpers
export function canUseSqliteWasm(): boolean {
  return typeof SharedArrayBuffer !== 'undefined' &&
         typeof Worker !== 'undefined' &&
         (self as any).crossOriginIsolated &&
         !!(navigator.storage && (navigator.storage as any).getDirectory);
}

export function isTauri(): boolean {
  return typeof window !== 'undefined' && 
         !!(window as any).__TAURI__;
}

// Timeout utility for zero-hang initialization
export function timeout<T>(ms: number): Promise<T> {
  return new Promise((_, reject) => 
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
  );
}