import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';
import { getLocationById } from '@/lib/defaultLocations';

interface CharacterLocationBadgeProps {
  locationId?: string;
  className?: string;
}

export function CharacterLocationBadge({ locationId, className }: CharacterLocationBadgeProps) {
  if (!locationId) {
    return (
      <Badge variant="outline" className={className}>
        <MapPin className="w-3 h-3 mr-1" />
        Unassigned
      </Badge>
    );
  }

  const location = getLocationById(locationId);
  
  if (!location) {
    return (
      <Badge variant="outline" className={className}>
        <MapPin className="w-3 h-3 mr-1" />
        Unknown
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className={className}>
      <MapPin className="w-3 h-3 mr-1" />
      {location.name}
    </Badge>
  );
}
