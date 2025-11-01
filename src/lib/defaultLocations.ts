import { Location } from "@/types";
import { getPromptValue } from "./prompts";

/**
 * Default locations for the Dollhouse
 * These can be customized via the prompt library
 */
export function getDefaultLocations(): Location[] {
  return [
    {
      id: "owners-bed",
      name: "The Owner's Bed",
      description: "Private bedroom - intimate sanctuary",
      prompt: getPromptValue("location.owners_bed"),
      type: "private",
      mood: "intimate",
      unlocked: true,
    },
    {
      id: "doll-bar",
      name: "Doll Bar",
      description: "Social lounge with drinks and atmosphere",
      prompt: getPromptValue("location.doll_bar"),
      type: "public",
      mood: "playful",
      unlocked: true,
    },
    {
      id: "therapist",
      name: "Therapist",
      description: "Safe space for vulnerability and conversation",
      prompt: getPromptValue("location.therapist"),
      type: "special",
      mood: "reflective",
      unlocked: true,
    },
    {
      id: "security-office",
      name: "Security Office",
      description: "Monitoring and accountability",
      prompt: getPromptValue("location.security_office"),
      type: "special",
      mood: "tense",
      unlocked: true,
    },
    {
      id: "secret-place",
      name: "Secret Place",
      description: "Hidden sanctuary for privacy",
      prompt: getPromptValue("location.secret_place"),
      type: "private",
      mood: "forbidden",
      unlocked: true,
    },
    {
      id: "doll-dorm",
      name: "Doll Dorm",
      description: "Shared living space and community hub",
      prompt: getPromptValue("location.doll_dorm"),
      type: "public",
      mood: "casual",
      unlocked: true,
    },
    {
      id: "doll-me-up",
      name: "Doll Me Up",
      description: "Boutique and beauty salon",
      prompt: getPromptValue("location.doll_me_up"),
      type: "public",
      mood: "transformative",
      unlocked: true,
    },
  ];
}

/**
 * Get a location by ID
 */
export function getLocationById(id: string): Location | undefined {
  return getDefaultLocations().find((loc) => loc.id === id);
}

/**
 * Get location prompt context for AI
 */
export function getLocationContext(locationId?: string): string {
  if (!locationId) return "";
  
  const location = getLocationById(locationId);
  if (!location) return "";
  
  return `\n\nLOCATION: ${location.name}\n${location.prompt}\n`;
}
