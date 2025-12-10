const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas

function now() {
  return Date.now();
}

export function getCachedData(key, ttlMs = DEFAULT_TTL_MS) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!Array.isArray(parsed.data)) return null;

    const isFresh = parsed.ts && now() - parsed.ts < ttlMs;
    return isFresh ? parsed.data : null;
  } catch (error) {
    console.warn(`[referenceCache] No se pudo leer caché ${key}`, error);
    return null;
  }
}

export function setCachedData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: now(), data }));
  } catch (error) {
    console.warn(`[referenceCache] No se pudo guardar caché ${key}`, error);
  }
}
