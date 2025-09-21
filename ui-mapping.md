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
| `src/components/HouseMap.tsx` | Same file | ✅ MIGRATED | Already uses new UI components |
| `src/components/ChatInterface.tsx` | Same file | ✅ MIGRATED | Already uses new UI components |
| `src/components/SceneInterface.tsx` | Same file | ✅ MIGRATED | Already uses new UI components |
| `src/components/Sidebar.tsx` | Same file | ✅ MIGRATED | Already uses new UI components |
| `src/components/HouseView.tsx` | Same file | ✅ MIGRATED | Already uses new UI components |

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

## Key Issues Identified - RESOLVED ✅

### 1. Copilot Sidebar Disabled - ✅ FIXED
- ✅ Enabled Copilot sidebar in Layout component
- ✅ Integrated CopilotRedesigned component successfully
- ✅ Copilot is fully functional with modern UI

### 2. Inconsistent Styling Systems - ✅ RESOLVED
- ✅ All components now use shadcn/ui components consistently
- ✅ Modern CSS custom properties system in use
- ✅ Consistent theming across all components

### 3. Mobile Responsiveness - ✅ MAINTAINED
- ✅ Layout preserves responsive design capabilities
- ✅ Mobile-friendly interface maintained

### 4. AI Integration Points - ✅ VERIFIED
- ✅ All components properly use AIService
- ✅ OpenRouter and Venice AI support implemented
- ✅ Both text and image generation working correctly

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

## AI Service Integration Status - ✅ COMPLETE

### Current AI Service Usage
- Text Generation: ✅ OpenRouter/Venice AI properly configured
- Image Generation: ✅ OpenRouter/Venice AI properly configured  
- Service Configuration: ✅ Centralized in AIService class

### Completed Changes
- ✅ Audited all AI service calls
- ✅ Confirmed OpenRouter/Venice AI is used consistently
- ✅ All AI provider references use proper service routing
- ✅ CopilotRedesigned component uses AIService for both text and image generation
- ✅ CharacterCard components use AIService for dynamic content