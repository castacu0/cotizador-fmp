// Documentos del proveedor: listas de precios, fichas técnicas y catálogos en
// PDF, para consultarlos sin salir de la aplicación.
//
// Van en IndexedDB por la misma razón que las fotos: una lista de precios pesa
// entre 5 y 40 MB y localStorage tiene 5 MB en total. Viven en el navegador de
// esta computadora y no entran al respaldo JSON. Son la copia de trabajo; el
// original sigue en My HunterDouglas.

const BD = 'fmp.documentos';
const ALMACEN = 'documentos';
const VERSION = 1;

/** Por arriba de esto el visor del navegador se arrastra. Se avisa, no se bloquea. */
export const PESO_AVISO = 40 * 1024 * 1024;
/** Tope duro: un archivo así casi seguro no es una lista de precios. */
export const PESO_MAXIMO = 120 * 1024 * 1024;

export const ETIQUETAS = ['Lista de precios', 'Ficha técnica', 'Catálogo', 'Manual', 'Otro'];

let conexion = null;

function abrir() {
  if (conexion) return Promise.resolve(conexion);
  return new Promise((resolver, rechazar) => {
    const req = indexedDB.open(BD, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ALMACEN)) {
        db.createObjectStore(ALMACEN, { keyPath: 'id' });
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

/** ¿Puede este navegador guardar documentos? Sin esto la pantalla lo dice. */
export const hayAlmacen = () => typeof indexedDB !== 'undefined';

export const esPDF = (archivo) =>
  archivo?.type === 'application/pdf' || /\.pdf$/i.test(archivo?.name ?? '');

// --------------------------------------------------------------------------- api

export async function guardarDocumento(archivo, { etiqueta = 'Otro', proveedor = 'Hunter Douglas', nota = '' } = {}) {
  if (!esPDF(archivo)) throw new Error('Solo se aceptan archivos PDF.');
  if (archivo.size > PESO_MAXIMO) throw new Error('El archivo pasa de 120 MB. Divide el PDF antes de subirlo.');
  const registro = {
    id: `doc_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`,
    nombre: archivo.name.replace(/\.pdf$/i, ''),
    etiqueta, proveedor, nota,
    tipo: 'application/pdf',
    bytes: archivo.size,
    fecha: new Date().toISOString(),
    blob: archivo,
  };
  await transaccion('readwrite', (s) => s.put(registro));
  return sinBlob(registro);
}

export async function actualizarDocumento(id, cambios) {
  const actual = await documento(id);
  if (!actual) return null;
  const nuevo = { ...actual, ...cambios, id };
  await transaccion('readwrite', (s) => s.put(nuevo));
  return sinBlob(nuevo);
}

export async function documento(id) {
  return transaccion('readonly', (s) => s.get(id));
}

/** Lista sin los blobs, ordenada del más reciente al más viejo. */
export async function listarDocumentos() {
  const todos = await transaccion('readonly', (s) => s.getAll());
  return (todos ?? []).map(sinBlob).sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export async function borrarDocumento(id) {
  await transaccion('readwrite', (s) => s.delete(id));
}

/** Cuánto ocupan los documentos y cuánto permite el navegador. */
export async function espacioUsado() {
  const docs = await listarDocumentos();
  const bytes = docs.reduce((a, d) => a + (d.bytes ?? 0), 0);
  let cuota = null;
  try {
    const est = await navigator.storage?.estimate?.();
    cuota = est?.quota ?? null;
  } catch { /* el navegador no lo expone */ }
  return { cuenta: docs.length, bytes, cuota };
}

/** URL temporal para el visor. Hay que revocarla al cerrar. */
export const urlDeDocumento = (registro) => URL.createObjectURL(registro.blob);

export function pesoLegible(bytes) {
  if (!(bytes > 0)) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Filtro por texto y etiqueta, sobre nombre, etiqueta, proveedor y nota. */
export function filtrarDocumentos(docs, consulta = '', etiqueta = '') {
  const tokens = String(consulta).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .split(/\s+/).filter(Boolean);
  return docs.filter((d) => {
    if (etiqueta && d.etiqueta !== etiqueta) return false;
    if (!tokens.length) return true;
    const heno = `${d.nombre} ${d.etiqueta} ${d.proveedor} ${d.nota ?? ''}`
      .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return tokens.every((t) => heno.includes(t));
  });
}

const sinBlob = (r) => ({ ...r, blob: undefined });
