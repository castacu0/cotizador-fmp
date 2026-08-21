// Vista de catálogo: buscar, dar de alta y editar productos.

import { el, fmtMXN, fmtNum, uid, normalizar } from '../format.js';
import * as S from '../state.js';
import { CATEGORIAS, leadTimeProducto, precioBaseMXN } from '../pricing.js';
import { catalogoACSV } from '../importer.js';
import { icono, accion, campo, entrada, selector, casilla, abrirModal, cerrarModal,
         confirmar, avisar, vacio, nota, descargarTexto } from '../ui.js';

let consulta = '';
let filtros = {};
let refs = {};

export function render(raiz) {
  const cuerpo = el('div', {});
  refs.cuerpo = cuerpo;

  raiz.append(el('div', { class: 'view' },
    el('header', { class: 'section' },
      el('div', { class: 'row' },
        el('div', { style: 'flex:1;min-width:0' },
          el('p', { class: 'eyebrow' }, 'Catálogo'),
          el('h1', { class: 'display mt-3' }, 'Materiales'),
          el('p', { class: 'lead mt-3' },
            'Todo lo que la empresa vende, con precio, medidas y tiempo de entrega. Los cambios se aplican de inmediato al cotizador.')),
        el('div', { class: 'row row--tight' },
          el('button', { class: 'btn', onclick: exportar }, icono('bajar', 15), 'Exportar CSV'),
          el('button', { class: 'btn btn--primary', onclick: () => abrirEditor(null) },
            icono('mas', 15), 'Agregar producto')))),
    barraBusqueda(),
    cuerpo));

  refrescar();
}

function barraBusqueda() {
  const input = el('input', {
    class: 'search__input', type: 'search', autocomplete: 'off',
    placeholder: 'Busca por nombre, SKU, especie, medida o acabado',
    value: consulta,
    oninput: (e) => { consulta = e.target.value; refrescar(); },
  });

  const chips = el('div', { class: 'stack stack-3 mt-4' });
  refs.chips = chips;

  return el('section', { class: 'section' },
    el('div', { class: 'search' }, el('span', { class: 'search__icon' }, icono('buscar', 18)), input),
    chips);
}

function refrescar() {
  const s = S.obtener();

  refs.chips.replaceChildren(
    el('div', { class: 'pill-group' },
      chip('Todas', !filtros.categoria, () => { delete filtros.categoria; refrescar(); }),
      ...Object.entries(CATEGORIAS).map(([k, c]) => {
        const n = s.catalogo.filter((p) => p.categoria === k).length;
        return chip(`${c.nombre} · ${n}`, filtros.categoria === k, () => {
          filtros.categoria = filtros.categoria === k ? undefined : k;
          refrescar();
        });
      })),
    el('div', { class: 'pill-group' },
      chip('Solo importados', !!filtros.soloImportados, () => {
        filtros.soloImportados = !filtros.soloImportados; refrescar();
      }),
      chip('Solo con existencia', !!filtros.soloExistencia, () => {
        filtros.soloExistencia = !filtros.soloExistencia; refrescar();
      })));

  const hits = S.buscarProductos(s.catalogo, consulta, filtros);

  if (!hits.length) {
    refs.cuerpo.replaceChildren(el('div', { class: 'card card--quiet' },
      vacio({ titulo: 'Sin coincidencias', mensaje: 'Ajusta la búsqueda o da de alta el material.' },
        el('button', { class: 'btn btn--primary', onclick: () => abrirEditor(null) },
          icono('mas', 15), 'Agregar producto'))));
    return;
  }

  const tabla = el('table', { class: 'tabla' },
    el('thead', {}, el('tr', {},
      el('th', {}, 'Producto'),
      el('th', {}, 'Familia'),
      el('th', {}, 'Medidas'),
      el('th', { class: 'r' }, 'Caja'),
      el('th', { class: 'r' }, 'Precio'),
      el('th', { class: 'r' }, 'Entrega'),
      el('th', { class: 'r' }, ''))),
    el('tbody', {}, ...hits.slice(0, 200).map(({ producto: p }) => filaProducto(p, s))));

  refs.cuerpo.replaceChildren(
    el('p', { class: 'small muted mb-4' },
      `${hits.length} de ${s.catalogo.length} materiales` + (hits.length > 200 ? ' (se muestran los primeros 200)' : '')),
    el('div', { class: 'tabla-wrap' }, tabla));
}

function chip(texto, activo, onClick) {
  return el('button', { type: 'button', class: 'pill pill-toggle', 'aria-pressed': String(activo), onclick: onClick }, texto);
}

function filaProducto(p, s) {
  const medidas = [
    p.espesorMm ? `${p.espesorMm} mm` : null,
    p.anchoMm && p.largoMm ? `${p.anchoMm} × ${p.largoMm} mm` : (p.anchoMm ? `${p.anchoMm} mm` : null),
    p.anchoRolloM ? `rollo ${fmtNum(p.anchoRolloM)} m` : null,
  ].filter(Boolean).join(' · ') || '—';

  const dias = leadTimeProducto(p, s.config);

  return el('tr', {},
    el('td', {},
      el('div', { style: 'font-weight:500' }, p.nombre),
      el('div', { class: 'tiny' }, `${p.sku}${p.especie ? `  ·  ${p.especie}` : ''}${p.acabado ? `  ·  ${p.acabado}` : ''}`)),
    el('td', {}, el('span', { class: 'pill pill--sm' }, CATEGORIAS[p.categoria]?.nombre ?? p.categoria)),
    el('td', { class: 'small muted' }, medidas),
    el('td', { class: 'r small' }, p.m2PorCaja ? `${fmtNum(p.m2PorCaja)} m²` : '—'),
    el('td', { class: 'r' },
      el('div', { style: 'font-weight:600' }, fmtMXN(precioBaseMXN(p, s.config))),
      el('div', { class: 'tiny' }, p.moneda === 'USD' ? `USD ${fmtNum(p.precio)}` : `por ${p.unidad === 'ml' ? 'ml' : p.unidad === 'pza' ? 'pza' : 'm²'}`)),
    el('td', { class: 'r' },
      el('span', { class: `pill pill--sm ${p.importado ? 'pill--warn' : 'pill--ok'}` }, `${dias} d`),
      p.importado ? el('div', { class: 'tiny mt-3' }, p.origen) : null),
    el('td', { class: 'r nowrap' },
      el('button', { class: 'btn btn--ghost btn--sm', onclick: () => abrirEditor(p) }, icono('editar', 14)),
      el('button', {
        class: 'btn btn--danger btn--sm',
        onclick: async () => {
          if (await confirmar({ titulo: 'Eliminar material', peligro: true, textoOk: 'Eliminar',
                                mensaje: `Se elimina "${p.nombre}" del catálogo y de las cotizaciones abiertas.` })) {
            S.eliminarProducto(p.id);
            refrescar();
            avisar('Material eliminado');
          }
        },
      }, icono('basura', 14))));
}

// --------------------------------------------------------------------------- editor

export function abrirEditor(producto) {
  const s = S.obtener();
  const esNuevo = !producto;
  const b = producto
    ? { ...producto }
    : {
        id: uid('prod'), sku: '', nombre: '', categoria: 'duela-ingenieria',
        especie: '', espesorMm: '', anchoMm: '', largoMm: '', capaNobleMm: '',
        acabado: '', color: '', tela: '', anchoRolloM: '',
        m2PorCaja: '', precio: '', moneda: 'MXN', unidad: 'm2',
        importado: false, origen: '', leadTimeDias: 3, stock: 0,
        caracteristicas: [], notas: '',
      };

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    b[k] = v;
    if (k === 'categoria') repintarEspecificos();
    if (k === 'importado') repintarImportacion();
  };

  const especificos = el('div', { class: 'grid-3' });
  const importacion = el('div', { class: 'grid-2' });

  function repintarEspecificos() {
    const familia = CATEGORIAS[b.categoria]?.familia ?? 'piso';
    const campos = [];

    if (familia === 'piso') {
      campos.push(
        campo({ etiqueta: 'Material o especie', pista: 'Encino, Roble, Pino, Porcelánico…' },
          entrada({ valor: b.especie, onChange: set('especie') })),
        campo({ etiqueta: 'Espesor', sufijo: 'mm' },
          entrada({ valor: b.espesorMm, tipo: 'number', paso: '0.1', min: '0', numero: true, onChange: set('espesorMm') })),
        campo({ etiqueta: 'Capa noble', sufijo: 'mm', pista: 'Solo duela de ingeniería' },
          entrada({ valor: b.capaNobleMm, tipo: 'number', paso: '0.1', min: '0', numero: true, onChange: set('capaNobleMm') })),
        campo({ etiqueta: 'Ancho de tabla', sufijo: 'mm' },
          entrada({ valor: b.anchoMm, tipo: 'number', paso: '1', min: '0', numero: true, onChange: set('anchoMm') })),
        campo({ etiqueta: 'Largo de tabla', sufijo: 'mm' },
          entrada({ valor: b.largoMm, tipo: 'number', paso: '1', min: '0', numero: true, onChange: set('largoMm') })),
        campo({ etiqueta: 'Rendimiento por caja', sufijo: 'm²',
                pista: 'Clave: define el redondeo a caja completa' },
          entrada({ valor: b.m2PorCaja, tipo: 'number', paso: '0.01', min: '0', numero: true, onChange: set('m2PorCaja') })));
    } else if (familia === 'cortina') {
      campos.push(
        campo({ etiqueta: 'Composición de la tela' },
          entrada({ valor: b.tela, placeholder: 'Poliéster FR trilaminado', onChange: set('tela') })),
        campo({ etiqueta: 'Ancho de rollo', sufijo: 'm',
                pista: 'Define si se corta al ancho o por paños' },
          entrada({ valor: b.anchoRolloM, tipo: 'number', paso: '0.01', min: '0', numero: true, onChange: set('anchoRolloM') })),
        campo({ etiqueta: 'Opacidad o acabado' },
          entrada({ valor: b.acabado, placeholder: 'Blackout, translúcido…', onChange: set('acabado') })));
    } else if (familia === 'persiana') {
      campos.push(
        campo({ etiqueta: 'Material' },
          entrada({ valor: b.tela, placeholder: 'Fibra de vidrio + PVC', onChange: set('tela') })),
        campo({ etiqueta: 'Sistema o acabado' },
          entrada({ valor: b.acabado, placeholder: 'Screen 3%, Blackout…', onChange: set('acabado') })));
    }

    if (['piso', 'persiana'].includes(familia)) {
      campos.push(campo({ etiqueta: 'Acabado' },
        entrada({ valor: b.acabado, placeholder: 'Aceitado mate premium', onChange: set('acabado') })));
    }
    campos.push(campo({ etiqueta: 'Color o tono' },
      entrada({ valor: b.color, onChange: set('color') })));

    especificos.replaceChildren(...campos.filter(Boolean));
  }

  function repintarImportacion() {
    importacion.replaceChildren(
      campo({ etiqueta: 'Origen', pista: b.importado ? 'País de fabricación' : 'Proveedor o planta' },
        entrada({ valor: b.origen, placeholder: b.importado ? 'Italia' : 'México', onChange: set('origen') })),
      campo({
        etiqueta: b.importado ? 'Días de fábrica' : 'Días de entrega',
        sufijo: 'días',
        pista: b.importado
          ? `Se le suman ${s.config.logistica.diasTransito} de tránsito y ${s.config.logistica.diasAduana} de aduana`
          : 'Desde la confirmación del pedido',
      },
        entrada({ valor: b.leadTimeDias, tipo: 'number', paso: '1', min: '0', numero: true, onChange: set('leadTimeDias') })));
  }

  repintarEspecificos();
  repintarImportacion();

  const guardar = el('button', { class: 'btn btn--primary' }, esNuevo ? 'Agregar al catálogo' : 'Guardar cambios');
  guardar.onclick = () => {
    if (!String(b.nombre).trim()) return avisar('El producto necesita un nombre.', 'err');
    if (!(Number(b.precio) > 0)) return avisar('Captura un precio mayor a cero.', 'err');

    const limpio = { ...b };
    for (const k of ['espesorMm', 'anchoMm', 'largoMm', 'capaNobleMm', 'anchoRolloM',
                     'm2PorCaja', 'precio', 'leadTimeDias', 'stock']) {
      limpio[k] = limpio[k] === '' || limpio[k] == null ? undefined : Number(limpio[k]);
    }
    limpio.sku = String(limpio.sku).trim()
      || normalizar(limpio.nombre).replace(/\s+/g, '-').slice(0, 28).toUpperCase();
    limpio.caracteristicas = String(b._caracTexto ?? (b.caracteristicas ?? []).join(', '))
      .split(',').map((x) => x.trim()).filter(Boolean);
    delete limpio._caracTexto;

    S.guardarProducto(limpio);
    cerrarModal();
    refrescar();
    avisar(esNuevo ? 'Material agregado' : 'Material actualizado');
  };

  abrirModal(
    { titulo: esNuevo ? 'Nuevo material' : 'Editar material', ancho: true,
      subtitulo: 'Lo mínimo es nombre, familia y precio. Todo lo demás afina el cálculo y el PDF.' },
    el('div', { class: 'stack stack-5' },
      el('div', { class: 'grid-2' },
        campo({ etiqueta: 'Nombre comercial', pista: 'Es lo que ve el cliente en la cotización' },
          entrada({ valor: b.nombre, placeholder: 'Duela de ingeniería Encino Premium Aceitado', onChange: set('nombre') })),
        campo({ etiqueta: 'SKU o clave', pista: 'Si lo dejas vacío se genera solo' },
          entrada({ valor: b.sku, placeholder: 'DI-ENC-14-220', onChange: set('sku') }))),

      el('div', { class: 'grid-3' },
        campo({ etiqueta: 'Familia', pista: 'Define qué motor de cálculo se usa' },
          selector({
            valor: b.categoria, onChange: set('categoria'),
            opciones: Object.entries(CATEGORIAS).map(([k, c]) => ({ valor: k, etiqueta: c.nombre })),
          })),
        campo({ etiqueta: 'Precio de costo', sufijo: 'por unidad',
                pista: 'Costo, no precio de venta. El margen se aplica en la cotización.' },
          entrada({ valor: b.precio, tipo: 'number', paso: '0.01', min: '0', numero: true, onChange: set('precio') })),
        campo({ etiqueta: 'Unidad y moneda' },
          el('div', { class: 'row row--tight' },
            selector({
              valor: b.unidad, onChange: set('unidad'), style: 'flex:1',
              opciones: [{ valor: 'm2', etiqueta: 'm²' }, { valor: 'ml', etiqueta: 'metro lineal' },
                         { valor: 'pza', etiqueta: 'pieza' }],
            }),
            selector({
              valor: b.moneda, onChange: set('moneda'), style: 'width:92px',
              opciones: [{ valor: 'MXN', etiqueta: 'MXN' }, { valor: 'USD', etiqueta: 'USD' }],
            })))),

      accion({ iconoNombre: 'regla', titulo: 'Medidas y características', abierto: true,
               pista: 'Se imprimen en el anexo técnico del PDF' },
        el('hr', { class: 'rule mt-0' }),
        especificos),

      accion({ iconoNombre: 'globo', titulo: 'Importación y tiempo de entrega', abierto: true,
               pista: 'Determina la fecha comprometida en la cotización' },
        el('hr', { class: 'rule mt-0' }),
        casilla({ marcado: !!b.importado, texto: 'Producto de importación',
                  pista: 'Suma tránsito marítimo y despacho aduanal al plazo',
                  onChange: (v) => { b.importado = v; repintarImportacion(); } }),
        el('div', { class: 'mt-3' }, importacion),
        el('div', { class: 'grid-2 mt-4' },
          campo({ etiqueta: 'Existencia en piso', sufijo: b.unidad === 'ml' ? 'ml' : b.unidad === 'pza' ? 'pza' : 'm²',
                  pista: 'Cero significa sobre pedido' },
            entrada({ valor: b.stock, tipo: 'number', paso: '1', min: '0', numero: true, onChange: set('stock') })))),

      accion({ iconoNombre: 'info', titulo: 'Argumentos de venta y advertencias',
               pista: 'Lo que el asesor necesita saber al vender' },
        el('hr', { class: 'rule mt-0' }),
        campo({ etiqueta: 'Características', pista: 'Separadas por coma. Se imprimen como pastillas en el PDF.' },
          entrada({ valor: (b.caracteristicas ?? []).join(', '),
                    placeholder: 'Impermeable, Uso hotelero, Retardante de flama',
                    onChange: (e) => { b._caracTexto = e.target.value; } })),
        el('div', { class: 'mt-4' },
          campo({ etiqueta: 'Nota interna', pista: 'Se muestra al cotizar, no se imprime en el PDF' },
            el('textarea', {
              class: 'textarea', placeholder: 'No recomendado en baños. Requiere aclimatación de 72 horas.',
              onchange: set('notas'),
            }, b.notas ?? ''))))),
    [el('button', { class: 'btn', onclick: cerrarModal }, 'Cancelar'), guardar]);
}

function exportar() {
  const s = S.obtener();
  descargarTexto(`catalogo-${new Date().toISOString().slice(0, 10)}.csv`,
    '﻿' + catalogoACSV(s.catalogo), 'text/csv;charset=utf-8');
  avisar(`${s.catalogo.length} materiales exportados`);
}
