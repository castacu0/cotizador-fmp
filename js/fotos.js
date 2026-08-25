// Fotos de obra. Opcionales: quien mide decide si toma una o ninguna.
//
// Van en IndexedDB, no en localStorage. Una foto de teléfono pesa entre 2 y 5 MB
// y localStorage tiene 5 MB en total para toda la aplicación: la primera foto
// tiraría el catálogo, los precios y la bitácora. IndexedDB da cientos de MB.
//
// Antes de guardar se reducen a 1600 px de lado largo y JPEG al 72%. Una foto
// de referencia de obra no necesita más, y así entran cientos sin apretar.

const BD = 'fmp.fotos';
const ALMACEN = 'fotos';
const VERSION = 1;

const LADO_MAX = 1600;
const CALIDAD = 0.72;

let conexion = null;

function abrir() {
  if (conexion) return Promise.resolve(conexion);
  return new Promise((resolver, rechazar) => {
    const req = indexedDB.open(BD, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ALMACEN)) {
        const store = db.createObjectStore(ALMACEN, { keyPath: 'id' });
        store.createIndex('cuarto', 'cuartoId', { unique: false });
      }
    };
    req.onsuccess = () => { conexion = req.result; resolver(conexion); };
    req.onerror = () => rechazar(req.error);
  });
}

const transaccion = async (modo, fn) => {
  const db = await abrir();
  return new Promise((resolver, rechazar) => {
    const tx = db.transaction(ALMACEN, modo);
    const pedido = fn(tx.objectStore(ALMACEN));
    tx.oncomplete = () => resolver(pedido?.result ?? null);
    tx.onerror = () => rechazar(tx.error);
    tx.onabort = () => rechazar(tx.error);
  });
};

/** ¿Puede este navegador guardar fotos? Sin esto la interfaz no ofrece la opción. */
export const hayAlmacen = () => typeof indexedDB !== 'undefined';

// --------------------------------------------------------------------------- comprimir

/**
 * Reduce la imagen antes de guardarla. Devuelve un blob JPEG.
 * Si algo falla, se guarda el archivo original: más vale pesada que perdida.
 */
export function comprimir(archivo) {
  return new Promise((resolver) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();

    img.onload = () => {
      const escala = Math.min(1, LADO_MAX / Math.max(img.width, img.height));
      const w = Math.round(img.width * escala);
      const h = Math.round(img.height * escala);

      const lienzo = document.createElement('canvas');
      lienzo.width = w;
      lienzo.height = h;
      lienzo.getContext('2d').drawImage(img, 0, 0, w, h);

      lienzo.toBlob((blob) => {
        URL.revokeObjectURL(url);
        resolver(blob ?? archivo);
      }, 'image/jpeg', CALIDAD);
    };

    img.onerror = () => { URL.revokeObjectURL(url); resolver(archivo); };
    img.src = url;
  });
}

// --------------------------------------------------------------------------- api

export async function guardarFoto(archivo, { medicionId, cuartoId, nota = '' } = {}) {
  const blob = await comprimir(archivo);
  const registro = {
    id: `foto_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`,
    medicionId, cuartoId, nota,
    tipo: blob.type || 'image/jpeg',
    bytes: blob.size,
    fecha: new Date().toISOString(),
    blob,
  };
  await transaccion('readwrite', (s) => s.put(registro));
  return { ...registro, blob: undefined };
}

export async function fotosDeCuarto(cuartoId) {
  const db = await abrir();
  return new Promise((resolver, rechazar) => {
    const tx = db.transaction(ALMACEN, 'readonly');
    const req = tx.objectStore(ALMACEN).index('cuarto').getAll(cuartoId);
    req.onsuccess = () => resolver(req.result ?? []);
    req.onerror = () => rechazar(req.error);
  });
}

export async function borrarFoto(id) {
  await transaccion('readwrite', (s) => s.delete(id));
}

export async function borrarFotosDeCuarto(cuartoId) {
  const fotos = await fotosDeCuarto(cuartoId);
  for (const f of fotos) await borrarFoto(f.id);
  return fotos.length;
}

export async function todasLasFotos() {
  const db = await abrir();
  return new Promise((resolver, rechazar) => {
    const tx = db.transaction(ALMACEN, 'readonly');
    const req = tx.objectStore(ALMACEN).getAll();
    req.onsuccess = () => resolver(req.result ?? []);
    req.onerror = () => rechazar(req.error);
  });
}

/** Cuánto ocupan las fotos y cuánto permite el navegador. Para avisar a tiempo. */
export async function espacioUsado() {
  const fotos = await todasLasFotos();
  const bytes = fotos.reduce((a, f) => a + (f.bytes ?? 0), 0);
  let cuota = null;
  try {
    const est = await navigator.storage?.estimate?.();
    cuota = est?.quota ?? null;
  } catch { /* el navegador no lo expone */ }
  return { cuenta: fotos.length, bytes, cuota };
}

/** URL temporal para pintar la foto. Hay que revocarla al quitar el elemento. */
export const urlDeFoto = (registro) => URL.createObjectURL(registro.blob);

export function pesoLegible(bytes) {
  if (!(bytes > 0)) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
