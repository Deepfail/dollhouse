import { legacyStorage } from './legacyStorage';
import { logger } from './logger';

export interface UserPreference {
  id: string;
  category: 'trait' | 'scenario' | 'behavior' | 'cue';
  value: string;
  confidence: number; // 0-1
  source: 'interaction' | 'analysis' | 'manual';
  timestamp: number;
  context?: string; // e.g., session ID or character name
}

export interface AliProfile {
  userId: string; // placeholder, could be 'default'
  preferences: UserPreference[];
  lastAnalyzed: number;
  insights: Record<string, unknown>; // e.g., { dominantTraits: [], preferredScenarios: [] }
}

const STORAGE_KEY = 'ali_user_profile';

class AliProfileService {
  private profile: AliProfile | null = null;

  async loadProfile(): Promise<AliProfile> {
    if (this.profile) return this.profile;

    try {
      const raw = legacyStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.profile = JSON.parse(raw);
        if (this.profile) {
          logger.log('Loaded Ali profile:', this.profile.preferences.length, 'preferences');
        }
      } else {
        this.profile = {
          userId: 'default',
          preferences: [],
          lastAnalyzed: Date.now(),
          insights: {}
        };
        logger.log('Initialized new Ali profile');
      }
    } catch (e) {
      logger.warn('Failed to load Ali profile, using default', e);
      this.profile = {
        userId: 'default',
        preferences: [],
        lastAnalyzed: Date.now(),
        insights: {}
      };
    }
    return this.profile!;
  }

  async saveProfile(profile: AliProfile): Promise<void> {
    try {
      legacyStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      this.profile = profile;
      logger.log('Saved Ali profile');
    } catch (e) {
      logger.error('Failed to save Ali profile', e);
    }
  }

  async addPreference(pref: Omit<UserPreference, 'id' | 'timestamp'>): Promise<void> {
    const profile = await this.loadProfile();
    const newPref: UserPreference = {
      ...pref,
      id: `pref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };
    profile.preferences.push(newPref);
    // Keep only last 1000 preferences to avoid bloat
    if (profile.preferences.length > 1000) {
      profile.preferences = profile.preferences.slice(-1000);
    }
    await this.saveProfile(profile);
  }

  async getPreferences(category?: string, minConfidence = 0): Promise<UserPreference[]> {
    const profile = await this.loadProfile();
    return profile.preferences.filter(p =>
      (!category || p.category === category) && p.confidence >= minConfidence
    );
  }

  async updateInsights(insights: Record<string, unknown>): Promise<void> {
    const profile = await this.loadProfile();
    profile.insights = { ...profile.insights, ...insights };
    profile.lastAnalyzed = Date.now();
    await this.saveProfile(profile);
  }

  async getInsights(): Promise<Record<string, unknown>> {
    const profile = await this.loadProfile();
    return profile.insights;
  }

  async getUserAssessment(): Promise<string> {
    const prefs = await this.getPreferences();
    const insights = await this.getInsights();
    
    const traits = prefs.filter(p => p.category === 'trait').map(p => p.value);
    const scenarios = prefs.filter(p => p.category === 'scenario').map(p => p.value);
    
    return `User prefers: ${traits.join(', ')}. Scenarios: ${scenarios.join(', ')}. Insights: ${JSON.stringify(insights)}`;
  }
}

export const aliProfileService = new AliProfileService();
