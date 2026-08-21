// Estado global + persistencia local. Fuente única de verdad.
// Persistencia: localStorage. Ver README > Limitaciones antes de operar en producción.

import { CATALOGO_DEMO } from './catalog-seed.js';
import { normalizar, uid } from './format.js';

const LLAVE = 'fmp.cotizador.v1';

export const CONFIG_DEFAULT = {
  empresa: {
    nombre: 'Fernando Martínez Parente',
    razonSocial: 'Fernando Martínez Parente, S.A. de C.V.',
    tagline: 'Pisos de ingeniería y cortinería de especificación',
    rfc: 'XAXX010101000',
    telefono: '+52 55 0000 0000',
    email: 'cotizaciones@ejemplo.mx',
    direccion: 'Av. Ejemplo 000, Col. Ejemplo, 00000, Ciudad de México',
    web: 'www.ejemplo.mx',
    fundacion: '1987',
    logoDataUrl: null,
  },
  fiscal: { iva: 0.16, moneda: 'MXN', tipoCambio: 18.5 },
  comercial: {
    margenDefault: 0.35,
    vigenciaDias: 15,
    anticipoPct: 0.6,
    garantiaAnios: 10,
  },
  logistica: { diasTransito: 35, diasAduana: 7, diasInstalacionM2: 25 },
  tarifas: {
    instalacion: {
      'duela-ingenieria': 320,
      'spc': 240,
      'laminado': 200,
      'deck': 480,
      'porcelanato': 420,
    },
    zocloML: 145,
    underlaymentM2: 48,
    adhesivoCubeta: 2850,
    rendimientoAdhesivoM2: 18,
    perfilTransicionPza: 320,
    boquillaKg: 185,
    confeccionML: 190,
    rielML: 380,
    rielMotorizadoML: 1650,
    forroML: 120,
    instalacionCortinaML: 260,
    minimoInstalacionCortina: 1200,
    dobladilloM: 0.3,
    areaMinimaPersiana: 1.0,
    instalacionPersianaPza: 480,
    motorPersianaPza: 6800,
  },
};

function fusionar(base, extra) {
  if (!extra || typeof extra !== 'object') return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [k, v] of Object.entries(extra)) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && base?.[k]
      ? fusionar(base[k], v)
      : v;
  }
  return out;
}

function cotizacionVacia() {
  return {
    id: uid('cot'),
    folio: null,
    fecha: new Date().toISOString(),
    cliente: { nombre: '', contacto: '', telefono: '', email: '', obra: '' },
    partidas: [],
    descuentoGlobal: 0,
    notas: '',
    vendedor: '',
  };
}

const ESTADO_INICIAL = () => ({
  config: structuredClone(CONFIG_DEFAULT),
  catalogo: structuredClone(CATALOGO_DEMO),
  catalogoEsDemo: true,
  cotizacion: cotizacionVacia(),
  historial: [],
  consecutivo: 1,
});

let estado = ESTADO_INICIAL();
const suscriptores = new Set();

export function cargar() {
  try {
    const crudo = localStorage.getItem(LLAVE);
    if (!crudo) return estado;
    const guardado = JSON.parse(crudo);
    estado = {
      ...ESTADO_INICIAL(),
      ...guardado,
      config: fusionar(CONFIG_DEFAULT, guardado.config),
      cotizacion: guardado.cotizacion ?? cotizacionVacia(),
    };
  } catch (err) {
    console.warn('No se pudo leer el almacenamiento local, se reinicia:', err);
    estado = ESTADO_INICIAL();
  }
  return estado;
}

let pendiente = null;

/** Escribe de inmediato. Obligatorio antes de recargar o cerrar la página. */
export function guardarAhora() {
  clearTimeout(pendiente);
  pendiente = null;
  try {
    localStorage.setItem(LLAVE, JSON.stringify(estado));
    return true;
  } catch (err) {
    console.error('Almacenamiento lleno o bloqueado:', err);
    alert('No se pudo guardar localmente. Exporta un respaldo desde Ajustes.');
    return false;
  }
}

export function guardar() {
  clearTimeout(pendiente);
  pendiente = setTimeout(guardarAhora, 250);
}

// Red de seguridad: si la pestaña se oculta o se cierra con algo pendiente, se escribe.
window.addEventListener('pagehide', () => { if (pendiente) guardarAhora(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && pendiente) guardarAhora();
});

export const obtener = () => estado;

export function actualizar(fn) {
  const res = fn(estado);
  if (res) estado = res;
  guardar();
  emitir();
}

export function suscribir(fn) {
  suscriptores.add(fn);
  return () => suscriptores.delete(fn);
}

function emitir() {
  for (const fn of suscriptores) fn(estado);
}

// --------------------------------------------------------------------------- catálogo

export function guardarProducto(producto) {
  actualizar((s) => {
    const i = s.catalogo.findIndex((p) => p.id === producto.id);
    if (i >= 0) s.catalogo[i] = { ...s.catalogo[i], ...producto };
    else s.catalogo.unshift({ ...producto, id: producto.id || uid('prod') });
    s.catalogoEsDemo = false;
  });
}

export function eliminarProducto(id) {
  actualizar((s) => {
    s.catalogo = s.catalogo.filter((p) => p.id !== id);
    s.cotizacion.partidas = s.cotizacion.partidas.filter((p) => p.productoId !== id);
  });
}

export function reemplazarCatalogo(productos, { fusionar: modoFusion = false } = {}) {
  actualizar((s) => {
    if (modoFusion) {
      const porSku = new Map(s.catalogo.map((p) => [p.sku || p.id, p]));
      for (const nuevo of productos) porSku.set(nuevo.sku || nuevo.id, { ...porSku.get(nuevo.sku || nuevo.id), ...nuevo });
      s.catalogo = Array.from(porSku.values());
    } else {
      s.catalogo = productos;
    }
    s.catalogoEsDemo = false;
  });
}

/**
 * Búsqueda por relevancia sobre texto normalizado.
 * Cada token debe aparecer en algún campo (AND), lo que permite
 * escribir "encino 9mm aceitado" y llegar a un solo producto.
 */
export function buscarProductos(catalogo, consulta, filtros = {}) {
  const tokens = normalizar(consulta).split(' ').filter(Boolean);

  let base = catalogo.filter((p) => {
    if (filtros.categoria && p.categoria !== filtros.categoria) return false;
    if (filtros.especie && p.especie !== filtros.especie) return false;
    if (filtros.acabado && p.acabado !== filtros.acabado) return false;
    if (filtros.espesorMm && Number(p.espesorMm) !== Number(filtros.espesorMm)) return false;
    if (filtros.soloImportados && !p.importado) return false;
    if (filtros.soloExistencia && !(Number(p.stock) > 0)) return false;
    return true;
  });

  if (!tokens.length) return base.map((p) => ({ producto: p, puntaje: 0 }));

  const resultados = [];
  for (const p of base) {
    const campos = {
      nombre: normalizar(p.nombre),
      sku: normalizar(p.sku),
      especie: normalizar(p.especie),
      acabado: normalizar(p.acabado),
      color: normalizar(p.color),
      tela: normalizar(p.tela),
      origen: normalizar(p.origen),
      medidas: normalizar(`${p.espesorMm ?? ''}mm ${p.espesorMm ?? ''} ${p.anchoMm ?? ''} ${p.largoMm ?? ''}`),
      carac: normalizar((p.caracteristicas ?? []).join(' ')),
    };
    const todo = Object.values(campos).join(' ');

    let puntaje = 0;
    let coincidenTodos = true;
    for (const t of tokens) {
      if (!todo.includes(t)) { coincidenTodos = false; break; }
      if (campos.sku.includes(t)) puntaje += 6;
      if (campos.nombre.startsWith(t)) puntaje += 5;
      else if (campos.nombre.includes(t)) puntaje += 4;
      if (campos.especie.includes(t)) puntaje += 3;
      if (campos.acabado.includes(t) || campos.color.includes(t) || campos.tela.includes(t)) puntaje += 2;
      if (campos.medidas.includes(t)) puntaje += 2;
      puntaje += 1;
    }
    if (coincidenTodos) resultados.push({ producto: p, puntaje });
  }
  return resultados.sort((a, b) => b.puntaje - a.puntaje);
}

export function valoresUnicos(catalogo, campo) {
  return Array.from(new Set(catalogo.map((p) => p[campo]).filter(Boolean))).sort((a, b) =>
    String(a).localeCompare(String(b), 'es-MX', { numeric: true }));
}

// --------------------------------------------------------------------------- cotización

export function agregarPartida(partida) {
  actualizar((s) => { s.cotizacion.partidas.push({ id: uid('pt'), ...partida }); });
}

export function actualizarPartida(id, cambios) {
  actualizar((s) => {
    const i = s.cotizacion.partidas.findIndex((p) => p.id === id);
    if (i >= 0) s.cotizacion.partidas[i] = { ...s.cotizacion.partidas[i], ...cambios };
  });
}

export function eliminarPartida(id) {
  actualizar((s) => { s.cotizacion.partidas = s.cotizacion.partidas.filter((p) => p.id !== id); });
}

export function actualizarCliente(cambios) {
  actualizar((s) => { s.cotizacion.cliente = { ...s.cotizacion.cliente, ...cambios }; });
}

export function nuevaCotizacion() {
  actualizar((s) => { s.cotizacion = cotizacionVacia(); });
}

export function asignarFolio() {
  let folio;
  actualizar((s) => {
    if (!s.cotizacion.folio) {
      const anio = new Date().getFullYear();
      s.cotizacion.folio = `COT-${anio}-${String(s.consecutivo).padStart(4, '0')}`;
      s.consecutivo += 1;
    }
    folio = s.cotizacion.folio;
  });
  return folio;
}

export function archivarCotizacion(totales) {
  actualizar((s) => {
    s.historial.unshift({
      id: s.cotizacion.id,
      folio: s.cotizacion.folio,
      fecha: s.cotizacion.fecha,
      cliente: s.cotizacion.cliente.nombre,
      obra: s.cotizacion.cliente.obra,
      total: totales.total,
      margen: totales.margenGlobal,
      partidas: s.cotizacion.partidas.length,
    });
    s.historial = s.historial.slice(0, 100);
  });
}

export function actualizarConfig(ruta, valor) {
  actualizar((s) => {
    const partes = ruta.split('.');
    let nodo = s.config;
    for (let i = 0; i < partes.length - 1; i++) nodo = nodo[partes[i]];
    nodo[partes.at(-1)] = valor;
  });
}

// --------------------------------------------------------------------------- respaldo

export function exportarRespaldo() {
  return JSON.stringify({ ...estado, _exportado: new Date().toISOString() }, null, 2);
}

export function importarRespaldo(json) {
  const datos = JSON.parse(json);
  if (!datos.catalogo || !Array.isArray(datos.catalogo)) {
    throw new Error('El archivo no contiene un catálogo válido.');
  }
  actualizar(() => ({
    ...ESTADO_INICIAL(),
    ...datos,
    config: fusionar(CONFIG_DEFAULT, datos.config),
    cotizacion: datos.cotizacion ?? cotizacionVacia(),
  }));
}

export function restablecer() {
  localStorage.removeItem(LLAVE);
  estado = ESTADO_INICIAL();
  guardar();
  emitir();
}
