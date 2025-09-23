// Minimal ambient declarations to ensure common globals are recognized by the typechecker
export { };

declare global {
  var console: Console;
  var fetch: typeof globalThis.fetch;
  interface Window { crypto?: Crypto; }
  function setTimeout(handler: (...args: unknown[]) => void, timeout?: number): number;
  function clearTimeout(handle?: number): void;
}
