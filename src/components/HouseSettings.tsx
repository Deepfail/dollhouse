import { AISettings } from "@/components/AISettings";
import { PromptLibrary } from "@/components/PromptLibrary";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useFileStorage } from "@/hooks/useFileStorage";
import { repositoryStorage } from "@/hooks/useRepositoryStorage";
import { Check, Gear, X } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface HouseSettingsProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface AISettingsConfig {
  textProvider: "openrouter" | "venice" | "anthropic" | "openai";
  textApiKey?: string;
  textModel: string;
  textApiUrl?: string;
  imageProvider: "venice" | "openai" | "stability" | "none";
  imageModel?: string;
  imageModelCustom?: string;
  imageApiKey?: string;
  imageApiUrl?: string;
}

interface HouseConfig {
  name: string;
  worldPrompt?: string;
  chatPrompt?: string; // Global chat context/instructions
  copilotPrompt?: string;
  copilotMaxTokens?: number;
  copilotUseHouseContext?: boolean;
  copilotContextDetail?: "lite" | "balanced" | "detailed";
  copilotResponseLength?: "brief" | "normal" | "detailed";
  copilotPersonality?: string;
  copilotMainPrompt?: string;
  aiSettings: AISettingsConfig;
  autoCreator: {
    enabled: boolean;
    interval: number;
    maxCharacters: number;
    themes: string[];
  };
}

const DEFAULT_CONFIG: HouseConfig = {
  name: "The Dollhouse",
  worldPrompt: "",
  chatPrompt: "", // Global chat instructions
  copilotPrompt: "",
  copilotMaxTokens: 500,
  copilotUseHouseContext: true,
  copilotContextDetail: "balanced",
  copilotResponseLength: "normal",
  copilotPersonality: "friendly and helpful, casual but knowledgeable",
  copilotMainPrompt: "You are Wingman, the Dollhouse assistant. Help manage the house, introduce girls, set up scenarios, and provide tips. Keep responses conversational and engaging. Remember context from our ongoing conversation.",
  aiSettings: {
    textProvider: "openrouter",
    textModel: "deepseek/deepseek-chat",
    imageProvider: "venice",
    imageModel: "venice-sd35",
    imageModelCustom: "",
  },
  autoCreator: {
    enabled: false,
    interval: 60,
    maxCharacters: 10,
    themes: ["college", "ad girls", "men"],
  },
};

export function HouseSettings({ open, onOpenChange }: HouseSettingsProps) {
  const [localConfig, setLocalConfig] = useState<HouseConfig>(DEFAULT_CONFIG);
  const [originalConfig, setOriginalConfig] =
    useState<HouseConfig>(DEFAULT_CONFIG);
  const [hasChanges, setHasChanges] = useState(false);
  const { setData: setSettingsForceUpdate } = useFileStorage<number>(
    "settings-force-update.json",
    0
  );

  // Load settings from repositoryStorage on mount/open
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const config = await repositoryStorage.get<HouseConfig>("house_config");
        if (config && Object.keys(config).length > 0) {
          const configPartial = config as Partial<HouseConfig>;
          // Defensive: ensure aiSettings and autoCreator are always present
          const safeConfig: HouseConfig = {
            ...DEFAULT_CONFIG,
            ...configPartial,
            aiSettings: {
              ...DEFAULT_CONFIG.aiSettings,
              ...(configPartial.aiSettings ?? {}),
            },
            autoCreator: {
              ...DEFAULT_CONFIG.autoCreator,
              ...(configPartial.autoCreator ?? {}),
            },
          };
          setLocalConfig(safeConfig);
          setOriginalConfig(safeConfig);
        } else {
          setLocalConfig(DEFAULT_CONFIG);
          setOriginalConfig(DEFAULT_CONFIG);
        }
      } catch (error) {
        console.error("Failed to load house settings", error);
        setLocalConfig(DEFAULT_CONFIG);
        setOriginalConfig(DEFAULT_CONFIG);
      }
    })();
  }, [open]);

  // Track changes
  useEffect(() => {
    setHasChanges(
      JSON.stringify(localConfig) !== JSON.stringify(originalConfig)
    );
  }, [localConfig, originalConfig]);

  const handleSave = async () => {
    try {
      await repositoryStorage.set("house_config", localConfig);
      await setSettingsForceUpdate(Date.now());
      setOriginalConfig(localConfig);
      toast.success("House settings saved!");
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to save house settings", error);
      toast.error("Failed to save settings");
    }
  };

  const handleCancel = () => {
    setLocalConfig(originalConfig);
    setHasChanges(false);
  };

  const updateConfig = (updates: Partial<HouseConfig>) => {
    setLocalConfig((prev) => ({ ...prev, ...updates }));
  };

  const updateAutoCreator = (updates: Partial<HouseConfig["autoCreator"]>) => {
    setLocalConfig((prev) => ({
      ...prev,
      autoCreator: { ...prev.autoCreator, ...updates },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-hidden bg-gray-900 text-white"
        style={{ backgroundColor: "#1a1a1a", color: "#ffffff" }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Gear size={20} />
            House Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="ai">AI Settings</TabsTrigger>
            <TabsTrigger value="copilot">Copilot</TabsTrigger>
            <TabsTrigger value="prompts">Prompts</TabsTrigger>
            <TabsTrigger value="character">Character Options</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* General Settings */}
            <TabsContent value="general" className="space-y-6 mt-0">
              <div className="space-y-2">
                <Label htmlFor="house-name">House Name</Label>
                <Input
                  id="house-name"
                  value={localConfig.name}
                  onChange={(e) => updateConfig({ name: e.target.value })}
                  placeholder="Enter house name"
                />
              </div>

              {/* House Prompts Section */}
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">House Prompts</h3>
                <p className="text-sm text-muted-foreground">
                  Configure how your house behaves, tells stories, and maintains the world setting.
                </p>
              </div>

              {/* Global Chat Prompt */}
              <div className="space-y-4 p-4 rounded-lg border border-white/10 bg-white/5">
                <h4 className="font-medium flex items-center gap-2">
                  <span className="text-green-400">●</span> Global Chat Context
                </h4>
                
                <div className="space-y-2">
                  <Label htmlFor="chat-prompt" className="text-sm font-medium">
                    Global Chat Prompt
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Additional instructions or context added to ALL character chats. Use this to set global rules, tone, or scenarios that affect every conversation.
                  </p>
                  <Textarea
                    id="chat-prompt"
                    value={localConfig.chatPrompt || ''}
                    onChange={(e) => updateConfig({ chatPrompt: e.target.value })}
                    placeholder="e.g., 'All characters are in a beach vacation setting. Keep responses flirty and playful.'"
                    className="min-h-[100px] font-mono text-sm"
                  />
                </div>
              </div>

              {/* World & Setting */}
              <div className="space-y-4 p-4 rounded-lg border border-white/10 bg-white/5">
                <h4 className="font-medium flex items-center gap-2">
                  <span className="text-blue-400">●</span> World & Setting
                </h4>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    World Description / Context
                    <span className="ml-2 text-xs text-muted-foreground">(house.world.description)</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Describes the world setting, atmosphere, and rules for your house. Sets the tone and context for all interactions.
                  </p>
                  <Button variant="outline" size="sm">
                    Edit in Prompt Library
                  </Button>
                </div>
              </div>

              {/* Story System */}
              <div className="space-y-4 p-4 rounded-lg border border-white/10 bg-white/5">
                <h4 className="font-medium flex items-center gap-2">
                  <span className="text-purple-400">●</span> Story & Memory System
                </h4>
                <p className="text-xs text-muted-foreground">
                  Prompts that create and maintain story continuity and character memories
                </p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Story Entry Generator
                      <span className="ml-2 text-xs text-muted-foreground">(house.story.entryPrompt)</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Creates story entries for the chronicle: summary, narrative, emotional changes, significance level, and tags
                    </p>
                    <Button variant="outline" size="sm">
                      Edit in Prompt Library
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Story Mode Prompt
                      <span className="ml-2 text-xs text-muted-foreground">(house.story.modeTemplate)</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Base prompt for story mode that maintains continuity, relationship status, trust/affection levels, and shared history
                    </p>
                    <Button variant="outline" size="sm">
                      Edit in Prompt Library
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Significant Moments Intro
                      <span className="ml-2 text-xs text-muted-foreground">(house.story.significantIntro)</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Headline text for introducing significant shared moments (e.g., "Important moments between you:")
                    </p>
                    <Button variant="outline" size="sm">
                      Edit in Prompt Library
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Significant Moment Line
                      <span className="ml-2 text-xs text-muted-foreground">(house.story.significantLine)</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Template for each significant moment bullet (uses: title, summary)
                    </p>
                    <Button variant="outline" size="sm">
                      Edit in Prompt Library
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Story Mode Footer
                      <span className="ml-2 text-xs text-muted-foreground">(house.story.modeFooter)</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Footer appended when there are no significant moments to display
                    </p>
                    <Button variant="outline" size="sm">
                      Edit in Prompt Library
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Fallback Story Summary
                      <span className="ml-2 text-xs text-muted-foreground">(house.story.fallbackSummary)</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Simple fallback when AI story generation fails (e.g., "Character and user had a conversation")
                    </p>
                    <Button variant="outline" size="sm">
                      Edit in Prompt Library
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      No History Introduction
                      <span className="ml-2 text-xs text-muted-foreground">(house.story.noHistoryIntro)</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Introduction text used for first interactions when there's no shared history
                    </p>
                    <Button variant="outline" size="sm">
                      Edit in Prompt Library
                    </Button>
                  </div>
                </div>
              </div>

              {/* Behavior Analysis */}
              <div className="space-y-4 p-4 rounded-lg border border-white/10 bg-white/5">
                <h4 className="font-medium flex items-center gap-2">
                  <span className="text-green-400">●</span> Behavior Analysis
                </h4>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Behavior Analysis Prompt
                    <span className="ml-2 text-xs text-muted-foreground">(house.behavior.analysisPrompt)</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Analyzes recent chat behavior to assign behavior states, confidence levels, emotional deltas, and actionable notes
                  </p>
                  <Button variant="outline" size="sm">
                    Edit in Prompt Library
                  </Button>
                </div>
              </div>

              {/* Scene & Scenario System */}
              <div className="space-y-4 p-4 rounded-lg border border-white/10 bg-white/5">
                <h4 className="font-medium flex items-center gap-2">
                  <span className="text-orange-400">●</span> Scene & Scenario System
                </h4>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Scene Context Prompt
                    <span className="ml-2 text-xs text-muted-foreground">(house.scene.contextPrompt)</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Controls how characters respond to scenarios created by Wingman. Ensures characters match the mood and tone (scary, romantic, tense, etc.) when entering a scene.
                  </p>
                  <Button variant="outline" size="sm">
                    Edit in Prompt Library
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* AI Settings */}
            <TabsContent value="ai" className="space-y-6 mt-0">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Manage AI providers, models, and keys in the dedicated AI
                  Settings dialog.
                </p>
                <AISettings>
                  <Button variant="outline">Open AI Settings</Button>
                </AISettings>
              </div>
            </TabsContent>

            {/* Copilot Settings */}
            <TabsContent value="copilot" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label htmlFor="copilot-main-prompt">Main System Prompt</Label>
                <Textarea
                  id="copilot-main-prompt"
                  value={localConfig.copilotMainPrompt || DEFAULT_CONFIG.copilotMainPrompt}
                  onChange={(e) =>
                    updateConfig({ copilotMainPrompt: e.target.value })
                  }
                  placeholder="Core instructions for how Copilot should behave..."
                  rows={4}
                  className="bg-zinc-900 border-zinc-700 text-white"
                />
                <p className="text-sm text-muted-foreground">
                  This is the core personality and instruction set for your Copilot/Wingman.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="copilot-personality">Personality</Label>
                <Input
                  id="copilot-personality"
                  value={localConfig.copilotPersonality || DEFAULT_CONFIG.copilotPersonality}
                  onChange={(e) =>
                    updateConfig({ copilotPersonality: e.target.value })
                  }
                  placeholder="e.g., friendly and helpful, witty and casual"
                  className="bg-zinc-900 border-zinc-700 text-white"
                />
                <p className="text-sm text-muted-foreground">
                  Quick description of Copilot's tone and style.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Response Length</Label>
                <Select
                  value={localConfig.copilotResponseLength || "normal"}
                  onValueChange={(value) =>
                    updateConfig({
                      copilotResponseLength: value as "brief" | "normal" | "detailed",
                    })
                  }
                >
                  <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                    <SelectValue placeholder="Choose response length" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brief">
                      Brief (1-2 sentences, quick replies)
                    </SelectItem>
                    <SelectItem value="normal">
                      Normal (2-4 sentences, balanced)
                    </SelectItem>
                    <SelectItem value="detailed">
                      Detailed (longer, comprehensive responses)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Controls how verbose the Copilot's responses are.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Context Detail Level</Label>
                <Select
                  value={localConfig.copilotContextDetail || "balanced"}
                  onValueChange={(value) =>
                    updateConfig({
                      copilotContextDetail: value as
                        | "lite"
                        | "balanced"
                        | "detailed",
                    })
                  }
                >
                  <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                    <SelectValue placeholder="Choose detail level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lite">
                      Lite (minimal context, faster)
                    </SelectItem>
                    <SelectItem value="balanced">
                      Balanced (good mix)
                    </SelectItem>
                    <SelectItem value="detailed">
                      Detailed (full character info)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  How much character and house info to include in each message.
                </p>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <Label>Include House Context</Label>
                  <p className="text-sm text-muted-foreground">
                    Copilot can see all girls in the house and their current status.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={localConfig.copilotUseHouseContext !== false}
                    onCheckedChange={(enabled) =>
                      updateConfig({ copilotUseHouseContext: enabled })
                    }
                  />
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded border ${
                      localConfig.copilotUseHouseContext !== false
                        ? "border-green-500 text-green-400 bg-green-500/10"
                        : "border-zinc-600 text-zinc-300 bg-zinc-700/30"
                    }`}
                  >
                    {localConfig.copilotUseHouseContext !== false
                      ? "Enabled"
                      : "Disabled"}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 space-y-2">
                <p className="text-sm font-semibold text-blue-300">
                  💡 Quick Actions Available
                </p>
                <p className="text-sm text-blue-200/80">
                  You can ask Copilot to:
                  <br />• "Bring [name] to my room" - starts a scenario
                  <br />• "Tell me about [name]" - character details
                  <br />• "Show me who's available" - list girls
                  <br />• "Set up a scene with [name]" - create scenario
                </p>
              </div>
            </TabsContent>

            {/* Prompt Settings */}
            <TabsContent value="prompts" className="space-y-4 mt-0">
              <PromptLibrary variant="dark" />
            </TabsContent>

            {/* Auto Creator Settings */}
                        {/* Character Options */}
            <TabsContent value="character" className="space-y-6 mt-0">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">Character Prompts</h3>
                <p className="text-sm text-muted-foreground">
                  Configure how characters are generated and how they respond. These prompts control character creation, personality, and communication style.
                </p>
              </div>

              {/* Character Generation Section */}
              <div className="space-y-4 p-4 rounded-lg border border-white/10 bg-white/5">
                <h4 className="font-medium flex items-center gap-2">
                  <span className="text-purple-400">●</span> Character Generation
                </h4>
                <p className="text-xs text-muted-foreground">
                  Core prompts used when creating new characters
                </p>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Character Architect Core
                      <span className="ml-2 text-xs text-muted-foreground">(character.architect.template)</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Main prompt that designs the full character profile including stats, personality, and background
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const promptLib = document.querySelector('[data-prompt-library]');
                        if (promptLib) {
                          // Switch to prompts tab and filter to this prompt
                          const tabsList = document.querySelector('[role="tablist"]');
                          const promptsTab = Array.from(tabsList?.querySelectorAll('[role="tab"]') || [])
                            .find((tab) => tab.textContent?.includes('Prompts'));
                          if (promptsTab) (promptsTab as HTMLElement).click();
                        }
                      }}
                    >
                      Edit in Prompt Library
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Prompt Alignment Reminder
                      <span className="ml-2 text-xs text-muted-foreground">(character.generator.promptAlignment)</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Ensures all generated prompts (system, description, personality, etc.) align with the character's established facts
                    </p>
                    <Button variant="outline" size="sm">
                      Edit in Prompt Library
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Response Style Guide
                      <span className="ml-2 text-xs text-muted-foreground">(character.generator.responseStyleGuide)</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Teaches AI how to craft unique communication patterns: verbal quirks, pacing, emotional tells, and signature habits
                    </p>
                    <Button variant="outline" size="sm">
                      Edit in Prompt Library
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Origin Scenario Guide
                      <span className="ml-2 text-xs text-muted-foreground">(character.generator.originScenarioGuide)</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Guides creation of compelling first-meeting stories: where they met, what sparked chemistry, why she chose the Dollhouse
                    </p>
                    <Button variant="outline" size="sm">
                      Edit in Prompt Library
                    </Button>
                  </div>
                </div>
              </div>

              {/* Character Fallback Prompts */}
              <div className="space-y-4 p-4 rounded-lg border border-white/10 bg-white/5">
                <h4 className="font-medium flex items-center gap-2">
                  <span className="text-blue-400">●</span> Fallback Prompts
                </h4>
                <p className="text-xs text-muted-foreground">
                  Default values used when characters don't have custom prompts
                </p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Fallback System Prompt
                      <span className="ml-2 text-xs text-muted-foreground">(character.prompts.fallbackSystem)</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      System instructions applied when a character has no custom system prompt. Uses: name, personality, background
                    </p>
                    <Button variant="outline" size="sm">
                      Edit in Prompt Library
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Fallback Response Style
                      <span className="ml-2 text-xs text-muted-foreground">(character.prompts.fallbackResponseStyle)</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Default response style when none is provided. Currently: "warm, teasing, balanced confidence with vulnerability"
                    </p>
                    <Button variant="outline" size="sm">
                      Edit in Prompt Library
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Fallback Origin Scenario
                      <span className="ml-2 text-xs text-muted-foreground">(character.prompts.defaultOriginScenario)</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Origin scenario used when character lacks one. Template describes first meeting in Dollhouse orbit
                    </p>
                    <Button variant="outline" size="sm">
                      Edit in Prompt Library
                    </Button>
                  </div>
                </div>
              </div>

              {/* Manual Creator Prompts */}
              <div className="space-y-4 p-4 rounded-lg border border-white/10 bg-white/5">
                <h4 className="font-medium flex items-center gap-2">
                  <span className="text-green-400">●</span> Manual Creator Helpers
                </h4>
                <p className="text-xs text-muted-foreground">
                  Prompts used when manually creating characters to generate suggestions
                </p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Personality Generator
                      <span className="ml-2 text-xs text-muted-foreground">(character.creator.personalityPrompt)</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Generates 3-5 personality trait suggestions (e.g., "shy, kind, intelligent, playful")
                    </p>
                    <Button variant="outline" size="sm">
                      Edit in Prompt Library
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Physical Features Generator
                      <span className="ml-2 text-xs text-muted-foreground">(character.creator.featuresPrompt)</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Generates 4-6 physical feature suggestions (e.g., "long brown hair, green eyes, athletic build")
                    </p>
                    <Button variant="outline" size="sm">
                      Edit in Prompt Library
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Background Generator
                      <span className="ml-2 text-xs text-muted-foreground">(character.creator.backgroundPrompt)</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Creates 2-3 sentence background based on personality and features
                    </p>
                    <Button variant="outline" size="sm">
                      Edit in Prompt Library
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Image Prompt Generator
                      <span className="ml-2 text-xs text-muted-foreground">(character.creator.imagePrompt)</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Generates image generation prompt from character details (name, role, features, personality)
                    </p>
                    <Button variant="outline" size="sm">
                      Edit in Prompt Library
                    </Button>
                  </div>
                </div>
              </div>

              {/* Character Card Prompts */}
              <div className="space-y-4 p-4 rounded-lg border border-white/10 bg-white/5">
                <h4 className="font-medium flex items-center gap-2">
                  <span className="text-pink-400">●</span> Character Card Features
                </h4>
                <p className="text-xs text-muted-foreground">
                  Prompts used within character profile cards for generating descriptions
                </p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Physical Description Generator
                      <span className="ml-2 text-xs text-muted-foreground">(character.card.physicalDescriptionPrompt)</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Creates vivid 2-3 sentence physical description from hair, eyes, skin tone, height, body type, and traits
                    </p>
                    <Button variant="outline" size="sm">
                      Edit in Prompt Library
                    </Button>
                  </div>
                </div>
              </div>

              {/* Advanced Character Prompts */}
              <div className="space-y-4 p-4 rounded-lg border border-white/10 bg-white/5">
                <h4 className="font-medium flex items-center gap-2">
                  <span className="text-amber-400">●</span> Advanced Features
                </h4>
                <p className="text-xs text-muted-foreground">
                  Specialized prompts for advanced character features
                </p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Ali Profile Generator
                      <span className="ml-2 text-xs text-muted-foreground">(character.ali.profilePrompt)</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Generates character profile from user assessment including name, age, appearance, personality, background
                    </p>
                    <Button variant="outline" size="sm">
                      Edit in Prompt Library
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Ali Scenario Generator
                      <span className="ml-2 text-xs text-muted-foreground">(character.ali.scenarioPrompt)</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Creates scenario descriptions based on user assessment with setting, activities, and dynamics
                    </p>
                    <Button variant="outline" size="sm">
                      Edit in Prompt Library
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      LLM Enhancement System
                      <span className="ml-2 text-xs text-muted-foreground">(character.llm.systemPrompt)</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      System prompt for external LLM character enhancement service
                    </p>
                    <Button variant="outline" size="sm">
                      Edit in Prompt Library
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      LLM Enhancement User Prompt
                      <span className="ml-2 text-xs text-muted-foreground">(character.llm.enhancePrompt)</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Prompt for requesting enhanced character details (bio, traits, tags, system_prompt)
                    </p>
                    <Button variant="outline" size="sm">
                      Edit in Prompt Library
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={!hasChanges}
          >
            <X size={16} className="mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges}>
            <Check size={16} className="mr-2" />
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
