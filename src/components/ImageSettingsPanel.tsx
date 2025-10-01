import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { repositoryStorage } from '@/hooks/useRepositoryStorage';
import { useEffect, useState } from 'react';

export type ImageSettings = {
  model: string;
  width: number;
  height: number;
  steps: number;
  cfg_scale: number;
  style_preset?: string;
  sampler?: string;
  seed?: number | '';
  variants: number;
  format: 'webp' | 'png' | 'jpeg';
  negative_prompt?: string;
};

const DEFAULTS: ImageSettings = {
  model: 'venice-sd35',
  width: 1024,
  height: 1024,
  steps: 30,
  cfg_scale: 7.5,
  style_preset: '',
  sampler: '',
  seed: '',
  variants: 1,
  format: 'webp',
  negative_prompt: ''
};

const MODEL_OPTIONS = [
  { value: 'qwen-image', label: 'qwen-image — Highest quality, multimodal editing ($0.01)' },
  { value: 'venice-sd35', label: 'venice-sd35 — Default choice, Eliza-optimized ($0.01)' },
  { value: 'hidream', label: 'hidream — Production-ready generation ($0.01)' },
  { value: 'lustify-sdxl', label: 'lustify-sdxl — Uncensored content ($0.01)' },
  { value: 'wai-Illustrious', label: 'wai-Illustrious — Anime/NSFW capable' },
  { value: 'pony-realism', label: 'Pony Uncensored' },
  { value: 'flux-dev', label: 'FLUX' },
  { value: 'flux-dev-uncensored', label: 'FLUX Uncensored' }
];

const FORMAT_OPTIONS: Array<ImageSettings['format']> = ['webp', 'png', 'jpeg'];

const SAMPLER_OPTIONS = ['default', 'ddim', 'euler', 'euler_a', 'lms', 'dpm2', 'dpm2_a'];

export function ImageSettingsPanel({
  value,
  onChange
}: {
  value?: Partial<ImageSettings>;
  onChange?: (settings: ImageSettings) => void;
}) {
  const [settings, setSettings] = useState<ImageSettings>({ ...DEFAULTS, ...(value || {}) });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSettings(prev => ({ ...prev, ...(value || {}) }));
  }, [value]);

  useEffect(() => {
    (async () => {
      try {
        const saved = await repositoryStorage.get('image_settings_defaults');
        if (saved && typeof saved === 'object') {
          setSettings({ ...DEFAULTS, ...(saved as any), ...(value || {}) });
        }
      } catch (error) {
        console.error('Failed to load image settings defaults', error);
      }
    })();
  }, []);

  // Do not emit on every internal settings change via useEffect to avoid parent-child
  // feedback loops causing maximum update depth exceeded. We'll emit from update().

  const update = (patch: Partial<ImageSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch } as ImageSettings;
      onChange?.(next);
      return next;
    });
  };

  const saveDefaults = async () => {
    setIsSaving(true);
    try {
      await repositoryStorage.set('image_settings_defaults', settings);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-3 bg-[#18181b] rounded-xl border border-gray-800">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => update({ model: 'hidream', cfg_scale: 10, steps: 30, width: 1024, height: 1024 })}
        >
          Hidream Preset
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Model</Label>
          <Select value={settings.model} onValueChange={(v) => update({ model: v })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MODEL_OPTIONS.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Format</Label>
          <Select value={settings.format} onValueChange={(v: ImageSettings['format']) => update({ format: v })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FORMAT_OPTIONS.map(f => (
                <SelectItem key={f} value={f}>{f.toUpperCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Width</Label>
          <Input type="number" value={settings.width} onChange={(e) => update({ width: parseInt(e.target.value || '0', 10) })} />
        </div>
        <div className="space-y-1">
          <Label>Height</Label>
          <Input type="number" value={settings.height} onChange={(e) => update({ height: parseInt(e.target.value || '0', 10) })} />
        </div>
        <div className="space-y-1">
          <Label>Steps</Label>
          <Input type="number" value={settings.steps} onChange={(e) => update({ steps: parseInt(e.target.value || '0', 10) })} />
        </div>
        <div className="space-y-1">
          <Label>CFG Scale</Label>
          <Input type="number" step="0.1" value={settings.cfg_scale} onChange={(e) => update({ cfg_scale: parseFloat(e.target.value || '0') })} />
        </div>
        <div className="space-y-1">
          <Label>Sampler</Label>
          <Select value={settings.sampler ? settings.sampler : 'default'} onValueChange={(v) => update({ sampler: v === 'default' ? '' : v })}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Default" /></SelectTrigger>
            <SelectContent>
              {SAMPLER_OPTIONS.map(s => (
                <SelectItem key={s} value={s}>{s === 'default' ? 'Default' : s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Variants</Label>
          <Select value={String(settings.variants)} onValueChange={(v) => update({ variants: Math.max(1, Math.min(4, parseInt(v, 10))) })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1,2,3,4].map(n => (<SelectItem key={n} value={String(n)}>{n}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Seed (optional)</Label>
          <Input type="number" value={settings.seed as number | ''} onChange={(e) => update({ seed: e.target.value ? parseInt(e.target.value, 10) : '' })} />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label>Style Preset</Label>
          <Input value={settings.style_preset || ''} onChange={(e) => update({ style_preset: e.target.value })} placeholder="e.g., photorealistic, anime, cinematic" />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label>Negative Prompt</Label>
          <Textarea rows={3} value={settings.negative_prompt || ''} onChange={(e) => update({ negative_prompt: e.target.value })} placeholder="Things to avoid (e.g., blurry, extra fingers)" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={saveDefaults} disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save as default'}
        </Button>
      </div>
    </div>
  );
}

export default ImageSettingsPanel;
