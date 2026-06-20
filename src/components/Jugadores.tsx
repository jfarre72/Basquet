import { useEffect, useMemo, useRef, useState } from 'react';
import {
  applyPlayerNames,
  PLAYERS_ACTIVE_SORTED,
  PLAYERS_BY_ID,
} from '../data/players';
import {
  fetchAvatars,
  getAvatarUrl,
  setAvatarPath,
  updatePlayerName,
  uploadAvatar,
} from '../lib/avatars';
import { SUPABASE_CONFIGURED } from '../lib/supabase';
import { normalizeText } from '../utils/text';

export function Jugadores() {
  const [avatars, setAvatars] = useState<Record<number, string>>({});
  const [names, setNames] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingPlayerId = useRef<number | null>(null);

  const nameOf = (id: number) =>
    names[id] ?? PLAYERS_BY_ID[id]?.name ?? `#${id}`;

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
    // Los jugadores inactivos no se muestran en esta sección.
    if (!q) return PLAYERS_ACTIVE_SORTED;
    return PLAYERS_ACTIVE_SORTED.filter((p) =>
      normalizeText(names[p.id] ?? p.name).includes(q),
    );
  }, [search, names]);

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
      setAvatarPath(playerId, path);
      // Tras cargar la foto, ofrecemos cambiar el nombre.
      setNameDraft(nameOf(playerId));
      setEditId(playerId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploadingId(null);
    }
  };

  const handleSaveName = async () => {
    if (editId == null) return;
    const next = nameDraft.trim();
    if (!next || next === nameOf(editId)) {
      setEditId(null);
      return;
    }
    setSavingName(true);
    setError(null);
    try {
      await updatePlayerName(editId, next);
      // Impacta en todas las tablas: actualizamos el roster en memoria.
      applyPlayerNames([{ id: editId, name: next }]);
      setNames((prev) => ({ ...prev, [editId]: next }));
      setEditId(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingName(false);
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
                    <img
                      src={getAvatarUrl(path)}
                      alt={nameOf(p.id)}
                      loading="lazy"
                    />
                  ) : (
                    <span className="avatar-card__plus" aria-hidden>
                      +
                    </span>
                  )}
                </span>
                <span className="avatar-card__name">{nameOf(p.id)}</span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="lb-empty">Sin jugadores que coincidan.</div>
          )}
        </div>
      )}

      {editId != null && (
        <div className="modal-backdrop" onClick={() => setEditId(null)}>
          <div
            className="modal name-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="name-modal__title">¿Querés cambiar el nombre?</h3>
            <p className="name-modal__sub">
              El cambio se aplica en todas las tablas y estadísticas.
            </p>
            <input
              type="text"
              className="players-search__input"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSaveName();
              }}
              aria-label="Nombre del jugador"
            />
            <div className="name-modal__actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setEditId(null)}
                disabled={savingName}
              >
                Mantener
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void handleSaveName()}
                disabled={savingName || !nameDraft.trim()}
              >
                {savingName ? 'Guardando…' : 'Guardar nombre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
