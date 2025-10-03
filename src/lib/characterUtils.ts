import type { Character } from '@/types';

const generateUniqueId = (): string => `char_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const ensureUniqueCharacter = (incoming: Character, existing: Character[]): Character => {
  const ids = new Set(existing.map((character) => character.id));
  const names = new Set(
    existing
      .map((character) => character.name.trim().toLowerCase())
      .filter(Boolean),
  );

  const result: Character = { ...incoming };

  if (!result.id || ids.has(result.id)) {
    let candidateId = generateUniqueId();
    while (ids.has(candidateId)) {
      candidateId = generateUniqueId();
    }
    result.id = candidateId;
  }

  if (result.name) {
    let baseName = result.name.trim();
    if (!baseName) {
      baseName = 'New Companion';
    }
    let candidateName = baseName;
    let suffix = 2;
    while (names.has(candidateName.toLowerCase())) {
      candidateName = `${baseName} ${suffix}`;
      suffix += 1;
    }
    result.name = candidateName;
  } else {
    let suffix = 2;
    let candidateName = 'New Companion';
    while (names.has(candidateName.toLowerCase())) {
      candidateName = `New Companion ${suffix}`;
      suffix += 1;
    }
    result.name = candidateName;
  }

  result.createdAt = result.createdAt ? new Date(result.createdAt) : new Date();
  result.updatedAt = new Date();

  return result;
};
