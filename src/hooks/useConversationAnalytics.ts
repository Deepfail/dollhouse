import { useEffect, useRef, useState } from 'react';
import { useChat } from '@/hooks/useChat';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { logger } from '@/lib/logger';
import { conversationSummarizer } from '@/lib/conversationSummarizer';
import { contextStorage } from '@/lib/contextStorage';
import type { Character } from '@/types';

const CONVERSATION_END_TIMEOUT = 5 * 60 * 1000; // 5 minutes of inactivity
const MIN_MESSAGES_TO_SUMMARIZE = 3; // Minimum messages to consider for summary

export function useConversationAnalytics() {
  const { sessions, getSessionMessages } = useChat();
  const { characters } = useHouseFileStorage();
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Track active conversations and their timers
  const conversationTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastMessageTimes = useRef<Map<string, number>>(new Map());
  const processedSessions = useRef<Set<string>>(new Set());

  // Initialize storage tables
  useEffect(() => {
    const initStorage = async () => {
      try {
        await contextStorage.initTables();
        setIsInitialized(true);
        logger.log('📊 Conversation analytics initialized');
      } catch (error) {
        logger.error('❌ Failed to initialize conversation analytics:', error);
      }
    };

    initStorage();
  }, []);

  // Monitor sessions for conversation activity
  useEffect(() => {
    if (!isInitialized || !characters) return;

    const monitorSessions = async () => {
      for (const session of sessions) {
        // Skip if already processed
        if (processedSessions.current.has(session.id)) continue;

        // Only monitor individual and group sessions (not system/interview)
        if (session.type !== 'individual' && session.type !== 'group') continue;

        try {
          const messages = await getSessionMessages(session.id);
          if (!messages || messages.length < MIN_MESSAGES_TO_SUMMARIZE) continue;

          // Get the latest message timestamp
          const latestMessage = messages[messages.length - 1];
          const messageTime = new Date(latestMessage.timestamp).getTime();
          const currentTime = Date.now();
          
          // Check if conversation is still active (recent message)
          const timeSinceLastMessage = currentTime - messageTime;
          
          if (timeSinceLastMessage < CONVERSATION_END_TIMEOUT) {
            // Conversation is still active, set/reset timer
            setupConversationTimer(session.id, messageTime);
          } else {
            // Conversation has been inactive, process it
            await processConversationEnd(session.id, messages);
          }
          
        } catch (error) {
          logger.error('❌ Error monitoring session:', session.id, error);
        }
      }
    };

    monitorSessions();
  }, [sessions, isInitialized, characters, getSessionMessages]);

  const setupConversationTimer = (sessionId: string, lastMessageTime: number) => {
    // Clear existing timer
    const existingTimer = conversationTimers.current.get(sessionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Update last message time
    lastMessageTimes.current.set(sessionId, lastMessageTime);

    // Set new timer
    const timer = setTimeout(async () => {
      logger.log('⏰ Conversation timeout reached for session:', sessionId);
      
      try {
        const messages = await getSessionMessages(sessionId);
        if (messages && messages.length >= MIN_MESSAGES_TO_SUMMARIZE) {
          await processConversationEnd(sessionId, messages);
        }
      } catch (error) {
        logger.error('❌ Error processing conversation timeout:', error);
      }
    }, CONVERSATION_END_TIMEOUT);

    conversationTimers.current.set(sessionId, timer);
    logger.log('⏱️ Set conversation timer for session:', sessionId);
  };

  const processConversationEnd = async (sessionId: string, messages: any[]) => {
    try {
      // Mark as processed to avoid duplicate processing
      processedSessions.current.add(sessionId);
      
      logger.log('🔍 Processing conversation end for session:', sessionId);

      // Get session info
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return;

      // Get participants (characters involved)
      const participantCharacters: Character[] = [];
      for (const participantId of session.participantIds || []) {
        const character = characters?.find(c => c.id === participantId);
        if (character) {
          participantCharacters.push(character);
        }
      }

      if (participantCharacters.length === 0) {
        logger.log('⚠️ No character participants found, skipping summarization');
        return;
      }

      // Generate conversation summary
      const summary = await conversationSummarizer.summarizeConversation(
        sessionId,
        messages,
        participantCharacters
      );

      // Store the summary
      await contextStorage.storeSummary(summary);

      // Update relationship context for each character
      const userId = 'user'; // For now, using default user ID
      
      for (const character of participantCharacters) {
        // Get existing summaries for this character
        const existingSummaries = await contextStorage.getSummariesForCharacter(
          userId, 
          character.id, 
          10
        );

        // Build updated relationship context
        const relationshipContext = await conversationSummarizer.buildRelationshipContext(
          userId,
          character.id,
          character.name,
          existingSummaries
        );

        // Store the updated context
        await contextStorage.storeRelationshipContext(relationshipContext);
      }

      logger.log('✅ Conversation analysis complete for session:', sessionId);
      
      // Emit event for other parts of the app to know context was updated
      const event = new CustomEvent('conversation-analyzed', {
        detail: { sessionId, participantIds: session.participantIds, summary }
      });
      globalThis.dispatchEvent(event);

    } catch (error) {
      logger.error('❌ Failed to process conversation end:', error);
      // Remove from processed set so it can be retried later
      processedSessions.current.delete(sessionId);
    }
  };

  const manuallyTriggerSummary = async (sessionId: string): Promise<void> => {
    try {
      logger.log('🔄 Manually triggering summary for session:', sessionId);
      
      const messages = await getSessionMessages(sessionId);
      if (!messages || messages.length < MIN_MESSAGES_TO_SUMMARIZE) {
        throw new Error('Not enough messages to summarize');
      }

      await processConversationEnd(sessionId, messages);
      logger.log('✅ Manual summary completed');
    } catch (error) {
      logger.error('❌ Manual summary failed:', error);
      throw error;
    }
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      conversationTimers.current.forEach(timer => clearTimeout(timer));
      conversationTimers.current.clear();
    };
  }, []);

  return {
    isInitialized,
    manuallyTriggerSummary
  };
}

// Hook for getting context data
export function useRelationshipContext() {
  const [contexts, setContexts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadContexts = async (userId: string = 'user') => {
    setLoading(true);
    try {
      const allContexts = await contextStorage.getAllRelationshipContexts(userId);
      setContexts(allContexts);
    } catch (error) {
      logger.error('Failed to load relationship contexts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getContextForCharacter = async (characterId: string, userId: string = 'user') => {
    try {
      return await contextStorage.getRelationshipContext(userId, characterId);
    } catch (error) {
      logger.error('Failed to get context for character:', error);
      return null;
    }
  };

  const getContextSummaryForAli = async (userId: string = 'user'): Promise<string> => {
    try {
      return await contextStorage.getContextSummaryForAli(userId);
    } catch (error) {
      logger.error('Failed to get context summary for Ali:', error);
      return "Error accessing relationship context.";
    }
  };

  return {
    contexts,
    loading,
    loadContexts,
    getContextForCharacter,
    getContextSummaryForAli
  };
}