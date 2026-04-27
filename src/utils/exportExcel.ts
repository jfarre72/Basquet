import * as XLSX from 'xlsx';
import { PLAYERS_BY_ID } from '../data/players';
import type { GameState } from '../types';
import { formatDate, formatTime } from './format';
import { getPlayerStats, getWinner } from './stats';

function fileTimestamp(ts: number | null): string {
  const d = new Date(ts ?? Date.now());
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
    d.getHours(),
  )}${pad(d.getMinutes())}`;
}

export function exportGameToExcel(state: GameState): void {
  const wb = XLSX.utils.book_new();

  const playsRows = [...state.plays]
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((p) => ({
      Fecha: formatDate(p.timestamp),
      Hora: formatTime(p.timestamp),
      Minuto: p.minute,
      Equipo: state.teams[p.team].name,
      Jugador: PLAYERS_BY_ID[p.playerId]?.name ?? `#${p.playerId}`,
      'Tipo de tiro': p.shotType === 'triple' ? 'Triple' : 'Doble',
      Puntos: p.points,
    }));

  const playsSheet = XLSX.utils.json_to_sheet(
    playsRows.length > 0
      ? playsRows
      : [
          {
            Fecha: '',
            Hora: '',
            Minuto: '',
            Equipo: '',
            Jugador: '',
            'Tipo de tiro': '',
            Puntos: '',
          },
        ],
  );
  XLSX.utils.book_append_sheet(wb, playsSheet, 'Jugadas');

  const statsRows = getPlayerStats(state).map((s) => ({
    Jugador: s.playerName,
    Equipo: s.teamName,
    'Puntos totales': s.totalPoints,
    'Dobles convertidos': s.doubles,
    'Triples convertidos': s.triples,
  }));
  const statsSheet = XLSX.utils.json_to_sheet(
    statsRows.length > 0
      ? statsRows
      : [
          {
            Jugador: '',
            Equipo: '',
            'Puntos totales': '',
            'Dobles convertidos': '',
            'Triples convertidos': '',
          },
        ],
  );
  XLSX.utils.book_append_sheet(wb, statsSheet, 'Resumen por jugador');

  const { winner, scoreA, scoreB } = getWinner(state);
  const winnerName =
    winner === 'tie'
      ? 'Empate'
      : winner === 'A'
        ? state.teams.A.name
        : state.teams.B.name;
  const resultSheet = XLSX.utils.json_to_sheet([
    {
      'Equipo A': state.teams.A.name,
      'Puntos Equipo A': scoreA,
      'Equipo B': state.teams.B.name,
      'Puntos Equipo B': scoreB,
      Ganador: winnerName,
    },
  ]);
  XLSX.utils.book_append_sheet(wb, resultSheet, 'Resultado');

  XLSX.writeFile(wb, `basquet-${fileTimestamp(state.startTime)}.xlsx`);
}
