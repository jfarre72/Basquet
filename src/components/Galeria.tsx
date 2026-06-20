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
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const pickerRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const touchStartX = useRef<number | null>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    try {
      setError(null);
      const data = await listPhotos();
      setPhotos(data);
      setIndex(0);
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

  useEffect(() => {
    const active = thumbsRef.current?.querySelector<HTMLElement>(
      '.carousel-thumb--active',
    );
    active?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (photos.length === 0) return;
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight')
        setIndex((i) => Math.min(photos.length - 1, i + 1));
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [photos.length]);

  useEffect(() => {
    if (fullscreen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [fullscreen]);

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
      setPhotos((prev) => {
        const next = prev.filter((x) => x.id !== p.id);
        setIndex((i) => Math.min(i, Math.max(0, next.length - 1)));
        return next;
      });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const downloadPhoto = async (p: DbPhoto) => {
    try {
      const res = await fetch(getPhotoUrl(p.storage_path));
      const blob = await res.blob();
      const obj = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = obj;
      a.download = p.storage_path.split('/').pop() || 'foto.jpg';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(obj);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const current = photos[index];

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx > 0) setIndex((i) => Math.max(0, i - 1));
    else setIndex((i) => Math.min(photos.length - 1, i + 1));
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

      {error && <div className="warning-banner">No se pudo: {error}</div>}

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
        <div className="carousel">
          <div
            className="carousel__stage"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {current && (
              <img
                key={current.id}
                src={getPhotoUrl(current.storage_path)}
                alt={current.caption ?? 'Foto'}
                className="carousel__img"
                onClick={() => setFullscreen(true)}
              />
            )}
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  className="carousel__nav carousel__nav--prev"
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                  disabled={index === 0}
                  aria-label="Anterior"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="carousel__nav carousel__nav--next"
                  onClick={() =>
                    setIndex((i) => Math.min(photos.length - 1, i + 1))
                  }
                  disabled={index === photos.length - 1}
                  aria-label="Siguiente"
                >
                  ›
                </button>
              </>
            )}
            {current && (
              <button
                type="button"
                className="carousel__download"
                aria-label="Descargar foto"
                title="Descargar foto"
                onClick={() => void downloadPhoto(current)}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  strokeLinejoin="round" aria-hidden>
                  <path d="M12 3v12" />
                  <path d="M7 11l5 5 5-5" />
                  <path d="M5 21h14" />
                </svg>
              </button>
            )}
            {current && (
              <button
                type="button"
                className="carousel__delete"
                aria-label="Borrar foto"
                onClick={() => void handleDelete(current)}
              >
                ×
              </button>
            )}
            <div className="carousel__counter">
              {index + 1} / {photos.length}
            </div>
          </div>

          {photos.length > 1 && (
            <div className="carousel__thumbs" ref={thumbsRef}>
              {photos.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  className={`carousel-thumb${
                    i === index ? ' carousel-thumb--active' : ''
                  }`}
                  onClick={() => setIndex(i)}
                  aria-label={`Foto ${i + 1}`}
                >
                  <img
                    src={getPhotoUrl(p.storage_path)}
                    alt=""
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {fullscreen && current && (
        <div
          className="photo-lightbox"
          onClick={() => setFullscreen(false)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <button
            type="button"
            className="photo-lightbox__close"
            aria-label="Cerrar"
            onClick={(e) => {
              e.stopPropagation();
              setFullscreen(false);
            }}
          >
            ×
          </button>
          <button
            type="button"
            className="photo-lightbox__download"
            aria-label="Descargar foto"
            title="Descargar foto"
            onClick={(e) => {
              e.stopPropagation();
              void downloadPhoto(current);
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden>
              <path d="M12 3v12" />
              <path d="M7 11l5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
          </button>
          {photos.length > 1 && (
            <>
              <button
                type="button"
                className="photo-lightbox__nav photo-lightbox__nav--prev"
                aria-label="Anterior"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex((i) => Math.max(0, i - 1));
                }}
                disabled={index === 0}
              >
                ‹
              </button>
              <button
                type="button"
                className="photo-lightbox__nav photo-lightbox__nav--next"
                aria-label="Siguiente"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex((i) => Math.min(photos.length - 1, i + 1));
                }}
                disabled={index === photos.length - 1}
              >
                ›
              </button>
            </>
          )}
          <img
            key={current.id}
            src={getPhotoUrl(current.storage_path)}
            alt={current.caption ?? 'Foto'}
            className="photo-lightbox__img"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="photo-lightbox__counter">
            {index + 1} / {photos.length}
          </div>
        </div>
      )}
    </div>
  );
}
