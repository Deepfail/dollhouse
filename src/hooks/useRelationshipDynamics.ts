// Hook stub - legacy storage removed
export function useRelationshipDynamics() {
  return {
    updateRelationship: () => console.log('Relationship dynamics disabled'),
    getRelationshipScore: () => 0,
    updateRelationshipStats: (characterId: string, stats: any) => console.log('Relationship dynamics disabled', characterId, stats),
    updateSkills: (characterId: string, skills: any) => console.log('Relationship dynamics disabled', characterId, skills),
    addRelationshipEvent: (characterId: string, event: any) => console.log('Relationship dynamics disabled', characterId, event),
    addSexualEvent: (characterId: string, event: any) => console.log('Relationship dynamics disabled', characterId, event),
    updateRelationshipStatus: (characterId: string) => console.log('Relationship dynamics disabled', characterId)
  };
}
