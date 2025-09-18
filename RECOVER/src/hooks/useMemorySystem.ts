import { useCallback } from 'react';
import { useSimpleStorage } from './useSimpleStorage';
import { Character, CharacterMemory, ChatMessage, ChatSession } from '@/types';
import { AIService } from '@/lib/aiService';

export function useMemorySystem() {
  const [characters, setCharacters] = useSimpleStorage<Character[]>('characters', []);

  // Analyze conversation content to extract memories
  const analyzeConversationForMemories = useCallback(async (
    characterId: string,
    session: ChatSession,
    character: Character
  ): Promise<CharacterMemory[]> => {
    const newMemories: CharacterMemory[] = [];
    const userMessages = session.messages.filter(m => !m.characterId);
    const characterMessages = session.messages.filter(m => m.characterId === characterId);

    if (userMessages.length === 0 || characterMessages.length === 0) {
      return newMemories;
    }

    // Analyze for personal preferences and facts
    const conversationText = session.messages
      .map(m => m.characterId ? `${character.name}: ${m.content}` : `User: ${m.content}`)
      .join('\n');

    try {
      // Use AI to analyze conversation and extract key memories
      const analysisPrompt = `Analyze this conversation between ${character.name} and their user. Extract key memories and insights that ${character.name} should remember for future interactions.

Conversation:
${conversationText}

Extract memories in these categories:
1. PERSONAL: Facts about the user (likes, dislikes, preferences, personality traits)
2. RELATIONSHIP: Relationship developments, emotional moments, bonding experiences
3. SEXUAL: Sexual preferences, boundaries, intimate moments, desires
4. PREFERENCES: What the user likes/dislikes about ${character.name} or the relationship
5. EVENTS: Important events, milestones, or significant conversations

For each memory, determine:
- Category (personal/relationship/sexual/preferences/events)
- Importance level (low/medium/high)
- Concise description of what should be remembered

Return as JSON array of memories. Focus on the most important 2-4 memories that would help ${character.name} remember the user better.`;

      const analysis = await AIService.generateResponse(analysisPrompt);

      if (analysis) {
        try {
          const parsedMemories = JSON.parse(analysis);
          if (Array.isArray(parsedMemories)) {
            parsedMemories.forEach((mem: any) => {
              if (mem.category && mem.description) {
                newMemories.push({
                  id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  category: mem.category.toLowerCase(),
                  content: mem.description,
                  importance: mem.importance || 'medium',
                  timestamp: new Date(),
                  conversationId: session.id
                });
              }
            });
          }
        } catch (parseError) {
          console.warn('Failed to parse memory analysis:', parseError);
        }
      }
    } catch (error) {
      console.warn('Memory analysis failed:', error);
    }

    // Fallback: Extract basic memories from stat changes and conversation patterns
    const statChanges = detectStatChanges(character, session);
    if (statChanges.length > 0) {
      statChanges.forEach(change => {
        let category: CharacterMemory['category'] = 'relationship';
        let content = '';

        if (change.stat === 'love' && change.change > 10) {
          category = 'relationship';
          content = `User showed strong affection, increasing our bond significantly`;
        } else if (change.stat === 'wet' && change.change > 15) {
          category = 'sexual';
          content = `User's actions aroused me considerably`;
        } else if (change.stat === 'trust' && change.change > 10) {
          category = 'relationship';
          content = `User demonstrated reliability and trustworthiness`;
        }

        if (content) {
          newMemories.push({
            id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            category,
            content,
            importance: change.change > 20 ? 'high' : 'medium',
            timestamp: new Date(),
            conversationId: session.id,
            relatedStats: { [change.stat]: change.change }
          });
        }
      });
    }

    return newMemories.slice(0, 3); // Limit to 3 memories per conversation
  }, []);

  // Detect significant stat changes during conversation
  const detectStatChanges = useCallback((character: Character, session: ChatSession) => {
    // This is a simplified version - in reality you'd track stat changes during the session
    // For now, we'll just return mock changes based on conversation length
    const changes: Array<{stat: string, change: number}> = [];
    const messageCount = session.messages.length;

    if (messageCount > 5) {
      changes.push({ stat: 'love', change: Math.min(5, messageCount) });
    }
    if (messageCount > 8) {
      changes.push({ stat: 'trust', change: Math.min(3, messageCount - 5) });
    }

    return changes;
  }, []);

  // Add memories to character
  const addMemories = useCallback((characterId: string, memories: CharacterMemory[]) => {
    setCharacters(current => {
      return current.map(char => {
        if (char.id !== characterId) return char;

        const existingMemories = char.memories || [];
        const updatedMemories = [...existingMemories, ...memories];

        // Keep only the most recent 50 memories, prioritizing by importance
        const sortedMemories = updatedMemories
          .sort((a, b) => {
            // Sort by importance first, then by recency
            const importanceOrder = { high: 3, medium: 2, low: 1 };
            const aImportance = importanceOrder[a.importance];
            const bImportance = importanceOrder[b.importance];

            if (aImportance !== bImportance) {
              return bImportance - aImportance;
            }

            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
          })
          .slice(0, 50);

        return {
          ...char,
          memories: sortedMemories,
          updatedAt: new Date()
        };
      });
    });
  }, [setCharacters]);

  // Get relevant memories for AI context
  const getRelevantMemories = useCallback((
    characterId: string,
    context: string = '',
    limit: number = 5
  ): CharacterMemory[] => {
    const character = characters.find(c => c.id === characterId);
    if (!character || !character.memories) return [];

    let relevantMemories = character.memories;

    // If context is provided, filter for relevance
    if (context) {
      const contextLower = context.toLowerCase();
      relevantMemories = character.memories.filter(memory => {
        const contentLower = memory.content.toLowerCase();
        // Simple relevance check - can be made more sophisticated
        return contentLower.includes('love') && contextLower.includes('relationship') ||
               contentLower.includes('sex') && contextLower.includes('intimate') ||
               contentLower.includes('trust') && contextLower.includes('reliable') ||
               memory.category === 'sexual' && (contextLower.includes('intimate') || contextLower.includes('sex'));
      });
    }

    // Sort by importance and recency
    return relevantMemories
      .sort((a, b) => {
        const importanceOrder = { high: 3, medium: 2, low: 1 };
        const aScore = importanceOrder[a.importance] + (new Date(a.timestamp).getTime() / 1000000000);
        const bScore = importanceOrder[b.importance] + (new Date(b.timestamp).getTime() / 1000000000);
        return bScore - aScore;
      })
      .slice(0, limit);
  }, [characters]);

  // Process conversation and build memories
  const processConversationMemories = useCallback(async (
    characterId: string,
    session: ChatSession
  ) => {
    const character = characters.find(c => c.id === characterId);
    if (!character) return;

    try {
      const newMemories = await analyzeConversationForMemories(characterId, session, character);

      if (newMemories.length > 0) {
        addMemories(characterId, newMemories);
        console.log(`Added ${newMemories.length} memories for ${character.name}`);
      }
    } catch (error) {
      console.warn('Failed to process conversation memories:', error);
    }
  }, [characters, analyzeConversationForMemories, addMemories]);

  // Get memory context for AI prompts
  const getMemoryContext = useCallback((characterId: string, context: string = ''): string => {
    const memories = getRelevantMemories(characterId, context, 3);

    if (memories.length === 0) return '';

    const memoryText = memories
      .map(memory => {
        const categoryEmoji = {
          personal: '👤',
          relationship: '❤️',
          sexual: '🔥',
          preferences: '⭐',
          events: '📅'
        }[memory.category] || '💭';

        return `${categoryEmoji} ${memory.content}`;
      })
      .join('\n');

    return `\n\nYou remember from past interactions:\n${memoryText}`;
  }, [getRelevantMemories]);

  return {
    addMemories,
    getRelevantMemories,
    processConversationMemories,
    getMemoryContext,
    analyzeConversationForMemories
  };
}