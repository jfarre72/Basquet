import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { PLAYERS_BY_ID } from '../data/players';
import type { DbDraft } from '../lib/queries';

interface Props {
  draft: DbDraft;
  onClose: () => void;
}

export function FlyerModal({ draft, onClose }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dateText = formatFullDate(draft.play_date ?? draft.created_at);
  const fileBase = `partido-${(draft.play_date ?? draft.created_at).slice(0, 10)}`;

  const renderToBlob = async (): Promise<Blob> => {
    if (!stageRef.current) throw new Error('Sin contenido');
    const canvas = await html2canvas(stageRef.current, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      logging: false,
    });
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('No se pudo generar la imagen.'));
      }, 'image/png');
    });
  };

  const downloadImage = async () => {
    setBusy(true);
    setError(null);
    try {
      const blob = await renderToBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileBase}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const shareNative = async () => {
    setBusy(true);
    setError(null);
    try {
      const blob = await renderToBlob();
      const file = new File([blob], `${fileBase}.png`, { type: 'image/png' });
      const canShareFiles =
        typeof navigator !== 'undefined' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] });
      if (canShareFiles && typeof navigator.share === 'function') {
        await navigator.share({
          files: [file],
          title: 'Próximo partido',
          text: `🏀 ${draft.team_a_name} vs ${draft.team_b_name} · ${dateText}`,
        });
      } else {
        // Fallback: descarga
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileBase}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setError((e as Error).message);
      }
    } finally {
      setBusy(false);
    }
  };

  const sorted = (ids: number[]) =>
    [...ids].sort((a, b) =>
      (PLAYERS_BY_ID[a]?.name ?? '').localeCompare(
        PLAYERS_BY_ID[b]?.name ?? '',
      ),
    );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal flyer-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__head">
          <div className="modal__title">
            Flyer del partido
            <small>Compartilo o descargalo</small>
          </div>
          <button
            type="button"
            className="modal__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <div className="modal__body flyer-modal__body">
          <div className="flyer" ref={stageRef}>
            <div className="flyer__brand">
              <span className="flyer__ball" aria-hidden />
              <span className="flyer__brand-name">
                Bas<em>quet</em>
              </span>
              <span className="flyer__brand-sub">Martes</span>
            </div>

            <div className="flyer__date">{dateText.toUpperCase()}</div>

            <div className="flyer__vs">
              <div className="flyer__team flyer__team--a">
                <div className="flyer__team-name">{draft.team_a_name}</div>
                <ul className="flyer__list">
                  {sorted(draft.team_a_ids).map((id) => (
                    <li key={id}>{PLAYERS_BY_ID[id]?.name ?? `#${id}`}</li>
                  ))}
                </ul>
              </div>
              <div className="flyer__center">
                <span className="flyer__vs-big">VS</span>
              </div>
              <div className="flyer__team flyer__team--b">
                <div className="flyer__team-name">{draft.team_b_name}</div>
                <ul className="flyer__list">
                  {sorted(draft.team_b_ids).map((id) => (
                    <li key={id}>{PLAYERS_BY_ID[id]?.name ?? `#${id}`}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flyer__foot">🏀 ¡Vamos a la cancha!</div>
          </div>

          {error && <div className="warning-banner">{error}</div>}

          <div className="actions-row">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void shareNative()}
              disabled={busy}
            >
              📲 Compartir
            </button>
            <button
              type="button"
              className="btn btn--blue"
              onClick={() => void downloadImage()}
              disabled={busy}
            >
              🖼️ Imagen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatFullDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}
