/**
 * Recorte de fondo de las fotos de jugador para las tarjetas.
 * Corre 100% en el navegador (descarga el modelo de un CDN la primera vez).
 * Se cachea el resultado (dataURL) en memoria y en localStorage por ruta de
 * avatar, así no se reprocesa en cada visita.
 */

const memCache = new Map<string, string>();

/**
 * Achica la imagen antes de procesar (mucho más rápido) y la normaliza a un
 * Blob. Si ya es chica, la deja igual.
 */
async function downscale(input: Blob | string, max = 640): Promise<Blob> {
  const blob =
    typeof input === 'string' ? await (await fetch(input)).blob() : input;
  try {
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (scale >= 1) {
      bmp.close();
      return blob;
    }
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return blob;
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    return await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b ?? blob), 'image/jpeg', 0.9),
    );
  } catch {
    return blob;
  }
}

/**
 * Recorta el fondo de una imagen (File/Blob o URL) y devuelve un PNG con
 * transparencia. Optimizado: achica la imagen y usa un modelo más liviano.
 * Carga perezosa: la librería solo se baja la primera vez que se usa.
 */
export async function removeBgBlob(
  input: Blob | string,
  onProgress?: (fraction: number) => void,
): Promise<Blob> {
  const { removeBackground } = await import('@imgly/background-removal');
  const small = await downscale(input, 640);
  return removeBackground(small, {
    model: 'isnet_fp16', // ~mitad de peso que el modelo por defecto
    output: { format: 'image/png', quality: 0.8 },
    progress: (_key, current, total) => {
      if (onProgress && total > 0) onProgress(Math.min(1, current / total));
    },
  });
}

function storageKey(path: string): string {
  return `cutout:${path}`;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Devuelve un dataURL PNG (con transparencia) de la silueta del jugador.
 * `path` se usa como clave de cache; `srcUrl` es la URL pública de la foto.
 */
export async function getCutout(path: string, srcUrl: string): Promise<string> {
  const cached = memCache.get(path);
  if (cached) return cached;

  try {
    const stored = localStorage.getItem(storageKey(path));
    if (stored) {
      memCache.set(path, stored);
      return stored;
    }
  } catch {
    /* localStorage no disponible: seguimos sin cache persistente */
  }

  const blob = await removeBgBlob(srcUrl);
  const dataUrl = await blobToDataUrl(blob);
  memCache.set(path, dataUrl);
  try {
    localStorage.setItem(storageKey(path), dataUrl);
  } catch {
    /* puede exceder la cuota: lo dejamos solo en memoria */
  }
  return dataUrl;
}
