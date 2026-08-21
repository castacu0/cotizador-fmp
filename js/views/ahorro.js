// Tablero de dirección: qué está ahorrando la empresa y quién ha tocado qué.

import { el, fmtMXN, fmtNum, fmtFecha, fmtFechaCorta, normalizar } from '../format.js';
import * as S from '../state.js';
import { icono, accion, campo, entrada, nota, vacio, descargarTexto, avisar } from '../ui.js';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// ---------------------------------------------------------------------------
// Cálculo
// ---------------------------------------------------------------------------

/**
 * Todo sale del historial real de cotizaciones emitidas más los supuestos
 * editables de Ajustes. Ningún número está inventado en el código.
 */
export function calcularAhorro(s) {
  const h = s.historial ?? [];
  const a = s.config.ahorro;

  const cotizaciones = h.length;
  const horasAntes = cotizaciones * a.horasPorCotizacionAntes;
  const horasAhora = cotizaciones * (a.minutosPorCotizacionAhora / 60);
  const horasLiberadas = Math.max(0, horasAntes - horasAhora);
  const valorHoras = horasLiberadas * a.costoHora;

  const valorCotizado = h.reduce((t, c) => t + (c.total ?? 0), 0);
  const material = valorCotizado * a.proporcionMaterial;
  const margenRecuperado = material * a.tasaCierre * a.obrasConError * a.mermaNoCotizadaPct;

  const beneficio = valorHoras + margenRecuperado;
  const margenPromedio = cotizaciones
    ? h.reduce((t, c) => t + (c.margen ?? 0), 0) / cotizaciones
    : 0;
  const bajoMinimo = h.filter((c) => (c.margen ?? 1) < 0.25).length;
  const ticketPromedio = cotizaciones ? valorCotizado / cotizaciones : 0;

  // Serie mensual de los últimos 12 meses con actividad.
  const porMes = new Map();
  for (const c of h) {
    const d = new Date(c.fecha);
    const clave = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
    const actual = porMes.get(clave) ?? { clave, anio: d.getFullYear(), mes: d.getMonth(), total: 0, n: 0 };
    actual.total += c.total ?? 0;
    actual.n += 1;
    porMes.set(clave, actual);
  }
  const serie = [...porMes.values()]
    .sort((x, y) => x.clave.localeCompare(y.clave))
    .slice(-12);

  return {
    cotizaciones, horasLiberadas, valorHoras, valorCotizado,
    margenRecuperado, beneficio, margenPromedio, bajoMinimo, ticketPromedio, serie,
  };
}

// ---------------------------------------------------------------------------
// Vista
// ---------------------------------------------------------------------------

let refs = {};
let filtroBitacora = '';

export function render(raiz) {
  const s = S.obtener();
  const d = calcularAhorro(s);

  const cuerpo = el('div', { class: 'stack stack-6' });
  refs.cuerpo = cuerpo;

  raiz.append(el('div', { class: 'view' },
    el('header', { class: 'section' },
      el('div', { class: 'row' },
        el('div', { style: 'flex:1;min-width:0' },
          el('p', { class: 'eyebrow' }, 'Dirección'),
          el('h1', { class: 'display mt-3' }, 'Ahorro y control'),
          el('p', { class: 'lead mt-3' },
            'Lo que la herramienta le ha devuelto a la empresa, calculado sobre las cotizaciones realmente emitidas. Los supuestos se ajustan abajo.')),
        el('button', { class: 'btn', onclick: exportarBitacora },
          icono('bajar', 15), 'Exportar bitácora'))),
    cuerpo));

  if (!d.cotizaciones) {
    cuerpo.append(el('div', { class: 'card card--quiet' },
      vacio({ iconoNombre: 'barras', titulo: 'Todavía no hay cotizaciones emitidas',
              mensaje: 'El tablero se llena solo conforme el equipo genera PDF. Cada cotización emitida suma a las horas liberadas y al margen recuperado.' })));
    cuerpo.append(bloqueActividad(s), bloqueBitacora(s));
    return;
  }

  cuerpo.append(
    heroBeneficio(d),
    tarjetasClave(d, s),
    composicion(d),
    graficaMensual(d),
    bloqueSupuestos(s, d),
    bloqueActividad(s),
    bloqueBitacora(s));
}

function refrescar() {
  const raiz = refs.cuerpo?.parentElement?.parentElement;
  if (raiz) { raiz.replaceChildren(); render(raiz); }
}

// --------------------------------------------------------------------------- hero

function heroBeneficio(d) {
  return el('section', { class: 'hero-ahorro' },
    el('div', {},
      el('p', { class: 'eyebrow' }, 'Beneficio acumulado estimado'),
      el('p', { class: 'hero-ahorro__cifra' }, fmtMXN(d.beneficio, 0)),
      el('p', { class: 'small muted mt-3' },
        `Sobre ${d.cotizaciones} cotización(es) emitida(s) desde esta computadora.`)),
    el('div', { class: 'hero-ahorro__lado' },
      el('div', {},
        el('p', { class: 'eyebrow' }, 'Horas liberadas'),
        el('p', { class: 'hero-ahorro__sub num' }, fmtNum(d.horasLiberadas, 1)),
        el('p', { class: 'tiny' }, 'de ingeniería y ventas')),
      el('div', {},
        el('p', { class: 'eyebrow' }, 'Valor cotizado'),
        el('p', { class: 'hero-ahorro__sub num' }, fmtMXN(d.valorCotizado, 0)),
        el('p', { class: 'tiny' }, 'suma de todas las propuestas'))));
}

// --------------------------------------------------------------------------- tarjetas

function tarjetasClave(d, s) {
  const t = (etiqueta, valor, nota_, estado) =>
    el('div', { class: 'kpi' },
      el('div', { class: 'row row--tight', style: 'justify-content:space-between' },
        el('span', { class: 'kpi__label' }, etiqueta),
        estado ? el('span', { class: `pill pill--sm pill--${estado.tono}` }, estado.texto) : null),
      el('div', { class: 'kpi__value' }, valor),
      el('div', { class: 'kpi__note' }, nota_));

  const margenTono = d.margenPromedio < 0.25 ? 'danger' : d.margenPromedio < 0.3 ? 'warn' : 'ok';

  return el('div', { class: 'grid-4' },
    t('Cotizaciones emitidas', fmtNum(d.cotizaciones, 0), 'Cada una con su PDF y su folio'),
    t('Ticket promedio', fmtMXN(d.ticketPromedio, 0), 'Con IVA incluido'),
    t('Margen promedio', `${fmtNum(d.margenPromedio * 100, 1)}%`,
      'Sobre la base gravable',
      { tono: margenTono, texto: margenTono === 'ok' ? 'Sano' : margenTono === 'warn' ? 'Vigilar' : 'Bajo' }),
    t('Cotizaciones bajo 25%', fmtNum(d.bajoMinimo, 0),
      d.bajoMinimo ? 'Revisar descuentos autorizados' : 'Ninguna por debajo del piso',
      d.bajoMinimo ? { tono: 'warn', texto: 'Atención' } : { tono: 'ok', texto: 'Limpio' }));
}

// --------------------------------------------------------------------------- composición

function composicion(d) {
  const partes = [
    { clave: 'horas', etiqueta: 'Horas de ingeniería liberadas', valor: d.valorHoras, color: 'var(--dato-1)' },
    { clave: 'merma', etiqueta: 'Margen recuperado en merma y caja', valor: d.margenRecuperado, color: 'var(--dato-2)' },
  ].filter((p) => p.valor > 0);

  const total = partes.reduce((t, p) => t + p.valor, 0) || 1;

  const barra = el('div', { class: 'barra-comp', role: 'img',
    'aria-label': partes.map((p) => `${p.etiqueta}: ${fmtMXN(p.valor)}`).join('. ') });
  for (const p of partes) {
    barra.append(el('div', {
      class: 'barra-comp__seg',
      style: `flex:${p.valor};background:${p.color}`,
      title: `${p.etiqueta}: ${fmtMXN(p.valor)} (${fmtNum((p.valor / total) * 100, 1)}%)`,
    }));
  }

  return el('section', { class: 'card' },
    el('div', { class: 'row', style: 'justify-content:space-between;align-items:baseline' },
      el('h2', { class: 'subtitle' }, 'De dónde sale el beneficio'),
      el('span', { class: 'small muted num' }, fmtMXN(total, 0))),
    el('div', { class: 'mt-4' }, barra),
    el('div', { class: 'leyenda mt-4' },
      ...partes.map((p) => el('div', { class: 'leyenda__item' },
        el('span', { class: 'leyenda__punto', style: `background:${p.color}` }),
        el('div', {},
          el('div', { class: 'small' }, p.etiqueta),
          el('div', { class: 'num', style: 'font-weight:600' },
            `${fmtMXN(p.valor, 0)}  ·  ${fmtNum((p.valor / total) * 100, 1)}%`))))),
    el('p', { class: 'tiny mt-4' },
      'Las horas se valúan al costo cargado configurado. El margen recuperado es la merma y el redondeo a caja que antes no se cotizaban, sobre la proporción de obras que se ganan.'));
}

// --------------------------------------------------------------------------- gráfica mensual

function graficaMensual(d) {
  if (d.serie.length < 1) return el('div');

  const max = Math.max(...d.serie.map((m) => m.total)) || 1;
  const barras = el('div', { class: 'barras' });

  for (const m of d.serie) {
    const pct = (m.total / max) * 100;
    barras.append(el('div', { class: 'barras__col' },
      el('div', { class: 'barras__valor num' }, fmtMXN(m.total, 0).replace('$', '')),
      el('div', { class: 'barras__pista' },
        el('div', {
          class: 'barras__barra',
          style: `height:${Math.max(pct, 2)}%`,
          title: `${MESES[m.mes]} ${m.anio}: ${fmtMXN(m.total)} en ${m.n} cotización(es)`,
        })),
      el('div', { class: 'barras__etq' }, MESES[m.mes]),
      el('div', { class: 'barras__etq2' }, `${m.n} cot.`)));
  }

  const tabla = el('table', { class: 'tabla' },
    el('thead', {}, el('tr', {},
      el('th', {}, 'Mes'), el('th', { class: 'r' }, 'Cotizaciones'), el('th', { class: 'r' }, 'Valor cotizado'))),
    el('tbody', {}, ...d.serie.map((m) => el('tr', {},
      el('td', {}, `${MESES[m.mes]} ${m.anio}`),
      el('td', { class: 'r' }, fmtNum(m.n, 0)),
      el('td', { class: 'r' }, fmtMXN(m.total))))));

  return el('section', { class: 'card' },
    el('h2', { class: 'subtitle' }, 'Valor cotizado por mes'),
    el('p', { class: 'small muted mt-3' }, 'Suma de las cotizaciones emitidas en cada mes, con IVA.'),
    el('div', { class: 'mt-5' }, barras),
    el('details', { class: 'disc disc--plain mt-4' },
      el('summary', { class: 'disc__head' },
        el('span', {}, 'Ver los datos en tabla'),
        el('span', { class: 'disc__chev' }, icono('chevron', 16, 1.8))),
      el('div', { class: 'disc__body' }, el('div', { class: 'tabla-wrap' }, tabla))));
}

// --------------------------------------------------------------------------- supuestos

function bloqueSupuestos(s, d) {
  const a = s.config.ahorro;
  const num = (ruta, valor, etiqueta, sufijo, pista, paso = '0.1') =>
    campo({ etiqueta, sufijo, pista },
      entrada({
        valor, tipo: 'number', paso, min: '0', numero: true,
        onChange: (e) => { S.actualizarConfig(ruta, Number(e.target.value)); refrescar(); },
      }));

  const pct = (ruta, valor, etiqueta, pista) =>
    campo({ etiqueta, sufijo: '%', pista },
      entrada({
        valor: +(valor * 100).toFixed(1), tipo: 'number', paso: '0.5', min: '0', max: '100', numero: true,
        onChange: (e) => { S.actualizarConfig(ruta, Number(e.target.value) / 100); refrescar(); },
      }));

  return accion(
    { iconoNombre: 'regla', titulo: 'Supuestos del cálculo',
      pista: 'Ajústalos con los números reales de la empresa y el tablero se recalcula' },
    el('hr', { class: 'rule mt-0' }),
    nota('Estos supuestos no cambian ninguna cotización. Solo alimentan este tablero.', '', 'info'),
    el('div', { class: 'grid-3 mt-4' },
      num('ahorro.horasPorCotizacionAntes', a.horasPorCotizacionAntes,
        'Horas por cotización antes', 'h', 'Lo que tardaban a mano'),
      num('ahorro.minutosPorCotizacionAhora', a.minutosPorCotizacionAhora,
        'Minutos por cotización ahora', 'min', 'Con la herramienta', '1'),
      num('ahorro.costoHora', a.costoHora, 'Costo cargado por hora', 'MXN', 'Sueldo más prestaciones', '10'),
      pct('ahorro.tasaCierre', a.tasaCierre, 'Tasa de cierre', 'De lo cotizado, cuánto se gana'),
      pct('ahorro.proporcionMaterial', a.proporcionMaterial, 'Material sobre la venta',
        'Qué parte del precio es material'),
      pct('ahorro.mermaNoCotizadaPct', a.mermaNoCotizadaPct, 'Merma que se perdía',
        'Lo que no se cotizaba por obra'),
      pct('ahorro.obrasConError', a.obrasConError, 'Obras con ese error',
        'Proporción de obras donde pasaba')),
    el('div', { class: 'mt-4' },
      nota(`Con los supuestos actuales, cada cotización emitida vale ${fmtMXN((d.beneficio / Math.max(d.cotizaciones, 1)), 0)} de beneficio para la empresa.`,
           'accent', 'barras')));
}

// --------------------------------------------------------------------------- actividad

/** Quién entró, a qué pantalla y cuántas veces. Agrupado por persona y día. */
function bloqueActividad(s) {
  const act = s.actividad ?? [];
  const log = s.bitacora ?? [];

  // Resumen por persona: consultas, cotizaciones emitidas y último acceso.
  const porPersona = new Map();
  for (const a of act) {
    const p = porPersona.get(a.usuario) ?? { usuario: a.usuario, consultas: 0, cotizaciones: 0, ultima: a.ultima };
    p.consultas += a.veces;
    if (a.ultima > p.ultima) p.ultima = a.ultima;
    porPersona.set(a.usuario, p);
  }
  for (const r of log) {
    if (r.accion !== 'Cotización emitida') continue;
    const p = porPersona.get(r.usuario) ?? { usuario: r.usuario, consultas: 0, cotizaciones: 0, ultima: r.fecha };
    p.cotizaciones += 1;
    if (r.fecha > p.ultima) p.ultima = r.fecha;
    porPersona.set(r.usuario, p);
  }
  const personas = [...porPersona.values()].sort((a, b) => b.ultima.localeCompare(a.ultima));

  const detalle = act.slice(0, 60);

  return accion(
    { iconoNombre: 'usuario', titulo: 'Registro de actividad',
      pista: personas.length
        ? `${personas.length} persona(s) han usado esta computadora`
        : 'Sin actividad registrada todavía' },
    el('hr', { class: 'rule mt-0' }),
    el('p', { class: 'small muted mb-4' },
      'Quién entró, a qué pantalla y quién emitió cotizaciones. Se agrupa por persona y día ',
      'para que no se llene con un renglón por clic.'),

    !personas.length
      ? el('p', { class: 'small muted' },
          'Se llena solo conforme el equipo use la aplicación. Para que sirva, cada quien debe capturar su nombre en Ajustes.')
      : el('div', {},
          el('div', { class: 'tabla-wrap mb-4' },
            el('table', { class: 'tabla' },
              el('thead', {}, el('tr', {},
                el('th', {}, 'Persona'),
                el('th', { class: 'r' }, 'Consultas'),
                el('th', { class: 'r' }, 'Cotizaciones'),
                el('th', { class: 'r' }, 'Último acceso'))),
              el('tbody', {}, ...personas.map((p) => el('tr', {},
                el('td', {},
                  el('span', { class: `pill pill--sm ${p.usuario === 'Sin identificar' ? 'pill--outline' : ''}` },
                    p.usuario)),
                el('td', { class: 'r num' }, fmtNum(p.consultas, 0)),
                el('td', { class: 'r num', style: p.cotizaciones ? 'font-weight:600' : 'color:var(--ink-4)' },
                  fmtNum(p.cotizaciones, 0)),
                el('td', { class: 'r small muted nowrap' },
                  fmtFechaCorta(p.ultima),
                  el('div', { class: 'tiny' },
                    new Date(p.ultima).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }))))))))
        ,
          el('details', { class: 'disc disc--plain' },
            el('summary', { class: 'disc__head' },
              el('span', {}, `Ver el detalle por pantalla (${act.length} registros)`),
              el('span', { class: 'disc__chev' }, icono('chevron', 16, 1.8))),
            el('div', { class: 'disc__body' },
              el('div', { class: 'tabla-wrap' },
                el('table', { class: 'tabla' },
                  el('thead', {}, el('tr', {},
                    el('th', {}, 'Día'), el('th', {}, 'Persona'), el('th', {}, 'Pantalla'),
                    el('th', { class: 'r' }, 'Veces'))),
                  el('tbody', {}, ...detalle.map((a) => el('tr', {},
                    el('td', { class: 'small nowrap' }, fmtFechaCorta(a.dia)),
                    el('td', { class: 'small' }, a.usuario),
                    el('td', { class: 'small muted' }, a.pantalla),
                    el('td', { class: 'r num' }, fmtNum(a.veces, 0)))))))))));
}

// --------------------------------------------------------------------------- bitácora

function bloqueBitacora(s) {
  const log = s.bitacora ?? [];
  const q = normalizar(filtroBitacora);
  const filtrado = q
    ? log.filter((r) => normalizar(`${r.usuario} ${r.accion} ${r.detalle}`).includes(q))
    : log;

  const buscador = el('input', {
    class: 'input', type: 'search', placeholder: 'Filtra por persona, acción o material',
    value: filtroBitacora,
    oninput: (e) => { filtroBitacora = e.target.value; refrescar(); },
  });

  const cuerpo = !filtrado.length
    ? el('p', { class: 'small muted' },
        log.length ? 'Nada coincide con ese filtro.'
                   : 'Aquí queda registrado cada alta, cambio de precio, importación y cotización emitida, con la persona que lo hizo.')
    : el('div', { class: 'tabla-wrap' },
        el('table', { class: 'tabla' },
          el('thead', {}, el('tr', {},
            el('th', {}, 'Cuándo'), el('th', {}, 'Quién'), el('th', {}, 'Qué'),
            el('th', {}, 'Detalle'), el('th', { class: 'r' }, 'Cambio'))),
          el('tbody', {}, ...filtrado.slice(0, 120).map((r) => el('tr', {},
            el('td', { class: 'small nowrap' }, fmtFechaCorta(r.fecha),
              el('div', { class: 'tiny' },
                new Date(r.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }))),
            el('td', {},
              el('span', { class: `pill pill--sm ${r.usuario === 'Sin identificar' ? 'pill--outline' : ''}` },
                r.usuario)),
            el('td', { class: 'small' }, r.accion),
            el('td', { class: 'small muted' }, r.detalle),
            el('td', { class: 'r small num nowrap' }, cambio(r)))))));

  return accion(
    { iconoNombre: 'reloj', titulo: 'Bitácora de cambios',
      pista: log.length ? `${log.length} movimiento(s) registrado(s)` : 'Sin movimientos todavía' },
    el('hr', { class: 'rule mt-0' }),
    nota('La bitácora identifica a la persona por el nombre que capturó en Ajustes. No es control de acceso: no hay contraseñas. Sirve para rastrear quién cambió un precio, no para impedirlo.',
         'warn', 'alerta'),
    el('div', { class: 'mt-4 mb-4' }, buscador),
    cuerpo,
    filtrado.length > 120
      ? el('p', { class: 'tiny mt-3' }, `Se muestran 120 de ${filtrado.length}. Exporta la bitácora para verla completa.`)
      : null);
}

function cambio(r) {
  if (r.precioAnterior != null && r.precioNuevo != null) {
    const delta = r.precioNuevo - r.precioAnterior;
    const pct = r.precioAnterior ? (delta / r.precioAnterior) * 100 : 0;
    return el('span', { style: `color:${delta > 0 ? 'var(--ok)' : 'var(--danger)'}` },
      `${fmtMXN(r.precioAnterior, 0)} → ${fmtMXN(r.precioNuevo, 0)}`,
      el('div', { class: 'tiny' }, `${delta > 0 ? '+' : ''}${fmtNum(pct, 1)}%`));
  }
  if (r.total != null) return fmtMXN(r.total, 0);
  if (r.cantidad != null) return `${fmtNum(r.cantidad, 0)} materiales`;
  if (r.valorNuevo != null) return `${r.valorAnterior} → ${r.valorNuevo}`;
  return '—';
}

function exportarBitacora() {
  const est = S.obtener();
  const log = est.bitacora ?? [];
  const act = est.actividad ?? [];
  if (!log.length && !act.length) return avisar('Todavía no hay movimientos que exportar.', 'err');
  const cols = ['fecha', 'usuario', 'accion', 'detalle', 'precioAnterior', 'precioNuevo', 'total', 'ruta'];
  const esc = (c) => (/[",;\n]/.test(String(c ?? '')) ? `"${String(c).replace(/"/g, '""')}"` : String(c ?? ''));
  const csv = [cols.join(','), ...log.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
  descargarTexto(`bitacora-${new Date().toISOString().slice(0, 10)}.csv`, '﻿' + csv, 'text/csv;charset=utf-8');
  avisar(`${log.length} movimientos exportados`);
}
