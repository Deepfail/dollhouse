import { logger } from './logger';
import { AIService } from './aiService';
import type { ChatMessage, Character } from '@/types';

export interface ConversationSummary {
  id: string;
  sessionId: string;
  participantIds: string[];
  summary: string;
  emotionalTone: string;
  relationshipDynamics: string;
  keyEvents: string[];
  intimacyLevel: number; // 1-10 scale
  mood: string;
  timestamp: string;
  messageCount: number;
}

export interface RelationshipContext {
  userId: string;
  characterId: string;
  characterName: string;
  relationshipType: string; // "friend", "romantic", "casual", "complex"
  intimacyLevel: number; // 1-10
  emotionalState: string;
  recentSummaries: ConversationSummary[];
  lastInteraction: string;
  keyPersonalityTraits: string[];
  userPreferences: string[];
  conversationStyle: string;
}

export class ConversationSummarizer {
  private static instance: ConversationSummarizer;
  
  static getInstance(): ConversationSummarizer {
    if (!ConversationSummarizer.instance) {
      ConversationSummarizer.instance = new ConversationSummarizer();
    }
    return ConversationSummarizer.instance;
  }

  async summarizeConversation(
    sessionId: string,
    messages: ChatMessage[],
    participants: Character[]
  ): Promise<ConversationSummary> {
    try {
      logger.log('📋 Starting conversation summarization for session:', sessionId);
      
      // Filter out system messages for the summary
      const conversationMessages = messages.filter(m => m.role !== 'system');
      
      if (conversationMessages.length === 0) {
        throw new Error('No conversation messages to summarize');
      }

      // Build conversation text
      const conversationText = conversationMessages
        .map(msg => {
          const speaker = msg.characterId 
            ? participants.find(p => p.id === msg.characterId)?.name || 'Character'
            : 'User';
          return `${speaker}: ${msg.content}`;
        })
        .join('\n');

      // Character names for context
      const characterNames = participants.map(p => p.name).join(', ');

      const prompt = `Analyze this conversation between User and ${characterNames}:

${conversationText}

Provide a JSON response with:
{
  "summary": "2-3 sentence summary of what happened",
  "emotionalTone": "overall emotional atmosphere (warm/playful/intimate/tense/etc)",
  "relationshipDynamics": "how the relationship feels (getting closer/flirty/supportive/complex/etc)",
  "keyEvents": ["important moments that happened"],
  "intimacyLevel": 1-10 (1=casual chat, 10=very intimate/romantic),
  "mood": "overall mood (happy/romantic/excited/thoughtful/etc)"
}

Be specific about relationship dynamics and emotional nuance. Focus on what this tells us about their connection.`;

      const response = await AIService.copilotRespond({
        threadId: 'summarizer',
        messages: [{ role: 'user', content: prompt }],
        sessionId: sessionId
      });

      // Parse the AI response
      let analysis;
      try {
        analysis = JSON.parse(response);
      } catch (e) {
        logger.error('Failed to parse AI analysis, using fallback');
        analysis = {
          summary: 'Conversation between user and character',
          emotionalTone: 'neutral',
          relationshipDynamics: 'casual interaction',
          keyEvents: ['Had a conversation'],
          intimacyLevel: 3,
          mood: 'neutral'
        };
      }

      const summary: ConversationSummary = {
        id: `summary_${Date.now()}`,
        sessionId,
        participantIds: participants.map(p => p.id),
        summary: analysis.summary,
        emotionalTone: analysis.emotionalTone,
        relationshipDynamics: analysis.relationshipDynamics,
        keyEvents: analysis.keyEvents || [],
        intimacyLevel: analysis.intimacyLevel || 3,
        mood: analysis.mood,
        timestamp: new Date().toISOString(),
        messageCount: conversationMessages.length
      };

      logger.log('✅ Conversation summarized:', summary);
      return summary;

    } catch (error) {
      logger.error('❌ Failed to summarize conversation:', error);
      throw error;
    }
  }

  async buildRelationshipContext(
    userId: string,
    characterId: string,
    characterName: string,
    recentSummaries: ConversationSummary[]
  ): Promise<RelationshipContext> {
    try {
      logger.log('🔗 Building relationship context for:', characterName);

      if (recentSummaries.length === 0) {
        return {
          userId,
          characterId,
          characterName,
          relationshipType: 'new',
          intimacyLevel: 1,
          emotionalState: 'neutral',
          recentSummaries: [],
          lastInteraction: 'Never',
          keyPersonalityTraits: [],
          userPreferences: [],
          conversationStyle: 'getting to know each other'
        };
      }

      // Analyze pattern from recent summaries
      const summariesText = recentSummaries
        .map(s => `Conversation: ${s.summary} (Intimacy: ${s.intimacyLevel}, Tone: ${s.emotionalTone}, Dynamics: ${s.relationshipDynamics})`)
        .join('\n');

      const prompt = `Analyze these recent conversations between User and ${characterName}:

${summariesText}

Based on these interactions, provide a JSON response with:
{
  "relationshipType": "friend/romantic/casual/complex/intimate",
  "intimacyLevel": 1-10 (average of recent interactions),
  "emotionalState": "how ${characterName} feels about User",
  "keyPersonalityTraits": ["traits that have emerged about ${characterName}"],
  "userPreferences": ["things User seems to like or respond to"],
  "conversationStyle": "how they typically interact"
}

Focus on relationship progression and emotional connection patterns.`;

      const response = await AIService.copilotRespond({
        threadId: 'relationship-analyzer',
        messages: [{ role: 'user', content: prompt }],
        sessionId: 'relationship-context'
      });

      let analysis;
      try {
        analysis = JSON.parse(response);
      } catch (e) {
        logger.error('Failed to parse relationship analysis, using fallback');
        analysis = {
          relationshipType: 'developing',
          intimacyLevel: Math.max(1, Math.round(recentSummaries.reduce((acc, s) => acc + s.intimacyLevel, 0) / recentSummaries.length)),
          emotionalState: 'friendly',
          keyPersonalityTraits: [],
          userPreferences: [],
          conversationStyle: 'getting to know each other'
        };
      }

      const context: RelationshipContext = {
        userId,
        characterId,
        characterName,
        relationshipType: analysis.relationshipType,
        intimacyLevel: analysis.intimacyLevel,
        emotionalState: analysis.emotionalState,
        recentSummaries: recentSummaries.slice(-5), // Keep last 5 summaries
        lastInteraction: recentSummaries[recentSummaries.length - 1]?.timestamp || 'Never',
        keyPersonalityTraits: analysis.keyPersonalityTraits || [],
        userPreferences: analysis.userPreferences || [],
        conversationStyle: analysis.conversationStyle || 'casual'
      };

      logger.log('✅ Relationship context built:', context);
      return context;

    } catch (error) {
      logger.error('❌ Failed to build relationship context:', error);
      throw error;
    }
  }

  async getContextForAli(userId: string): Promise<string> {
    try {
      // This will query the storage for relationship contexts
      // For now, return a placeholder - we'll implement storage next
      logger.log('🤖 Getting context for Ali about user:', userId);
      
      // TODO: Query conversation summaries and relationship contexts from storage
      return "Context system is being set up. Recent conversations will be available soon.";
      
    } catch (error) {
      logger.error('❌ Failed to get context for Ali:', error);
      return "No context available at this time.";
    }
  }
}

export const conversationSummarizer = ConversationSummarizer.getInstance();