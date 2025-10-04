import { useCallback } from 'react';
import { Character, StoryEntry } from '../types';
import { AIService } from '../lib/aiService';
import { formatPrompt } from '../lib/prompts';

export const useStorySystem = () => {
  const createStoryEntry = useCallback(async (
    character: Character,
    eventType: StoryEntry['eventType'],
    title: string,
    context: {
      conversation?: string;
      userAction?: string;
      characterResponse?: string;
      location?: string;
      participants?: string[];
      customDetails?: string;
    }
  ): Promise<StoryEntry> => {
    const timestamp = new Date();
    const id = `story_${character.id}_${timestamp.getTime()}`;

    // Generate AI summary and details using prompt library
    const storyPrompt = formatPrompt('house.story.entryPrompt', {
      characterName: character.name,
      personality: character.personality,
      relationshipStatus: character.progression.relationshipStatus,
      love: character.stats.love,
      trust: character.progression.trust,
      intimacy: character.progression.intimacy,
      eventType,
      title,
      conversationBlock: context.conversation ? `Conversation: ${context.conversation}\n` : '',
      userActionBlock: context.userAction ? `User Action: ${context.userAction}\n` : '',
      characterResponseBlock: context.characterResponse ? `Character Response: ${context.characterResponse}\n` : '',
      customDetailsBlock: context.customDetails ? `Additional Details: ${context.customDetails}\n` : ''
    });

    try {
      const aiResponse = await AIService.generateResponse(storyPrompt);
      const storyData = JSON.parse(aiResponse);

      const storyEntry: StoryEntry = {
        id,
        timestamp,
        eventType,
        title,
        summary: storyData.summary,
        details: storyData.details,
        participants: context.participants || [character.id],
        location: context.location,
        emotions: {
          before: storyData.emotionsBefore || {},
          after: storyData.emotionsAfter || {}
        },
        storyArc: character.progression.currentStoryArc,
        significance: storyData.significance || 'medium',
        tags: storyData.tags || [],
        relatedEvents: []
      };

      return storyEntry;
    } catch (error) {
      console.error('Error generating story entry:', error);
      
      // Fallback if AI fails
      const fallbackEntry: StoryEntry = {
        id,
        timestamp,
        eventType,
        title,
        summary: formatPrompt('house.story.fallbackSummary', {
          characterName: character.name,
          eventType
        }),
        details: `A ${eventType} occurred between ${character.name} and the user. ${context.conversation ? 'They talked about various topics.' : 'They interacted in a meaningful way.'}`,
        participants: context.participants || [character.id],
        location: context.location,
        emotions: {
          before: { happiness: 50, trust: 40, affection: 45 },
          after: { happiness: 55, trust: 45, affection: 50 }
        },
        storyArc: character.progression.currentStoryArc,
        significance: 'medium',
        tags: [eventType],
        relatedEvents: []
      };

      return fallbackEntry;
    }
  }, []);

  const addStoryEntry = useCallback((character: Character, storyEntry: StoryEntry): Character => {
    const currentChronicle = character.progression.storyChronicle || [];
    const updatedStoryChronicle = [...currentChronicle, storyEntry];
    
    // Keep only the most recent 50 entries to prevent bloat
    if (updatedStoryChronicle.length > 50) {
      updatedStoryChronicle.splice(0, updatedStoryChronicle.length - 50);
    }

    return {
      ...character,
      progression: {
        ...character.progression,
        storyChronicle: updatedStoryChronicle
      }
    };
  }, []);

  const getRecentStoryContext = useCallback((character: Character, limit: number = 10): string => {
    const chronicle = character.progression.storyChronicle || [];
    const recentEntries = chronicle
      .slice(-limit)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (recentEntries.length === 0) {
      return formatPrompt('house.story.noHistoryIntro', {
        characterName: character.name
      });
    }

    const storyContext = recentEntries.map(entry => {
      const timeAgo = Math.floor((Date.now() - entry.timestamp.getTime()) / (1000 * 60 * 60 * 24));
      const timeDesc = timeAgo === 0 ? 'today' : timeAgo === 1 ? 'yesterday' : `${timeAgo} days ago`;
      
      return `${timeDesc}: ${entry.summary}`;
    }).join('\n');

    return `Your history with ${character.name}:\n${storyContext}`;
  }, []);

  const getStoryModePrompt = useCallback((character: Character): string => {
    const recentContext = getRecentStoryContext(character, 15);
    const relationshipStage = character.progression.relationshipStatus;
    const chronicle = character.progression.storyChronicle || [];
    const significantEvents = chronicle
      .filter(entry => entry.significance === 'high' || entry.significance === 'pivotal')
      .slice(-5);

    let storyPrompt = `STORY MODE - Maintain continuity and remember your shared history.

${recentContext}

Current Relationship: ${relationshipStage}
Trust Level: ${character.progression.trust}/100
Affection Level: ${character.progression.affection}/100
Intimacy Level: ${character.progression.intimacy}/100

`;

    if (significantEvents.length > 0) {
      storyPrompt += `Important moments between you:
${significantEvents.map(event => `- ${event.title}: ${event.summary}`).join('\n')}

`;
    }

    storyPrompt += `Remember and reference your shared experiences. Your responses should reflect your growing relationship and the history you've built together. Act consistently with your established personality and the trust/affection levels you've developed.`;

    return storyPrompt;
  }, [getRecentStoryContext]);

  const analyzeEmotionalJourney = useCallback((character: Character): string => {
    const chronicle = character.progression.storyChronicle;
    if (!chronicle || chronicle.length === 0) return 'No emotional journey data available.';

    const firstEntry = chronicle[0];
    const lastEntry = chronicle[chronicle.length - 1];
    
    const emotionalGrowth = {
      trust: (lastEntry.emotions.after.trust || 0) - (firstEntry.emotions.before.trust || 0),
      affection: (lastEntry.emotions.after.affection || 0) - (firstEntry.emotions.before.affection || 0),
      happiness: (lastEntry.emotions.after.happiness || 0) - (firstEntry.emotions.before.happiness || 0)
    };

    const pivotalMoments = chronicle.filter(entry => entry.significance === 'pivotal');
    
    return `Emotional Journey Analysis:
Trust Growth: ${emotionalGrowth.trust > 0 ? '+' : ''}${emotionalGrowth.trust}
Affection Growth: ${emotionalGrowth.affection > 0 ? '+' : ''}${emotionalGrowth.affection}
Happiness Growth: ${emotionalGrowth.happiness > 0 ? '+' : ''}${emotionalGrowth.happiness}

Pivotal Moments: ${pivotalMoments.length}
${pivotalMoments.map(moment => `- ${moment.title}`).join('\n')}`;
  }, []);

  return {
    createStoryEntry,
    addStoryEntry,
    getRecentStoryContext,
    getStoryModePrompt,
    analyzeEmotionalJourney
  };
};