# Character Creator House - Product Requirements Document

A virtual house where users create, customize, and interact with AI characters in an immersive social environment with progression systems, room building, and advanced AI integration.

**Experience Qualities**: 
1. **Immersive** - Deep character relationships and living world simulation
2. **Customizable** - Every aspect from prompts to progression can be tailored
3. **Social** - Rich group and individual interactions with visual feedback

**Complexity Level**: Complex Application (advanced functionality, accounts)
- Requires sophisticated state management, multiple AI integrations, character progression systems, and real-time interaction features

## Essential Features

### Character Creation & Management
- **Functionality**: In-depth character builder with stats, roles, skills, classes, and visual customization
- **Purpose**: Create unique, personalized AI companions with distinct personalities and abilities
- **Trigger**: "Create Character" button or character editor access
- **Progression**: Character creator → Basic info → Appearance → Personality → Stats/Skills → AI prompts → Save → House placement
- **Success criteria**: Characters have distinct personalities, remember conversations, and evolve over time

### Interactive House Environment  
- **Functionality**: Visual house layout with expandable rooms and facilities
- **Purpose**: Provide spatial context for character interactions and progression
- **Trigger**: Main house view or room management interface
- **Progression**: House overview → Room selection → Character placement → Facility management → Upgrades
- **Success criteria**: Users can build rooms, assign characters, and see visual representation of activities

### Multi-Modal Chat System
- **Functionality**: Individual and group chat with Discord-like interface
- **Purpose**: Enable meaningful conversations and relationship building
- **Trigger**: Click character or enter group chat
- **Progression**: Character selection → Chat interface → Message exchange → Relationship tracking → Memory persistence
- **Success criteria**: Natural conversations with context awareness and relationship progression

### AI Integration Hub
- **Functionality**: Support for OpenRouter (DeepSeek 3.1, GPT-4, R1) and Venice AI image generation
- **Purpose**: Power conversations and generate visual content
- **Trigger**: Behind-the-scenes during interactions or explicit image generation
- **Progression**: User input → AI service selection → API call → Response processing → Display
- **Success criteria**: Seamless AI responses with fallback options and image generation capabilities

### House Copilot System
- **Functionality**: Right sidebar assistant managing character behavior, needs, and house operations  
- **Purpose**: Automate character maintenance and provide insights
- **Trigger**: Always active, updates in real-time
- **Progression**: Monitor characters → Identify needs → Suggest actions → Execute commands → Report status
- **Success criteria**: Characters stay "online", needs are managed, and users receive helpful guidance

### Character Progression & Economy
- **Functionality**: Relationship tracking, gift system, skill progression, and unlockables
- **Purpose**: Create engagement through meaningful character development
- **Trigger**: Interactions, gift giving, training activities
- **Progression**: Interaction → Relationship points → Skill gains → Unlock rewards → Enhanced abilities
- **Success criteria**: Clear progression feedback and meaningful character growth

## Edge Case Handling
- **API Failures**: Fallback to alternative AI services or cached responses
- **Character Memory Limits**: Implement conversation summarization and key memory retention
- **Room Capacity**: Prevent overcrowding with capacity limits and expansion requirements  
- **Export Errors**: Validate character data before SillyTavern export with error reporting
- **Concurrent Chats**: Queue system for simultaneous character interactions
- **Invalid Prompts**: Template validation and safe defaults for user-configured prompts

## Design Direction
The design should feel like a cozy, magical digital home - warm and inviting yet sophisticated, with subtle animations that bring characters to life. Minimal interface that emphasizes character interactions over UI chrome.

## Color Selection
Custom palette - A warm, inviting theme that feels like a lived-in magical home
- **Primary Color**: Warm amber (oklch(0.75 0.15 65)) - Communicates comfort and home-like warmth
- **Secondary Colors**: Soft cream (oklch(0.95 0.02 85)) for cards, deep forest (oklch(0.35 0.08 155)) for accents
- **Accent Color**: Magical purple (oklch(0.65 0.25 285)) for interactive elements and highlights
- **Foreground/Background Pairings**: 
  - Background (Soft Cream): Dark charcoal text (oklch(0.25 0.02 265)) - Ratio 12.1:1 ✓
  - Primary (Warm Amber): White text (oklch(1 0 0)) - Ratio 4.8:1 ✓  
  - Accent (Magical Purple): White text (oklch(1 0 0)) - Ratio 5.2:1 ✓
  - Card (Cream): Dark charcoal text (oklch(0.25 0.02 265)) - Ratio 12.1:1 ✓

## Font Selection  
Typefaces should feel approachable yet sophisticated, like a well-designed home interface - Inter for its clarity and warmth with accent fonts for character dialogue.

- **Typographic Hierarchy**:
  - H1 (House Title): Inter Bold/32px/tight letter spacing
  - H2 (Character Names): Inter SemiBold/24px/normal spacing  
  - H3 (Room Titles): Inter Medium/20px/normal spacing
  - Body (Chat/UI): Inter Regular/16px/relaxed line height
  - Character Speech: Inter Italic/16px/expressive spacing

## Animations
Subtle, home-like animations that make the space feel alive - characters should appear to "live" in their rooms with gentle movement and responsive interactions that feel natural rather than mechanical.

- **Purposeful Meaning**: Animations communicate character presence, room activity, and relationship warmth
- **Hierarchy of Movement**: Character interactions > Room transitions > UI feedback > Ambient details

## Component Selection
- **Components**: Cards for character profiles, Dialog for character editor, Tabs for different house sections, Sidebar for copilot, Textarea for chat input, Avatar for character representations, Progress for relationship/skill bars
- **Customizations**: Custom character card layouts, room visualization components, chat bubble variants, relationship indicators
- **States**: Hover effects on characters (slight glow), active room highlighting, typing indicators in chat, notification badges on copilot
- **Icon Selection**: Home/house icons, heart for relationships, gift box for presents, chat bubbles, settings gear, plus for creation
- **Spacing**: Consistent 4/8/16/24px spacing scale for cozy, organized feeling
- **Mobile**: Stack sidebar below on mobile, collapsible character list, swipe navigation between rooms, responsive chat interface