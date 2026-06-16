import { useEffect, useRef, useState } from 'react';
import {
  deletePhoto,
  getPhotoUrl,
  listPhotos,
  uploadPhoto,
  type DbPhoto,
} from '../lib/photos';
import { SUPABASE_CONFIGURED } from '../lib/supabase';

export function Galeria() {
  const [photos, setPhotos] = useState<DbPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    try {
      setError(null);
      const data = await listPhotos();
      setPhotos(data);
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

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    setUploading(true);
    setError(null);
    setProgress({ done: 0, total: arr.length });
    try {
      for (let i = 0; i < arr.length; i++) {
        await uploadPhoto(arr[i]);
        setProgress({ done: i + 1, total: arr.length });
      }
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
      setProgress(null);
      if (pickerRef.current) pickerRef.current.value = '';
      if (cameraRef.current) cameraRef.current.value = '';
    }
  };

  const handleDelete = async (p: DbPhoto) => {
    if (!window.confirm('¿Borrar esta foto?')) return;
    try {
      await deletePhoto(p);
      setPhotos((prev) => prev.filter((x) => x.id !== p.id));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="galeria">
      <div className="section-head">
        <div>
          <h2 className="section-head__title">Galería</h2>
          <p className="section-head__subtitle">Momentos de los partidos.</p>
        </div>
      </div>

      {!SUPABASE_CONFIGURED && (
        <div className="warning-banner">
          Conectá Supabase para subir y ver fotos.
        </div>
      )}

      {error && (
        <div className="warning-banner">No se pudo: {error}</div>
      )}

      <div className="upload-row">
        <input
          ref={pickerRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => pickerRef.current?.click()}
          disabled={!SUPABASE_CONFIGURED || uploading}
        >
          {uploading
            ? progress
              ? `Subiendo ${progress.done}/${progress.total}…`
              : 'Subiendo…'
            : '+ Subir fotos'}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => cameraRef.current?.click()}
          disabled={!SUPABASE_CONFIGURED || uploading}
        >
          📷 Sacar foto
        </button>
      </div>

      {loading ? (
        <div className="lb-loading">Cargando galería…</div>
      ) : photos.length === 0 ? (
        <div className="gallery-empty">
          <span className="gallery-empty__icon" aria-hidden>
            📸
          </span>
          <div className="gallery-empty__title">Sin fotos todavía</div>
          <div className="gallery-empty__sub">
            Subí la primera tocando el botón de arriba.
          </div>
        </div>
      ) : (
        <div className="photos-grid">
          {photos.map((p) => (
            <a
              key={p.id}
              className="photo-card"
              href={getPhotoUrl(p.storage_path)}
              target="_blank"
              rel="noreferrer"
            >
              <img
                src={getPhotoUrl(p.storage_path)}
                alt={p.caption ?? 'Foto'}
                loading="lazy"
              />
              <button
                type="button"
                className="photo-card__delete"
                aria-label="Borrar foto"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void handleDelete(p);
                }}
              >
                ×
              </button>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
