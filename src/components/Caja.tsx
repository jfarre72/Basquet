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

interface Row extends DbCajaMovimiento {
  dif: number;
  acumulado: number;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export function Caja() {
  const [saldoInicial, setSaldoInicial] = useState(15000);
  const [movimientos, setMovimientos] = useState<DbCajaMovimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Formulario: un registro por partido/día.
  const [fecha, setFecha] = useState(todayISO());
  const [jugadores, setJugadores] = useState('');
  const [precio, setPrecio] = useState('');
  const [pagado, setPagado] = useState('');

  // Recaudado = fuimos × $ por persona (automático).
  const recaudado = (Number(jugadores) || 0) * (Number(precio) || 0);
  const dif = recaudado - (Number(pagado) || 0);

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

  // Saldo acumulado corrido (movimientos vienen ordenados ascendente por fecha).
  // Mostramos el más reciente arriba.
  const rows = useMemo<Row[]>(() => {
    let acumulado = saldoInicial;
    const out: Row[] = movimientos.map((m) => {
      const d = m.recaudado - m.pagado;
      acumulado += d;
      return { ...m, dif: d, acumulado };
    });
    return out.reverse();
  }, [movimientos, saldoInicial]);

  // Saldo acumulado total = CAJA.
  const caja = useMemo(
    () =>
      movimientos.reduce((s, m) => s + m.recaudado - m.pagado, saldoInicial),
    [movimientos, saldoInicial],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const jug = Number(jugadores) || 0;
    const pre = Number(precio) || 0;
    const pag = Number(pagado) || 0;
    if (jug < 0 || pre < 0 || pag < 0) {
      setError('Ingresá valores válidos.');
      return;
    }
    if (recaudado === 0 && pag === 0) {
      setError('Cargá al menos lo recaudado o lo pagado.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const nuevo = await addCajaMovimiento({
        fecha,
        jugadores: jug,
        precio: pre,
        recaudado,
        pagado: pag,
      });
      setMovimientos((cur) =>
        [...cur, nuevo].sort(
          (a, b) =>
            a.fecha.localeCompare(b.fecha) ||
            a.created_at.localeCompare(b.created_at),
        ),
      );
      setJugadores('');
      setPrecio('');
      setPagado('');
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
            Un registro por partido: cuántos fuimos, lo recaudado y lo pagado.
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
          <div className="caja-total">
            <span className="caja-total__label">CAJA</span>
            <span className="caja-total__value">{money.format(caja)}</span>
            <span className="caja-total__hint">
              Saldo inicial {money.format(saldoInicial)}
            </span>
          </div>

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
                <span>Fuimos</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  placeholder="12"
                  value={jugadores}
                  onChange={(e) => setJugadores(e.target.value)}
                />
              </label>
            </div>
            <div className="caja-form__row">
              <label className="caja-form__field">
                <span>$ por persona</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="any"
                  placeholder="4500"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                />
              </label>
              <label className="caja-form__field">
                <span>Pagado</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="any"
                  placeholder="50000"
                  value={pagado}
                  onChange={(e) => setPagado(e.target.value)}
                />
              </label>
            </div>
            <div className="caja-form__calc">
              <span>
                Recaudado <b>{money.format(recaudado)}</b>
              </span>
              <span>
                Diferencia{' '}
                <b className={dif >= 0 ? 'is-pos' : 'is-neg'}>
                  {money.format(dif)}
                </b>
              </span>
            </div>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={saving || !SUPABASE_CONFIGURED}
            >
              {saving ? 'Guardando…' : '+ Agregar registro'}
            </button>
          </form>

          {rows.length === 0 ? (
            <div className="lb-empty">Todavía no hay registros cargados.</div>
          ) : (
            <div className="caja-days">
              {rows.map((r) => (
                <section key={r.id} className="caja-day">
                  <header className="caja-day__head">
                    <span className="caja-day__date">{formatFecha(r.fecha)}</span>
                    {r.jugadores > 0 && (
                      <span className="caja-day__players">
                        👥 {r.jugadores} × {money.format(r.precio)}
                      </span>
                    )}
                    <button
                      type="button"
                      className="caja-mov__del"
                      onClick={() => void remove(r.id)}
                      aria-label="Eliminar registro"
                      title="Eliminar"
                    >
                      ×
                    </button>
                  </header>
                  <div className="caja-day__totals">
                    <span className="caja-day__rec">
                      Recaudado +{money.format(r.recaudado)}
                    </span>
                    <span className="caja-day__pag">
                      Pagado −{money.format(r.pagado)}
                    </span>
                  </div>
                  <div className="caja-day__balances">
                    <span>
                      Diferencia:{' '}
                      <b className={r.dif >= 0 ? 'is-pos' : 'is-neg'}>
                        {money.format(r.dif)}
                      </b>
                    </span>
                    <span>
                      Caja: <b>{money.format(r.acumulado)}</b>
                    </span>
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
