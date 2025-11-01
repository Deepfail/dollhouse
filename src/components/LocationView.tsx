import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useHouseFileStorage } from '@/hooks/useHouseFileStorage';
import { getDefaultLocations } from '@/lib/defaultLocations';
import { useState } from 'react';
import { LocationDetailSheet } from './LocationDetailSheet';
import type { Location } from '@/types';

export function LocationView() {
  const { getCharactersAtLocation } = useHouseFileStorage();
  const locations = getDefaultLocations();
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

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

      {/* Location Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map((location) => {
          const characterCount = getLocationCharacterCount(location.id);
          
          return (
            <Card
              key={location.id}
              className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
              onClick={() => setSelectedLocation(location)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{location.name}</CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">
                      {location.description}
                    </CardDescription>
                  </div>
                  <Badge variant={characterCount > 0 ? 'default' : 'secondary'} className="ml-2">
                    {characterCount}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="capitalize">{location.type}</span>
                    {location.mood && (
                      <>
                        <span>•</span>
                        <span className="capitalize">{location.mood}</span>
                      </>
                    )}
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={(e) => {
                    e.stopPropagation();
                    setSelectedLocation(location);
                  }}>
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Location Detail Sheet */}
      {selectedLocation && (
        <LocationDetailSheet
          location={selectedLocation}
          open={!!selectedLocation}
          onOpenChange={(open) => {
            if (!open) setSelectedLocation(null);
          }}
        />
      )}
    </div>
  );
}
