import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { getPromptValue } from '@/lib/prompts';
import { Character } from '@/types';
import { FileText } from '@phosphor-icons/react';
import { useState } from 'react';

export function WingmanSettings({ onClose }: { onClose?: () => void }) {
  const { characters, isLoading: charactersLoading } = useHouseFileStorage();
  const [activeTab, setActiveTab] = useState<'prompts' | 'girls' | 'interview'>('prompts');

  // Get current prompts from the Prompt Library
  const wingmanPrompt = getPromptValue('copilot.wingman.systemPrompt');
  const wingmanGreeting = getPromptValue('copilot.wingman.greeting');
  const interviewTemplate = getPromptValue('copilot.interview.template');

  return (
    <div className="p-4 bg-black/90 border border-white/10 rounded-xl w-[min(640px,90vw)] text-sm text-white space-y-4 max-h-[75vh] overflow-y-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Wingman Settings</h2>
          <p className="text-xs text-white/60">View current prompts and character analysis.</p>
        </div>
        {onClose && (
          <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button size="sm" variant={activeTab === 'prompts' ? 'default' : 'outline'} onClick={() => setActiveTab('prompts')}>Current Prompts</Button>
        <Button size="sm" variant={activeTab === 'girls' ? 'default' : 'outline'} onClick={() => setActiveTab('girls')}>Girls</Button>
        <Button size="sm" variant={activeTab === 'interview' ? 'default' : 'outline'} onClick={() => setActiveTab('interview')}>Interview</Button>
      </div>

      {activeTab === 'prompts' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <FileText size={20} className="text-blue-300 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-300">Prompts Are Now Centrally Managed</p>
                <p className="text-xs text-blue-200/80 mt-1">
                  All Wingman prompts (system, greeting, interview) are controlled through the <strong>Prompt Library</strong>.
                  Go to <strong>Settings → Prompts</strong> to customize them.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-white/5 rounded-lg border border-white/10">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Current Wingman System Prompt</p>
              <p className="text-sm text-white/80 whitespace-pre-wrap">{wingmanPrompt}</p>
            </div>

            <div className="p-3 bg-white/5 rounded-lg border border-white/10">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Current Wingman Greeting</p>
              <p className="text-sm text-white/80">{wingmanGreeting}</p>
            </div>

            <div className="p-3 bg-white/5 rounded-lg border border-white/10">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Current Interview Template</p>
              <div className="text-sm text-white/80 whitespace-pre-wrap max-h-48 overflow-y-auto">
                {interviewTemplate}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'girls' && (
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Character Analysis & Suggestions</h3>
            {charactersLoading ? (
              <div className="text-white/60 text-sm">Loading characters…</div>
            ) : (
              <div className="space-y-2">
                <h4 className="font-medium">Characters ({characters.length})</h4>
                {characters.length > 0 ? characters.map((char: Character) => (
                  <div key={char.id} className="border border-white/10 rounded p-3">
                    <div className="font-medium">{char.name}</div>
                    <div className="text-xs text-white/60">
                      Age: {char.age || 'Unknown'} | Personality: {char.personality || 'Unknown'}
                    </div>
                    <div className="text-xs mt-2">
                      <strong>Stats:</strong> Trust {char.progression?.trust || 0}/100, 
                      Affection {char.progression?.affection || 0}/100
                    </div>
                  </div>
                )) : (
                  <div className="text-white/60">No characters loaded.</div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      {activeTab === 'interview' && (
        <div className="space-y-3">
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
            <p className="text-sm font-semibold text-blue-300 mb-2">💡 Edit Interview Template</p>
            <p className="text-xs text-blue-200/80">
              To customize the interview process, edit the <strong>"Character Interview Template"</strong> in the <strong>Prompt Library</strong> (Settings → Prompts).
            </p>
          </div>

          <div className="p-3 bg-white/5 rounded-lg border border-white/10">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Current Interview Template</p>
            <div className="text-sm text-white/80 whitespace-pre-wrap max-h-64 overflow-y-auto">
              {interviewTemplate}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WingmanSettings;
