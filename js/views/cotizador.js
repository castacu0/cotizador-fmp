// Vista principal: armar una cotización y sacar el PDF.

import { el, $, fmtMXN, fmtNum, fmtFecha, sumarDias, uid } from '../format.js';
import * as S from '../state.js';
import { CATEGORIAS, PATRONES, PLIEGUES, calcularPartida, calcularTotales,
         estimarPerimetro, leadTimeProducto, precioBaseMXN } from '../pricing.js';
import { generarPDF } from '../pdf.js';
import { cargarEjemplo, hayDatosParaEjemplo } from '../demo.js';
import { PLANTILLAS, armarMensaje, telefonoWhatsApp } from '../mensajes.js';
import { icono, accion, desplegable, campo, entrada, selector, casilla, pastillasToggle,
         abrirModal, cerrarModal, confirmar, avisar, vacio, nota } from '../ui.js';

let consulta = '';
let filtros = {};
let refs = {};

// ---------------------------------------------------------------------------

export function render(raiz) {
  const s = S.obtener();

  const izquierda = el('div', { class: 'stack stack-6' },
    seccionBuscador(),
    seccionCliente(),
    seccionPartidas());

  const derecha = el('div', {}, panelResumen());
  refs.resumen = derecha;

  raiz.append(
    el('div', { class: 'view' },
      cabecera(s),
      el('div', { class: 'cotizador' }, izquierda, derecha)));

  refrescarResultados();
  refrescarPartidas();
}

function cabecera(s) {
  const cot = s.cotizacion;
  return el('header', { class: 'section' },
    el('div', { class: 'row' },
      el('div', { style: 'flex:1;min-width:0' },
        el('p', { class: 'eyebrow' }, cot.folio ? `Folio ${cot.folio}` : 'Borrador sin folio'),
        el('h1', { class: 'display mt-3' }, 'Nueva cotización'),
        el('p', { class: 'lead mt-3' },
          'Busca el material, captura las medidas y descarga el PDF. El cálculo de merma, cajas, accesorios y tiempo de entrega es automático.')),
      el('div', { class: 'row row--tight' },
        hayDatosParaEjemplo() && !s.cotizacion.partidas.length
          ? el('button', { class: 'btn js-ejemplo', onclick: usarEjemplo },
              icono('capas', 15), 'Cargar ejemplo')
          : el('button', { class: 'btn', onclick: nuevaCotizacion }, icono('mas', 15), 'Nueva'),
        el('button', { class: 'btn btn--primary js-pdf', onclick: exportarPDF },
          icono('pdf', 15), 'Generar PDF'))),
    s.catalogoEsDemo
      ? el('div', { class: 'mt-5' },
          nota('Estás usando el catálogo de demostración. Ve a Ajustes > Importar catálogo para cargar los precios reales de la empresa.',
               'warn', 'alerta'))
      : null);
}

// --------------------------------------------------------------------------- buscador

function seccionBuscador() {
  const input = el('input', {
    class: 'search__input',
    type: 'search',
    placeholder: 'Busca por material, medida o acabado. Ej: encino 9mm aceitado',
    value: consulta,
    autocomplete: 'off',
    oninput: (e) => { consulta = e.target.value; refrescarResultados(); },
  });
  refs.input = input;

  const resultados = el('div', { class: 'res mt-4' });
  refs.resultados = resultados;

  const chips = el('div', { class: 'stack stack-3 mt-4' });
  refs.chips = chips;

  const bloque = accion(
    { iconoNombre: 'buscar', titulo: 'Buscar material', abierto: true,
      pista: 'Escribe varias palabras a la vez para llegar a un solo producto' },
    el('hr', { class: 'rule mt-0' }),
    el('p', { class: 'small muted mb-4' },
      'La búsqueda combina todas las palabras. "encino 9 aceitado" filtra por especie, espesor y acabado al mismo tiempo. ',
      'Los filtros de abajo acotan por familia, especie y disponibilidad.'),
    el('div', { class: 'search' },
      el('span', { class: 'search__icon' }, icono('buscar', 18)),
      input),
    chips,
    resultados);

  bloque.classList.add('js-buscador');
  return bloque;
}

function refrescarResultados() {
  const s = S.obtener();
  const cont = refs.resultados;
  if (!cont) return;

  // Filtros
  refs.chips.replaceChildren(
    el('div', { class: 'pill-group' },
      pastillaFiltro('Todas', !filtros.categoria, () => { delete filtros.categoria; refrescarResultados(); }),
      ...Object.entries(CATEGORIAS).map(([clave, c]) =>
        pastillaFiltro(c.nombre, filtros.categoria === clave, () => {
          filtros.categoria = filtros.categoria === clave ? undefined : clave;
          refrescarResultados();
        }))),
    el('div', { class: 'pill-group' },
      pastillaFiltro('Solo con existencia', !!filtros.soloExistencia, () => {
        filtros.soloExistencia = !filtros.soloExistencia; refrescarResultados();
      }),
      pastillaFiltro('Solo importados', !!filtros.soloImportados, () => {
        filtros.soloImportados = !filtros.soloImportados; refrescarResultados();
      }),
      ...S.valoresUnicos(s.catalogo.filter((p) => !filtros.categoria || p.categoria === filtros.categoria), 'especie')
        .slice(0, 8)
        .map((esp) => pastillaFiltro(esp, filtros.especie === esp, () => {
          filtros.especie = filtros.especie === esp ? undefined : esp;
          refrescarResultados();
        }))));

  const hits = S.buscarProductos(s.catalogo, consulta, filtros);

  if (!hits.length) {
    cont.replaceChildren(el('div', { class: 'res__empty' },
      el('p', {}, 'Ningún material coincide.'),
      el('p', { class: 'tiny mt-3' }, 'Prueba con menos palabras o quita algún filtro.')));
    return;
  }

  cont.replaceChildren(...hits.slice(0, 40).map(({ producto: p }) => filaResultado(p, s)));

  if (hits.length > 40) {
    cont.append(el('div', { class: 'res__empty tiny' },
      `Se muestran 40 de ${hits.length} coincidencias. Afina la búsqueda para ver el resto.`));
  }
}

function pastillaFiltro(texto, activo, onClick) {
  return el('button', {
    type: 'button', class: 'pill pill-toggle', 'aria-pressed': String(activo), onclick: onClick,
  }, texto);
}

function filaResultado(p, s) {
  const cat = CATEGORIAS[p.categoria];
  const meta = [
    cat?.nombre,
    p.especie,
    p.espesorMm ? `${p.espesorMm} mm` : null,
    p.anchoMm ? `${p.anchoMm} mm ancho` : null,
    p.acabado,
    p.color,
  ].filter(Boolean).join('  ·  ');

  const precio = precioBaseMXN(p, s.config);
  const dias = leadTimeProducto(p, s.config);

  return el('button', {
    class: 'res__item', type: 'button',
    onclick: () => abrirEditorPartida(p),
  },
    el('span', { class: 'res__main' },
      el('span', { class: 'res__name', style: 'display:block' }, p.nombre),
      el('span', { class: 'res__meta', style: 'display:block' }, meta),
      el('span', { class: 'row row--tight', style: 'margin-top:7px' },
        p.importado
          ? el('span', { class: 'pill pill--warn pill--sm' }, icono('globo', 11, 2), `${p.origen} · ${dias} días`)
          : el('span', { class: 'pill pill--ok pill--sm' }, `Nacional · ${dias} días`),
        Number(p.stock) > 0
          ? el('span', { class: 'pill pill--sm' }, `${fmtNum(p.stock, 0)} ${p.unidad === 'ml' ? 'ml' : 'm²'} en piso`)
          : el('span', { class: 'pill pill--outline pill--sm' }, 'Sobre pedido'),
        p.m2PorCaja ? el('span', { class: 'pill pill--sm' }, `Caja ${fmtNum(p.m2PorCaja)} m²`) : null)),
    el('span', { class: 'res__price' },
      el('span', { class: 'res__amount', style: 'display:block' }, fmtMXN(precio)),
      el('span', { class: 'res__unit', style: 'display:block' },
        `por ${p.unidad === 'ml' ? 'metro lineal' : p.unidad === 'pza' ? 'pieza' : 'm²'}`),
      p.moneda === 'USD' ? el('span', { class: 'tiny', style: 'display:block' }, `USD ${fmtNum(p.precio)}`) : null));
}

// --------------------------------------------------------------------------- cliente

function seccionCliente() {
  const c = S.obtener().cotizacion.cliente;
  // Se guarda con cada tecla (input), no al salir del campo (change).
  const set = (k) => (e) => S.actualizarCliente({ [k]: e.target.value });

  const bloque = accion(
    { iconoNombre: 'usuario', titulo: 'Datos del cliente',
      pista: 'Aparecen en el encabezado del PDF. El nombre es obligatorio.' },
    el('hr', { class: 'rule mt-0' }),
    el('div', { class: 'grid-2' },
      campo({ etiqueta: 'Nombre o razón social' },
        entrada({ valor: c.nombre, placeholder: 'Hotel Ejemplo, S.A. de C.V.', onInput: set('nombre') })),
      campo({ etiqueta: 'Persona de contacto' },
        entrada({ valor: c.contacto, placeholder: 'Arq. Nombre Apellido', onInput: set('contacto') })),
      campo({ etiqueta: 'Teléfono' },
        entrada({ valor: c.telefono, tipo: 'tel', placeholder: '55 0000 0000', onInput: set('telefono') })),
      campo({ etiqueta: 'Correo' },
        entrada({ valor: c.email, tipo: 'email', placeholder: 'contacto@cliente.mx', onInput: set('email') })),
      campo({ etiqueta: 'Obra o proyecto', pista: 'Se imprime a la derecha del bloque de cliente' },
        entrada({ valor: c.obra, placeholder: 'Remodelación 12 suites, torre B', onInput: set('obra') })),
      campo({ etiqueta: 'Vendedor que atiende' },
        entrada({
          valor: S.obtener().cotizacion.vendedor,
          placeholder: 'Nombre del asesor',
          onInput: (e) => S.actualizar((st) => { st.cotizacion.vendedor = e.target.value; }),
        }))));

  bloque.classList.add('js-cliente');
  return bloque;
}

// --------------------------------------------------------------------------- partidas

function seccionPartidas() {
  const cont = el('div', { class: 'js-partidas' });
  refs.partidas = cont;
  return el('section', {},
    el('div', { class: 'section__head' },
      el('div', { class: 'grow' },
        el('p', { class: 'eyebrow' }, 'Partidas'),
        el('h2', { class: 'title mt-3' }, 'Detalle de la cotización'))),
    cont);
}

function refrescarPartidas() {
  const s = S.obtener();
  const cont = refs.partidas;
  if (!cont) return;

  if (!s.cotizacion.partidas.length) {
    cont.replaceChildren(el('div', { class: 'card card--quiet' },
      vacio({ iconoNombre: 'caja', titulo: 'Todavía no hay partidas',
              mensaje: 'Busca un material arriba y captura las medidas. Cada partida calcula su propia merma, cajas y accesorios.' })));
    refrescarResumen();
    return;
  }

  const totales = calcularTotales(s.cotizacion.partidas, s.catalogo, {
    ...s.config, _descuentoGlobal: s.cotizacion.descuentoGlobal,
  });

  cont.replaceChildren(...totales.lineas.map((linea, i) => tarjetaPartida(linea, i)));
  refrescarResumen();
}

function tarjetaPartida(linea, idx) {
  const { partida, producto, calculo: c } = linea;

  return el('article', { class: 'linea' },
    el('div', { class: 'linea__head' },
      el('span', { class: 'linea__idx' }, idx + 1),
      el('div', { style: 'flex:1;min-width:0' },
        el('h3', { style: 'font-size:15px;font-weight:600;letter-spacing:-.005em' }, producto.nombre),
        el('p', { class: 'small muted mt-3' }, resumenPartida(c, producto)),
        el('div', { class: 'row row--tight mt-3' },
          c.margenEfectivo != null
            ? el('span', { class: `pill pill--sm ${c.margenEfectivo < 0.25 ? 'pill--danger' : c.margenEfectivo < 0.3 ? 'pill--warn' : 'pill--ok'}` },
                `Margen ${fmtNum(c.margenEfectivo * 100, 1)}%`)
            : null,
          c.descuentoPct > 0 ? el('span', { class: 'pill pill--sm pill--accent' }, `Desc. ${fmtNum(c.descuentoPct * 100, 0)}%`) : null,
          producto.importado ? el('span', { class: 'pill pill--sm pill--warn' }, `${leadTimeProducto(producto, S.obtener().config)} días`) : null)),
      el('div', { class: 'linea__total' },
        el('div', { style: 'font-size:17px;font-weight:600;font-variant-numeric:tabular-nums' }, fmtMXN(c.importe)),
        el('div', { class: 'row row--tight mt-3', style: 'justify-content:flex-end' },
          el('button', { class: 'btn btn--ghost btn--sm', onclick: () => abrirEditorPartida(producto, partida) },
            icono('editar', 14), 'Editar'),
          el('button', {
            class: 'btn btn--ghost btn--sm', title: 'Duplicar partida', 'aria-label': 'Duplicar partida',
            onclick: () => {
              const copia = { ...partida, id: undefined };
              delete copia.id;
              S.agregarPartida(copia);
              refrescarPartidas();
              avisar('Partida duplicada');
            },
          }, icono('copiar', 14)),
          el('button', {
            class: 'btn btn--danger btn--sm', 'aria-label': 'Eliminar partida',
            onclick: async () => {
              if (await confirmar({ titulo: 'Eliminar partida', peligro: true, textoOk: 'Eliminar',
                                    mensaje: `Se quita "${producto.nombre}" de la cotización.` })) {
                S.eliminarPartida(partida.id);
                refrescarPartidas();
              }
            },
          }, icono('basura', 14))))),
    el('div', { class: 'linea__body' }, desplegable({ titulo: 'Ver desglose del cálculo', plano: true }, desglose(c, producto))));
}

function resumenPartida(c, p) {
  if (c.tipo === 'piso') {
    return `${fmtNum(c.areaBase)} m² solicitados  ·  ${fmtNum(c.areaFacturable)} m² facturados  ·  ${c.cajas} cajas  ·  ${c.patronNombre.toLowerCase()}`;
  }
  if (c.tipo === 'cortina') {
    return `${fmtNum(c.ancho)} × ${fmtNum(c.alto)} m  ·  ${c.cantidad} juego(s)  ·  pliegue ${fmtNum(c.pliegue, 1)}x  ·  ${fmtNum(c.metrosLineales, 1)} ml de tela`;
  }
  if (c.tipo === 'persiana') {
    return `${fmtNum(c.ancho)} × ${fmtNum(c.alto)} m  ·  ${c.cantidad} pza  ·  ${fmtNum(c.areaFacturable)} m² facturados`;
  }
  return `${fmtNum(c.cantidad, 0)} ${p.unidad === 'ml' ? 'ml' : 'pza'}`;
}

function fila(etiqueta, valor, extra) {
  return el('div', { class: 'desglose__row' },
    el('span', { class: 'desglose__label' }, etiqueta,
      extra ? el('span', { class: 'tiny', style: 'display:block' }, extra) : null),
    el('span', { class: 'desglose__val' }, valor));
}

function desglose(c, p) {
  const filas = [];

  if (c.tipo === 'piso') {
    filas.push(fila('Área solicitada', `${fmtNum(c.areaBase)} m²`));
    filas.push(fila(`Merma por colocación ${c.patronNombre.toLowerCase()}`, `+ ${fmtNum(c.mermaPct * 100, 0)}%`,
      `${fmtNum(c.areaConMerma)} m² con desperdicio`));
    if (c.m2Caja > 0) {
      filas.push(fila('Cajas completas', `${c.cajas} × ${fmtNum(c.m2Caja)} m²`,
        `Sobran ${fmtNum(c.excedenteCaja)} m² por redondeo a caja`));
    }
    filas.push(fila('Área facturada', `${fmtNum(c.areaFacturable)} m²`));
    filas.push(fila(`Material a ${fmtMXN(c.precioM2)}/m²`, fmtMXN(c.material)));
  } else if (c.tipo === 'cortina') {
    filas.push(fila('Ancho de ventana', `${fmtNum(c.ancho)} m × ${c.cantidad}`));
    filas.push(fila(`Pliegue ${fmtNum(c.pliegue, 1)}x`, `${fmtNum(c.anchoTelaRequerido)} m de tela por ventana`));
    filas.push(fila(`Corte ${c.metodo}`, c.metodo === 'por paños' ? `${c.panos} paños` : 'Sin costuras', c.metodoNota));
    filas.push(fila('Tela requerida', `${fmtNum(c.metrosLineales, 1)} ml`));
    filas.push(fila(`Tela a ${fmtMXN(c.precioML)}/ml`, fmtMXN(c.material)));
    filas.push(fila('Confección', fmtMXN(c.confeccion)));
  } else if (c.tipo === 'persiana') {
    filas.push(fila('Medida por pieza', `${fmtNum(c.ancho)} × ${fmtNum(c.alto)} m = ${fmtNum(c.areaReal)} m²`));
    if (c.aplicaMinimo) {
      filas.push(fila('Área mínima facturable', `${fmtNum(c.areaMinima)} m²`,
        'La medida real es menor al mínimo del fabricante'));
    }
    filas.push(fila('Área facturada', `${fmtNum(c.areaFacturable)} m²`, `${c.cantidad} pieza(s)`));
    filas.push(fila(`Material a ${fmtMXN(c.precioM2)}/m²`, fmtMXN(c.material)));
  } else {
    filas.push(fila('Cantidad', `${fmtNum(c.cantidad, 0)} ${p.unidad}`));
    filas.push(fila(`Precio unitario`, fmtMXN(c.precioUnitario)));
  }

  for (const a of c.accesorios ?? []) {
    filas.push(fila(a.concepto, fmtMXN(a.importe), `${fmtNum(a.cantidad, 2)} ${a.unidad} × ${fmtMXN(a.precioUnitario)}`));
  }
  if (c.manoObra > 0) {
    filas.push(fila('Instalación', fmtMXN(c.manoObra),
      c.tarifaInstalacion ? `${fmtMXN(c.tarifaInstalacion)}/m² incluye el factor del patrón` : null));
  }

  filas.push(fila('Costo directo', fmtMXN(c.costoDirecto)));
  filas.push(fila(`Margen ${fmtNum(c.margen * 100, 0)}%`, `+ ${fmtMXN(c.utilidadBruta)}`,
    `Equivale a multiplicar el costo por ${fmtNum(1 + c.markupEquivalente, 3)}`));
  if (c.descuento > 0) filas.push(fila(`Descuento ${fmtNum(c.descuentoPct * 100, 0)}%`, `- ${fmtMXN(c.descuento)}`));

  const cont = el('div', { class: 'desglose' }, ...filas,
    el('div', { class: 'desglose__row desglose__row--total' },
      el('span', { class: 'desglose__label' }, 'Importe de la partida'),
      el('span', { class: 'desglose__val' }, fmtMXN(c.importe))));

  if (c.perimetroEstimado && c.tipo === 'piso' && (c.accesorios ?? []).some((a) => a.clave === 'zoclo')) {
    cont.append(el('div', { class: 'mt-4' },
      nota(`El perímetro de ${fmtNum(c.perimetro)} m es una estimación a partir del área. Captúralo en la partida para cerrar el zoclo con precisión.`, '', 'alerta')));
  }
  return cont;
}

// --------------------------------------------------------------------------- editor de partida

function abrirEditorPartida(producto, existente = null) {
  const s = S.obtener();
  const familia = CATEGORIAS[producto.categoria]?.familia ?? 'piso';

  const borrador = existente ? { ...existente } : {
    id: uid('pt'),
    productoId: producto.id,
    // piso
    areaM2: '', patron: 'recto', perimetroM: '',
    incluirInstalacion: true, incluirZoclo: familia === 'piso',
    incluirUnderlayment: ['spc', 'laminado'].includes(producto.categoria),
    incluirAdhesivo: false, incluirBoquilla: producto.categoria === 'porcelanato',
    perfilesTransicion: 0,
    // cortina / persiana
    anchoM: '', altoM: '', cantidad: 1, pliegue: 2.5,
    incluirRiel: true, rielMotorizado: false, incluirForro: false, motorizada: false,
    // comercial
    margenOverride: null, descuentoPct: 0,
  };

  const preview = el('div', {});
  const ambientes = existente?._ambientes ? [...existente._ambientes] : [];

  const repintar = () => {
    const calc = calcularPartida(borrador, producto, s.config);
    preview.replaceChildren(
      calc && (Number(borrador.areaM2) > 0 || Number(borrador.anchoM) > 0 || familia === 'accesorio')
        ? el('div', {},
            el('div', { class: 'grid-3 mb-4' }, ...tarjetasPreview(calc, producto)),
            desglose(calc, producto))
        : nota('Captura las medidas para ver el cálculo.', '', 'info'));
    if (btnGuardar) btnGuardar.disabled = !calc || calc.importe <= 0;
  };

  const setCampo = (k, v) => { borrador[k] = v; repintar(); };

  // --- formulario según familia ---
  let formulario;
  if (familia === 'piso') {
    formulario = formularioPiso(borrador, producto, setCampo, ambientes, repintar);
  } else if (familia === 'cortina') {
    formulario = formularioCortina(borrador, producto, setCampo);
  } else if (familia === 'persiana') {
    formulario = formularioPersiana(borrador, producto, setCampo);
  } else {
    formulario = el('div', { class: 'grid-2' },
      campo({ etiqueta: 'Cantidad', sufijo: producto.unidad },
        entrada({ valor: borrador.cantidad, tipo: 'number', paso: '1', min: '0', numero: true,
                  onInput: (e) => setCampo('cantidad', e.target.value) })));
  }

  const comercial = accion(
    { iconoNombre: 'barras', titulo: 'Margen y descuento de esta partida',
      pista: 'Solo tú lo ves. El PDF muestra el precio final.' },
    el('hr', { class: 'rule mt-0' }),
    el('div', { class: 'grid-2' },
      campo({ etiqueta: 'Margen bruto', sufijo: '%',
              pista: `Por defecto ${fmtNum(s.config.comercial.margenDefault * 100, 0)}% desde Ajustes` },
        entrada({ valor: borrador.margenOverride != null ? borrador.margenOverride * 100 : '',
                  tipo: 'number', paso: '0.5', min: '0', max: '90', numero: true,
                  placeholder: fmtNum(s.config.comercial.margenDefault * 100, 0),
                  onInput: (e) => setCampo('margenOverride', e.target.value === '' ? null : Number(e.target.value) / 100) })),
      campo({ etiqueta: 'Descuento al cliente', sufijo: '%' },
        entrada({ valor: borrador.descuentoPct * 100 || '', tipo: 'number', paso: '1', min: '0', max: '50', numero: true,
                  placeholder: '0',
                  onInput: (e) => setCampo('descuentoPct', Number(e.target.value || 0) / 100) }))),
    el('div', { class: 'mt-4' },
      nota('Margen bruto es la parte del precio de venta que queda como utilidad, no un multiplicador sobre el costo. Un 35% de margen equivale a multiplicar el costo por 1.538.',
           'accent', 'info')));

  const btnGuardar = el('button', { class: 'btn btn--primary' }, existente ? 'Guardar cambios' : 'Agregar a la cotización');
  btnGuardar.onclick = () => {
    borrador._ambientes = ambientes.length ? ambientes : undefined;
    if (existente) S.actualizarPartida(existente.id, borrador);
    else S.agregarPartida(borrador);
    cerrarModal();
    refrescarPartidas();
    avisar(existente ? 'Partida actualizada' : 'Partida agregada');
  };

  abrirModal(
    { titulo: producto.nombre, ancho: true,
      subtitulo: [CATEGORIAS[producto.categoria]?.nombre, producto.especie, producto.acabado,
                  producto.espesorMm ? `${producto.espesorMm} mm` : null,
                  `${fmtMXN(precioBaseMXN(producto, s.config))} por ${producto.unidad === 'ml' ? 'ml' : producto.unidad === 'pza' ? 'pieza' : 'm²'}`]
                 .filter(Boolean).join('   ·   ') },
    el('div', { class: 'stack stack-5' },
      producto.notas ? nota(producto.notas, '', 'info') : null,
      formulario,
      comercial,
      el('div', {},
        el('p', { class: 'eyebrow mb-3' }, 'Cálculo en vivo'),
        preview)),
    [el('button', { class: 'btn', onclick: cerrarModal }, 'Cancelar'), btnGuardar]);

  repintar();
}

function tarjetasPreview(c, p) {
  const t = [];
  if (c.tipo === 'piso') {
    t.push(kpi('Área facturada', `${fmtNum(c.areaFacturable)} m²`, `${fmtNum(c.areaBase)} m² + ${fmtNum(c.mermaPct * 100, 0)}% merma`));
    t.push(kpi('Cajas a surtir', String(c.cajas), c.m2Caja ? `${fmtNum(c.m2Caja)} m² por caja` : 'Sin dato de caja'));
  } else if (c.tipo === 'cortina') {
    t.push(kpi('Tela requerida', `${fmtNum(c.metrosLineales, 1)} ml`, `Corte ${c.metodo}`));
    t.push(kpi('Paños', String(c.panos), c.metodo === 'al ancho' ? 'Sin costuras verticales' : 'Uniones verticales'));
  } else if (c.tipo === 'persiana') {
    t.push(kpi('Área facturada', `${fmtNum(c.areaFacturable)} m²`, c.aplicaMinimo ? 'Aplica área mínima' : `${c.cantidad} pieza(s)`));
    t.push(kpi('Por pieza', `${fmtNum(c.areaFacturableUnitaria)} m²`, `Real ${fmtNum(c.areaReal)} m²`));
  } else {
    t.push(kpi('Cantidad', `${fmtNum(c.cantidad, 0)}`, p.unidad));
    t.push(kpi('Unitario', fmtMXN(c.precioUnitario), ''));
  }
  t.push(kpi('Precio al cliente', fmtMXN(c.importe), `Margen ${fmtNum(c.margenEfectivo * 100, 1)}%`));
  return t;
}

function kpi(etiqueta, valor, nota_) {
  return el('div', { class: 'kpi' },
    el('div', { class: 'kpi__label' }, etiqueta),
    el('div', { class: 'kpi__value' }, valor),
    nota_ ? el('div', { class: 'kpi__note' }, nota_) : null);
}

// --------------------------------------------------------------------------- formularios

function formularioPiso(b, p, set, ambientes, repintar) {
  const inputArea = entrada({
    valor: b.areaM2, tipo: 'number', paso: '0.01', min: '0', numero: true, placeholder: '120',
    onInput: (e) => set('areaM2', e.target.value),
  });

  const listaAmbientes = el('div', { class: 'stack stack-2' });

  const pintarAmbientes = () => {
    listaAmbientes.replaceChildren(...ambientes.map((a, i) =>
      el('div', { class: 'row row--tight' },
        entrada({ valor: a.nombre, placeholder: `Ambiente ${i + 1}`, style: 'flex:2;min-width:110px',
                  onInput: (e) => { a.nombre = e.target.value; } }),
        entrada({ valor: a.largo, tipo: 'number', paso: '0.01', min: '0', numero: true, placeholder: 'Largo m',
                  style: 'flex:1;min-width:82px',
                  onInput: (e) => { a.largo = e.target.value; sumar(); } }),
        el('span', { class: 'muted' }, '×'),
        entrada({ valor: a.ancho, tipo: 'number', paso: '0.01', min: '0', numero: true, placeholder: 'Ancho m',
                  style: 'flex:1;min-width:82px',
                  onInput: (e) => { a.ancho = e.target.value; sumar(); } }),
        el('span', { class: 'small num nowrap', style: 'min-width:66px;text-align:right' },
          `${fmtNum((Number(a.largo) || 0) * (Number(a.ancho) || 0))} m²`),
        el('button', { class: 'btn btn--danger btn--sm', 'aria-label': 'Quitar ambiente',
                       onclick: () => { ambientes.splice(i, 1); pintarAmbientes(); sumar(); } },
          icono('basura', 13)))));
  };

  const sumar = () => {
    const total = ambientes.reduce((s, a) => s + (Number(a.largo) || 0) * (Number(a.ancho) || 0), 0);
    const perim = ambientes.reduce((s, a) => s + 2 * ((Number(a.largo) || 0) + (Number(a.ancho) || 0)), 0);
    if (total > 0) {
      inputArea.value = total.toFixed(2);
      set('areaM2', total.toFixed(2));
      if (perim > 0) { inputPerimetro.value = perim.toFixed(2); set('perimetroM', perim.toFixed(2)); }
    }
    pintarAmbientes();
  };

  const inputPerimetro = entrada({
    valor: b.perimetroM, tipo: 'number', paso: '0.01', min: '0', numero: true,
    placeholder: b.areaM2 ? fmtNum(estimarPerimetro(Number(b.areaM2))) : 'Automático',
    onInput: (e) => set('perimetroM', e.target.value),
  });

  pintarAmbientes();

  return el('div', { class: 'stack stack-4' },
    el('div', { class: 'grid-2' },
      campo({ etiqueta: 'Superficie a cubrir', sufijo: 'm²',
              pista: 'El área del plano, sin merma. La merma se suma sola.' }, inputArea),
      campo({ etiqueta: 'Perímetro para zoclo', sufijo: 'm',
              pista: 'Si lo dejas vacío se estima desde el área.' }, inputPerimetro)),

    desplegable({ titulo: 'Calcular el área midiendo ambiente por ambiente' },
      el('p', { class: 'small muted mb-4' },
        'Captura largo por ancho de cada espacio. La suma llena la superficie y el perímetro de arriba.'),
      listaAmbientes,
      el('button', {
        class: 'btn btn--sm mt-3',
        onclick: () => { ambientes.push({ nombre: '', largo: '', ancho: '' }); pintarAmbientes(); },
      }, icono('mas', 13), 'Agregar ambiente')),

    el('div', {},
      el('p', { class: 'field__label mb-3' }, 'Patrón de colocación'),
      pastillasToggle({
        valor: b.patron,
        opciones: Object.entries(PATRONES).map(([k, v]) => ({
          valor: k, etiqueta: `${v.nombre} · ${fmtNum(v.merma * 100, 0)}%`, nota: v.nota,
        })),
        onChange: (v) => { set('patron', v); repintarPatron(); },
      }),
      notaPatron(b)),

    accion({ iconoNombre: 'capas', titulo: 'Accesorios e instalación',
             pista: 'Lo que casi siempre se olvida cotizar', abierto: true },
      el('hr', { class: 'rule mt-0' }),
      el('div', { class: 'grid-2' },
        casilla({ marcado: b.incluirInstalacion, texto: 'Instalación',
                  pista: 'Tarifa por m² según categoría y patrón',
                  onChange: (v) => set('incluirInstalacion', v) }),
        casilla({ marcado: b.incluirZoclo, texto: 'Zoclo perimetral',
                  pista: 'Se calcula sobre el perímetro menos 8% por vanos',
                  onChange: (v) => set('incluirZoclo', v) }),
        casilla({ marcado: b.incluirUnderlayment, texto: 'Barrera de vapor / espuma',
                  pista: 'Obligatoria en piso flotante sobre losa',
                  onChange: (v) => set('incluirUnderlayment', v) }),
        casilla({ marcado: b.incluirAdhesivo, texto: 'Adhesivo',
                  pista: 'Solo si el piso va pegado, no flotante',
                  onChange: (v) => set('incluirAdhesivo', v) }),
        p.categoria === 'porcelanato'
          ? casilla({ marcado: b.incluirBoquilla, texto: 'Boquilla epóxica',
                      pista: 'Antihongos, recomendada en baños y cocinas',
                      onChange: (v) => set('incluirBoquilla', v) })
          : null,
        campo({ etiqueta: 'Perfiles de transición', sufijo: 'pza',
                pista: 'Uno por cada cambio de piso o vano' },
          entrada({ valor: b.perfilesTransicion, tipo: 'number', paso: '1', min: '0', numero: true,
                    onInput: (e) => set('perfilesTransicion', e.target.value) })))));

  function repintarPatron() {
    const cont = $('.js-nota-patron');
    if (cont) cont.replaceWith(notaPatron(b));
  }
}

function notaPatron(b) {
  const p = PATRONES[b.patron] ?? PATRONES.recto;
  return el('div', { class: 'js-nota-patron mt-3' },
    nota(`${p.nota} Merma ${fmtNum(p.merma * 100, 0)}% y mano de obra ×${fmtNum(p.multManoObra, 2)}.`, 'accent', 'regla'));
}

function formularioCortina(b, p, set) {
  return el('div', { class: 'stack stack-4' },
    el('div', { class: 'grid-3' },
      campo({ etiqueta: 'Ancho de ventana', sufijo: 'm', pista: 'Medida del riel, no del vidrio' },
        entrada({ valor: b.anchoM, tipo: 'number', paso: '0.01', min: '0', numero: true, placeholder: '3.20',
                  onInput: (e) => set('anchoM', e.target.value) })),
      campo({ etiqueta: 'Altura o caída', sufijo: 'm' },
        entrada({ valor: b.altoM, tipo: 'number', paso: '0.01', min: '0', numero: true, placeholder: '2.60',
                  onInput: (e) => set('altoM', e.target.value) })),
      campo({ etiqueta: 'Ventanas iguales', sufijo: 'juegos',
              pista: 'Para hotel: cuántas habitaciones idénticas' },
        entrada({ valor: b.cantidad, tipo: 'number', paso: '1', min: '1', numero: true,
                  onInput: (e) => set('cantidad', e.target.value) }))),

    el('div', {},
      el('p', { class: 'field__label mb-3' }, 'Multiplicador de pliegue'),
      pastillasToggle({
        valor: b.pliegue,
        opciones: Object.entries(PLIEGUES).map(([k, v]) => ({ valor: Number(k), etiqueta: v.nombre, nota: v.nota })),
        onChange: (v) => set('pliegue', v),
      }),
      el('div', { class: 'mt-3' },
        nota(`El pliegue define cuánta tela lleva la cortina. Con ${fmtNum(b.pliegue, 1)}x, una ventana de 3 m consume ${fmtNum(3 * b.pliegue, 1)} m de tela. En hotelería, menos de 2.5x se ve pobre.`,
             'accent', 'cortina'))),

    accion({ iconoNombre: 'capas', titulo: 'Herrajes y confección',
             pista: 'Riel, forro e instalación', abierto: true },
      el('hr', { class: 'rule mt-0' }),
      el('div', { class: 'grid-2' },
        casilla({ marcado: b.incluirRiel, texto: 'Riel y soportes',
                  pista: 'Se calcula 10% más largo que la ventana',
                  onChange: (v) => set('incluirRiel', v) }),
        casilla({ marcado: b.rielMotorizado, texto: 'Riel motorizado',
                  pista: 'Motor tubular con control, programable',
                  onChange: (v) => set('rielMotorizado', v) }),
        casilla({ marcado: b.incluirForro, texto: 'Forro térmico',
                  pista: 'Mejora la caída y aísla. Estándar en suites.',
                  onChange: (v) => set('incluirForro', v) }),
        casilla({ marcado: b.incluirInstalacion, texto: 'Instalación',
                  pista: 'Con cargo mínimo por visita',
                  onChange: (v) => set('incluirInstalacion', v) }))));
}

function formularioPersiana(b, p, set) {
  return el('div', { class: 'stack stack-4' },
    el('div', { class: 'grid-3' },
      campo({ etiqueta: 'Ancho', sufijo: 'm' },
        entrada({ valor: b.anchoM, tipo: 'number', paso: '0.01', min: '0', numero: true, placeholder: '1.20',
                  onInput: (e) => set('anchoM', e.target.value) })),
      campo({ etiqueta: 'Alto', sufijo: 'm' },
        entrada({ valor: b.altoM, tipo: 'number', paso: '0.01', min: '0', numero: true, placeholder: '1.80',
                  onInput: (e) => set('altoM', e.target.value) })),
      campo({ etiqueta: 'Piezas iguales', sufijo: 'pza' },
        entrada({ valor: b.cantidad, tipo: 'number', paso: '1', min: '1', numero: true,
                  onInput: (e) => set('cantidad', e.target.value) }))),
    nota('Las persianas se fabrican a medida y se facturan por área, con un mínimo por pieza. Una ventana de 0.60 × 1.20 m paga como si midiera 1 m².', '', 'regla'),
    accion({ iconoNombre: 'capas', titulo: 'Opciones', abierto: true },
      el('hr', { class: 'rule mt-0' }),
      el('div', { class: 'grid-2' },
        casilla({ marcado: b.motorizada, texto: 'Motorizada',
                  pista: 'Motor y control por pieza',
                  onChange: (v) => set('motorizada', v) }),
        casilla({ marcado: b.incluirInstalacion, texto: 'Instalación',
                  pista: 'Por pieza, con cargo mínimo por visita',
                  onChange: (v) => set('incluirInstalacion', v) }))));
}

// --------------------------------------------------------------------------- resumen

function refrescarResumen() {
  if (!refs.resumen) return;
  refs.resumen.replaceChildren(panelResumen());
}

function panelResumen() {
  const s = S.obtener();
  const cot = s.cotizacion;
  const totales = calcularTotales(cot.partidas, s.catalogo, {
    ...s.config, _descuentoGlobal: cot.descuentoGlobal,
  });

  const hay = totales.lineas.length > 0;
  const m = totales.margenGlobal;
  const colorMargen = m < 0.25 ? 'var(--danger)' : m < 0.3 ? 'var(--warn)' : 'var(--ok)';

  const entrega = sumarDias(new Date(cot.fecha), totales.leadTimeMax);

  return el('aside', { class: 'resumen js-resumen' },
    el('div', { class: 'resumen__body' },
      el('p', { class: 'eyebrow mb-4' }, 'Resumen'),

      !hay
        ? el('p', { class: 'small muted' }, 'Agrega la primera partida para ver los totales.')
        : el('div', {},
            el('div', { class: 'resumen__row' },
              el('span', { class: 'k' }, `${totales.lineas.length} partida(s)`),
              el('span', { class: 'v' }, fmtMXN(totales.subtotal))),

            el('div', { class: 'mt-4 mb-4' },
              campo({ etiqueta: 'Descuento global', sufijo: '%' },
                entrada({
                  valor: cot.descuentoGlobal * 100 || '', tipo: 'number', paso: '1', min: '0', max: '50',
                  numero: true, placeholder: '0',
                  onInput: (e) => {
                    S.actualizar((st) => { st.cotizacion.descuentoGlobal = Number(e.target.value || 0) / 100; });
                    refrescarPartidas();
                  },
                }))),

            totales.descuentoGlobal > 0
              ? el('div', { class: 'resumen__row' },
                  el('span', { class: 'k' }, 'Descuento'),
                  el('span', { class: 'v', style: 'color:var(--accent)' }, `- ${fmtMXN(totales.descuentoGlobal)}`))
              : null,
            el('div', { class: 'resumen__row' },
              el('span', { class: 'k' }, `IVA ${fmtNum(totales.ivaPct * 100, 0)}%`),
              el('span', { class: 'v' }, fmtMXN(totales.iva))),

            el('hr', { class: 'rule', style: 'margin:16px 0' }),

            el('div', { class: 'stack stack-2' },
              el('div', { class: 'row', style: 'justify-content:space-between' },
                el('span', { class: 'small muted' }, 'Margen de la cotización'),
                el('span', { class: 'small num', style: `color:${colorMargen};font-weight:600` },
                  fmtNum(m * 100, 1) + '%')),
              el('div', { class: 'margen-bar' },
                el('div', { class: 'margen-bar__fill',
                            style: `width:${Math.min(Math.max(m, 0) * 200, 100)}%;background:${colorMargen}` })),
              el('p', { class: 'tiny' }, `Utilidad ${fmtMXN(totales.utilidad)} sobre un costo de ${fmtMXN(totales.costoTotal)}`)),

            m <= 0
              ? el('div', { class: 'mt-4' },
                  nota('Estás vendiendo por debajo del costo. Cada peso de esta cotización sale de la utilidad de la empresa. Revisa los descuentos.',
                       'danger', 'alerta'))
              : m < 0.25
                ? el('div', { class: 'mt-4' },
                    nota('El margen quedó por debajo del 25%. Revisa descuentos antes de enviar.', 'warn', 'alerta'))
                : null,

            el('hr', { class: 'rule', style: 'margin:16px 0' }),

            el('div', { class: 'stack stack-2' },
              el('div', { class: 'row row--tight' },
                icono('reloj', 15),
                el('span', { class: 'small' }, `Entrega estimada ${fmtFecha(entrega)}`)),
              el('p', { class: 'tiny' },
                totales.hayImportados
                  ? `${totales.leadTimeMax} días. Incluye tránsito y aduana del producto importado.`
                  : `${totales.leadTimeMax} días desde la confirmación.`)),

            el('div', { class: 'stack stack-2 mt-4' },
              el('div', { class: 'resumen__row' },
                el('span', { class: 'k small' }, `Anticipo ${fmtNum(s.config.comercial.anticipoPct * 100, 0)}%`),
                el('span', { class: 'v small' }, fmtMXN(totales.anticipo))),
              el('div', { class: 'resumen__row' },
                el('span', { class: 'k small' }, 'Saldo contra entrega'),
                el('span', { class: 'v small' }, fmtMXN(totales.saldo)))))),

    hay
      ? el('div', {},
          el('div', { class: 'resumen__total' },
            el('span', { class: 'k' }, 'Total'),
            el('span', { class: 'v' }, fmtMXN(totales.total))),
          el('div', { class: 'stack stack-2', style: 'padding:16px' },
            el('button', { class: 'btn btn--accent btn--block js-pdf-lateral', onclick: exportarPDF },
              icono('pdf', 15), 'Descargar PDF'),
            el('button', { class: 'btn btn--block btn--sm', onclick: previsualizarPDF },
              'Ver antes de descargar'),
            el('button', {
              class: 'btn btn--block btn--sm',
              title: 'Plantillas de envío y de seguimiento, listas para mandar',
              onclick: () => abrirEnvio(totales),
            }, icono('copiar', 14), 'Mensajes y seguimiento')))
      : null);
}

// --------------------------------------------------------------------------- acciones

function validar() {
  const s = S.obtener();
  if (!s.cotizacion.partidas.length) {
    avisar('Agrega al menos una partida.', 'err');
    return null;
  }
  if (!s.cotizacion.cliente.nombre.trim()) {
    avisar('Captura el nombre del cliente.', 'err');
    document.querySelector('.action input')?.focus();
    return null;
  }
  return s;
}

function armar() {
  const s = validar();
  if (!s) return null;
  S.asignarFolio();
  const st = S.obtener();
  const totales = calcularTotales(st.cotizacion.partidas, st.catalogo, {
    ...st.config, _descuentoGlobal: st.cotizacion.descuentoGlobal,
  });
  return { cot: st.cotizacion, totales, config: st.config };
}

/** Última red de seguridad antes de mandarle al cliente un precio bajo costo. */
async function confirmarSiPierde(totales) {
  if (totales.margenGlobal > 0) return true;
  return confirmar({
    titulo: 'Esta cotización pierde dinero',
    peligro: true,
    textoOk: 'Generar de todos modos',
    mensaje: `El precio de venta (${fmtMXN(totales.baseGravable)}) queda por debajo del costo directo ` +
             `(${fmtMXN(totales.costoTotal)}). La empresa perdería ${fmtMXN(totales.costoTotal - totales.baseGravable)} ` +
             `en esta obra. Revisa los descuentos antes de enviarla.`,
  });
}

async function exportarPDF() {
  const datos = armar();
  if (!datos) return;
  if (!(await confirmarSiPierde(datos.totales))) return;
  try {
    const { nombre, paginas } = generarPDF(datos.cot, datos.totales, datos.config);
    S.archivarCotizacion(datos.totales);
    avisar(`PDF de ${paginas} página(s) generado`);
    refrescarPartidas();
    setTimeout(() => abrirEnvio(datos.totales, { recienGenerado: true, archivo: nombre }), 420);
  } catch (err) {
    console.error(err);
    avisar('No se pudo generar el PDF. Revisa la consola.', 'err');
  }
}

async function previsualizarPDF() {
  const datos = armar();
  if (!datos) return;
  if (!(await confirmarSiPierde(datos.totales))) return;
  try {
    const { url } = generarPDF(datos.cot, datos.totales, datos.config, { modo: 'url' });
    abrirModal({ titulo: 'Vista previa', ancho: true, subtitulo: 'Revisa antes de enviarlo al cliente. Máximo tres páginas.' },
      el('iframe', { src: url, style: 'width:100%;height:70vh;border:1px solid var(--line);border-radius:10px' }),
      [el('button', { class: 'btn', onclick: cerrarModal }, 'Cerrar'),
       el('button', { class: 'btn btn--primary', onclick: () => { cerrarModal(); exportarPDF(); } }, 'Descargar')]);
    refrescarPartidas();
  } catch (err) {
    console.error(err);
    avisar('No se pudo generar la vista previa.', 'err');
  }
}

/**
 * Centro de envío. Aparece solo al generar el PDF y también a mano.
 * El PDF se adjunta desde el correo o WhatsApp: el navegador no puede adjuntarlo por nosotros.
 */
export function abrirEnvio(totales, { recienGenerado = false, archivo = '' } = {}) {
  const s = S.obtener();
  const cot = s.cotizacion;
  let idActual = 'envio';
  let texto = '';

  const area = el('textarea', { class: 'textarea', rows: 14, style: 'min-height:250px;font-size:13.5px' });
  const asuntoCampo = entrada({ valor: '' });
  const selector_ = el('div', { class: 'pill-group' });

  const pintar = () => {
    const m = armarMensaje(idActual, cot, totales, s.config);
    texto = m.texto;
    area.value = m.texto;
    asuntoCampo.value = m.asunto;
    for (const b of selector_.children) {
      b.setAttribute('aria-pressed', String(b.dataset.id === idActual));
    }
    const p = PLANTILLAS.find((x) => x.id === idActual);
    const pista = $('.js-cuando');
    if (pista) pista.textContent = p.cuando;
  };

  for (const p of PLANTILLAS) {
    selector_.append(el('button', {
      type: 'button', class: 'pill pill-toggle', dataset: { id: p.id }, title: p.cuando,
      onclick: () => { idActual = p.id; pintar(); },
    }, p.nombre));
  }

  area.addEventListener('input', () => { texto = area.value; });

  const tel = telefonoWhatsApp(cot.cliente.telefono);

  const porWhatsApp = () => {
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
    avisar(tel ? 'WhatsApp abierto. Adjunta el PDF descargado.' : 'WhatsApp abierto sin número. Elige el contacto.');
  };

  const porCorreo = () => {
    const url = `mailto:${encodeURIComponent(cot.cliente.email || '')}` +
      `?subject=${encodeURIComponent(asuntoCampo.value)}&body=${encodeURIComponent(texto)}`;
    if (url.length > 1900) {
      avisar('El mensaje es muy largo para abrirse solo. Cópialo y pégalo en el correo.', 'err');
      return;
    }
    window.location.href = url;
    avisar('Correo abierto. Adjunta el PDF descargado.');
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      avisar('Mensaje copiado');
    } catch {
      area.select();
      avisar('Selecciona y copia con Ctrl+C', 'err');
    }
  };

  abrirModal(
    { titulo: recienGenerado ? 'PDF listo. ¿Cómo se la envías?' : 'Enviar la cotización', ancho: true,
      subtitulo: recienGenerado
        ? `Se descargó ${archivo}. Elige el mensaje, revísalo y mándalo. El PDF se adjunta desde tu correo o WhatsApp.`
        : 'Elige la plantilla según en qué punto va el cliente. Todos los textos son editables.' },
    el('div', { class: 'stack stack-5' },
      recienGenerado
        ? nota(`Cotización ${cot.folio} guardada en el historial. Ya suma al tablero de ahorro.`, 'ok', 'check')
        : null,
      el('div', {},
        el('p', { class: 'field__label mb-3' }, 'Momento del seguimiento'),
        selector_,
        el('p', { class: 'tiny mt-3 js-cuando' }, '')),
      campo({ etiqueta: 'Asunto del correo' }, asuntoCampo),
      campo({ etiqueta: 'Mensaje', pista: 'Edítalo antes de mandarlo. Se manda lo que ves aquí.' }, area),
      !cot.cliente.telefono && !cot.cliente.email
        ? nota('El cliente no tiene teléfono ni correo capturados. Puedes copiar el mensaje y pegarlo donde lo necesites.', 'warn', 'alerta')
        : null),
    [el('button', { class: 'btn', onclick: cerrarModal }, 'Cerrar'),
     el('button', { class: 'btn', onclick: copiar }, icono('copiar', 15), 'Copiar'),
     el('button', { class: 'btn', onclick: porWhatsApp }, 'WhatsApp'),
     el('button', { class: 'btn btn--primary', onclick: porCorreo }, 'Abrir correo')]);

  pintar();
}

function usarEjemplo() {
  const n = cargarEjemplo();
  if (!n) return avisar('El catálogo actual no tiene los materiales del ejemplo.', 'err');
  S.guardarAhora();
  consulta = '';
  filtros = {};
  window.dispatchEvent(new CustomEvent('fmp:rerender'));
  avisar(`Cotización de ejemplo cargada con ${n} partidas`);
}

async function nuevaCotizacion() {
  const s = S.obtener();
  if (s.cotizacion.partidas.length) {
    const ok = await confirmar({
      titulo: 'Empezar de cero',
      mensaje: 'Se limpia la cotización actual. Si ya generaste el PDF, el archivo descargado no se pierde.',
      textoOk: 'Empezar de cero',
    });
    if (!ok) return;
  }
  S.nuevaCotizacion();
  S.guardarAhora();
  consulta = '';
  filtros = {};
  window.dispatchEvent(new CustomEvent('fmp:rerender'));
  avisar('Cotización nueva lista');
}
