// Generación del PDF de cotización. Máximo 3 páginas.
//
// Todo se dibuja con un motor de flujo: cada bloque pide el espacio que necesita
// antes de dibujarse y, si no cabe, salta de página. Así no hay forma de que dos
// bloques se encimen, que era el problema del enfoque de posiciones fijas.

import { fmtMXN, fmtNum, fmtFecha, sumarDias } from './format.js';
import { CATEGORIAS, leadTimeProducto } from './pricing.js';

const A4 = { w: 210, h: 297 };
const M = 16;                        // margen lateral
const ANCHO = A4.w - M * 2;          // 178 mm
const PIE = 15;                      // franja reservada al pie
const LIMITE = A4.h - PIE - 5;       // última línea útil

const C = {
  tinta:    [28, 27, 25],
  suave:    [124, 120, 115],
  tenue:    [162, 158, 152],
  linea:    [222, 219, 214],
  oro:      [150, 112, 38],
  oroTexto: [122, 92, 32],
  oroSuave: [244, 235, 214],
  oroLinea: [201, 172, 99],
  fondo:    [243, 241, 237],
  claro:    [250, 249, 247],
  blanco:   [255, 255, 255],
};

const relleno = (doc, c) => doc.setFillColor(c[0], c[1], c[2]);
const trazo = (doc, c) => doc.setDrawColor(c[0], c[1], c[2]);
const tinta = (doc, c) => doc.setTextColor(c[0], c[1], c[2]);

// ---------------------------------------------------------------------------
// Motor de flujo
// ---------------------------------------------------------------------------

function crearLienzo(doc, config, cot, maxPaginas = 3) {
  return { doc, config, cot, pagina: 1, maxPaginas, y: 0, truncado: [] };
}

function nuevaPagina(L, titulo) {
  if (L.pagina >= L.maxPaginas) return false;
  L.doc.addPage();
  L.pagina += 1;
  L.y = M + 4;
  encabezadoContinuacion(L, titulo);
  return true;
}

/** Reserva espacio. Si no cabe en la página actual, salta. Devuelve false si ya no hay páginas. */
function asegurar(L, alto, titulo) {
  if (L.y + alto <= LIMITE) return true;
  return nuevaPagina(L, titulo);
}

const avanzar = (L, mm) => { L.y += mm; };

// ---------------------------------------------------------------------------
// Piezas de dibujo
// ---------------------------------------------------------------------------

function regla(L, { x1 = M, x2 = A4.w - M, color = C.linea, grosor = 0.2 } = {}) {
  trazo(L.doc, color);
  L.doc.setLineWidth(grosor);
  L.doc.line(x1, L.y, x2, L.y);
}

function rotulo(L, txt, { x = M, tam = 7, color = C.oroTexto } = {}) {
  L.doc.setFont('helvetica', 'bold');
  L.doc.setFontSize(tam);
  tinta(L.doc, color);
  L.doc.text(String(txt).toUpperCase(), x, L.y, { charSpace: 0.7 });
}

/** Pastilla de característica. Esquinas casi rectas y oro, para que imprima con clase. */
function pastilla(doc, txt, x, y, { tam = 6.4 } = {}) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(tam);
  const w = doc.getTextWidth(txt) + 6;
  const h = 5;
  relleno(doc, C.oroSuave);
  trazo(doc, C.oroLinea);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y - h + 1.3, w, h, 0.7, 0.7, 'FD');
  tinta(doc, C.oroTexto);
  doc.text(txt, x + 3, y - 1.1);
  return w + 2.4;
}

/** Dibuja una hilera de pastillas ajustando a varias líneas. Devuelve el alto usado. */
function hileraPastillas(L, textos, { x = M, ancho = ANCHO } = {}) {
  const { doc } = L;
  let cx = x;
  let lineas = 1;
  for (const t of textos) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.4);
    const w = doc.getTextWidth(t) + 6 + 2.4;
    if (cx + w > x + ancho) { cx = x; L.y += 6.6; lineas += 1; }
    pastilla(doc, t, cx, L.y + 4);
    cx += w;
  }
  L.y += 6.6;
  return lineas * 6.6;
}

function altoPastillas(doc, textos, ancho = ANCHO) {
  let cx = 0, lineas = 1;
  for (const t of textos) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.4);
    const w = doc.getTextWidth(t) + 8.4;
    if (cx + w > ancho) { cx = 0; lineas += 1; }
    cx += w;
  }
  return lineas * 6.6;
}

// ---------------------------------------------------------------------------
// Encabezados y pie
// ---------------------------------------------------------------------------

function marcaPlaceholder(doc, x, y) {
  relleno(doc, C.oroSuave);
  trazo(doc, C.oroLinea);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, 26, 26, 1, 1, 'FD');
  doc.setFont('times', 'normal');
  doc.setFontSize(13);
  tinta(doc, C.oroTexto);
  doc.text('FMP', x + 13, y + 14, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.4);
  tinta(doc, C.tenue);
  doc.text('LOGOTIPO', x + 13, y + 19.5, { align: 'center', charSpace: 0.4 });
}

function encabezado(L) {
  const { doc, config } = L;
  const e = config.empresa;
  L.y = M + 2;
  const y0 = L.y;

  if (e.logoDataUrl) {
    try { doc.addImage(e.logoDataUrl, 'PNG', M, y0 - 1, 26, 26, undefined, 'FAST'); }
    catch { marcaPlaceholder(doc, M, y0 - 1); }
  } else {
    marcaPlaceholder(doc, M, y0 - 1);
  }

  const xt = M + 31;
  doc.setFont('times', 'normal');
  doc.setFontSize(17);
  tinta(doc, C.tinta);
  doc.text(e.nombre || 'Nombre de la empresa', xt, y0 + 7.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.4);
  tinta(doc, C.suave);
  doc.text(e.tagline || '', xt, y0 + 12.5);

  if (e.fundacion) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.6);
    tinta(doc, C.oroTexto);
    doc.text(`DESDE ${e.fundacion}`, xt, y0 + 17.4, { charSpace: 0.7 });
  }

  const xd = A4.w - M;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  tinta(doc, C.suave);
  const contacto = [e.telefono, e.email, e.web].filter(Boolean);
  contacto.forEach((l, i) => doc.text(l, xd, y0 + 4 + i * 3.9, { align: 'right' }));

  doc.setFontSize(6.6);
  const dir = doc.splitTextToSize(e.direccion || '', 68);
  dir.slice(0, 2).forEach((l, i) =>
    doc.text(l, xd, y0 + 5.6 + contacto.length * 3.9 + i * 3, { align: 'right' }));

  L.y = y0 + 27;
  regla(L, { color: C.tinta, grosor: 0.6 });
  L.y += 10;
}

function encabezadoContinuacion(L, titulo) {
  const { doc, config, cot } = L;
  doc.setFont('times', 'normal');
  doc.setFontSize(12.5);
  tinta(doc, C.tinta);
  doc.text(titulo || config.empresa.nombre, M, L.y + 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  tinta(doc, C.oroTexto);
  doc.text(cot.folio || '', A4.w - M, L.y + 4, { align: 'right', charSpace: 0.7 });

  L.y += 7;
  regla(L, { color: C.tinta, grosor: 0.5 });
  L.y += 9;
}

function pies(doc, config, total) {
  const e = config.empresa;
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    const y = A4.h - 11;
    trazo(doc, C.linea);
    doc.setLineWidth(0.2);
    doc.line(M, y - 4.5, A4.w - M, y - 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    tinta(doc, C.suave);
    const linea = [e.telefono, e.email, e.direccion].filter(Boolean).join('   ·   ');
    doc.text(doc.splitTextToSize(linea, ANCHO - 18)[0], M, y);
    doc.setFont('helvetica', 'bold');
    tinta(doc, C.oroTexto);
    doc.text(`${p} / ${total}`, A4.w - M, y, { align: 'right' });
  }
}

// ---------------------------------------------------------------------------
// Página 1: datos de la cotización
// ---------------------------------------------------------------------------

function datosCotizacion(L, totales) {
  const { doc, config, cot } = L;
  const fecha = new Date(cot.fecha);
  const vence = sumarDias(fecha, config.comercial.vigenciaDias);
  const dias = Math.ceil(
    totales.lineas.reduce((s, l) => s + (l.calculo.areaBase ?? 0), 0) /
    (config.logistica.diasInstalacionM2 || 25));
  const entrega = sumarDias(fecha, totales.leadTimeMax + dias);

  doc.setFont('times', 'normal');
  doc.setFontSize(25);
  tinta(doc, C.tinta);
  doc.text('Cotización', M, L.y + 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  tinta(doc, C.oroTexto);
  doc.text(cot.folio || 'SIN FOLIO', M, L.y + 8.4, { charSpace: 0.8 });

  const xd = A4.w - M;
  const meta = [
    ['Fecha', fmtFecha(fecha)],
    ['Vigencia', `${fmtFecha(vence)} (${config.comercial.vigenciaDias} días)`],
    ['Entrega estimada', fmtFecha(entrega)],
    ['Atiende', cot.vendedor || '—'],
  ];
  doc.setFontSize(7);
  meta.forEach(([k, v], i) => {
    const yy = L.y - 2 + i * 4;
    doc.setFont('helvetica', 'normal');
    tinta(doc, C.suave);
    doc.text(k, xd - 54, yy, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    tinta(doc, C.tinta);
    doc.text(String(v), xd, yy, { align: 'right' });
  });

  L.y += 16;

  // Bloque de cliente
  const altoCaja = 19;
  relleno(doc, C.claro);
  trazo(doc, C.linea);
  doc.setLineWidth(0.2);
  doc.roundedRect(M, L.y, ANCHO, altoCaja, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.4);
  tinta(doc, C.oroTexto);
  doc.text('CLIENTE', M + 5, L.y + 6, { charSpace: 0.7 });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  tinta(doc, C.tinta);
  doc.text(doc.splitTextToSize(cot.cliente.nombre || 'Cliente sin nombre', 96)[0], M + 5, L.y + 11.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  tinta(doc, C.suave);
  const detalle = [cot.cliente.contacto, cot.cliente.telefono, cot.cliente.email]
    .filter(Boolean).join('   ·   ');
  doc.text(doc.splitTextToSize(detalle, 96)[0], M + 5, L.y + 15.6);

  if (cot.cliente.obra) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.4);
    tinta(doc, C.oroTexto);
    doc.text('OBRA / PROYECTO', A4.w - M - 68, L.y + 6, { charSpace: 0.7 });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.4);
    tinta(doc, C.tinta);
    doc.text(doc.splitTextToSize(cot.cliente.obra, 66).slice(0, 2), A4.w - M - 68, L.y + 11.8);
  }

  L.y += altoCaja + 11;
}

// ---------------------------------------------------------------------------
// Partidas
// ---------------------------------------------------------------------------

function descripcionPartida(linea) {
  const p = linea.producto;
  const c = linea.calculo;
  const partes = [];

  if (c.tipo === 'piso') {
    const dim = [
      p.espesorMm ? `${p.espesorMm} mm` : null,
      p.anchoMm ? `${p.anchoMm} mm ancho` : null,
      p.largoMm ? `${p.largoMm} mm largo` : null,
    ].filter(Boolean).join(' · ');
    if (dim) partes.push(dim);
    if (p.acabado) partes.push(p.acabado);
    partes.push(`Colocación ${c.patronNombre.toLowerCase()} · merma ${fmtNum(c.mermaPct * 100, 0)}%`);
    if (c.cajas) partes.push(`${c.cajas} cajas de ${fmtNum(c.m2Caja)} m²`);
  } else if (c.tipo === 'cortina') {
    partes.push(`${fmtNum(c.ancho)} × ${fmtNum(c.alto)} m · ${c.cantidad} juego(s)`);
    partes.push(`Pliegue ${fmtNum(c.pliegue, 1)}x · corte ${c.metodo}`);
    if (p.tela) partes.push(p.tela);
  } else if (c.tipo === 'persiana') {
    partes.push(`${fmtNum(c.ancho)} × ${fmtNum(c.alto)} m · ${c.cantidad} pza`);
    if (c.aplicaMinimo) partes.push(`Área mínima facturable ${fmtNum(c.areaMinima)} m²`);
    if (p.acabado) partes.push(p.acabado);
  }

  if (c.accesorios?.length) {
    partes.push(`Incluye: ${c.accesorios.map((a) => a.concepto.split('(')[0].trim()).join(', ')}`);
  }
  if (c.manoObra > 0) partes.push('Instalación incluida');
  return partes;
}

function cantidadPartida(c) {
  if (c.tipo === 'piso') return { cant: fmtNum(c.areaFacturable), un: 'm²' };
  if (c.tipo === 'cortina') return { cant: fmtNum(c.metrosLineales, 1), un: 'ml' };
  if (c.tipo === 'persiana') return { cant: fmtNum(c.areaFacturable), un: 'm²' };
  return { cant: fmtNum(c.cantidad, 0), un: 'pza' };
}

const COLS = { desc: M, cantR: M + 100, un: M + 102, puR: M + 140, impR: A4.w - M };
const ANCHO_DESC = 82;

function cabeceraTabla(L) {
  const { doc } = L;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.4);
  tinta(doc, C.suave);
  doc.text('CONCEPTO', COLS.desc, L.y, { charSpace: 0.5 });
  doc.text('CANT.', COLS.cantR, L.y, { align: 'right', charSpace: 0.5 });
  doc.text('UN.', COLS.un, L.y, { charSpace: 0.5 });
  doc.text('P. UNITARIO', COLS.puR, L.y, { align: 'right', charSpace: 0.5 });
  doc.text('IMPORTE', COLS.impR, L.y, { align: 'right', charSpace: 0.5 });
  L.y += 2.6;
  regla(L);
  L.y += 5.4;
}

function medirPartida(doc, linea, idx, maxLineasDesc = 99) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.4);
  const encabezadoTxt = doc.splitTextToSize(`${idx + 1}.  ${linea.producto.nombre}`, ANCHO_DESC);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.7);
  const desc = descripcionPartida(linea)
    .flatMap((l) => doc.splitTextToSize(l, ANCHO_DESC - 5.5))
    .slice(0, maxLineasDesc);

  const importado = Boolean(linea.producto.importado);
  const alto = encabezadoTxt.length * 4 + desc.length * 2.75 + (importado ? 3.1 : 0) + 2.2;
  return { linea, idx, encabezadoTxt, desc, importado, alto };
}

function dibujarPartida(L, b, esUltima) {
  const { doc } = L;
  const c = b.linea.calculo;
  const { cant, un } = cantidadPartida(c);
  const pu = c.importe / (parseFloat(cant.replace(/,/g, '')) || 1);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.4);
  tinta(doc, C.tinta);
  b.encabezadoTxt.forEach((t, i) => doc.text(t, COLS.desc, L.y + i * 4));

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  tinta(doc, C.tinta);
  doc.text(cant, COLS.cantR, L.y, { align: 'right' });
  doc.text(un, COLS.un, L.y);
  doc.text(fmtMXN(pu), COLS.puR, L.y, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.text(fmtMXN(c.importe), COLS.impR, L.y, { align: 'right' });

  L.y += b.encabezadoTxt.length * 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.7);
  tinta(doc, C.suave);
  for (const t of b.desc) {
    doc.text(t, COLS.desc + 5.5, L.y);
    L.y += 2.75;
  }

  if (b.importado) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    tinta(doc, C.oroTexto);
    doc.text(`IMPORTADO · ${String(b.linea.producto.origen || '').toUpperCase()}`,
      COLS.desc + 5.5, L.y + 0.4, { charSpace: 0.4 });
    L.y += 3.1;
  }

  L.y += 2.2;
  if (!esUltima) {
    regla(L, { color: C.linea, grosor: 0.15 });
    L.y += 4.4;
  }
}

function tablaPartidas(L, totales, reservaCierre = 0) {
  const { doc } = L;

  rotulo(L, 'Partidas');
  L.y += 4.4;
  regla(L, { color: C.tinta, grosor: 0.5 });
  L.y += 4.4;
  cabeceraTabla(L);

  // Se prefiere que la gráfica y los totales cierren en esta misma página.
  // Si con la descripción completa no alcanza, se recorta la descripción
  // antes que dejar media página en blanco.
  const altoCon = (n) =>
    totales.lineas.reduce((t, l, i) => t + medirPartida(doc, l, i, n).alto, 0) +
    Math.max(0, totales.lineas.length - 1) * 4.4;

  // Margen de seguridad de 5 mm: recortar la descripción solo vale la pena si
  // de verdad logra que el cierre quepa. Recortar y aun así saltar de página
  // deja lo peor de los dos mundos.
  const disponible = LIMITE - L.y - reservaCierre - 5;
  let nivel = 99;
  if (reservaCierre > 0 && altoCon(99) > disponible) {
    for (const cand of [5, 4]) {
      if (altoCon(cand) <= disponible) { nivel = cand; break; }
    }
  }

  const bloques = totales.lineas.map((l, i) => medirPartida(doc, l, i, nivel));
  let dibujadas = 0;

  for (let i = 0; i < bloques.length; i++) {
    const b = bloques[i];
    const esUltima = i === bloques.length - 1;
    const necesita = b.alto + (esUltima ? 0 : 4.4);

    if (L.y + necesita > LIMITE) {
      if (!nuevaPagina(L, 'Cotización · continúa')) break;
      cabeceraTabla(L);
    }
    dibujarPartida(L, b, esUltima);
    dibujadas += 1;
  }

  const ocultas = totales.lineas.length - dibujadas;
  if (ocultas > 0) {
    const suma = totales.lineas.slice(dibujadas).reduce((s, l) => s + l.calculo.importe, 0);
    L.truncado.push(`${ocultas} partida(s) no cupieron en el PDF`);
    if (L.y + 6 <= LIMITE) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.8);
      tinta(doc, C.oroTexto);
      doc.text(
        `+ ${ocultas} partida(s) adicional(es) por ${fmtMXN(suma)}, ya incluidas en el total. Desglose completo a solicitud.`,
        M, L.y);
      L.y += 5;
    }
  }
}

// ---------------------------------------------------------------------------
// Gráfica y totales
// ---------------------------------------------------------------------------

function barrasGrafica(totales) {
  return [
    { etiqueta: 'Material',     valor: totales.desgloseVenta.material,   color: [52, 49, 45] },
    { etiqueta: 'Mano de obra', valor: totales.desgloseVenta.manoObra,   color: [150, 112, 38] },
    { etiqueta: 'Confección',   valor: totales.desgloseVenta.confeccion, color: [186, 158, 106] },
    { etiqueta: 'Accesorios',   valor: totales.desgloseVenta.accesorios, color: [212, 199, 173] },
  ].filter((i) => i.valor > 0.5);
}

function grafica(L, totales) {
  const { doc } = L;
  const items = barrasGrafica(totales);
  if (!items.length) return;

  const suma = items.reduce((s, i) => s + i.valor, 0) || 1;
  const max = Math.max(...items.map((i) => i.valor));

  rotulo(L, 'Distribución de la inversión');
  L.y += 6.4;

  const xBar = M + 34;
  const anchoBar = 72;
  const alto = 3.8;

  for (const it of items) {
    const w = Math.max((it.valor / max) * anchoBar, 1.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    tinta(doc, C.tinta);
    doc.text(it.etiqueta, M, L.y + 2.9);

    relleno(doc, C.fondo);
    doc.roundedRect(xBar, L.y, anchoBar, alto, 0.5, 0.5, 'F');
    relleno(doc, it.color);
    doc.roundedRect(xBar, L.y, w, alto, 0.5, 0.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    tinta(doc, C.suave);
    doc.text(`${fmtNum((it.valor / suma) * 100, 1)}%`, xBar + anchoBar + 15, L.y + 2.9, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    tinta(doc, C.tinta);
    doc.text(fmtMXN(it.valor), A4.w - M, L.y + 2.9, { align: 'right' });

    L.y += alto + 2.4;
  }
}

function altoGrafica(totales) {
  const n = barrasGrafica(totales).length;
  return n ? 6.4 + n * 6.2 + 4 : 0;
}

const ALTO_TOTALES = 35;

function bloqueTotales(L, totales) {
  const { doc, config } = L;
  const xEtiqueta = A4.w - M - 72;
  const cajaX = xEtiqueta - 4;
  const cajaW = (A4.w - M) - cajaX;

  regla(L, { x1: cajaX, color: C.tinta, grosor: 0.5 });
  L.y += 5.6;

  const fila = (etiqueta, valor, { fuerte = false, color = C.tinta } = {}) => {
    doc.setFont('helvetica', fuerte ? 'bold' : 'normal');
    doc.setFontSize(fuerte ? 8.4 : 7.8);
    tinta(doc, fuerte ? C.tinta : C.suave);
    doc.text(etiqueta, xEtiqueta, L.y);
    tinta(doc, color);
    doc.setFont('helvetica', 'bold');
    doc.text(valor, A4.w - M, L.y, { align: 'right' });
    L.y += 4.8;
  };

  fila('Subtotal', fmtMXN(totales.subtotal));
  if (totales.descuentoGlobal > 0) {
    fila(`Descuento ${fmtNum(totales.descuentoGlobalPct * 100, 0)}%`,
      `- ${fmtMXN(totales.descuentoGlobal)}`, { color: C.oroTexto });
  }
  fila(`IVA ${fmtNum(totales.ivaPct * 100, 0)}%`, fmtMXN(totales.iva));

  L.y += 1.4;
  relleno(doc, C.tinta);
  doc.roundedRect(cajaX, L.y - 4, cajaW, 12, 0.8, 0.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.6);
  tinta(doc, C.blanco);
  doc.text('TOTAL', cajaX + 5, L.y + 3.2, { charSpace: 0.8 });
  doc.setFontSize(11.5);
  doc.text(fmtMXN(totales.total), cajaX + cajaW - 5, L.y + 3.6, { align: 'right' });
  L.y += 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  tinta(doc, C.suave);
  doc.text(`Precios en ${config.fiscal.moneda}. IVA desglosado.`, A4.w - M, L.y + 2.6, { align: 'right' });
  L.y += 6;
}

// ---------------------------------------------------------------------------
// Anexo técnico
// ---------------------------------------------------------------------------

function medirEspecificacion(doc, linea) {
  const p = linea.producto;
  const specs = listaSpecs(linea);
  const filas = Math.ceil(specs.length / 3);
  const pastillas = (p.caracteristicas ?? []).slice(0, 6);
  return 4 + filas * 3.6 + (pastillas.length ? altoPastillas(doc, pastillas) : 0) + 6.5;
}

function listaSpecs(linea) {
  const p = linea.producto;
  const c = linea.calculo;
  const specs = [];
  if (p.especie) specs.push(['Material', p.especie]);
  if (p.espesorMm) specs.push(['Espesor', `${p.espesorMm} mm (${fmtNum(p.espesorMm / 25.4, 2)}")`]);
  if (p.anchoMm) specs.push(['Ancho', `${p.anchoMm} mm`]);
  if (p.largoMm) specs.push(['Largo', `${p.largoMm} mm`]);
  if (p.capaNobleMm) specs.push(['Capa noble', `${p.capaNobleMm} mm`]);
  if (p.acabado) specs.push(['Acabado', p.acabado]);
  if (p.color) specs.push(['Color', p.color]);
  if (p.tela) specs.push(['Tela', p.tela]);
  if (p.anchoRolloM) specs.push(['Ancho de rollo', `${fmtNum(p.anchoRolloM)} m`]);
  if (c.tipo === 'piso') specs.push(['Superficie facturada', `${fmtNum(c.areaFacturable)} m²`]);
  if (c.tipo === 'cortina') specs.push(['Tela requerida', `${fmtNum(c.metrosLineales, 1)} ml`]);
  if (c.tipo === 'persiana') specs.push(['Área facturada', `${fmtNum(c.areaFacturable)} m²`]);
  return specs;
}

function especificaciones(L, totales) {
  const { doc } = L;

  if (!asegurar(L, 26, 'Anexo técnico')) return;
  rotulo(L, 'Especificaciones técnicas');
  L.y += 4.4;
  regla(L, { color: C.tinta, grosor: 0.5 });
  L.y += 6.4;

  let dibujadas = 0;
  for (const linea of totales.lineas) {
    const alto = medirEspecificacion(doc, linea);
    if (!asegurar(L, alto, 'Anexo técnico · continúa')) break;

    const p = linea.producto;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    tinta(doc, C.tinta);
    doc.text(doc.splitTextToSize(nombreConIngles(p), 122)[0], M, L.y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.6);
    tinta(doc, C.tenue);
    doc.text(`SKU ${p.sku || p.id}`, A4.w - M, L.y, { align: 'right' });
    L.y += 4;

    const specs = listaSpecs(linea);
    const anchoCol = ANCHO / 3;
    doc.setFontSize(6.9);
    specs.forEach(([k, v], i) => {
      const x = M + (i % 3) * anchoCol;
      const yy = L.y + Math.floor(i / 3) * 3.6;
      doc.setFont('helvetica', 'normal');
      tinta(doc, C.suave);
      doc.text(`${k}:`, x, yy);
      doc.setFont('helvetica', 'bold');
      tinta(doc, C.tinta);
      doc.text(String(v), x + doc.getTextWidth(`${k}: `) + 0.8, yy);
    });
    L.y += Math.ceil(specs.length / 3) * 3.6 + 1.4;

    const cars = (p.caracteristicas ?? []).slice(0, 6);
    if (cars.length) hileraPastillas(L, cars);

    L.y += 2.4;
    regla(L, { color: C.linea, grosor: 0.15 });
    L.y += 5;
    dibujadas += 1;
  }

  if (dibujadas < totales.lineas.length) {
    L.truncado.push(`${totales.lineas.length - dibujadas} ficha(s) técnica(s) no cupieron`);
    if (asegurar(L, 6)) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.6);
      tinta(doc, C.suave);
      doc.text(`Fichas técnicas de las ${totales.lineas.length - dibujadas} partidas restantes disponibles a solicitud.`, M, L.y);
      L.y += 5;
    }
  }
}

/** "Duela de ingeniería (Engineered wood flooring)" cuando el producto trae alias. */
function nombreConIngles(p) {
  return p.nombreEn ? `${p.nombre}  (${p.nombreEn})` : p.nombre;
}

// ---------------------------------------------------------------------------
// Entrega, pago y condiciones
// ---------------------------------------------------------------------------

function tiemposEntrega(L, totales) {
  const { doc, config, cot } = L;
  const fecha = new Date(cot.fecha);
  const filas = totales.lineas.map((l) => ({
    nombre: l.producto.nombre,
    dias: leadTimeProducto(l.producto, config),
    origen: l.producto.importado ? `Importado · ${l.producto.origen}` : 'Existencia nacional',
  }));

  const alto = 12 + filas.length * 3.8 + (totales.hayImportados ? 11 : 0) + 6;
  if (!asegurar(L, Math.min(alto, 60), 'Entrega y condiciones')) return;

  rotulo(L, 'Tiempos de entrega');
  L.y += 4.4;
  regla(L, { color: C.tinta, grosor: 0.5 });
  L.y += 5.6;

  doc.setFontSize(6.9);
  for (const f of filas) {
    if (!asegurar(L, 4.2, 'Entrega y condiciones · continúa')) break;
    doc.setFont('helvetica', 'normal');
    tinta(doc, C.tinta);
    doc.text(doc.splitTextToSize(f.nombre, 84)[0], M, L.y);
    tinta(doc, C.suave);
    doc.text(f.origen, M + 88, L.y);
    doc.setFont('helvetica', 'bold');
    tinta(doc, f.dias > 30 ? C.oroTexto : C.tinta);
    doc.text(`${f.dias} días`, M + 138, L.y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    tinta(doc, C.suave);
    doc.text(fmtFecha(sumarDias(fecha, f.dias)), A4.w - M, L.y, { align: 'right' });
    L.y += 3.8;
  }

  if (totales.hayImportados && asegurar(L, 12)) {
    L.y += 2;
    relleno(doc, C.oroSuave);
    trazo(doc, C.oroLinea);
    doc.setLineWidth(0.2);
    doc.roundedRect(M, L.y - 2.6, ANCHO, 9.4, 0.8, 0.8, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.4);
    tinta(doc, C.oroTexto);
    doc.text('PRODUCTO DE IMPORTACIÓN', M + 4.5, L.y + 1, { charSpace: 0.5 });
    doc.setFont('helvetica', 'normal');
    tinta(doc, C.suave);
    doc.text(`Incluye ${config.logistica.diasTransito} días de tránsito marítimo y ${config.logistica.diasAduana} de despacho aduanal. El plazo corre a partir del anticipo.`,
      M + 4.5, L.y + 4.4);
    L.y += 11;
  }
  L.y += 7;
}

function esquemaPago(L, totales) {
  const { doc, config } = L;
  if (!asegurar(L, 32, 'Entrega y condiciones')) return;

  rotulo(L, 'Esquema de pago');
  L.y += 4.4;
  regla(L, { color: C.tinta, grosor: 0.5 });
  L.y += 6.4;

  const a = config.comercial.anticipoPct;
  const pagos = [
    [`Anticipo ${fmtNum(a * 100, 0)}%`, 'A la firma. Libera fabricación y pedido de importación.', totales.anticipo],
    [`Saldo ${fmtNum((1 - a) * 100, 0)}%`, 'Contra entrega de material en obra, previo a instalación.', totales.saldo],
  ];
  for (const [etq, nota, monto] of pagos) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    tinta(doc, C.tinta);
    doc.text(etq, M, L.y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.7);
    tinta(doc, C.suave);
    doc.text(nota, M + 34, L.y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    tinta(doc, C.tinta);
    doc.text(fmtMXN(monto), A4.w - M, L.y, { align: 'right' });
    L.y += 5.6;
  }
  L.y += 6;
}

function condiciones(L) {
  const { doc, config } = L;
  const textos = [
    `Vigencia de ${config.comercial.vigenciaDias} días naturales. Los precios de producto importado están sujetos al tipo de cambio del día de la orden.`,
    'Las cantidades se calculan sobre las medidas proporcionadas por el cliente. El levantamiento en sitio puede modificarlas y se ajusta antes de la orden.',
    'El material se surte por caja completa. La merma indicada por partida ya está considerada en el importe.',
    'No incluye: retiro de piso existente, nivelación de sustrato, obra civil, trabajos eléctricos ni cancelería.',
    'El sitio debe entregarse en obra blanca terminada, nivelado con tolerancia de 3 mm en 2 m y con humedad de losa menor a 2.5%.',
    'La madera requiere 72 horas de aclimatación en obra antes de instalarse, en las condiciones finales de temperatura y humedad.',
    `Garantía de ${config.comercial.garantiaAnios} años en producto contra defecto de fabricación e instalación, con uso y mantenimiento conforme a la ficha técnica.`,
    'Variaciones naturales de veta, tono y nudo en madera no se consideran defecto.',
  ];

  if (!asegurar(L, 26, 'Condiciones')) return;
  rotulo(L, 'Condiciones');
  L.y += 4.4;
  regla(L, { color: C.tinta, grosor: 0.5 });
  L.y += 5.6;

  doc.setFontSize(6.5);
  textos.forEach((t, i) => {
    doc.setFont('helvetica', 'normal');
    const lineas = doc.splitTextToSize(t, ANCHO - 8);
    const alto = lineas.length * 2.9 + 1.6;
    if (!asegurar(L, alto, 'Condiciones · continúa')) return;

    doc.setFont('helvetica', 'bold');
    tinta(doc, C.oroTexto);
    doc.text(String(i + 1).padStart(2, '0'), M, L.y);
    doc.setFont('helvetica', 'normal');
    tinta(doc, C.suave);
    lineas.forEach((w, k) => doc.text(w, M + 7, L.y + k * 2.9));
    L.y += alto;
  });
  L.y += 6;
}

function firmas(L) {
  const { doc, config, cot } = L;
  if (!asegurar(L, 24, 'Condiciones')) return;

  // Se empuja al pie de la página para que la firma quede donde se espera.
  L.y = Math.max(L.y + 6, LIMITE - 16);

  const w = 74;
  trazo(doc, C.tinta);
  doc.setLineWidth(0.3);
  doc.line(M, L.y, M + w, L.y);
  doc.line(A4.w - M - w, L.y, A4.w - M, L.y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.4);
  tinta(doc, C.tinta);
  doc.text(doc.splitTextToSize(cot.cliente.nombre || '', w)[0] || '', M, L.y - 2.4);
  doc.text(cot.vendedor || '', A4.w - M - w, L.y - 2.4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  tinta(doc, C.suave);
  doc.text('Por el cliente · nombre y firma', M, L.y + 3.6);
  doc.text(`Por ${config.empresa.nombre}`, A4.w - M - w, L.y + 3.6);
  L.y += 8;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export function generarPDF(cot, totales, config, { modo = 'descargar', maxPaginas = 3 } = {}) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({
    title: `Cotización ${cot.folio ?? ''} · ${cot.cliente.nombre ?? ''}`,
    subject: 'Cotización de suministro e instalación',
    author: config.empresa.nombre,
    creator: config.empresa.nombre,
  });

  const L = crearLienzo(doc, config, cot, maxPaginas);

  // --- Propuesta comercial ---
  encabezado(L);
  datosCotizacion(L, totales);

  // La gráfica y los totales viajan juntos: o caben los dos, o saltan los dos.
  const bloqueCierre = altoGrafica(totales) + ALTO_TOTALES + 6;
  tablaPartidas(L, totales, bloqueCierre);

  L.y += 6;
  if (L.y + bloqueCierre > LIMITE && L.pagina < L.maxPaginas) {
    // El corte se anuncia. Un hueco al pie sin explicación parece un error de armado.
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.8);
    doc.setTextColor(C.oroTexto[0], C.oroTexto[1], C.oroTexto[2]);
    doc.text('Continúa en la siguiente página: distribución de la inversión y totales.',
      A4.w - M, Math.min(L.y + 2, LIMITE), { align: 'right' });
  }
  asegurar(L, bloqueCierre, 'Cotización · continúa');
  grafica(L, totales);
  L.y += 4;
  bloqueTotales(L, totales);

  // --- Anexo técnico ---
  // Se abre página nueva solo si la actual ya trae contenido. Forzarlo siempre
  // dejaba una página con dos bloques arriba y el resto en blanco.
  const yaEmpezada = L.y > M + 70;
  if (yaEmpezada && L.pagina < L.maxPaginas) {
    nuevaPagina(L, 'Anexo técnico y condiciones');
  } else {
    L.y += 10;
    regla(L, { color: C.linea, grosor: 0.3 });
    L.y += 10;
  }
  especificaciones(L, totales);
  tiemposEntrega(L, totales);
  esquemaPago(L, totales);
  condiciones(L);
  firmas(L);

  pies(doc, config, doc.getNumberOfPages());

  if (L.truncado.length) console.warn('[PDF] Contenido recortado:', L.truncado);

  const nombre = `Cotizacion_${(cot.folio || 'SF').replace(/\W+/g, '-')}_${(cot.cliente.nombre || 'cliente').replace(/\W+/g, '-').slice(0, 28)}.pdf`;

  // 'nodo' existe para poder generar un PDF de muestra fuera del navegador.
  if (modo === 'nodo') return { datos: doc.output('arraybuffer'), nombre, paginas: doc.getNumberOfPages(), truncado: L.truncado };
  if (modo === 'blob') return { blob: doc.output('blob'), nombre, paginas: doc.getNumberOfPages(), truncado: L.truncado };
  if (modo === 'url') return { url: doc.output('bloburl'), nombre, paginas: doc.getNumberOfPages(), truncado: L.truncado };
  doc.save(nombre);
  return { nombre, paginas: doc.getNumberOfPages(), truncado: L.truncado };
}
