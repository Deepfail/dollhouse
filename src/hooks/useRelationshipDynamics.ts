//import { useKV } from './useLocalKV';src/hooks/useRelationshipDynamics.ts
import { useCallback } from 'react'
import { useSimpleStorage } from './useSimpleStorage';
import { toast } from 'sonner'

// If your alias isn't configured, swap to a relative import:
// import type { Character, RelationshipEvent, SexualEvent, SexualMilestone, UnlockableContent } from '../lib/types'
import type {
  Character,
  RelationshipEvent,
  SexualEvent,
  SexualMilestone,
  UnlockableContent,
} from '@/types'

type Dyn = NonNullable<Character['relationshipDynamics']>
type Stats = NonNullable<Character['stats']>

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n))

function ensureDynamics(input: Character['relationshipDynamics']): Dyn {
  const d: any = input ?? {}
  return {
    affection: d.affection ?? 0,
    trust: d.trust ?? 0,
    intimacy: d.intimacy ?? 0,
    dominance: d.dominance ?? 50,
    jealousy: d.jealousy ?? 0,
    loyalty: d.loyalty ?? 0,
    possessiveness: d.possessiveness ?? 0,
    relationshipStatus: d.relationshipStatus ?? ('stranger' as Dyn['relationshipStatus']),
    bonds: d.bonds ?? {},
    significantEvents: Array.isArray(d.significantEvents) ? d.significantEvents : [],
    userPreferences: d.userPreferences ?? {
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
    relationship: clamp(s.relationship ?? 0),
    happiness: clamp(s.happiness ?? 50),
    wet: clamp(s.wet ?? 0),
    experience: s.experience ?? 0,
    level: s.level ?? 1
  }
}

export function useRelationshipDynamics() {
  const [characters, setCharacters] = useSimpleStorage<Character[]>('characters', [])
  const [unlockableContent] = useSimpleStorage<UnlockableContent[]>('unlockable-content', [])

  /** Update high-level dynamics + basic stats in one go (all fields optional) */
  const updateRelationshipStats = useCallback(
    (
      characterId: string,
      updates: Partial<
        Pick<
          Dyn & Stats,
          | 'affection'
          | 'trust'
          | 'dominance'
          | 'relationship'
          | 'happiness'
          | 'wet'
          | 'experience'
        >
      >
    ) => {
      setCharacters((current) =>
        current.map((c) => {
          if (c.id !== characterId) return c
          const updated: Character = { ...c }
          const dyn = ensureDynamics(updated.relationshipDynamics)
          const stats = ensureStats(updated.stats)

          if (updates.affection !== undefined) dyn.affection = clamp(updates.affection)
          if (updates.trust !== undefined) dyn.trust = clamp(updates.trust)
          if (updates.dominance !== undefined) dyn.dominance = clamp(updates.dominance)
          // submissiveness property removed

          if (updates.relationship !== undefined) stats.relationship = clamp(updates.relationship)
          if (updates.happiness !== undefined) stats.happiness = clamp(updates.happiness)
          if (updates.wet !== undefined) stats.wet = clamp(updates.wet)
          // Note: intimacy is in relationshipDynamics, not stats
          if (updates.experience !== undefined) stats.experience = Math.max(0, updates.experience)

          ;(updated as any).relationshipDynamics = dyn
          ;(updated as any).stats = stats
          ;(updated as any).updatedAt = new Date()
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
          const dyn = ensureDynamics(updated.relationshipDynamics)
          const stats = ensureStats(updated.stats)

          const newEvent: RelationshipEvent = {
            id: `rel_${Date.now()}`,
            timestamp: new Date(),
            ...event,
          }

          // store on dynamics.events (fallback if your type stores elsewhere)
          ;(dyn as any).events = [...(dyn as any).events, newEvent]

          // simple heuristic bumps (tune as needed)
          if ((event as any).type === 'trust_gain') dyn.trust = clamp(dyn.trust + 5)
          if ((event as any).type === 'affection_gain') dyn.affection = clamp(dyn.affection + 5)
          if ((event as any).type === 'intimate') updated.relationshipDynamics.intimacy = clamp(updated.relationshipDynamics.intimacy + 10)

          ;(updated as any).relationshipDynamics = dyn
          ;(updated as any).stats = stats
          ;(updated as any).updatedAt = new Date()
          return updated
        })
      )
    },
    [setCharacters]
  )

  /** Append a sexual event; initialize sexualProgression if missing */
  const addSexualEvent = useCallback(
    (characterId: string, event: Omit<SexualEvent, 'id' | 'timestamp'>) => {
      setCharacters((current) =>
        current.map((c) => {
          if (c.id !== characterId) return c
          const updated: any = { ...c }

          updated.sexualProgression = updated.sexualProgression ?? {
            events: [] as SexualEvent[],
            sexualMilestones: [] as SexualMilestone[],
            unlockedFeatures: [] as string[],
            achievements: [] as string[],
          }

          const newEvent: SexualEvent = {
            id: `sex_${Date.now()}`,
            timestamp: new Date(),
            ...event,
          }

          updated.sexualProgression.events = [
            ...(updated.sexualProgression.events ?? []),
            newEvent,
          ]

          // light stat nudge
          const stats = ensureStats(updated.stats)
          updated.relationshipDynamics.intimacy = clamp(updated.relationshipDynamics.intimacy + 5)
          updated.stats = stats
          updated.updatedAt = new Date()
          return updated as Character
        })
      )
    },
    [setCharacters]
  )

  /** Recompute relationshipStatus from current dynamics/stats */
  const updateRelationshipStatus = useCallback(
    (characterId: string) => {
      setCharacters((current) =>
        current.map((c) => {
          if (c.id !== characterId) return c
          const updated: Character = { ...c }
          const dyn = ensureDynamics(updated.relationshipDynamics)
          const stats = ensureStats(updated.stats)

          const score =
            (dyn.affection + dyn.trust + dyn.intimacy) / 3 // simple average

          let status: Dyn['relationshipStatus'] = 'stranger'
          if (score >= 90) status = 'devoted'
          else if (score >= 75) status = 'lover'
          else if (score >= 55) status = 'close_friend'
          else if (score >= 30) status = 'acquaintance'
          else status = 'stranger'

          dyn.relationshipStatus = status
          ;(updated as any).relationshipDynamics = dyn
          ;(updated as any).updatedAt = new Date()
          return updated
        })
      )
    },
    [setCharacters]
  )

  /** Return unlockables the character qualifies for (very forgiving, shape-agnostic) */
  const getCharacterUnlockables = useCallback(
    (characterId: string): UnlockableContent[] => {
      const character = characters.find((c) => c.id === characterId)
      if (!character) return []
      const dyn = ensureDynamics(character.relationshipDynamics)
      const stats = ensureStats(character.stats)

      return unlockableContent.filter((content: any) => {
        if (content.unlocked) return true
        const req = content.requirements || {}
        if (req.minAffection != null && dyn.affection < req.minAffection) return false
        if (req.minTrust != null && dyn.trust < req.minTrust) return false
        if (req.minIntimacy != null && dyn.intimacy < req.minIntimacy) return false
        if (req.minRelationship != null && stats.relationship < req.minRelationship) return false
        return true
      })
    },
    [characters, unlockableContent]
  )

  /** Initialize dynamics/sexualProgression safely for a character (id or all) */
  const initializeCharacterDynamics = useCallback(
    (character: Character): Character => {
      const updated: any = { ...character }
      updated.relationshipDynamics = ensureDynamics(updated.relationshipDynamics)
      updated.stats = ensureStats(updated.stats)

      updated.sexualProgression = updated.sexualProgression ?? {
        arousal: 0,
        libido: 50,
        experience: 0,
        kinks: [],
        limits: [],
        fantasies: [],
        skills: {},
        unlockedPositions: [],
        unlockedOutfits: [],
        unlockedToys: [],
        unlockedScenarios: [],
        sexualMilestones: [
          {
            id: 'first_kiss',
            name: 'First Kiss',
            description: 'Share your first kiss.',
            achieved: false,
            requiredStats: { relationship: 30, trust: 20 },
            rewards: { statBoosts: { intimacy: 10 } },
          },
          {
            id: 'first_intimate_touch',
            name: 'First Intimate Touch',
            description: 'Experience your first intimate touch.',
            achieved: false,
            requiredStats: { relationship: 50, wet: 30, intimacy: 25 },
            rewards: { statBoosts: { intimacy: 15, wet: 10 } },
          },
          {
            id: 'first_time',
            name: 'First Time',
            description: 'Your first complete intimate experience.',
            achieved: false,
            requiredStats: { relationship: 70, wet: 60, intimacy: 50 },
            rewards: {
              unlocks: ['advanced_positions'],
              statBoosts: { intimacy: 20, wet: 20 },
            },
          },
        ] as SexualMilestone[],
        compatibility: {
          overall: 0,
          kinkAlignment: 0,
          stylePreference: 0
        },
        memorableEvents: []
      }

      updated.updatedAt = new Date()
      return updated as Character
    },
    []
  )

  return {
    updateRelationshipStats,
    addRelationshipEvent,
    addSexualEvent,
    updateRelationshipStatus,
    getCharacterUnlockables,
    initializeCharacterDynamics,
  }
}
