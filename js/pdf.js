// Generación del PDF de cotización. Máximo estricto: 2 páginas A4.
// Todo se dibuja en vectores (sin html2canvas) para que el archivo sea nítido y ligero.

import { fmtMXN, fmtNum, fmtFecha, sumarDias } from './format.js';
import { CATEGORIAS, leadTimeProducto } from './pricing.js';

const A4 = { w: 210, h: 297 };
const M = 16;                      // margen
const ANCHO = A4.w - M * 2;        // 178 mm

const C = {
  tinta:  [28, 27, 25],
  suave:  [124, 120, 115],
  linea:  [222, 219, 214],
  acento: [107, 96, 85],
  fondo:  [237, 235, 232],
  claro:  [249, 248, 246],
};

const set = (doc, fn, color) => doc[fn](color[0], color[1], color[2]);
const relleno = (doc, c) => set(doc, 'setFillColor', c);
const trazo = (doc, c) => set(doc, 'setDrawColor', c);
const tinta = (doc, c) => set(doc, 'setTextColor', c);

function regla(doc, y, x1 = M, x2 = A4.w - M, color = C.linea, grosor = 0.2) {
  trazo(doc, color);
  doc.setLineWidth(grosor);
  doc.line(x1, y, x2, y);
}

function titulo(doc, txt, x, y, tam = 8) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(tam);
  tinta(doc, C.suave);
  doc.text(String(txt).toUpperCase(), x, y, { charSpace: 0.5 });
}

function pastilla(doc, txt, x, y, { fondo = C.fondo, color = C.acento, tam = 6.5 } = {}) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(tam);
  const w = doc.getTextWidth(txt) + 5;
  const h = 4.6;
  relleno(doc, fondo);
  doc.roundedRect(x, y - h + 1.2, w, h, 2.3, 2.3, 'F');
  tinta(doc, color);
  doc.text(txt, x + 2.5, y - 0.6);
  return w + 2;
}

// --------------------------------------------------------------------------- encabezado

function encabezado(doc, config) {
  const e = config.empresa;
  let y = M + 2;

  // Marca
  if (e.logoDataUrl) {
    try { doc.addImage(e.logoDataUrl, 'PNG', M, y - 1, 26, 26, undefined, 'FAST'); }
    catch { marcaPlaceholder(doc, M, y - 1); }
  } else {
    marcaPlaceholder(doc, M, y - 1);
  }

  const xTexto = M + 31;
  doc.setFont('times', 'normal');
  doc.setFontSize(17);
  tinta(doc, C.tinta);
  doc.text(e.nombre || 'Nombre de la empresa', xTexto, y + 7.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.4);
  tinta(doc, C.suave);
  doc.text(e.tagline || '', xTexto, y + 12.5);
  if (e.fundacion) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.6);
    tinta(doc, C.acento);
    doc.text(`DESDE ${e.fundacion}`, xTexto, y + 17.2, { charSpace: 0.6 });
  }

  // Bloque de contacto, alineado a la derecha
  const xd = A4.w - M;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  tinta(doc, C.suave);
  const contacto = [e.telefono, e.email, e.web].filter(Boolean);
  contacto.forEach((linea, i) => doc.text(linea, xd, y + 4 + i * 3.9, { align: 'right' }));

  const dir = doc.splitTextToSize(e.direccion || '', 66);
  doc.setFontSize(6.6);
  dir.slice(0, 2).forEach((linea, i) =>
    doc.text(linea, xd, y + 4 + contacto.length * 3.9 + 1.4 + i * 3, { align: 'right' }));

  y += 27;
  regla(doc, y, M, A4.w - M, C.tinta, 0.5);
  return y + 9;
}

function marcaPlaceholder(doc, x, y) {
  relleno(doc, C.fondo);
  trazo(doc, C.acento);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, 26, 26, 2, 2, 'FD');
  doc.setFont('times', 'normal');
  doc.setFontSize(13);
  tinta(doc, C.acento);
  doc.text('FMP', x + 13, y + 14, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.4);
  tinta(doc, C.suave);
  doc.text('LOGOTIPO', x + 13, y + 19.5, { align: 'center', charSpace: 0.4 });
}

function pie(doc, config, pagina, totalPaginas) {
  const e = config.empresa;
  const y = A4.h - 12;
  regla(doc, y - 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.3);
  tinta(doc, C.suave);
  doc.text(`${e.telefono}   ·   ${e.email}   ·   ${e.direccion}`, M, y);
  doc.setFont('helvetica', 'bold');
  doc.text(`${pagina} / ${totalPaginas}`, A4.w - M, y, { align: 'right' });
}

// --------------------------------------------------------------------------- gráfica

/** Barras horizontales con el reparto de la inversión. Vectorial, sin dependencias. */
function grafica(doc, y, totales) {
  const items = [
    { etiqueta: 'Material',     valor: totales.desgloseVenta.material,   color: [58, 55, 51] },
    { etiqueta: 'Mano de obra', valor: totales.desgloseVenta.manoObra,   color: [107, 96, 85] },
    { etiqueta: 'Confección',   valor: totales.desgloseVenta.confeccion, color: [154, 146, 136] },
    { etiqueta: 'Accesorios',   valor: totales.desgloseVenta.accesorios, color: [196, 190, 182] },
  ].filter((i) => i.valor > 0.5);

  if (!items.length) return y;

  const suma = items.reduce((s, i) => s + i.valor, 0) || 1;
  const max = Math.max(...items.map((i) => i.valor));

  titulo(doc, 'Distribución de la inversión', M, y);
  y += 5.5;

  const xBar = M + 34;
  const anchoBar = 74;
  const alto = 4.2;

  for (const it of items) {
    const w = Math.max((it.valor / max) * anchoBar, 1.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    tinta(doc, C.tinta);
    doc.text(it.etiqueta, M, y + 3);

    relleno(doc, C.claro);
    doc.roundedRect(xBar, y, anchoBar, alto, 0.7, 0.7, 'F');
    relleno(doc, it.color);
    doc.roundedRect(xBar, y, w, alto, 0.7, 0.7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    tinta(doc, C.suave);
    doc.text(`${fmtNum((it.valor / suma) * 100, 1)}%`, xBar + anchoBar + 15, y + 3, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    tinta(doc, C.tinta);
    doc.text(fmtMXN(it.valor), A4.w - M, y + 3, { align: 'right' });

    y += alto + 2.6;
  }
  return y + 1;
}

// --------------------------------------------------------------------------- página 1

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
  return partes.join('\n');
}

function cantidadPartida(c) {
  if (c.tipo === 'piso') return { cant: fmtNum(c.areaFacturable), un: 'm²' };
  if (c.tipo === 'cortina') return { cant: fmtNum(c.metrosLineales, 1), un: 'ml' };
  if (c.tipo === 'persiana') return { cant: fmtNum(c.areaFacturable), un: 'm²' };
  return { cant: fmtNum(c.cantidad, 0), un: 'pza' };
}

function tablaPartidas(doc, y, totales, yTope) {
  // Bordes derechos de cada columna numérica. Se dejan 32 mm por columna para que
  // un importe de siete cifras no invada la de al lado.
  const cols = {
    desc: M,           // texto, ajustado a ANCHO_DESC
    cantR: M + 100,    // 116
    un: M + 102,       // 118
    puR: M + 140,      // 156
    impR: A4.w - M,    // 194
  };
  const ANCHO_DESC = 82;

  titulo(doc, 'Partidas', M, y);
  y += 4;
  regla(doc, y, M, A4.w - M, C.tinta, 0.4);
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.4);
  tinta(doc, C.suave);
  doc.text('CONCEPTO', cols.desc, y, { charSpace: 0.4 });
  doc.text('CANT.', cols.cantR, y, { align: 'right', charSpace: 0.4 });
  doc.text('UN.', cols.un, y, { charSpace: 0.4 });
  doc.text('P. UNITARIO', cols.puR, y, { align: 'right', charSpace: 0.4 });
  doc.text('IMPORTE', cols.impR, y, { align: 'right', charSpace: 0.4 });
  y += 2.4;
  regla(doc, y);
  y += 4.6;

  /** Mide un bloque antes de dibujarlo. Misma tipografía que el dibujo real. */
  const preparar = (linea, idx, maxLineasDesc) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    const encabezado = doc.splitTextToSize(`${idx + 1}.  ${linea.producto.nombre}`, ANCHO_DESC)[0];

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.6);
    const desc = [];
    for (const l of descripcionPartida(linea).split('\n')) {
      desc.push(...doc.splitTextToSize(l, ANCHO_DESC - 5.5));
    }
    const cortada = desc.slice(0, maxLineasDesc);
    const importado = Boolean(linea.producto.importado);
    const alto = 3.5 + cortada.length * 2.7 + (importado ? 2.7 : 0) + 1.6;
    return { linea, idx, encabezado, desc: cortada, importado, alto };
  };

  const SEP = 4;                                   // regla + aire entre partidas
  const ALTO_AVISO = 5.5;                          // línea "+N partidas adicionales"

  /** Cuántas partidas caben con un nivel de detalle dado. */
  const acomodar = (maxLineasDesc) => {
    const out = [];
    let alto = 0;
    for (let i = 0; i < totales.lineas.length; i++) {
      const b = preparar(totales.lineas[i], i, maxLineasDesc);
      const sep = out.length ? SEP : 0;
      if (y + alto + sep + b.alto > yTope) break;
      alto += sep + b.alto;
      out.push(b);
    }
    return { bloques: out, usado: alto };
  };

  // Se prefiere mostrar todas las partidas con menos detalle antes que esconder alguna.
  let { bloques, usado } = acomodar(99);
  for (const nivel of [4, 3, 2, 1]) {
    if (bloques.length === totales.lineas.length) break;
    const intento = acomodar(nivel);
    if (intento.bloques.length > bloques.length) ({ bloques, usado } = intento);
  }

  // Si aun así algo se queda fuera, hay que reservar el renglón del aviso.
  if (bloques.length < totales.lineas.length && bloques.length > 1) {
    while (bloques.length > 1 && y + usado + ALTO_AVISO > yTope) {
      const b = bloques.pop();
      usado -= b.alto + SEP;
    }
  }

  bloques.forEach((b, i) => {
    const c = b.linea.calculo;
    const { cant, un } = cantidadPartida(c);
    const pu = c.importe / (parseFloat(cant.replace(/,/g, '')) || 1);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    tinta(doc, C.tinta);
    doc.text(b.encabezado, cols.desc, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.6);
    doc.text(cant, cols.cantR, y, { align: 'right' });
    doc.text(un, cols.un, y);
    doc.text(fmtMXN(pu), cols.puR, y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(fmtMXN(c.importe), cols.impR, y, { align: 'right' });

    y += 3.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.6);
    tinta(doc, C.suave);
    for (const w of b.desc) {
      doc.text(w, cols.desc + 5.5, y);
      y += 2.7;
    }

    if (b.importado) {
      tinta(doc, C.acento);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.2);
      doc.text(`IMPORTADO · ${String(b.linea.producto.origen || '').toUpperCase()}`,
        cols.desc + 5.5, y, { charSpace: 0.3 });
      y += 2.7;
    }

    y += 1.6;
    if (i < bloques.length - 1) { regla(doc, y, M, A4.w - M, C.linea, 0.15); y += 4; }
  });

  const ocultas = totales.lineas.length - bloques.length;
  if (ocultas > 0) {
    y += 2.4;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.8);
    tinta(doc, C.acento);
    const suma = totales.lineas.slice(bloques.length).reduce((s, l) => s + l.calculo.importe, 0);
    doc.text(
      `+ ${ocultas} partida(s) adicional(es) por ${fmtMXN(suma)}, ya incluidas en el total. Desglose completo a solicitud.`,
      M, y);
    y += 3;
  }

  return y;
}

function bloqueTotales(doc, y, totales, config) {
  const xEtiqueta = A4.w - M - 72;
  const xValor = A4.w - M;
  const cajaX = xEtiqueta - 4;
  const cajaW = (A4.w - M) - cajaX;

  regla(doc, y, cajaX, A4.w - M, C.tinta, 0.4);
  y += 5;

  const fila = (etiqueta, valor, { fuerte = false, color = C.tinta } = {}) => {
    doc.setFont('helvetica', fuerte ? 'bold' : 'normal');
    doc.setFontSize(fuerte ? 8.4 : 7.8);
    tinta(doc, fuerte ? C.tinta : C.suave);
    doc.text(etiqueta, xEtiqueta, y);
    tinta(doc, color);
    doc.setFont('helvetica', 'bold');
    doc.text(valor, xValor, y, { align: 'right' });
    y += 5;
  };

  fila('Subtotal', fmtMXN(totales.subtotal));
  if (totales.descuentoGlobal > 0) {
    fila(`Descuento ${fmtNum(totales.descuentoGlobalPct * 100, 0)}%`, `- ${fmtMXN(totales.descuentoGlobal)}`,
      { color: C.acento });
  }
  fila(`IVA ${fmtNum(totales.ivaPct * 100, 0)}%`, fmtMXN(totales.iva));

  y += 1;
  relleno(doc, C.tinta);
  doc.roundedRect(cajaX, y - 4, cajaW, 11.5, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.6);
  tinta(doc, [255, 255, 255]);
  doc.text('TOTAL', cajaX + 4.5, y + 3, { charSpace: 0.5 });
  doc.setFontSize(11);
  doc.text(fmtMXN(totales.total), cajaX + cajaW - 4.5, y + 3.4, { align: 'right' });
  y += 11.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  tinta(doc, C.suave);
  doc.text(`Precios en ${config.fiscal.moneda}. IVA desglosado.`, xValor, y, { align: 'right' });
  return y + 3;
}

function datosCotizacion(doc, y, cot, config, totales) {
  const fecha = new Date(cot.fecha);
  const vence = sumarDias(fecha, config.comercial.vigenciaDias);
  const entrega = sumarDias(fecha, totales.leadTimeMax + Math.ceil(
    (totales.lineas.reduce((s, l) => s + (l.calculo.areaBase ?? 0), 0)) / (config.logistica.diasInstalacionM2 || 25)));

  doc.setFont('times', 'normal');
  doc.setFontSize(24);
  tinta(doc, C.tinta);
  doc.text('Cotización', M, y + 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  tinta(doc, C.acento);
  doc.text(cot.folio || 'SIN FOLIO', M, y + 8, { charSpace: 0.6 });

  // Columna derecha: metadatos
  const xd = A4.w - M;
  const meta = [
    ['Fecha', fmtFecha(fecha)],
    ['Vigencia', `${fmtFecha(vence)} (${config.comercial.vigenciaDias} días)`],
    ['Entrega estimada', fmtFecha(entrega)],
    ['Atiende', cot.vendedor || '—'],
  ];
  doc.setFontSize(7);
  meta.forEach(([k, v], i) => {
    const yy = y - 2 + i * 4;
    doc.setFont('helvetica', 'normal');
    tinta(doc, C.suave);
    doc.text(k, xd - 54, yy, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    tinta(doc, C.tinta);
    doc.text(String(v), xd, yy, { align: 'right' });
  });

  y += 15;

  // Cliente
  relleno(doc, C.claro);
  doc.roundedRect(M, y, ANCHO, 17, 2, 2, 'F');
  titulo(doc, 'Cliente', M + 5, y + 5.5, 6.4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  tinta(doc, C.tinta);
  doc.text(cot.cliente.nombre || 'Cliente sin nombre', M + 5, y + 11);

  const detalle = [cot.cliente.contacto, cot.cliente.telefono, cot.cliente.email]
    .filter(Boolean).join('   ·   ');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  tinta(doc, C.suave);
  doc.text(detalle, M + 5, y + 14.6);

  if (cot.cliente.obra) {
    titulo(doc, 'Obra / proyecto', A4.w - M - 62, y + 5.5, 6.4);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.4);
    tinta(doc, C.tinta);
    const obra = doc.splitTextToSize(cot.cliente.obra, 60);
    doc.text(obra.slice(0, 2), A4.w - M - 62, y + 11);
  }

  return y + 23;
}

// --------------------------------------------------------------------------- página 2

function especificaciones(doc, y, totales, config) {
  titulo(doc, 'Especificaciones técnicas', M, y);
  y += 4;
  regla(doc, y, M, A4.w - M, C.tinta, 0.4);
  y += 5.5;

  const limite = 6;
  for (const linea of totales.lineas.slice(0, limite)) {
    const p = linea.producto;
    const c = linea.calculo;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    tinta(doc, C.tinta);
    doc.text(doc.splitTextToSize(p.nombre, 118)[0], M, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.6);
    tinta(doc, C.suave);
    doc.text(`SKU ${p.sku || p.id}`, A4.w - M, y, { align: 'right' });
    y += 3.6;

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

    doc.setFontSize(6.8);
    let col = 0;
    const anchoCol = ANCHO / 3;
    for (const [k, v] of specs) {
      const x = M + (col % 3) * anchoCol;
      const yy = y + Math.floor(col / 3) * 3.4;
      doc.setFont('helvetica', 'normal');
      tinta(doc, C.suave);
      doc.text(`${k}:`, x, yy);
      doc.setFont('helvetica', 'bold');
      tinta(doc, C.tinta);
      doc.text(String(v), x + doc.getTextWidth(`${k}: `) + 0.6, yy);
      col++;
    }
    y += Math.ceil(specs.length / 3) * 3.4 + 1;

    if (p.caracteristicas?.length) {
      let x = M;
      for (const car of p.caracteristicas.slice(0, 5)) {
        const w = pastilla(doc, car, x, y + 3.4);
        x += w;
        if (x > A4.w - M - 30) break;
      }
      y += 5.4;
    }
    y += 2.4;
    regla(doc, y, M, A4.w - M, C.linea, 0.15);
    y += 4;
  }

  if (totales.lineas.length > limite) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.6);
    tinta(doc, C.suave);
    doc.text(`Especificaciones de las ${totales.lineas.length - limite} partidas restantes disponibles a solicitud.`, M, y);
    y += 4;
  }
  return y;
}

function entregaYCondiciones(doc, y, totales, config, cot) {
  const fecha = new Date(cot.fecha);

  // --- Entrega ---
  titulo(doc, 'Tiempos de entrega', M, y);
  y += 4;
  regla(doc, y, M, A4.w - M, C.tinta, 0.4);
  y += 5;

  const filas = [];
  for (const l of totales.lineas.slice(0, 6)) {
    const dias = leadTimeProducto(l.producto, config);
    filas.push({
      nombre: l.producto.nombre,
      dias,
      origen: l.producto.importado ? `Importado · ${l.producto.origen}` : 'Existencia nacional',
      fecha: sumarDias(fecha, dias),
    });
  }

  doc.setFontSize(6.9);
  for (const f of filas) {
    doc.setFont('helvetica', 'normal');
    tinta(doc, C.tinta);
    doc.text(doc.splitTextToSize(f.nombre, 84)[0], M, y);
    tinta(doc, C.suave);
    doc.text(f.origen, M + 88, y);
    doc.setFont('helvetica', 'bold');
    tinta(doc, f.dias > 30 ? C.acento : C.tinta);
    doc.text(`${f.dias} días`, M + 138, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    tinta(doc, C.suave);
    doc.text(fmtFecha(f.fecha), A4.w - M, y, { align: 'right' });
    y += 3.5;
  }

  if (totales.hayImportados) {
    y += 1.5;
    relleno(doc, C.fondo);
    doc.roundedRect(M, y - 2.8, ANCHO, 8, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.4);
    tinta(doc, C.acento);
    doc.text('PRODUCTO DE IMPORTACIÓN', M + 4, y + 0.6, { charSpace: 0.3 });
    doc.setFont('helvetica', 'normal');
    tinta(doc, C.suave);
    doc.text(`Incluye ${config.logistica.diasTransito} días de tránsito marítimo y ${config.logistica.diasAduana} de despacho aduanal. El plazo corre a partir del anticipo.`,
      M + 4, y + 3.8);
    y += 8;
  }
  y += 4;

  // --- Pago ---
  titulo(doc, 'Esquema de pago', M, y);
  y += 4;
  regla(doc, y, M, A4.w - M, C.tinta, 0.4);
  y += 5.5;

  const anticipoPct = config.comercial.anticipoPct;
  const pagos = [
    [`Anticipo ${fmtNum(anticipoPct * 100, 0)}%`, 'A la firma. Libera fabricación y pedido de importación.', totales.anticipo],
    [`Saldo ${fmtNum((1 - anticipoPct) * 100, 0)}%`, 'Contra entrega de material en obra, previo a instalación.', totales.saldo],
  ];
  for (const [etq, nota, monto] of pagos) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.4);
    tinta(doc, C.tinta);
    doc.text(etq, M, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.6);
    tinta(doc, C.suave);
    doc.text(nota, M + 32, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    tinta(doc, C.tinta);
    doc.text(fmtMXN(monto), A4.w - M, y, { align: 'right' });
    y += 5;
  }
  y += 3;

  // --- Condiciones ---
  titulo(doc, 'Condiciones', M, y);
  y += 4;
  regla(doc, y, M, A4.w - M, C.tinta, 0.4);
  y += 4.5;

  const condiciones = [
    `Vigencia de ${config.comercial.vigenciaDias} días naturales. Los precios de producto importado están sujetos al tipo de cambio del día de la orden.`,
    'Las cantidades se calculan sobre las medidas proporcionadas por el cliente. El levantamiento en sitio puede modificarlas y se ajusta antes de la orden.',
    'El material se surte por caja completa. La merma indicada por partida ya está considerada en el importe.',
    'No incluye: retiro de piso existente, nivelación de sustrato, obra civil, trabajos eléctricos ni cancelería.',
    'El sitio debe entregarse en obra blanca terminada, nivelado con tolerancia de 3 mm en 2 m y con humedad de losa menor a 2.5%.',
    'La madera requiere 72 horas de aclimatación en obra antes de instalarse, en las condiciones finales de temperatura y humedad.',
    `Garantía de ${config.comercial.garantiaAnios} años en producto contra defecto de fabricación e instalación, con uso y mantenimiento conforme a la ficha técnica.`,
    'Variaciones naturales de veta, tono y nudo en madera no se consideran defecto.',
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.3);
  condiciones.forEach((c, i) => {
    tinta(doc, C.acento);
    doc.setFont('helvetica', 'bold');
    doc.text(`${String(i + 1).padStart(2, '0')}`, M, y);
    doc.setFont('helvetica', 'normal');
    tinta(doc, C.suave);
    for (const w of doc.splitTextToSize(c, ANCHO - 7)) {
      doc.text(w, M + 6, y);
      y += 2.7;
    }
    y += 0.7;
  });

  return y;
}

function firmas(doc, y, config, cot) {
  y = Math.max(y, A4.h - 38);
  const w = 74;
  regla(doc, y, M, M + w, C.tinta, 0.3);
  regla(doc, y, A4.w - M - w, A4.w - M, C.tinta, 0.3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  tinta(doc, C.suave);
  doc.text('Por el cliente · nombre y firma', M, y + 3.4);
  doc.text(`Por ${config.empresa.nombre}`, A4.w - M - w, y + 3.4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.4);
  tinta(doc, C.tinta);
  doc.text(cot.cliente.nombre || '', M, y - 2);
  doc.text(cot.vendedor || '', A4.w - M - w, y - 2);
  return y;
}

// --------------------------------------------------------------------------- API

export function generarPDF(cot, totales, config, { modo = 'descargar' } = {}) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({
    title: `Cotización ${cot.folio ?? ''} · ${cot.cliente.nombre ?? ''}`,
    subject: 'Cotización de suministro e instalación',
    author: config.empresa.nombre,
    creator: config.empresa.nombre,
  });

  // ---- Página 1
  let y = encabezado(doc, config);
  y = datosCotizacion(doc, y, cot, config, totales);

  // Espacio disponible para partidas: se reserva el bloque de totales y la gráfica.
  const reservaTotales = 36;
  const barrasGrafica = Object.values(totales.desgloseVenta).filter((v) => v > 0.5).length;
  const reservaGrafica = barrasGrafica ? 13 + barrasGrafica * 6.8 : 0;
  const yTopePartidas = A4.h - 20 - reservaTotales - reservaGrafica;

  y = tablaPartidas(doc, y, totales, yTopePartidas);
  y = Math.min(y + 3, yTopePartidas);
  y = grafica(doc, y, totales);
  y += 3;
  bloqueTotales(doc, Math.max(y, A4.h - 20 - reservaTotales), totales, config);
  pie(doc, config, 1, 2);

  // ---- Página 2
  doc.addPage();
  y = M + 6;
  doc.setFont('times', 'normal');
  doc.setFontSize(13);
  tinta(doc, C.tinta);
  doc.text('Anexo técnico y condiciones', M, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  tinta(doc, C.acento);
  doc.text(cot.folio || '', A4.w - M, y, { align: 'right', charSpace: 0.5 });
  y += 3;
  regla(doc, y, M, A4.w - M, C.tinta, 0.5);
  y += 7;

  y = especificaciones(doc, y, totales, config);
  y += 2;
  y = entregaYCondiciones(doc, y, totales, config, cot);
  firmas(doc, y + 6, config, cot);
  pie(doc, config, 2, 2);

  // Garantía dura: nunca más de 2 páginas.
  while (doc.getNumberOfPages() > 2) doc.deletePage(doc.getNumberOfPages());

  const nombre = `Cotizacion_${(cot.folio || 'SF').replace(/\W+/g, '-')}_${(cot.cliente.nombre || 'cliente').replace(/\W+/g, '-').slice(0, 28)}.pdf`;

  if (modo === 'blob') return { blob: doc.output('blob'), nombre };
  if (modo === 'url') return { url: doc.output('bloburl'), nombre };
  doc.save(nombre);
  return { nombre };
}
