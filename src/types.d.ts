/** Versioned, device-independent interchange contract. Coordinates are grid cells. */
export type PartType = 'ground' | 'block' | 'platform' | 'coin' | 'spike' | 'enemy' | 'goal';
export interface GridPosition { x: number; y: number; }
export interface StageObject extends GridPosition { type: PartType; }
export interface StageData {
  version: 1;
  name: string;
  width: number;
  height: number;
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
