/**
 * Recorte de fondo de las fotos de jugador para las tarjetas.
 * Corre 100% en el navegador (descarga el modelo de un CDN la primera vez).
 * Se cachea el resultado (dataURL) en memoria y en localStorage por ruta de
 * avatar, así no se reprocesa en cada visita.
 */

const memCache = new Map<string, string>();

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

  // Carga perezosa: la librería (y su modelo) solo se baja al usar Tarjetas.
  const { removeBackground } = await import('@imgly/background-removal');
  const blob = await removeBackground(srcUrl, {
    output: { format: 'image/png', quality: 0.8 },
  });
  const dataUrl = await blobToDataUrl(blob);
  memCache.set(path, dataUrl);
  try {
    localStorage.setItem(storageKey(path), dataUrl);
  } catch {
    /* puede exceder la cuota: lo dejamos solo en memoria */
  }
  return dataUrl;
}
