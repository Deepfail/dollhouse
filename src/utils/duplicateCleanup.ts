import { logger } from '@/lib/logger';
import { Character, House } from '@/types';

export interface DuplicateCleanupResult {
  removedCount: number;
  keptCount: number;
  duplicateGroups: Array<{
    name: string;
    characters: Character[];
    keptCharacter: Character;
    removedCharacters: Character[];
  }>;
}

/**
 * Identifies and removes duplicate characters from a house, keeping the "best" version
 * Priority order for keeping characters:
 * 1. Character with conversation history
 * 2. Character with memories
 * 3. Character with story chronicle
 * 4. Character with higher progression stats
 * 5. Most recently updated character
 */
export function cleanupDuplicateCharacters(house: House): { cleanedHouse: House; result: DuplicateCleanupResult } {
  const characters = house.characters || [];
  const result: DuplicateCleanupResult = {
    removedCount: 0,
    keptCount: 0,
    duplicateGroups: []
  };

  // Group characters by name (case insensitive)
  const characterGroups = characters.reduce((groups, character) => {
    const name = character.name.toLowerCase();
    if (!groups[name]) {
      groups[name] = [];
    }
    groups[name].push(character);
    return groups;
  }, {} as Record<string, Character[]>);

  // Process each group
  const keptCharacters: Character[] = [];
  const updatedRooms = [...house.rooms];

  Object.entries(characterGroups).forEach(([name, groupCharacters]) => {
    if (groupCharacters.length === 1) {
      // No duplicates, keep the character
      keptCharacters.push(groupCharacters[0]);
      result.keptCount++;
    } else {
      // Multiple characters with same name - keep the best one
  logger.log(`Found ${groupCharacters.length} characters named "${name}"`);
      
      // Score each character to determine which to keep
      const scoredCharacters = groupCharacters.map(char => {
        let score = 0;
        
        // Conversation history (highest priority)
        if (char.conversationHistory && char.conversationHistory.length > 0) {
          score += 1000 + char.conversationHistory.length * 10;
        }
        
        // Memories
        if (char.memories && char.memories.length > 0) {
          score += 500 + char.memories.length * 5;
        }
        
        // Story chronicle
        if (char.progression?.storyChronicle && char.progression.storyChronicle.length > 0) {
          score += 300 + char.progression.storyChronicle.length * 3;
        }
        
        // Progression stats
        if (char.progression) {
          score += (char.progression.affection || 0) + (char.progression.trust || 0) + (char.progression.intimacy || 0);
        }
        
        // Character stats
        if (char.stats) {
          score += (char.stats.love || 0) + (char.stats.happiness || 0);
        }
        
        // Last updated (recent = better)
        if (char.updatedAt) {
          const daysSinceUpdate = Math.floor((Date.now() - new Date(char.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
          score += Math.max(0, 100 - daysSinceUpdate);
        }
        
        return { character: char, score };
      });
      
      // Sort by score (highest first)
      scoredCharacters.sort((a, b) => b.score - a.score);
      
      const keptCharacter = scoredCharacters[0].character;
      const removedCharacters = scoredCharacters.slice(1).map(s => s.character);
      
      keptCharacters.push(keptCharacter);
      result.keptCount++;
      result.removedCount += removedCharacters.length;
      
      result.duplicateGroups.push({
        name: keptCharacter.name,
        characters: groupCharacters,
        keptCharacter,
        removedCharacters
      });
      
      // Remove removed characters from room residents
      removedCharacters.forEach(removedChar => {
        updatedRooms.forEach(room => {
          const index = room.residents.indexOf(removedChar.id);
          if (index > -1) {
            room.residents.splice(index, 1);
            logger.log(`Removed ${removedChar.id} from room ${room.name}`);
          }
        });
      });
      
      logger.log(`Kept character ${keptCharacter.name} (ID: ${keptCharacter.id}, Score: ${scoredCharacters[0].score})`);
      removedCharacters.forEach((char, i) => {
        logger.log(`Removed duplicate ${char.name} (ID: ${char.id}, Score: ${scoredCharacters[i + 1].score})`);
      });
    }
  });

  const cleanedHouse: House = {
    ...house,
    characters: keptCharacters,
    rooms: updatedRooms,
    updatedAt: new Date()
  };

  return { cleanedHouse, result };
}

/**
 * Preview what would be cleaned up without actually doing it
 */
export function previewDuplicateCleanup(house: House): DuplicateCleanupResult {
  const { result } = cleanupDuplicateCharacters(house);
  return result;
}