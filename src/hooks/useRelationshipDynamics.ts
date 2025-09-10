// src/hooks/useRelationshipDynamics.ts
import { useCallback } from 'react'
import { useKV } from '@github/spark/hooks'
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
    dominance: d.dominance ?? 0,
    submissiveness: d.submissiveness ?? 0,
    relationshipStatus: d.relationshipStatus ?? ('stranger' as Dyn['relationshipStatus']),
    events: Array.isArray(d.events) ? d.events : [],
  }
}

function ensureStats(input: Character['stats']): Stats {
  const s: any = input ?? {}
  return {
    relationship: clamp(s.relationship ?? 0),
    happiness: clamp(s.happiness ?? 0),
    wet: clamp(s.wet ?? 0),
    experience: s.experience ?? 0,
    intimacy: clamp(s.intimacy ?? 0),
  }
}

export function useRelationshipDynamics() {
  const [characters, setCharacters] = useKV<Character[]>('characters', [])
  const [unlockableContent] = useKV<UnlockableContent[]>('unlockable-content', [])

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
          | 'submissiveness'
          | 'relationship'
          | 'happiness'
          | 'wet'
          | 'intimacy'
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
          if (updates.submissiveness !== undefined)
            dyn.submissiveness = clamp(updates.submissiveness)

          if (updates.relationship !== undefined) stats.relationship = clamp(updates.relationship)
          if (updates.happiness !== undefined) stats.happiness = clamp(updates.happiness)
          if (updates.wet !== undefined) stats.wet = clamp(updates.wet)
          if (updates.intimacy !== undefined) stats.intimacy = clamp(updates.intimacy)
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
          if ((event as any).type === 'intimate') stats.intimacy = clamp(stats.intimacy + 10)

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
          stats.intimacy = clamp(stats.intimacy + 5)
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
            (dyn.affection + dyn.trust + (stats.intimacy ?? 0)) / 3 // simple average

          let status: Dyn['relationshipStatus'] = 'stranger'
          if (score >= 90) status = 'intimate_partner'
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
        if (req.minIntimacy != null && stats.intimacy < req.minIntimacy) return false
        if (req.minRelationship != null && stats.relationship < req.minRelationship) return false
        return true
      })
    },
    [characters, unlockableContent]
  )

  /** Initialize dynamics/sexualProgression safely for a character (id or all) */
  const initializeCharacterDynamics = useCallback(
    (characterId?: string) => {
      setCharacters((current) =>
        current.map((c) => {
          if (characterId && c.id !== characterId) return c
          const updated: any = { ...c }
          updated.relationshipDynamics = ensureDynamics(updated.relationshipDynamics)
          updated.stats = ensureStats(updated.stats)

          updated.sexualProgression = updated.sexualProgression ?? {
            events: [] as SexualEvent[],
            sexualMilestones: [
              {
                id: 'first_kiss',
                description: 'Share your first kiss.',
                achieved: false,
                rewards: { statBoosts: { intimacy: 10 } },
              },
              {
                id: 'first_intimate_touch',
                description: 'Experience your first intimate touch.',
                achieved: false,
                rewards: { statBoosts: { intimacy: 15, happiness: 10 } },
              },
              {
                id: 'first_time',
                description: 'Your first complete intimate experience.',
                achieved: false,
                rewards: {
                  unlocks: ['advanced_positions'],
                  statBoosts: { intimacy: 20, wet: 20 },
                },
              },
            ] as SexualMilestone[],
            unlockedFeatures: [],
            achievements: [],
          }

          updated.updatedAt = new Date()
          return updated as Character
        })
      )
      toast.success('Relationship dynamics initialized')
    },
    [setCharacters]
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
