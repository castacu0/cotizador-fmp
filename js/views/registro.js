// Registrar una venta. Es la puerta de entrada del reporte mensual.
//
// Aquí vive la distinción que la dirección subrayó: cotizar no es vender.
// Se registra la venta, se anota el anticipo, y solo entonces cuenta.

import { el, fmtMXN, fmtFechaCorta } from '../format.js';
import * as S from '../state.js';
import { icono, accion, campo, entrada, selector, casilla, abrirModal, cerrarModal,
         confirmar, avisar, vacio, nota } from '../ui.js';
import { CATEGORIAS_VENTA, ventaVacia, lineaVaciaVenta, importeLinea,
         totalVenta, anticipoEsperado, estaCobrada, mesDe, etiquetaMes,
         ventasVisibles, esAdmin, PASOS_PROYECTO, avanceProyecto } from '../ventas.js';

export function render(raiz) {
  const s = S.obtener();
  const usuario = S.usuarioActual();
  const admin = esAdmin(usuario, s.config.equipo);
  const visibles = ventasVisibles(s.ventas ?? [], usuario, s.config.equipo);

  raiz.append(el('div', { class: 'view' },
    el('header', { class: 'section' },
      el('div', { class: 'row' },
        el('div', { style: 'flex:1;min-width:0' },
          el('p', { class: 'eyebrow' }, 'Ventas'),
          el('h1', { class: 'display mt-3' }, 'Registrar venta'),
          el('p', { class: 'lead mt-3' },
            'Una venta es una cotización aceptada con anticipo. El producto se identifica por línea y color, ' +
            'que es como lo pide el equipo al proveedor.')),
        el('button', { class: 'btn btn--primary', onclick: () => abrirEditor(null) },
          icono('mas', 15), 'Nueva venta'))),

    !usuario
      ? el('div', { class: 'mb-5' },
          nota('Captura tu nombre en Ajustes antes de registrar. Es lo que asigna la venta a un asesor.',
               'warn', 'alerta'))
      : null,

    visibles.length
      ? el('div', { class: 'stack stack-3' }, ...visibles.map((v) => tarjetaVenta(v, admin)))
      : vacio({ iconoNombre: 'caja', titulo: 'Sin ventas registradas',
                mensaje: 'Registra la primera y aparecerá en el reporte mensual.' },
          el('button', { class: 'btn btn--primary', onclick: () => abrirEditor(null) },
            icono('mas', 15), 'Nueva venta'))));

  // Enlace directo desde el reporte: #/registrar?id=vta_xxx
  const id = new URLSearchParams((location.hash.split('?')[1] ?? '')).get('id');
  if (id) {
    const v = (s.ventas ?? []).find((x) => x.id === id);
    if (v) setTimeout(() => abrirEditor(v), 60);
  }
}

// --------------------------------------------------------------------------- tarjeta

function tarjetaVenta(v, admin) {
  const total = totalVenta(v);
  const av = avanceProyecto(v);
  const cobrada = estaCobrada(v);

  return el('article', { class: 'linea' },
    el('div', { class: 'linea__head' },
      el('div', { style: 'flex:1;min-width:0' },
        el('div', { class: 'row row--tight' },
          el('strong', {}, v.cliente || 'Sin cliente'),
          el('span', { class: `pill pill--sm ${cobrada ? 'pill--ok' : 'pill--warn'}` },
            cobrada ? 'Anticipo cobrado' : 'Falta anticipo'),
          admin && v.vendedor ? el('span', { class: 'pill pill--sm pill--outline' }, v.vendedor) : null),
        el('p', { class: 'small muted mt-3' },
          `${v.obra || 'Sin obra'} · ${fmtFechaCorta(v.fecha)} · ${etiquetaMes(mesDe(v.fecha))} · ` +
          `${(v.lineas ?? []).length} ${(v.lineas ?? []).length === 1 ? 'partida' : 'partidas'}`),
        el('p', { class: 'tiny mt-3' },
          `Carpeta del proyecto: ${av.listos} de ${av.total} documentos`)),
      el('div', { class: 'linea__total' },
        el('div', { class: 'num', style: 'font-size:17px;font-weight:600' }, fmtMXN(total, 0)),
        el('div', { class: 'tiny' }, `pagado ${fmtMXN(Number(v.pagado) || 0, 0)}`)),
      el('div', { class: 'row row--tight' },
        el('button', { class: 'btn btn--sm', onclick: () => abrirEditor(v) }, icono('editar', 14), 'Abrir'),
        el('button', {
          class: 'btn btn--danger btn--icon', 'aria-label': 'Eliminar venta',
          onclick: async () => {
            if (await confirmar({ titulo: 'Eliminar la venta',
              mensaje: `Se borra la venta de ${v.cliente || 'sin cliente'} por ${fmtMXN(total, 0)}. No se puede deshacer.`,
              textoOk: 'Eliminar', peligro: true })) {
              S.eliminarVenta(v.id);
              redibujar();
            }
          },
        }, icono('basura', 15)))));
}

// --------------------------------------------------------------------------- editor

function abrirEditor(existente) {
  const s = S.obtener();
  const usuario = S.usuarioActual();
  const admin = esAdmin(usuario, s.config.equipo);

  const v = existente
    ? structuredClone(existente)
    : ventaVacia(usuario);
  if (!v.pasos) v.pasos = {};

  const totales = el('div', { class: 'desglose' });
  const cuerpoLineas = el('div', { class: 'stack stack-3' });
  const btnGuardar = el('button', { class: 'btn btn--primary' }, existente ? 'Guardar cambios' : 'Registrar venta');

  const pintarTotales = () => {
    const total = totalVenta(v);
    const esperado = anticipoEsperado(v);
    const pagado = Number(v.pagado) || 0;
    totales.replaceChildren(
      fila('Total de la venta', `${v.lineas.length} ${v.lineas.length === 1 ? 'partida' : 'partidas'}`, fmtMXN(total)),
      fila('Anticipo esperado', `${Math.round((Number(v.anticipoPct) || 0) * 100)}% para arrancar`, fmtMXN(esperado)),
      fila('Registrado como pagado', v.comprobante ? `Comprobante: ${v.comprobante}` : 'Sin comprobante', fmtMXN(pagado)),
      fila(pagado >= esperado - 0.5 ? 'Listo para arrancar' : 'Falta para arrancar', '',
        fmtMXN(Math.max(0, esperado - pagado)), true));
    btnGuardar.disabled = total <= 0;
  };

  const pintarLineas = () => {
    cuerpoLineas.replaceChildren(...v.lineas.map((l, i) => filaLinea(v, l, i, () => {
      pintarLineas(); pintarTotales();
    })));
    pintarTotales();
  };

  const opcionesVendedor = [
    ...new Set([
      ...s.config.equipo.map((p) => p.nombre),
      ...(s.ventas ?? []).map((x) => x.vendedor).filter(Boolean),
      usuario,
    ].filter(Boolean)),
  ].map((n) => ({ valor: n, etiqueta: n }));

  const cabecera = el('div', { class: 'grid-2' },
    campo({ etiqueta: 'Fecha de la venta' },
      entrada({ valor: v.fecha, tipo: 'date', onInput: (e) => { v.fecha = e.target.value; } })),
    campo({ etiqueta: 'Asesor', pista: admin ? 'Puedes registrar a nombre de otro' : 'Se registra a tu nombre' },
      admin && opcionesVendedor.length
        ? selector({ valor: v.vendedor, opciones: opcionesVendedor, onChange: (e) => { v.vendedor = e.target.value; } })
        : entrada({ valor: v.vendedor || usuario, onInput: (e) => { v.vendedor = e.target.value; } })),
    campo({ etiqueta: 'Cliente' },
      entrada({ valor: v.cliente, placeholder: 'Nombre de quien paga', onInput: (e) => { v.cliente = e.target.value; } })),
    campo({ etiqueta: 'Obra' },
      entrada({ valor: v.obra, placeholder: 'Casa Pedregal, Depto. Santa Fe…', onInput: (e) => { v.obra = e.target.value; } })));

  const cobro = el('div', { class: 'grid-3' },
    campo({ etiqueta: 'Anticipo', sufijo: '%', pista: 'La empresa opera con 80%' },
      entrada({ valor: Math.round((Number(v.anticipoPct) || 0) * 100), tipo: 'number', paso: '5', min: 0, max: 100, numero: true,
        onInput: (e) => { v.anticipoPct = (Number(e.target.value) || 0) / 100; pintarTotales(); } })),
    campo({ etiqueta: 'Pagado hasta hoy', sufijo: 'MXN' },
      entrada({ valor: v.pagado || '', tipo: 'number', paso: '100', min: 0, numero: true,
        onInput: (e) => { v.pagado = Number(e.target.value) || 0; pintarTotales(); } })),
    campo({ etiqueta: 'Comprobante', pista: 'La captura que mandó el cliente por WhatsApp' },
      entrada({ valor: v.comprobante, placeholder: 'Transferencia 12 ago, ref 4471',
        onInput: (e) => { v.comprobante = e.target.value; pintarTotales(); } })));

  const carpeta = accion({ iconoNombre: 'caja', titulo: 'Carpeta del proyecto en Drive',
                           pista: 'Los documentos que tienen que existir antes de comprar material' },
    campo({ etiqueta: 'Enlace de la carpeta' },
      entrada({ valor: v.carpetaDrive, placeholder: 'https://drive.google.com/…',
        onInput: (e) => { v.carpetaDrive = e.target.value; } })),
    el('div', { class: 'mt-4' },
      ...PASOS_PROYECTO.map((p) => casilla({
        marcado: !!v.pasos[p.clave],
        texto: `${p.nombre} · ${p.responsable}`,
        pista: p.nota,
        onChange: (val) => { v.pasos[p.clave] = val; },
      }))));

  btnGuardar.onclick = () => {
    v.lineas = v.lineas.filter((l) => importeLinea(l) > 0);
    if (!v.lineas.length) { avisar('Captura al menos una partida con cantidad y precio.', 'err'); return; }
    if (!v.vendedor) v.vendedor = usuario;
    S.guardarVenta(v);
    cerrarModal();
    avisar(existente ? 'Venta actualizada' : 'Venta registrada');
    redibujar();
  };

  pintarLineas();

  abrirModal({
    titulo: existente ? 'Venta registrada' : 'Nueva venta',
    subtitulo: 'Una cotización enviada no es una venta. Se registra cuando el cliente aceptó.',
    ancho: true,
  },
    el('div', { class: 'stack stack-5' },
      cabecera,
      el('div', {},
        el('div', { class: 'section__head' },
          el('div', { class: 'grow' },
            el('h3', { class: 'subtitle' }, 'Qué se vendió'),
            el('p', { class: 'tiny' }, 'Línea y color son los campos con los que el equipo reconoce el producto.')),
          el('button', { class: 'btn btn--sm', onclick: () => { v.lineas.push(lineaVaciaVenta()); pintarLineas(); } },
            icono('mas', 14), 'Agregar partida')),
        cuerpoLineas),
      cobro,
      totales,
      carpeta,
      campo({ etiqueta: 'Notas' },
        el('textarea', { class: 'textarea', rows: 2,
          oninput: (e) => { v.notas = e.target.value; } }, v.notas || '')),
      listasSugeridas()),
    [el('button', { class: 'btn', onclick: cerrarModal }, 'Cancelar'), btnGuardar]);
}

// --------------------------------------------------------------------------- partida

function filaLinea(v, l, i, alCambiar) {
  const importe = el('span', { class: 'desglose__val' }, fmtMXN(importeLinea(l)));

  const cambiar = (clave) => (e) => {
    l[clave] = e.target.value;
    importe.textContent = fmtMXN(importeLinea(l));
    if (clave === 'cantidad' || clave === 'precioUnit') alCambiar();
  };

  return el('div', { class: 'card card--flat' },
    el('div', { class: 'row mb-3' },
      el('span', { class: 'linea__idx' }, String(i + 1)),
      el('span', { class: 'tiny', style: 'flex:1' }, 'Partida'),
      importe,
      v.lineas.length > 1
        ? el('button', {
            class: 'btn btn--danger btn--icon', 'aria-label': 'Quitar partida',
            onclick: () => { v.lineas.splice(i, 1); alCambiar(); },
          }, icono('basura', 14))
        : null),

    el('div', { class: 'grid-4' },
      campo({ etiqueta: 'Apartado' },
        entrada({ valor: l.apartado, placeholder: 'Pisos', onInput: cambiar('apartado') })),
      campo({ etiqueta: 'Proveedor' },
        entrada({ valor: l.proveedor, placeholder: 'Marca o fabricante', list: 'lista-proveedores',
          onInput: cambiar('proveedor') })),
      campo({ etiqueta: 'Línea' },
        entrada({ valor: l.linea, placeholder: 'Nombre de la línea', list: 'lista-lineas',
          onInput: cambiar('linea') })),
      campo({ etiqueta: 'Color' },
        entrada({ valor: l.color, placeholder: 'Nombre del color', list: 'lista-colores',
          onInput: cambiar('color') }))),

    el('div', { class: 'grid-4 mt-4' },
      campo({ etiqueta: 'Familia' },
        selector({ valor: l.categoria,
          opciones: Object.entries(CATEGORIAS_VENTA).map(([k, c]) => ({ valor: k, etiqueta: c.nombre })),
          onChange: cambiar('categoria') })),
      campo({ etiqueta: 'Cantidad' },
        entrada({ valor: l.cantidad, tipo: 'number', paso: '0.01', min: 0, numero: true,
          onInput: cambiar('cantidad') })),
      campo({ etiqueta: 'Unidad' },
        selector({ valor: l.unidad,
          opciones: [{ valor: 'm2', etiqueta: 'm²' }, { valor: 'ml', etiqueta: 'metro lineal' },
                     { valor: 'pza', etiqueta: 'pieza' }, { valor: 'caja', etiqueta: 'caja' },
                     { valor: 'servicio', etiqueta: 'servicio' }],
          onChange: cambiar('unidad') })),
      campo({ etiqueta: 'Precio unitario', sufijo: 'MXN' },
        entrada({ valor: l.precioUnit, tipo: 'number', paso: '1', min: 0, numero: true,
          onInput: cambiar('precioUnit') }))));
}

/** Sugerencias tomadas del catálogo cargado, para no teclear de memoria. */
function listasSugeridas() {
  const catalogo = S.obtener().catalogo ?? [];
  return el('div', {},
    el('datalist', { id: 'lista-proveedores' },
      ...unicos(catalogo, 'origen').map((x) => el('option', { value: x }))),
    el('datalist', { id: 'lista-lineas' },
      ...unicos(catalogo, 'nombre').slice(0, 300).map((x) => el('option', { value: x }))),
    el('datalist', { id: 'lista-colores' },
      ...unicos(catalogo, 'color').map((x) => el('option', { value: x }))));
}

const unicos = (catalogo, campo2) =>
  Array.from(new Set((catalogo ?? []).map((p) => p[campo2]).filter(Boolean)))
    .sort((a, b) => String(a).localeCompare(String(b), 'es-MX'));

const fila = (k, sub, valor, total = false) =>
  el('div', { class: `desglose__row${total ? ' desglose__row--total' : ''}` },
    el('span', { class: 'desglose__label' }, k,
      sub ? el('span', { class: 'tiny', style: 'display:block' }, sub) : null),
    el('span', { class: 'desglose__val' }, valor));

const redibujar = () => window.dispatchEvent(new CustomEvent('fmp:rerender'));
