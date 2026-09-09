export const TILE = 48;
export const PARTS = {
  ground: ['▰', '地面', '#4a8978'],
  block: ['▣', 'ブロック', '#eda85c'],
  platform: ['━', '足場', '#81b6bc'],
  movingPlatform: ['↔', '動く足場', '#65aebc'],
  spring: ['⌃', 'バネ', '#f3a65a'],
  breakable: ['▧', 'こわせる', '#d99a67'],
  key: ['⚿', 'カギ', '#f1c35b'],
  door: ['▥', 'トビラ', '#8c6c58'],
  switch: ['◉', 'スイッチ', '#ef8a68'],
  switchBlock: ['▦', '切替ブロック', '#e66f69'],
  warp: ['◎', 'ワープ', '#7994db'],
  coin: ['●', 'コイン', '#ffd572'],
  spike: ['▲', 'トゲ', '#e98283'],
  enemy: ['◆', '敵', '#b798d6'],
  checkpoint: ['✦', 'チェック', '#6fb8d7'],
  start: ['⚑', 'スタート', '#77cfbf'],
  goal: ['⚐', 'ゴール', '#f4d67a']
};
export const clone = value => structuredClone(value);

export function createStage() {
  return {
    version: 1,
    name: '名前のない冒険',
    width: 80,
    height: 14,
    playerStart: { x: 2, y: 11 },
    objects: Array.from({ length: 80 }, (_, x) => ({ type: 'ground', x, y: 12 }))
      .concat({ type: 'goal', x: 24, y: 11 })
  };
}

export function validateStage(s) {
  if (!s || s.version !== 1 || typeof s.name !== 'string' || s.name.length > 60 ||
      !Number.isInteger(s.width) || s.width < 10 || s.width > 300 ||
      !Number.isInteger(s.height) || s.height < 8 || s.height > 40 ||
      !Array.isArray(s.objects) || s.objects.length > s.width * s.height) {
    throw new Error('ステージ形式が正しくありません');
  }
  const inside = p => p && Number.isInteger(p.x) && Number.isInteger(p.y) &&
    p.x >= 0 && p.x < s.width && p.y >= 0 && p.y < s.height;
  if (!inside(s.playerStart)) throw new Error('開始位置が正しくありません');

  const occupied = new Set();
  for (const o of s.objects) {
    const key = `${o.x},${o.y}`;
    if (!inside(o) || !PARTS[o.type] || o.type === 'start' || occupied.has(key)) {
      throw new Error('パーツ配置が正しくありません');
    }
    occupied.add(key);
  }
  return s;
}

function applyPlace(s, type, x, y) {
  const atIndex = s.objects.findIndex(o => o.x === x && o.y === y);
  const at = atIndex >= 0 ? s.objects[atIndex] : null;

  if (type === 'start') {
    if (s.playerStart.x === x && s.playerStart.y === y && !at) return false;
    s.playerStart = { x, y };
    if (at) s.objects.splice(atIndex, 1);
    return true;
  }

  if (s.playerStart.x === x && s.playerStart.y === y && type !== 'erase') return false;

  if (type === 'erase') {
    if (!at) return false;
    s.objects.splice(atIndex, 1);
    return true;
  }

  if (type === 'goal') {
    if (at?.type === 'goal') return false;
    s.objects = s.objects.filter(o => o.type !== 'goal' && (o.x !== x || o.y !== y));
    s.objects.push({ type, x, y });
    return true;
  }

  if (at?.type === type) return false;
  if (at) s.objects.splice(atIndex, 1);
  s.objects.push({ type, x, y });
  return true;
}

export class StageEditor {
  constructor(stage) {
    this.stage = clone(stage);
    this.undoStack = [];
    this.redoStack = [];
    this.strokeBefore = null;
  }

  remember(before) {
    if (JSON.stringify(before) === JSON.stringify(this.stage)) return false;
    this.undoStack.push(before);
    if (this.undoStack.length > 100) this.undoStack.shift();
    this.redoStack = [];
    return true;
  }

  change(fn) {
    const before = clone(this.stage);
    fn(this.stage);
    this.remember(before);
  }

  place(type, x, y) {
    if (x < 0 || y < 0 || x >= this.stage.width || y >= this.stage.height) return false;
    const before = clone(this.stage);
    if (!applyPlace(this.stage, type, x, y)) return false;
    return this.remember(before);
  }

  beginStroke() {
    if (!this.strokeBefore) this.strokeBefore = clone(this.stage);
  }

  strokePlace(type, x, y) {
    if (x < 0 || y < 0 || x >= this.stage.width || y >= this.stage.height) return false;
    if (!this.strokeBefore) this.beginStroke();
    return applyPlace(this.stage, type, x, y);
  }

  endStroke() {
    if (!this.strokeBefore) return false;
    const before = this.strokeBefore;
    this.strokeBefore = null;
    return this.remember(before);
  }

  undo() {
    if (this.strokeBefore) this.endStroke();
    if (this.undoStack.length) {
      this.redoStack.push(clone(this.stage));
      this.stage = this.undoStack.pop();
    }
  }

  redo() {
    if (this.strokeBefore) this.endStroke();
    if (this.redoStack.length) {
      this.undoStack.push(clone(this.stage));
      this.stage = this.redoStack.pop();
    }
  }
}

export class StageStore {
  constructor(storage = localStorage) {
    this.storage = storage;
    this.key = 'jomaker.stages.v1';
  }

  list() {
    const raw = this.storage.getItem(this.key);
    if (!raw) return [];
    const rows = JSON.parse(raw);
    if (!Array.isArray(rows)) throw new Error('保存データを読み込めません');
    for (const row of rows) {
      validateStage(row.data);
      if (typeof row.id !== 'string') throw new Error('保存データを読み込めません');
    }
    return rows;
  }

  save(stage, id) {
    validateStage(stage);
    const rows = this.list();
    const previous = rows.find(r => r.id === id);
    const now = new Date().toISOString();
    const row = {
      id: previous?.id ?? crypto.randomUUID(),
      name: stage.name,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
      data: clone(stage)
    };
    this.storage.setItem(this.key, JSON.stringify([row, ...rows.filter(r => r.id !== row.id)]));
    return row.id;
  }

  remove(id) {
    this.storage.setItem(this.key, JSON.stringify(this.list().filter(r => r.id !== id)));
  }
}
