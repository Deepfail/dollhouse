import { AISettings } from '@/components/AISettings';
import { SessionManager } from '@/components/SessionManager';
import { DevDashboard } from '@/components/DevDashboard';
import { Button } from '@/components/ui/button';
import { WingmanSettings } from '@/components/WingmanSettings';
import { Gear, List, Robot, Rocket, Sparkle, X, Bug } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';

// Minimal class merge utility (avoids external dependency / missing file)
function cx(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(' ');
}

interface UniversalToolbarProps {
  className?: string;
  position?: 'top' | 'bottom';
}

// Floating overlay toolbar that sits above the center panel content.
// Provides always-available access to AI Settings and (placeholder) other global actions.
export function UniversalToolbar({ className, position = 'bottom' }: UniversalToolbarProps) {
  const [open, setOpen] = useState(false); // toolbar expanded/collapsed
  // Dev / panels state
  const [devOpen, setDevOpen] = useState(false);
  const [wingmanOpen, setWingmanOpen] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  // Keyboard shortcut: Ctrl/Cmd + Shift + A to open AI settings directly (focus toggles toolbar)
  useEffect(() => {
    type Globalish = {
      addEventListener?: (t: string, cb: (e: unknown) => void) => void;
      removeEventListener?: (t: string, cb: (e: unknown) => void) => void;
      navigator?: { platform?: string };
    };
    const g: Globalish = typeof globalThis !== 'undefined' ? (globalThis as unknown as Globalish) : {};
    if (!g.addEventListener) return;
    const handler = (e: unknown) => {
      const evt = e as { metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean; key?: string; preventDefault?: () => void };
      try {
        const platform = g.navigator?.platform || '';
        const meta = /Mac/i.test(platform);
        if ((meta ? evt.metaKey : evt.ctrlKey) && evt.shiftKey && (evt.key || '').toLowerCase() === 'a') {
          evt.preventDefault?.();
          setOpen(true);
        }
      } catch { /* ignore */ }
    };
    g.addEventListener('keydown', handler);
    return () => { try { g.removeEventListener?.('keydown', handler); } catch { /* ignore */ } };
  }, [open]);

  return (
    <div
      className={cx(
        'pointer-events-none absolute left-1/2 -translate-x-1/2 z-40 flex flex-col items-center',
        position === 'top' ? 'top-2' : 'bottom-2',
        className
      )}
    >
      {/* Collapsed launcher button */}
      {!open && (
        <div className="pointer-events-auto">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setOpen(true)}
            className="bg-[rgba(15,15,15,0.85)] backdrop-blur border border-white/10 text-xs h-8 px-3 flex items-center gap-2 rounded-full shadow-md hover:bg-black/70"
          >
            <Sparkle size={14} /> Controls
          </Button>
        </div>
      )}

      {open && (
        <div className="pointer-events-auto flex flex-col items-stretch gap-2 w-[min(680px,92vw)]">
          <div className="relative bg-[rgba(20,20,20,0.92)] backdrop-blur border border-white/10 rounded-xl shadow-lg p-2 flex items-center gap-2">
            <div className="flex items-center gap-2 flex-1 overflow-x-auto no-scrollbar">
              <AISettings>
                <Button size="sm" variant="outline" className="h-8 text-xs border-white/10 hover:bg-white/10">
                  <Gear size={14} className="mr-1" /> AI
                </Button>
              </AISettings>
              <Button size="sm" variant="outline" className="h-8 text-xs border-white/10 hover:bg-white/10" onClick={() => { setWingmanOpen(true); setDevOpen(false); setDebugOpen(false); }}>
                <Robot size={14} className="mr-1" /> Copilot
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs border-white/10 hover:bg-white/10">
                <Rocket size={14} className="mr-1" /> Action
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs border-white/10 hover:bg-white/10">
                <Sparkle size={14} className="mr-1" /> Boost
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs border-white/10 hover:bg-white/10" onClick={() => { setDevOpen(true); setWingmanOpen(false); setDebugOpen(false); }}>
                <List size={14} className="mr-1" /> Sessions
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs border-white/10 hover:bg-white/10" onClick={() => { setDebugOpen(true); setDevOpen(false); setWingmanOpen(false); }}>
                <Bug size={14} className="mr-1" /> Debug
              </Button>
            </div>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 shrink-0 hover:bg-white/10" aria-label="Close toolbar" onClick={() => setOpen(false)}>
              <X size={14} />
            </Button>
            {devOpen && (
              <div className="absolute left-1/2 -top-3 translate-y-[-100%] -translate-x-1/2 z-50 mb-2">
                <SessionManager />
                <div className="flex justify-end mt-2">
                  <Button size="sm" variant="ghost" onClick={() => setDevOpen(false)}>
                    <X size={14} className="mr-1" /> Close
                  </Button>
                </div>
              </div>
            )}
            {wingmanOpen && (
              <div className="absolute left-1/2 -top-3 translate-y-[-100%] -translate-x-1/2 z-50 mb-2">
                <WingmanSettings onClose={() => setWingmanOpen(false)} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Debug Dashboard */}
      {debugOpen && (
        <DevDashboard onClose={() => setDebugOpen(false)} />
      )}
    </div>
  );
}

export default UniversalToolbar;