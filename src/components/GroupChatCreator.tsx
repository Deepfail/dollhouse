import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChat } from '@/hooks/useChat';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import React, { useState } from 'react';

interface GroupChatCreatorProps {
  open: boolean;
  onClose: () => void;
}

interface RoleDraft { role: string; objective: string; }

export const GroupChatCreator: React.FC<GroupChatCreatorProps> = ({ open, onClose }) => {
  const { characters } = useHouseFileStorage();
  const { createGroupSession, switchToSession } = useChat() as unknown as {
    createGroupSession: (ids: string[], roles?: Record<string, { role: string; objective?: string; priority?: 'low' | 'medium' | 'high' }>) => Promise<string>;
    switchToSession: (id: string) => Promise<void>;
  };
  const [selected, setSelected] = useState<string[]>([]);
  const [roles, setRoles] = useState<Record<string, RoleDraft>>({});
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const updateField = (id: string, field: keyof RoleDraft, value: string) => {
    setRoles(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || { role: '', objective: '' }),
        [field]: value
      }
    }));
  };

  const handleCreate = async () => {
    if (selected.length < 2) return;
    setSubmitting(true);
    try {
      const payload: Record<string, { role: string; objective?: string; priority?: 'low' | 'medium' | 'high' }> = {};
      for (const id of selected) {
        const draft = roles[id];
        if (draft?.role) payload[id] = { role: draft.role, objective: draft.objective || undefined, priority: 'medium' };
      }
      const sessionId = await createGroupSession(selected, Object.keys(payload).length ? payload : undefined);
      await switchToSession(sessionId);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl mx-auto bg-[#111] border border-neutral-800 rounded-2xl shadow-xl flex flex-col h-[70vh]">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Create Group Chat</h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" disabled={selected.length < 2 || submitting} onClick={handleCreate}>
              {submitting ? 'Creating…' : 'Start'}
            </Button>
          </div>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <ScrollArea className="w-1/3 border-r border-neutral-800">
            <div className="p-3 space-y-2">
              {characters?.map(c => {
                const active = selected.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggle(c.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left border transition-colors ${active ? 'border-[#ff1372] bg-[#ff1372]/10 text-white' : 'border-neutral-800 hover:bg-neutral-900 text-gray-300'}`}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={c.avatar} />
                      <AvatarFallback>{c.name.slice(0,2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{c.name}</div>
                      <div className="text-[10px] text-gray-500 truncate">{c.role || 'Character'}</div>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${active ? 'bg-[#ff1372]' : 'bg-neutral-700'}`} />
                  </button>
                );
              })}
            </div>
          </ScrollArea>
          <div className="flex-1 p-4">
            <h3 className="text-xs uppercase tracking-wide text-gray-400 mb-3">Roles & Objectives</h3>
            {selected.length === 0 && (
              <div className="text-[11px] text-gray-500">Select at least two characters to define a group.</div>
            )}
            <div className="space-y-4 overflow-y-auto pr-2 max-h-full">
              {selected.map(id => {
                const char = characters?.find(c => c.id === id);
                if (!char) return null;
                const draft = roles[id] || { role: '', objective: '' };
                return (
                  <div key={id} className="border border-neutral-800 rounded-lg p-3 bg-neutral-900/40">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={char.avatar} />
                        <AvatarFallback>{char.name.slice(0,2)}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium text-white truncate">{char.name}</span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] uppercase tracking-wide text-gray-500 block mb-1">Role</label>
                        <Input
                          value={draft.role}
                          onChange={e => updateField(id, 'role', e.target.value)}
                          placeholder="e.g. Secretly protective leader"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wide text-gray-500 block mb-1">Objective (hidden)</label>
                        <Input
                          value={draft.objective}
                          onChange={e => updateField(id, 'objective', e.target.value)}
                          placeholder="e.g. Gain others' trust without revealing past"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="p-3 border-t border-neutral-800 text-[10px] text-gray-500 flex items-center justify-between">
          <span>{selected.length} selected</span>
          <span>Hidden objectives are never revealed directly.</span>
        </div>
      </div>
    </div>
  );
};
