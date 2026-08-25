// Reporte mensual de ventas. La pantalla de la dirección.
//
// Responde tres preguntas en este orden: cuánto se vendió, quién lo vendió,
// y de qué. Y una cuarta que suele doler: cuánto de eso ya está cobrado.

import { el, fmtMXN, fmtNum, fmtPct, fmtFechaCorta } from '../format.js';
import * as S from '../state.js';
import { icono, desplegable, selector, vacio, nota, descargarTexto } from '../ui.js';
import { nombreCategoria, resumenVentas, compararMes, mesesConVentas,
         etiquetaMes, mesActual, totalVenta, anticipoEsperado,
         ESTADOS, estadoVenta, ventasVisibles, esAdmin } from '../ventas.js';

let mesElegido = null;

// Rampa cálida. Solo distingue familias, no jerarquiza.
const TONOS = ['#6B6055', '#857A6D', '#9E9384', '#4A6153', '#806A42', '#8C4A45',
               '#B4A896', '#5E6B6B', '#7C7873', '#A6A29C'];
const tono = (i) => TONOS[i % TONOS.length];

export function render(raiz) {
  const s = S.obtener();
  const usuario = S.usuarioActual();
  const admin = esAdmin(usuario, s.config.equipo);
  const todas = s.ventas ?? [];
  const visibles = ventasVisibles(todas, usuario, s.config.equipo);

  const meses = mesesConVentas(visibles);
  if (!mesElegido || !meses.includes(mesElegido)) mesElegido = meses[0] ?? mesActual();

  const r = resumenVentas(visibles, { mes: mesElegido });
  const comp = compararMes(visibles, mesElegido);

  raiz.append(el('div', { class: 'view' },
    cabecera(s, { admin, usuario, meses, r }),

    !usuario
      ? nota('Captura tu nombre en Ajustes. Sin nombre la aplicación no sabe qué ventas son tuyas ' +
             'y el reporte sale vacío.', 'warn', 'alerta')
      : null,

    !r.cuenta
      ? vacio({ iconoNombre: 'barras', titulo: `Sin ventas en ${etiquetaMes(mesElegido)}`,
                mensaje: admin
                  ? 'Cuando el equipo registre ventas de este mes, aquí sale el desglose completo.'
                  : 'Registra tus ventas del mes para que aparezcan en el reporte.' },
          el('button', { class: 'btn btn--primary', onclick: () => { location.hash = '#/registrar'; } },
            icono('mas', 15), 'Registrar una venta'))
      : el('div', { class: 'stack stack-6' },
          tarjetasKPI(r, comp),
          seccionEmbudo(r),
          admin ? seccionSucursales(r) : null,
          seccionVendedores(r, admin),
          seccionMezcla(r),
          seccionLineas(r),
          seccionDetalle(r, admin)),

    !admin
      ? el('div', { class: 'mt-6' },
          nota('Estás viendo solo tus ventas. El desglose de todo el equipo lo abren Fernando, Melissa y Sebastián. ' +
               'Es una separación por confianza, no un candado: no hay contraseñas ni servidor.', '', 'info'))
      : null));
}

// --------------------------------------------------------------------------- encabezado

function cabecera(s, { admin, usuario, meses, r }) {
  return el('header', { class: 'section' },
    el('div', { class: 'row' },
      el('div', { style: 'flex:1;min-width:0' },
        el('p', { class: 'eyebrow' }, admin ? 'Dirección' : `Ventas de ${usuario || 'sin identificar'}`),
        el('h1', { class: 'display mt-3' }, 'Reporte mensual de ventas'),
        el('p', { class: 'lead mt-3' },
          'Solo entran ventas registradas. Una cotización enviada no cuenta hasta que hay venta y anticipo.')),
      el('div', { class: 'row row--tight' },
        selector({
          valor: mesElegido,
          opciones: meses.map((m) => ({ valor: m, etiqueta: etiquetaMes(m) })),
          onChange: (e) => { mesElegido = e.target.value; redibujar(); },
        }),
        r.cuenta
          ? el('button', { class: 'btn', onclick: () => exportarCSV(r) }, icono('bajar', 15), 'CSV')
          : null,
        el('button', { class: 'btn btn--primary', onclick: () => { location.hash = '#/registrar'; } },
          icono('mas', 15), 'Registrar venta'))));
}

function tarjetasKPI(r, comp) {
  const variacion = comp?.variacion;
  return el('div', { class: 'grid-4' },
    kpi('Vendido', fmtMXN(r.total, 0),
      variacion == null
        ? `${r.cuenta} ${r.cuenta === 1 ? 'venta' : 'ventas'}`
        : `${variacion >= 0 ? '+' : ''}${fmtPct(variacion, 1)} contra ${etiquetaMes(comp.mesPrevio)}`,
      variacion == null ? '' : variacion >= 0 ? 'ok' : 'danger'),
    kpi('Cobrado', fmtMXN(r.cobrado, 0), `${fmtPct(r.total ? r.cobrado / r.total : 0, 0)} del mes`),
    kpi('Por cobrar', fmtMXN(r.porCobrar, 0), r.porCobrar > 0 ? 'Anticipos pendientes' : 'Todo al corriente',
      r.porCobrar > 0 ? 'warn' : 'ok'),
    kpi('Ticket promedio', fmtMXN(r.ticket, 0), `${r.vendedores.length} asesores con venta`));
}

function kpi(k, v, n, tinte = '') {
  const color = { ok: 'var(--ok)', warn: 'var(--warn)', danger: 'var(--danger)' }[tinte];
  return el('div', { class: 'kpi' },
    el('div', { class: 'kpi__label' }, k),
    el('div', { class: 'kpi__value', style: color ? `color:${color}` : null }, v),
    el('div', { class: 'kpi__note mt-3' }, n));
}

// --------------------------------------------------------------------------- embudo

const TONO_CSS = {
  warn: 'var(--warn)', ok: 'var(--ok)', cerrado: 'var(--cerrado)', muerto: 'var(--muerto)',
};

/**
 * El semáforo de la dirección: cuánto del mes está solo cotizado, cuánto ya
 * arrancó con anticipo y cuánto está liquidado. Cotizar no es vender, y esta
 * barra es donde se ve la diferencia sin explicarla.
 */
function seccionEmbudo(r) {
  const orden = ['cotizada', 'anticipada', 'liquidada', 'cancelada'];
  const cotizado = orden.reduce((a, k) => a + (r.estados[k] ?? 0), 0);
  if (!(cotizado > 0)) return el('span', {});

  return el('section', {},
    el('div', { class: 'section__head' },
      el('div', { class: 'grow' },
        el('h2', { class: 'title' }, 'De cotizado a cobrado'),
        el('p', { class: 'small muted mt-3' },
          'Una cotización enviada está en ámbar hasta que entra el anticipo. Verde quiere decir que el ' +
          'proyecto arrancó; el azul, que ya no debe nada.'))),

    el('div', { class: 'card card--pad-lg' },
      el('div', { class: 'semaforo' },
        ...orden.filter((k) => r.estados[k] > 0).map((k) => el('div', {
          class: 'semaforo__seg',
          title: `${ESTADOS[k].nombre} · ${fmtMXN(r.estados[k], 0)}`,
          style: `flex:${r.estados[k]};background:${TONO_CSS[ESTADOS[k].tono]}`,
        }))),

      el('div', { class: 'grid-4 mt-5' },
        ...orden.map((k) => el('div', {},
          el('div', { class: 'row row--tight' },
            el('span', { class: 'leyenda__punto', style: `background:${TONO_CSS[ESTADOS[k].tono]};margin-top:0` }),
            el('span', { class: 'small' }, ESTADOS[k].nombre)),
          el('div', { class: 'num mt-3', style: 'font-size:18px;font-weight:600' }, fmtMXN(r.estados[k] ?? 0, 0)),
          el('div', { class: 'tiny' }, fmtPct(cotizado ? (r.estados[k] ?? 0) / cotizado : 0, 0) + ' de lo cotizado'))))));
}

// --------------------------------------------------------------------------- por tienda

function seccionSucursales(r) {
  if (r.sucursales.length < 2) return el('span', {});

  return el('section', {},
    el('div', { class: 'section__head' },
      el('div', { class: 'grow' },
        el('h2', { class: 'title' }, 'Cómo va cada tienda'),
        el('p', { class: 'small muted mt-3' },
          'Santa Fe, Pedregal y la tercera, con sus asesores. Se editan en Ajustes.'))),

    el('div', { class: 'grid-3' },
      ...r.sucursales.map((s, i) => el('div', { class: 'kpi' },
        el('div', { class: 'kpi__label' }, s.sucursal),
        el('div', { class: 'kpi__value' }, fmtMXN(s.total, 0)),
        el('div', { class: 'margen-bar mt-3' },
          el('div', { class: 'margen-bar__fill',
            style: `width:${Math.max(2, s.participacion * 100)}%;background:${tono(i)}` })),
        el('div', { class: 'kpi__note mt-3' },
          `${fmtPct(s.participacion, 1)} del mes · ${s.cuenta} ${s.cuenta === 1 ? 'venta' : 'ventas'} · ` +
          `${s.asesores} ${s.asesores === 1 ? 'asesor' : 'asesores'}`),
        el('div', { class: 'tiny mt-3' }, `Cobrado ${fmtMXN(s.cobrado, 0)}`)))));
}

// --------------------------------------------------------------------------- por vendedor

function seccionVendedores(r, admin) {
  return el('section', {},
    el('div', { class: 'section__head' },
      el('div', { class: 'grow' },
        el('h2', { class: 'title' }, admin ? 'Qué vendió cada asesor' : 'Tu mes'),
        el('p', { class: 'small muted mt-3' },
          'Abre un renglón para ver de qué familia salió su venta.'))),

    el('div', { class: 'stack stack-2' }, ...r.vendedores.map((v, i) => filaVendedor(v, i, r))));
}

function filaVendedor(v, i, r) {
  const barra = el('div', { class: 'margen-bar', style: 'margin-top:8px' },
    el('div', { class: 'margen-bar__fill',
      style: `width:${Math.max(2, v.participacion * 100)}%;background:${tono(i)}` }));

  const cabeza = el('div', { class: 'row', style: 'width:100%' },
    el('span', { class: 'linea__idx' }, String(i + 1)),
    el('span', { style: 'flex:1;min-width:0' },
      el('strong', {}, v.vendedor),
      el('span', { class: 'small muted', style: 'display:block' },
        `${v.cuenta} ${v.cuenta === 1 ? 'venta' : 'ventas'} · ticket ${fmtMXN(v.ticket, 0)} · ` +
        `cobrado ${fmtMXN(v.cobrado, 0)}`)),
    el('span', { class: 'text-r' },
      el('span', { class: 'resumen__row', style: 'display:block;padding:0' },
        el('strong', { class: 'num', style: 'font-size:17px' }, fmtMXN(v.total, 0))),
      el('span', { class: 'tiny' }, `${fmtPct(v.participacion, 1)} del mes`)));

  return desplegable({ titulo: cabeza },
    barra,
    el('div', { class: 'desglose mt-4' },
      ...v.categorias.map((c) => el('div', { class: 'desglose__row' },
        el('span', { class: 'desglose__label' }, nombreCategoria(c.categoria)),
        el('span', { class: 'tiny', style: 'width:52px;text-align:right' }, fmtPct(c.participacion, 0)),
        el('span', { class: 'desglose__val' }, fmtMXN(c.total, 0)))),
      el('div', { class: 'desglose__row desglose__row--total' },
        el('span', { class: 'desglose__label' }, 'Total del asesor'),
        el('span', { class: 'desglose__val' }, fmtMXN(v.total, 0)))),
    el('div', { class: 'tabla-wrap mt-4' },
      el('table', { class: 'tabla', style: 'min-width:520px' },
        el('thead', {}, el('tr', {},
          el('th', {}, 'Fecha'), el('th', {}, 'Cliente'), el('th', {}, 'Obra'),
          el('th', { class: 'r' }, 'Importe'), el('th', { class: 'r' }, 'Estado'))),
        el('tbody', {},
          ...r.ventas.filter((x) => (x.vendedor || 'Sin asignar') === v.vendedor).map((x) =>
            el('tr', {},
              el('td', {}, fmtFechaCorta(x.fecha)),
              el('td', {}, x.cliente || '—'),
              el('td', {}, x.obra || '—'),
              el('td', { class: 'r' }, fmtMXN(totalVenta(x), 0)),
              el('td', { class: 'r' }, pastillaEstado(x))))))));
}

/** La pastilla de estado, con lo que falta cuando todavía falta algo. */
function pastillaEstado(v) {
  const clave = estadoVenta(v);
  const est = ESTADOS[clave];
  const pagado = Number(v.pagado) || 0;
  const falta = clave === 'cotizada'
    ? Math.max(0, anticipoEsperado(v) - pagado)
    : clave === 'anticipada' ? Math.max(0, totalVenta(v) - pagado) : 0;

  return el('span', { class: `pill pill--sm pill--${est.tono}`, title: est.nota },
    falta > 0 ? `${est.corto} · falta ${fmtMXN(falta, 0)}` : est.nombre);
}

// --------------------------------------------------------------------------- mezcla

function seccionMezcla(r) {
  const total = r.total || 1;
  return el('section', {},
    el('div', { class: 'section__head' },
      el('div', { class: 'grow' },
        el('h2', { class: 'title' }, 'De qué se compone el mes'),
        el('p', { class: 'small muted mt-3' },
          'La proporción por familia de producto. Es el número con el que se negocian volúmenes con el proveedor.'))),

    el('div', { class: 'card card--pad-lg' },
      el('div', { class: 'barra-comp' },
        ...r.categorias.map((c, i) => el('div', {
          class: 'barra-comp__seg',
          title: `${nombreCategoria(c.categoria)} · ${fmtMXN(c.total, 0)} · ${fmtPct(c.participacion, 1)}`,
          style: `flex:${Math.max(0.5, (c.total / total) * 100)};background:${tono(i)}`,
        }))),

      el('div', { class: 'leyenda mt-5' },
        ...r.categorias.map((c, i) => el('div', { class: 'leyenda__item' },
          el('span', { class: 'leyenda__punto', style: `background:${tono(i)}` }),
          el('span', {},
            el('span', { class: 'small' }, nombreCategoria(c.categoria)),
            el('span', { class: 'tiny', style: 'display:block' },
              `${fmtPct(c.participacion, 1)} · ${fmtMXN(c.total, 0)}` +
              (c.cantidad ? ` · ${fmtNum(c.cantidad, 2)} unidades` : ''))))))));
}

// --------------------------------------------------------------------------- líneas

function seccionLineas(r) {
  if (!r.lineas.length) return el('span', {});
  return el('section', {},
    el('div', { class: 'section__head' },
      el('div', { class: 'grow' },
        el('h2', { class: 'title' }, 'Producto por línea y color'),
        el('p', { class: 'small muted mt-3' },
          'Así lo reconoce el equipo en bodega y así lo pide al proveedor, no por código.'))),

    el('div', { class: 'tabla-wrap' },
      el('table', { class: 'tabla' },
        el('thead', {}, el('tr', {},
          el('th', {}, 'Línea'), el('th', {}, 'Color'), el('th', {}, 'Proveedor'),
          el('th', {}, 'Familia'), el('th', { class: 'r' }, 'Cantidad'), el('th', { class: 'r' }, 'Importe'))),
        el('tbody', {}, ...r.lineas.map((l) => el('tr', {},
          el('td', {}, el('strong', {}, l.linea || '—')),
          el('td', {}, l.color || '—'),
          el('td', {}, l.proveedor || '—'),
          el('td', {}, el('span', { class: 'pill pill--sm pill--outline' }, nombreCategoria(l.categoria))),
          el('td', { class: 'r' }, fmtNum(l.cantidad, 2)),
          el('td', { class: 'r' }, fmtMXN(l.total, 0))))))));
}

// --------------------------------------------------------------------------- detalle

function seccionDetalle(r, admin) {
  // Las canceladas van al final y en gris: se ven, pero no compiten con el mes.
  const filas = [...r.ventas, ...r.canceladas];

  return desplegable({
    titulo: `Todas las cotizaciones de ${etiquetaMes(r.mes)} (${filas.length})`,
  },
    el('div', { class: 'tabla-wrap' },
      el('table', { class: 'tabla' },
        el('thead', {}, el('tr', {},
          el('th', {}, 'Fecha'),
          admin ? el('th', {}, 'Asesor') : null,
          admin ? el('th', {}, 'Tienda') : null,
          el('th', {}, 'Cliente'), el('th', {}, 'Obra'),
          el('th', { class: 'r' }, 'Importe'), el('th', { class: 'r' }, 'Pagado'),
          el('th', {}, 'Estado'), el('th', {}, ''))),
        el('tbody', {}, ...filas.map((v) => el('tr', {
          style: estadoVenta(v) === 'cancelada' ? 'opacity:.55' : null,
        },
          el('td', {}, fmtFechaCorta(v.fecha)),
          admin ? el('td', {}, v.vendedor || '—') : null,
          admin ? el('td', {}, v.sucursal || '—') : null,
          el('td', {}, v.cliente || '—'),
          el('td', {}, v.obra || '—'),
          el('td', { class: 'r' }, fmtMXN(totalVenta(v), 0)),
          el('td', { class: 'r' }, fmtMXN(Number(v.pagado) || 0, 0)),
          el('td', {}, pastillaEstado(v)),
          el('td', {},
            el('button', { class: 'btn btn--ghost btn--sm',
              onclick: () => { location.hash = `#/registrar?id=${v.id}`; } }, 'Abrir'))))))));
}

// --------------------------------------------------------------------------- csv

function exportarCSV(r) {
  // Estas son las columnas que van a la hoja de cálculo compartida en la fase 2.
  const filas = [['Fecha', 'Asesor', 'Tienda', 'Cliente', 'Obra', 'Apartado', 'Proveedor',
                  'Linea', 'Color', 'Familia', 'Cantidad', 'Unidad', 'PrecioUnitario',
                  'Importe', 'PagadoVenta', 'Estado']];

  for (const v of [...r.ventas, ...r.canceladas]) {
    for (const l of v.lineas ?? []) {
      filas.push([
        v.fecha, v.vendedor, v.sucursal, v.cliente, v.obra,
        l.apartado, l.proveedor, l.linea, l.color,
        nombreCategoria(l.categoria),
        l.cantidad, l.unidad, l.precioUnit,
        (Number(l.cantidad) || 0) * (Number(l.precioUnit) || 0),
        v.pagado ?? 0,
        ESTADOS[estadoVenta(v)].nombre,
      ]);
    }
  }

  const csv = filas.map((f) => f.map((c) => {
    const s = String(c ?? '');
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\n');

  descargarTexto(`ventas-${r.mes}.csv`, '﻿' + csv, 'text/csv;charset=utf-8');
}

const redibujar = () => window.dispatchEvent(new CustomEvent('fmp:rerender'));
