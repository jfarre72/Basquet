import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { MonthBucket, PlayerSeasonStat, Tournament } from './seasonStats';

const ORANGE: [number, number, number] = [249, 115, 22];
const INK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [100, 116, 139];

const TOURNAMENT_LABEL: Record<Tournament, string> = {
  completo: 'Anual',
  apertura: 'Apertura',
  clausura: 'Clausura',
};

export interface InformePdfInput {
  year: number;
  tournament: Tournament;
  jugados: number;
  faltantes: number;
  podium: PlayerSeasonStat[];
  monthly: MonthBucket[];
  stats: PlayerSeasonStat[];
}

export function exportInformeToPdf(data: InformePdfInput): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...INK);
  doc.text('Basquet · Informe', margin, y);
  y += 8;
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(3);
  doc.line(margin, y, margin + 80, y);
  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(
    `Año: ${data.year}   Torneo: ${TOURNAMENT_LABEL[data.tournament]}   Generado: ${formatNow()}`,
    margin,
    y,
  );
  y += 22;

  // KPIs
  drawKpis(doc, margin, y, pageWidth - margin * 2, [
    { label: 'Partidos jugados', value: data.jugados.toString() },
    { label: 'Partidos faltantes', value: data.faltantes.toString() },
  ]);
  y += 70;

  // Podio
  if (data.podium.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...INK);
    doc.text('Podio (puntaje)', margin, y);
    y += 6;
    autoTable(doc, {
      startY: y,
      head: [['#', 'Jugador', 'PG', 'PE', 'PP', 'Puntaje']],
      body: data.podium.map((p, idx) => [
        `${idx + 1}`,
        p.playerName,
        `${p.PG}`,
        `${p.PE}`,
        `${p.PP}`,
        `${p.puntaje}`,
      ]),
      theme: 'grid',
      headStyles: { fillColor: ORANGE, textColor: INK, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 6 },
      margin: { left: margin, right: margin },
    });
    y = endY(doc) + 18;
  }

  // Mensual
  if (data.monthly.length > 0) {
    if (y > doc.internal.pageSize.getHeight() - 200) {
      doc.addPage();
      y = margin;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...INK);
    doc.text('Partidos por mes', margin, y);
    y += 6;
    autoTable(doc, {
      startY: y,
      head: [['Mes', 'Jugados', 'Faltantes', 'Total']],
      body: data.monthly.map((m) => [
        m.label,
        `${m.jugados}`,
        `${m.pendientes}`,
        `${m.jugados + m.pendientes}`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: INK, textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 5 },
      margin: { left: margin, right: margin },
    });
    y = endY(doc) + 18;
  }

  // Tabla completa
  if (data.stats.length > 0) {
    if (y > doc.internal.pageSize.getHeight() - 200) {
      doc.addPage();
      y = margin;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...INK);
    doc.text('Tabla por jugador', margin, y);
    y += 6;
    autoTable(doc, {
      startY: y,
      head: [['#', 'Jugador', 'TP', 'PJ', 'PG', 'PE', 'PP', 'Pje', '%P', 'Pts', 'P/PJ']],
      body: data.stats.map((s, idx) => [
        `${idx + 1}`,
        s.playerName,
        `${s.TP}`,
        `${s.PJ}`,
        `${s.PG}`,
        `${s.PE}`,
        `${s.PP}`,
        `${s.puntaje}`,
        `${Math.round(s.presentismo * 100)}%`,
        `${s.puntos}`,
        s.ptosPorPJ == null ? '—' : s.ptosPorPJ.toFixed(1),
      ]),
      theme: 'striped',
      headStyles: { fillColor: INK, textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4 },
      margin: { left: margin, right: margin },
    });
  }

  doc.save(`informe-basquet-${data.year}-${data.tournament}.pdf`);
}

function drawKpis(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  items: { label: string; value: string }[],
): void {
  const gap = 10;
  const cardW = (width - gap * (items.length - 1)) / items.length;
  const cardH = 56;
  items.forEach((kpi, i) => {
    const cx = x + i * (cardW + gap);
    doc.setFillColor(245, 245, 250);
    doc.setDrawColor(220, 220, 230);
    doc.roundedRect(cx, y, cardW, cardH, 8, 8, 'FD');
    doc.setTextColor(...MUTED);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(kpi.label.toUpperCase(), cx + 12, y + 18);
    doc.setTextColor(...INK);
    doc.setFontSize(22);
    doc.text(kpi.value, cx + 12, y + 44);
  });
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
