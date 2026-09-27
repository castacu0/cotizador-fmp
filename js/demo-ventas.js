// Ventas de ejemplo. Sirve para la demostración: enseña cómo se ve el
// reporte una vez conectado a las listas reales de los proveedores, con
// precios distintos por línea, color y familia en lugar de un solo número
// repetido. Se carga a mano desde el reporte, nunca al arrancar.

import * as S from './state.js';
import { ventaVacia, lineaVaciaVenta } from './ventas.js';

const linea = (datos) => ({ ...lineaVaciaVenta(), ...datos });

// Cada renglón imita una hoja de precios real: apartado, proveedor, línea,
// color y el precio que traería esa línea en la base de datos del proveedor.
// Los precios cubren desde 250 hasta 8,200 pesos, con unidades distintas
// (m², ml, pieza), para que el mes no se vea como una sola cifra repetida.
const A = {
  robleNordico:  linea({ apartado: 'Pisos', proveedor: 'Wanhua', linea: 'Roble Nórdico', color: 'Nogal', categoria: 'spc', cantidad: 68, precioUnit: 640, unidad: 'm2' }),
  capture:       linea({ apartado: 'Pisos', proveedor: 'Quick-Step', linea: 'Capture', color: 'Roble Arena', categoria: 'laminado', cantidad: 42, precioUnit: 480, unidad: 'm2' }),
  encinoPremium: linea({ apartado: 'Pisos', proveedor: 'Havanna', linea: 'Duela Encino Premium Aceitado', color: 'Miel natural', categoria: 'madera', cantidad: 96, precioUnit: 1690, unidad: 'm2' }),
  marmoElite:    linea({ apartado: 'Pisos', proveedor: 'Porcelanite', linea: 'Marmo Elite', color: 'Calacatta', categoria: 'porcelanato', cantidad: 54, precioUnit: 890, unidad: 'm2' }),
  cottoRustico:  linea({ apartado: 'Pisos', proveedor: 'Interceramic', linea: 'Cotto Rústico', color: 'Terracota', categoria: 'ceramica', cantidad: 38, precioUnit: 420, unidad: 'm2' }),
  ipeSelect:     linea({ apartado: 'Exterior', proveedor: 'Deckard', linea: 'Ipe Select', color: 'Natural', categoria: 'deck', cantidad: 30, precioUnit: 2150, unidad: 'm2' }),
  blackoutHot:   linea({ apartado: 'Cortinería', proveedor: 'Hunter Douglas', linea: 'Blackout Hotelero', color: 'Grafito', categoria: 'cortina', cantidad: 22, precioUnit: 780, unidad: 'ml' }),
  screen3:       linea({ apartado: 'Cortinería', proveedor: 'Mecho Shade', linea: 'Screen 3%', color: 'Perla', categoria: 'persiana', cantidad: 16, precioUnit: 1120, unidad: 'm2' }),
  linoBelga:     linea({ apartado: 'Tapicería', proveedor: 'Kravet', linea: 'Lino Belga', color: 'Arena', categoria: 'tapiceria', cantidad: 12, precioUnit: 940, unidad: 'm2' }),
  muebleBano:    linea({ apartado: 'Baño', proveedor: 'Roca', linea: 'Inspira Round', color: 'Blanco', categoria: 'muebles', cantidad: 3, precioUnit: 8200, unidad: 'pza' }),
  pulido:        linea({ apartado: 'Servicio', proveedor: 'Interno', linea: 'Pulido y sellado', color: '—', categoria: 'mantenimiento', cantidad: 60, precioUnit: 250, unidad: 'm2' }),
  follaje:       linea({ apartado: 'Exterior', proveedor: 'Vondom', linea: 'Follaje sintético Boj', color: 'Verde', categoria: 'follaje', cantidad: 40, precioUnit: 620, unidad: 'm2' }),
};

// Ocho ventas repartidas en las tres tiendas y en distintos peldaños del
// semáforo, para que la demostración enseñe cotizada, anticipada, liquidada
// y cancelada al mismo tiempo, no solo el color más bonito.
const OBRAS = [
  { dia: 3,  vendedor: 'Fernando',      sucursal: 'Santa Fe',       cliente: 'Residencial Bosques',      obra: 'Casa Bosques 14, planta baja',        lineas: ['robleNordico', 'marmoElite'], pagadoPct: 1 },
  { dia: 5,  vendedor: 'Sebastián',     sucursal: 'Pedregal',       cliente: 'Torre Reforma 220',          obra: 'Depto. 8B, sala y comedor',            lineas: ['capture', 'blackoutHot'],     pagadoPct: 0.8 },
  { dia: 8,  vendedor: 'Andrea Reyes',  sucursal: 'Tercera tienda', cliente: 'Club de Golf Malinalco',     obra: 'Salón principal',                      lineas: ['marmoElite', 'screen3'],      pagadoPct: 0 },
  { dia: 11, vendedor: 'Fernando',      sucursal: 'Santa Fe',       cliente: 'Oficinas Insurgentes Sur',    obra: 'Piso 6, área común',                   lineas: ['cottoRustico'],                pagadoPct: 0.8 },
  { dia: 14, vendedor: 'Diego Salas',   sucursal: 'Tercera tienda', cliente: 'Casa Valle Alto',             obra: 'Terraza y jardín posterior',           lineas: ['ipeSelect', 'follaje'],        pagadoPct: 1 },
  { dia: 16, vendedor: 'Sebastián',     sucursal: 'Pedregal',       cliente: 'Consultorio Dr. Nava',        obra: 'Recepción y sala de espera',           lineas: ['linoBelga'],                    pagadoPct: 0 },
  { dia: 19, vendedor: 'Mariana Ibarra',sucursal: 'Santa Fe',       cliente: 'Depto. Polanco 9B',           obra: 'Recámara principal',                   lineas: ['encinoPremium'],                pagadoPct: 0.8 },
  { dia: 22, vendedor: 'Fernando',      sucursal: 'Santa Fe',       cliente: 'Casa Tepoztlán',              obra: 'Ampliación de cocina',                 lineas: ['robleNordico', 'pulido'],       pagadoPct: 0, cancelada: true },
];

const totalDe = (lineas) => lineas.reduce((a, l) => a + (Number(l.cantidad) || 0) * (Number(l.precioUnit) || 0), 0);

/** El día pedido, dentro del mes en curso, sin desbordar febrero ni similares. */
function fechaDelMes(dia) {
  const d = new Date();
  d.setDate(Math.min(dia, 28));
  return d.toISOString().slice(0, 10);
}

/** Los pasos de la carpeta según qué tan avanzado va el cobro, para que el
 *  aviso de "ya se puede pedir material" también salga bien en la demo. */
function pasosDe(pagadoPct) {
  if (pagadoPct >= 1) return { presupuesto: true, pago: true, requisicion: true, orden: true, instalacion: true };
  if (pagadoPct >= 0.8) return { presupuesto: true, pago: true, requisicion: true };
  return { presupuesto: true };
}

export function cargarVentasEjemplo() {
  let cuantas = 0;
  for (const o of OBRAS) {
    const lineas = o.lineas.map((clave) => ({ ...A[clave], id: `${A[clave].id}_${o.dia}` }));
    const venta = ventaVacia(o.vendedor, o.sucursal);
    Object.assign(venta, {
      cliente: o.cliente,
      obra: o.obra,
      fecha: fechaDelMes(o.dia),
      lineas,
      cancelada: !!o.cancelada,
      pagado: Math.round(totalDe(lineas) * o.pagadoPct),
      pasos: pasosDe(o.pagadoPct),
      carpetaDrive: '',
    });
    S.guardarVenta(venta);
    cuantas += 1;
  }
  return cuantas;
}

// No depende del catálogo cargado: son líneas y precios de proveedor, no SKUs.
export const hayVentasEjemplo = () => true;
