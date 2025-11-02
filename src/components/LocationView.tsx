import { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { getDefaultLocations } from '@/lib/defaultLocations';
import type { Location } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { resetPromptOverride, setPromptOverride, type PromptKey } from '@/lib/prompts';
import { Loader2, Save, Trash2, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const LOCATION_PROMPT_KEYS: Record<string, PromptKey> = {
  'owners-bed': 'location.owners_bed',
  'doll-bar': 'location.doll_bar',
  'therapist': 'location.therapist',
  'security-office': 'location.security_office',
  'secret-place': 'location.secret_place',
  'doll-dorm': 'location.doll_dorm',
  'doll-me-up': 'location.doll_me_up',
};

export function LocationView() {
  const {
    house,
    getCharactersAtLocation,
    addLocation,
    updateLocation,
    removeLocation,
  } = useHouseFileStorage();
  const locations = useMemo<Location[]>(() => {
    const stored = house.locations ?? [];
    if (stored.length > 0) {
      return stored;
    }
    return getDefaultLocations();
  }, [house.locations]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [promptDraft, setPromptDraft] = useState('');
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [isCreatingLocation, setIsCreatingLocation] = useState(false);
  const [isDeletingLocation, setIsDeletingLocation] = useState(false);
  const [locationDraft, setLocationDraft] = useState<Location | null>(null);

  const selectedLocation = useMemo<Location | null>(() => {
    if (!selectedLocationId) {
      return null;
    }
    return locations.find((location) => location.id === selectedLocationId) ?? null;
  }, [locations, selectedLocationId]);

  useEffect(() => {
    if (selectedLocationId && !locations.some((location) => location.id === selectedLocationId)) {
      setSelectedLocationId(null);
    }
  }, [locations, selectedLocationId]);

  useEffect(() => {
    if (!selectedLocation) {
      setPromptDraft('');
      setLocationDraft(null);
      return;
    }
    setPromptDraft(selectedLocation.prompt ?? '');
    setLocationDraft({ ...selectedLocation });
  }, [selectedLocation]);

  const charactersAtLocation = useMemo(() => {
    if (!selectedLocation) {
      return [];
    }
    return getCharactersAtLocation(selectedLocation.id);
  }, [getCharactersAtLocation, selectedLocation]);

  const handleSelectLocation = (location: Location) => {
    setSelectedLocationId(location.id);
    setPromptDraft(location.prompt ?? '');
    setLocationDraft({ ...location });
  };

  const handleCreateLocation = async () => {
    setIsCreatingLocation(true);
    try {
      const newLocation: Location = {
        id: `custom-${Date.now().toString(36)}`,
        name: 'New Location',
        description: 'Describe this space.',
        prompt: 'Describe the sights, sounds, expectations, and atmosphere of this location.',
        type: 'private',
        mood: 'custom',
        unlocked: true,
      };
      const success = await addLocation(newLocation);
      if (success) {
        setSelectedLocationId(newLocation.id);
      }
    } catch (error) {
      console.error('Failed to create location', error);
      toast.error('Failed to create location');
    } finally {
      setIsCreatingLocation(false);
    }
  };

  const handleSavePrompt = async () => {
    if (!selectedLocation) {
      return;
    }

    const promptKey = LOCATION_PROMPT_KEYS[selectedLocation.id];
    if (!promptKey) {
      toast.error('This location does not support prompt editing yet.');
      return;
    }

    const trimmedPrompt = promptDraft.trim();
    if (trimmedPrompt.length === 0) {
      toast.error('Prompt cannot be empty.');
      return;
    }

    setIsSavingPrompt(true);
    try {
      await setPromptOverride(promptKey, trimmedPrompt);
      const persisted = await updateLocation(selectedLocation.id, { prompt: trimmedPrompt });
      if (persisted) {
        toast.success('Location prompt updated.');
      } else {
        toast.error('Prompt saved, but failed to update location metadata.');
      }
    } catch (error) {
      console.error('Failed to save location prompt', error);
      toast.error('Failed to save prompt.');
    } finally {
      setIsSavingPrompt(false);
    }
  };

  const handleResetPrompt = async () => {
    if (!selectedLocation) {
      return;
    }

    const promptKey = LOCATION_PROMPT_KEYS[selectedLocation.id];
    if (!promptKey) {
      toast.error('This location does not support prompt resets yet.');
      return;
    }

    setIsSavingPrompt(true);
    try {
      await resetPromptOverride(promptKey);
      const defaults = getDefaultLocations();
      const fresh = defaults.find((location) => location.id === selectedLocation.id);
      const defaultPrompt = fresh?.prompt ?? '';
      const persisted = await updateLocation(selectedLocation.id, { prompt: defaultPrompt });
      if (persisted) {
        setPromptDraft(defaultPrompt);
        toast.success('Location prompt reset to default.');
      } else {
        toast.error('Prompt reset, but failed to update location metadata.');
      }
    } catch (error) {
      console.error('Failed to reset location prompt', error);
      toast.error('Failed to reset prompt.');
    } finally {
      setIsSavingPrompt(false);
    }
  };

  const handleDeleteLocation = async () => {
    if (!selectedLocation) {
      return;
    }
    const confirmed = typeof window === 'undefined'
      ? true
      : window.confirm(`Remove ${selectedLocation.name}? Characters will be unassigned.`);
    if (!confirmed) {
      return;
    }
    setIsDeletingLocation(true);
    try {
      const success = await removeLocation(selectedLocation.id);
      if (success) {
        setSelectedLocationId(null);
      }
    } catch (error) {
      console.error('Failed to remove location', error);
      toast.error('Failed to remove location');
    } finally {
      setIsDeletingLocation(false);
    }
  };

  const handleSaveMetadata = async () => {
    if (!selectedLocation || !locationDraft) {
      return;
    }
    if (!locationDraft.name.trim()) {
      toast.error('Location name cannot be empty.');
      return;
    }
    if (!locationDraft.description.trim()) {
      toast.error('Location description cannot be empty.');
      return;
    }
    const payload: Partial<Location> = {
      name: locationDraft.name.trim(),
      description: locationDraft.description.trim(),
      type: locationDraft.type,
      mood: locationDraft.mood?.trim() || undefined,
      unlocked: Boolean(locationDraft.unlocked),
    };

    setIsSavingMetadata(true);
    try {
      const success = await updateLocation(selectedLocation.id, payload);
      if (success) {
        toast.success('Location details updated.');
      }
    } catch (error) {
      console.error('Failed to update location', error);
      toast.error('Failed to update location');
    } finally {
      setIsSavingMetadata(false);
    }
  };

  const hasPromptChanges = selectedLocation
    ? promptDraft.trim() !== (selectedLocation.prompt ?? '').trim()
    : false;

  const hasMetadataChanges = selectedLocation && locationDraft
    ? (
        locationDraft.name.trim() !== selectedLocation.name.trim() ||
        locationDraft.description.trim() !== selectedLocation.description.trim() ||
        locationDraft.type !== selectedLocation.type ||
        (locationDraft.mood?.trim() || '') !== (selectedLocation.mood?.trim() || '') ||
        Boolean(locationDraft.unlocked) !== Boolean(selectedLocation.unlocked)
      )
    : false;

  const getLocationCharacterCount = (locationId: string): number => {
    return getCharactersAtLocation(locationId).length;
  };

  const getUnassignedCount = (): number => {
    return getCharactersAtLocation(undefined).length;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Locations</h1>
          <p className="text-muted-foreground mt-1">
            Manage character locations and visit different areas of the dollhouse
          </p>
        </div>
        <Button onClick={handleCreateLocation} size="sm" disabled={isCreatingLocation}>
          {isCreatingLocation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          New Location
        </Button>
      </div>

      {/* Unassigned Characters Alert */}
      {getUnassignedCount() > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="text-yellow-600 dark:text-yellow-400">Unassigned Characters</CardTitle>
            <CardDescription>
              {getUnassignedCount()} character{getUnassignedCount() !== 1 ? 's' : ''} not assigned to any location
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,1fr)]">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {locations.map((location) => {
            const characterCount = getLocationCharacterCount(location.id);
            const isSelected = location.id === selectedLocationId;

            return (
              <Card
                key={location.id}
                className={`cursor-pointer border transition-all hover:shadow-lg ${
                  isSelected ? 'border-primary shadow-lg' : 'hover:border-primary/40'
                }`}
                onClick={() => handleSelectLocation(location)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{location.name}</CardTitle>
                      <CardDescription className="mt-1 line-clamp-2">
                        {location.description}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={characterCount > 0 ? 'default' : 'secondary'}
                      className="shrink-0"
                    >
                      {characterCount}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold capitalize">
                      {location.type}
                    </span>
                    {location.mood ? (
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold capitalize">
                        {location.mood}
                      </span>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          {selectedLocation ? (
            <div className="flex h-full flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold">{selectedLocation.name}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {selectedLocation.description}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={handleDeleteLocation}
                  disabled={isDeletingLocation}
                  aria-label="Delete location"
                >
                  {isDeletingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>

              <div className="grid gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <div className="flex gap-2">
                  <Badge variant="outline" className="capitalize">{selectedLocation.type}</Badge>
                  {selectedLocation.mood ? (
                    <Badge variant="secondary" className="capitalize">
                      {selectedLocation.mood}
                    </Badge>
                  ) : null}
                </div>
              </div>

              {locationDraft ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="location-name">Name</Label>
                      <Input
                        id="location-name"
                        value={locationDraft.name}
                        onChange={(event) =>
                          setLocationDraft((current) => current ? { ...current, name: event.target.value } : current)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="location-mood">Mood</Label>
                      <Input
                        id="location-mood"
                        value={locationDraft.mood ?? ''}
                        placeholder="Playful, reflective, relaxed..."
                        onChange={(event) =>
                          setLocationDraft((current) => current ? { ...current, mood: event.target.value } : current)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="location-type">Type</Label>
                      <Select
                        value={locationDraft.type}
                        onValueChange={(value) =>
                          setLocationDraft((current) => current ? { ...current, type: value as Location['type'] } : current)
                        }
                      >
                        <SelectTrigger id="location-type" className="capitalize">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="private">Private</SelectItem>
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="special">Special</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="location-unlocked">Unlocked</Label>
                      <div className="flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2">
                        <Switch
                          id="location-unlocked"
                          checked={Boolean(locationDraft.unlocked)}
                          onCheckedChange={(checked) =>
                            setLocationDraft((current) => current ? { ...current, unlocked: checked } : current)
                          }
                        />
                        <span className="text-xs text-muted-foreground">
                          {locationDraft.unlocked ? 'Available to visit' : 'Hidden from roster'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="location-description">Description</Label>
                    <Textarea
                      id="location-description"
                      value={locationDraft.description}
                      onChange={(event) =>
                        setLocationDraft((current) => current ? { ...current, description: event.target.value } : current)
                      }
                      className="min-h-[100px] resize-y bg-black/40"
                      placeholder="What do guests see when they enter?"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleSaveMetadata}
                      disabled={isSavingMetadata || !hasMetadataChanges}
                    >
                      {isSavingMetadata ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save Details
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">Atmosphere Prompt</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetPrompt}
                      disabled={isSavingPrompt}
                    >
                      Reset
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSavePrompt}
                      disabled={isSavingPrompt || !hasPromptChanges}
                    >
                      {isSavingPrompt ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={promptDraft}
                  onChange={(event) => setPromptDraft(event.target.value)}
                  className="min-h-[160px] resize-y bg-black/40"
                  placeholder="Describe the vibe, sights, sounds, and expectations for this location."
                />
                <p className="text-xs text-muted-foreground">
                  This prompt is appended to scene context whenever the group is at this location. Keep tone evocative and specific.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">
                    Characters In Room ({charactersAtLocation.length})
                  </h3>
                  {charactersAtLocation.length === 0 ? null : (
                    <span className="text-xs text-muted-foreground">Tap a girl in the roster to move her.</span>
                  )}
                </div>
                {charactersAtLocation.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-4 text-center text-sm text-muted-foreground">
                    No one is currently assigned here.
                  </div>
                ) : (
                  <ScrollArea className="max-h-[320px] pr-4">
                    <div className="space-y-3">
                      {charactersAtLocation.map((character) => (
                        <div
                          key={character.id}
                          className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border border-white/10">
                              <AvatarImage src={character.avatar} alt={character.name} />
                              <AvatarFallback>
                                {(character.name ?? '?').slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium text-white">{character.name}</p>
                              {character.role ? (
                                <p className="text-xs text-muted-foreground">{character.role}</p>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-sm text-muted-foreground">
              <p>Select a location to see the atmosphere prompt and who is currently inside.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
