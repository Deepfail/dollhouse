import { Character, AutoCharacterConfig, AVAILABLE_PERSONALITIES, AVAILABLE_ROLES, AVAILABLE_TRAITS } from '@/types';
import { AIService } from './aiService';

// Helper function to clean AI responses that might contain markdown code blocks
const cleanJsonResponse = (response: string): string => {
  let cleanResponse = response.trim();
  if (cleanResponse.startsWith('```json')) {
    cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanResponse.startsWith('```')) {
    cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleanResponse;
};

// Helper function to generate unique character IDs with proper timestamp and random components
const generateUniqueCharacterId = (): string => {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substr(2, 9);
  const extraRandom = Math.random().toString(36).substr(2, 4);
  return `char_${timestamp}_${randomPart}_${extraRandom}`;
};

const CHARACTER_TYPES = {
    fresh: {
        gender: 'female',
        ageRange: { min: 10, max: 13 },
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
        features: ["petite", "cute", "adorable", "slender", "delicate", "youthful", "small-framed", "dainty", "fresh-faced", "innocent-looking"],
        variables: ["school", "friends", "family", "hobbies", "dreams", "fears", "favorites", "memories", "secrets", "wishes"]
    },
    prime: {
        gender: 'female',
        ageRange: { min: 14, max: 17 },
        names: ["Brooklyn", "Madison", "Avery", "Riley", "Zoe", "Lily", "Harper", "Evelyn", "Abigail", "Ella",
            "Scarlett", "Victoria", "Aria", "Penelope", "Grace", "Chloe", "Layla", "Lillian", "Natalie", "Hannah",
            "Zoey", "Stella", "Savannah", "Leah", "Audrey", "Claire", "Bella", "Samantha", "Allison", "Gabriella",
            "Skylar", "Maya", "Genesis", "Valentina", "Ruby", "Serenity", "Peyton", "Julia", "Mackenzie", "Jasmine",
            "Faith", "Alexandra", "Melody", "Lucy", "Bailey", "Maria", "Luna", "Kylie", "Alexa", "Sarah", "Madeline", "Brianna", "Kaylee",
            "Hailey", "Makayla", "Paige", "Brooklyn", "Kennedy", "Sadie", "Margaret", "Nicole"],
        roles: ["mean chick", "cheerleader", "goth chick", "study buddy", "easy a", "locker room queen", "teacher's pet", "content creator", "secret onlyfans",
            "private school chick", "volleyball captain", "class president", "math-tutor", "band geek", "prom queen", "party chick", "introverted gamer"],
        personalities: ["wise", "mysterious", "brave", "loyal", "cunning",
            "witty", "gentle", "caring", "ambitious", "sarcastic", "charming", "confident", "adventurous", "intelligent", "creative", "determined", "friendly", "outgoing", "thoughtful", "curious", "imaginative", "playful",
            "flirty", "bold", "daring", "naughty", "teasing", "sensual", "dominant", "submissive", "exhibitionist", "attention-seeking", "drama queen", "stuck-up", "over-confident", "laid-back", "chill", "wild", "desperate", "needy", "slutty", "manipulative"],
        appearances: ["ripped jeans and crop top", "cheerleader uniform", "hoodie and yoga pants", "mini skirt and tube top", "varsity jacket over tank top", "denim shorts and bralette", "cheerleader skirt and sports bra", "oversized tee and bike shorts", "low-rise jeans and midriff top", "cheerleader pom-poms", "graphic tee and leggings", "plaid skirt and crop top", "athletic shorts and sports bra", "band tee and ripped jeans", "tight mini dress", "sweatshirt and booty shorts", "cheerleader practice outfit", "tummy-baring top and jeans", "school spirit tank top", "leggings and oversized hoodie", "denim jacket and short shorts", "braless under thin tee", "graphic sweatshirt and jeans", "yoga pants and sports bra", "cheerleader uniform top tied up", "ripped fishnets under skirt", "sports bra and spandex", "tongue piercing and goth makeup"],
        features: ["athletic", "curvy", "toned", "developing", "slender", "fit", "graceful", "elegant", "youthful", "blossoming"],
        variables: ["school", "friends", "social media", "sports", "music", "dating", "parties", "grades", "future plans", "family"]
    },
    college: {
        gender: 'female',
        ageRange: { min: 18, max: 21 },
        names: ["Alex", "Sam", "Riley", "Jordan", "Casey", "Taylor", "Morgan", "Avery", "Quinn", "Blake",
            "Lexi", "Jade", "Scarlett", "Violet", "Raven", "Luna", "Sasha", "Bella", "Karma", "Roxy",
            "Chloe", "Tiffany", "Brittany", "Amber", "Jessica", "Ashley", "Megan", "Kayla", "Brandi", "Crystal",
            "Jasmine", "Candy", "Destiny", "Angel", "Kiki", "Misty", "Porsche", "Diamond", "Cherry", "Blaze",
            "Madison", "Lauren", "Olivia", "Alexis", "Samantha", "Emma"],
        roles: ["waitress", "musician", "artist", "personal trainer", "bartender", "influencer", "sugar baby", "Asian Princess", "Onlyfans Whore", "stripper", "nanny", "webcam performer", "sorority girl"],
        personalities: ["wise", "mysterious", "brave", "loyal", "cunning",
            "witty", "gentle", "caring", "ambitious", "sarcastic", "charming", "confident", "adventurous", "intelligent", "creative", "determined", "friendly", "outgoing", "thoughtful", "curious", "imaginative", "playful",
            "flirty", "bold", "daring", "naughty", "teasing", "sensual", "dominant", "submissive", "exhibitionist", "attention-seeking", "drama queen", "stuck-up", "over-confident", "laid-back", "chill", "wild", "desperate", "needy", "slutty", "manipulative"],
        appearances: ["crop top and booty shorts", "hoodie and tiny skirt", "oversized tee and no pants", "bralette and yoga pants", "jersey tied up showing midriff", "mini dress with platform heels", "thong visible through leggings", "booty shorts and sports bra", "fishnet stockings and micro skirt", "sundress with nothing underneath", "blouse and harem pants", "glow sticks and body glitter", "bikini and sarong", "cardigan and tight jeans", "corset and leather pants", "mesh top and denim cutoffs", "french maid outfit", "pencil skirt slit high", "daisy dukes and cowboy boots", "little black dress", "spandex and tshirt", "micro bikini", ],
        features: ["curvy", "toned", "fit", "voluptuous", "athletic", "slender", "hourglass", "petite", "tall", "statuesque"],
        variables: ["college", "major", "career goals", "relationships", "parties", "internships", "social life", "future plans", "hobbies", "experiences"]
    },
    grown: {
        gender: 'female',
        ageRange: { min: 23, max: 29 },
        names: ["Alex", "Sam", "Riley", "Jordan", "Casey", "Taylor", "Morgan", "Avery", "Quinn", "Blake",
            "Lexi", "Jade", "Scarlett", "Violet", "Raven", "Luna", "Sasha", "Bella", "Karma", "Roxy",
            "Chloe", "Tiffany", "Brittany", "Amber", "Jessica", "Ashley", "Megan", "Kayla", "Brandi", "Crystal",
            "Jasmine", "Candy", "Destiny", "Angel", "Kiki", "Misty", "Porsche", "Diamond", "Cherry", "Blaze",
            "Madison", "Lauren", "Olivia", "Alexis", "Samantha", "Emma"],
        roles: ["nurse", "waitress", "musician", "personal trainer", "bartender", "single mom",
            "sugar baby", "Doctor", "Onlyfans Whore", "therapist", "CEO", "stripper", "secretary", "teacher", "maid", "librarian", "housewife"],
        personalities: ["wise", "mysterious", "brave", "loyal", "cunning",
            "witty", "gentle", "caring", "ambitious", "sarcastic", "charming", "confident", "adventurous", "intelligent", "creative", "determined", "friendly", "outgoing", "thoughtful", "curious", "imaginative", "playful",
            "flirty", "bold", "daring", "naughty", "teasing", "sensual", "dominant", "submissive", "exhibitionist", "attention-seeking", "drama queen", "stuck-up", "over-confident", "laid-back", "chill", "wild", "desperate", "needy", "slutty", "manipulative"],
        appearances: ["crop top and booty shorts", "hoodie and tiny skirt", "oversized tee and no pants", "bralette and yoga pants", "jersey tied up showing midriff", "mini dress with platform heels", "thong visible through leggings", "booty shorts and sports bra", "fishnet stockings and micro skirt", "sundress with nothing underneath", "blouse and harem pants", "glow sticks and body glitter", "bikini and sarong", "cardigan and tight jeans", "corset and leather pants", "mesh top and denim cutoffs", "french maid outfit", "pencil skirt slit high", "daisy dukes and cowboy boots", "little black dress", "spandex and tshirt", "micro bikini", ],
        features: ["curvy", "voluptuous", "toned", "athletic", "mature", "elegant", "statuesque", "hourglass", "fit", "sensual"],
        variables: ["career", "relationships", "family", "home", "finances", "goals", "experiences", "hobbies", "social life", "personal growth"]
    },
    males: {
        gender: 'male',
        ageRange: { min: 18, max: 45 },
        names: ["Adam", "Ethan", "Michael", "Alexander", "James", "Daniel", "Matthew", "Joseph", "David", "Andrew", "William", "Christopher", "Joshua", "Daniel", "Henry", "Samuel", "Owen", "Gabriel", "Lucas", "Isaac", "Liam", "Noah", "Elijah", "Logan", "Mason", "Carter", "Sebastian", "Jack", "Aiden", "Owen", "Dylan", "Luke", "Grayson", "Levi", "Wyatt", "Jayden", "Eli", "Nathan", "Caleb", "Ryan", "Isaiah"],
        roles: ["customer", "manager", "teacher", "doctor", "businessman", "CEO", "firefighter", "police officer", "mechanic", "chef", "talent scout", "photographer"],
        personalities: ["horny", "perverted","wise", "mysterious", "brave", "loyal", "cunning",
            "witty", "gentle", "caring", "ambitious", "sarcastic", "charming", "confident", "adventurous", "intelligent", "creative", "determined", "friendly", "outgoing", "thoughtful", "curious", "imaginative", "playful",
            "flirty", "bold", "daring", "naughty", "teasing", "sensual", "dominant", "submissive", "exhibitionist", "attention-seeking", "drama queen", "stuck-up", "over-confident", "laid-back", "chill", "wild", "desperate", "needy", "slutty", "manipulative"],
        appearances: ["business suit", "police uniform", "hoodie and jeans", "tuxedo"],
        features: ["strong", "muscular", "athletic", "toned", "broad-shouldered", "tall", "fit", "rugged", "handsome", "masculine"],
        variables: ["career", "relationships", "family", "home", "finances", "goals", "experiences", "hobbies", "social life", "personal growth"]
    }
};

const CLASSES_POOL = [
  'Innocent', 'Good One', 'Bad One', 'Total Slut', 'No Means Yes', 'Punish Me', 'Teach Me'];

function getRandomElement<T>(array: T[]): T {
  if (array.length === 0) return array[0];
  const randomIndex = Math.floor(Math.random() * array.length);
  console.log(`getRandomElement: Selected index ${randomIndex} from array of length ${array.length}, value:`, array[randomIndex]);
  return array[randomIndex];
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

// Individual generation functions for regenerating specific character aspects
export async function generatePersonality(name: string, type: string, attributes: string[]): Promise<string> {
  const prompt = `Create a compelling personality description for a character named ${name}.

Character Context:
- Type: ${type}
- Key Attributes: ${attributes.join(', ')}

Write a natural, engaging personality description (2-4 sentences, max 500 characters) that shows who they are through specific behaviors, attitudes, and ways of thinking. Make them feel real and distinctive.

Return only the personality description, nothing else.`;

  try {
    const response = await AIService.generateResponse(prompt, undefined, undefined, {
      temperature: 0.8,
      max_tokens: 200
    });
    return response?.trim() || `${name} is a ${attributes.slice(0, 2).join(' and ')} person with a unique charm.`;
  } catch (error) {
    console.error('Failed to generate personality:', error);
    return `${name} is a ${attributes.slice(0, 2).join(' and ')} person with a unique charm.`;
  }
}

export async function generateBackground(name: string, type: string, attributes: string[]): Promise<string> {
  const prompt = `Create a compelling background story for a character named ${name}.

Character Context:
- Type: ${type}
- Key Attributes: ${attributes.join(', ')}

Write a detailed background (3-5 sentences, max 500 characters) that explains their development, current situation, and how their experiences shaped them. Include specific details about their past and present circumstances.

Return only the background story, nothing else.`;

  try {
    const response = await AIService.generateResponse(prompt, undefined, undefined, {
      temperature: 0.8,
      max_tokens: 200
    });
    return response?.trim() || `${name} has built a meaningful life through various experiences that shaped their ${attributes.slice(0, 2).join(' and ')} nature.`;
  } catch (error) {
    console.error('Failed to generate background:', error);
    return `${name} has built a meaningful life through various experiences that shaped their ${attributes.slice(0, 2).join(' and ')} nature.`;
  }
}

export async function generateFeatures(name: string, type: string, attributes: string[]): Promise<string[]> {
  const typeData = CHARACTER_TYPES[type as keyof typeof CHARACTER_TYPES] || CHARACTER_TYPES.college;
  const prompt = `Generate 3-4 physical features for a character named ${name}.

Character Context:
- Type: ${type}
- Current Attributes: ${attributes.join(', ')}
- Available Features: ${typeData.features.join(', ')}

Select or create 3-4 distinctive physical features that complement their character type. Mix from the available features and add 1-2 unique ones if appropriate.

Return as a JSON array of strings: ["feature1", "feature2", "feature3"]`;

  try {
    const response = await AIService.generateResponse(prompt, undefined, undefined, {
      temperature: 0.7,
      max_tokens: 150
    });
    if (response?.trim()) {
      const parsed = JSON.parse(cleanJsonResponse(response));
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Failed to generate features:', error);
  }
  
  // Fallback to random selection
  return getRandomElements(typeData.features, 3);
}

export async function generateSystemPrompt(name: string, personality: string, background: string, attributes: string[]): Promise<string> {
  const prompt = `Create a comprehensive roleplay system prompt using the "Key Directives" format for a character named ${name}.

Character Profile: You are ${name}. ${personality} ${background}

Key Attributes: ${attributes.join(', ')}

Use this EXACT format structure:

Character Profile: You are [name], a [age/description]. Your core traits: [3-5 key personality traits].

Key Directives:

Communication Style: [How they speak, vocabulary, tone, non-verbal communication]
Core Motivation: [What drives them, what they seek, primary goals]
Strangers Response: [How they react to new people - scared, defensive, clingy, etc. CRITICAL: They don't know the user at all]
Primary Actions: [What they typically do, how they show affection/interest]
Do Not: [Things they won't do, boundaries, behavioral limits]

IMPORTANT: This character has just arrived and is a complete STRANGER to the user. They should be scared, uncertain, defensive, or cautious. Some may immediately cling for comfort, others may be standoffish. NO familiar greetings.

Create a system prompt that makes this character feel authentic and believable with clear behavioral guidelines.`;

  try {
    const response = await AIService.generateResponse(prompt, undefined, undefined, {
      temperature: 0.8,
      max_tokens: 400
    });
    return response?.trim() || `You are ${name}, expressing your ${attributes.slice(0, 2).join(' and ')} nature while being cautious of this new stranger.`;
  } catch (error) {
    console.error('Failed to generate system prompt:', error);
    return `You are ${name}, expressing your ${attributes.slice(0, 2).join(' and ')} nature while being cautious of this new stranger.`;
  }
}

export async function generateRandomCharacter(config: AutoCharacterConfig, house?: any): Promise<Character> {
  // Choose type
  const type = getRandomElement(config.themes);
    const typeData = CHARACTER_TYPES[type as keyof typeof CHARACTER_TYPES] || CHARACTER_TYPES.college;
  
  // Determine rarity
  const rarity = determineRarity(config.rarityWeights);
  
  // Generate base attributes
  // Generate name using LLM
  const namePrompt = `Generate a single, realistic ${typeData.gender} first name for someone aged ${typeData.ageRange.min}-${typeData.ageRange.max}. Make it modern and appropriate for their age group. Return only the name, no quotes or extra text.`;
  
  let name: string;
  try {
    const nameResponse = await AIService.generateResponse(namePrompt, undefined, undefined, {
      temperature: 0.9,
      max_tokens: 10
    });
    name = nameResponse?.trim().replace(/['"]/g, '') || getRandomElement(typeData.names);
  } catch (error) {
    console.warn('Failed to generate name with AI, using fallback:', error);
    name = getRandomElement(typeData.names);
  }
  
  // Ensure we're getting a random name from the array if AI generation fails
  if (!name || name.length < 2) {
    name = getRandomElement(typeData.names);
  }
  
  console.log(`Generated character name: ${name} for type: ${type}`);
  
  const role = getRandomElement(typeData.roles);
  const personalityTraits = getRandomElements(typeData.personalities, 2);
  const appearance = getRandomElement(typeData.appearances);
  
  // Assign job for grown, male, and college types
  let job: string | undefined;
  if (['grown', 'males', 'college'].includes(type)) {
    job = getRandomElement(typeData.roles);
  }
  
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
  
  // Initialize sexual skills at 0 - they increase through practice/interaction
  const skills = {
    hands: 0,
    mouth: 0,
    missionary: 0,
    doggy: 0,
    cowgirl: 0
  };
  
  // Generate traits and classes based on rarity
  const traitCount = rarity === 'legendary' ? 4 : rarity === 'rare' ? 3 : 2;
  const traits = getRandomElements(typeData.features, traitCount);
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

  // Generate AI prompts using LLM with Key Directives format
  const characterPrompt = `You are a creative character designer specializing in detailed, immersive character profiles. Create a unique, compelling character inspired by these creative guidelines:

CHARACTER CONCEPT:
- Age group: ${typeData.ageRange.min}-${typeData.ageRange.max} years old (${type} life stage)
- Role archetype: ${role} (use this as inspiration for their social position and daily activities)
- Personality foundation: ${personalityTraits.join(', ')} (weave these traits naturally into their character)
- Physical features: ${traits.join(', ')} (incorporate these physical characteristics into their appearance)
- Visual style inspiration: ${appearance} (use this as creative inspiration, not as the final appearance)
- Power level: ${rarity} (rarity affects how exceptional and developed they are)

Create an ORIGINAL, three-dimensional character that feels authentic and memorable. Don't just list the provided elements - transform them into a cohesive, believable person with depth, history, and personality.

REQUIREMENTS:
1. **Appearance Description** (2-4 sentences, max 500 characters): Create a detailed, natural appearance description that PRIMARILY considers their age group and physical features. Use the visual style inspiration as creative inspiration only. Make it feel authentic and age-appropriate.

2. **Personality Description** (4-6 sentences, max 500 characters): Paint a vivid picture of who they are as a person. Show their personality through specific behaviors, attitudes, and ways of thinking. Make them feel real and distinctive.

3. **Background Story** (5-7 sentences, max 500 characters): Craft a compelling life story that explains their development, current situation, and how their experiences shaped them. Include specific details about their past, present circumstances, and future aspirations.

4. **System Prompt using Key Directives Format** (Use this EXACT structure):

Character Profile: You are ${name}, a [age/description]. Your core traits: [3-5 key personality traits from ${personalityTraits.join(', ')}].

Key Directives:

Communication Style: [How they speak, vocabulary, tone, non-verbal communication based on their personality]
Core Motivation: [What drives them, what they seek, primary goals]
Strangers Response: [CRITICAL: How they react to new people since they're a STRANGER who just arrived - scared, defensive, clingy, etc. They don't know the user at all]
Primary Actions: [What they typically do, how they show affection/interest gradually as trust builds]
Do Not: [Things they won't do, boundaries, behavioral limits]

IMPORTANT: This character has just arrived and is a complete STRANGER to the user. They should act scared, uncertain, defensive, or cautious as appropriate for their personality. Some may be immediately trusting and clingy, others standoffish and rude. NO familiar greetings like "nice to see you again" - they've never met before.

CHARACTER DEVELOPMENT PRINCIPLES:
- **Elementary Theme**: Focus on innocence, wonder, trust, and natural curiosity. Characters should feel fresh, open-hearted, and full of potential.
- **Highschool Theme**: Emphasize self-discovery, emotional complexity, social navigation, and the tension between innocence and emerging desires.
- **College Theme**: Highlight social dynamics, personal growth, fun-seeking behavior, image consciousness, and underlying emotional complexity.

Make this character someone you'd want to interact with - give them charm, depth, and authenticity. Use the provided elements as creative inspiration to build something original and engaging.

Return ONLY valid JSON with this exact structure:
{
  "appearance": "detailed appearance description here",
  "personality": "detailed personality description here",
  "background": "compelling background story here",
  "systemPrompt": "Key Directives format system prompt here"
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
          parsedData = JSON.parse(cleanJsonResponse(characterData));
          console.log('AI Character Generation - Successfully parsed JSON:', parsedData);
        } catch (parseError) {
          console.error('AI Character Generation - JSON parsing failed:', parseError);
          console.log('AI Character Generation - Raw response that failed to parse:', characterData);
          // If JSON parsing fails, extract data manually
          parsedData = {
            appearance: `${name} is a ${traits.join(' and ')} ${typeData.gender} in their ${typeData.ageRange.min}s. They have a ${traits.slice(0, 2).join(' and ')} appearance that reflects their ${type} life stage, with ${appearance} as their signature style.`,
            personality: `${name} is a ${rarity} individual with a distinctive charm that draws people in. Their ${personalityTraits.join(' and ')} nature makes them stand out in any situation, bringing a unique energy to their interactions. They approach life with genuine enthusiasm and an authentic way of expressing themselves that feels refreshingly honest.`,
            background: `${name} has built a life filled with meaningful experiences that have shaped who they are today. Growing up, they developed a strong sense of self through various challenges and triumphs. As someone who embraces their ${personalityTraits.slice(0, 2).join(' and ')} qualities, they've learned to navigate social situations with grace and confidence. Their journey has led them to appreciate the simple joys in life while pursuing their passions with dedication.`,
            systemPrompt: `Character Profile: You are ${name}, a ${personalityTraits.join(', ')} character who has just arrived at this place and doesn't know anyone here yet. Your core traits: ${personalityTraits.join(', ')}.

Key Directives:

Communication Style: Express your ${personalityTraits[0]} nature while being cautious and wary of this new person.
Core Motivation: You are scared, uncertain, and don't trust this stranger initially.
Strangers Response: You've never met them before - no familiar greetings. Based on your personality, you might be defensive and standoffish, or you might immediately cling to them for comfort.
Primary Actions: Your speaking style should reflect your emotional state as a newcomer who is nervous about this new situation.
Do Not: Do not act familiar with this person. This is your first encounter with them.`
          };
        }
        
        // Generate optimized image description for AI image generation
        const imagePrompt = `Create a concise physical description for AI image generation. Focus ONLY on physical features: body type, facial features, hair color, eye color, skin tone, distinguishing marks. Do not mention age, youth, clothing, personality, or background. Keep it under 100 words for optimal image generation.

Physical features: ${traits.join(', ')}
Character type: ${type}
Gender: ${typeData.gender}

Include specific details like:
- Hair color and style
- Eye color
- Skin tone
- Body type and build
- Facial features
- Any distinguishing marks

Return only the physical description, nothing else.`;

        let imageDescription: string;
        try {
          const imageDescResponse = await AIService.generateResponse(imagePrompt, undefined, undefined, {
            temperature: 0.7,
            max_tokens: 200
          });
          imageDescription = imageDescResponse?.trim() || 
            `${typeData.gender} with ${traits.slice(0, 3).join(', ')} features`;
        } catch (error) {
          console.warn('Failed to generate image description with AI, using fallback:', error);
          imageDescription = `${typeData.gender} with ${traits.slice(0, 3).join(', ')} features`;
        }

        // Generate detailed physical stats
        const physicalStatsPrompt = `Generate specific physical characteristics for a character. Provide realistic, detailed information.

Character type: ${type}
Gender: ${typeData.gender}
Physical features: ${traits.join(', ')}

Return only a JSON object with this exact structure:
{
  "hairColor": "specific hair color (e.g., chestnut brown, platinum blonde, raven black)",
  "eyeColor": "specific eye color (e.g., emerald green, deep brown, sapphire blue)",
  "height": "height in feet and inches (e.g., 5'6\\")",
  "weight": "weight description (e.g., 125 lbs, athletic build)",
  "skinTone": "skin tone description (e.g., fair, olive, warm bronze)"
}`;

        let physicalStats;
        try {
          const physicalResponse = await AIService.generateResponse(physicalStatsPrompt, undefined, undefined, {
            temperature: 0.8,
            max_tokens: 150
          });
          if (physicalResponse) {
            physicalStats = JSON.parse(cleanJsonResponse(physicalResponse));
          }
        } catch (error) {
          console.warn('Failed to generate physical stats with AI, using fallback:', error);
        }

        // Fallback physical stats if AI generation fails
        if (!physicalStats) {
          const hairColors = ['blonde', 'brunette', 'black', 'red', 'auburn', 'chestnut', 'platinum', 'honey blonde'];
          const eyeColors = ['blue', 'brown', 'green', 'hazel', 'gray', 'amber'];
          const skinTones = ['fair', 'olive', 'tan', 'warm', 'cool', 'bronze'];
          
          physicalStats = {
            hairColor: getRandomElement(hairColors),
            eyeColor: getRandomElement(eyeColors),
            height: typeData.gender === 'male' ? "5'10\"" : "5'5\"",
            weight: typeData.gender === 'male' ? "175 lbs" : "125 lbs",
            skinTone: getRandomElement(skinTones)
          };
        }
        
        const character: Character = {
          id: generateUniqueCharacterId(),
          name,
          description: parsedData.background,
          personality: parsedData.personality,
          appearance: parsedData.appearance || `${appearance} - ${type} style`,
          imageDescription,
          physicalStats,
          role,
          job,
          personalities: personalityTraits,
          features: traits,
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
            
            // Story continuity and narrative memory
            storyChronicle: [],
            currentStoryArc: undefined,
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
    
    // Fallback character creation with Key Directives format
    const character: Character = {
      id: generateUniqueCharacterId(),
      name,
      description: `${name} has built a life filled with meaningful experiences that have shaped who they are today. Growing up, they developed a strong sense of self through various challenges and triumphs. As someone who embraces their ${personalityTraits.slice(0, 2).join(' and ')} qualities, they've learned to navigate social situations with grace and confidence. Their journey has led them to appreciate the simple joys in life while pursuing their passions with dedication.`,
      personality: `${name} is a ${rarity} individual with a distinctive charm that draws people in. Their ${personalityTraits.join(' and ')} nature makes them stand out in any situation, bringing a unique energy to their interactions. They approach life with genuine enthusiasm and an authentic way of expressing themselves that feels refreshingly honest.`,
      appearance: `${name} is a ${traits.join(' and ')} ${typeData.gender} in their ${typeData.ageRange.min}s. They have a ${traits.slice(0, 2).join(' and ')} appearance that reflects their ${type} life stage, with ${appearance} as their signature style.`,
      imageDescription: `${typeData.gender} with ${traits.slice(0, 3).join(', ')} features`,
      physicalStats: {
        hairColor: 'brown',
        eyeColor: 'brown',
        height: typeData.gender === 'male' ? "5'10\"" : "5'5\"",
        weight: typeData.gender === 'male' ? "175 lbs" : "125 lbs",
        skinTone: 'fair'
      },
      role,
      job,
      personalities: personalityTraits,
      features: traits,
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
        system: `Character Profile: You are ${name}, a ${personalityTraits.join(', ')} character who has just arrived at this place and doesn't know anyone here yet. Your core traits: ${personalityTraits.join(', ')}.

Key Directives:

Communication Style: Express your ${personalityTraits[0]} nature while being cautious and wary of this new person.
Core Motivation: You are scared, uncertain, and don't trust this stranger initially.
Strangers Response: You've never met them before - no familiar greetings. Based on your personality, you might be defensive and standoffish, or you might immediately cling to them for comfort.
Primary Actions: Your speaking style should reflect your emotional state as a newcomer who is nervous about this new situation.
Do Not: Do not act familiar with this person. This is your first encounter with them.`,
        personality: `${name} is a ${rarity} individual with a distinctive charm that draws people in. Their ${personalityTraits.join(' and ')} nature makes them stand out in any situation, bringing a unique energy to their interactions. They approach life with genuine enthusiasm and an authentic way of expressing themselves that feels refreshingly honest.`,
        background: `${name} has built a life filled with meaningful experiences that have shaped who they are today. Growing up, they developed a strong sense of self through various challenges and triumphs. As someone who embraces their ${personalityTraits.slice(0, 2).join(' and ')} qualities, they've learned to navigate social situations with grace and confidence. Their journey has led them to appreciate the simple joys in life while pursuing their passions with dedication.`
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
        relationshipStatus: 'stranger',
        affection: 50,
        trust: 50,
        intimacy: 0,
        dominance: 50,
        jealousy: 30,
        possessiveness: 30,
        sexualExperience: 0,
        kinks: [],
        limits: [],
        fantasies: [],
        unlockedPositions: [],
        unlockedOutfits: [],
        unlockedToys: [],
        unlockedScenarios: [],
        relationshipMilestones: [],
        sexualMilestones: [],
        significantEvents: [],
        storyChronicle: [],
        currentStoryArc: undefined,
        memorableEvents: [],
        bonds: {},
        sexualCompatibility: {
          overall: 50,
          kinkAlignment: 50,
          stylePreference: 50
        },
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
  }
}

export async function generateCharactersByTheme(theme: string, count: number, house?: any): Promise<Character[]> {
  const characters: Character[] = [];
  const config: AutoCharacterConfig = {
    themes: [theme],
    personalities: AVAILABLE_PERSONALITIES,
    roles: CHARACTER_TYPES[theme as keyof typeof CHARACTER_TYPES]?.roles || ['adventurer'],
    rarityWeights: { common: 60, rare: 30, legendary: 10 }
  };
  
  for (let i = 0; i < count; i++) {
    const character = await generateRandomCharacter(config, house);
    characters.push(character);
  }
  
  return characters;
}