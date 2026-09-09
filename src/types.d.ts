/** Versioned, device-independent interchange contract. Coordinates are grid cells. */
export type PartType =
  | 'ground' | 'block' | 'platform' | 'movingPlatform' | 'spring' | 'breakable'
  | 'key' | 'door' | 'switch' | 'switchBlock' | 'warp' | 'crate' | 'plate'
  | 'pressureBlock' | 'cannon' | 'enemyDoor' | 'timerSwitch' | 'timerBlock'
  | 'coin' | 'spike' | 'enemy' | 'flyingEnemy' | 'checkpoint' | 'goal';

export type BackgroundId = 'tropicalSea' | 'sunsetCoast' | 'classic';
export type PartProps = Record<string, string | number | boolean>;

export interface GridPosition { x: number; y: number; }
export interface StageObject extends GridPosition { type: PartType; props?: PartProps; }
export interface StageData {
  version: 1;
  name: string;
  width: number;
  height: number;
  background?: BackgroundId;
  playerStart: GridPosition;
  objects: StageObject[];
}
export interface SavedStage {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  data: StageData;
}

export interface StageDraft {
  stageId: string | null;
  updatedAt: string;
  data: StageData;
}
