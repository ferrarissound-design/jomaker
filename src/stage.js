export const TILE = 48;
export const BACKGROUND_IDS = ['tropicalSea', 'sunsetCoast', 'classic'];
export const DEFAULT_BACKGROUND = 'tropicalSea';

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
  crate: ['□', 'おせる箱', '#b9875f'],
  plate: ['▂', '感圧板', '#7e9ca5'],
  pressureBlock: ['▤', '圧力ブロック', '#5e9fb0'],
  cannon: ['➤', '大砲', '#596a72'],
  enemyDoor: ['▥', '全滅ドア', '#765f8f'],
  timerSwitch: ['◷', '時間スイッチ', '#d79c58'],
  timerBlock: ['▨', '時間ブロック', '#dfb074'],
  coin: ['●', 'コイン', '#ffd572'],
  spike: ['▲', 'トゲ', '#e98283'],
  enemy: ['◆', '小型肉食恐竜', '#c98a63'],
  flyingEnemy: ['⌁', 'プテラノドン', '#8aa6b8'],
  checkpoint: ['✦', 'チェック', '#6fb8d7'],
  start: ['⚑', 'スタート', '#77cfbf'],
  goal: ['⚐', 'ゴール', '#f4d67a']
};

export const PART_DEFAULTS = {
  movingPlatform: { axis: 'x', distance: 2, speed: 1.25 },
  cannon: { direction: 'right', interval: 1.65 },
  timerSwitch: { duration: 3.2 },
  warp: { target: '' }
};

export const clone = value => structuredClone(value);
export const defaultPropsFor = type => clone(PART_DEFAULTS[type] ?? {});

function newObject(type, x, y) {
  const props = defaultPropsFor(type);
  return Object.keys(props).length ? { type, x, y, props } : { type, x, y };
}

export function createStage() {
  return {
    version: 1,
    name: '名前のない冒険',
    width: 80,
    height: 14,
    background: DEFAULT_BACKGROUND,
    playerStart: { x: 2, y: 11 },
    objects: Array.from({ length: 80 }, (_, x) => ({ type: 'ground', x, y: 12 }))
      .concat({ type: 'goal', x: 24, y: 11 })
  };
}

export function resizeStage(stage, width) {
  if (!Number.isInteger(width) || width < 10 || width > 300) {
    throw new Error('ステージの長さは10〜300マスで指定してください');
  }
  if (stage.playerStart.x >= width) {
    throw new Error(`スタート位置より短くはできません（最低 ${stage.playerStart.x + 1} マス）`);
  }

  const oldWidth = stage.width;
  const floorY = stage.height - 2;
  const floorXs = new Set(
    stage.objects
      .filter(o => o.type === 'ground' && o.y === floorY)
      .map(o => o.x)
  );
  const hadFullFloor = Array.from({ length: oldWidth }, (_, x) => floorXs.has(x)).every(Boolean);

  stage.width = width;
  stage.objects = stage.objects.filter(o => o.x < width);

  if (width > oldWidth && hadFullFloor) {
    const occupied = new Set(stage.objects.map(o => `${o.x},${o.y}`));
    for (let x = oldWidth; x < width; x++) {
      const key = `${x},${floorY}`;
      if (!occupied.has(key)) stage.objects.push({ type: 'ground', x, y: floorY });
    }
  }

  return stage;
}

function validateProps(o) {
  if (o.props === undefined) return;
  if (!o.props || typeof o.props !== 'object' || Array.isArray(o.props)) {
    throw new Error('パーツ設定が正しくありません');
  }
  const finite = v => typeof v === 'number' && Number.isFinite(v);
  if (o.type === 'movingPlatform') {
    const axis = o.props.axis ?? 'x';
    const distance = o.props.distance ?? 2;
    const speed = o.props.speed ?? 1.25;
    if (!['x', 'y'].includes(axis) || !finite(distance) || distance < .5 || distance > 12 ||
        !finite(speed) || speed < .2 || speed > 4) throw new Error('動く足場の設定が正しくありません');
  }
  if (o.type === 'cannon') {
    const direction = o.props.direction ?? 'right';
    const interval = o.props.interval ?? 1.65;
    if (!['left', 'right'].includes(direction) || !finite(interval) || interval < .3 || interval > 8) {
      throw new Error('大砲の設定が正しくありません');
    }
  }
  if (o.type === 'timerSwitch') {
    const duration = o.props.duration ?? 3.2;
    if (!finite(duration) || duration < .5 || duration > 15) throw new Error('時間スイッチの設定が正しくありません');
  }
  if (o.type === 'warp') {
    const target = o.props.target ?? '';
    if (typeof target !== 'string' || target.length > 20 || (target && !/^\d+,\d+$/.test(target))) {
      throw new Error('ワープの設定が正しくありません');
    }
  }
}

export function validateStage(s) {
  if (!s || s.version !== 1 || typeof s.name !== 'string' || s.name.length > 60 ||
      !Number.isInteger(s.width) || s.width < 10 || s.width > 300 ||
      !Number.isInteger(s.height) || s.height < 8 || s.height > 40 ||
      !Array.isArray(s.objects) || s.objects.length > s.width * s.height ||
      (s.background !== undefined && !BACKGROUND_IDS.includes(s.background))) {
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
    validateProps(o);
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
  s.objects.push(newObject(type, x, y));
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
    this.draftKey = 'jomaker.draft.v1';
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

  saveDraft(stage, stageId = null) {
    validateStage(stage);
    if (stageId !== null && typeof stageId !== 'string') throw new Error('下書きデータを保存できません');
    const draft = {
      stageId,
      updatedAt: new Date().toISOString(),
      data: clone(stage)
    };
    this.storage.setItem(this.draftKey, JSON.stringify(draft));
    return clone(draft);
  }

  loadDraft() {
    const raw = this.storage.getItem(this.draftKey);
    if (!raw) return null;
    let draft;
    try {
      draft = JSON.parse(raw);
    } catch {
      throw new Error('下書きデータを読み込めません');
    }
    if (!draft || (draft.stageId !== null && typeof draft.stageId !== 'string') ||
        typeof draft.updatedAt !== 'string' || !draft.data) {
      throw new Error('下書きデータを読み込めません');
    }
    validateStage(draft.data);
    return clone(draft);
  }

  clearDraft() {
    if (typeof this.storage.removeItem === 'function') this.storage.removeItem(this.draftKey);
    else this.storage.setItem(this.draftKey, '');
  }
}
