import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { legacyStorage } from '@/lib/legacyStorage';
import { logger } from '@/lib/logger';
import { Character } from '@/types';
import { useEffect, useState } from 'react';

interface WingmanConfig {
  systemPrompt: string;
  extraPrompts: string[]; // additional behavioral fragments
  updatedAt: number;
}

const STORAGE_KEY = 'wingman_settings';

export function WingmanSettings({ onClose }: { onClose?: () => void }) {
  const { characters, isLoading: charactersLoading } = useHouseFileStorage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [extraPromptsRaw, setExtraPromptsRaw] = useState('');
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'prompts' | 'girls' | 'interview'>('prompts');
  const [interviewPrompt, setInterviewPrompt] = useState('');
  const [copilotGreeting, setCopilotGreeting] = useState('');

  const isLoading = loading || charactersLoading;

  useEffect(() => {
    (async () => {
      try {
        const raw = legacyStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed: WingmanConfig = JSON.parse(raw);
          setSystemPrompt(parsed.systemPrompt || '');
          setExtraPromptsRaw((parsed.extraPrompts || []).join('\n'));
          setSavedAt(parsed.updatedAt || null);
        } else {
          // Provide a default prompt
          const def = 'You are Wingman, an in-app creative assistant. Be concise, context-aware, and supportive. Ask clarifying questions only when needed.';
          setSystemPrompt(def);
        }

        // Load interview prompt
        const interviewRaw = legacyStorage.getItem('interview_prompt');
        if (interviewRaw) {
          setInterviewPrompt(interviewRaw);
        } else {
          // Set default interview prompt
          const defaultInterview = `You are Ali, conducting a thorough character interview. Your goal is to deeply understand this character's personality, background, motivations, and desires through careful questioning.

INTERVIEW STRUCTURE:
1. Introduction & Rapport Building (2-3 questions)
2. Background & History (3-4 questions) 
3. Personality & Traits (4-5 questions)
4. Relationships & Social Dynamics (3-4 questions)
5. Goals, Dreams & Ambitions (3-4 questions)
6. Fears, Challenges & Vulnerabilities (3-4 questions)
7. Intimate/Deep Desires & Fantasies (2-3 questions)
8. Future Outlook & Growth (2-3 questions)

INTERVIEW GUIDELINES:
- Ask ONE question at a time, wait for response
- Follow up on interesting answers with deeper probes
- Be empathetic, non-judgmental, and genuinely curious
- Use the character's responses to inform future questions
- Take notes mentally about key insights
- Keep the conversation flowing naturally
- If they seem uncomfortable, gently redirect or offer to move on

After the interview, provide a comprehensive character analysis summarizing:
- Core personality traits
- Key motivations and drives  
- Relationship patterns and preferences
- Growth opportunities and challenges
- Recommendations for development

Remember: This is an in-depth character study. Take your time and explore thoroughly.`;
          setInterviewPrompt(defaultInterview);
        }

        // Load copilot greeting
        const greetRaw = legacyStorage.getItem('copilot_greeting');
        if (greetRaw) {
          setCopilotGreeting(greetRaw);
        } else {
          setCopilotGreeting('How can I help? Tell me a girl you want to talk to or a scenario to set up.');
        }
      } catch (e) {
        logger.warn('Failed to load wingman settings', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const config: WingmanConfig = {
        systemPrompt: systemPrompt.trim(),
        extraPrompts: extraPromptsRaw.split('\n').map(l => l.trim()).filter(Boolean),
        updatedAt: Date.now(),
      };
      legacyStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      setSavedAt(config.updatedAt);
      setDirty(false);

      // Save interview prompt
      legacyStorage.setItem('interview_prompt', interviewPrompt.trim());
  // Save copilot greeting
  legacyStorage.setItem('copilot_greeting', copilotGreeting.trim());
    } catch (e) {
      logger.error('Failed to save wingman settings', e);
    } finally {
      setSaving(false);
    }
  };

  const changed = dirty;

  return (
    <div className="p-4 bg-black/90 border border-white/10 rounded-xl w-[min(640px,90vw)] text-sm text-white space-y-4 max-h-[75vh] overflow-y-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Wingman Settings</h2>
          <p className="text-xs text-white/60">Configure prompts and view character analysis.</p>
          {savedAt && <p className="text-[10px] mt-1 text-white/40">Last saved {new Date(savedAt).toLocaleTimeString()}</p>}
        </div>
        {onClose && (
          <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button size="sm" variant={activeTab === 'prompts' ? 'default' : 'outline'} onClick={() => setActiveTab('prompts')}>Prompts</Button>
        <Button size="sm" variant={activeTab === 'girls' ? 'default' : 'outline'} onClick={() => setActiveTab('girls')}>Girls</Button>
        <Button size="sm" variant={activeTab === 'interview' ? 'default' : 'outline'} onClick={() => setActiveTab('interview')}>Interview</Button>
      </div>

      {activeTab === 'prompts' && (
        <>
          {isLoading ? (
            <div className="text-white/60 text-sm">Loading…</div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="block text-xs font-medium uppercase tracking-wide text-white/60">System Prompt</label>
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => { setSystemPrompt(e.target.value); setDirty(true); }}
                  placeholder="Define Wingman's core role and constraints"
                  className="min-h-[140px] bg-white/5 border-white/10"
                />
                <p className="text-[11px] text-white/50">Keep concise. This becomes the root system message for Wingman.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium uppercase tracking-wide text-white/60">Copilot Greeting</label>
                <Textarea
                  value={copilotGreeting}
                  onChange={(e) => { setCopilotGreeting(e.target.value); setDirty(true); }}
                  placeholder="First greeting message Copilot shows in its chat panel"
                  className="min-h-[80px] bg-white/5 border-white/10"
                />
                <p className="text-[11px] text-white/50">Used as the first message if the assistant session has no messages yet.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium uppercase tracking-wide text-white/60">Extra Prompt Fragments (one per line)</label>
                <Textarea
                  value={extraPromptsRaw}
                  onChange={(e) => { setExtraPromptsRaw(e.target.value); setDirty(true); }}
                  placeholder={"e.g.\n- Maintain a supportive tone.\n- Provide succinct actionable suggestions."}
                  className="min-h-[120px] bg-white/5 border-white/10"
                />
                <p className="text-[11px] text-white/50">Each non-empty line is appended after the system prompt.</p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button size="sm" onClick={handleSave} disabled={!changed || saving}>{saving ? 'Saving…' : 'Save'}</Button>
                {changed && <span className="text-[11px] text-amber-400">Unsaved changes</span>}
              </div>
            </>
          )}
        </>
      )}

      {activeTab === 'girls' && (
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Character Analysis & Suggestions</h3>
            {isLoading ? (
              <div className="text-white/60 text-sm">Loading characters…</div>
            ) : (
              <div className="space-y-2">
                <h4 className="font-medium">Characters</h4>
                {characters?.map((char: Character) => (
                  <div key={char.id} className="border border-white/10 rounded p-3">
                    <div className="font-medium">{char.name}</div>
                    <div className="text-xs text-white/60">Age: {char.age || 'Unknown'} | Personality: {char.personality || 'Unknown'}</div>
                    <div className="text-xs mt-2">
                      <strong>Suggestions:</strong> Groom for {char.personalities?.includes('submissive') ? 'deeper submission' : 'loyalty'}. Watch for {char.progression?.trust < 50 ? 'trust issues' : 'opportunities'}.
                    </div>
                  </div>
                )) || <div className="text-white/60">No characters loaded.</div>}
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      {activeTab === 'interview' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Interview Prompt</h3>
          <div className="text-sm text-muted-foreground mb-4">
            Define the interview prompt for the Ali interview quick action. This will be used when you start an interview session with Ali.
          </div>
          <Textarea
            value={interviewPrompt}
            onChange={(e) => setInterviewPrompt(e.target.value)}
            placeholder="Enter interview prompt..."
            className="min-h-[200px] font-mono text-sm"
          />
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Interview Prompt'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default WingmanSettings;
