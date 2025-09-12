import { Character, AutoCharacterConfig, AVAILABLE_PERSONALITIES, AVAILABLE_ROLES, AVAILABLE_TRAITS } from '@/types';
import { AIService } from './aiService';

const CHARACTER_THEMES = {
    college: {
        names: ["Alex", "Sam", "Riley", "Jordan", "Casey", "Taylor", "Morgan", "Avery", "Quinn", "Blake",
            "Lexi", "Jade", "Scarlett", "Violet", "Raven", "Luna", "Sasha", "Bella", "Karma", "Roxy",
            "Chloe", "Tiffany", "Brittany", "Amber", "Jessica", "Ashley", "Megan", "Kayla", "Brandi", "Crystal",
            "Jasmine", "Candy", "Destiny", "Angel", "Kiki", "Misty", "Porsche", "Diamond", "Cherry", "Blaze",
            "Madison", "Lauren", "Olivia", "Alexis", "Samantha", "Emma"],
        roles: ["nurse", "waitress", "musician", "writer", "personal trainer", "model", "bartender", "dancer", "influencer",
            "sugar baby", "cam chick", "bikini barista", "bottle service", "VIP hostess", "massage therapist", "party promoter", "lingerie model",
            "college student", "retail worker", "barista", "receptionist", "teacher", "nanny", "webcam performer", "sorority chick", "party chick", "campus slut", "frat house regular", "hookup queen", "dorm slut", "library tease", "bar crawler", "spring breaker", "housewife", "frat party bang bus regular", "library bathroom gloryhole operator", "professor's affair partner", "RA with after-hours services", "study abroad slut", "gangbang queen", "campus bike", "adderall-fueled all-nighter fuckbuddy"],
        personalities: ["party chick", "introverted gamer", "sports competitive", "wise", "mysterious", "brave", "loyal", "cunning",
            "witty", "gentle", "caring", "ambitious", "sarcastic", "charming", "confident", "adventurous", "intelligent", "creative", "determined", "friendly", "outgoing", "thoughtful", "curious", "imaginative", "playful",
            "flirty", "bold", "daring", "naughty", "teasing", "sensual", "dominant", "submissive", "exhibitionist", "attention-seeking", "drama queen", "stuck-up", "over-confident", "laid-back", "chill", "wild", "desperate", "needy", "slutty", "manipulative"],
        appearances: ["crop top and booty shorts", "hoodie and tiny skirt", "oversized tee and no pants", "bralette and yoga pants", "jersey tied up showing midriff", "mini dress with platform heels", "thong visible through leggings", "booty shorts and sports bra", "fishnet stockings and micro skirt", "sundress with nothing underneath", "blouse and harem pants", "glow sticks and body glitter", "bikini and sarong", "cardigan and tight jeans", "corset and leather pants", "mesh top and denim cutoffs", "french maid outfit", "pencil skirt slit high", "daisy dukes and cowboy boots", "little black dress", "spandex and tshirt", "micro bikini", ],
    },
    prime: {
        names: ["Brooklyn", "Madison", "Avery", "Riley", "Zoe", "Lily", "Harper", "Evelyn", "Abigail", "Ella",
            "Scarlett", "Victoria", "Aria", "Penelope", "Grace", "Chloe", "Layla", "Lillian", "Natalie", "Hannah",
            "Zoey", "Stella", "Savannah", "Leah", "Audrey", "Claire", "Bella", "Samantha", "Allison", "Gabriella",
            "Skylar", "Maya", "Genesis", "Valentina", "Ruby", "Serenity", "Peyton", "Julia", "Mackenzie", "Jasmine",
            "Faith", "Alexandra", "Melody", "Lucy", "Bailey", "Maria", "Luna", "Kylie", "Alexa", "Sarah", "Madeline", "Brianna", "Kaylee",
            "Hailey", "Makayla", "Paige", "Brooklyn", "Kennedy", "Sadie", "Margaret", "Nicole"],
        roles: ["mean chick", "cheerleader", "goth chick", "study buddy", "easy a", "locker room queen", "teacher's pet", "content creator", "secret onlyfans",
            "private school chick", "volleyball captain", "class president", "mathtutor", "band geek", "prom queen"],
        personalities: ["party chick", "introverted gamer", "sports competitive", "wise", "mysterious", "brave", "loyal", "cunning",
            "witty", "gentle", "caring", "ambitious", "sarcastic", "charming", "confident", "adventurous", "intelligent", "creative", "determined", "friendly", "outgoing", "thoughtful", "curious", "imaginative", "playful",
            "flirty", "bold", "daring", "naughty", "teasing", "sensual", "dominant", "submissive", "exhibitionist", "attention-seeking", "drama queen", "stuck-up", "over-confident", "laid-back", "chill", "wild", "desperate", "needy", "slutty", "manipulative"],
        appearances: ["ripped jeans and crop top", "cheerleader uniform", "hoodie and yoga pants", "mini skirt and tube top", "varsity jacket over tank top", "denim shorts and bralette", "cheerleader skirt and sports bra", "oversized tee and bike shorts", "low-rise jeans and midriff top", "cheerleader pom-poms", "graphic tee and leggings", "plaid skirt and crop top", "athletic shorts and sports bra", "band tee and ripped jeans", "tight mini dress", "sweatshirt and booty shorts", "cheerleader practice outfit", "tummy-baring top and jeans", "school spirit tank top", "leggings and oversized hoodie", "denim jacket and short shorts", "braless under thin tee", "graphic sweatshirt and jeans", "yoga pants and sports bra", "cheerleader uniform top tied up", "ripped fishnets under skirt", "sports bra and spandex", "tongue piercing and goth makeup"],
    },
    fresh: {
        names: ["Emma", "Olivia", "Ava", "Isabella", "Sophia", "Mia", "Charlotte", "Amelia", "Harper", "Evelyn",
            "Abigail", "Emily", "Ella", "Elizabeth", "Sofia", "Grace", "Lily", "Chloe", "Victoria", "Zoe",
            "Penelope", "Hannah", "Nora", "Lila", "Madison", "Ellie", "Stella", "Natalie", "Leah", "Zoey",
            "Aria", "Bella", "Cara", "Daisy", "Eva", "Fiona", "Gia", "Hazel", "Ivy", "Jade",
            "Ruby", "Luna", "Savannah", "Audrey", "Claire", "Samantha", "Allison", "Gabriella", "Layla", "Lillian",
            "Maya", "Genesis", "Valentina", "Serenity", "Peyton", "Julia", "Mackenzie", "Jasmine", "Faith", "Alexandra",
            "Melody", "Lucy", "Bailey", "Maria", "Kylie", "Alexa", "Sarah", "Madeline", "Brianna", "Kaylee",
            "Hailey", "Makayla", "Paige", "Brooklyn", "Kennedy", "Sadie", "Margaret", "Nicole", "Genesis", "Valentina"],
        roles: ["good one", "bad one", "eager learner", "runaway", "orphan", "teacher's pet"],
        personalities: ["creative", "passionate", "calm", "focused", "energetic", "social", "sweet", "cute", "adorable","thoughtful", "introspective", "innocent", "naughty", "willing", "clumsy", "social", "naive", "curious", "imaginative", "kind", "creative", "brave", "gentle", "playful", "intelligent", "caring", "imaginative", "energetic", "mischievous", "impressionable", "corruptible", "manipulative", "obedient", "submissive", "eager", "attention-seeking", "trusting", "loyal", "affectionate", "shy", "timid", "playful", "cheerful", "optimistic", "friendly", "helpful", "curious", "adventurous", "talkative", "imaginative", "creative"],
        appearances: ["flower dress", "pink tutu", "onsie", "little sundress with training bra", "leotard", "knee socks and loafers", "girlscout camping outfit", "ballet recital costume", "flower dress", "backpack and lunchbox", "pigtails and overalls", "cartoon character pajamas", "frilly dress with bloomers", "school uniform with knee socks", "oversized hoodie as dress", "denim overalls and striped shirt", "rainbow dress and rain boots", "plaid skirt and knee-high socks", "graphic tee and leggings", "pajama set with cartoon prints", "sneakers and colorful socks", "hair bows and bracelets", "jumper dress with blouse", "shorts and tank top", "skirt and crop top", "colorful sundress with sandals"],
    }
};

const CLASSES_POOL = [
  'Innocent', 'Good One', 'Bad One', 'Total Slut', 'No Means Yes', 'Punish Me', 'Teach Me'];

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
    const themeData = CHARACTER_THEMES[theme as keyof typeof CHARACTER_THEMES] || CHARACTER_THEMES.college;
  
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
    love: Math.floor(Math.random() * (baseStats.max - baseStats.min)) + baseStats.min,
    happiness: Math.floor(Math.random() * (baseStats.max - baseStats.min)) + baseStats.min,
    wet: Math.floor(Math.random() * 30) + 70, // Base arousal/wet 70-100 (combines arousal + libido)
    willing: Math.floor(Math.random() * 50) + 25, // Base willingness 25-75
    selfEsteem: Math.floor(Math.random() * 60) + 20, // Base self-esteem 20-80
    loyalty: Math.floor(Math.random() * (baseStats.max - baseStats.min)) + baseStats.min,
    fight: Math.floor(Math.random() * 40) + 10, // Base fight 10-50
    stamina: Math.floor(Math.random() * 50) + 30, // Base stamina 30-80
    pain: Math.floor(Math.random() * 50) + 25, // Base pain tolerance 25-75
    experience: baseStats.bonus * 10,
    level: Math.floor(baseStats.bonus / 10) + 1
  };
  
  // Generate sexual skills based on rarity
  const skillBase = {
    common: { min: 10, max: 40 },
    rare: { min: 30, max: 60 },
    legendary: { min: 50, max: 80 }
  }[rarity];
  
  const skills = {
    hands: Math.floor(Math.random() * (skillBase.max - skillBase.min)) + skillBase.min,
    mouth: Math.floor(Math.random() * (skillBase.max - skillBase.min)) + skillBase.min,
    missionary: Math.floor(Math.random() * (skillBase.max - skillBase.min)) + skillBase.min,
    doggy: Math.floor(Math.random() * (skillBase.max - skillBase.min)) + skillBase.min,
    cowgirl: Math.floor(Math.random() * (skillBase.max - skillBase.min)) + skillBase.min
  };
  
  // Generate traits and classes based on rarity
  const traitCount = rarity === 'legendary' ? 4 : rarity === 'rare' ? 3 : 2;
  const traits = getRandomElements(AVAILABLE_TRAITS, traitCount);
  const classes = getRandomElements(CLASSES_POOL, Math.min(2, traitCount));

  // Rarity-based special abilities and bonuses
  const rarityBonuses = {
    common: {
      specialAbility: null,
      statMultiplier: 1,
      preferredRoom: 'standard'
    },
    rare: {
      specialAbility: getRandomElement(['Enhanced Flirting', 'Mood Boost', 'Memory Retention', 'Quick Learner']),
      statMultiplier: 1.3,
      preferredRoom: 'premium'
    },
    legendary: {
      specialAbility: getRandomElement(['VIP Treatment', 'Exclusive Access', 'Enhanced Sensitivity', 'Perfect Memory', 'Mood Stabilizer']),
      statMultiplier: 1.6,
      preferredRoom: 'vip'
    }
  };

  const characterRarityBonus = rarityBonuses[rarity];

  // Generate AI prompts using LLM
  const characterPrompt = `You are a creative character designer specializing in detailed, immersive character profiles. Create a unique, compelling character inspired by these creative guidelines:

CHARACTER CONCEPT:
- Age group inspiration: ${theme} (use this as a general age/life stage reference for personality development)
- Role archetype: ${role} (use this as inspiration for their social position and daily activities)
- Personality foundation: ${personalityTraits.join(', ')} (weave these traits naturally into their character)
- Visual style inspiration: ${appearance} (incorporate elements of this into their overall aesthetic)
- Power level: ${rarity} (rarity affects how exceptional and developed they are)

Create an ORIGINAL, three-dimensional character that feels authentic and memorable. Don't just list the provided elements - transform them into a cohesive, believable person with depth, history, and personality.

REQUIREMENTS:
1. **Personality Description** (4-6 sentences): Paint a vivid picture of who they are as a person. Show their personality through specific behaviors, attitudes, and ways of thinking. Make them feel real and distinctive.

2. **Background Story** (5-7 sentences): Craft a compelling life story that explains their development, current situation, and how their experiences shaped them. Include specific details about their past, present circumstances, and future aspirations.

3. **System Prompt** (6-8 sentences): Write a comprehensive roleplay prompt that guides how they should behave in conversations. Include their speaking style, mannerisms, behavioral patterns, emotional responses, and how they express their core personality traits.

CHARACTER DEVELOPMENT PRINCIPLES:
- **Elementary Theme**: Focus on innocence, wonder, trust, and natural curiosity. Characters should feel fresh, open-hearted, and full of potential.
- **Highschool Theme**: Emphasize self-discovery, emotional complexity, social navigation, and the tension between innocence and emerging desires.
- **College Theme**: Highlight social dynamics, personal growth, fun-seeking behavior, image consciousness, and underlying emotional complexity.

Make this character someone you'd want to interact with - give them charm, depth, and authenticity. Use the provided elements as creative inspiration to build something original and engaging.

Return ONLY valid JSON with this exact structure:
{
  "personality": "detailed personality description here",
  "background": "compelling background story here", 
  "systemPrompt": "comprehensive system prompt here"
}`;


  try {
    console.log('AI Character Generation - Sending prompt to OpenRouter:', characterPrompt);
    // Use AIService for character generation with optimized parameters for creative character creation
    const characterData = await AIService.generateResponse(characterPrompt, undefined, undefined, {
      temperature: 0.9,
      max_tokens: 1024
    });
      
      if (characterData) {
        console.log('AI Character Generation - Raw response:', characterData);
        let parsedData: any;
        try {
          parsedData = JSON.parse(characterData);
          console.log('AI Character Generation - Successfully parsed JSON:', parsedData);
        } catch (parseError) {
          console.error('AI Character Generation - JSON parsing failed:', parseError);
          console.log('AI Character Generation - Raw response that failed to parse:', characterData);
          // If JSON parsing fails, extract data manually
          parsedData = {
            personality: `${name} is a ${rarity} individual with a distinctive charm that draws people in. Their ${personalityTraits.join(' and ')} nature makes them stand out in any situation, bringing a unique energy to their interactions. They approach life with genuine enthusiasm and an authentic way of expressing themselves that feels refreshingly honest.`,
            background: `${name} has built a life filled with meaningful experiences that have shaped who they are today. Growing up, they developed a strong sense of self through various challenges and triumphs. As someone who embraces their ${personalityTraits.slice(0, 2).join(' and ')} qualities, they've learned to navigate social situations with grace and confidence. Their journey has led them to appreciate the simple joys in life while pursuing their passions with dedication.`,
            systemPrompt: `You are ${name}, a ${rarity} character with ${personalityTraits.join(', ')} qualities that define your personality. Express your ${personalityTraits[0]} nature through your words and actions, showing genuine emotion and authentic responses. Your speaking style should reflect your ${appearance} aesthetic and ${theme} life experiences. Incorporate your personality traits naturally into every response, making your character feel real and distinctive. Respond in character with appropriate enthusiasm, showing your unique charm and perspective on the world.`
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
          stats: {
            ...stats,
            love: Math.floor(stats.love * characterRarityBonus.statMultiplier),
            happiness: Math.floor(stats.happiness * characterRarityBonus.statMultiplier),
            wet: Math.min(100, Math.floor(stats.wet * characterRarityBonus.statMultiplier)),
            willing: Math.floor(stats.willing * characterRarityBonus.statMultiplier),
            selfEsteem: Math.floor(stats.selfEsteem * characterRarityBonus.statMultiplier),
            loyalty: Math.floor(stats.loyalty * characterRarityBonus.statMultiplier),
            fight: Math.floor(stats.fight * characterRarityBonus.statMultiplier),
            pain: Math.floor(stats.pain * characterRarityBonus.statMultiplier)
          },
          skills,
          rarity,
          specialAbility: characterRarityBonus.specialAbility || undefined,
          preferredRoomType: characterRarityBonus.preferredRoom,
          roomId: 'common-room', // Assign to common room by default
          prompts: {
            system: parsedData.systemPrompt,
            personality: parsedData.personality,
            background: parsedData.background
          },
          conversationHistory: [],
          memories: [],
          preferences: {},
          relationships: {},
          progression: {
            level: stats.level,
            nextLevelExp: stats.level * 100,
            unlockedFeatures: [],
            achievements: [],

            // Relationship progression
            relationshipStatus: 'stranger',
            affection: 50,
            trust: 50,
            intimacy: 0,
            dominance: Math.floor(Math.random() * 100),
            jealousy: Math.floor(Math.random() * 50) + 10,
            possessiveness: Math.floor(Math.random() * 40) + 10,

            // Sexual progression
            sexualExperience: baseStats.bonus,
            kinks: [],
            limits: [],
            fantasies: [],
            unlockedPositions: [],
            unlockedOutfits: [],
            unlockedToys: [],
            unlockedScenarios: [],

            // Milestones and events
            relationshipMilestones: [],
            sexualMilestones: [],
            significantEvents: [],
            memorableEvents: [],

            // Special bonds and compatibility
            bonds: {},
            sexualCompatibility: {
              overall: 50,
              kinkAlignment: 50,
              stylePreference: 50
            },

            // User preferences
            userPreferences: {
              likes: [],
              dislikes: [],
              turnOns: [],
              turnOffs: []
            }
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          autoGenerated: true
        };
        
        return character;
      } else {
        throw new Error('Failed to generate character with AI');
      }
  } catch (error) {
    console.error('Failed to generate character with AI, using fallback:', error);
    
    // Fallback character creation
    const character: Character = {
      id: `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description: `${name} has built a life filled with meaningful experiences that have shaped who they are today. Growing up, they developed a strong sense of self through various challenges and triumphs. As someone who embraces their ${personalityTraits.slice(0, 2).join(' and ')} qualities, they've learned to navigate social situations with grace and confidence. Their journey has led them to appreciate the simple joys in life while pursuing their passions with dedication.`,
      personality: `${name} is a ${rarity} individual with a distinctive charm that draws people in. Their ${personalityTraits.join(' and ')} nature makes them stand out in any situation, bringing a unique energy to their interactions. They approach life with genuine enthusiasm and an authentic way of expressing themselves that feels refreshingly honest.`,
      appearance: `${appearance} - ${theme} style`,
      role,
      personalities: personalityTraits,
      traits,
      classes,
      unlocks: [],
      stats: {
        ...stats,
        love: Math.floor(stats.love * characterRarityBonus.statMultiplier),
        happiness: Math.floor(stats.happiness * characterRarityBonus.statMultiplier),
        wet: Math.min(100, Math.floor(stats.wet * characterRarityBonus.statMultiplier)),
        willing: Math.floor(stats.willing * characterRarityBonus.statMultiplier),
        selfEsteem: Math.floor(stats.selfEsteem * characterRarityBonus.statMultiplier),
        loyalty: Math.floor(stats.loyalty * characterRarityBonus.statMultiplier),
        fight: Math.floor(stats.fight * characterRarityBonus.statMultiplier),
        pain: Math.floor(stats.pain * characterRarityBonus.statMultiplier)
      },
      skills,
      rarity,
      specialAbility: characterRarityBonus.specialAbility || undefined,
      preferredRoomType: characterRarityBonus.preferredRoom,
      roomId: 'common-room', // Assign to common room by default
      prompts: {
        system: `You are ${name}, a ${rarity} character with ${personalityTraits.join(', ')} qualities that define your personality. Express your ${personalityTraits[0]} nature through your words and actions, showing genuine emotion and authentic responses. Your speaking style should reflect your ${appearance} aesthetic and ${theme} life experiences. Incorporate your personality traits naturally into every response, making your character feel real and distinctive. Respond in character with appropriate enthusiasm, showing your unique charm and perspective on the world.`,
        personality: `${name} is a ${rarity} individual with a distinctive charm that draws people in. Their ${personalityTraits.join(' and ')} nature makes them stand out in any situation, bringing a unique energy to their interactions. They approach life with genuine enthusiasm and an authentic way of expressing themselves that feels refreshingly honest.`,
        background: `${name} has built a life filled with meaningful experiences that have shaped who they are today. Growing up, they developed a strong sense of self through various challenges and triumphs. As someone who embraces their ${personalityTraits.slice(0, 2).join(' and ')} qualities, they've learned to navigate social situations with grace and confidence. Their journey has led them to appreciate the simple joys in life while pursuing their passions with dedication.`
      },
      relationshipDynamics: {
        affection: 50,
        trust: 50,
        intimacy: 0,
        dominance: Math.floor(Math.random() * 100),
        jealousy: Math.floor(Math.random() * 50) + 10,
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