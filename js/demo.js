// Cotización de ejemplo. Sirve para la demostración y para que un asesor nuevo
// vea de inmediato cómo se ve una cotización completa.

import * as S from './state.js';
import { uid } from './format.js';

export const CLIENTE_EJEMPLO = {
  nombre: 'Hotel Casa Encinar, S.A. de C.V.',
  contacto: 'Arq. Renata Solís',
  telefono: '55 1234 5678',
  email: 'compras@casaencinar.mx',
  obra: 'Remodelación de 12 suites, torre poniente',
};

/** Partidas que tocan los cuatro motores de cálculo a la vez. */
const PARTIDAS_EJEMPLO = [
  {
    sku: 'DI-ENC-14-220-AC',
    datos: {
      areaM2: 420, patron: 'espina', perimetroM: 268,
      incluirInstalacion: true, incluirZoclo: true,
      incluirUnderlayment: false, incluirAdhesivo: true, incluirBoquilla: false,
      perfilesTransicion: 24, descuentoPct: 0,
    },
  },
  {
    sku: 'POR-60x120-REC',
    datos: {
      areaM2: 96, patron: 'recto', perimetroM: 132,
      incluirInstalacion: true, incluirZoclo: false,
      incluirUnderlayment: false, incluirAdhesivo: false, incluirBoquilla: true,
      perfilesTransicion: 12, descuentoPct: 0,
    },
  },
  {
    sku: 'CORT-BO-HOT-290',
    datos: {
      anchoM: 3.2, altoM: 2.6, cantidad: 12, pliegue: 2.5,
      incluirRiel: true, rielMotorizado: false, incluirForro: true,
      incluirInstalacion: true, descuentoPct: 0,
    },
  },
  {
    sku: 'PER-ENR-SCR3',
    datos: {
      anchoM: 1.2, altoM: 1.8, cantidad: 24,
      motorizada: false, incluirInstalacion: true, descuentoPct: 0,
    },
  },
];

const BASE_PARTIDA = {
  areaM2: '', patron: 'recto', perimetroM: '',
  incluirInstalacion: true, incluirZoclo: false, incluirUnderlayment: false,
  incluirAdhesivo: false, incluirBoquilla: false, perfilesTransicion: 0,
  anchoM: '', altoM: '', cantidad: 1, pliegue: 2.5,
  incluirRiel: false, rielMotorizado: false, incluirForro: false, motorizada: false,
  margenOverride: null, descuentoPct: 0,
};

/** Devuelve cuántas partidas se pudieron armar con el catálogo actual. */
export function cargarEjemplo() {
  const s = S.obtener();
  const partidas = [];

  for (const p of PARTIDAS_EJEMPLO) {
    const producto = s.catalogo.find((x) => x.sku === p.sku)
      ?? s.catalogo.find((x) => x.id === p.sku);
    if (!producto) continue;
    partidas.push({ ...BASE_PARTIDA, ...p.datos, id: uid('pt'), productoId: producto.id });
  }

  S.actualizar((st) => {
    st.cotizacion = {
      id: uid('cot'),
      folio: null,
      fecha: new Date().toISOString(),
      cliente: { ...CLIENTE_EJEMPLO },
      partidas,
      descuentoGlobal: 0,
      notas: '',
      vendedor: 'Luis Ramírez',
    };
  });

  S.guardarAhora();
  return partidas.length;
}

/** El catálogo demo trae SKUs conocidos; con un catálogo importado puede no haber match. */
export const hayDatosParaEjemplo = () => {
  const s = S.obtener();
  return PARTIDAS_EJEMPLO.some((p) => s.catalogo.some((x) => x.sku === p.sku));
};
