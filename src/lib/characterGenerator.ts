import { Character, AutoCharacterConfig } from '@/types';

const CHARACTER_THEMES = {
  fantasy: {
    names: ['Aria', 'Zephyr', 'Luna', 'Raven', 'Sage', 'Phoenix', 'Orion', 'Nova'],
    roles: ['Mage', 'Warrior', 'Ranger', 'Healer', 'Alchemist', 'Bard'],
    personalities: ['wise and mysterious', 'brave and loyal', 'cunning and witty', 'gentle and caring'],
    appearances: ['flowing robes', 'intricate armor', 'leather gear', 'mystical tattoos', 'glowing eyes']
  },
  'sci-fi': {
    names: ['Zara', 'Kai', 'Neo', 'Cyber', 'Vex', 'Echo', 'Flux', 'Nyx'],
    roles: ['Engineer', 'Pilot', 'Hacker', 'Scientist', 'Android', 'Explorer'],
    personalities: ['logical and precise', 'adventurous and bold', 'analytical and curious', 'rebellious and free'],
    appearances: ['cybernetic implants', 'sleek uniform', 'glowing circuits', 'holographic display', 'metallic skin']
  },
  modern: {
    names: ['Alex', 'Sam', 'Riley', 'Jordan', 'Casey', 'Taylor', 'Morgan', 'Avery'],
    roles: ['Artist', 'Developer', 'Chef', 'Musician', 'Writer', 'Athlete'],
    personalities: ['creative and passionate', 'calm and focused', 'energetic and social', 'thoughtful and introspective'],
    appearances: ['trendy outfit', 'casual wear', 'artistic style', 'professional attire', 'unique accessories']
  },
  historical: {
    names: ['Elara', 'Marcus', 'Isabella', 'Dmitri', 'Celeste', 'Leonardo', 'Anastasia', 'Victor'],
    roles: ['Noble', 'Scholar', 'Merchant', 'Artisan', 'Knight', 'Diplomat'],
    personalities: ['refined and elegant', 'scholarly and wise', 'ambitious and clever', 'honorable and just'],
    appearances: ['elaborate gowns', 'formal attire', 'ornate jewelry', 'rich fabrics', 'period clothing']
  }
};

const PERSONALITY_TRAITS = [
  'cheerful', 'mysterious', 'playful', 'serious', 'witty', 'gentle', 'bold', 'shy',
  'curious', 'loyal', 'rebellious', 'wise', 'energetic', 'calm', 'artistic', 'logical'
];

const SKILLS_POOL = [
  'Conversation', 'Combat', 'Magic', 'Crafting', 'Music', 'Art', 'Cooking', 'Leadership',
  'Stealth', 'Technology', 'Medicine', 'History', 'Philosophy', 'Athletics', 'Charm', 'Strategy'
];

const CLASSES_POOL = [
  'Novice', 'Apprentice', 'Expert', 'Master', 'Legendary', 'Mystic', 'Elite', 'Prodigy'
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function determineRarity(weights: { common: number; rare: number; legendary: number }): 'common' | 'rare' | 'legendary' {
  const total = weights.common + weights.rare + weights.legendary;
  const random = Math.random() * total;
  
  if (random < weights.common) return 'common';
  if (random < weights.common + weights.rare) return 'rare';
  return 'legendary';
}

export async function generateRandomCharacter(config: AutoCharacterConfig): Promise<Character> {
  // Choose theme
  const theme = getRandomElement(config.themes);
  const themeData = CHARACTER_THEMES[theme as keyof typeof CHARACTER_THEMES] || CHARACTER_THEMES.modern;
  
  // Determine rarity
  const rarity = determineRarity(config.rarityWeights);
  
  // Generate base attributes
  const name = getRandomElement(themeData.names);
  const role = getRandomElement(themeData.roles);
  const personalityTrait = getRandomElement(themeData.personalities);
  const appearance = getRandomElement(themeData.appearances);
  
  // Generate stats based on rarity
  const baseStats = {
    common: { min: 20, max: 50, bonus: 0 },
    rare: { min: 40, max: 70, bonus: 10 },
    legendary: { min: 60, max: 90, bonus: 20 }
  }[rarity];
  
  const stats = {
    relationship: Math.floor(Math.random() * (baseStats.max - baseStats.min)) + baseStats.min,
    energy: 100,
    happiness: Math.floor(Math.random() * (baseStats.max - baseStats.min)) + baseStats.min,
    experience: baseStats.bonus * 10,
    level: Math.floor(baseStats.bonus / 10) + 1
  };
  
  // Generate skills and classes
  const skillCount = rarity === 'legendary' ? 4 : rarity === 'rare' ? 3 : 2;
  const skills = getRandomElements(SKILLS_POOL, skillCount);
  const classes = getRandomElements(CLASSES_POOL, Math.min(2, skillCount));
  
  // Generate AI prompts using LLM
  const characterPrompt = spark.llmPrompt`
    Create a detailed character profile for a ${theme} character named ${name} who is a ${role}.
    They have a ${personalityTrait} personality and ${appearance}.
    Their rarity level is ${rarity}.
    
    Generate:
    1. A concise personality description (2-3 sentences)
    2. A detailed background story (3-4 sentences)
    3. A system prompt for AI roleplay (include their speaking style, mannerisms, and key traits)
    
    Format as JSON with keys: personality, background, systemPrompt
  `;
  
  const characterData = await spark.llm(characterPrompt, 'gpt-4o', true);
  const parsedData = JSON.parse(characterData);
  
  const character: Character = {
    id: `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    description: parsedData.background,
    personality: parsedData.personality,
    appearance: `${appearance} - ${theme} style`,
    role,
    stats,
    skills,
    classes,
    unlocks: [],
    prompts: {
      system: parsedData.systemPrompt,
      personality: parsedData.personality,
      background: parsedData.background
    },
    conversationHistory: [],
    memories: [],
    preferences: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    autoGenerated: true
  };
  
  return character;
}

export async function generateCharactersByTheme(theme: string, count: number): Promise<Character[]> {
  const characters: Character[] = [];
  const config: AutoCharacterConfig = {
    themes: [theme],
    personalities: PERSONALITY_TRAITS,
    roles: CHARACTER_THEMES[theme as keyof typeof CHARACTER_THEMES]?.roles || ['Adventurer'],
    rarityWeights: { common: 60, rare: 30, legendary: 10 }
  };
  
  for (let i = 0; i < count; i++) {
    const character = await generateRandomCharacter(config);
    characters.push(character);
  }
  
  return characters;
}