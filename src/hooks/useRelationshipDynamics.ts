import { useCallback } from 'react';
import { useKV } from '@github/spark/hooks';
import { Character, RelationshipEvent, SexualEvent, SexualMilestone, UnlockableContent } from '@/types';
import { toast } from 'sonner';

export function useRelationshipDynamics() {
  const [characters, setCharacters] = useKV<Character[]>('characters', []);
  const [unlockableContent, setUnlockableContent] = useKV<UnlockableContent[]>('unlockable-content', []);

  // Update relationship stats
  const updateRelationshipStats = useCallback((characterId: string, updates: {
    affection?: number;
    trust?: number;
    intimacy?: number;
    dominance?: number;
    arousal?: number;
    wet?: number;
    relationship?: number;
    happiness?: number;
  }) => {
    setCharacters(currentCharacters => 
      currentCharacters.map(char => {
        if (char.id !== characterId) return char;
        
        const updatedChar = { ...char };
        
        // Update relationship dynamics
        if (updates.affection !== undefined) {
          updatedChar.relationshipDynamics.affection = Math.max(0, Math.min(100, updates.affection));
        }
        if (updates.trust !== undefined) {
          updatedChar.relationshipDynamics.trust = Math.max(0, Math.min(100, updates.trust));
        }
        if (updates.intimacy !== undefined) {
          updatedChar.relationshipDynamics.intimacy = Math.max(0, Math.min(100, updates.intimacy));
        }
        if (updates.dominance !== undefined) {
          updatedChar.relationshipDynamics.dominance = Math.max(0, Math.min(100, updates.dominance));
        }
        
        // Update sexual progression
        if (updates.arousal !== undefined) {
          updatedChar.sexualProgression.arousal = Math.max(0, Math.min(100, updates.arousal));
        }
        
        // Update main stats
        if (updates.wet !== undefined) {
          updatedChar.stats.wet = Math.max(0, Math.min(100, updates.wet));
        }
        if (updates.relationship !== undefined) {
          updatedChar.stats.relationship = Math.max(0, Math.min(100, updates.relationship));
        }
        if (updates.happiness !== undefined) {
          updatedChar.stats.happiness = Math.max(0, Math.min(100, updates.happiness));
        }
        
        updatedChar.updatedAt = new Date();
        return updatedChar;
      })
    );
  }, [setCharacters]);

  // Add relationship event
  const addRelationshipEvent = useCallback((characterId: string, event: Omit<RelationshipEvent, 'id' | 'timestamp'>) => {
    setCharacters(currentCharacters =>
      currentCharacters.map(char => {
        if (char.id !== characterId) return char;
        
        const updatedChar = { ...char };
        const newEvent: RelationshipEvent = {
          ...event,
          id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date()
        };
        
        updatedChar.relationshipDynamics.significantEvents.push(newEvent);
        
        // Apply stat impacts
        if (event.impact) {
          if (event.impact.affection) {
            updatedChar.relationshipDynamics.affection = Math.max(0, Math.min(100, 
              updatedChar.relationshipDynamics.affection + event.impact.affection));
          }
          if (event.impact.trust) {
            updatedChar.relationshipDynamics.trust = Math.max(0, Math.min(100,
              updatedChar.relationshipDynamics.trust + event.impact.trust));
          }
          if (event.impact.intimacy) {
            updatedChar.relationshipDynamics.intimacy = Math.max(0, Math.min(100,
              updatedChar.relationshipDynamics.intimacy + event.impact.intimacy));
          }
          if (event.impact.dominance) {
            updatedChar.relationshipDynamics.dominance = Math.max(0, Math.min(100,
              updatedChar.relationshipDynamics.dominance + event.impact.dominance));
          }
        }
        
        updatedChar.updatedAt = new Date();
        return updatedChar;
      })
    );
    
    toast.success(`Relationship event: ${event.description}`);
  }, [setCharacters]);

  // Add sexual event
  const addSexualEvent = useCallback((characterId: string, event: Omit<SexualEvent, 'id' | 'timestamp'>) => {
    setCharacters(currentCharacters =>
      currentCharacters.map(char => {
        if (char.id !== characterId) return char;
        
        const updatedChar = { ...char };
        const newEvent: SexualEvent = {
          ...event,
          id: `sexual_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date()
        };
        
        updatedChar.sexualProgression.memorableEvents.push(newEvent);
        
        // Handle unlocks
        if (event.unlocks) {
          event.unlocks.forEach(unlock => {
            if (!updatedChar.sexualProgression.unlockedPositions.includes(unlock)) {
              updatedChar.sexualProgression.unlockedPositions.push(unlock);
            }
          });
        }
        
        updatedChar.updatedAt = new Date();
        return updatedChar;
      })
    );
    
    toast.success(`Sexual milestone: ${event.description}`);
  }, [setCharacters]);

  // Check and unlock sexual milestones
  const checkSexualMilestones = useCallback((characterId: string) => {
    setCharacters(currentCharacters =>
      currentCharacters.map(char => {
        if (char.id !== characterId) return char;
        
        const updatedChar = { ...char };
        let hasNewUnlocks = false;
        
        updatedChar.sexualProgression.sexualMilestones.forEach(milestone => {
          if (milestone.achieved) return;
          
          // Check if requirements are met
          let requirementsMet = true;
          
          if (milestone.requiredStats.relationship && char.stats.relationship < milestone.requiredStats.relationship) {
            requirementsMet = false;
          }
          if (milestone.requiredStats.wet && char.stats.wet < milestone.requiredStats.wet) {
            requirementsMet = false;
          }
          if (milestone.requiredStats.trust && char.relationshipDynamics.trust < milestone.requiredStats.trust) {
            requirementsMet = false;
          }
          if (milestone.requiredStats.intimacy && char.relationshipDynamics.intimacy < milestone.requiredStats.intimacy) {
            requirementsMet = false;
          }
          
          if (requirementsMet) {
            milestone.achieved = true;
            milestone.achievedAt = new Date();
            hasNewUnlocks = true;
            
            if (milestone.rewards.unlocks) {
              milestone.rewards.unlocks.forEach(unlock => {
                if (!updatedChar.sexualProgression.unlockedPositions.includes(unlock)) {
                  updatedChar.sexualProgression.unlockedPositions.push(unlock);
                }
              });
            }
            
            if (milestone.rewards.statBoosts) {
              Object.entries(milestone.rewards.statBoosts).forEach(([stat, boost]) => {
                if (stat === 'wet') {
                  updatedChar.stats.wet = Math.min(100, updatedChar.stats.wet + boost);
                } else if (stat === 'relationship') {
                  updatedChar.stats.relationship = Math.min(100, updatedChar.stats.relationship + boost);
                } else if (stat === 'happiness') {
                  updatedChar.stats.happiness = Math.min(100, updatedChar.stats.happiness + boost);
                }
              });
            }
            
            toast.success(`${char.name} achieved: ${milestone.name}!`);
          }
        });
        
        if (hasNewUnlocks) {
          updatedChar.updatedAt = new Date();
        }
        
        return updatedChar;
      })
    );
  }, [setCharacters]);

  // Update relationship status based on stats
  const updateRelationshipStatus = useCallback((characterId: string) => {
    setCharacters(currentCharacters =>
      currentCharacters.map(char => {
        if (char.id !== characterId) return char;
        
        const { affection, trust, intimacy } = char.relationshipDynamics;
        const avgRelationship = (affection + trust + intimacy) / 3;
        
        let newStatus: Character['relationshipDynamics']['relationshipStatus'] = 'stranger';
        
        if (avgRelationship >= 80 && intimacy >= 70) {
          newStatus = 'intimate_partner';
        } else if (avgRelationship >= 60 && intimacy >= 50) {
          newStatus = 'lover';
        } else if (avgRelationship >= 50 && trust >= 40) {
          newStatus = 'romantic_interest';
        } else if (avgRelationship >= 40) {
          newStatus = 'close_friend';
        } else if (avgRelationship >= 25) {
          newStatus = 'friend';
        } else if (avgRelationship >= 10) {
          newStatus = 'acquaintance';
        }
        
        const updatedChar = { ...char };
        if (updatedChar.relationshipDynamics.relationshipStatus !== newStatus) {
          updatedChar.relationshipDynamics.relationshipStatus = newStatus;
          updatedChar.updatedAt = new Date();
          toast.info(`${char.name} is now your ${newStatus.replace('_', ' ')}!`);
        }
        
        return updatedChar;
      })
    );
  }, [setCharacters]);

  // Get character's unlockable content
  const getCharacterUnlocks = useCallback((characterId: string) => {
    const character = characters.find(c => c.id === characterId);
    if (!character) return [];

    return unlockableContent.filter(content => {
      if (content.unlocked) return true;

      // Check requirements
      if (content.requirements.level && character.stats.level < content.requirements.level) return false;
      if (content.requirements.relationship && character.stats.relationship < content.requirements.relationship) return false;
      if (content.requirements.wet && character.stats.wet < content.requirements.wet) return false;
      if (content.requirements.trust && character.relationshipDynamics.trust < content.requirements.trust) return false;
      if (content.requirements.intimacy && character.relationshipDynamics.intimacy < content.requirements.intimacy) return false;

      return true;
    });
  }, [characters, unlockableContent]);

  // Initialize default relationship dynamics for new characters
  const initializeCharacterDynamics = useCallback((character: Character): Character => {
    if (!character.relationshipDynamics) {
      character.relationshipDynamics = {
        affection: 10,
        trust: 5,
        intimacy: 0,
        dominance: 50,
        loyalty: 50,
        possessiveness: 25,
        relationshipStatus: 'stranger',
        bonds: {},
        significantEvents: [],
        preferences: {
          likes: [],
          dislikes: [],
          turnOns: [],
          turnOffs: []
        }
      };
    }

    if (!character.sexualProgression) {
      character.sexualProgression = {
        arousal: 0,
        libido: Math.floor(Math.random() * 50) + 25, // 25-75 base libido
        experience: 0,
        kinks: [],
        limits: [],
        fantasies: [],
        skills: {},
        unlockedPositions: ['missionary'],
        unlockedOutfits: ['casual'],
        unlockedToys: [],
        unlockedScenarios: ['bedroom'],
        sexualMilestones: [
          {
            id: 'first_kiss',
            name: 'First Kiss',
            description: 'Share your first kiss together',
            requiredStats: { relationship: 25, trust: 20 },
            rewards: { statBoosts: { wet: 10, relationship: 5 } },
            achieved: false
          },
          {
            id: 'first_intimate_touch',
            name: 'First Intimate Touch',
            description: 'Experience your first intimate moment',
            requiredStats: { relationship: 40, trust: 35, intimacy: 30 },
            rewards: { statBoosts: { wet: 15, intimacy: 10 } },
            achieved: false
          },
          {
            id: 'first_time',
            name: 'First Time Together',
            description: 'Your first complete intimate experience',
            requiredStats: { relationship: 60, trust: 50, intimacy: 45, wet: 70 },
            rewards: { unlocks: ['advanced_positions'], statBoosts: { intimacy: 20, wet: 20 } },
            achieved: false
          }
        ],
        compatibility: {
          overall: 50,
          kinkAlignment: 50,
          stylePreference: 50
        },
        memorableEvents: []
      };
    }

    return character;
  }, []);

  return {
    characters,
    updateRelationshipStats,
    addRelationshipEvent,
    addSexualEvent,
    checkSexualMilestones,
    updateRelationshipStatus,
    getCharacterUnlocks,
    initializeCharacterDynamics
  };
}