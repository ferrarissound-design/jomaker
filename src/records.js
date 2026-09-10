const STORAGE_KEY = 'jomaker.records.v1';
const LIMIT = 40;

// Exact, stable course identity: renaming/recoloring preserves records; layout
// and mechanics changes create a separate challenge. Object order matters for warps.
export function courseKey(stage) {
  const canonical = value => Array.isArray(value) ? value.map(canonical)
    : value && typeof value === 'object'
      ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
      : value;
  return JSON.stringify(canonical({ width: stage.width, height: stage.height,
    playerStart: stage.playerStart, objects: stage.objects }));
}

export function formatTime(seconds) {
  const ticks = Math.max(0, Math.round(seconds * 100));
  return `${Math.floor(ticks / 6000)}:${String(Math.floor(ticks / 100) % 60).padStart(2, '0')}.${String(ticks % 100).padStart(2, '0')}`;
}

function validRecord(r) {
  return r && typeof r.key === 'string' && Number.isFinite(r.bestTime) && r.bestTime >= 0
    && Number.isSafeInteger(r.clears) && r.clears > 0
    && typeof r.noMiss === 'boolean' && typeof r.allCoins === 'boolean';
}

export class RecordStore {
  constructor(storage) { this.storage = storage; }
  read() {
    try {
      const data = JSON.parse((this.storage ?? globalThis.localStorage).getItem(STORAGE_KEY) ?? '[]');
      return Array.isArray(data) ? data.filter(validRecord).slice(0, LIMIT) : [];
    } catch { return []; }
  }
  get(stage) { const key = courseKey(stage); return this.read().find(r => r.key === key) ?? null; }
  save(stage, result) {
    if (!Number.isFinite(result.time) || result.time < 0 || !Number.isSafeInteger(result.deaths)
      || result.deaths < 0 || !Number.isSafeInteger(result.coins) || result.coins < 0) throw new Error('Invalid clear result');
    const key = courseKey(stage), rows = this.read(), previous = rows.find(r => r.key === key);
    const total = stage.objects.filter(o => o.type === 'coin').length;
    const record = { key, bestTime: Math.min(previous?.bestTime ?? Infinity, result.time),
      clears: (previous?.clears ?? 0) + 1,
      noMiss: Boolean(previous?.noMiss || result.deaths === 0),
      allCoins: Boolean(previous?.allCoins || (total > 0 && result.coins === total)) };
    let saved = true;
    try { (this.storage ?? globalThis.localStorage).setItem(STORAGE_KEY,
      JSON.stringify([record, ...rows.filter(r => r.key !== key)].slice(0, LIMIT))); }
    catch { saved = false; }
    return { record, saved, firstClear: !previous,
      newBest: Boolean(previous && result.time < previous.bestTime),
      improvement: previous ? Math.max(0, previous.bestTime - result.time) : 0 };
  }
}
