import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Character } from '@/types';
import { PencilSimple, Trash } from '@phosphor-icons/react';
import { toast } from 'sonner';

export interface CharacterCardProps {
  character: Character;
  onStartChat: (characterId: string) => void;
  onGift?: (characterId: string) => void;
  onMove?: (characterId: string) => void;
  onEdit?: (character: Character) => void;
  onSaveCharacter?: (characterId: string, updates: Partial<Character>) => Promise<boolean | void>;
  onDelete?: (characterId: string) => void;
  compact?: boolean;
  source?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

const relationshipStatusColor = (
  status: Character['progression']['relationshipStatus'] | undefined,
): string => {
  switch (status) {
    case 'devoted':
      return 'text-rose-400';
    case 'lover':
      return 'text-red-400';
    case 'romantic_interest':
      return 'text-violet-400';
    case 'close_friend':
      return 'text-blue-400';
    case 'friend':
      return 'text-emerald-400';
    case 'acquaintance':
      return 'text-amber-400';
    default:
      return 'text-white/60';
  }
};

export function CharacterCard({
  character,
  onStartChat,
  onGift,
  onMove,
  onEdit,
  onSaveCharacter,
  onDelete,
  compact = false,
  source,
  open,
  onOpenChange,
  hideTrigger = false,
}: CharacterCardProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const dialogOpen = open ?? internalOpen;
  const handleOpenChange = useCallback(
    (value: boolean) => {
      if (open === undefined) {
        setInternalOpen(value);
      }
      onOpenChange?.(value);
    },
    [onOpenChange, open],
  );

  const profileDefaults = useMemo(
    () => ({
      name: character.name ?? '',
      age: character.age != null ? String(character.age) : '',
      description: character.description ?? '',
      backstory: character.prompts?.background ?? '',
      keywords: (character.features ?? []).join(', '),
      avatar: character.avatar ?? '',
    }),
    [character],
  );

  const [profileDraft, setProfileDraft] = useState(profileDefaults);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setProfileDraft(profileDefaults);
  }, [profileDefaults]);

  const isDirty = useMemo(
    () =>
      Object.keys(profileDefaults).some(
        (key) => profileDefaults[key as keyof typeof profileDefaults] !== profileDraft[key as keyof typeof profileDraft],
      ),
    [profileDefaults, profileDraft],
  );

  const handleDraftChange = useCallback((field: keyof typeof profileDraft, value: string) => {
    setProfileDraft((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleReset = useCallback(() => {
    setProfileDraft(profileDefaults);
  }, [profileDefaults]);

  const handleSave = useCallback(async () => {
    if (!isDirty) return;

    const parsedAge = profileDraft.age.trim();
    const ageNumber = parsedAge ? Number(parsedAge) : undefined;
    if (parsedAge && Number.isNaN(ageNumber)) {
      toast.error('Age must be a number');
      return;
    }

    const keywords = profileDraft.keywords
      .split(/[\n,]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);

    const prompts = character.prompts ?? { system: '', personality: '', background: '' };
    const updates: Partial<Character> = {
      name: profileDraft.name.trim(),
      age: ageNumber,
      description: profileDraft.description.trim(),
      features: keywords,
      avatar: profileDraft.avatar.trim() || undefined,
      prompts: {
        ...prompts,
        background: profileDraft.backstory.trim(),
      },
    };

    setIsSaving(true);
    try {
      if (typeof onSaveCharacter === 'function') {
        const result = await onSaveCharacter(character.id, updates);
        if (result === false) {
          throw new Error('save callback returned false');
        }
      } else if (typeof onEdit === 'function') {
        onEdit({ ...character, ...updates });
      } else {
        toast.error('Saving is not available in this view yet.');
        return;
      }
      toast.success('Character profile updated');
    } catch (error) {
      console.error('Failed to save character profile', error);
      toast.error('Failed to update character profile');
    } finally {
      setIsSaving(false);
    }
  }, [character, isDirty, onEdit, onSaveCharacter, profileDraft]);

  const actions = (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => onStartChat(character.id)} className="h-9">
        Start Chat
      </Button>
      {onGift && (
        <Button variant="outline" onClick={() => onGift(character.id)} className="h-9">
          Gift
        </Button>
      )}
      {onMove && (
        <Button variant="outline" onClick={() => onMove(character.id)} className="h-9">
          Move
        </Button>
      )}
      {onDelete && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="h-9">
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {character.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the character and their memories. You can&apos;t undo this action.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(character.id)}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );

  const profileForm = (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 text-white/90">
          <Avatar className="h-32 w-32 rounded-3xl border border-white/10">
            <AvatarImage src={profileDraft.avatar} alt={profileDraft.name || character.name} />
            <AvatarFallback className="bg-white/10 text-2xl font-semibold">
              {(profileDraft.name || character.name || '?').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="w-full space-y-2 text-sm">
            <Label htmlFor={`${character.id}-avatar`} className="text-xs uppercase tracking-[0.25em] text-white/50">
              Profile Picture URL
            </Label>
            <Input
              id={`${character.id}-avatar`}
              value={profileDraft.avatar}
              onChange={(event) => handleDraftChange('avatar', event.target.value)}
              placeholder="https://..."
              className="h-10 rounded-xl border-white/15 bg-white/5"
            />
          </div>
          {source && (
            <div className="text-xs uppercase tracking-[0.25em] text-white/40">Source · {source}</div>
          )}
        </div>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor={`${character.id}-name`} className="text-xs uppercase tracking-[0.25em] text-white/50">
                Name
              </Label>
              <Input
                id={`${character.id}-name`}
                value={profileDraft.name}
                onChange={(event) => handleDraftChange('name', event.target.value)}
                className="mt-1 h-10 rounded-xl border-white/15 bg-white/5"
              />
            </div>
            <div>
              <Label htmlFor={`${character.id}-age`} className="text-xs uppercase tracking-[0.25em] text-white/50">
                Age
              </Label>
              <Input
                id={`${character.id}-age`}
                type="number"
                min={0}
                value={profileDraft.age}
                onChange={(event) => handleDraftChange('age', event.target.value)}
                className="mt-1 h-10 rounded-xl border-white/15 bg-white/5"
              />
            </div>
          </div>

          <div>
            <Label htmlFor={`${character.id}-description`} className="text-xs uppercase tracking-[0.25em] text-white/50">
              Description
            </Label>
            <Textarea
              id={`${character.id}-description`}
              value={profileDraft.description}
              onChange={(event) => handleDraftChange('description', event.target.value)}
              className="mt-1 h-28 rounded-2xl border-white/15 bg-white/5 text-sm"
              placeholder="Who is she? What draws the player in?"
            />
          </div>

          <div>
            <Label htmlFor={`${character.id}-backstory`} className="text-xs uppercase tracking-[0.25em] text-white/50">
              Backstory
            </Label>
            <Textarea
              id={`${character.id}-backstory`}
              value={profileDraft.backstory}
              onChange={(event) => handleDraftChange('backstory', event.target.value)}
              className="mt-1 h-32 rounded-2xl border-white/15 bg-white/5 text-sm"
              placeholder="Add context, history, and hooks for the AI."
            />
          </div>

          <div>
            <Label htmlFor={`${character.id}-keywords`} className="text-xs uppercase tracking-[0.25em] text-white/50">
              Keywords
            </Label>
            <Textarea
              id={`${character.id}-keywords`}
              value={profileDraft.keywords}
              onChange={(event) => handleDraftChange('keywords', event.target.value)}
              className="mt-1 h-24 rounded-2xl border-white/15 bg-white/5 text-sm"
              placeholder="comma or newline separated"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        <div className="text-xs uppercase tracking-[0.25em] text-white/40">
          {isDirty ? 'Unsaved changes' : 'All changes saved'}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={!isDirty || isSaving}
            className="rounded-full border-white/20 text-white/70 hover:text-white"
          >
            Reset
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="rounded-full bg-[#ff1372] px-5 text-white hover:bg-[#ff1372]/85"
          >
            {isSaving ? 'Saving…' : 'Save Profile'}
          </Button>
        </div>
      </div>
    </div>
  );

  const relationshipStatus = character.progression?.relationshipStatus ?? 'stranger';

  const compactCard = (
    <Card
      role="button"
      tabIndex={0}
      className="group flex cursor-pointer flex-col gap-3 rounded-[24px] border border-white/10 bg-[#11111b] p-4 text-white shadow-lg transition hover:border-[#ff1372]/40 focus:outline-none focus:ring-2 focus:ring-[#ff1372]"
      onClick={() => handleOpenChange(true)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleOpenChange(true);
        }
      }}
    >
      <div className="flex items-start gap-4">
        <Avatar className="h-12 w-12 border border-white/10">
          <AvatarImage src={character.avatar} alt={character.name} />
          <AvatarFallback>{character.name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold">{character.name}</h4>
            <Badge variant="outline" className="text-[10px] capitalize">
              {relationshipStatus.replace(/_/g, ' ')}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-white/60 line-clamp-2">{character.description}</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-white/10 p-2 text-white/60 transition hover:text-white"
          onClick={(event) => {
            event.stopPropagation();
            handleOpenChange(true);
          }}
        >
          <PencilSimple size={14} />
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/50">
        <span>{character.personality || 'No personality set'}</span>
        <span>{character.rarity?.toUpperCase() ?? 'COMMON'}</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            onStartChat(character.id);
          }}
          className="rounded-full bg-[#ff1372] px-4 text-xs uppercase tracking-[0.25em] text-white hover:bg-[#ff1372]/85"
        >
          Chat
        </Button>
        {onGift && (
          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              onGift(character.id);
            }}
            className="rounded-full border-white/20 text-white/70 hover:text-white"
          >
            Gift
          </Button>
        )}
        {onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={(event) => event.stopPropagation()}
                className="rounded-full border-white/20 text-white/60 hover:text-white"
              >
                <Trash size={14} />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {character.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove her from the roster.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(character.id)}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </Card>
  );

  const dialog = (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full max-w-2xl border border-white/10 bg-[#08080f]/95 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-lg font-semibold">
            <span>{profileDraft.name || character.name}</span>
            <Badge variant="outline" className={`${relationshipStatusColor(relationshipStatus)} text-[10px] capitalize`}>
              {relationshipStatus.replace(/_/g, ' ')}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {profileForm}
          <div className="border-t border-white/10 pt-4">
            {actions}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (hideTrigger) {
    return dialog;
  }

  if (compact) {
    return (
      <>
        {compactCard}
        {dialog}
      </>
    );
  }

  return (
    <>
      {compactCard}
      {dialog}
    </>
  );
}
