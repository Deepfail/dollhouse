import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDefaultLocations } from "@/lib/defaultLocations";
import { 
  Bed, 
  Martini, 
  UserCircle, 
  ShieldCheck, 
  LockKey, 
  Users, 
  Sparkle 
} from "@phosphor-icons/react";

interface LocationSelectorProps {
  onSelectLocation?: (locationId: string) => void;
  selectedLocation?: string;
  compact?: boolean;
}

const getLocationIcon = (locationId: string) => {
  switch (locationId) {
    case "owners-bed": return <Bed size={20} />;
    case "doll-bar": return <Martini size={20} />;
    case "therapist": return <UserCircle size={20} />;
    case "security-office": return <ShieldCheck size={20} />;
    case "secret-place": return <LockKey size={20} />;
    case "doll-dorm": return <Users size={20} />;
    case "doll-me-up": return <Sparkle size={20} />;
    default: return <Bed size={20} />;
  }
};

const getMoodColor = (mood?: string) => {
  switch (mood) {
    case "intimate": return "from-pink-500 to-rose-500";
    case "playful": return "from-purple-500 to-indigo-500";
    case "reflective": return "from-blue-500 to-cyan-500";
    case "tense": return "from-red-500 to-orange-500";
    case "forbidden": return "from-violet-500 to-purple-700";
    case "casual": return "from-green-500 to-emerald-500";
    case "transformative": return "from-amber-500 to-yellow-500";
    default: return "from-gray-500 to-slate-500";
  }
};

export function LocationSelector({ onSelectLocation, selectedLocation, compact = false }: LocationSelectorProps) {
  const locations = getDefaultLocations();

  if (compact) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {locations.map((location) => (
          <Button
            key={location.id}
            variant={selectedLocation === location.id ? "default" : "outline"}
            size="sm"
            onClick={() => onSelectLocation?.(location.id)}
            className="justify-start gap-2"
          >
            {getLocationIcon(location.id)}
            <span className="truncate">{location.name}</span>
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {locations.map((location) => {
        const isSelected = selectedLocation === location.id;
        
        return (
          <Card 
            key={location.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              isSelected ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => onSelectLocation?.(location.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${getMoodColor(location.mood)} text-white`}>
                    {getLocationIcon(location.id)}
                  </div>
                  <div>
                    <CardTitle className="text-sm">{location.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {location.description}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={location.type === "private" ? "default" : location.type === "public" ? "secondary" : "outline"}>
                  {location.type}
                </Badge>
              </div>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}

export function LocationGrid({ onSelectLocation, selectedLocation }: LocationSelectorProps) {
  const locations = getDefaultLocations();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {locations.map((location) => {
        const isSelected = selectedLocation === location.id;
        
        return (
          <Card 
            key={location.id}
            className={`cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
              isSelected ? "ring-2 ring-primary shadow-lg" : ""
            }`}
            onClick={() => onSelectLocation?.(location.id)}
          >
            <CardHeader>
              <div className="flex flex-col items-center text-center gap-3">
                <div className={`p-4 rounded-full bg-gradient-to-br ${getMoodColor(location.mood)} text-white`}>
                  {getLocationIcon(location.id)}
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-base">{location.name}</CardTitle>
                  <CardDescription className="text-xs">
                    {location.description}
                  </CardDescription>
                </div>
                <Badge variant={location.type === "private" ? "default" : location.type === "public" ? "secondary" : "outline"}>
                  {location.type} · {location.mood}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground line-clamp-3">
                {location.prompt.substring(0, 150)}...
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
