export type TeamId = 'A' | 'B';

export type ShotType = 'double' | 'triple';

export type Stage = 'selection' | 'teams' | 'game' | 'finished';

export type Section =
  | 'home'
  | 'leyendas'
  | 'informe'
  | 'indicadores'
  | 'jugadores'
  | 'jugadas'
  | 'armado'
  | 'contador'
  | 'galeria';

export interface Player {
  id: number;
  name: string;
}

export interface Play {
  id: string;
  /** Real epoch ms when the play was recorded. */
  timestamp: number;
  /** Whole minutes elapsed since the game started. */
  minute: number;
  team: TeamId;
  playerId: number;
  shotType: ShotType;
  points: 2 | 3;
}

export interface TeamData {
  name: string;
  playerIds: number[];
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface GameState {
  stage: Stage;
  selectedPlayerIds: number[];
  teams: { A: TeamData; B: TeamData };
  startTime: number | null;
  endTime: number | null;
  plays: Play[];
  saveStatus: SaveStatus;
  saveError: string | null;
  savedMatchId: string | null;
  loadedDraftId: string | null;
  scheduledDate: string | null;
}
