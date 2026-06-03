import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PLAYERS_BY_ID } from '../data/players';
import type { GameState } from '../types';
import { formatDate, formatTime } from './format';
import { getPlayerStats, getPodium, getWinner } from './stats';

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

export function exportGameToPdf(state: GameState): void {
  const isFutbol = state.sport === 'mundialito';
  const filePrefix = isFutbol ? 'mundialito' : 'basquet';
  const title = isFutbol
    ? 'Mundialito · Resumen del partido'
    : 'Basquet · Resumen del partido';
  const podiumTitle = isFutbol ? 'Top goleadores' : 'Podio de goleadores';
  const pointsLabel = isFutbol ? 'Goles' : 'Puntos';

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  const orange: [number, number, number] = [249, 115, 22];
  const sky: [number, number, number] = [56, 189, 248];
  const accent: [number, number, number] = isFutbol ? sky : orange;
  const ink: [number, number, number] = [15, 23, 42];
  const muted: [number, number, number] = [100, 116, 139];

  const { winner, scoreA, scoreB } = getWinner(state);
  const winnerName =
    winner === 'tie'
      ? 'Empate'
      : winner === 'A'
        ? state.teams.A.name
        : state.teams.B.name;
  const startedAt = state.startTime ?? Date.now();
  const endedAt = state.endTime ?? Date.now();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...ink);
  doc.text(title, margin, y);
  y += 8;

  doc.setDrawColor(...accent);
  doc.setLineWidth(3);
  doc.line(margin, y, margin + 80, y);
  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...muted);
  doc.text(
    `Fecha: ${formatDate(startedAt)}   Inicio: ${formatTime(
      startedAt,
    )}   Fin: ${formatTime(endedAt)}`,
    margin,
    y,
  );
  y += 22;

  doc.setFillColor(15, 23, 42);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 70, 10, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(state.teams.A.name, margin + 24, y + 26);
  doc.text(state.teams.B.name, pageWidth - margin - 24, y + 26, {
    align: 'right',
  });
  doc.setFontSize(34);
  doc.setTextColor(...accent);
  doc.text(`${scoreA}`, margin + 24, y + 58);
  doc.setTextColor(255, 255, 255);
  doc.text(`${scoreB}`, pageWidth - margin - 24, y + 58, { align: 'right' });
  doc.setFontSize(11);
  doc.setTextColor(...muted);
  doc.text('VS', pageWidth / 2, y + 42, { align: 'center' });
  y += 90;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...ink);
  doc.text(
    winner === 'tie' ? 'Resultado: empate' : `Ganador: ${winnerName}`,
    margin,
    y,
  );
  y += 18;

  const podium = getPodium(getPlayerStats(state));
  if (podium.length > 0) {
    doc.setFontSize(13);
    doc.setTextColor(...ink);
    doc.text(podiumTitle, margin, y);
    y += 6;
    autoTable(doc, {
      startY: y,
      head: [['#', 'Jugador', 'Equipo', pointsLabel]],
      body: podium.map((p, idx) => [
        `${idx + 1}`,
        p.playerName,
        p.teamName,
        `${isFutbol ? p.goals : p.totalPoints}`,
      ]),
      theme: 'grid',
      headStyles: { fillColor: accent, textColor: ink, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 6 },
      margin: { left: margin, right: margin },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 18;
  }

  const stats = getPlayerStats(state).sort(
    (a, b) => b.totalPoints - a.totalPoints,
  );
  doc.setTextColor(...ink);
  doc.text('Resumen por jugador', margin, y);
  y += 6;
  autoTable(doc, {
    startY: y,
    head: isFutbol
      ? [['Jugador', 'Equipo', 'Goles']]
      : [['Jugador', 'Equipo', '2pt', '3pt', 'Total']],
    body: stats.map((s) =>
      isFutbol
        ? [s.playerName, s.teamName, `${s.goals}`]
        : [
            s.playerName,
            s.teamName,
            `${s.doubles}`,
            `${s.triples}`,
            `${s.totalPoints}`,
          ],
    ),
    theme: 'striped',
    headStyles: { fillColor: ink, textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 6 },
    margin: { left: margin, right: margin },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
    .finalY + 18;

  if (state.plays.length > 0) {
    if (y > doc.internal.pageSize.getHeight() - 120) {
      doc.addPage();
      y = margin;
    }
    doc.setTextColor(...ink);
    doc.text(isFutbol ? 'Detalle de goles' : 'Detalle de jugadas', margin, y);
    y += 6;
    autoTable(doc, {
      startY: y,
      head: isFutbol
        ? [['Min', 'Hora', 'Equipo', 'Jugador', 'Goles']]
        : [['Min', 'Hora', 'Equipo', 'Jugador', 'Tiro', 'Pts']],
      body: [...state.plays]
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((p) =>
          isFutbol
            ? [
                `${p.minute}'`,
                formatTime(p.timestamp),
                state.teams[p.team].name,
                PLAYERS_BY_ID[p.playerId]?.name ?? `#${p.playerId}`,
                `${p.points}`,
              ]
            : [
                `${p.minute}'`,
                formatTime(p.timestamp),
                state.teams[p.team].name,
                PLAYERS_BY_ID[p.playerId]?.name ?? `#${p.playerId}`,
                shotLabel(p.shotType),
                `${p.points}`,
              ],
        ),
      theme: 'grid',
      headStyles: { fillColor: ink, textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 5 },
      margin: { left: margin, right: margin },
    });
  }

  doc.save(`${filePrefix}-${fileTimestamp(state.startTime)}.pdf`);
}
