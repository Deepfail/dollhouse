// Project-level ambient globals to reduce false-positive "not defined" lints
// Minimal runtime globals when DOM lib isn't available to the checker.
// We prefer to rely on the TS DOM lib, but keep these minimal shims for other environments.
declare const window: Window;
declare const document: Document;
declare const fetch: typeof globalThis.fetch;
declare const URL: typeof globalThis.URL;
declare const crypto: typeof globalThis.crypto;
declare const console: Console;
declare function setTimeout(handler: (...args: unknown[]) => void, timeout?: number): number;
declare function clearTimeout(handle?: number): void;
