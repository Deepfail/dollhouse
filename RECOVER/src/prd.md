# Character Creator House - Product Requirements Document

## Core Purpose & Success
**Mission Statement**: A virtual house where users can create, customize, and interact with AI characters individually and in group scenarios.

**Success Indicators**: 
- Characters respond naturally to user interactions
- Scene mode enables autonomous character interactions
- Users can easily configure and manage their virtual house

**Experience Qualities**: Engaging, Customizable, Interactive

## Project Classification & Approach
**Complexity Level**: Complex Application (advanced functionality, character management, AI integration)
**Primary User Activity**: Interacting with AI characters through chat and automated scenes

## Essential Features

### Character Management
- **Character Creation**: Detailed character builder with stats, prompts, and customization
- **Auto Character Creator**: Automated character generation with configurable themes and schedules
- **Character Progression**: Stats tracking (relationship, energy, happiness, experience, level)
- **Export Functionality**: Export characters to Silly Tavern format

### AI Integration
- **Multi-Provider Support**: OpenRouter (DeepSeek models) and Spark AI integration
- **Model Selection**: Support for multiple AI models including DeepSeek Chat v3.1, R1, and others
- **Image Generation**: Venice AI integration for character avatars and scenes
- **Configurable Prompts**: World prompts, copilot prompts, and character-specific prompts

### Chat System
- **Individual Chats**: One-on-one conversations with characters
- **Group Chats**: Multi-character conversations
- **Scene Mode**: Autonomous character interactions with secret objectives
- **Auto-Play**: Characters interact automatically based on their objectives

### House Management
- **Room System**: Private rooms, shared spaces, and facilities
- **Currency System**: Virtual economy for gifts and upgrades
- **House Copilot**: AI assistant that monitors character needs and behaviors
- **Settings Management**: Comprehensive configuration for all aspects

### Scene Creator
- **Objective-Based Scenarios**: Characters receive secret objectives unknown to others
- **Automated Interactions**: Characters pursue their goals through conversation
- **Scene Controls**: Play/pause, manual intervention, turn management

## Design Direction

### Visual Tone & Identity
**Emotional Response**: Sophisticated, immersive, and user-friendly
**Design Personality**: Modern, sleek, with subtle sci-fi elements
**Visual Metaphors**: Digital house, AI companions, virtual spaces

### Color Strategy
**Color Scheme Type**: Dark theme with bright neon accents
**Primary Colors**: 
- Background: Deep black/dark gray (oklch(0.08 0.02 265))
- Primary Accent: Bright magenta/pink (oklch(0.75 0.25 325))
- Secondary Accent: Bright cyan/teal (oklch(0.68 0.35 165))
- Success/Active: Bright green for status indicators
- Warning: Bright amber for alerts
- Error: Bright red for critical states

### Typography System
**Font Selection**: Inter - clean, modern sans-serif font
**Hierarchy**: Clear distinction between headers, body text, and UI elements
**Accessibility**: High contrast ratios maintained throughout

### UI Elements & Component Selection
**Component Library**: Shadcn v4 components for consistent, accessible interface
**Layout**: Grid-based with responsive design
**Navigation**: Sidebar navigation with tabbed organization
**Interactive Elements**: Cards for character/room display, dialogs for detailed interactions

### API Configuration
**OpenRouter Integration**: 
- DeepSeek Chat v3.1 (primary)
- DeepSeek R1-0528 (reasoning model)
- DeepSeek Chat v3-0324 (legacy)
- GPT-4o (fallback)
- DeepSeek R1 (standard reasoning)

**Venice AI Integration**: For character image generation

**Spark AI Fallback**: Built-in support for Spark environment

## Advanced Features

### Auto Character Creator
- Configurable creation intervals
- Maximum character limits
- Theme-based generation (fantasy, sci-fi, modern, historical)
- Rarity system (common, rare, legendary)

### Scene Mode Enhancement
- Multiple characters with conflicting objectives
- Turn-based or real-time interactions
- Scene outcome tracking and history
- Export capabilities for scene transcripts

### House Copilot
- Real-time character monitoring
- Behavioral pattern recognition
- Need alerting system (energy, happiness, relationship)
- Helpful suggestions and house management tips

## Implementation Status

### Completed Features
✅ Character creation and management
✅ Individual and group chat systems
✅ Scene mode with objectives
✅ Auto character creator
✅ OpenRouter API integration
✅ House settings and configuration
✅ Dark theme with neon accents
✅ Responsive sidebar navigation
✅ API status monitoring

### Current Issues Being Addressed
- Scene session persistence and retrieval
- API configuration validation
- Error handling and user feedback
- Character response generation reliability

### Future Enhancements
- Venice AI image generation integration
- Advanced scene templates
- Character relationship tracking
- More sophisticated house facilities
- Achievement and progression systems

## Technical Architecture

### Data Storage
- Persistent storage using Spark KV system
- Character data, house configuration, chat sessions
- Scene sessions and objectives
- User preferences and API keys

### AI Service Layer
- Abstracted AI service supporting multiple providers
- Proper error handling and fallback mechanisms
- Rate limiting and quota management
- Response quality validation

### Component Architecture
- Modular React components with TypeScript
- Custom hooks for data management
- Responsive design with Tailwind CSS
- Accessible UI components via Shadcn