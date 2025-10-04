import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { logger } from '@/lib/logger';
import {
    getPromptDefinitionsByCategory,
    reloadPromptOverrides,
    resetAllPrompts,
    resetPromptOverride,
    setPromptOverride,
    type PromptCategory,
    type PromptDefinition,
} from '@/lib/prompts';
import { ArrowClockwise, FloppyDisk, Trash } from '@phosphor-icons/react';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type PromptStatus = 'idle' | 'saving' | 'saved' | 'error';

type StatusMap = Record<string, PromptStatus>;

const CATEGORY_LABELS: Record<PromptCategory, string> = {
  character: 'Character Prompts',
  copilot: 'Copilot Prompts',
  house: 'House Prompts',
};

export interface PromptLibraryProps {
  className?: string;
  variant?: 'default' | 'dark';
}

export function PromptLibrary({ className, variant = 'default' }: PromptLibraryProps) {
  const [promptGroups, setPromptGroups] = useState<Record<PromptCategory, PromptDefinition[]>>({
    character: [],
    copilot: [],
    house: [],
  });
  const [promptValues, setPromptValues] = useState<Record<string, string>>({});
  const [promptOverrides, setPromptOverrides] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<StatusMap>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    void loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      setIsLoading(true);
      const groups = getPromptDefinitionsByCategory();
      setPromptGroups(groups);
      const overrides = await reloadPromptOverrides();
      const initialValues: Record<string, string> = {};
      (Object.values(groups) as PromptDefinition[][]).forEach(definitions => {
        definitions.forEach(definition => {
          initialValues[definition.key] = overrides[definition.key] ?? definition.defaultValue;
        });
      });
      setPromptValues(initialValues);
      setPromptOverrides(overrides);
      setStatuses({});
    } catch (error) {
      logger.error('[PromptLibrary] Error loading prompts', error);
      toast.error('Failed to load prompts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setPromptValues(prev => ({ ...prev, [key]: value }));
    setStatuses(prev => ({ ...prev, [key]: 'idle' }));
  };

  const handleSave = async (definition: PromptDefinition) => {
    try {
      setStatuses(prev => ({ ...prev, [definition.key]: 'saving' }));
      const value = promptValues[definition.key] ?? '';
      const updated = await setPromptOverride(definition.key, value);
      setPromptOverrides(updated);
      setStatuses(prev => ({ ...prev, [definition.key]: 'saved' }));
      toast.success(`${definition.label} saved`);
      setTimeout(() => {
        setStatuses(prev => ({ ...prev, [definition.key]: 'idle' }));
      }, 2000);
    } catch (error) {
      logger.error('[PromptLibrary] Error saving prompt override', error);
      setStatuses(prev => ({ ...prev, [definition.key]: 'error' }));
      toast.error('Failed to save prompt');
    }
  };

  const handleReset = async (definition: PromptDefinition) => {
    try {
      setStatuses(prev => ({ ...prev, [definition.key]: 'saving' }));
      setPromptValues(prev => ({ ...prev, [definition.key]: definition.defaultValue }));
      const updated = await resetPromptOverride(definition.key);
      setPromptOverrides(updated);
      setStatuses(prev => ({ ...prev, [definition.key]: 'saved' }));
      toast.success(`${definition.label} reset to default`);
      setTimeout(() => {
        setStatuses(prev => ({ ...prev, [definition.key]: 'idle' }));
      }, 2000);
    } catch (error) {
      logger.error('[PromptLibrary] Error resetting prompt override', error);
      setStatuses(prev => ({ ...prev, [definition.key]: 'error' }));
      toast.error('Failed to reset prompt');
    }
  };

  const handleReload = async () => {
    await loadPrompts();
    toast.success('Prompts reloaded');
  };

  const handleResetAll = async () => {
    const confirmed = confirm('Reset all prompt overrides to their default values?');
    if (!confirmed) return;
    try {
      setIsLoading(true);
      await resetAllPrompts();
      await loadPrompts();
      toast.success('All prompts reset to defaults');
    } catch (error) {
      logger.error('[PromptLibrary] Error resetting all prompts', error);
      toast.error('Failed to reset prompts');
    }
  };

  const containerClasses = clsx(
    'space-y-6',
    variant === 'dark' && 'text-white',
    className,
  );

  const headerSubtitle =
    'Review every system prompt the app uses. Edit a prompt to create an override or reset to fall back to the default.';

  return (
    <div className={containerClasses}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className={clsx('text-xl font-semibold', variant === 'dark' && 'text-white')}>Prompt Library</h2>
          <p className={clsx('text-sm text-muted-foreground', variant === 'dark' && 'text-zinc-400')}>
            {headerSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReload}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <ArrowClockwise size={16} className="animate-spin" />
            ) : (
              <ArrowClockwise size={16} />
            )}
            Reload
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetAll}
            disabled={isLoading}
            className="flex items-center gap-2 text-destructive hover:text-destructive"
          >
            <Trash size={16} />
            Reset All
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowClockwise size={16} className="animate-spin" />
          Loading prompts...
        </div>
      ) : (
        (Object.entries(promptGroups) as [PromptCategory, PromptDefinition[]][]).map(([category, definitions]) => (
          <Card key={category} className={clsx(variant === 'dark' && 'bg-zinc-900 border-zinc-800')}>
            <CardHeader>
              <CardTitle className={clsx(variant === 'dark' && 'text-white')}>
                {CATEGORY_LABELS[category]}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {definitions.map(definition => {
                const value = promptValues[definition.key] ?? definition.defaultValue;
                const override = promptOverrides[definition.key];
                const hasOverride = Boolean(override && override.trim().length > 0);
                const baseValue = hasOverride ? override : definition.defaultValue;
                const status = statuses[definition.key] ?? 'idle';
                const isSaving = status === 'saving';
                const isErrored = status === 'error';
                const isSaved = status === 'saved';
                const isModified = value !== baseValue;

                return (
                  <div key={definition.key} className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <Label
                          htmlFor={`prompt-${definition.key}`}
                          className={clsx(variant === 'dark' && 'text-white')}
                        >
                          {definition.label}
                        </Label>
                        <p className={clsx('text-sm text-muted-foreground', variant === 'dark' && 'text-zinc-400')}>
                          {definition.description}
                        </p>
                        {definition.placeholders && definition.placeholders.length > 0 && (
                          <p className={clsx('text-xs text-muted-foreground', variant === 'dark' && 'text-zinc-500')}>
                            Tokens: {definition.placeholders.map(token => `{{${token}}}`).join(', ')}
                          </p>
                        )}
                      </div>
                      <span className={clsx('text-xs text-muted-foreground whitespace-nowrap', variant === 'dark' && 'text-zinc-400')}>
                        {hasOverride ? 'Custom override' : 'Using default'}
                      </span>
                    </div>

                    <Textarea
                      id={`prompt-${definition.key}`}
                      value={value}
                      onChange={(event) => handleChange(definition.key, event.target.value)}
                      rows={Math.min(Math.max(definition.defaultValue.split('\n').length, 4), 18)}
                      className={clsx('font-mono text-sm', variant === 'dark' && 'bg-zinc-950 border-zinc-800 text-zinc-100')}
                      disabled={isLoading || isSaving}
                    />

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSave(definition)}
                        disabled={isLoading || isSaving || !isModified}
                        className="flex items-center gap-2"
                      >
                        {isSaving ? (
                          <ArrowClockwise size={16} className="animate-spin" />
                        ) : (
                          <FloppyDisk size={16} />
                        )}
                        {isSaving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReset(definition)}
                        disabled={isLoading || isSaving || (!hasOverride && value === definition.defaultValue)}
                        className="flex items-center gap-2"
                      >
                        <Trash size={16} />
                        Reset
                      </Button>
                      {isErrored && (
                        <span className="text-xs text-destructive">Save failed</span>
                      )}
                      {isSaved && (
                        <span className={clsx('text-xs text-muted-foreground', variant === 'dark' && 'text-zinc-400')}>
                          Saved
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {definitions.length === 0 && (
                <p className={clsx('text-sm text-muted-foreground', variant === 'dark' && 'text-zinc-400')}>
                  No prompts in this category yet.
                </p>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

export default PromptLibrary;
