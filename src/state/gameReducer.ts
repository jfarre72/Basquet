import type { GameState, Play, ShotType, Sport, TeamId } from '../types';

export const INITIAL_STATE: GameState = {
  sport: null,
  stage: 'sport',
  selectedPlayerIds: [],
  teams: {
    A: { name: 'Negro', playerIds: [] },
    B: { name: 'Blanco', playerIds: [] },
  },
  startTime: null,
  endTime: null,
  plays: [],
};

const DEFAULT_TEAM_NAMES: Record<Sport, { A: string; B: string }> = {
  basquet: { A: 'Negro', B: 'Blanco' },
  mundialito: { A: 'Equipo A', B: 'Equipo B' },
};

export type GameAction =
  | { type: 'SELECT_SPORT'; sport: Sport }
  | { type: 'BACK_TO_SPORT' }
  | { type: 'TOGGLE_PLAYER'; playerId: number }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'GO_TO_TEAMS' }
  | { type: 'BACK_TO_SELECTION' }
  | { type: 'ASSIGN_PLAYER_TO_TEAM'; playerId: number; team: TeamId }
  | { type: 'UNASSIGN_PLAYER'; playerId: number }
  | { type: 'CLEAR_TEAMS' }
  | { type: 'SHUFFLE_TEAMS' }
  | { type: 'SET_TEAM_NAME'; team: TeamId; name: string }
  | { type: 'START_GAME' }
  | {
      type: 'ADD_PLAY';
      team: TeamId;
      playerId: number;
      shotType: ShotType;
    }
  | {
      type: 'EDIT_PLAY';
      playId: string;
      updates: { playerId?: number; shotType?: ShotType };
    }
  | { type: 'DELETE_PLAY'; playId: string }
  | { type: 'FINISH_GAME' }
  | { type: 'RESET_GAME' };

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function pointsFor(shot: ShotType): 1 | 2 | 3 {
  if (shot === 'triple') return 3;
  if (shot === 'goal') return 1;
  return 2;
}

function minuteAt(startTime: number | null, timestamp: number): number {
  if (startTime == null) return 0;
  return Math.max(0, Math.floor((timestamp - startTime) / 60_000));
}

function withoutPlayer(ids: number[], playerId: number): number[] {
  return ids.filter((id) => id !== playerId);
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SELECT_SPORT': {
      const names = DEFAULT_TEAM_NAMES[action.sport];
      return {
        ...INITIAL_STATE,
        sport: action.sport,
        stage: 'selection',
        teams: {
          A: { name: names.A, playerIds: [] },
          B: { name: names.B, playerIds: [] },
        },
      };
    }

    case 'BACK_TO_SPORT':
      return { ...INITIAL_STATE };

    case 'TOGGLE_PLAYER': {
      const isSelected = state.selectedPlayerIds.includes(action.playerId);
      const selectedPlayerIds = isSelected
        ? withoutPlayer(state.selectedPlayerIds, action.playerId)
        : [...state.selectedPlayerIds, action.playerId];
      return { ...state, selectedPlayerIds };
    }

    case 'CLEAR_SELECTION':
      return { ...state, selectedPlayerIds: [] };

    case 'GO_TO_TEAMS': {
      const allowed = new Set(state.selectedPlayerIds);
      return {
        ...state,
        stage: 'teams',
        teams: {
          A: {
            ...state.teams.A,
            playerIds: state.teams.A.playerIds.filter((id) => allowed.has(id)),
          },
          B: {
            ...state.teams.B,
            playerIds: state.teams.B.playerIds.filter((id) => allowed.has(id)),
          },
        },
      };
    }

    case 'BACK_TO_SELECTION':
      return {
        ...state,
        stage: 'selection',
        teams: {
          A: { ...state.teams.A, playerIds: [] },
          B: { ...state.teams.B, playerIds: [] },
        },
      };

    case 'ASSIGN_PLAYER_TO_TEAM': {
      const other: TeamId = action.team === 'A' ? 'B' : 'A';
      const target = state.teams[action.team];
      const opposite = state.teams[other];
      return {
        ...state,
        teams: {
          ...state.teams,
          [action.team]: {
            ...target,
            playerIds: target.playerIds.includes(action.playerId)
              ? target.playerIds
              : [...target.playerIds, action.playerId],
          },
          [other]: {
            ...opposite,
            playerIds: withoutPlayer(opposite.playerIds, action.playerId),
          },
        },
      };
    }

    case 'UNASSIGN_PLAYER':
      return {
        ...state,
        teams: {
          A: {
            ...state.teams.A,
            playerIds: withoutPlayer(state.teams.A.playerIds, action.playerId),
          },
          B: {
            ...state.teams.B,
            playerIds: withoutPlayer(state.teams.B.playerIds, action.playerId),
          },
        },
      };

    case 'CLEAR_TEAMS':
      return {
        ...state,
        teams: {
          A: { ...state.teams.A, playerIds: [] },
          B: { ...state.teams.B, playerIds: [] },
        },
      };

    case 'SHUFFLE_TEAMS': {
      const shuffled = [...state.selectedPlayerIds];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const half = Math.ceil(shuffled.length / 2);
      return {
        ...state,
        teams: {
          A: { ...state.teams.A, playerIds: shuffled.slice(0, half) },
          B: { ...state.teams.B, playerIds: shuffled.slice(half) },
        },
      };
    }

    case 'SET_TEAM_NAME':
      return {
        ...state,
        teams: {
          ...state.teams,
          [action.team]: { ...state.teams[action.team], name: action.name },
        },
      };

    case 'START_GAME': {
      if (
        state.teams.A.playerIds.length === 0 ||
        state.teams.B.playerIds.length === 0
      ) {
        return state;
      }
      return {
        ...state,
        stage: 'game',
        startTime: Date.now(),
        endTime: null,
        plays: [],
      };
    }

    case 'ADD_PLAY': {
      const timestamp = Date.now();
      const play: Play = {
        id: makeId(),
        timestamp,
        minute: minuteAt(state.startTime, timestamp),
        team: action.team,
        playerId: action.playerId,
        shotType: action.shotType,
        points: pointsFor(action.shotType),
      };
      return { ...state, plays: [...state.plays, play] };
    }

    case 'EDIT_PLAY': {
      const plays = state.plays.map((play) => {
        if (play.id !== action.playId) return play;
        const shotType = action.updates.shotType ?? play.shotType;
        const playerId = action.updates.playerId ?? play.playerId;
        return {
          ...play,
          shotType,
          playerId,
          points: pointsFor(shotType),
        };
      });
      return { ...state, plays };
    }

    case 'DELETE_PLAY':
      return {
        ...state,
        plays: state.plays.filter((play) => play.id !== action.playId),
      };

    case 'FINISH_GAME':
      return { ...state, stage: 'finished', endTime: Date.now() };

    case 'RESET_GAME':
      return {
        ...state,
        stage: 'teams',
        startTime: null,
        endTime: null,
        plays: [],
      };

    default:
      return state;
  }
}
