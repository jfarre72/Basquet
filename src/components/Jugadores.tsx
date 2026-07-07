import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addPlayerToRoster,
  applyPlayerNames,
  PLAYERS_ACTIVE_SORTED,
  PLAYERS_BY_ID,
} from '../data/players';
import {
  fetchAvatars,
  getAvatarUrl,
  insertPlayer,
  setAvatarPath,
  updatePlayerName,
  uploadAvatar,
} from '../lib/avatars';
import { SUPABASE_CONFIGURED } from '../lib/supabase';
import {
  defaultMeta,
  fetchMetaMap,
  POSITIONS,
  saveMeta,
  type Hand,
  type PlayerMeta,
} from '../lib/playerMeta';
import { normalizeText } from '../utils/text';

interface Draft extends PlayerMeta {
  name: string;
}

export function Jugadores() {
  const [avatars, setAvatars] = useState<Record<number, string>>({});
  const [names, setNames] = useState<Record<number, string>>({});
  const [metas, setMetas] = useState<Record<number, PlayerMeta>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingNew, setSavingNew] = useState(false);

  const [editId, setEditId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const nameOf = (id: number) =>
    names[id] ?? PLAYERS_BY_ID[id]?.name ?? `#${id}`;

  const refresh = async () => {
    try {
      setError(null);
      const [av, mm] = await Promise.all([fetchAvatars(), fetchMetaMap()]);
      setAvatars(av);
      setMetas(mm);
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

  const openEditor = (id: number) => {
    if (!SUPABASE_CONFIGURED) return;
    const meta = metas[id] ?? defaultMeta(id);
    setDraft({ name: nameOf(id), ...meta });
    setPhotoFile(null);
    setPhotoPreview(null);
    setEditId(id);
  };

  const closeEditor = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
    setDraft(null);
    setEditId(null);
  };

  const pickGallery = () => galleryRef.current?.click();
  const pickCamera = () => cameraRef.current?.click();

  const onPhotoPicked = (file: File | null) => {
    if (galleryRef.current) galleryRef.current.value = '';
    if (cameraRef.current) cameraRef.current.value = '';
    if (!file) return;
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const openCreate = () => {
    if (!SUPABASE_CONFIGURED) return;
    setNewName('');
    setCreating(true);
  };

  const closeCreate = () => {
    setCreating(false);
    setNewName('');
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setSavingNew(true);
    setError(null);
    try {
      const row = await insertPlayer(name);
      addPlayerToRoster({ id: row.id, name: row.name });
      // Forzar re-render de la grilla (el memo depende de `names`).
      setNames((prev) => ({ ...prev, [row.id]: row.name }));
      closeCreate();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingNew(false);
    }
  };

  const handleSave = async () => {
    if (editId == null || draft == null) return;
    const id = editId;
    setSaving(true);
    setError(null);
    try {
      // 1) Foto (si se eligió una nueva).
      if (photoFile) {
        const path = await uploadAvatar(id, photoFile);
        setAvatars((prev) => ({ ...prev, [id]: path }));
        setAvatarPath(id, path);
      }
      // 2) Nombre (si cambió).
      const name = draft.name.trim();
      if (name && name !== nameOf(id)) {
        await updatePlayerName(id, name);
        applyPlayerNames([{ id, name }]);
        setNames((prev) => ({ ...prev, [id]: name }));
      }
      // 3) Ficha (posición / altura / mano).
      const meta: PlayerMeta = {
        position: draft.position,
        heightCm: draft.heightCm,
        hand: draft.hand,
        frase: draft.frase,
      };
      await saveMeta(id, meta);
      setMetas((prev) => ({ ...prev, [id]: meta }));
      closeEditor();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const previewSrc = photoPreview
    ? photoPreview
    : editId != null && avatars[editId]
      ? getAvatarUrl(avatars[editId])
      : null;

  return (
    <div className="jugadores">
      <div className="section-head">
        <div>
          <h2 className="section-head__title">Jugadores</h2>
          <p className="section-head__subtitle">
            Tocá tu nombre para cargar tu ficha y tu foto.
          </p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={openCreate}
          disabled={!SUPABASE_CONFIGURED}
          title="Dar de alta un jugador nuevo"
        >
          + Nuevo jugador
        </button>
      </div>

      {!SUPABASE_CONFIGURED && (
        <div className="warning-banner">
          Conectá Supabase para subir y ver avatares.
        </div>
      )}
      {error && <div className="warning-banner">No se pudo: {error}</div>}

      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => onPhotoPicked(e.target.files?.[0] ?? null)}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="user"
        hidden
        onChange={(e) => onPhotoPicked(e.target.files?.[0] ?? null)}
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
            return (
              <button
                key={p.id}
                type="button"
                className="avatar-card"
                onClick={() => openEditor(p.id)}
                disabled={!SUPABASE_CONFIGURED}
                title={path ? 'Editar ficha' : 'Cargar ficha'}
              >
                <span className="avatar-card__photo">
                  {path ? (
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

      {creating && (
        <div className="modal-backdrop" onClick={closeCreate}>
          <div
            className="modal player-edit"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="name-modal__title">Nuevo jugador</h3>
            <div className="meta-form">
              <label className="meta-field">
                <span>Nombre</span>
                <input
                  type="text"
                  className="players-search__input"
                  value={newName}
                  autoFocus
                  placeholder="Nombre del jugador"
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newName.trim() && !savingNew)
                      void handleCreate();
                  }}
                  aria-label="Nombre del nuevo jugador"
                />
              </label>
              <p className="section-head__subtitle">
                Después podés cargarle la foto y la ficha tocando su tarjeta.
              </p>
            </div>
            <div className="name-modal__actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={closeCreate}
                disabled={savingNew}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void handleCreate()}
                disabled={savingNew || !newName.trim()}
              >
                {savingNew ? 'Creando…' : 'Dar de alta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editId != null && draft != null && (
        <div className="modal-backdrop" onClick={closeEditor}>
          <div
            className="modal player-edit"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="name-modal__title">Ficha del jugador</h3>

            <button
              type="button"
              className="player-edit__photo"
              onClick={pickGallery}
              title="Elegir de la galería"
            >
              {previewSrc ? (
                <img src={previewSrc} alt="" />
              ) : (
                <span className="player-edit__photo-plus" aria-hidden>
                  +
                </span>
              )}
              <span className="player-edit__photo-edit" aria-hidden>
                📷
              </span>
            </button>
            <div className="player-edit__photo-actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={pickGallery}
              >
                🖼️ Galería
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={pickCamera}
              >
                📷 Cámara
              </button>
            </div>

            <div className="meta-form">
              <label className="meta-field">
                <span>Nombre</span>
                <input
                  type="text"
                  className="players-search__input"
                  value={draft.name}
                  onChange={(e) =>
                    setDraft((d) => (d ? { ...d, name: e.target.value } : d))
                  }
                  aria-label="Nombre del jugador"
                />
              </label>

              <label className="meta-field">
                <span>Posición</span>
                <select
                  className="players-search__input"
                  value={draft.position}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, position: e.target.value } : d,
                    )
                  }
                >
                  {POSITIONS.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.label} ({p.code})
                    </option>
                  ))}
                </select>
              </label>

              <label className="meta-field">
                <span>Altura (cm)</span>
                <input
                  type="number"
                  min={150}
                  max={220}
                  className="players-search__input"
                  value={draft.heightCm}
                  onChange={(e) =>
                    setDraft((d) =>
                      d
                        ? {
                            ...d,
                            heightCm: Number(e.target.value) || d.heightCm,
                          }
                        : d,
                    )
                  }
                />
              </label>

              <div className="meta-field">
                <span>Mano hábil</span>
                <div className="shot-toggle">
                  {(['izquierda', 'derecha'] as Hand[]).map((h) => (
                    <button
                      key={h}
                      type="button"
                      className={draft.hand === h ? 'is-active' : ''}
                      onClick={() =>
                        setDraft((d) => (d ? { ...d, hand: h } : d))
                      }
                    >
                      {h === 'izquierda' ? 'Izquierda' : 'Derecha'}
                    </button>
                  ))}
                </div>
              </div>

              <label className="meta-field">
                <span>Frase (va abajo de la tarjeta)</span>
                <input
                  type="text"
                  className="players-search__input"
                  maxLength={40}
                  placeholder="Ej: El rey del triple"
                  value={draft.frase}
                  onChange={(e) =>
                    setDraft((d) => (d ? { ...d, frase: e.target.value } : d))
                  }
                  aria-label="Frase de la tarjeta"
                />
              </label>
            </div>

            <div className="name-modal__actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={closeEditor}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void handleSave()}
                disabled={saving || !draft.name.trim()}
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
