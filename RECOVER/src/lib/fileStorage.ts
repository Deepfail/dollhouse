/**
 * Traditional File-Based Storage System
 * 
 * This replaces the confusing webStorage system with proper file storage
 * that users can easily find, backup, and manage.
 */

import { House, Character } from '@/types';
import { toast } from 'sonner';

export interface FileStorageConfig {
  userDataPath: string;
  autoBackup: boolean;
  backupCount: number;
}

export interface StorageFiles {
  house: string;
  characters: string;
  settings: string;
  chats: string;
  memories: string;
  backups: string;
}

export class FileStorageSystem {
  private config: FileStorageConfig;
  private files: StorageFiles = {
    house: 'house.json',
    characters: 'characters.json', 
    settings: 'settings.json',
    chats: 'chats.json',
    memories: 'memories.json',
    backups: 'backups/'
  };

  constructor(config?: Partial<FileStorageConfig>) {
    this.config = {
      userDataPath: this.getDefaultUserDataPath(),
      autoBackup: true,
      backupCount: 5,
      ...config
    };
    
    this.initializeStorage();
  }

  private getDefaultUserDataPath(): string {
    // For web apps, we'll use IndexedDB with a file-like interface
    // For Electron apps, this would be app.getPath('userData')
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      // Electron environment
      return (window as any).electronAPI.getUserDataPath();
    }
    
    // Web environment - use a standardized path structure in IndexedDB
    return '/dollhouse-data';
  }

  private async initializeStorage(): Promise<void> {
    try {
      // Create directory structure
      await this.ensureDirectoryExists(this.config.userDataPath);
      await this.ensureDirectoryExists(`${this.config.userDataPath}/${this.files.backups}`);
      
      // Create default files if they don't exist
      await this.createDefaultFiles();
      
      console.log('File storage system initialized:', this.config.userDataPath);
    } catch (error) {
      console.error('Failed to initialize file storage:', error);
      toast.error('Failed to initialize file storage system');
    }
  }

  private async ensureDirectoryExists(path: string): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      return (window as any).electronAPI.ensureDirectory(path);
    }
    
    // Web environment - IndexedDB doesn't need directory creation
    return Promise.resolve();
  }

  private async createDefaultFiles(): Promise<void> {
    // Create default house.json if it doesn't exist
    const houseExists = await this.fileExists(this.files.house);
    if (!houseExists) {
      const defaultHouse: Partial<House> = {
        id: 'main-house',
        name: 'My Character House',
        description: 'A cozy place for your AI companions',
        rooms: [
          {
            id: 'common-room',
            name: 'Common Room',
            description: 'A shared space for everyone to gather',
            type: 'shared',
            capacity: 10,
            residents: [],
            facilities: ['chat', 'games'],
            unlocked: true,
            decorations: [],
            createdAt: new Date()
          }
        ],
        currency: 1000,
        worldPrompt: 'Welcome to your Character Creator House!',
        copilotPrompt: 'You are a helpful House Manager AI.',
        copilotMaxTokens: 75,
        autoCreator: {
          enabled: false,
          interval: 30,
          maxCharacters: 20,
          themes: ['college', 'prime', 'fresh']
        },
        aiSettings: {
          textProvider: 'openrouter',
          textModel: 'deepseek/deepseek-chat-v3.1',
          textApiKey: '',
          textApiUrl: '',
          imageProvider: 'venice',
          imageModel: 'lustify-sdxl',
          imageApiKey: '',
          imageApiUrl: ''
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await this.writeFile(this.files.house, defaultHouse);
    }

    // Create default characters.json if it doesn't exist
    const charactersExists = await this.fileExists(this.files.characters);
    if (!charactersExists) {
      await this.writeFile(this.files.characters, []);
    }

    // Create other default files
    const settingsExists = await this.fileExists(this.files.settings);
    if (!settingsExists) {
      await this.writeFile(this.files.settings, {
        theme: 'system',
        language: 'en',
        autoSave: true,
        backupFrequency: 'daily'
      });
    }
  }

  // Core file operations
  async readFile<T>(filename: keyof StorageFiles | string): Promise<T | null> {
    try {
      const actualFilename = typeof filename === 'string' ? filename : this.files[filename];
      const filePath = `${this.config.userDataPath}/${actualFilename}`;
      
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        // Electron environment
        const content = await (window as any).electronAPI.readFile(filePath);
        return content ? JSON.parse(content) : null;
      }
      
      // Web environment - use IndexedDB
      return await this.readFromIndexedDB(actualFilename);
    } catch (error) {
      console.error(`Failed to read ${filename}:`, error);
      return null;
    }
  }

  async writeFile<T>(filename: keyof StorageFiles | string, data: T): Promise<void> {
    try {
      const actualFilename = typeof filename === 'string' ? filename : this.files[filename];
      const filePath = `${this.config.userDataPath}/${actualFilename}`;
      const content = JSON.stringify(data, null, 2);
      
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        // Electron environment
        await (window as any).electronAPI.writeFile(filePath, content);
      } else {
        // Web environment - use IndexedDB
        await this.writeToIndexedDB(actualFilename, data);
      }
      
      // Auto-backup if enabled
      if (this.config.autoBackup && filename !== 'backups') {
        await this.createBackup(filename);
      }
      
      console.log(`Successfully saved ${filename}`);
    } catch (error) {
      console.error(`Failed to write ${filename}:`, error);
      toast.error(`Failed to save ${filename}`);
      throw error;
    }
  }

  async fileExists(filename: keyof StorageFiles | string): Promise<boolean> {
    try {
      const actualFilename = typeof filename === 'string' ? filename : this.files[filename];
      const filePath = `${this.config.userDataPath}/${actualFilename}`;
      
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        return await (window as any).electronAPI.fileExists(filePath);
      }
      
      // Web environment - check IndexedDB
      const data = await this.readFromIndexedDB(actualFilename);
      return data !== null;
    } catch (error) {
      return false;
    }
  }

  // IndexedDB operations for web environment
  private async readFromIndexedDB<T>(filename: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('DollhouseStorage', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'filename' });
        }
      };
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['files'], 'readonly');
        const store = transaction.objectStore('files');
        const getRequest = store.get(filename);
        
        getRequest.onsuccess = () => {
          const result = getRequest.result;
          resolve(result ? result.data : null);
        };
        
        getRequest.onerror = () => reject(getRequest.error);
      };
    });
  }

  private async writeToIndexedDB<T>(filename: string, data: T): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('DollhouseStorage', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'filename' });
        }
      };
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['files'], 'readwrite');
        const store = transaction.objectStore('files');
        
        const putRequest = store.put({
          filename,
          data,
          lastModified: new Date(),
          size: JSON.stringify(data).length
        });
        
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
    });
  }

  // Backup operations
  async createBackup(filename: keyof StorageFiles | string): Promise<void> {
    try {
      const data = await this.readFile(filename);
      if (!data) return;
      
      const actualFilename = typeof filename === 'string' ? filename : this.files[filename];
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = `${actualFilename}-${timestamp}.json`;
      const backupPath = `${this.config.userDataPath}/${this.files.backups}${backupFilename}`;
      
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        await (window as any).electronAPI.writeFile(backupPath, JSON.stringify(data, null, 2));
      } else {
        // For web, store backups in a separate IndexedDB store
        await this.writeToIndexedDB(`backup-${backupFilename}`, data);
      }
      
      // Clean up old backups
      await this.cleanupOldBackups(filename);
    } catch (error) {
      console.error(`Failed to create backup for ${filename}:`, error);
    }
  }

  private async cleanupOldBackups(filename: keyof StorageFiles | string): Promise<void> {
    // Implementation would list backup files and remove old ones
    // For now, just log that cleanup would happen
    console.log(`Would cleanup old backups for ${filename}, keeping ${this.config.backupCount} most recent`);
  }

  // Migration from webStorage - DISABLED
  async migrateFromBackupStorage(): Promise<void> {
    try {
      console.log('webStorage migration disabled - no migration performed');
      toast.info('webStorage migration disabled - using repository storage instead');
      return;
      
      if (houseExists || charactersExists) {
        console.log('File storage already has data, skipping migration to prevent overwrite');
        toast.info('File storage already initialized - no migration needed');
        return;
      }
      
      // Migrate house data
      const houseData = webStorage.getItem('character-house');
      if (houseData) {
        const parsed = JSON.parse(houseData);
        
        // Check if we have characters in the house data
        if (parsed.characters && Array.isArray(parsed.characters)) {
          // Split the data: house info goes to house.json, characters go to characters.json
          const { characters, ...houseInfo } = parsed;
          
          await this.writeFile('house', houseInfo);
          await this.writeFile('characters', characters);
          
          console.log(`Migrated ${characters.length} characters to separate file`);
        } else {
          // No characters to split, migrate as-is
          await this.writeFile('house', parsed);
          await this.writeFile('characters', []);
        }
      }
      
      // Migrate other webStorage data
      const allKeys = Object.keys(webStorage);
      const settings: Record<string, any> = {};
      
      for (const key of allKeys) {
        if (key.startsWith('character-house')) continue; // Already migrated
        
        const value = webStorage.getItem(key);
        if (value) {
          try {
            settings[key] = JSON.parse(value);
          } catch {
            settings[key] = value;
          }
        }
      }
      
      if (Object.keys(settings).length > 0) {
        await this.writeFile('settings', settings);
      }
      
      console.log('Migration completed successfully');
      toast.success('Data migrated to new file storage system');
      
      // Don't automatically clear webStorage - let user decide
      console.log('Migration complete. Your data is now in the new file storage system.');
      console.log('You can safely clear webStorage from the Emergency Repair tab if desired.');
      
    } catch (error) {
      console.error('Migration failed:', error);
      toast.error('Failed to migrate data');
      throw error;
    }
  }

  // Export/Import functionality
  async exportAllData(): Promise<string> {
    const allData: Record<string, any> = {};
    
    for (const filename of Object.keys(this.files) as Array<keyof StorageFiles>) {
      if (filename === 'backups') continue;
      allData[filename] = await this.readFile(filename);
    }
    
    return JSON.stringify(allData, null, 2);
  }

  async importAllData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData);
      
      for (const [filename, content] of Object.entries(data)) {
        if (filename in this.files && filename !== 'backups') {
          await this.writeFile(filename as keyof StorageFiles, content);
        }
      }
      
      toast.success('Data imported successfully');
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Failed to import data');
      throw error;
    }
  }

  // Utility methods
  getStorageInfo(): Promise<{
    path: string;
    files: Array<{
      name: string;
      size: string;
      lastModified: string;
    }>;
  }> {
    // Return storage information for debugging/display
    return Promise.resolve({
      path: this.config.userDataPath,
      files: []
    });
  }
}

// Create global instance
export const fileStorage = new FileStorageSystem();