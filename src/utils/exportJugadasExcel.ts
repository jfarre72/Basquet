import * as XLSX from 'xlsx';

export interface JugadaRow {
  fecha: string;
  minuto: number;
  equipo: string;
  playerId: number;
  jugador: string;
  tipo: 'Doble' | 'Triple';
  puntos: number;
}

export function exportJugadasToExcel(rows: JugadaRow[]): void {
  const wb = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(
    rows.length > 0
      ? rows.map((r) => ({
          Fecha: r.fecha,
          Minuto: r.minuto,
          Equipo: r.equipo,
          'ID Jugador': r.playerId,
          Jugador: r.jugador,
          'Tipo de tiro': r.tipo,
          Puntos: r.puntos,
        }))
      : [
          {
            Fecha: '',
            Minuto: '',
            Equipo: '',
            'ID Jugador': '',
            Jugador: '',
            'Tipo de tiro': '',
            Puntos: '',
          },
        ],
  );
  sheet['!cols'] = [12, 8, 16, 12, 18, 14, 8].map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(wb, sheet, 'Jugadas');

  const ts = fileTimestamp();
  XLSX.writeFile(wb, `jugadas-${ts}.xlsx`);
}

function fileTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
    d.getHours(),
  )}${pad(d.getMinutes())}`;
}
