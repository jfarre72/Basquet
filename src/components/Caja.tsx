import { useEffect, useMemo, useState } from 'react';
import {
  addCajaMovimiento,
  deleteCajaMovimiento,
  fetchCajaMovimientos,
  fetchSaldoInicial,
  type DbCajaMovimiento,
} from '../lib/queries';
import { SUPABASE_CONFIGURED } from '../lib/supabase';

const money = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

function formatFecha(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

interface DayGroup {
  fecha: string;
  recaudado: number;
  pagado: number;
  saldoDia: number;
  acumulado: number;
  movimientos: DbCajaMovimiento[];
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export function Caja() {
  const [saldoInicial, setSaldoInicial] = useState(15000);
  const [movimientos, setMovimientos] = useState<DbCajaMovimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Formulario
  const [fecha, setFecha] = useState(todayISO());
  const [tipo, setTipo] = useState<'recaudado' | 'pagado'>('recaudado');
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchSaldoInicial(), fetchCajaMovimientos()])
      .then(([si, mov]) => {
        if (cancelled) return;
        setSaldoInicial(si);
        setMovimientos(mov);
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

  // Agrupar por día (orden ascendente) y calcular saldo acumulado corrido.
  const days = useMemo<DayGroup[]>(() => {
    const byFecha = new Map<string, DbCajaMovimiento[]>();
    for (const m of movimientos) {
      const arr = byFecha.get(m.fecha) ?? [];
      arr.push(m);
      byFecha.set(m.fecha, arr);
    }
    const fechas = [...byFecha.keys()].sort();
    let acumulado = saldoInicial;
    const out: DayGroup[] = [];
    for (const f of fechas) {
      const movs = byFecha.get(f)!;
      const recaudado = movs
        .filter((m) => m.tipo === 'recaudado')
        .reduce((s, m) => s + m.monto, 0);
      const pagado = movs
        .filter((m) => m.tipo === 'pagado')
        .reduce((s, m) => s + m.monto, 0);
      const saldoDia = recaudado - pagado;
      acumulado += saldoDia;
      out.push({ fecha: f, recaudado, pagado, saldoDia, acumulado, movimientos: movs });
    }
    // Más reciente arriba.
    return out.reverse();
  }, [movimientos, saldoInicial]);

  const saldoAcumulado = useMemo(
    () =>
      movimientos.reduce(
        (s, m) => s + (m.tipo === 'recaudado' ? m.monto : -m.monto),
        saldoInicial,
      ),
    [movimientos, saldoInicial],
  );

  const totalRecaudado = useMemo(
    () =>
      movimientos
        .filter((m) => m.tipo === 'recaudado')
        .reduce((s, m) => s + m.monto, 0),
    [movimientos],
  );
  const totalPagado = useMemo(
    () =>
      movimientos
        .filter((m) => m.tipo === 'pagado')
        .reduce((s, m) => s + m.monto, 0),
    [movimientos],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valor = Number(monto);
    if (!Number.isFinite(valor) || valor <= 0) {
      setError('Ingresá un monto válido.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const nuevo = await addCajaMovimiento({
        fecha,
        tipo,
        concepto: concepto.trim() || null,
        monto: valor,
      });
      setMovimientos((cur) => [...cur, nuevo]);
      setConcepto('');
      setMonto('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const prev = movimientos;
    setMovimientos((cur) => cur.filter((m) => m.id !== id));
    try {
      await deleteCajaMovimiento(id);
    } catch (err) {
      setError((err as Error).message);
      setMovimientos(prev);
    }
  };

  return (
    <div className="caja">
      <div className="section-head">
        <div>
          <h2 className="section-head__title">💵 Caja</h2>
          <p className="section-head__subtitle">
            Cuánta plata tenemos según lo que se recauda y se paga.
          </p>
        </div>
      </div>

      {!SUPABASE_CONFIGURED && (
        <div className="warning-banner">
          Conectá Supabase para usar la caja.
        </div>
      )}
      {error && <div className="warning-banner">No se pudo: {error}</div>}

      {loading ? (
        <div className="lb-loading">Cargando caja…</div>
      ) : (
        <>
          <div className="kpis kpis--3">
            <div className="kpi">
              <span className="kpi__label">Recaudado</span>
              <span className="kpi__value kpi__value--win">
                {money.format(totalRecaudado)}
              </span>
            </div>
            <div className="kpi">
              <span className="kpi__label">Pagado</span>
              <span className="kpi__value kpi__value--loss">
                {money.format(totalPagado)}
              </span>
            </div>
            <div className="kpi">
              <span className="kpi__label">Saldo acumulado</span>
              <span className="kpi__value kpi__value--accent">
                {money.format(saldoAcumulado)}
              </span>
            </div>
          </div>
          <p className="caja__base">
            Saldo inicial: {money.format(saldoInicial)}
          </p>

          <form className="caja-form" onSubmit={submit}>
            <div className="caja-form__row">
              <label className="caja-form__field">
                <span>Fecha</span>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                />
              </label>
              <label className="caja-form__field">
                <span>Tipo</span>
                <select
                  value={tipo}
                  onChange={(e) =>
                    setTipo(e.target.value as 'recaudado' | 'pagado')
                  }
                >
                  <option value="recaudado">Recaudado</option>
                  <option value="pagado">Pagado</option>
                </select>
              </label>
              <label className="caja-form__field">
                <span>Monto</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  required
                />
              </label>
            </div>
            <label className="caja-form__field caja-form__field--full">
              <span>Concepto (opcional)</span>
              <input
                type="text"
                placeholder="Ej: cuota del martes, alquiler cancha…"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
              />
            </label>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={saving || !SUPABASE_CONFIGURED}
            >
              {saving ? 'Guardando…' : '+ Agregar movimiento'}
            </button>
          </form>

          {days.length === 0 ? (
            <div className="lb-empty">
              Todavía no hay movimientos cargados.
            </div>
          ) : (
            <div className="caja-days">
              {days.map((d) => (
                <section key={d.fecha} className="caja-day">
                  <header className="caja-day__head">
                    <span className="caja-day__date">{formatFecha(d.fecha)}</span>
                    <span className="caja-day__totals">
                      <span className="caja-day__rec">
                        +{money.format(d.recaudado)}
                      </span>
                      <span className="caja-day__pag">
                        −{money.format(d.pagado)}
                      </span>
                    </span>
                  </header>
                  <div className="caja-day__balances">
                    <span>
                      Saldo del día:{' '}
                      <b className={d.saldoDia >= 0 ? 'is-pos' : 'is-neg'}>
                        {money.format(d.saldoDia)}
                      </b>
                    </span>
                    <span>
                      Acumulado: <b>{money.format(d.acumulado)}</b>
                    </span>
                  </div>
                  <ul className="caja-mov-list">
                    {d.movimientos.map((m) => (
                      <li
                        key={m.id}
                        className={`caja-mov caja-mov--${m.tipo}`}
                      >
                        <span className="caja-mov__tipo">
                          {m.tipo === 'recaudado' ? '↑' : '↓'}
                        </span>
                        <span className="caja-mov__concepto">
                          {m.concepto ||
                            (m.tipo === 'recaudado' ? 'Recaudado' : 'Pagado')}
                        </span>
                        <span className="caja-mov__monto">
                          {m.tipo === 'recaudado' ? '+' : '−'}
                          {money.format(m.monto)}
                        </span>
                        <button
                          type="button"
                          className="caja-mov__del"
                          onClick={() => void remove(m.id)}
                          aria-label="Eliminar movimiento"
                          title="Eliminar"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
