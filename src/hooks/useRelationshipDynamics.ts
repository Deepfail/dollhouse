import { useCallback } from 'react';
import { useKV } from '@github/spark/hooks';
import { Character, RelationshipEvent, SexualEvent, SexualMilestone, UnlockableContent } from '@/types';
import { toast } from 'sonner';

export function useRelationshipDynamics() {
  const [characters, setCharacters] = useKV<Character[]>('characters', []);
  const [unlockableContent, setUnlockableContent] = useKV<UnlockableContent[]>('unlockable-content', []);

  // Update relationship stats
    setCharacters(currentCharacters => 
        if (char.id !==
        const updat
        // Update rela
          updatedChar.r
        if (updates.t
        }
          updatedChar.rela
        if (updates.dom
        }
    setCharacters(currentCharacters => 
      currentCharacters.map(char => {
        if (char.id !== characterId) return char;
        
        const updatedChar = { ...char };
        
        // Update relationship dynamics
        if (updates.affection !== undefined) {
          updatedChar.relationshipDynamics.affection = Math.max(0, Math.min(100, updates.affection));
         
        if (updates.trust !== undefined) {
          updatedChar.relationshipDynamics.trust = Math.max(0, Math.min(100, updates.trust));
        }
        if (updates.intimacy !== undefined) {
          updatedChar.relationshipDynamics.intimacy = Math.max(0, Math.min(100, updates.intimacy));
        }
        if (updates.dominance !== undefined) {
          updatedChar.relationshipDynamics.dominance = Math.max(0, Math.min(100, updates.dominance));
        }
    setC
        // Update sexual progression
        if (updates.arousal !== undefined) {
          updatedChar.sexualProgression.arousal = Math.max(0, Math.min(100, updates.arousal));
         
        
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
        
            updatedChar.relationshipDynamic
        return updatedChar;
        
    );
          }

              updatedChar.r
  const addRelationshipEvent = useCallback((characterId: string, event: Omit<RelationshipEvent, 'id' | 'timestamp'>) => {
    setCharacters(currentCharacters =>
      currentCharacters.map(char => {
        if (char.id !== characterId) return char;
        
    toast.success(`Relationship event: ${even
          ...event,
          id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date()
      curr
        
        const newEvent: SexualEvent = {
        updatedChar.relationshipDynamics.significantEvents.push(newEvent);
        
        // Apply stat impacts
        if (event.impact) {
          if (event.impact.affection) {
            updatedChar.relationshipDynamics.affection = Math.max(0, Math.min(100, 
              updatedChar.relationshipDynamics.affection + event.impact.affection));
           
          if (event.impact.trust) {
          });
              updatedChar.relationshipDynamics.trust + event.impact.trust));
      })
          if (event.impact.intimacy) {
            updatedChar.relationshipDynamics.intimacy = Math.max(0, Math.min(100,
              updatedChar.relationshipDynamics.intimacy + event.impact.intimacy));
  // Check 
          if (event.impact.dominance) {
            updatedChar.relationshipDynamics.dominance = Math.max(0, Math.min(100,
              updatedChar.relationshipDynamics.dominance + event.impact.dominance));
          }
        }
        
        updatedChar.updatedAt = new Date();
          if (milestone.ach
      })
      
    
    toast.success(`Relationship event: ${event.description}`);
  }, [setCharacters]);

  // Add sexual event
  const addSexualEvent = useCallback((characterId: string, event: Omit<SexualEvent, 'id' | 'timestamp'>) => {
    setCharacters(currentCharacters =>
      currentCharacters.map(char => {
        if (char.id !== characterId) return char;
        
        const newEvent: SexualEvent = {
            hasNewU
          id: `sexual_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date()
        };
        
        const updatedChar = { ...char };
        updatedChar.sexualProgression.memorableEvents.push(newEvent);
        
        // Handle unlocks
        if (event.unlocks) {
          event.unlocks.forEach(unlock => {
            if (!updatedChar.sexualProgression.unlockedPositions.includes(unlock)) {
              updatedChar.sexualProgression.unlockedPositions.push(unlock);
            }
            }
        }
        
        updatedChar.updatedAt = new Date();
        if (hasNewUnlocks) 
      })
      
    
    toast.success(`Sexual milestone: ${event.description}`);
  }, [setCharacters]);

  // Check and unlock sexual milestones
  const checkSexualMilestones = useCallback((characterId: string) => {
    setCharacters(currentCharacters =>
        const { affection, trust, int
        if (char.id !== characterId) return char;
        
        const updatedChar = { ...char };
        let hasNewUnlocks = false;
        
        updatedChar.sexualProgression.sexualMilestones.forEach(milestone => {
          if (milestone.achieved) return;
          
          // Check if requirements are met
        } else if (avgRelationship >=
          
          if (milestone.requiredStats.relationship && char.stats.relationship < milestone.requiredStats.relationship) {
            requirementsMet = false;
          u
          if (milestone.requiredStats.wet && char.stats.wet < milestone.requiredStats.wet) {
            requirementsMet = false;
      })
          if (milestone.requiredStats.trust && char.relationshipDynamics.trust < milestone.requiredStats.trust) {

          }
          if (milestone.requiredStats.intimacy && char.relationshipDynamics.intimacy < milestone.requiredStats.intimacy) {
            requirementsMet = false;
          }
    return
          if (requirementsMet) {
            milestone.achieved = true;
            milestone.achievedAt = new Date();
      if (content.requirements.we
            
      
            if (milestone.rewards.unlocks) {
              milestone.rewards.unlocks.forEach(unlock => {
                if (!updatedChar.sexualProgression.unlockedPositions.includes(unlock)) {
                  updatedChar.sexualProgression.unlockedPositions.push(unlock);
                }
        affection
            }
        domi
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

            id: 'first_intimate_touch',
  const updateRelationshipStatus = useCallback((characterId: string) => {
    setCharacters(currentCharacters =>
      currentCharacters.map(char => {
        if (char.id !== characterId) return char;
        
        const { affection, trust, intimacy } = char.relationshipDynamics;
        const avgRelationship = (affection + trust + intimacy) / 3;
        
        let newStatus: Character['relationshipDynamics']['relationshipStatus'] = 'stranger';
        
        if (avgRelationship >= 80 && intimacy >= 70) {
          kinkAlignment: 50,
        } else if (avgRelationship >= 60 && intimacy >= 50) {
        memorableEvents: []
        } else if (avgRelationship >= 50 && trust >= 40) {
          newStatus = 'romantic_interest';
        } else if (avgRelationship >= 40) {

        } else if (avgRelationship >= 25) {
          newStatus = 'friend';
        } else if (avgRelationship >= 10) {
    checkSexualMilestones,
        }
    init
        const updatedChar = { ...char };
        if (updatedChar.relationshipDynamics.relationshipStatus !== newStatus) {
          updatedChar.relationshipDynamics.relationshipStatus = newStatus;
          updatedChar.updatedAt = new Date();
          toast.info(`${char.name} is now your ${newStatus.replace('_', ' ')}!`);

        

      })

  }, [setCharacters]);

  // Get character's unlockable content
  const getCharacterUnlocks = useCallback((characterId: string) => {
    const character = characters.find(c => c.id === characterId);

    

      if (content.unlocked) return true;

      // Check requirements
      if (content.requirements.level && character.stats.level < content.requirements.level) return false;
      if (content.requirements.relationship && character.stats.relationship < content.requirements.relationship) return false;
      if (content.requirements.wet && character.stats.wet < content.requirements.wet) return false;
      if (content.requirements.trust && character.relationshipDynamics.trust < content.requirements.trust) return false;
      if (content.requirements.intimacy && character.relationshipDynamics.intimacy < content.requirements.intimacy) return false;

      return false;
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

          likes: [],

          turnOns: [],

        }

    }

    if (!character.sexualProgression) {
      character.sexualProgression = {
        arousal: 0,
        libido: Math.floor(Math.random() * 50) + 25, // 25-75 base libido
        experience: 0,

        limits: [],
        fantasies: [],
        skills: {},

        unlockedOutfits: ['casual'],

        unlockedScenarios: ['bedroom'],
        sexualMilestones: [
          {

            name: 'First Kiss',
            description: 'Share your first kiss together',
            requiredStats: { relationship: 25, trust: 20 },
            rewards: { statBoosts: { wet: 10, relationship: 5 } },
            achieved: false

          {
            id: 'first_intimate_touch',
            name: 'First Intimate Touch',
            description: 'Experience your first intimate moment',
            requiredStats: { relationship: 40, trust: 35, intimacy: 30 },

            achieved: false

          {
            id: 'first_time',
            name: 'First Time Together',

            requiredStats: { relationship: 60, trust: 50, intimacy: 45, wet: 70 },
            rewards: { unlocks: ['advanced_positions'], statBoosts: { intimacy: 20, wet: 20 } },
            achieved: false

        ],

          overall: 50,

          stylePreference: 50

        memorableEvents: []

    }

    return character;



    characters,

    addRelationshipEvent,
    addSexualEvent,
    checkSexualMilestones,
    updateRelationshipStatus,
    getCharacterUnlocks,

  };
