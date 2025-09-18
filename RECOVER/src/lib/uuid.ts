export function uuid() {
  // Use globalThis.crypto where available (browser or modern runtimes).
  const c = (globalThis as any).crypto as Crypto | undefined;
  if (c && typeof (c as any).randomUUID === 'function') return (c as any).randomUUID();
  const b = new Uint8Array(16);
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(b as any);
  } else {
    // fallback to Math.random — not cryptographically secure but fine for stubs/tests
    for (let i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256);
  }
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map(x=>x.toString(16).padStart(2,'0')).join('');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
