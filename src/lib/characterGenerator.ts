import { Character, AutoCharacterConfig, AVAILABLE_PERSONALITIES, AVAILABLE_ROLES, AVAILABLE_TRAITS } from '@/types';

const CHARACTER_THEMES = {
  fantasy: {
    names: ['Aria', 'Zephyr', 'Luna', 'Raven', 'Sage', 'Phoenix', 'Orion', 'Nova'],
    roles: ['mage', 'warrior', 'ranger', 'healer', 'alchemist', 'bard'],
    personalities: ['wise', 'mysterious', 'brave', 'loyal', 'cunning', 'witty', 'gentle', 'caring'],
    appearances: ['flowing robes', 'intricate armor', 'leather gear', 'mystical tattoos', 'glowing eyes']
  },
  'sci-fi': {
    names: ['Zara', 'Kai', 'Neo', 'Cyber', 'Vex', 'Echo', 'Flux', 'Nyx'],
    roles: ['engineer', 'pilot', 'hacker', 'scientist', 'android', 'explorer'],
    personalities: ['logical', 'precise', 'adventurous', 'bold', 'analytical', 'curious', 'rebellious', 'free'],
    appearances: ['cybernetic implants', 'sleek uniform', 'glowing circuits', 'holographic display', 'metallic skin']
  },
  modern: {
    names: ['Alex', 'Sam', 'Riley', 'Jordan', 'Casey', 'Taylor', 'Morgan', 'Avery'],
    roles: ['artist', 'developer', 'chef', 'musician', 'writer', 'athlete'],
    personalities: ['creative', 'passionate', 'calm', 'focused', 'energetic', 'social', 'thoughtful', 'introspective'],
    appearances: ['trendy outfit', 'casual wear', 'artistic style', 'professional attire', 'unique accessories']
  },
  historical: {
    names: ['Elara', 'Marcus', 'Isabella', 'Dmitri', 'Celeste', 'Leonardo', 'Anastasia', 'Victor'],
    roles: ['noble', 'scholar', 'merchant', 'artisan', 'knight', 'diplomat'],
    personalities: ['refined', 'elegant', 'scholarly', 'wise', 'ambitious', 'clever', 'honorable', 'just'],
    appearances: ['elaborate gowns', 'formal attire', 'ornate jewelry', 'rich fabrics', 'period clothing']
  }
};

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

export async function generateRandomCharacter(config: AutoCharacterConfig, house?: any): Promise<Character> {
  // Choose theme
  const theme = getRandomElement(config.themes);
  const themeData = CHARACTER_THEMES[theme as keyof typeof CHARACTER_THEMES] || CHARACTER_THEMES.modern;
  
  // Determine rarity
  const rarity = determineRarity(config.rarityWeights);
  
  // Generate base attributes
  const name = getRandomElement(themeData.names);
  const role = getRandomElement([...themeData.roles, ...AVAILABLE_ROLES]);
  const personalityTraits = getRandomElements([...themeData.personalities, ...AVAILABLE_PERSONALITIES], 2);
  const appearance = getRandomElement(themeData.appearances);
  
  // Generate stats based on rarity
  const baseStats = {
    common: { min: 20, max: 50, bonus: 0 },
    rare: { min: 40, max: 70, bonus: 10 },
    legendary: { min: 60, max: 90, bonus: 20 }
  }[rarity];
  
  const stats = {
    relationship: Math.floor(Math.random() * (baseStats.max - baseStats.min)) + baseStats.min,
    wet: Math.floor(Math.random() * 30) + 70, // Base arousal 70-100
    happiness: Math.floor(Math.random() * (baseStats.max - baseStats.min)) + baseStats.min,
    experience: baseStats.bonus * 10,
    level: Math.floor(baseStats.bonus / 10) + 1
  };
  
  // Generate traits and classes
  const traitCount = rarity === 'legendary' ? 4 : rarity === 'rare' ? 3 : 2;
  const traits = getRandomElements(AVAILABLE_TRAITS, traitCount);
  const classes = getRandomElements(CLASSES_POOL, Math.min(2, traitCount));
  
  // Generate AI prompts using LLM
  const characterPrompt = `Create a detailed character profile for a ${theme} character named ${name} who is a ${role}.
They have ${personalityTraits.join(', ')} personality traits and ${appearance}.
Their rarity level is ${rarity}.

Generate:
1. A concise personality description (2-3 sentences)
2. A detailed background story (3-4 sentences)
3. A system prompt for AI roleplay (include their speaking style, mannerisms, and key traits)

Format as JSON with keys: personality, background, systemPrompt`;

  try {
    // Use OpenRouter for character generation
    const apiKey = house?.aiSettings?.apiKey;
    if (!apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Character Creator House'
      },
      body: JSON.stringify({
        model: house?.aiSettings?.model || 'deepseek/deepseek-chat-v3.1',
        messages: [
          {
            role: 'user',
            content: characterPrompt
          }
        ],
        temperature: 0.8,
        max_tokens: 1000
      })
    });

    if (response.ok) {
      const data = await response.json();
      const characterData = data.choices[0]?.message?.content;
      
      if (characterData) {
        let parsedData: any;
        try {
          parsedData = JSON.parse(characterData);
        } catch {
          // If JSON parsing fails, extract data manually
          parsedData = {
            personality: `A ${personalityTraits.join(', ')} ${role} with unique charm.`,
            background: `${name} is a ${rarity} ${role} from the ${theme} realm. They have made their mark through their ${personalityTraits.join(' and ')} nature and distinctive ${appearance}.`,
            systemPrompt: `You are ${name}, a ${personalityTraits.join(', ')} ${role}. Respond in character, showing your ${personalityTraits.join(' and ')} personality through your words and actions.`
          };
        }
        
        const character: Character = {
          id: `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name,
          description: parsedData.background,
          personality: parsedData.personality,
          appearance: `${appearance} - ${theme} style`,
          role,
          personalities: personalityTraits,
          traits,
          classes,
          unlocks: [],
          stats,
          rarity,
          prompts: {
            system: parsedData.systemPrompt,
            personality: parsedData.personality,
            background: parsedData.background
          },
          relationshipDynamics: {
            affection: 50,
            trust: 50,
            intimacy: 0,
            dominance: Math.floor(Math.random() * 100),
            jealousy: Math.floor(Math.random() * 50) + 10,
            loyalty: Math.floor(Math.random() * 50) + 50,
            possessiveness: Math.floor(Math.random() * 40) + 10,
            relationshipStatus: 'stranger',
            bonds: {},
            significantEvents: [],
            userPreferences: {
              likes: [],
              dislikes: [],
              turnOns: [],
              turnOffs: []
            }
          },
          sexualProgression: {
            arousal: Math.floor(Math.random() * 30),
            libido: Math.floor(Math.random() * 50) + 50,
            experience: baseStats.bonus,
            kinks: [],
            limits: [],
            fantasies: [],
            skills: {},
            unlockedPositions: [],
            unlockedOutfits: [],
            unlockedToys: [],
            unlockedScenarios: [],
            sexualMilestones: [],
            compatibility: {
              overall: 50,
              kinkAlignment: 50,
              stylePreference: 50
            },
            memorableEvents: []
          },
          conversationHistory: [],
          memories: [],
          preferences: {},
          relationships: {},
          progression: {
            level: stats.level,
            nextLevelExp: stats.level * 100,
            unlockedFeatures: [],
            achievements: []
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          autoGenerated: true
        };
        
        return character;
      }
    }
    
    throw new Error('OpenRouter API call failed');
  } catch (error) {
    console.error('Failed to generate character with AI, using fallback:', error);
    
    // Fallback character creation
    const character: Character = {
      id: `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description: `${name} is a ${rarity} ${role} from the ${theme} realm. They have made their mark through their ${personalityTraits.join(' and ')} nature and distinctive ${appearance}.`,
      personality: `A ${personalityTraits.join(', ')} ${role} with unique charm.`,
      appearance: `${appearance} - ${theme} style`,
      role,
      personalities: personalityTraits,
      traits,
      classes,
      unlocks: [],
      stats,
      rarity,
      prompts: {
        system: `You are ${name}, a ${personalityTraits.join(', ')} ${role}. Respond in character, showing your ${personalityTraits.join(' and ')} personality through your words and actions.`,
        personality: `A ${personalityTraits.join(', ')} ${role} with unique charm.`,
        background: `${name} is a ${rarity} ${role} from the ${theme} realm.`
      },
      relationshipDynamics: {
        affection: 50,
        trust: 50,
        intimacy: 0,
        dominance: Math.floor(Math.random() * 100),
        jealousy: Math.floor(Math.random() * 50) + 10,
        loyalty: Math.floor(Math.random() * 50) + 50,
        possessiveness: Math.floor(Math.random() * 40) + 10,
        relationshipStatus: 'stranger',
        bonds: {},
        significantEvents: [],
        userPreferences: {
          likes: [],
          dislikes: [],
          turnOns: [],
          turnOffs: []
        }
      },
      sexualProgression: {
        arousal: Math.floor(Math.random() * 30),
        libido: Math.floor(Math.random() * 50) + 50,
        experience: baseStats.bonus,
        kinks: [],
        limits: [],
        fantasies: [],
        skills: {},
        unlockedPositions: [],
        unlockedOutfits: [],
        unlockedToys: [],
        unlockedScenarios: [],
        sexualMilestones: [],
        compatibility: {
          overall: 50,
          kinkAlignment: 50,
          stylePreference: 50
        },
        memorableEvents: []
      },
      conversationHistory: [],
      memories: [],
      preferences: {},
      relationships: {},
      progression: {
        level: stats.level,
        nextLevelExp: stats.level * 100,
        unlockedFeatures: [],
        achievements: []
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      autoGenerated: true
    };
    
    return character;
  }
}

export async function generateCharactersByTheme(theme: string, count: number, house?: any): Promise<Character[]> {
  const characters: Character[] = [];
  const config: AutoCharacterConfig = {
    themes: [theme],
    personalities: AVAILABLE_PERSONALITIES,
    roles: CHARACTER_THEMES[theme as keyof typeof CHARACTER_THEMES]?.roles || ['adventurer'],
    rarityWeights: { common: 60, rare: 30, legendary: 10 }
  };
  
  for (let i = 0; i < count; i++) {
    const character = await generateRandomCharacter(config, house);
    characters.push(character);
  }
  
  return characters;
}