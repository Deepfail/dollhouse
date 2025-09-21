# UI Component Migration Mapping

## Overview
This document maps legacy components to their new UI equivalents and identifies migration requirements.

## Directory Structure Analysis

### Current Production (`src/`)
- Uses legacy custom components with older styling approach
- Copilot sidebar is fully functional with complex chat and update system
- Mobile-responsive layout with device mockup design
- Dark theme with custom color scheme (`#0f0f0f`, `#1a1a1a`)

### New Implementation (`RECOVER/src/`)  
- Uses modern shadcn/ui components from `src/components/ui/*`
- CopilotRedesigned component with modern styling
- Simplified layout structure using CSS custom properties
- Modern color system with CSS variables

## Component Migration Map

### Layout Components

| Legacy Component | New Component | Status | Migration Notes |
|------------------|---------------|--------|-----------------|
| `src/components/Layout.tsx` | `RECOVER/src/components/Layout.tsx` | ⚠️ COPILOT DISABLED | New layout has copilot commented out |
| `src/components/Copilot.tsx` | `RECOVER/src/components/CopilotRedesigned.tsx` | ✅ REDESIGNED | Fully redesigned with new UI components |

### Core Components

| Legacy Component | New Component | Status | Migration Notes |
|------------------|---------------|--------|-----------------|
| `src/components/CharacterCard.tsx` | `RECOVER/src/components/CharacterCard.tsx` | ✅ MIGRATED | Uses new UI components, enhanced tabs |
| `src/components/HouseMap.tsx` | Same file | ❌ NOT MIGRATED | Still uses legacy styling |
| `src/components/ChatInterface.tsx` | Same file | ❌ NOT MIGRATED | Needs UI component migration |
| `src/components/SceneInterface.tsx` | Same file | ❌ NOT MIGRATED | Needs UI component migration |
| `src/components/Sidebar.tsx` | Same file | ❌ NOT MIGRATED | Needs UI component migration |

### UI Components Status

| UI Component | Location | Usage |
|--------------|----------|--------|
| Button | `src/components/ui/button.tsx` | ✅ Available |
| Card | `src/components/ui/card.tsx` | ✅ Available |
| Badge | `src/components/ui/badge.tsx` | ✅ Available |
| ScrollArea | `src/components/ui/scroll-area.tsx` | ✅ Available |
| Input | `src/components/ui/input.tsx` | ✅ Available |
| Tabs | `src/components/ui/tabs.tsx` | ✅ Available |
| Dialog | `src/components/ui/dialog.tsx` | ✅ Available |
| Avatar | `src/components/ui/avatar.tsx` | ✅ Available |
| Progress | `src/components/ui/progress.tsx` | ✅ Available |
| Separator | `src/components/ui/separator.tsx` | ✅ Available |

## Key Issues Identified

### 1. Copilot Sidebar Disabled
- The RECOVER Layout has the copilot sidebar commented out
- Need to enable and integrate CopilotRedesigned component

### 2. Inconsistent Styling Systems
- Legacy: Custom color scheme with hardcoded values
- New: CSS custom properties and modern theming
- Need to standardize on one approach

### 3. Mobile Responsiveness
- Legacy layout has sophisticated mobile mockup design
- New layout is simpler but may lose mobile responsiveness

### 4. AI Integration Points
- Need to verify all components use OpenRouter/Venice AI
- Check text and image generation services

## Migration Priority

### Phase 1: Critical (Enable Copilot)
1. **Enable Copilot in Layout** - Uncomment and integrate CopilotRedesigned
2. **Migrate Layout styling** - Choose between legacy mobile-first or new simplified approach

### Phase 2: Core Components
1. **Migrate remaining components** to use new UI system
2. **Standardize color theming** across all components
3. **Ensure responsive design** is maintained

### Phase 3: Cleanup
1. **Remove legacy components** that are no longer needed
2. **Update AI service integrations** to use OpenRouter/Venice consistently
3. **Add Storybook stories** for new UI usage

## AI Service Integration Status

### Current AI Service Usage
- Text Generation: Needs verification for OpenRouter/Venice usage
- Image Generation: Needs verification for OpenRouter/Venice usage
- Service Configuration: Located in AI settings

### Required Changes
- [ ] Audit all AI service calls
- [ ] Ensure OpenRouter/Venice AI is used consistently
- [ ] Update any hardcoded AI provider references