// Lightweight logger wrapper that safely calls console if available.
type ConsoleLike = {
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
};

const c = (globalThis as unknown as { console?: ConsoleLike }).console;

export const logger: ConsoleLike = {
  log: (...args: unknown[]) => {
    try { c?.log(...args); } catch { /* ignore */ }
  },
  debug: (...args: unknown[]) => {
    try {
      if (c?.debug) {
        c.debug(...args);
      } else {
        c?.log(...args);
      }
    } catch {
      /* ignore */
    }
  },
  warn: (...args: unknown[]) => {
    try { c?.warn(...args); } catch { /* ignore */ }
  },
  error: (...args: unknown[]) => {
    try { c?.error(...args); } catch { /* ignore */ }
  }
};
