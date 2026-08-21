// Motor de cálculo. Toda la lógica comercial vive aquí y en ninguna otra parte.
// Regla: las funciones son puras. Reciben {partida, producto, config} y devuelven un desglose.

import { redondearArriba } from './format.js';

/** Patrones de instalación de piso. La merma es el margen de desperdicio por corte. */
export const PATRONES = {
  recto:    { nombre: 'Recto / lineal',     merma: 0.07, multManoObra: 1.00,
              nota: 'Colocación paralela al muro más largo. El desperdicio mínimo.' },
  damero:   { nombre: 'Damero',             merma: 0.10, multManoObra: 1.15,
              nota: 'Cuadros alternados. Requiere replanteo previo.' },
  diagonal: { nombre: 'Diagonal 45°',       merma: 0.12, multManoObra: 1.25,
              nota: 'Amplía visualmente el espacio. Más corte en perímetro.' },
  espina:   { nombre: 'Espina de pescado',  merma: 0.18, multManoObra: 1.60,
              nota: 'Duela corta en 90°. Mano de obra especializada.' },
  chevron:  { nombre: 'Chevron',            merma: 0.20, multManoObra: 1.75,
              nota: 'Corte en punta a 45°. El patrón más costoso en material y obra.' },
};

/** Multiplicador de pliegue (fullness) para cortinería. */
export const PLIEGUES = {
  1.8: { nombre: 'Sencillo 1.8x',   nota: 'Económico. Poco cuerpo. No recomendado en hotelería.' },
  2.0: { nombre: 'Estándar 2.0x',   nota: 'Residencial. Buen balance entre costo y caída.' },
  2.5: { nombre: 'Hotelero 2.5x',   nota: 'Estándar en hotelería. Caída llena y uniforme.' },
  3.0: { nombre: 'Premium 3.0x',    nota: 'Suites y áreas públicas. Máximo cuerpo de tela.' },
};

export const CATEGORIAS = {
  'duela-ingenieria': { nombre: 'Duela de ingeniería', unidad: 'm2', familia: 'piso' },
  'spc':              { nombre: 'Piso SPC',            unidad: 'm2', familia: 'piso' },
  'laminado':         { nombre: 'Piso laminado',       unidad: 'm2', familia: 'piso' },
  'deck':             { nombre: 'Deck de exterior',    unidad: 'm2', familia: 'piso' },
  'porcelanato':      { nombre: 'Porcelanato',         unidad: 'm2', familia: 'piso' },
  'cortina':          { nombre: 'Cortinas',            unidad: 'ml', familia: 'cortina' },
  'persiana':         { nombre: 'Persianas',           unidad: 'm2', familia: 'persiana' },
  'accesorio':        { nombre: 'Accesorios',          unidad: 'pza', familia: 'accesorio' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const num = (v, def = 0) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : def;
};

/** Precio unitario del producto convertido a MXN. */
export function precioBaseMXN(producto, config) {
  const p = num(producto.precio);
  return producto.moneda === 'USD' ? p * num(config.fiscal.tipoCambio, 1) : p;
}

/**
 * Perímetro estimado a partir del área cuando el vendedor no lo midió.
 * Asume una planta rectangular con relación 1:1.6 y suma 15% por muros interiores.
 * Es una estimación: la UI la marca como tal y permite sobrescribirla.
 */
export function estimarPerimetro(areaM2) {
  if (areaM2 <= 0) return 0;
  const rel = 1.6;
  const lado = Math.sqrt(areaM2 / rel);
  return (2 * (lado + lado * rel)) * 1.15;
}

// ---------------------------------------------------------------------------
// Motor: PISOS (duela, SPC, laminado, deck, porcelanato)
// ---------------------------------------------------------------------------

/**
 * El punto donde pierden dinero: cotizan el área del plano y compran por caja.
 * Si el cliente pide 120 m2 y la caja rinde 2.16 m2, se facturan 60 cajas = 129.60 m2.
 * Esos 9.6 m2 salen del margen de Fernando si no se cotizan.
 */
export function calcularPiso({ partida, producto, config }) {
  const areaBase = num(partida.areaM2);
  const patron = PATRONES[partida.patron] ?? PATRONES.recto;
  const mermaPct = partida.mermaOverride != null ? num(partida.mermaOverride) : patron.merma;

  const areaConMerma = areaBase * (1 + mermaPct);
  const m2Caja = num(producto.m2PorCaja, 0);

  const cajas = m2Caja > 0 ? Math.ceil(areaConMerma / m2Caja) : 0;
  const areaFacturable = m2Caja > 0 ? cajas * m2Caja : areaConMerma;
  const excedenteCaja = areaFacturable - areaConMerma;

  const precioM2 = precioBaseMXN(producto, config);
  const material = areaFacturable * precioM2;

  // --- Accesorios ---
  const perimetro = partida.perimetroM != null && partida.perimetroM !== ''
    ? num(partida.perimetroM)
    : estimarPerimetro(areaBase);
  const perimetroEstimado = !(partida.perimetroM != null && partida.perimetroM !== '');

  const t = config.tarifas;
  const accesorios = [];

  if (partida.incluirZoclo) {
    const mlZoclo = perimetro * 0.92; // descuenta vanos de puerta
    accesorios.push({
      clave: 'zoclo',
      concepto: `Zoclo perimetral (${producto.especie || 'a juego'})`,
      cantidad: redondearArriba(mlZoclo, 0.5),
      unidad: 'ml',
      precioUnitario: num(t.zocloML),
      importe: redondearArriba(mlZoclo, 0.5) * num(t.zocloML),
    });
  }
  if (partida.incluirUnderlayment) {
    accesorios.push({
      clave: 'underlayment',
      concepto: 'Barrera de vapor / espuma acústica 3 mm',
      cantidad: areaBase,
      unidad: 'm²',
      precioUnitario: num(t.underlaymentM2),
      importe: areaBase * num(t.underlaymentM2),
    });
  }
  if (partida.incluirAdhesivo) {
    const cubetas = Math.ceil(areaBase / num(t.rendimientoAdhesivoM2, 18));
    accesorios.push({
      clave: 'adhesivo',
      concepto: 'Adhesivo de poliuretano (cubeta 20 kg)',
      cantidad: cubetas,
      unidad: 'cubeta',
      precioUnitario: num(t.adhesivoCubeta),
      importe: cubetas * num(t.adhesivoCubeta),
    });
  }
  if (num(partida.perfilesTransicion) > 0) {
    const pzas = num(partida.perfilesTransicion);
    accesorios.push({
      clave: 'transicion',
      concepto: 'Perfil de transición / reductor',
      cantidad: pzas,
      unidad: 'pza',
      precioUnitario: num(t.perfilTransicionPza),
      importe: pzas * num(t.perfilTransicionPza),
    });
  }
  if (producto.categoria === 'porcelanato' && partida.incluirBoquilla) {
    const kg = areaBase * 0.45;
    accesorios.push({
      clave: 'boquilla',
      concepto: 'Boquilla epóxica antihongos',
      cantidad: redondearArriba(kg, 1),
      unidad: 'kg',
      precioUnitario: num(t.boquillaKg),
      importe: redondearArriba(kg, 1) * num(t.boquillaKg),
    });
  }

  const totalAccesorios = accesorios.reduce((s, a) => s + a.importe, 0);

  // --- Mano de obra ---
  const tarifaBase = num(t.instalacion[producto.categoria], 0);
  const tarifaInstalacion = tarifaBase * patron.multManoObra;
  const manoObra = partida.incluirInstalacion ? areaBase * tarifaInstalacion : 0;

  return {
    tipo: 'piso',
    areaBase,
    mermaPct,
    areaConMerma,
    m2Caja,
    cajas,
    areaFacturable,
    excedenteCaja,
    precioM2,
    material,
    perimetro,
    perimetroEstimado,
    accesorios,
    totalAccesorios,
    tarifaInstalacion,
    manoObra,
    costoDirecto: material + totalAccesorios + manoObra,
    patronNombre: patron.nombre,
  };
}

// ---------------------------------------------------------------------------
// Motor: CORTINAS
// ---------------------------------------------------------------------------

/**
 * Dos formas de cortar la tela y el vendedor casi siempre elige mal:
 *  - "Al ancho" (railroaded): el rollo es más alto que la ventana, se corre de lado.
 *    Metros lineales = ancho requerido. Sin costuras verticales. Estándar en hotelería.
 *  - "Por paños": el rollo es angosto, se cortan tiras verticales y se unen.
 *    Metros lineales = paños x (alto + dobladillos). Siempre consume más tela.
 * El motor elige automáticamente y explica por qué.
 */
export function calcularCortina({ partida, producto, config }) {
  const ancho = num(partida.anchoM);
  const alto = num(partida.altoM);
  const cantidad = Math.max(1, num(partida.cantidad, 1));
  const pliegue = num(partida.pliegue, 2.5);

  const t = config.tarifas;
  const dobladillos = num(t.dobladilloM, 0.3);
  const anchoRollo = num(producto.anchoRolloM, 1.4);

  const anchoTelaRequerido = ancho * pliegue;
  // Si el rollo cubre la altura terminada, se corre de lado y no hay costuras.
  const puedeAlAncho = anchoRollo >= alto + dobladillos;

  let metrosLineales, panos, metodo, metodoNota;
  if (puedeAlAncho) {
    metodo = 'al ancho';
    metodoNota = `Rollo de ${anchoRollo.toFixed(2)} m cubre la caída de ${alto.toFixed(2)} m. Sin costuras verticales.`;
    panos = 1;
    metrosLineales = anchoTelaRequerido * 1.06; // 6% por escuadre y traslape
  } else {
    metodo = 'por paños';
    panos = Math.ceil(anchoTelaRequerido / anchoRollo);
    metodoNota = `Rollo de ${anchoRollo.toFixed(2)} m no cubre la caída. Se unen ${panos} paños verticales.`;
    metrosLineales = panos * (alto + dobladillos);
  }
  metrosLineales = redondearArriba(metrosLineales, 0.1) * cantidad;

  const precioML = precioBaseMXN(producto, config);
  const material = metrosLineales * precioML;

  const confeccion = metrosLineales * num(t.confeccionML);

  const accesorios = [];
  if (partida.incluirRiel) {
    const mlRiel = redondearArriba(ancho * 1.1, 0.1) * cantidad;
    const precioRiel = partida.rielMotorizado ? num(t.rielMotorizadoML) : num(t.rielML);
    accesorios.push({
      clave: 'riel',
      concepto: partida.rielMotorizado
        ? 'Riel motorizado con control (incluye programación)'
        : 'Riel de aluminio reforzado con soportes',
      cantidad: mlRiel,
      unidad: 'ml',
      precioUnitario: precioRiel,
      importe: mlRiel * precioRiel,
    });
  }
  if (partida.incluirForro) {
    const mlForro = metrosLineales;
    accesorios.push({
      clave: 'forro',
      concepto: 'Forro térmico / entretela',
      cantidad: mlForro,
      unidad: 'ml',
      precioUnitario: num(t.forroML),
      importe: mlForro * num(t.forroML),
    });
  }
  const totalAccesorios = accesorios.reduce((s, a) => s + a.importe, 0);

  const mlInstalacion = ancho * cantidad;
  const manoObraCalc = mlInstalacion * num(t.instalacionCortinaML);
  const manoObra = partida.incluirInstalacion
    ? Math.max(manoObraCalc, num(t.minimoInstalacionCortina))
    : 0;

  return {
    tipo: 'cortina',
    ancho, alto, cantidad, pliegue,
    anchoRollo,
    anchoTelaRequerido,
    metodo, metodoNota, panos,
    metrosLineales,
    precioML,
    material,
    confeccion,
    accesorios,
    totalAccesorios,
    manoObra,
    costoDirecto: material + confeccion + totalAccesorios + manoObra,
  };
}

// ---------------------------------------------------------------------------
// Motor: PERSIANAS
// ---------------------------------------------------------------------------

/** Las persianas se facturan por área con mínimo por pieza. Es el error de cotización #1. */
export function calcularPersiana({ partida, producto, config }) {
  const ancho = num(partida.anchoM);
  const alto = num(partida.altoM);
  const cantidad = Math.max(1, num(partida.cantidad, 1));

  const areaReal = ancho * alto;
  const areaMinima = num(config.tarifas.areaMinimaPersiana, 1.0);
  const areaFacturableUnitaria = Math.max(areaReal, areaMinima);
  const aplicaMinimo = areaReal < areaMinima;
  const areaFacturable = areaFacturableUnitaria * cantidad;

  const precioM2 = precioBaseMXN(producto, config);
  const material = areaFacturable * precioM2;

  const accesorios = [];
  if (partida.motorizada) {
    accesorios.push({
      clave: 'motor',
      concepto: 'Motorización con control remoto por pieza',
      cantidad,
      unidad: 'pza',
      precioUnitario: num(config.tarifas.motorPersianaPza),
      importe: cantidad * num(config.tarifas.motorPersianaPza),
    });
  }
  const totalAccesorios = accesorios.reduce((s, a) => s + a.importe, 0);

  const manoObra = partida.incluirInstalacion
    ? Math.max(cantidad * num(config.tarifas.instalacionPersianaPza),
               num(config.tarifas.minimoInstalacionCortina))
    : 0;

  return {
    tipo: 'persiana',
    ancho, alto, cantidad,
    areaReal, areaMinima, aplicaMinimo,
    areaFacturableUnitaria, areaFacturable,
    precioM2,
    material,
    accesorios,
    totalAccesorios,
    manoObra,
    costoDirecto: material + totalAccesorios + manoObra,
  };
}

// ---------------------------------------------------------------------------
// Motor: ACCESORIO SUELTO
// ---------------------------------------------------------------------------

export function calcularAccesorio({ partida, producto, config }) {
  const cantidad = Math.max(0, num(partida.cantidad, 1));
  const precioUnitario = precioBaseMXN(producto, config);
  const material = cantidad * precioUnitario;
  return {
    tipo: 'accesorio',
    cantidad,
    precioUnitario,
    material,
    accesorios: [],
    totalAccesorios: 0,
    manoObra: 0,
    costoDirecto: material,
  };
}

// ---------------------------------------------------------------------------
// Despachador
// ---------------------------------------------------------------------------

export function calcularPartida(partida, producto, config) {
  if (!producto) return null;
  const familia = CATEGORIAS[producto.categoria]?.familia ?? 'piso';
  const args = { partida, producto, config };

  let base;
  if (familia === 'cortina') base = calcularCortina(args);
  else if (familia === 'persiana') base = calcularPersiana(args);
  else if (familia === 'accesorio') base = calcularAccesorio(args);
  else base = calcularPiso(args);

  // --- Margen ---
  // Margen bruto real: precio = costo / (1 - margen). No es lo mismo que markup.
  // Un "35% de margen" aplicado como markup (costo x 1.35) deja 25.9% real.
  const margen = partida.margenOverride != null
    ? num(partida.margenOverride)
    : num(config.comercial.margenDefault, 0.35);
  const margenSeguro = Math.min(Math.max(margen, 0), 0.9);

  const costoDirecto = base.costoDirecto;
  const precioAntesDescuento = margenSeguro > 0 ? costoDirecto / (1 - margenSeguro) : costoDirecto;
  const utilidadBruta = precioAntesDescuento - costoDirecto;
  const markupEquivalente = costoDirecto > 0 ? precioAntesDescuento / costoDirecto - 1 : 0;

  const descuentoPct = Math.min(Math.max(num(partida.descuentoPct, 0), 0), 0.5);
  const descuento = precioAntesDescuento * descuentoPct;
  const importe = precioAntesDescuento - descuento;

  // Margen efectivo después del descuento: el número que importa.
  const utilidadNeta = importe - costoDirecto;
  const margenEfectivo = importe > 0 ? utilidadNeta / importe : 0;

  return {
    ...base,
    margen: margenSeguro,
    markupEquivalente,
    costoDirecto,
    precioAntesDescuento,
    descuentoPct,
    descuento,
    importe,
    utilidadBruta,
    utilidadNeta,
    margenEfectivo,
  };
}

// ---------------------------------------------------------------------------
// Totales de la cotización
// ---------------------------------------------------------------------------

export function calcularTotales(partidas, catalogo, config) {
  const lineas = partidas.map((p) => {
    const producto = catalogo.find((x) => x.id === p.productoId);
    return { partida: p, producto, calculo: calcularPartida(p, producto, config) };
  }).filter((l) => l.calculo);

  const subtotal = lineas.reduce((s, l) => s + l.calculo.importe, 0);
  const costoTotal = lineas.reduce((s, l) => s + l.calculo.costoDirecto, 0);

  const descuentoGlobalPct = Math.min(Math.max(config._descuentoGlobal ?? 0, 0), 0.5);
  const descuentoGlobal = subtotal * descuentoGlobalPct;
  const baseGravable = subtotal - descuentoGlobal;

  const ivaPct = num(config.fiscal.iva, 0.16);
  const iva = baseGravable * ivaPct;
  const total = baseGravable + iva;

  const utilidad = baseGravable - costoTotal;
  const margenGlobal = baseGravable > 0 ? utilidad / baseGravable : 0;

  // Desglose para la gráfica del PDF.
  const desglose = {
    material: lineas.reduce((s, l) => s + (l.calculo.material ?? 0), 0),
    confeccion: lineas.reduce((s, l) => s + (l.calculo.confeccion ?? 0), 0),
    accesorios: lineas.reduce((s, l) => s + (l.calculo.totalAccesorios ?? 0), 0),
    manoObra: lineas.reduce((s, l) => s + (l.calculo.manoObra ?? 0), 0),
  };
  // Se reparte la utilidad proporcionalmente para que la gráfica sume el subtotal.
  const sumaCostos = desglose.material + desglose.confeccion + desglose.accesorios + desglose.manoObra;
  const factor = sumaCostos > 0 ? baseGravable / sumaCostos : 0;
  const desgloseVenta = {
    material: desglose.material * factor,
    confeccion: desglose.confeccion * factor,
    accesorios: desglose.accesorios * factor,
    manoObra: desglose.manoObra * factor,
  };

  // Tiempo de entrega: manda la partida más lenta.
  const leadTimes = lineas.map((l) => leadTimeProducto(l.producto, config));
  const leadTimeMax = leadTimes.length ? Math.max(...leadTimes) : 0;
  const hayImportados = lineas.some((l) => l.producto?.importado);

  return {
    lineas, subtotal, costoTotal,
    descuentoGlobalPct, descuentoGlobal, baseGravable,
    ivaPct, iva, total,
    utilidad, margenGlobal,
    desglose, desgloseVenta,
    leadTimeMax, hayImportados,
    anticipo: total * num(config.comercial.anticipoPct, 0.6),
    saldo: total * (1 - num(config.comercial.anticipoPct, 0.6)),
  };
}

/** Días naturales hasta tener el material en obra. */
export function leadTimeProducto(producto, config) {
  if (!producto) return 0;
  const base = num(producto.leadTimeDias, 0);
  if (!producto.importado) return base;
  return base + num(config.logistica.diasTransito, 35) + num(config.logistica.diasAduana, 7);
}
