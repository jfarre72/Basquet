export type TeamId = 'A' | 'B';

export type Sport = 'basquet' | 'mundialito';

export type ShotType = 'double' | 'triple' | 'goal';

export type Stage = 'sport' | 'selection' | 'teams' | 'game' | 'finished';

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
  points: 1 | 2 | 3;
}

export interface TeamData {
  name: string;
  playerIds: number[];
}

export interface GameState {
  sport: Sport | null;
  stage: Stage;
  selectedPlayerIds: number[];
  teams: { A: TeamData; B: TeamData };
  startTime: number | null;
  endTime: number | null;
  plays: Play[];
}
