import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      // React hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-function': 'warn',
    },
  },
  {
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.git/**',
      'RECOVER/**',
      // Legacy/backup files kept for reference but not part of lint scope
      'src/App-New.tsx',
      'src/App-Original.tsx',
      'src/index-recover.css',
      'src/components/CharacterCard.v2.tsx',
      'src/components/CharacterCard-recovered.tsx',
  // Unused/legacy components kept in src for reference but ignored by lint
  'src/components/AliResponseModal.tsx',
  'src/components/AutoCharacterCreator.tsx',
  'src/components/CharacterCreator.tsx',
  'src/components/CharacterCreatorRepo.tsx',
  'src/components/CharacterDMs.tsx',
  'src/components/CharacterFeed.tsx',
  'src/components/CharacterStories.tsx',
  'src/components/ChatInterface.tsx',
  'src/components/ConversationDebugger.tsx',
  'src/components/Copilot.tsx',
  'src/components/CopilotNew.tsx',
  'src/components/CopilotPresets.tsx',
  'src/components/CopilotRedesigned.tsx',
  'src/components/DataManager.tsx',
  'src/components/DevDashboard.tsx',
  'src/components/DesktopShell.tsx',
  'src/components/DesktopUI.tsx',
  'src/components/GiftManager.tsx',
  'src/components/GroupChatCreator.tsx',
  'src/components/HouseMap.tsx',
  'src/components/HouseView.tsx',
  'src/components/ImageGallery.tsx',
  'src/components/ImageSettingsPanel.tsx',
  'src/components/InterviewChat.tsx',
  'src/components/Layout.tsx',
  'src/components/PersistenceDebugger.tsx',
  'src/components/ProgressTracker.tsx',
  'src/components/QuickActionsManager.tsx',
  'src/components/SceneCreator.tsx',
  'src/components/SceneInterface.tsx',
  'src/components/SessionManager.tsx',
  'src/components/SettingsPage.tsx',
  'src/components/Sidebar.tsx',
  'src/components/UniversalChat.tsx',
  'src/components/UniversalToolbar.tsx',
  'src/components/WingmanSettings.tsx',
      // Type declaration files can produce noisy no-undef for globals
      '**/*.d.ts',
      '*.config.js',
      '*.config.ts',
    ],
  },
];
