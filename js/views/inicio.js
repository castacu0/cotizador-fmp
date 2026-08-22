// Portada: dos caminos, y cada uno abre su propio menú.
// La dirección lo pidió así: quien entra decide primero si viene a cotizar
// o a ver el mes, y no antes de eso ve doce pestañas.

import { el, fmtMXN, fmtNum } from '../format.js';
import * as S from '../state.js';
import { icono, nota } from '../ui.js';
import { calcularMedicion } from '../medidas.js';
import { resumenVentas, mesActual, etiquetaMes, ventasVisibles, esAdmin } from '../ventas.js';

const OPCIONES = [
  {
    clave: 'cotizar',
    hash: '#/medidor',
    iconoNombre: 'regla',
    titulo: 'Cotización',
    lead: 'Levanta las medidas en la obra, arma la cotización y manda el PDF al cliente.',
    puntos: [
      { hash: '#/medidor',   etiqueta: 'Medir en obra',   nota: 'Solo números, como una calculadora' },
      { hash: '#/cotizador', etiqueta: 'Cotizar',         nota: 'Merma, cajas, accesorios y entrega' },
      { hash: '#/catalogo',  etiqueta: 'Catálogo',        nota: 'Materiales, líneas y colores' },
      { hash: '#/ayuda',     etiqueta: 'Ayuda',           nota: 'Fórmulas y capacitación' },
    ],
  },
  {
    clave: 'ventas',
    hash: '#/ventas',
    iconoNombre: 'barras',
    titulo: 'Reporte mensual de ventas',
    lead: 'Qué vendió cada asesor, de qué línea y color, en qué proporción y cuánto está cobrado.',
    puntos: [
      { hash: '#/ventas',    etiqueta: 'Reporte del mes', nota: 'Desglose por asesor y por familia' },
      { hash: '#/registrar', etiqueta: 'Registrar venta', nota: 'Con su anticipo y su comprobante' },
      { hash: '#/ahorro',    etiqueta: 'Tablero',         nota: 'Ahorro, margen y actividad' },
    ],
  },
];

export function render(raiz) {
  const s = S.obtener();
  const empresa = s.config.empresa;
  const usuario = (s.usuario || '').trim();
  const admin = esAdmin(usuario, s.config.equipo);

  const mes = mesActual();
  const visibles = ventasVisibles(s.ventas ?? [], usuario, s.config.equipo);
  const resumen = resumenVentas(visibles, { mes });

  const mediciones = s.mediciones ?? [];
  const m2Levantados = mediciones.reduce((a, m) => a + calcularMedicion(m).areaM2, 0);

  raiz.append(el('div', { class: 'view' },
    el('header', { class: 'section portada__head' },
      el('p', { class: 'eyebrow' }, empresa.nombre),
      el('h1', { class: 'display mt-3' }, usuario ? `Hola, ${usuario.split(/\s+/)[0]}` : 'Bienvenido'),
      el('p', { class: 'lead mt-3' },
        '¿Qué vas a hacer hoy? Elige un camino. Puedes regresar aquí desde el logotipo, arriba a la izquierda.'),
      !usuario
        ? el('div', { class: 'mt-5' },
            nota('Nadie ha dicho quién usa esta computadora. Ve a Ajustes y captura tu nombre: de eso dependen ' +
                 'el reporte de ventas y la bitácora.', 'warn', 'alerta'))
        : null),

    el('div', { class: 'portada' }, ...OPCIONES.map((o) => tarjeta(o, { admin, resumen, mediciones, m2Levantados, mes }))),

    el('div', { class: 'portada__pie mt-6' },
      el('span', { class: 'tiny' }, 'También:'),
      enlacePie('#/servicios', 'Qué incluye el servicio'),
      enlacePie('#/ajustes', 'Ajustes y equipo'),
      enlacePie('#/ahorro', 'Tablero de dirección'))));
}

function enlacePie(hash, texto) {
  return el('button', {
    class: 'btn btn--ghost btn--sm',
    onclick: () => { location.hash = hash; },
  }, texto);
}

function tarjeta(o, ctx) {
  const cifras = o.clave === 'cotizar'
    ? [
        { k: 'Obras levantadas', v: String(ctx.mediciones.length) },
        { k: 'Metros medidos', v: `${fmtNum(ctx.m2Levantados, 2)} m²` },
      ]
    : [
        { k: etiquetaMes(ctx.mes), v: fmtMXN(ctx.resumen.total, 0) },
        { k: 'Por cobrar', v: fmtMXN(ctx.resumen.porCobrar, 0) },
      ];

  return el('section', { class: 'opcion' },
    el('button', {
      class: 'opcion__principal',
      onclick: () => { location.hash = o.hash; },
    },
      el('span', { class: 'opcion__icono' }, icono(o.iconoNombre, 26)),
      el('span', { class: 'opcion__texto' },
        el('span', { class: 'opcion__titulo' }, o.titulo),
        el('span', { class: 'opcion__lead' }, o.lead)),
      el('span', { class: 'opcion__flecha' }, icono('chevron', 20, 1.8))),

    el('div', { class: 'opcion__cifras' },
      ...cifras.map((c) => el('div', {},
        el('div', { class: 'tiny' }, c.k),
        el('div', { class: 'opcion__cifra num' }, c.v)))),

    el('div', { class: 'opcion__menu' },
      ...o.puntos.map((p) => el('button', {
        class: 'opcion__punto',
        onclick: () => { location.hash = p.hash; },
      },
        el('span', {},
          el('span', { class: 'opcion__punto-t' }, p.etiqueta),
          el('span', { class: 'opcion__punto-n' }, p.nota)),
        icono('chevron', 15, 1.8)))),

    o.clave === 'ventas' && !ctx.admin
      ? el('p', { class: 'tiny mt-3' },
          'Ves solo tus ventas. El desglose de todo el equipo lo abren Fernando, Melissa y Sebastián.')
      : null);
}
