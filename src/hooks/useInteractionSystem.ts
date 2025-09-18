import { Character } from '@/types';
import { useCallback } from 'react';
import { useRelationshipDynamics } from './useRelationshipDynamics';

export function useInteractionSystem() {
  const { updateRelationshipStats, updateSkills, addRelationshipEvent, addSexualEvent, updateRelationshipStatus } = useRelationshipDynamics();

  // Analyze message content for sexual skill mentions
  const analyzeSkillMentions = useCallback((message: string): {
    hands: boolean;
    mouth: boolean;
    missionary: boolean;
    doggy: boolean;
    cowgirl: boolean;
  } => {
    const lowerMessage = message.toLowerCase();
    
    return {
      hands: /hand|stroke|touch|finger|caress|massage/.test(lowerMessage),
      mouth: /mouth|kiss|lip|tongue|oral|blow|suck/.test(lowerMessage),
      missionary: /missionary|on top|face to face|looking into/.test(lowerMessage),
      doggy: /doggy|behind|from behind|bend over/.test(lowerMessage),
      cowgirl: /cowgirl|ride|on top|straddle/.test(lowerMessage)
    };
  }, []);

  // Update sexual skills based on practice/mention
  const processSkillUpdates = useCallback((characterId: string, character: Character, skillMentions: Record<string, boolean>) => {
    const currentSkills: Record<string, number> = character.skills || {
      hands: 0,
      mouth: 0,
      missionary: 0,
      doggy: 0,
      cowgirl: 0
    };

    const updatedSkills: Record<string, number> = {};
    let hasUpdates = false;

    // Each skill starts at 0% and increases when mentioned/practiced
    Object.keys(skillMentions).forEach(skill => {
      if (skillMentions[skill] && currentSkills[skill] < 100) {
        const increase = Math.floor(Math.random() * 3) + 1; // 1-3 point increase
        updatedSkills[skill] = Math.min(100, currentSkills[skill] + increase);
        hasUpdates = true;
      }
    });

    if (hasUpdates) {
      updateSkills(characterId, updatedSkills);
    }
  }, [updateSkills]);

  // Analyze message content for relationship triggers
  const analyzeMessage = useCallback((message: string): {
    sentiment: 'positive' | 'negative' | 'neutral';
    intimacy: number;
    romantic: boolean;
    sexual: boolean;
    compliment: boolean;
    question: boolean;
  } => {
    const lowerMessage = message.toLowerCase();
    
    // Positive sentiment words
    const positiveWords = ['love', 'beautiful', 'amazing', 'wonderful', 'great', 'fantastic', 'perfect', 'awesome', 'adorable', 'sweet'];
    const negativeWords = ['hate', 'stupid', 'awful', 'terrible', 'horrible', 'disgusting', 'annoying', 'ugly'];
    
    // Romantic words
    const romanticWords = ['love', 'heart', 'kiss', 'romantic', 'together', 'relationship', 'feelings', 'care', 'adore'];
    
    // Sexual words
    const sexualWords = ['sexy', 'hot', 'desire', 'want you', 'aroused', 'turned on', 'attraction', 'body'];
    
    // Compliment indicators
    const complimentWords = ['beautiful', 'pretty', 'gorgeous', 'handsome', 'attractive', 'cute', 'lovely', 'stunning'];
    
    // Question indicators
    const hasQuestion = message.includes('?') || lowerMessage.startsWith('what') || lowerMessage.startsWith('how') || lowerMessage.startsWith('why');
    
    const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;
    const romanticCount = romanticWords.filter(word => lowerMessage.includes(word)).length;
    const sexualCount = sexualWords.filter(word => lowerMessage.includes(word)).length;
    const complimentCount = complimentWords.filter(word => lowerMessage.includes(word)).length;
    
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (positiveCount > negativeCount) sentiment = 'positive';
    else if (negativeCount > positiveCount) sentiment = 'negative';
    
    return {
      sentiment,
      intimacy: Math.min(5, romanticCount + Math.floor(sexualCount / 2)),
      romantic: romanticCount > 0,
      sexual: sexualCount > 0,
      compliment: complimentCount > 0,
      question: hasQuestion
    };
  }, []);

  // Process user message for relationship impacts
  const processUserMessage = useCallback((characterId: string, message: string, character: Character) => {
    // Safely access character properties with defaults
    const stats = character.stats || {
      love: 0,
      wet: 0,
      happiness: 0,
      experience: 0,
      level: 1
    };

    const progression = character.progression || {
      level: stats.level,
      nextLevelExp: 1000,
      unlockedFeatures: [],
      achievements: [],
      relationshipStatus: 'stranger' as const,
      affection: 0,
      trust: 0,
      intimacy: 0,
      dominance: 50,
      jealousy: 0,
      possessiveness: 0,
      sexualExperience: 0,
      kinks: [],
      limits: [],
      fantasies: [],
      unlockedPositions: [],
      unlockedOutfits: [],
      unlockedToys: [],
      unlockedScenarios: [],
      relationshipMilestones: [],
      sexualMilestones: [],
      significantEvents: [],
      memorableEvents: [],
      bonds: {},
      sexualCompatibility: {
        overall: 0,
        kinkAlignment: 0,
        stylePreference: 0
      },
      userPreferences: {
        likes: [],
        dislikes: [],
        turnOns: [],
        turnOffs: []
      }
    };

    const analysis = analyzeMessage(message);
    const skillMentions = analyzeSkillMentions(message);
    
    // Process skill improvements based on conversation content
    processSkillUpdates(characterId, character, skillMentions);
    
    // Base stat changes
    let relationshipChange = 0;
    let trustChange = 0;
    let intimacyChange = 0;
    let happinessChange = 0;
    let wetChange = 0;
    let affectionChange = 0;
    
    // Apply sentiment-based changes
    if (analysis.sentiment === 'positive') {
      relationshipChange += 1;
      happinessChange += 2;
      affectionChange += 1;
    } else if (analysis.sentiment === 'negative') {
      relationshipChange -= 2;
      happinessChange -= 3;
      affectionChange -= 2;
      trustChange -= 1;
    }
    
    // Apply specific interaction bonuses
    if (analysis.compliment) {
      relationshipChange += 2;
      happinessChange += 3;
      affectionChange += 2;
      wetChange += 1;
    }
    
    if (analysis.question) {
      trustChange += 1;
      affectionChange += 1;
    }
    
    if (analysis.romantic) {
      intimacyChange += 2;
      wetChange += 2;
      relationshipChange += 1;
    }
    
    if (analysis.sexual) {
      wetChange += 3;
      intimacyChange += 1;
      // Only positive if relationship is high enough
      if (stats.love > 50) {
        relationshipChange += 1;
      } else {
        relationshipChange -= 1;
      }
    }
    
    // Apply changes if they're significant enough
    if (Math.abs(relationshipChange) + Math.abs(happinessChange) + Math.abs(wetChange) > 0) {
      updateRelationshipStats(characterId, {
        love: stats.love + relationshipChange,
        happiness: stats.happiness + happinessChange,
        wet: stats.wet + wetChange,
        affection: progression.affection + affectionChange,
        trust: progression.trust + trustChange
      });
    }
    
    // Create relationship events for significant interactions
    if (analysis.compliment && Math.random() < 0.3) {
      addRelationshipEvent(characterId, {
        type: 'intimate_moment',
        description: 'Received a heartfelt compliment',
        impact: { affection: 2, trust: 1 }
      });
    }
    
    if (analysis.romantic && stats.love > 40 && Math.random() < 0.2) {
      addRelationshipEvent(characterId, {
        type: 'intimate_moment',
        description: 'Shared a romantic moment together',
        impact: { intimacy: 3, affection: 2 }
      });
    }
    
    if (analysis.sexual && stats.love > 60 && Math.random() < 0.15) {
      addSexualEvent(characterId, {
        type: 'milestone_reached',
        description: 'Explored new levels of intimacy',
        intensity: 60,
        satisfaction: 70
      });
    }
    
    // Check for milestone unlocks
    updateRelationshipStatus(characterId);
    
  }, [analyzeMessage, updateRelationshipStats, addRelationshipEvent, addSexualEvent, updateRelationshipStatus]);

  // Process character response for additional relationship building
  const processCharacterResponse = useCallback((characterId: string, message: string, character: Character) => {
    // Safely access character stats with defaults
    const stats = character.stats || {
      relationship: 0,
      wet: 0,
      happiness: 0,
      experience: 0,
      level: 1
    };

    const analysis = analyzeMessage(message);
    
    // Characters can also build relationship through their responses
    if (analysis.sentiment === 'positive') {
      // Small boost for positive character responses
      updateRelationshipStats(characterId, {
        happiness: stats.happiness + 1
      });
    }
    
    if (analysis.romantic) {
      updateRelationshipStats(characterId, {
        wet: stats.wet + 1
      });
    }
  }, [analyzeMessage, updateRelationshipStats]);

  // Simulate daily relationship decay/maintenance
  const processTimeDecay = useCallback((characterId: string, character: Character) => {
    // Safely access character stats with defaults
    const stats = character.stats || {
      relationship: 0,
      wet: 0,
      happiness: 0,
      experience: 0,
      level: 1
    };

    const daysSinceLastInteraction = character.lastInteraction 
      ? Math.floor((Date.now() - new Date(character.lastInteraction).getTime()) / (1000 * 60 * 60 * 24))
      : 1;
    
    // Gradual decay if not interacted with recently
    if (daysSinceLastInteraction > 3) {
      const decayAmount = Math.min(5, daysSinceLastInteraction - 3);
      
      updateRelationshipStats(characterId, {
        happiness: Math.max(0, stats.happiness - decayAmount),
        wet: Math.max(0, stats.wet - Math.floor(decayAmount / 2))
      });
    }
  }, [updateRelationshipStats]);

  // Trigger special events based on relationship milestones
  const triggerMilestoneEvents = useCallback((characterId: string, character: Character) => {
    // Safely access character properties with defaults
    const stats = character.stats || {
      love: 0,
      wet: 0,
      happiness: 0,
      experience: 0,
      level: 1
    };

    const progression = character.progression || {
      level: stats.level,
      nextLevelExp: 1000,
      unlockedFeatures: [],
      achievements: [],
      relationshipStatus: 'stranger' as const,
      affection: 0,
      trust: 0,
      intimacy: 0,
      dominance: 50,
      jealousy: 0,
      possessiveness: 0,
      sexualExperience: 0,
      kinks: [],
      limits: [],
      fantasies: [],
      unlockedPositions: [],
      unlockedOutfits: [],
      unlockedToys: [],
      unlockedScenarios: [],
      relationshipMilestones: [],
      sexualMilestones: [],
      significantEvents: [],
      memorableEvents: [],
      bonds: {},
      sexualCompatibility: {
        overall: 0,
        kinkAlignment: 0,
        stylePreference: 0
      },
      userPreferences: {
        likes: [],
        dislikes: [],
        turnOns: [],
        turnOffs: []
      }
    };

    const relationship = stats.love;
    const intimacy = progression.intimacy;
    const trust = progression.trust;
    
    // First kiss milestone
    if (relationship > 25 && trust > 20 && intimacy > 15 && Math.random() < 0.1) {
      const firstKissMilestone = progression.sexualMilestones.find(m => m.id === 'first_kiss');
      if (firstKissMilestone && !firstKissMilestone.achieved) {
        addSexualEvent(characterId, {
          type: 'first_kiss',
          description: 'Shared your first magical kiss together',
          intensity: 40,
          satisfaction: 60,
          unlocks: ['romantic_dialogue']
        });
      }
    }
    
    // Intimate touch milestone  
    if (relationship > 40 && trust > 35 && intimacy > 30 && stats.wet > 50 && Math.random() < 0.05) {
      const intimateMilestone = progression.sexualMilestones.find(m => m.id === 'first_intimate_touch');
      if (intimateMilestone && !intimateMilestone.achieved) {
        addSexualEvent(characterId, {
          type: 'first_touch',
          description: 'Experienced intimate physical connection for the first time',
          intensity: 65,
          satisfaction: 75,
          unlocks: ['intimate_positions']
        });
      }
    }
  }, [addSexualEvent]);

  return {
    processUserMessage,
    processCharacterResponse,
    processTimeDecay,
    triggerMilestoneEvents,
    analyzeMessage
  };
}