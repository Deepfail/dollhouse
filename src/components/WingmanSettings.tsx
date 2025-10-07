import { Button } from '@/components/ui/button';import { Button } from '@/components/ui/button';

import { ScrollArea } from '@/components/ui/scroll-area';import { ScrollArea } from '@/components/ui/scroll-area';

import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';

import { getPromptValue } from '@/lib/prompts';import { getPromptValue } from '@/lib/prompts';

import { Character } from '@/types';import { Character } from '@/types';

import { FileText } from '@phosphor-icons/react';import { FileText } from '@phosphor-icons/react';

import { useState } from 'react';import { useEffect, useState } from 'react';



export function WingmanSettings({ onClose }: { onClose?: () => void }) {export function WingmanSettings({ onClose }: { onClose?: () => void }) {

  const { characters, isLoading: charactersLoading } = useHouseFileStorage();  const { characters, isLoading: charactersLoading } = useHouseFileStorage();

  const [activeTab, setActiveTab] = useState<'prompts' | 'girls' | 'interview'>('prompts');  const [activeTab, setActiveTab] = useState<'prompts' | 'girls' | 'interview'>('prompts');



  // Get current prompts from the Prompt Library  // Get current prompts from the Prompt Library

  const wingmanPrompt = getPromptValue('copilot.wingman.systemPrompt');  const wingmanPrompt = getPromptValue('copilot.wingman.systemPrompt');

  const wingmanGreeting = getPromptValue('copilot.wingman.greeting');  const wingmanGreeting = getPromptValue('copilot.wingman.greeting');

  const interviewTemplate = getPromptValue('copilot.interview.template');  const interviewTemplate = getPromptValue('copilot.interview.template');



  return (  return (

    <div className="p-4 bg-black/90 border border-white/10 rounded-xl w-[min(640px,90vw)] text-sm text-white space-y-4 max-h-[75vh] overflow-y-auto">    <div className="p-4 bg-black/90 border border-white/10 rounded-xl w-[min(640px,90vw)] text-sm text-white space-y-4 max-h-[75vh] overflow-y-auto">

      <div className="flex items-start justify-between gap-4">      <div className="flex items-start justify-between gap-4">

        <div>        <div>

          <h2 className="text-lg font-semibold">Wingman Settings</h2>          <h2 className="text-lg font-semibold">Wingman Settings</h2>

          <p className="text-xs text-white/60">View current prompts and character analysis.</p>          <p className="text-xs text-white/60">View current prompts and character analysis.</p>

        </div>        </div>

        {onClose && (        {onClose && (

          <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>          <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>

        )}        )}

      </div>      </div>



      {/* Tabs */}      {/* Tabs */}

      <div className="flex gap-2">      <div className="flex gap-2">

        <Button size="sm" variant={activeTab === 'prompts' ? 'default' : 'outline'} onClick={() => setActiveTab('prompts')}>Current Prompts</Button>        <Button size="sm" variant={activeTab === 'prompts' ? 'default' : 'outline'} onClick={() => setActiveTab('prompts')}>Current Prompts</Button>

        <Button size="sm" variant={activeTab === 'girls' ? 'default' : 'outline'} onClick={() => setActiveTab('girls')}>Girls</Button>        <Button size="sm" variant={activeTab === 'girls' ? 'default' : 'outline'} onClick={() => setActiveTab('girls')}>Girls</Button>

        <Button size="sm" variant={activeTab === 'interview' ? 'default' : 'outline'} onClick={() => setActiveTab('interview')}>Interview</Button>        <Button size="sm" variant={activeTab === 'interview' ? 'default' : 'outline'} onClick={() => setActiveTab('interview')}>Interview</Button>

      </div>      </div>



      {activeTab === 'prompts' && (      {activeTab === 'prompts' && (

        <div className="space-y-4">        <div className="space-y-4">

          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 space-y-3">          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 space-y-3">

            <div className="flex items-start gap-3">            <div className="flex items-start gap-3">

              <FileText size={20} className="text-blue-300 mt-0.5" />              <FileText size={20} className="text-blue-300 mt-0.5" />

              <div className="flex-1">              <div className="flex-1">

                <p className="text-sm font-semibold text-blue-300">Prompts Are Now Centrally Managed</p>                <p className="text-sm font-semibold text-blue-300">Prompts Are Now Centrally Managed</p>

                <p className="text-xs text-blue-200/80 mt-1">                <p className="text-xs text-blue-200/80 mt-1">

                  All Wingman prompts (system, greeting, interview) are controlled through the <strong>Prompt Library</strong>.                  All Wingman prompts (system, greeting, interview) are controlled through the <strong>Prompt Library</strong>.

                  Go to <strong>Settings → Prompts</strong> to customize them.                  Go to <strong>Settings → Prompts</strong> to customize them.

                </p>                </p>

              </div>              </div>

            </div>            </div>

          </div>          </div>



          <div className="space-y-3">          <div className="space-y-3">

            <div className="p-3 bg-white/5 rounded-lg border border-white/10">            <div className="p-3 bg-white/5 rounded-lg border border-white/10">

              <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Current Wingman System Prompt</p>              <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Current Wingman System Prompt</p>

              <p className="text-sm text-white/80 whitespace-pre-wrap">{wingmanPrompt}</p>              <p className="text-sm text-white/80 whitespace-pre-wrap">{wingmanPrompt}</p>

            </div>            </div>



            <div className="p-3 bg-white/5 rounded-lg border border-white/10">            <div className="p-3 bg-white/5 rounded-lg border border-white/10">

              <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Current Wingman Greeting</p>              <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Current Wingman Greeting</p>

              <p className="text-sm text-white/80">{wingmanGreeting}</p>              <p className="text-sm text-white/80">{wingmanGreeting}</p>

            </div>            </div>



            <div className="p-3 bg-white/5 rounded-lg border border-white/10">            <div className="p-3 bg-white/5 rounded-lg border border-white/10">

              <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Current Interview Template</p>              <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Current Interview Template</p>

              <div className="text-sm text-white/80 whitespace-pre-wrap max-h-48 overflow-y-auto">              <div className="text-sm text-white/80 whitespace-pre-wrap max-h-48 overflow-y-auto">

                {interviewTemplate}                {interviewTemplate}

              </div>              </div>

            </div>            </div>

          </div>          </div>

        </div>        </div>

      )}      )}



      {activeTab === 'girls' && (      {activeTab === 'girls' && (

        <ScrollArea className="max-h-[400px]">        <>

          <div className="space-y-4">          {charactersLoading ? (

            <h3 className="text-sm font-semibold">Character Analysis & Suggestions</h3>            <div className="text-white/60 text-sm">Loading…</div>

            {charactersLoading ? (          ) : (

              <div className="text-white/60 text-sm">Loading characters…</div>            <>

            ) : (              <div className="space-y-2">

              <div className="space-y-2">                <label className="block text-xs font-medium uppercase tracking-wide text-white/60">System Prompt</label>

                <h4 className="font-medium">Characters ({characters.length})</h4>                <Textarea

                {characters.length > 0 ? characters.map((char: Character) => (                  value={systemPrompt}

                  <div key={char.id} className="border border-white/10 rounded p-3">                  onChange={(e) => { setSystemPrompt(e.target.value); setDirty(true); }}

                    <div className="font-medium">{char.name}</div>                  placeholder="Define Wingman's core role and constraints"

                    <div className="text-xs text-white/60">                  className="min-h-[140px] bg-white/5 border-white/10"

                      Age: {char.age || 'Unknown'} | Personality: {char.personality || 'Unknown'}                />

                    </div>                <p className="text-[11px] text-white/50">Keep concise. This becomes the root system message for Wingman.</p>

                    <div className="text-xs mt-2">              </div>

                      <strong>Stats:</strong> Trust {char.progression?.trust || 0}/100, 

                      Affection {char.progression?.affection || 0}/100              <div className="space-y-2">

                    </div>                <label className="block text-xs font-medium uppercase tracking-wide text-white/60">Copilot Greeting</label>

                  </div>                <Textarea

                )) : (                  value={copilotGreeting}

                  <div className="text-white/60">No characters loaded.</div>                  onChange={(e) => { setCopilotGreeting(e.target.value); setDirty(true); }}

                )}                  placeholder="First greeting message Copilot shows in its chat panel"

              </div>                  className="min-h-[80px] bg-white/5 border-white/10"

            )}                />

          </div>                <p className="text-[11px] text-white/50">Used as the first message if the assistant session has no messages yet.</p>

        </ScrollArea>              </div>

      )}

              <div className="space-y-2">

      {activeTab === 'interview' && (                <label className="block text-xs font-medium uppercase tracking-wide text-white/60">Extra Prompt Fragments (one per line)</label>

        <div className="space-y-3">                <Textarea

          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">                  value={extraPromptsRaw}

            <p className="text-sm font-semibold text-blue-300 mb-2">💡 Edit Interview Template</p>                  onChange={(e) => { setExtraPromptsRaw(e.target.value); setDirty(true); }}

            <p className="text-xs text-blue-200/80">                  placeholder={"e.g.\n- Maintain a supportive tone.\n- Provide succinct actionable suggestions."}

              To customize the interview process, edit the <strong>"Character Interview Template"</strong> in the <strong>Prompt Library</strong> (Settings → Prompts).                  className="min-h-[120px] bg-white/5 border-white/10"

            </p>                />

          </div>                <p className="text-[11px] text-white/50">Each non-empty line is appended after the system prompt.</p>

              </div>

          <div className="p-3 bg-white/5 rounded-lg border border-white/10">

            <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Current Interview Template</p>              <div className="flex items-center gap-3 pt-2">

            <div className="text-sm text-white/80 whitespace-pre-wrap max-h-64 overflow-y-auto">                <Button size="sm" onClick={handleSave} disabled={!changed || saving}>{saving ? 'Saving…' : 'Save'}</Button>

              {interviewTemplate}                {changed && <span className="text-[11px] text-amber-400">Unsaved changes</span>}

            </div>              </div>

          </div>            </>

        </div>          )}

      )}        </>

    </div>      )}

  );

}      {activeTab === 'girls' && (

        <ScrollArea className="max-h-[400px]">

export default WingmanSettings;          <div className="space-y-4">

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
