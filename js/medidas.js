// Captura de medidas en obra, con la notación que el equipo ya usa en sus notas.
//
//   Cuarto 2
//   16.45,3.81,2.29              áreas en m², se suman
//   Z-1.91,.88,1.27,.30          zoclo en metros lineales, se suman
//   21.9,1.86(2),.42(2)          (2) quiere decir "esa medida, dos veces"
//   4*5                          lados de un rectángulo, se multiplican
//
// Regla de diseño: quien mide nunca escribe letras. Números, coma, punto,
// paréntesis y el signo de multiplicar. Nada más. El teclado de la aplicación
// no ofrece otra cosa.

import { redondearArriba, uid } from './format.js';

const num = (v, def = 0) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : def;
};

/** Corta el arrastre binario sin cambiar el valor comercial. */
const limpio = (n, dec = 4) => Number(Number(n).toFixed(dec));

// Prefijo con el que marcan el zoclo: "Z-", "Z ", "z:", "Zoclo-".
const RE_PREFIJO_ZOCLO = /^\s*z(?:oclo)?\s*[-:–—]?\s*/i;

export const esLineaZoclo = (linea) => RE_PREFIJO_ZOCLO.test(String(linea ?? ''));

// Un número suelto: 16.45, .88, 1, 21.9. El punto es decimal; la coma separa.
const RE_NUMERO = /^\d*\.?\d+$/;

/**
 * Lee un token individual de la lista.
 * Devuelve { crudo, valor, veces, factores } o { crudo, error: true }.
 */
export function parsearToken(crudo) {
  const t = String(crudo ?? '').trim().replace(/[×xX]/g, '*');
  if (!t) return null;

  let veces = 1;
  let cuerpo = t;

  const rep = t.match(/^(.*?)\((\d+)\)$/);
  if (rep) {
    cuerpo = rep[1].trim();
    veces = parseInt(rep[2], 10);
    if (!(veces >= 1) || veces > 999) return { crudo: t, error: true };
  }

  const factores = cuerpo.split('*').map((f) => f.trim());
  if (!factores.length || factores.some((f) => !RE_NUMERO.test(f))) {
    return { crudo: t, error: true };
  }

  const valor = limpio(factores.reduce((a, f) => a * parseFloat(f), 1));
  return { crudo: t, valor, veces, factores: factores.map(parseFloat) };
}

/**
 * Lee una lista completa: "16.45,3.81,2.29" o "Z-1.91 .88 1.27".
 * Acepta coma, punto y coma, espacio o salto de línea como separador,
 * porque en el teléfono cada quien separa distinto.
 */
export function parsearLista(texto) {
  const cadena = String(texto ?? '').replace(RE_PREFIJO_ZOCLO, '');
  const tokens = cadena.split(/[\s,;]+/).filter(Boolean);

  const valores = [];
  const errores = [];
  for (const t of tokens) {
    const p = parsearToken(t);
    if (!p) continue;
    if (p.error) { errores.push(p.crudo); continue; }
    valores.push(p);
  }

  const suma = valores.reduce((a, v) => a + v.valor * v.veces, 0);
  return { valores, errores, suma: limpio(suma), cuenta: valores.reduce((a, v) => a + v.veces, 0) };
}

// --------------------------------------------------------------------------- escalera

/**
 * La escalera no se mide por área: se cuenta.
 * Cada escalón forrado consume huella + peralte de material, por el ancho.
 * El zoclo de escalera corre por el filo, y va en uno o en los dos lados.
 */
export function calcularEscalera(esc = {}) {
  const piezas = Math.max(0, num(esc.piezas));
  const anchoM = Math.max(0, num(esc.anchoM));
  const huellaM = Math.max(0, num(esc.huellaM));
  const peralteM = Math.max(0, num(esc.peralteM));
  const lados = Math.max(0, num(esc.ladosZoclo, 1));

  // Metros lineales de material que consume un escalón de frente.
  const desarrollo = limpio(huellaM + peralteM);
  const conZoclo = esc.escalonesZoclo == null || esc.escalonesZoclo === ''
    ? piezas
    : Math.max(0, num(esc.escalonesZoclo));

  return {
    piezas, anchoM, huellaM, peralteM, desarrollo,
    escalonesZoclo: conZoclo,
    ladosZoclo: lados,
    areaM2: limpio(piezas * anchoM * desarrollo),
    zocloML: limpio(conZoclo * desarrollo * lados),
  };
}

// --------------------------------------------------------------------------- cuartos

export const cuartoVacio = (nombre = '', tipo = 'area') => ({
  id: uid('cto'),
  nombre,
  tipo,
  areas: '',
  zoclo: '',
  escalera: { piezas: '', anchoM: '', huellaM: '', peralteM: '', escalonesZoclo: '', ladosZoclo: 1 },
  nota: '',
});

/** Área y zoclo de un cuarto, sea de área libre o escalera. */
export function calcularCuarto(cuarto = {}) {
  if (cuarto.tipo === 'escalera') {
    const e = calcularEscalera(cuarto.escalera);
    // Una escalera puede traer además un descanso capturado como área suelta.
    const extra = parsearLista(cuarto.areas);
    const extraZoclo = parsearLista(cuarto.zoclo);
    return {
      areaM2: limpio(e.areaM2 + extra.suma),
      zocloML: limpio(e.zocloML + extraZoclo.suma),
      escalera: e,
      areas: extra,
      zoclos: extraZoclo,
      errores: [...extra.errores, ...extraZoclo.errores],
    };
  }

  const areas = parsearLista(cuarto.areas);
  const zoclos = parsearLista(cuarto.zoclo);
  return {
    areaM2: areas.suma,
    zocloML: zoclos.suma,
    escalera: null,
    areas, zoclos,
    errores: [...areas.errores, ...zoclos.errores],
  };
}

export const medicionVacia = (nombre = '') => ({
  id: uid('med'),
  nombre,
  cliente: '',
  direccion: '',
  fecha: new Date().toISOString(),
  medidoPor: '',
  cuartos: [],
  precioM2: null,      // null = usa el promedio de Ajustes
  mermaPct: null,
  incluirInstalacion: true,
  incluirZoclo: true,
  notas: '',
});

/** Suma de toda la obra, cuarto por cuarto. */
export function calcularMedicion(medicion = {}) {
  const cuartos = (medicion.cuartos ?? []).map((c) => ({
    cuarto: c,
    ...calcularCuarto(c),
  }));
  return {
    cuartos,
    areaM2: limpio(cuartos.reduce((a, c) => a + c.areaM2, 0)),
    zocloML: limpio(cuartos.reduce((a, c) => a + c.zocloML, 0)),
    errores: cuartos.flatMap((c) => c.errores),
  };
}

// --------------------------------------------------------------------------- estimado

/**
 * Estimado de campo. No sustituye a la cotización: sirve para que quien mide
 * pueda decir un número en la visita sin abrir la computadora.
 * Mientras no estén cargadas las listas de precios reales usa el promedio
 * capturado en Ajustes, y la pantalla lo dice con todas sus letras.
 */
export function estimarMedicion(medicion, config) {
  const m = config?.medidor ?? {};
  const suma = calcularMedicion(medicion);

  const precioM2 = num(medicion.precioM2 ?? m.precioM2, 300);
  const mermaPct = num(medicion.mermaPct ?? m.mermaPct, 0.1);
  const precioZocloML = num(m.precioZocloML, 145);
  const instalacionM2 = num(m.instalacionM2, 0);

  const areaConMerma = limpio(suma.areaM2 * (1 + mermaPct));
  const material = areaConMerma * precioM2;
  const zoclo = medicion.incluirZoclo === false ? 0 : suma.zocloML * precioZocloML;
  const instalacion = medicion.incluirInstalacion === false ? 0 : suma.areaM2 * instalacionM2;

  const subtotal = material + zoclo + instalacion;
  const iva = subtotal * num(config?.fiscal?.iva, 0.16);

  return {
    ...suma,
    precioM2, mermaPct, precioZocloML, instalacionM2,
    areaConMerma,
    material: limpio(material, 2),
    zoclo: limpio(zoclo, 2),
    instalacion: limpio(instalacion, 2),
    subtotal: limpio(subtotal, 2),
    iva: limpio(iva, 2),
    total: limpio(subtotal + iva, 2),
    // Cajas aproximadas con un rendimiento típico, solo como referencia de compra.
    cajasAprox: m.m2PorCajaPromedio > 0
      ? Math.ceil(redondearArriba(areaConMerma, 0.01) / num(m.m2PorCajaPromedio, 2.2))
      : null,
  };
}

// --------------------------------------------------------------------------- importar nota

const KEYS_ESCALERA = [
  { re: /(pieza|escalon|escalón|huellas?\s*totales)/i, campo: 'piezas' },
  { re: /ancho/i, campo: 'anchoM' },
  { re: /huella/i, campo: 'huellaM' },
  { re: /(peralte|contrahuella)/i, campo: 'peralteM' },
];

const primerNumero = (linea) => {
  const m = String(linea).match(/\d*\.?\d+/);
  return m ? parseFloat(m[0]) : null;
};

// Una línea es encabezado de cuarto si trae al menos dos letras seguidas
// y no es una lista de medidas ni una línea de zoclo.
const RE_LETRAS = /[a-záéíóúñü]{2,}/i;

/**
 * Convierte una nota pegada del teléfono en cuartos.
 * Es la puerta de entrada más rápida: quien ya midió en Notas pega y listo.
 */
export function parsearNota(texto) {
  const lineas = String(texto ?? '').split(/\r?\n/);
  const cuartos = [];
  let actual = null;
  let ultimaEscalera = null;
  let proyecto = '';

  const abrir = (nombre) => {
    actual = cuartoVacio(nombre.trim());
    cuartos.push(actual);
    return actual;
  };

  const agregar = (campo, texto2) => {
    if (!actual) abrir('Cuarto ' + (cuartos.length + 1));
    actual[campo] = actual[campo] ? `${actual[campo]},${texto2}` : texto2;
  };

  for (const cruda of lineas) {
    const linea = cruda.trim();
    if (!linea) continue;

    // Zoclo. Se revisa antes que nada porque "Z-" empieza con letra.
    if (esLineaZoclo(linea)) {
      const cuerpo = linea.replace(RE_PREFIJO_ZOCLO, '').trim();
      const lista = parsearLista(cuerpo);

      // "Zoclo en 7 escalones solo de un lado" no es una lista: es una instrucción.
      if (!lista.valores.length || RE_LETRAS.test(cuerpo)) {
        // La instrucción habla de escalones, así que va a la escalera, aunque
        // venga escrita debajo del descanso. Así lo anotan en obra.
        const destino = /escal(on|ón|era)/i.test(cuerpo)
          ? (actual?.tipo === 'escalera' ? actual : ultimaEscalera)
          : (actual?.tipo === 'escalera' ? actual : null);

        if (destino) {
          const n = primerNumero(cuerpo);
          if (n != null) destino.escalera.escalonesZoclo = n;
          if (/(un|1)\s*(solo\s*)?lado/i.test(cuerpo)) destino.escalera.ladosZoclo = 1;
          if (/(dos|2|ambos)\s*lados/i.test(cuerpo)) destino.escalera.ladosZoclo = 2;
        }
        if (actual) actual.nota = actual.nota ? `${actual.nota} · ${cuerpo}` : cuerpo;
        continue;
      }
      agregar('zoclo', cuerpo);
      continue;
    }

    const tieneLetras = RE_LETRAS.test(linea);

    if (tieneLetras) {
      // Renglón de escalera: "14 piezas", ".90 de ancho", ".32 huella".
      const clave = KEYS_ESCALERA.find((k) => k.re.test(linea));
      if (clave && actual && primerNumero(linea) != null) {
        actual.tipo = 'escalera';
        actual.escalera[clave.campo] = primerNumero(linea);
        ultimaEscalera = actual;
        continue;
      }

      // Encabezado. Un decimal al final sí es medida ("Descanso 2.11");
      // un entero al final es parte del nombre ("Cuarto 2").
      const medida = linea.match(/(\d*\.\d+)\s*$/);
      const nombre = medida ? linea.slice(0, medida.index).trim() : linea;
      const c = abrir(nombre);
      if (/escalera/i.test(nombre)) { c.tipo = 'escalera'; ultimaEscalera = c; }
      if (medida) c.areas = medida[1];
      continue;
    }

    // Lista de áreas.
    const lista = parsearLista(linea);
    if (lista.valores.length) agregar('areas', linea.trim());
  }

  // Si el primer bloque quedó sin una sola medida, era el nombre de la obra.
  if (cuartos.length && !calcularCuarto(cuartos[0]).areaM2 && !cuartos[0].zoclo
      && cuartos[0].tipo !== 'escalera') {
    proyecto = cuartos[0].nombre;
    cuartos.shift();
  }

  return { proyecto, cuartos };
}

/** Nombres que el equipo repite en cada obra. Se ofrecen como atajo. */
export const CUARTOS_SUGERIDOS = [
  'Recámara principal', 'Recámara 1', 'Recámara 2', 'Recámara 3',
  'Cuarto 1', 'Cuarto 2', 'Cuarto 3',
  'Sala', 'Comedor', 'Cocina', 'Pasillo', 'Estancia', 'Estudio',
  'Baño principal', 'Vestidor', 'Descanso', 'Patio', 'Terraza', 'Pulido',
];
