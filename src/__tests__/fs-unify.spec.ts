import { describe, expect, it } from 'vitest';

// Must not depend on legacy web storage.
describe('legacy storage removed', () => {
  it('no local/sessionStorage references', async () => {
    const files = await import.meta.glob('../**/*.{ts,tsx}', { query: '?raw', import: 'default' });
    for (const load of Object.values(files)) {
      const src = await (load as any)();
      expect(src).not.toMatch(/\blocalStorage\b/);
      expect(src).not.toMatch(/\bsessionStorage\b/);
    }
  });
});

// Minimal storage surface must exist for characters.
describe('characters repository shape', () => {
  it('has basic CRUD functions', async () => {
    const mod = await import('../repo/characters');
    const fns = ['listCharacters','createCharacter','updateCharacter','deleteCharacter'];
    fns.forEach(fn => expect(typeof (mod as any)[fn]).toBe('function'));
  });
});

// Task 2: Repository surface for chats/messages/assets/settings/apiKeys
describe('repository surface complete', () => {
  it('chats repository has CRUD + FK queries', async () => {
    const mod = await import('../repo/chats');
    const fns = ['listChats','listChatsByCharacter','createChat','updateChat','deleteChat','getChatById'];
    fns.forEach(fn => expect(typeof (mod as any)[fn]).toBe('function'));
  });

  it('messages repository has CRUD + FK queries', async () => {
    const mod = await import('../repo/messages');
    const fns = ['listMessages','createMessage','updateMessage','deleteMessage','getMessageById'];
    fns.forEach(fn => expect(typeof (mod as any)[fn]).toBe('function'));
  });

  it('assets repository has CRUD + FK queries', async () => {
    const mod = await import('../repo/assets');
    const fns = ['listAssets','listAssetsByOwner','createAsset','updateAsset','deleteAsset','getAssetById'];
    fns.forEach(fn => expect(typeof (mod as any)[fn]).toBe('function'));
  });

  it('settings repository has CRUD functions', async () => {
    const mod = await import('../repo/settings');
    const fns = ['listSettings','getSetting','setSetting','deleteSetting'];
    fns.forEach(fn => expect(typeof (mod as any)[fn]).toBe('function'));
  });

  it('apiKeys repository has CRUD functions', async () => {
    const mod = await import('../repo/apiKeys');
    const fns = ['listApiKeys','createApiKey','updateApiKey','deleteApiKey','getApiKeyById'];
    fns.forEach(fn => expect(typeof (mod as any)[fn]).toBe('function'));
  });
});
