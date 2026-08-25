// Motor del reporte mensual de ventas. Funciones puras: reciben ventas y
// devuelven agregados. Nada de DOM aquí.
//
// La distinción que pidió la dirección: cotizar no es vender.
// Una cotización enviada no entra a este reporte. Entra cuando hay venta
// registrada, y se marca cobrada cuando llegó el anticipo.

import { uid } from './format.js';

const num = (v, def = 0) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : def;
};

const limpio = (n, dec = 2) => Number(Number(n).toFixed(dec));

/**
 * Las familias con las que la dirección lee el mes.
 * Salen de lo que vende la empresa hoy, no de una taxonomía teórica.
 */
export const CATEGORIAS_VENTA = {
  spc:           { nombre: 'Piso SPC',                  corto: 'SPC' },
  madera:        { nombre: 'Piso de madera',            corto: 'Madera' },
  laminado:      { nombre: 'Piso laminado',             corto: 'Laminado' },
  porcelanato:   { nombre: 'Porcelanato',               corto: 'Porcelanato' },
  ceramica:      { nombre: 'Cerámica',                  corto: 'Cerámica' },
  deck:          { nombre: 'Deck de exterior',          corto: 'Deck' },
  alfombra:      { nombre: 'Alfombra y tela',           corto: 'Alfombra' },
  mantenimiento: { nombre: 'Mantenimiento y renovación', corto: 'Mantenimiento' },
  cortina:       { nombre: 'Cortinas',                  corto: 'Cortinas' },
  persiana:      { nombre: 'Persianas',                 corto: 'Persianas' },
  tapiceria:     { nombre: 'Tapicería',                 corto: 'Tapicería' },
  muebles:       { nombre: 'Muebles de baño y alberca', corto: 'Muebles' },
  follaje:       { nombre: 'Follaje sintético',         corto: 'Follaje' },
  otro:          { nombre: 'Otro',                      corto: 'Otro' },
};

export const nombreCategoria = (c) => CATEGORIAS_VENTA[c]?.nombre ?? 'Otro';

/**
 * El semáforo que pidió la dirección. Una cotización enviada no es una venta,
 * y el color tiene que decirlo antes de que alguien lea la cifra.
 *
 *   ámbar    cotizada, sin un peso encima
 *   verde    llegó el anticipo, el proyecto arranca
 *   petróleo liquidada, ya no debe nada
 *   gris     cancelada, no suma al mes
 */
export const ESTADOS = {
  cotizada: {
    nombre: 'Cotizada', corto: 'Cotizada', tono: 'warn',
    nota: 'Enviada al cliente y sin pago. Todavía no es venta.',
  },
  anticipada: {
    nombre: 'Anticipada', corto: 'Anticipo', tono: 'ok',
    nota: 'Entró el anticipo. Ya se puede levantar la requisición.',
  },
  liquidada: {
    nombre: 'Liquidada', corto: 'Liquidada', tono: 'cerrado',
    nota: 'Pagada al cien por ciento. No queda saldo.',
  },
  cancelada: {
    nombre: 'Cancelada', corto: 'Cancelada', tono: 'muerto',
    nota: 'No se concretó. No cuenta para el mes ni para el asesor.',
  },
};

export function estadoVenta(v) {
  if (v?.cancelada) return 'cancelada';
  const total = totalVenta(v);
  const pagado = num(v?.pagado);
  // Medio peso de tolerancia: los redondeos no deben dejar una obra en ámbar.
  if (total > 0 && pagado >= total - 0.5) return 'liquidada';
  const esperado = anticipoEsperado(v);
  if (esperado > 0 && pagado >= esperado - 0.5) return 'anticipada';
  return 'cotizada';
}

export const tonoEstado = (v) => ESTADOS[estadoVenta(v)].tono;
export const nombreEstado = (v) => ESTADOS[estadoVenta(v)].nombre;

// --------------------------------------------------------------------------- modelo

export const lineaVaciaVenta = () => ({
  id: uid('lv'),
  apartado: '',      // el cajón del catálogo del proveedor
  proveedor: '',
  linea: '',         // con línea y color reconocen el producto, no con el SKU
  color: '',
  categoria: 'spc',
  cantidad: '',
  unidad: 'm2',
  precioUnit: '',
});

export const ventaVacia = (vendedor = '', sucursal = '') => ({
  id: uid('vta'),
  folio: '',
  fecha: new Date().toISOString().slice(0, 10),
  vendedor,
  sucursal,
  cliente: '',
  obra: '',
  lineas: [lineaVaciaVenta()],
  anticipoPct: 0.8,
  pagado: 0,
  cancelada: false,
  comprobante: '',
  carpetaDrive: '',
  pasos: {},
  notas: '',
});

export const importeLinea = (l) => limpio(num(l.cantidad) * num(l.precioUnit));

export const totalVenta = (v) =>
  limpio((v?.lineas ?? []).reduce((a, l) => a + importeLinea(l), 0));

/** Lo que debió entrar como anticipo para arrancar el proyecto. */
export const anticipoEsperado = (v) => limpio(totalVenta(v) * num(v?.anticipoPct, 0.8));

export const estaCobrada = (v) => num(v?.pagado) >= anticipoEsperado(v) - 0.5;

export const mesDe = (fecha) => String(fecha ?? '').slice(0, 7);

export const mesActual = () => new Date().toISOString().slice(0, 7);

export function etiquetaMes(mes) {
  const [a, m] = String(mes ?? '').split('-').map(Number);
  if (!a || !m) return String(mes ?? '');
  const d = new Date(a, m - 1, 1);
  const s = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Meses con al menos una venta, del más reciente al más viejo. */
export function mesesConVentas(ventas = []) {
  const set = new Set(ventas.map((v) => mesDe(v.fecha)).filter(Boolean));
  set.add(mesActual());
  return Array.from(set).sort().reverse();
}

// --------------------------------------------------------------------------- agregados

const pct = (parte, total) => (total > 0 ? limpio(parte / total, 6) : 0);

/**
 * El reporte que pidió la dirección: qué vendió cada quien, de qué producto,
 * en qué proporción, y cuánto de eso ya está cobrado.
 */
export function resumenVentas(ventas = [], { mes = null, vendedor = null, sucursal = null } = {}) {
  const delMes = ventas.filter((v) => {
    if (mes && mesDe(v.fecha) !== mes) return false;
    if (vendedor && v.vendedor !== vendedor) return false;
    if (sucursal && v.sucursal !== sucursal) return false;
    return true;
  });

  // Una cotización cancelada no suma al mes ni al asesor, pero se cuenta aparte:
  // saber cuánto se cotizó y no se cerró es la mitad del valor del reporte.
  const canceladas = delMes.filter((v) => estadoVenta(v) === 'cancelada');
  const filtradas = delMes.filter((v) => estadoVenta(v) !== 'cancelada');

  const total = limpio(filtradas.reduce((a, v) => a + totalVenta(v), 0));
  const cobrado = limpio(filtradas.reduce((a, v) => a + num(v.pagado), 0));

  const porVendedor = new Map();
  const porCategoria = new Map();
  const porLinea = new Map();
  const porSucursal = new Map();
  const porEstado = { cotizada: 0, anticipada: 0, liquidada: 0, cancelada: 0 };

  for (const v of canceladas) porEstado.cancelada += totalVenta(v);

  for (const v of filtradas) {
    const t = totalVenta(v);
    const nombre = (v.vendedor || '').trim() || 'Sin asignar';
    const tienda = (v.sucursal || '').trim() || 'Sin sucursal';

    porEstado[estadoVenta(v)] += t;

    const suc = porSucursal.get(tienda) ?? { sucursal: tienda, total: 0, cobrado: 0, cuenta: 0, asesores: new Set() };
    suc.total = limpio(suc.total + t);
    suc.cobrado = limpio(suc.cobrado + num(v.pagado));
    suc.cuenta += 1;
    suc.asesores.add(nombre);
    porSucursal.set(tienda, suc);

    const acc = porVendedor.get(nombre) ?? {
      vendedor: nombre, sucursal: tienda, total: 0, cobrado: 0, cuenta: 0,
      categorias: new Map(),
    };
    acc.total += t;
    acc.cobrado += num(v.pagado);
    acc.cuenta += 1;

    for (const l of v.lineas ?? []) {
      const imp = importeLinea(l);
      if (!imp) continue;
      const cat = CATEGORIAS_VENTA[l.categoria] ? l.categoria : 'otro';

      acc.categorias.set(cat, limpio((acc.categorias.get(cat) ?? 0) + imp));

      const g = porCategoria.get(cat) ?? { categoria: cat, total: 0, cantidad: 0 };
      g.total = limpio(g.total + imp);
      g.cantidad = limpio(g.cantidad + num(l.cantidad));
      porCategoria.set(cat, g);

      // Línea + color es como el equipo identifica el producto en la bodega.
      const clave = `${(l.linea || '').trim()}|${(l.color || '').trim()}`;
      if (clave !== '|') {
        const p = porLinea.get(clave) ?? {
          linea: (l.linea || '').trim(), color: (l.color || '').trim(),
          proveedor: (l.proveedor || '').trim(), categoria: cat,
          total: 0, cantidad: 0,
        };
        p.total = limpio(p.total + imp);
        p.cantidad = limpio(p.cantidad + num(l.cantidad));
        porLinea.set(clave, p);
      }
    }

    porVendedor.set(nombre, acc);
  }

  const vendedores = Array.from(porVendedor.values())
    .map((a) => ({
      vendedor: a.vendedor,
      sucursal: a.sucursal,
      total: limpio(a.total),
      cobrado: limpio(a.cobrado),
      cuenta: a.cuenta,
      ticket: a.cuenta ? limpio(a.total / a.cuenta) : 0,
      participacion: pct(a.total, total),
      categorias: Array.from(a.categorias.entries())
        .map(([categoria, monto]) => ({
          categoria, total: monto, participacion: pct(monto, a.total),
        }))
        .sort((x, y) => y.total - x.total),
    }))
    .sort((a, b) => b.total - a.total);

  const categorias = Array.from(porCategoria.values())
    .map((g) => ({ ...g, participacion: pct(g.total, total) }))
    .sort((a, b) => b.total - a.total);

  const lineas = Array.from(porLinea.values()).sort((a, b) => b.total - a.total);

  const sucursales = Array.from(porSucursal.values())
    .map((s) => ({
      sucursal: s.sucursal,
      total: s.total,
      cobrado: s.cobrado,
      cuenta: s.cuenta,
      asesores: s.asesores.size,
      participacion: pct(s.total, total),
      ticket: s.cuenta ? limpio(s.total / s.cuenta) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    mes,
    ventas: filtradas,
    canceladas,
    cuenta: filtradas.length,
    total,
    cobrado,
    porCobrar: limpio(Math.max(0, total - cobrado)),
    ticket: filtradas.length ? limpio(total / filtradas.length) : 0,
    vendedores,
    sucursales,
    categorias,
    lineas,
    // Cuánto del mes está en cada peldaño del semáforo.
    estados: Object.fromEntries(Object.entries(porEstado).map(([k, n]) => [k, limpio(n)])),
  };
}

/** Variación contra el mes anterior, para el encabezado del reporte. */
export function compararMes(ventas, mes) {
  const [a, m] = String(mes).split('-').map(Number);
  if (!a || !m) return null;
  const prev = new Date(a, m - 2, 1);
  const mesPrevio = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;

  const hoy = resumenVentas(ventas, { mes }).total;
  const antes = resumenVentas(ventas, { mes: mesPrevio }).total;
  return {
    mesPrevio,
    total: hoy,
    totalPrevio: antes,
    variacion: antes > 0 ? limpio((hoy - antes) / antes, 4) : null,
  };
}

// --------------------------------------------------------------------------- permisos

/**
 * Control por confianza, no por seguridad: no hay contraseñas ni servidor.
 * Sirve para que un asesor no vea por accidente las cifras de sus compañeros,
 * no para impedir que alguien decidido las vea. Está dicho así en la pantalla.
 */
export function rolDe(nombre, equipo = []) {
  const n = String(nombre ?? '').trim().toLowerCase();
  if (!n) return 'invitado';
  const p = equipo.find((x) => String(x.nombre ?? '').trim().toLowerCase() === n);
  return p?.rol ?? 'vendedor';
}

export const esAdmin = (nombre, equipo = []) => rolDe(nombre, equipo) === 'admin';

const buscarPersona = (nombre, equipo = []) => {
  const n = String(nombre ?? '').trim().toLowerCase();
  return equipo.find((x) => String(x.nombre ?? '').trim().toLowerCase() === n) ?? null;
};

/** La tienda a la que pertenece una persona. La venta la hereda al registrarse. */
export const sucursalDe = (nombre, equipo = []) => buscarPersona(nombre, equipo)?.sucursal ?? '';

/** Quién puede aparecer como asesor de una venta. La dirección también vende. */
export const asesoresDe = (equipo = []) =>
  equipo.filter((p) => p.vende !== false && String(p.nombre ?? '').trim());

/** Cuántos asesores tiene cada tienda, para ver de un vistazo qué falta capturar. */
export function plantillaPorSucursal(sucursales = [], equipo = []) {
  return sucursales.map((s) => ({
    sucursal: s,
    asesores: asesoresDe(equipo).filter((p) => p.sucursal === s).map((p) => p.nombre),
  }));
}

/** Lo que cada quien puede ver: el admin todo, el asesor lo suyo. */
export function ventasVisibles(ventas, usuario, equipo) {
  if (esAdmin(usuario, equipo)) return ventas;
  const n = String(usuario ?? '').trim().toLowerCase();
  if (!n) return [];
  return ventas.filter((v) => String(v.vendedor ?? '').trim().toLowerCase() === n);
}

// --------------------------------------------------------------------------- carpeta

/**
 * El orden con el que arranca un proyecto, tal como lo opera la empresa.
 * La carpeta de Drive de cada obra lleva estos documentos, en este orden.
 */
export const PASOS_PROYECTO = [
  { clave: 'presupuesto', nombre: 'Presupuesto', responsable: 'Asesor de ventas',
    nota: 'La cotización aprobada por el cliente. Sale del cotizador.' },
  { clave: 'pago', nombre: 'Pago del anticipo', responsable: 'Casilda',
    nota: 'El comprobante que manda el cliente por WhatsApp es el respaldo del pago.' },
  { clave: 'requisicion', nombre: 'Requisición', responsable: 'Asesor de ventas',
    nota: 'Qué material y cuánto. Hoy es un Excel; migra a hoja de cálculo compartida.' },
  { clave: 'orden', nombre: 'Orden de compra', responsable: 'Aarón',
    nota: 'Se genera desde la requisición. Con la orden en mano ya se puede pedir el material.',
    liberaCompra: true },
  { clave: 'instalacion', nombre: 'Instalación del material', responsable: 'Instalación',
    nota: 'Incluye cubetas de pegamento y consumibles.' },
];

export function avanceProyecto(venta) {
  const hechos = venta?.pasos ?? {};
  const listos = PASOS_PROYECTO.filter((p) => hechos[p.clave]).length;
  return {
    listos,
    total: PASOS_PROYECTO.length,
    pct: pct(listos, PASOS_PROYECTO.length),
    // El disparador de la operación: con la orden de compra, Aarón ya pide material.
    puedePedirMaterial: PASOS_PROYECTO.filter((p) => p.liberaCompra).every((p) => hechos[p.clave]),
  };
}
