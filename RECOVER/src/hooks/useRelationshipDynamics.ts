import { useCallback } from 'react'
import { useSimpleStorage } from './useSimpleStorage';
import { toast } from 'sonner'

import type {
  Character,
  RelationshipEvent,
  SexualEvent,
  SexualMilestone,
} from '@/types'

type Progression = NonNullable<Character['progression']>
type Stats = NonNullable<Character['stats']>

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n))

function ensureProgression(input: Character['progression']): Progression {
  const p: any = input ?? {}
  return {
    level: p.level ?? 1,
    nextLevelExp: p.nextLevelExp ?? 1000,
    unlockedFeatures: Array.isArray(p.unlockedFeatures) ? p.unlockedFeatures : [],
    achievements: Array.isArray(p.achievements) ? p.achievements : [],
    relationshipStatus: p.relationshipStatus ?? ('stranger' as Progression['relationshipStatus']),
    affection: p.affection ?? 0,
    trust: p.trust ?? 0,
    intimacy: p.intimacy ?? 0,
    dominance: p.dominance ?? 50,
    jealousy: p.jealousy ?? 0,
    possessiveness: p.possessiveness ?? 0,
    sexualExperience: p.sexualExperience ?? 0,
    kinks: Array.isArray(p.kinks) ? p.kinks : [],
    limits: Array.isArray(p.limits) ? p.limits : [],
    fantasies: Array.isArray(p.fantasies) ? p.fantasies : [],
    unlockedPositions: Array.isArray(p.unlockedPositions) ? p.unlockedPositions : [],
    unlockedOutfits: Array.isArray(p.unlockedOutfits) ? p.unlockedOutfits : [],
    unlockedToys: Array.isArray(p.unlockedToys) ? p.unlockedToys : [],
    unlockedScenarios: Array.isArray(p.unlockedScenarios) ? p.unlockedScenarios : [],
    relationshipMilestones: Array.isArray(p.relationshipMilestones) ? p.relationshipMilestones : [],
    sexualMilestones: Array.isArray(p.sexualMilestones) ? p.sexualMilestones : [],
    significantEvents: Array.isArray(p.significantEvents) ? p.significantEvents : [],
    storyChronicle: Array.isArray(p.storyChronicle) ? p.storyChronicle : [],
    currentStoryArc: p.currentStoryArc,
    memorableEvents: Array.isArray(p.memorableEvents) ? p.memorableEvents : [],
    bonds: p.bonds ?? {},
    sexualCompatibility: p.sexualCompatibility ?? {
      overall: 0,
      kinkAlignment: 0,
      stylePreference: 0
    },
    userPreferences: p.userPreferences ?? {
      likes: [],
      dislikes: [],
      turnOns: [],
      turnOffs: []
    }
  }
}

function ensureStats(input: Character['stats']): Stats {
  const s: any = input ?? {}
  return {
    love: clamp(s.love ?? 0),
    happiness: clamp(s.happiness ?? 50),
    wet: clamp(s.wet ?? 0),
    willing: clamp(s.willing ?? 50),
    selfEsteem: clamp(s.selfEsteem ?? 50),
    loyalty: clamp(s.loyalty ?? 50),
    fight: clamp(s.fight ?? 20),
    stamina: clamp(s.stamina ?? 50),
    pain: clamp(s.pain ?? 20),
    experience: s.experience ?? 0,
    level: s.level ?? 1
  }
}

export function useRelationshipDynamics() {
  const [characters, setCharacters] = useSimpleStorage<Character[]>('characters', [])

  /** Update high-level dynamics + basic stats in one go (all fields optional) */
  const updateRelationshipStats = useCallback(
    (
      characterId: string,
      updates: Partial<
        Pick<
          Progression & Stats,
          | 'affection'
          | 'trust'
          | 'dominance'
          | 'love'
          | 'happiness'
          | 'wet'
          | 'willing'
          | 'selfEsteem'
          | 'loyalty'
          | 'fight'
          | 'stamina'
          | 'pain'
          | 'experience'
        >
      >
    ) => {
      setCharacters((current) =>
        current.map((c) => {
          if (c.id !== characterId) return c
          const updated: Character = { ...c }
          const progression = ensureProgression(updated.progression)
          const stats = ensureStats(updated.stats)

          if (updates.affection !== undefined) progression.affection = clamp(updates.affection)
          if (updates.trust !== undefined) progression.trust = clamp(updates.trust)
          if (updates.dominance !== undefined) progression.dominance = clamp(updates.dominance)

          if (updates.love !== undefined) stats.love = clamp(updates.love)
          if (updates.happiness !== undefined) stats.happiness = clamp(updates.happiness)
          if (updates.wet !== undefined) stats.wet = clamp(updates.wet)
          if (updates.willing !== undefined) stats.willing = clamp(updates.willing)
          if (updates.selfEsteem !== undefined) stats.selfEsteem = clamp(updates.selfEsteem)
          if (updates.loyalty !== undefined) stats.loyalty = clamp(updates.loyalty)
          if (updates.fight !== undefined) stats.fight = clamp(updates.fight)
          if (updates.stamina !== undefined) stats.stamina = clamp(updates.stamina)
          if (updates.pain !== undefined) stats.pain = clamp(updates.pain)
          if (updates.experience !== undefined) stats.experience = Math.max(0, updates.experience)

          updated.progression = progression
          updated.stats = stats
          updated.updatedAt = new Date()
          return updated
        })
      )
    },
    [setCharacters]
  )

  /** Append a relationship event and optionally nudge stats */
  const addRelationshipEvent = useCallback(
    (characterId: string, event: Omit<RelationshipEvent, 'id' | 'timestamp'>) => {
      setCharacters((current) =>
        current.map((c) => {
          if (c.id !== characterId) return c
          const updated: Character = { ...c }
          const progression = ensureProgression(updated.progression)
          const stats = ensureStats(updated.stats)

          const newEvent: RelationshipEvent = {
            id: `rel_${Date.now()}`,
            timestamp: new Date(),
            ...event,
          }

          progression.significantEvents = [...progression.significantEvents, newEvent]

          // simple heuristic bumps (tune as needed)
          if ((event as any).type === 'trust_gain') progression.trust = clamp(progression.trust + 5)
          if ((event as any).type === 'affection_gain') progression.affection = clamp(progression.affection + 5)
          if ((event as any).type === 'intimate') progression.intimacy = clamp(progression.intimacy + 10)

          updated.progression = progression
          updated.stats = stats
          updated.updatedAt = new Date()
          return updated
        })
      )
    },
    [setCharacters]
  )

  /** Append a sexual event; initialize progression if missing */
  const addSexualEvent = useCallback(
    (characterId: string, event: Omit<SexualEvent, 'id' | 'timestamp'>) => {
      setCharacters((current) =>
        current.map((c) => {
          if (c.id !== characterId) return c
          const updated: Character = { ...c }
          const progression = ensureProgression(updated.progression)
          const stats = ensureStats(updated.stats)

          const newEvent: SexualEvent = {
            id: `sex_${Date.now()}`,
            timestamp: new Date(),
            ...event,
          }

          progression.memorableEvents = [
            ...progression.memorableEvents,
            newEvent,
          ]

          // light stat nudge
          progression.intimacy = clamp(progression.intimacy + 5)
          updated.progression = progression
          updated.stats = stats
          updated.updatedAt = new Date()
          return updated
        })
      )
    },
    [setCharacters]
  )

  /** Recompute relationshipStatus from current progression/stats */
  const updateRelationshipStatus = useCallback(
    (characterId: string) => {
      setCharacters((current) =>
        current.map((c) => {
          if (c.id !== characterId) return c
          const updated: Character = { ...c }
          const progression = ensureProgression(updated.progression)
          const stats = ensureStats(updated.stats)

          const score =
            (progression.affection + progression.trust + progression.intimacy) / 3 // simple average

          let status: Progression['relationshipStatus'] = 'stranger'
          if (score >= 90) status = 'devoted'
          else if (score >= 75) status = 'lover'
          else if (score >= 55) status = 'close_friend'
          else if (score >= 30) status = 'acquaintance'
          else status = 'stranger'

          progression.relationshipStatus = status
          updated.progression = progression
          updated.updatedAt = new Date()
          return updated
        })
      )
    },
    [setCharacters]
  )

  /** Initialize progression safely for a character */
  const initializeCharacterDynamics = useCallback(
    (character: Character): Character => {
      const updated: Character = { ...character }
      updated.progression = ensureProgression(updated.progression)
      updated.stats = ensureStats(updated.stats)

      // Initialize sexual milestones if not present
      if (updated.progression.sexualMilestones.length === 0) {
        updated.progression.sexualMilestones = [
          {
            id: 'first_kiss',
            name: 'First Kiss',
            description: 'Share your first kiss.',
            achieved: false,
            requiredStats: { love: 30, trust: 20 },
            rewards: { statBoosts: { intimacy: 10 } },
          },
          {
            id: 'first_intimate_touch',
            name: 'First Intimate Touch',
            description: 'Experience your first intimate touch.',
            achieved: false,
            requiredStats: { love: 50, wet: 30, intimacy: 25 },
            rewards: { statBoosts: { intimacy: 15, wet: 10 } },
          },
          {
            id: 'first_time',
            name: 'First Time',
            description: 'Your first complete intimate experience.',
            achieved: false,
            requiredStats: { love: 70, wet: 60, intimacy: 50 },
            rewards: {
              unlocks: ['advanced_positions'],
              statBoosts: { intimacy: 20, wet: 20 },
            },
          },
        ] as SexualMilestone[]
      }

      updated.updatedAt = new Date()
      return updated
    },
    []
  )

  /** Update sexual skills */
  const updateSkills = useCallback(
    (
      characterId: string,
      skillUpdates: Partial<{
        hands: number;
        mouth: number;
        missionary: number;
        doggy: number;
        cowgirl: number;
      }>
    ) => {
      setCharacters((current) =>
        current.map((c) => {
          if (c.id !== characterId) return c
          const updated: Character = { ...c }
          const currentSkills = updated.skills || {
            hands: 0,
            mouth: 0,
            missionary: 0,
            doggy: 0,
            cowgirl: 0
          }

          // Apply skill updates with clamping
          const newSkills = { ...currentSkills }
          if (skillUpdates.hands !== undefined) newSkills.hands = clamp(skillUpdates.hands)
          if (skillUpdates.mouth !== undefined) newSkills.mouth = clamp(skillUpdates.mouth)
          if (skillUpdates.missionary !== undefined) newSkills.missionary = clamp(skillUpdates.missionary)
          if (skillUpdates.doggy !== undefined) newSkills.doggy = clamp(skillUpdates.doggy)
          if (skillUpdates.cowgirl !== undefined) newSkills.cowgirl = clamp(skillUpdates.cowgirl)

          updated.skills = newSkills
          updated.updatedAt = new Date()
          return updated
        })
      )
    },
    [setCharacters]
  )

  return {
    updateRelationshipStats,
    updateSkills,
    addRelationshipEvent,
    addSexualEvent,
    updateRelationshipStatus,
    initializeCharacterDynamics,
  }
}
