import * as XLSX from 'xlsx';
import { PLAYERS_BY_ID } from '../data/players';
import type { GameState } from '../types';
import { formatDate, formatTime } from './format';
import { getPlayerStats, getTeamOutcome } from './stats';

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
      'ID Jugador': p.playerId,
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
            'ID Jugador': '',
            Jugador: '',
            'Tipo de tiro': '',
            Puntos: '',
          },
        ],
  );
  applyColumnWidths(playsSheet, [12, 8, 8, 16, 12, 18, 14, 8]);
  XLSX.utils.book_append_sheet(wb, playsSheet, 'Jugadas');

  const statsRows = getPlayerStats(state).map((s) => ({
    'ID Jugador': s.playerId,
    Jugador: s.playerName,
    Equipo: s.teamName,
    'Puntos totales': s.totalPoints,
    'Dobles convertidos': s.doubles,
    'Triples convertidos': s.triples,
    Resultado: getTeamOutcome(state, s.team),
  }));
  const statsSheet = XLSX.utils.json_to_sheet(
    statsRows.length > 0
      ? statsRows
      : [
          {
            'ID Jugador': '',
            Jugador: '',
            Equipo: '',
            'Puntos totales': '',
            'Dobles convertidos': '',
            'Triples convertidos': '',
            Resultado: '',
          },
        ],
  );
  applyColumnWidths(statsSheet, [12, 18, 16, 16, 20, 20, 12]);
  XLSX.utils.book_append_sheet(wb, statsSheet, 'Resumen por jugador');

  XLSX.writeFile(wb, `basquet-${fileTimestamp(state.startTime)}.xlsx`);
}

function applyColumnWidths(sheet: XLSX.WorkSheet, widths: number[]): void {
  sheet['!cols'] = widths.map((wch) => ({ wch }));
}
