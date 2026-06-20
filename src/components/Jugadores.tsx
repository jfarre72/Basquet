import { useEffect, useMemo, useRef, useState } from 'react';
import { PLAYERS_SORTED } from '../data/players';
import { fetchAvatars, getAvatarUrl, uploadAvatar } from '../lib/avatars';
import { SUPABASE_CONFIGURED } from '../lib/supabase';
import { normalizeText } from '../utils/text';

export function Jugadores() {
  const [avatars, setAvatars] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingPlayerId = useRef<number | null>(null);

  const refresh = async () => {
    try {
      setError(null);
      setAvatars(await fetchAvatars());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) {
      setLoading(false);
      return;
    }
    void refresh();
  }, []);

  const filtered = useMemo(() => {
    const q = normalizeText(search.trim());
    if (!q) return PLAYERS_SORTED;
    return PLAYERS_SORTED.filter((p) => normalizeText(p.name).includes(q));
  }, [search]);

  const openPicker = (playerId: number) => {
    if (!SUPABASE_CONFIGURED || uploadingId != null) return;
    pendingPlayerId.current = playerId;
    fileRef.current?.click();
  };

  const handleFile = async (file: File | null) => {
    const playerId = pendingPlayerId.current;
    pendingPlayerId.current = null;
    if (fileRef.current) fileRef.current.value = '';
    if (!file || playerId == null) return;
    setUploadingId(playerId);
    setError(null);
    try {
      const path = await uploadAvatar(playerId, file);
      setAvatars((prev) => ({ ...prev, [playerId]: path }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="jugadores">
      <div className="section-head">
        <div>
          <h2 className="section-head__title">Jugadores</h2>
          <p className="section-head__subtitle">
            Buscá tu nombre y subí una selfie de tu rostro.
          </p>
        </div>
      </div>

      {!SUPABASE_CONFIGURED && (
        <div className="warning-banner">
          Conectá Supabase para subir y ver avatares.
        </div>
      )}
      {error && <div className="warning-banner">No se pudo: {error}</div>}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="user"
        hidden
        onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
      />

      <div className="players-search">
        <input
          type="search"
          className="players-search__input"
          placeholder="Buscar tu nombre…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar jugador"
        />
      </div>

      {loading ? (
        <div className="lb-loading">Cargando jugadores…</div>
      ) : (
        <div className="avatars-grid">
          {filtered.map((p) => {
            const path = avatars[p.id];
            const isUploading = uploadingId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                className="avatar-card"
                onClick={() => openPicker(p.id)}
                disabled={!SUPABASE_CONFIGURED || uploadingId != null}
                title={path ? 'Cambiar foto' : 'Agregar foto'}
              >
                <span className="avatar-card__photo">
                  {isUploading ? (
                    <span className="avatar-card__spinner">…</span>
                  ) : path ? (
                    <img src={getAvatarUrl(path)} alt={p.name} loading="lazy" />
                  ) : (
                    <span className="avatar-card__plus" aria-hidden>
                      +
                    </span>
                  )}
                </span>
                <span className="avatar-card__name">{p.name}</span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="lb-empty">Sin jugadores que coincidan.</div>
          )}
        </div>
      )}
    </div>
  );
}
