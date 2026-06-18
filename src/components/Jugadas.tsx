import { useEffect, useMemo, useState } from 'react';
import { PLAYERS_BY_ID, PLAYERS_SORTED } from '../data/players';
import { fetchAllPlays, type DbMatch, type DbPlay } from '../lib/queries';
import {
  exportJugadasToExcel,
  type JugadaRow,
} from '../utils/exportJugadasExcel';

export function Jugadas() {
  const [plays, setPlays] = useState<DbPlay[]>([]);
  const [matches, setMatches] = useState<DbMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchFilter, setMatchFilter] = useState<string>('all');
  const [playerFilter, setPlayerFilter] = useState<number | 'all'>('all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAllPlays()
      .then((data) => {
        if (cancelled) return;
        setPlays(data.plays);
        setMatches(data.matches);
        setError(null);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const matchById = useMemo(
    () => new Map(matches.map((m) => [m.id, m])),
    [matches],
  );

  const matchOptions = useMemo(() => {
    const ids = new Set(plays.map((p) => p.match_id));
    return [...ids]
      .map((id) => matchById.get(id))
      .filter((m): m is DbMatch => Boolean(m))
      .sort((a, b) => b.played_at.localeCompare(a.played_at));
  }, [plays, matchById]);

  const playersWithPlays = useMemo(() => {
    const ids = new Set(plays.map((p) => p.player_id));
    return PLAYERS_SORTED.filter((p) => ids.has(p.id));
  }, [plays]);

  const rows: JugadaRow[] = useMemo(() => {
    const filtered = plays.filter((p) => {
      if (matchFilter !== 'all' && p.match_id !== matchFilter) return false;
      if (playerFilter !== 'all' && p.player_id !== playerFilter) return false;
      return true;
    });
    return filtered
      .slice()
      .sort((a, b) => {
        const ma = matchById.get(a.match_id)?.played_at ?? '';
        const mb = matchById.get(b.match_id)?.played_at ?? '';
        if (mb !== ma) return mb.localeCompare(ma);
        if (a.minute !== b.minute) return a.minute - b.minute;
        return a.ts.localeCompare(b.ts);
      })
      .map((p) => {
        const m = matchById.get(p.match_id);
        const ts = new Date(p.ts);
        return {
          fecha: ts.toLocaleDateString('es-AR'),
          minuto: p.minute,
          equipo:
            p.team === 'A'
              ? (m?.team_a_name ?? 'A')
              : (m?.team_b_name ?? 'B'),
          playerId: p.player_id,
          jugador: PLAYERS_BY_ID[p.player_id]?.name ?? `#${p.player_id}`,
          tipo: p.shot_type === 'triple' ? 'Triple' : 'Doble',
          puntos: p.points,
        };
      });
  }, [plays, matchById, matchFilter, playerFilter]);

  const totals = useMemo(() => {
    let puntos = 0;
    let dobles = 0;
    let triples = 0;
    for (const r of rows) {
      puntos += r.puntos;
      if (r.tipo === 'Triple') triples += 1;
      else dobles += 1;
    }
    return { puntos, dobles, triples };
  }, [rows]);

  return (
    <div className="informe">
      <div className="section-head">
        <div>
          <h2 className="section-head__title">Jugadas</h2>
          <p className="section-head__subtitle">
            Validación de cada conversión registrada. Exportable a Excel.
          </p>
        </div>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => exportJugadasToExcel(rows)}
          disabled={rows.length === 0}
        >
          📊 Excel
        </button>
      </div>

      {error && (
        <div className="warning-banner">
          No se pudo cargar: {error}
        </div>
      )}

      {loading ? (
        <div className="lb-loading">Cargando jugadas...</div>
      ) : (
        <>
          <div className="filters">
            <select
              className="player-select"
              value={matchFilter}
              onChange={(e) => setMatchFilter(e.target.value)}
              aria-label="Filtrar por partido"
            >
              <option value="all">Todos los partidos ({plays.length})</option>
              {matchOptions.map((m) => {
                const count = plays.filter((p) => p.match_id === m.id).length;
                const d = new Date(m.played_at);
                return (
                  <option key={m.id} value={m.id}>
                    {d.toLocaleDateString('es-AR')} ·{' '}
                    {m.team_a_name ?? 'Negro'} vs {m.team_b_name ?? 'Blanco'} (
                    {count})
                  </option>
                );
              })}
            </select>
            <select
              className="player-select"
              value={playerFilter}
              onChange={(e) =>
                setPlayerFilter(
                  e.target.value === 'all' ? 'all' : Number(e.target.value),
                )
              }
              aria-label="Filtrar por jugador"
            >
              <option value="all">Todos los jugadores</option>
              {playersWithPlays.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (#{p.id})
                </option>
              ))}
            </select>
          </div>

          <div className="kpis">
            <div className="kpi">
              <span className="kpi__label">Puntos</span>
              <span className="kpi__value kpi__value--accent">
                {totals.puntos}
              </span>
            </div>
            <div className="kpi">
              <span className="kpi__label">Dobles</span>
              <span className="kpi__value">{totals.dobles}</span>
            </div>
            <div className="kpi">
              <span className="kpi__label">Triples</span>
              <span className="kpi__value">{totals.triples}</span>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="lb-empty">No hay jugadas para mostrar.</div>
          ) : (
            <div className="table-scroll">
              <table className="stats-grid jugadas-grid">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Min</th>
                    <th>Equipo</th>
                    <th>ID</th>
                    <th className="stats-grid__th-name">Jugador</th>
                    <th>Tipo</th>
                    <th>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={idx}>
                      <td className="stats-grid__muted">{r.fecha}</td>
                      <td>{r.minuto}</td>
                      <td>{r.equipo}</td>
                      <td className="stats-grid__muted">{r.playerId}</td>
                      <td style={{ textAlign: 'left' }}>{r.jugador}</td>
                      <td
                        className={
                          r.tipo === 'Triple' ? 'stats-grid__hl' : ''
                        }
                      >
                        {r.tipo}
                      </td>
                      <td>{r.puntos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
