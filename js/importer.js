// Importación del catálogo desde Excel (.xlsx/.xls) o CSV.
// Los años de hojas de cálculo de la empresa entran por aquí.

import { normalizar, uid } from './format.js';

// Alias de encabezados. Se compara contra el texto normalizado de la columna.
const ALIAS = {
  sku:         ['sku', 'codigo', 'clave', 'code', 'modelo', 'no parte', 'referencia'],
  nombreEn:    ['nombre ingles', 'nombre en ingles', 'english name', 'nombre en', 'ingles', 'english'],
  nombre:      ['nombre', 'descripcion', 'producto', 'articulo', 'name', 'description', 'item'],
  categoria:   ['categoria', 'familia', 'linea', 'tipo', 'category', 'grupo'],
  especie:     ['especie', 'material', 'madera', 'species', 'sustrato'],
  espesorMm:   ['espesor', 'grosor', 'thickness', 'espesor mm', 'calibre'],
  anchoMm:     ['ancho', 'width', 'ancho mm'],
  largoMm:     ['largo', 'length', 'largo mm', 'longitud'],
  capaNobleMm: ['capa noble', 'capa', 'wear layer', 'chapa'],
  acabado:     ['acabado', 'finish', 'terminado', 'textura'],
  color:       ['color', 'tono', 'colour'],
  tela:        ['tela', 'fabric', 'composicion', 'material tela'],
  anchoRolloM: ['ancho rollo', 'ancho de rollo', 'roll width', 'ancho tela'],
  m2PorCaja:   ['m2 por caja', 'm2 caja', 'm2caja', 'rendimiento', 'metros por caja', 'm2 x caja', 'caja m2'],
  precio:      ['precio', 'costo', 'price', 'precio unitario', 'precio m2', 'pu', 'precio lista', 'cost'],
  moneda:      ['moneda', 'currency', 'divisa'],
  unidad:      ['unidad', 'um', 'unit', 'unidad medida'],
  origen:      ['origen', 'pais', 'country', 'procedencia', 'fabricante'],
  importado:   ['importado', 'imported', 'nacional importado', 'es importado'],
  leadTimeDias:['lead time', 'tiempo entrega', 'dias entrega', 'plazo', 'entrega dias', 'leadtime', 'dias'],
  stock:       ['stock', 'existencia', 'inventario', 'disponible', 'exist'],
  notas:       ['notas', 'observaciones', 'comentarios', 'notes'],
};

const CATEGORIA_ALIAS = {
  'duela-ingenieria': ['duela', 'ingenieria', 'engineered', 'madera', 'multicapa', 'parquet', 'piso madera'],
  'spc':              ['spc', 'vinil', 'vinilico', 'lvt', 'impermeable', 'wpc rigido'],
  'laminado':         ['laminado', 'laminate', 'ac4', 'ac5'],
  'deck':             ['deck', 'exterior', 'decking', 'terraza'],
  'porcelanato':      ['porcelanato', 'porcelain', 'ceramica', 'azulejo', 'loseta', 'tile'],
  'cortina':          ['cortina', 'curtain', 'tela', 'blackout', 'velo', 'drapery'],
  'persiana':         ['persiana', 'blind', 'enrollable', 'shade', 'panel japones'],
  'accesorio':        ['accesorio', 'zoclo', 'moldura', 'perfil', 'adhesivo', 'riel', 'insumo'],
};

const aNumero = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (v == null || v === '') return null;
  const limpio = String(v).replace(/[^0-9.,-]/g, '').replace(/,(?=\d{3}\b)/g, '').replace(',', '.');
  const n = parseFloat(limpio);
  return Number.isFinite(n) ? n : null;
};

const aBooleano = (v) => {
  const s = normalizar(v);
  return ['si', 'yes', 'true', '1', 'x', 'importado', 'imported', 'verdadero'].includes(s);
};

export function normalizarCategoria(valor) {
  const s = normalizar(valor);
  if (!s) return null;
  if (CATEGORIA_ALIAS[s]) return s;
  for (const [clave, alias] of Object.entries(CATEGORIA_ALIAS)) {
    if (alias.some((a) => s.includes(a))) return clave;
  }
  return null;
}

/**
 * Propone un mapeo columna -> campo.
 *
 * Se puntúan TODOS los pares posibles y luego se asignan de mayor a menor.
 * Asignar campo por campo en orden era frágil: con las columnas "Nombre" y
 * "Nombre ingles", el primer campo en la lista se llevaba la columna equivocada.
 * El alias más largo gana, porque es el más específico.
 */
export function sugerirMapeo(columnas) {
  const pares = [];

  for (const [campo, alias] of Object.entries(ALIAS)) {
    for (const col of columnas) {
      const n = normalizar(col);
      if (!n) continue;
      let mejor = 0;
      for (const a of alias) {
        let puntaje = 0;
        if (n === a) puntaje = 100 + a.length;                       // coincidencia exacta
        else if (n.includes(a)) puntaje = 70 + Math.min(a.length, 20); // la columna contiene el alias
        else if (a.includes(n) && n.length >= 5) puntaje = 40;        // al revés: mucho más débil
        if (puntaje > mejor) mejor = puntaje;
      }
      if (mejor >= 40) pares.push({ campo, col, puntaje: mejor });
    }
  }

  pares.sort((a, b) => b.puntaje - a.puntaje);

  const mapeo = {};
  const usadas = new Set();
  for (const par of pares) {
    if (mapeo[par.campo] || usadas.has(par.col)) continue;
    mapeo[par.campo] = par.col;
    usadas.add(par.col);
  }
  return mapeo;
}

// --------------------------------------------------------------------------- lectura

function parsearCSV(texto) {
  // Detecta el separador más probable en la primera línea.
  const primera = texto.split(/\r?\n/)[0] ?? '';
  const sep = [',', ';', '\t'].reduce((a, b) =>
    (primera.split(b).length > primera.split(a).length ? b : a), ',');

  const filas = [];
  let campo = '';
  let fila = [];
  let enComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (enComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i++; }
        else enComillas = false;
      } else campo += c;
    } else if (c === '"') enComillas = true;
    else if (c === sep) { fila.push(campo); campo = ''; }
    else if (c === '\n') { fila.push(campo); filas.push(fila); fila = []; campo = ''; }
    else if (c !== '\r') campo += c;
  }
  if (campo !== '' || fila.length) { fila.push(campo); filas.push(fila); }

  const encabezados = (filas.shift() ?? []).map((h) => String(h).trim());
  return filas
    .filter((f) => f.some((c) => String(c).trim() !== ''))
    .map((f) => Object.fromEntries(encabezados.map((h, i) => [h, f[i] ?? ''])));
}

let xlsxCargado = null;
function cargarXLSX() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (xlsxCargado) return xlsxCargado;
  xlsxCargado = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'vendor/xlsx.full.min.js';
    s.onload = () => res(window.XLSX);
    s.onerror = () => rej(new Error('No se pudo cargar el lector de Excel.'));
    document.head.append(s);
  });
  return xlsxCargado;
}

/** Devuelve { columnas, filas, hojas, hoja } listo para mapear. */
export async function leerArchivo(file, hojaSolicitada = null) {
  const nombre = file.name.toLowerCase();

  if (nombre.endsWith('.csv') || nombre.endsWith('.txt')) {
    const texto = await file.text();
    const filas = parsearCSV(texto);
    return { filas, columnas: Object.keys(filas[0] ?? {}), hojas: ['CSV'], hoja: 'CSV' };
  }

  const XLSX = await cargarXLSX();
  const buffer = await file.arrayBuffer();
  const libro = XLSX.read(buffer, { type: 'array', cellDates: true });
  const hojas = libro.SheetNames;
  const hoja = hojaSolicitada && hojas.includes(hojaSolicitada) ? hojaSolicitada : hojas[0];
  const filas = XLSX.utils.sheet_to_json(libro.Sheets[hoja], { defval: '', raw: true });
  return { filas, columnas: Object.keys(filas[0] ?? {}), hojas, hoja };
}

// --------------------------------------------------------------------------- mapeo

/**
 * Convierte filas crudas en productos del catálogo.
 * Devuelve { productos, descartadas, avisos } para poder mostrar un preview honesto.
 */
export function mapearFilas(filas, mapeo, opciones = {}) {
  const { categoriaPorDefecto = null, monedaPorDefecto = 'MXN', unidadPorDefecto = 'm2' } = opciones;
  const productos = [];
  const descartadas = [];
  const avisos = [];
  const skusVistos = new Set();

  filas.forEach((fila, idx) => {
    const v = (campo) => (mapeo[campo] ? fila[mapeo[campo]] : undefined);

    const nombre = String(v('nombre') ?? '').trim();
    const precio = aNumero(v('precio'));

    if (!nombre) { descartadas.push({ fila: idx + 2, razon: 'Sin nombre de producto' }); return; }
    if (precio == null || precio <= 0) {
      descartadas.push({ fila: idx + 2, razon: `"${nombre}": sin precio válido` });
      return;
    }

    const categoria = normalizarCategoria(v('categoria')) ?? normalizarCategoria(nombre) ?? categoriaPorDefecto;
    if (!categoria) {
      descartadas.push({ fila: idx + 2, razon: `"${nombre}": categoría no reconocida` });
      return;
    }

    let sku = String(v('sku') ?? '').trim() || normalizar(nombre).replace(/\s+/g, '-').slice(0, 28).toUpperCase();
    if (skusVistos.has(sku)) {
      const original = sku;
      let n = 2;
      while (skusVistos.has(`${original}-${n}`)) n++;
      sku = `${original}-${n}`;
      avisos.push(`SKU duplicado "${original}" en la fila ${idx + 2}, se renombró a "${sku}".`);
    }
    skusVistos.add(sku);

    const importadoCol = v('importado');
    const origen = String(v('origen') ?? '').trim();
    const importado = importadoCol !== undefined
      ? aBooleano(importadoCol)
      : Boolean(origen) && !['mexico', 'nacional', 'mx'].includes(normalizar(origen));

    const m2Caja = aNumero(v('m2PorCaja'));
    const familiaPiso = ['duela-ingenieria', 'spc', 'laminado', 'deck', 'porcelanato'].includes(categoria);
    if (familiaPiso && !m2Caja) {
      avisos.push(`"${nombre}": sin m² por caja. Se cotizará sin redondeo a caja completa.`);
    }

    productos.push({
      id: uid('prod'),
      sku,
      nombre,
      nombreEn: String(v('nombreEn') ?? '').trim() || undefined,
      categoria,
      especie: String(v('especie') ?? '').trim() || undefined,
      espesorMm: aNumero(v('espesorMm')) ?? undefined,
      anchoMm: aNumero(v('anchoMm')) ?? undefined,
      largoMm: aNumero(v('largoMm')) ?? undefined,
      capaNobleMm: aNumero(v('capaNobleMm')) ?? undefined,
      acabado: String(v('acabado') ?? '').trim() || undefined,
      color: String(v('color') ?? '').trim() || undefined,
      tela: String(v('tela') ?? '').trim() || undefined,
      anchoRolloM: aNumero(v('anchoRolloM')) ?? undefined,
      m2PorCaja: m2Caja ?? undefined,
      precio,
      moneda: (String(v('moneda') ?? '').trim().toUpperCase() === 'USD') ? 'USD' : monedaPorDefecto,
      unidad: String(v('unidad') ?? '').trim() || unidadPorDefecto,
      importado,
      origen: origen || undefined,
      leadTimeDias: aNumero(v('leadTimeDias')) ?? (importado ? 45 : 3),
      stock: aNumero(v('stock')) ?? 0,
      notas: String(v('notas') ?? '').trim() || undefined,
      caracteristicas: [],
    });
  });

  return { productos, descartadas, avisos };
}

/** Plantilla CSV para que la empresa acomode su Excel antes de importar. */
export function plantillaCSV() {
  const cols = ['SKU', 'Nombre', 'Nombre ingles', 'Categoria', 'Especie', 'Espesor mm', 'Ancho mm', 'Largo mm',
    'Capa noble mm', 'Acabado', 'Color', 'Tela', 'Ancho rollo m', 'M2 por caja', 'Precio',
    'Moneda', 'Unidad', 'Origen', 'Importado', 'Lead time dias', 'Stock', 'Notas'];
  const ejemplos = [
    ['DI-ENC-14-220', 'Duela de ingenieria Encino Premium', 'Oiled Engineered Oak Flooring', 'duela-ingenieria', 'Encino', 14, 220,
      2200, 3, 'Aceitado mate premium', 'Encino natural', '', '', 2.42, 1690, 'MXN', 'm2',
      'Mexico', 'No', 5, 420, 'Admite 2 relijados'],
    ['CORT-BO-HOT', 'Blackout hotelero retardante de flama', 'Flame Retardant Hotel Blackout Drapery', 'cortina', '', '', '', '', '', 'Mate',
      'Arena', 'Poliester FR', 2.9, '', 340, 'MXN', 'ml', 'Turquia', 'Si', 35, 1400, 'NFPA 701'],
    ['PER-ENR-SCR3', 'Persiana enrollable Screen 3%', '3% Solar Screen Roller Shade', 'persiana', '', '', '', '', '', 'Screen 3%',
      'Gris carbon', 'Fibra de vidrio', '', '', 760, 'MXN', 'm2', 'Mexico', 'No', 12, 0, 'A medida'],
  ];
  const esc = (c) => (/[",;\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : String(c));
  return [cols, ...ejemplos].map((f) => f.map(esc).join(',')).join('\n');
}

export function catalogoACSV(catalogo) {
  const cols = ['sku', 'nombre', 'nombreEn', 'categoria', 'especie', 'espesorMm', 'anchoMm', 'largoMm',
    'capaNobleMm', 'acabado', 'color', 'tela', 'anchoRolloM', 'm2PorCaja', 'precio', 'moneda',
    'unidad', 'origen', 'importado', 'leadTimeDias', 'stock', 'notas'];
  const esc = (c) => (/[",;\n]/.test(String(c ?? '')) ? `"${String(c).replace(/"/g, '""')}"` : String(c ?? ''));
  return [cols.join(','), ...catalogo.map((p) => cols.map((c) => esc(p[c])).join(','))].join('\n');
}
