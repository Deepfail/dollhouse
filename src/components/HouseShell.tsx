import { CopilotNew } from '@/components/CopilotNew';
import { GirlsView } from '@/components/GirlsView';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Buildings, Robot, SlidersHorizontal, Sparkle, UsersThree } from '@phosphor-icons/react';
import { ReactNode, useState } from 'react';

const NAV_TABS: Array<{ id: 'girls' | 'rooms' | 'settings'; label: string; caption: string; icon: ReactNode }> = [
  {
    id: 'girls',
    label: 'Girls',
    caption: 'Focus on the roster and private chats.',
    icon: <UsersThree size={16} />, 
  },
  {
    id: 'rooms',
    label: 'Rooms',
    caption: 'Stage group scenes and nightly events.',
    icon: <Buildings size={16} />,
  },
  {
    id: 'settings',
    label: 'Settings',
    caption: 'Tune the house, AI, and imports.',
    icon: <SlidersHorizontal size={16} />,
  },
];

function PlaceholderCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center text-white/70">
      <div className="rounded-3xl border border-dashed border-white/12 bg-white/5 px-10 py-12 shadow-[0_40px_120px_-60px_rgba(100,115,255,0.35)]">
        <Sparkle size={32} className="mx-auto text-[#ff91d0]" />
        <h2 className="mt-6 text-2xl font-semibold text-white">{title}</h2>
        <p className="mt-3 max-w-sm text-sm text-white/60">{description}</p>
      </div>
    </div>
  );
}

export function HouseShell() {
  const [activeTab, setActiveTab] = useState<'girls' | 'rooms' | 'settings'>('girls');
  const [copilotOpen, setCopilotOpen] = useState(true);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#060410] via-[#0b0a1a] to-[#130820] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -left-1/4 top-[-10%] h-[60vh] w-[60vh] rounded-full bg-[rgba(255,19,114,0.25)] blur-3xl" />
        <div className="absolute right-[-20%] top-1/3 h-[50vh] w-[50vh] rounded-full bg-[rgba(97,108,255,0.22)] blur-3xl" />
      </div>
      <div className="relative z-10 flex h-screen min-h-0">
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
          <header className="flex flex-shrink-0 items-center justify-between gap-6 border-b border-white/5 bg-white/5/10 px-8 py-5 backdrop-blur-xl">
            <div>
              <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">Dollhouse</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">House Command</h1>
              <p className="mt-1 text-xs text-white/55">You own the house, the copilot keeps it humming.</p>
            </div>
            <nav className="flex items-center gap-3">
              {NAV_TABS.map((tab) => {
                const isActive = tab.id === activeTab;
                return (
                  <Button
                    key={tab.id}
                    variant={isActive ? 'default' : 'ghost'}
                    className={`h-16 w-[180px] flex-col items-start justify-center rounded-2xl border border-white/10 px-5 text-left transition-all ${
                      isActive ? 'bg-[#ff1372] text-white shadow-[0_20px_60px_-30px_rgba(255,19,114,0.9)]' : 'text-white/70 hover:border-white/20 hover:bg-white/10'
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      {tab.icon}
                      {tab.label}
                    </span>
                    <span className="mt-1 text-[11px] text-white/60">{tab.caption}</span>
                  </Button>
                );
              })}
            </nav>
          </header>
          <main className="flex-1 min-h-0 overflow-hidden px-8 pb-8 pt-6">
            <div className="h-full w-full rounded-[32px] border border-white/10 bg-white/5/10 p-6 backdrop-blur-xl">
              {activeTab === 'girls' && <GirlsView />}
              {activeTab === 'rooms' && (
                <PlaceholderCard
                  title="Rooms Coming Alive"
                  description="Design rooms that feel like stages. Soon you’ll drop girls into lounges, lounges into drama, and let secret objectives bloom."
                />
              )}
              {activeTab === 'settings' && (
                <PlaceholderCard
                  title="Settings Reimagined"
                  description="We’re carving out a dedicated hub for keys, prompts, and behavior tuning. It’s next on the list after the house flow feels right."
                />
              )}
            </div>
          </main>
        </div>
        <aside
          className={`relative flex h-full min-h-0 flex-col overflow-hidden border-l border-white/10 bg-white/5/15 backdrop-blur-2xl transition-all duration-300 ease-out ${
            copilotOpen ? 'w-[420px]' : 'w-[72px]'
          }`}
        >
          <button
            type="button"
            className="absolute left-[-18px] top-10 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-[#0f0d20] text-white/70 shadow-[0_15px_45px_-25px_rgba(255,19,114,0.8)]"
            onClick={() => setCopilotOpen((open) => !open)}
            aria-label={copilotOpen ? 'Collapse copilot' : 'Expand copilot'}
          >
            <Robot size={18} className={copilotOpen ? '' : 'rotate-180 transition-transform'} />
          </button>
          {copilotOpen ? (
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              <div className="flex flex-shrink-0 items-center justify-between border-b border-white/10 px-6 py-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.35em] text-white/40">Copilot</p>
                  <h2 className="mt-2 text-lg font-semibold text-white">House Manager</h2>
                  <p className="text-[11px] text-white/55">She keeps the schedule, secrets, and quick actions.</p>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden px-4 pb-6 pt-4">
                <div className="flex h-full w-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b0b1b]/95 p-2 shadow-[0_30px_90px_-45px_rgba(255,19,114,0.55)]">
                  <CopilotNew />
                </div>
              </div>
              <Separator className="mx-6 bg-white/10" />
              <div className="px-6 py-4 text-[11px] text-white/45">
                Tip: Use quick actions to spark drama without leaving the main view.
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-between py-8">
              <div className="flex flex-col items-center gap-3 text-xs text-white/60">
                <Robot size={28} className="text-[#ff7cc8]" />
                <span className="rotate-90 uppercase tracking-[0.5em]">Copilot</span>
              </div>
              <div className="text-[10px] text-white/40">Quick actions inside →</div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
