import { storage } from '@/storage/index';
import { logger } from './logger';
import type { ConversationSummary, RelationshipContext } from './conversationSummarizer';

export class ContextStorage {
  private static instance: ContextStorage;
  
  static getInstance(): ContextStorage {
    if (!ContextStorage.instance) {
      ContextStorage.instance = new ContextStorage();
    }
    return ContextStorage.instance;
  }

  async initTables(): Promise<void> {
    try {
      if (!storage) throw new Error('Storage not initialized');

      // Create conversation_summaries table
      await storage.run(`
        CREATE TABLE IF NOT EXISTS conversation_summaries (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          participant_ids TEXT NOT NULL, -- JSON array
          summary TEXT NOT NULL,
          emotional_tone TEXT NOT NULL,
          relationship_dynamics TEXT NOT NULL,
          key_events TEXT NOT NULL, -- JSON array
          intimacy_level INTEGER NOT NULL,
          mood TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          message_count INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create relationship_contexts table
      await storage.run(`
        CREATE TABLE IF NOT EXISTS relationship_contexts (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          character_id TEXT NOT NULL,
          character_name TEXT NOT NULL,
          relationship_type TEXT NOT NULL,
          intimacy_level INTEGER NOT NULL,
          emotional_state TEXT NOT NULL,
          last_interaction TEXT NOT NULL,
          key_personality_traits TEXT NOT NULL, -- JSON array
          user_preferences TEXT NOT NULL, -- JSON array
          conversation_style TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, character_id)
        )
      `);

      logger.log('✅ Context storage tables initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize context storage tables:', error);
      throw error;
    }
  }

  async storeSummary(summary: ConversationSummary): Promise<void> {
    try {
      if (!storage) throw new Error('Storage not initialized');

      await storage.run(`
        INSERT OR REPLACE INTO conversation_summaries (
          id, session_id, participant_ids, summary, emotional_tone,
          relationship_dynamics, key_events, intimacy_level, mood,
          timestamp, message_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        summary.id,
        summary.sessionId,
        JSON.stringify(summary.participantIds),
        summary.summary,
        summary.emotionalTone,
        summary.relationshipDynamics,
        JSON.stringify(summary.keyEvents),
        summary.intimacyLevel,
        summary.mood,
        summary.timestamp,
        summary.messageCount
      ]);

      logger.log('💾 Stored conversation summary:', summary.id);
    } catch (error) {
      logger.error('❌ Failed to store summary:', error);
      throw error;
    }
  }

  async getContextSummaryForAli(userId: string): Promise<string> {
    try {
      if (!storage) return "Storage not available.";
      
      const rows = await storage.query(`
        SELECT * FROM relationship_contexts 
        WHERE user_id = ?
        ORDER BY updated_at DESC
      `, [userId]);

      if (rows.length === 0) {
        return "No previous interactions recorded yet.";
      }

      let summary = "Recent relationship context:\n\n";
      
      for (const row of rows) {
        summary += `**${row.character_name}** (${row.relationship_type}, intimacy: ${row.intimacy_level}/10):\n`;
        summary += `- Emotional state: ${row.emotional_state}\n`;
        summary += `- Conversation style: ${row.conversation_style}\n`;
        
        // Get recent summaries for this character
        const recentSummaries = await storage.query(`
          SELECT * FROM conversation_summaries 
          WHERE participant_ids LIKE '%"' || ? || '"%'
          ORDER BY timestamp DESC 
          LIMIT 2
        `, [row.character_id]);
        
        if (recentSummaries.length > 0) {
          const lastSummary = recentSummaries[0];
          summary += `- Recent interaction: ${lastSummary.summary} (${lastSummary.emotional_tone})\n`;
        }
        
        const traits = JSON.parse(row.key_personality_traits || '[]');
        if (traits.length > 0) {
          summary += `- Key traits: ${traits.join(', ')}\n`;
        }
        
        summary += "\n";
      }

      logger.log('📋 Generated context summary for Ali');
      return summary;
    } catch (error) {
      logger.error('❌ Failed to generate context summary for Ali:', error);
      return "Error accessing relationship context.";
    }
  }
}

export const contextStorage = ContextStorage.getInstance();