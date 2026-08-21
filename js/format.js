// Utilidades de formato y DOM. Todo en es-MX.

export const fmtMXN = (n, dec = 2) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(Number.isFinite(n) ? n : 0);

export const fmtNum = (n, dec = 2) =>
  new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(Number.isFinite(n) ? n : 0);

export const fmtPct = (n, dec = 1) => `${fmtNum(n * 100, dec)}%`;

export const fmtFecha = (d) =>
  new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
    .format(d instanceof Date ? d : new Date(d));

export const fmtFechaCorta = (d) =>
  new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(d instanceof Date ? d : new Date(d));

export function sumarDias(fecha, dias) {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d;
}

/** Días hábiles aproximados: descarta sábados y domingos. */
export function sumarDiasHabiles(fecha, dias) {
  const d = new Date(fecha);
  let restantes = dias;
  while (restantes > 0) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) restantes--;
  }
  return d;
}

/** Normaliza texto para búsqueda: minúsculas, sin acentos, sin puntuación. */
export const normalizar = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const mmAPulgadas = (mm) => mm / 25.4;
export const pulgadasAMm = (inch) => inch * 25.4;

/** Convierte "9", "9mm", "0.354 in", "3/8\"" a milímetros. */
export function aMilimetros(valor, unidad = 'mm') {
  const n = parseFloat(String(valor).replace(',', '.'));
  if (!Number.isFinite(n)) return 0;
  return unidad === 'in' ? pulgadasAMm(n) : n;
}

export const uid = (prefijo = 'id') =>
  `${prefijo}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;

/**
 * Redondeo comercial hacia arriba al múltiplo indicado.
 * Se normaliza el punto flotante: sin esto, redondearArriba(8.48, 0.1)
 * puede devolver 8.500000000000002 y arrastrar el error a los importes.
 */
export const redondearArriba = (n, multiplo = 1) => {
  if (!Number.isFinite(n)) return 0;
  if (!(multiplo > 0)) return n;
  const veces = Math.ceil(Number((n / multiplo).toFixed(9)));
  return Number((veces * multiplo).toFixed(6));
};

export const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

// --- DOM ---

export const $ = (sel, ctx = document) => ctx.querySelector(sel);
export const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

export function el(tag, attrs = {}, ...hijos) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const h of hijos.flat()) {
    if (h == null || h === false) continue;
    node.append(h instanceof Node ? h : document.createTextNode(String(h)));
  }
  return node;
}

export const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
