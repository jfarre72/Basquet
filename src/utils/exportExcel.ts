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

function shotLabel(shot: string): string {
  if (shot === 'goal') return 'Gol';
  return shot === 'triple' ? 'Triple' : 'Doble';
}

export function exportGameToExcel(state: GameState): void {
  const isFutbol = state.sport === 'mundialito';
  const filePrefix = isFutbol ? 'mundialito' : 'basquet';
  const wb = XLSX.utils.book_new();

  const playsRows = [...state.plays]
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((p) =>
      isFutbol
        ? {
            Fecha: formatDate(p.timestamp),
            Hora: formatTime(p.timestamp),
            Minuto: p.minute,
            Equipo: state.teams[p.team].name,
            'ID Jugador': p.playerId,
            Jugador: PLAYERS_BY_ID[p.playerId]?.name ?? `#${p.playerId}`,
            Goles: p.points,
          }
        : {
            Fecha: formatDate(p.timestamp),
            Hora: formatTime(p.timestamp),
            Minuto: p.minute,
            Equipo: state.teams[p.team].name,
            'ID Jugador': p.playerId,
            Jugador: PLAYERS_BY_ID[p.playerId]?.name ?? `#${p.playerId}`,
            'Tipo de tiro': shotLabel(p.shotType),
            Puntos: p.points,
          },
    );

  const emptyPlaysRow = isFutbol
    ? {
        Fecha: '',
        Hora: '',
        Minuto: '',
        Equipo: '',
        'ID Jugador': '',
        Jugador: '',
        Goles: '',
      }
    : {
        Fecha: '',
        Hora: '',
        Minuto: '',
        Equipo: '',
        'ID Jugador': '',
        Jugador: '',
        'Tipo de tiro': '',
        Puntos: '',
      };

  const playsSheet = XLSX.utils.json_to_sheet(
    playsRows.length > 0 ? playsRows : [emptyPlaysRow],
  );
  applyColumnWidths(
    playsSheet,
    isFutbol ? [12, 8, 8, 16, 12, 18, 8] : [12, 8, 8, 16, 12, 18, 14, 8],
  );
  XLSX.utils.book_append_sheet(wb, playsSheet, isFutbol ? 'Goles' : 'Jugadas');

  const statsRows = getPlayerStats(state).map((s) =>
    isFutbol
      ? {
          'ID Jugador': s.playerId,
          Jugador: s.playerName,
          Equipo: s.teamName,
          'Goles totales': s.goals,
          Resultado: getTeamOutcome(state, s.team),
        }
      : {
          'ID Jugador': s.playerId,
          Jugador: s.playerName,
          Equipo: s.teamName,
          'Puntos totales': s.totalPoints,
          'Dobles convertidos': s.doubles,
          'Triples convertidos': s.triples,
          Resultado: getTeamOutcome(state, s.team),
        },
  );

  const emptyStatsRow = isFutbol
    ? {
        'ID Jugador': '',
        Jugador: '',
        Equipo: '',
        'Goles totales': '',
        Resultado: '',
      }
    : {
        'ID Jugador': '',
        Jugador: '',
        Equipo: '',
        'Puntos totales': '',
        'Dobles convertidos': '',
        'Triples convertidos': '',
        Resultado: '',
      };

  const statsSheet = XLSX.utils.json_to_sheet(
    statsRows.length > 0 ? statsRows : [emptyStatsRow],
  );
  applyColumnWidths(
    statsSheet,
    isFutbol ? [12, 18, 16, 16, 12] : [12, 18, 16, 16, 20, 20, 12],
  );
  XLSX.utils.book_append_sheet(wb, statsSheet, 'Resumen por jugador');

  XLSX.writeFile(wb, `${filePrefix}-${fileTimestamp(state.startTime)}.xlsx`);
}

function applyColumnWidths(sheet: XLSX.WorkSheet, widths: number[]): void {
  sheet['!cols'] = widths.map((wch) => ({ wch }));
}
