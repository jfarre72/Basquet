import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const ORANGE: [number, number, number] = [249, 115, 22];
const INK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [100, 116, 139];

export interface ShotPodiumRow {
  playerName: string;
  count: number;
}

export interface MinuteRow {
  minute: number;
  points: number;
}

export interface IndicadoresPdfInput {
  battle: {
    negro: number;
    blanco: number;
    empates: number;
    otros: number;
  };
  triples: ShotPodiumRow[];
  dobles: ShotPodiumRow[];
  topScorers: { playerName: string; points: number; doubles: number; triples: number }[];
  minuteSeries: MinuteRow[];
  playerFilterLabel: string;
}

export function exportIndicadoresToPdf(data: IndicadoresPdfInput): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...INK);
  doc.text('Basquet · Indicadores', margin, y);
  y += 8;
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(3);
  doc.line(margin, y, margin + 80, y);
  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(`Generado: ${formatNow()}`, margin, y);
  y += 22;

  // Negro vs Blanco
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text('Negro vs Blanco', margin, y);
  y += 10;
  const cardW = pageWidth - margin * 2;
  const cardH = 56;
  const total = data.battle.negro + data.battle.blanco;
  const negroPct = total > 0 ? data.battle.negro / total : 0.5;
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(margin, y, cardW, cardH, 10, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('NEGRO', margin + 16, y + 22);
  doc.setFontSize(20);
  doc.text(`${data.battle.negro}`, margin + 16, y + 46);
  doc.setTextColor(...INK);
  doc.setFontSize(11);
  doc.text('BLANCO', margin + cardW - 16, y + 22, { align: 'right' });
  doc.setFontSize(20);
  doc.text(`${data.battle.blanco}`, margin + cardW - 16, y + 46, { align: 'right' });
  // barra al medio
  const barX = margin + 90;
  const barW = cardW - 180;
  const barY = y + cardH / 2 - 6;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(barX, barY, barW, 12, 6, 6, 'F');
  doc.setFillColor(...ORANGE);
  doc.roundedRect(barX, barY, barW * negroPct, 12, 6, 6, 'F');
  y += cardH + 18;

  doc.setTextColor(...MUTED);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const meta: string[] = [];
  if (data.battle.empates > 0) meta.push(`${data.battle.empates} empates`);
  if (data.battle.otros > 0) meta.push(`${data.battle.otros} con otros nombres`);
  if (meta.length > 0) {
    doc.text(meta.join(' · '), margin, y);
    y += 16;
  }

  // Podios
  if (data.triples.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...INK);
    doc.text('Podio de triples', margin, y);
    y += 6;
    autoTable(doc, {
      startY: y,
      head: [['#', 'Jugador', 'Triples']],
      body: data.triples.map((r, idx) => [
        `${idx + 1}`,
        r.playerName,
        `${r.count}`,
      ]),
      theme: 'grid',
      headStyles: { fillColor: ORANGE, textColor: INK, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 6 },
      margin: { left: margin, right: margin },
    });
    y = endY(doc) + 18;
  }

  if (data.dobles.length > 0) {
    if (y > doc.internal.pageSize.getHeight() - 140) {
      doc.addPage();
      y = margin;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...INK);
    doc.text('Podio de dobles', margin, y);
    y += 6;
    autoTable(doc, {
      startY: y,
      head: [['#', 'Jugador', 'Dobles']],
      body: data.dobles.map((r, idx) => [
        `${idx + 1}`,
        r.playerName,
        `${r.count}`,
      ]),
      theme: 'grid',
      headStyles: { fillColor: ORANGE, textColor: INK, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 6 },
      margin: { left: margin, right: margin },
    });
    y = endY(doc) + 18;
  }

  if (data.topScorers.length > 0) {
    if (y > doc.internal.pageSize.getHeight() - 160) {
      doc.addPage();
      y = margin;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...INK);
    doc.text('Goleadores', margin, y);
    y += 6;
    autoTable(doc, {
      startY: y,
      head: [['#', 'Jugador', 'Dobles', 'Triples', 'Puntos']],
      body: data.topScorers.map((r, idx) => [
        `${idx + 1}`,
        r.playerName,
        `${r.doubles}`,
        `${r.triples}`,
        `${r.points}`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: INK, textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 5 },
      margin: { left: margin, right: margin },
    });
    y = endY(doc) + 18;
  }

  if (data.minuteSeries.length > 0) {
    if (y > doc.internal.pageSize.getHeight() - 180) {
      doc.addPage();
      y = margin;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...INK);
    doc.text(`Puntos por minuto · ${data.playerFilterLabel}`, margin, y);
    y += 6;
    autoTable(doc, {
      startY: y,
      head: [["Min", 'Puntos']],
      body: data.minuteSeries.map((r) => [`${r.minute}'`, `${r.points}`]),
      theme: 'striped',
      headStyles: { fillColor: INK, textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4 },
      margin: { left: margin, right: margin },
    });
  }

  doc.save('indicadores-basquet.pdf');
}

function endY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
    .finalY;
}

function formatNow(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}
