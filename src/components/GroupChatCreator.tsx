import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChat } from '@/hooks/useChat';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

interface GroupChatCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStarted?: (sessionId: string) => void;
}

export function GroupChatCreator({ open, onOpenChange, onStarted }: GroupChatCreatorProps) {
  const { characters } = useHouseFileStorage();
  const { createSession } = useChat();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [goals, setGoals] = useState<Record<string, { goal: string; priority: 'low'|'medium'|'high' }>>({});
  
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return characters || [];
    return (characters || []).filter(c => (c.name || '').toLowerCase().includes(q));
  }, [characters, query]);

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    setGoals(prev => prev[id] ? prev : { ...prev, [id]: { goal: '', priority: 'medium' } });
  };

  const start = async () => {
    if (selected.length < 2) {
      toast.error('Pick at least two participants');
      return;
    }
    const hiddenGoals: Record<string, { goal: string; priority: 'low'|'medium'|'high' }> = {};
    for (const id of selected) {
      const g = goals[id];
      if (g?.goal?.trim()) hiddenGoals[id] = { goal: g.goal.trim(), priority: g.priority || 'medium' };
    }
    try {
      const sessionId = await createSession('group', selected, { hiddenGoals });
      toast.success('Group chat started');
      onOpenChange(false);
      if (sessionId && onStarted) onStarted(sessionId);
      // reset state for next time
      setQuery('');
      setSelected([]);
      setGoals({});
    } catch (e) {
      console.error(e);
      toast.error('Failed to create group chat');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[900px] max-w-[95vw] bg-[#0f1115] text-white border border-zinc-800">
        <DialogHeader>
          <DialogTitle>Create Group Chat</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          {/* Left: participant picker */}
          <div className="flex flex-col rounded-xl border border-zinc-800 bg-[#151822]">
            <div className="p-3 border-b border-zinc-800">
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search characters..."
                className="bg-black/40 text-white placeholder:text-zinc-500 border-zinc-700"
              />
            </div>
            <ScrollArea className="flex-1 p-2 h-[420px]">
              <div className="space-y-2">
                {filtered.map((c: any) => {
                  const isSel = selected.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggle(c.id)}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg border ${isSel ? 'border-primary/50 bg-primary/10' : 'border-zinc-800 hover:bg-white/5'}`}
                    >
                      <Avatar className="w-8 h-8 border border-zinc-700">
                        <AvatarImage src={c.avatar} alt={c.name} />
                        <AvatarFallback className="bg-zinc-800 text-white text-xs">
                          {(c.name || '?').slice(0,2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium">{c.name}</div>
                        <div className="text-[11px] text-zinc-400">Level {c.stats?.level ?? 1}</div>
                      </div>
                      {isSel && <Badge variant="secondary" className="text-[10px]">Selected</Badge>}
                    </button>
                  );
                })}
                {(filtered.length === 0) && (
                  <div className="text-sm text-zinc-400 p-3">No characters found</div>
                )}
              </div>
            </ScrollArea>
            <div className="p-3 border-t border-zinc-800 text-xs text-zinc-400 flex items-center justify-between">
              <div>{selected.length} selected</div>
              <div className="space-x-2">
                <Button size="sm" variant="outline" onClick={() => setSelected([])}>Clear</Button>
                <Button size="sm" variant="outline" onClick={() => setSelected((characters||[]).map((c:any)=>c.id))}>Select All</Button>
              </div>
            </div>
          </div>

          {/* Right: hidden objectives editor */}
          <div className="flex flex-col rounded-xl border border-zinc-800 bg-[#151822]">
            <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
              <div className="text-sm font-medium">Hidden Objectives</div>
              <div className="text-xs text-zinc-400">Optional — kept secret from the user.</div>
            </div>
            <ScrollArea className="flex-1 p-3 h-[420px]">
              <div className="space-y-3">
                {selected.length === 0 && (
                  <div className="text-sm text-zinc-400">Select participants to set objectives.</div>
                )}
                {selected.map(id => {
                  const c = (characters || []).find((x:any) => x.id === id);
                  const st = goals[id] || { goal: '', priority: 'medium' as const };
                  return (
                    <div key={id} className="p-3 rounded-lg border border-zinc-800 bg-black/20">
                      <div className="flex items-center gap-3 mb-2">
                        <Avatar className="w-8 h-8 border border-zinc-700">
                          <AvatarImage src={c?.avatar} alt={c?.name} />
                          <AvatarFallback className="bg-zinc-800 text-white text-xs">{(c?.name||'?').slice(0,2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="text-sm font-medium">{c?.name || id}</div>
                      </div>
                      <Input
                        value={st.goal}
                        onChange={(e) => setGoals(prev => ({ ...prev, [id]: { ...st, goal: e.target.value } }))}
                        placeholder="e.g., Convince Ava to accept my plan without revealing my intentions"
                        className="bg-black/40 text-white placeholder:text-zinc-500 border-zinc-700"
                      />
                      <div className="flex gap-2 mt-2">
                        {(['low','medium','high'] as const).map(p => (
                          <Button
                            key={p}
                            size="sm"
                            variant={st.priority === p ? 'default' : 'outline'}
                            onClick={() => setGoals(prev => ({ ...prev, [id]: { ...st, priority: p } }))}
                          >
                            {p}
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            <div className="p-3 border-t border-zinc-800 flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={start} disabled={selected.length < 2}>Start Group Chat</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
