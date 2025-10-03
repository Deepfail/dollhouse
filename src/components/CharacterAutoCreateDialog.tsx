import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAutoCharacterCreator } from '@/hooks/useAutoCharacterCreator';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import type { CharacterGenerationOptions } from '@/lib/characterGenerator';
import { ensureUniqueCharacter } from '@/lib/characterUtils';
import { cn } from '@/lib/utils';
import type { Character } from '@/types';
import { X } from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type ArchetypeId = 'college' | 'prime' | 'fresh';
type CharacterGender = 'female' | 'male';

const ARCHETYPE_OPTIONS: Array<{
  id: ArchetypeId;
  label: string;
  headline: string;
  description: string;
}> = [
  {
    id: 'college',
    label: 'College',
    headline: 'Upperclass coed energy',
    description: '20-23-year-old campus muse juggling seminars, secret societies, and late-night DJ residencies. She weaponizes charisma, curated chaos, and a fully adult sense of freedom.',
  },
  {
    id: 'prime',
    label: 'Prime',
    headline: 'Peak confidence era',
    description: 'Mid-to-late twenties powerhouse with a polished edge and a high-end grind. Think luxury marketing gigs, velvet ropes, and a magnetic presence that pulls every eye in the room.',
  },
  {
    id: 'fresh',
    label: 'Fresh',
    headline: 'Fresh-faced but grown',
    description: '19-21-year-old whirlwind with restless ambition and a hunger for spotlight moments. From viral dance crews to underground fashion drops, she brings adult mischief with a wide-eyed rush.',
  },
];

const GENDER_OPTIONS: Array<{ id: CharacterGender; label: string; blurb: string }> = [
  {
    id: 'female',
    label: 'Girls',
    blurb: 'Sultry muses who blend seduction with playfulness, fully aware of the power they hold and eager to wield it with intent.',
  },
  {
    id: 'male',
    label: 'Guys',
    blurb: 'Smooth operators who treat the house like a five-star playground—confident, indulgent, and ready to spoil their match.',
  },
];

const parseList = (value: string): string[] =>
  value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

interface CharacterAutoCreateCommonProps {
  onCharacterCreated?: (character: Character) => void;
  initialGender?: CharacterGender;
  initialArchetype?: ArchetypeId;
}

interface CharacterAutoCreateContentProps extends CharacterAutoCreateCommonProps {
  active: boolean;
  onClose: () => void;
  layout: 'modal' | 'inline';
}

function CharacterAutoCreateContent({
  active,
  onClose,
  onCharacterCreated,
  initialGender = 'female',
  initialArchetype = 'college',
  layout,
}: CharacterAutoCreateContentProps) {
  const { characters, addCharacter } = useHouseFileStorage();
  const { generateCharacterDraft } = useAutoCharacterCreator();

  const [gender, setGender] = useState<CharacterGender>(initialGender);
  const [archetype, setArchetype] = useState<ArchetypeId>(initialArchetype);
  const [personalityInput, setPersonalityInput] = useState('');
  const [featureInput, setFeatureInput] = useState('');
  const [backgroundNotes, setBackgroundNotes] = useState('');
  const [extraNotes, setExtraNotes] = useState('');

  const [draft, setDraft] = useState<Character | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const personalityTraits = useMemo(() => parseList(personalityInput), [personalityInput]);
  const featureNotes = useMemo(() => parseList(featureInput), [featureInput]);

  const resetForm = useCallback(
    (nextGender: CharacterGender, nextArchetype: ArchetypeId) => {
      setGender(nextGender);
      setArchetype(nextArchetype);
      setPersonalityInput('');
      setFeatureInput('');
      setBackgroundNotes('');
      setExtraNotes('');
      setDraft(null);
      setIsGenerating(false);
      setIsSaving(false);
    },
    [],
  );

  useEffect(() => {
    if (active) {
      setGender(initialGender);
      setArchetype(initialArchetype);
    } else {
      resetForm(initialGender, initialArchetype);
    }
  }, [active, resetForm, initialGender, initialArchetype]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const options: CharacterGenerationOptions = {
        instructions: {
          archetype,
          gender,
          personalityTraits,
          featureNotes,
          backgroundHooks: backgroundNotes.trim() || undefined,
          extraNotes: extraNotes.trim() || undefined,
        },
      };

      const character = await generateCharacterDraft(options);
      setDraft(character);
      toast.success(`${character.name} is ready — review her details below.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate character';
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!draft) {
      toast.error('Generate a character first');
      return;
    }

    setIsSaving(true);
    try {
      const uniqueCharacter = ensureUniqueCharacter(draft, characters);
      const saved = await addCharacter(uniqueCharacter);
      if (saved) {
        toast.success(`${uniqueCharacter.name} joined the house.`);
        onCharacterCreated?.(uniqueCharacter);
        onClose();
      } else {
        toast.error('A girl with that name already exists. Try adjusting the generation notes.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save character';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedArchetype = ARCHETYPE_OPTIONS.find((option) => option.id === archetype);

  return (
    <div
      className={cn(
        'relative flex h-full min-h-0 flex-col overflow-hidden bg-gradient-to-b from-[#121226] via-[#0b0b17] to-[#05040b] text-white',
        layout === 'modal' && 'rounded-3xl border border-white/10',
      )}
    >
      <header className="flex flex-shrink-0 items-center justify-between border-b border-white/5 px-5 py-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/40">Auto Creator</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Create a Tailored Character</h2>
          <p className="mt-1 text-xs text-white/55">
            Tune archetype, notes, and prompts while keeping the rest of the house visible.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/70 transition hover:border-[#ff54a6]/50 hover:bg-[#ff1372]/15 hover:text-white"
          onClick={onClose}
        >
          <X size={16} />
          <span className="hidden md:inline">Close</span>
        </Button>
      </header>

      <div className="flex-1 min-h-0 overflow-hidden px-5 pb-5 pt-5">
        <div className="grid h-full min-h-0 gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="space-y-6 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-5">
            <section className="space-y-3">
              <Label className="text-xs uppercase tracking-[0.28em] text-white/40">Gender</Label>
              <div className="grid grid-cols-2 gap-2">
                {GENDER_OPTIONS.map((option) => {
                  const isActive = gender === option.id;
                  const activeTint = option.id === 'female'
                    ? 'bg-gradient-to-r from-[#ff4fa3] via-[#ff1a7d] to-[#d90c66] text-white shadow-[0_20px_40px_-25px_rgba(255,71,152,0.9)] border-transparent'
                    : 'bg-gradient-to-r from-[#4f9bff] via-[#2977ff] to-[#1e4dff] text-white shadow-[0_20px_40px_-25px_rgba(47,120,255,0.85)] border-transparent';

                  return (
                    <Tooltip key={option.id}>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            'h-10 rounded-xl border-white/15 px-4 text-center text-sm font-semibold tracking-[0.16em] uppercase transition',
                            isActive
                              ? activeTint
                              : 'bg-transparent text-white/70 hover:text-white hover:border-white/30',
                          )}
                          onClick={() => setGender(option.id)}
                        >
                          {option.label}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[220px] text-left leading-relaxed text-white/85">
                        {option.blurb}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </section>

            <section className="space-y-3">
              <Label className="text-xs uppercase tracking-[0.28em] text-white/40">Type</Label>
              <div className="space-y-2">
                {ARCHETYPE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setArchetype(option.id)}
                    className={cn(
                      'w-full rounded-2xl border px-4 py-3 text-left transition',
                      archetype === option.id
                        ? 'border-[#ff1372]/70 bg-[#ff1372]/15 text-white'
                        : 'border-white/10 bg-white/5 text-white/70 hover:border-[#ff1372]/40 hover:text-white',
                    )}
                  >
                    <p className="text-sm font-semibold">{option.label}</p>
                    <p className="text-xs text-white/55">{option.headline}</p>
                    <p className="mt-1 text-xs text-white/40">{option.description}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <div className="space-y-2">
                <Label>Personality anchors</Label>
                <Textarea
                  value={personalityInput}
                  onChange={(event) => setPersonalityInput(event.target.value)}
                  placeholder="Comma or newline separated traits (e.g. playful, obedient, brat taming)"
                  className="min-h-[80px] resize-none bg-white/5"
                />
              </div>
              <div className="space-y-2">
                <Label>Must-have features</Label>
                <Textarea
                  value={featureInput}
                  onChange={(event) => setFeatureInput(event.target.value)}
                  placeholder="Comma or newline separated notes (e.g. pastel hair, gymnast flexibility, secret exhibitionist)"
                  className="min-h-[80px] resize-none bg-white/5"
                />
              </div>
              <div className="space-y-2">
                <Label>Backstory hooks</Label>
                <Textarea
                  value={backgroundNotes}
                  onChange={(event) => setBackgroundNotes(event.target.value)}
                  placeholder="What should her history include? Family expectations, scandals, hometown legends — keep it adult."
                  className="min-h-[70px] resize-none bg-white/5"
                />
              </div>
              <div className="space-y-2">
                <Label>Extra instructions</Label>
                <Textarea
                  value={extraNotes}
                  onChange={(event) => setExtraNotes(event.target.value)}
                  placeholder="Anything else? Voice, kinks, rivalries, obsessions, signature moves."
                  className="min-h-[70px] resize-none bg-white/5"
                />
              </div>
            </section>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                className="flex-1 rounded-full bg-[#ff1372] text-sm font-semibold uppercase tracking-[0.2em]"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? 'Crafting...' : 'Generate Character'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-white/20 text-xs uppercase tracking-[0.2em]"
                onClick={() => resetForm(initialGender, initialArchetype)}
                disabled={isGenerating || isSaving}
              >
                Reset
              </Button>
            </div>
          </div>

          <div className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            {!draft ? (
              <div className="flex flex-1 items-center justify-center px-6 py-12 text-center text-sm text-white/55">
                Configure a gender and type, add any guidance, then generate to preview a fully-loaded profile.
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="space-y-6 p-6">
                  <header className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.32em] text-white/40">Preview</p>
                      <h3 className="mt-1 text-xl font-semibold text-white">{draft.name}</h3>
                      <p className="text-sm text-white/60">
                        {draft.age ? `${draft.age} • ` : ''}
                        {draft.role || (selectedArchetype?.headline ?? '')}
                      </p>
                    </div>
                    <Badge variant="outline" className="uppercase tracking-[0.22em] text-white/70">
                      {draft.rarity}
                    </Badge>
                  </header>

                  {draft.personalities?.length ? (
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-[0.28em] text-white/40">Personality</Label>
                      <div className="flex flex-wrap gap-2">
                        {draft.personalities.map((trait) => (
                          <Badge key={trait} variant="secondary" className="bg-white/10 text-white/80">
                            {trait}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {draft.features?.length ? (
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-[0.28em] text-white/40">Features</Label>
                      <div className="flex flex-wrap gap-2 text-sm text-white/70">
                        {draft.features.map((feature) => (
                          <span key={feature} className="rounded-full border border-white/15 px-3 py-1">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-[0.28em] text-white/40">Background</Label>
                    <p className="leading-relaxed text-sm text-white/70 whitespace-pre-line">{draft.description}</p>
                  </div>

                  <div className="space-y-4 rounded-2xl border border-white/10 bg-[#080812] p-4">
                    <PromptBlock title="System Prompt" value={draft.prompts?.system ?? ''} />
                    <PromptBlock title="Description Prompt" value={draft.prompts?.description ?? ''} />
                    <PromptBlock title="Personality Prompt" value={draft.prompts?.personality ?? ''} />
                    <PromptBlock title="Background Context" value={draft.prompts?.background ?? ''} />
                    <PromptBlock title="Appearance Prompt" value={draft.prompts?.appearance ?? ''} />
                    <PromptBlock title="Response Style" value={draft.prompts?.responseStyle ?? ''} />
                    <PromptBlock title="Origin Scenario" value={draft.prompts?.originScenario ?? ''} />
                  </div>
                </div>
              </ScrollArea>
            )}

            <div className="border-t border-white/10 p-4">
              <Button
                type="button"
                className="w-full rounded-full bg-emerald-500 text-sm font-semibold uppercase tracking-[0.2em] text-white hover:bg-emerald-500/90"
                onClick={handleSave}
                disabled={!draft || isSaving}
              >
                {isSaving ? 'Saving...' : 'Save to Roster'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PromptBlock({ title, value }: { title: string; value: string }) {
  if (!value) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.28em] text-white/40">{title}</p>
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white/85">
        {value}
      </pre>
    </div>
  );
}

interface CharacterAutoCreateDialogProps extends CharacterAutoCreateCommonProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CharacterAutoCreateDialog({
  open,
  onOpenChange,
  onCharacterCreated,
  initialGender = 'female',
  initialArchetype = 'college',
}: CharacterAutoCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[min(90vw,62rem)] overflow-hidden border border-white/10 bg-[#0a0a13] p-0 text-white">
        <CharacterAutoCreateContent
          active={open}
          layout="modal"
          onClose={() => onOpenChange(false)}
          onCharacterCreated={onCharacterCreated}
          initialGender={initialGender}
          initialArchetype={initialArchetype}
        />
      </DialogContent>
    </Dialog>
  );
}

interface CharacterAutoCreateInlineProps extends CharacterAutoCreateCommonProps {
  active: boolean;
  onClose: () => void;
}

export function CharacterAutoCreateInline({
  active,
  onClose,
  onCharacterCreated,
  initialGender = 'female',
  initialArchetype = 'college',
}: CharacterAutoCreateInlineProps) {
  if (!active) return null;

  return (
    <CharacterAutoCreateContent
      active={active}
      layout="inline"
      onClose={onClose}
      onCharacterCreated={onCharacterCreated}
      initialGender={initialGender}
      initialArchetype={initialArchetype}
    />
  );
}
