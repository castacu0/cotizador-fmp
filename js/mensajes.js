// Plantillas de mensajes para el asesor. El seguimiento es donde se pierden
// las ventas, no en la cotización: aquí están los textos ya escritos.

import { fmtMXN, fmtFecha, sumarDias } from './format.js';

/** Contexto que reciben todas las plantillas. */
function contexto(cot, totales, config) {
  const fecha = new Date(cot.fecha);
  const saludo = (cot.cliente.contacto || cot.cliente.nombre || 'estimado cliente').trim();
  return {
    saludo,
    cliente: cot.cliente.nombre || 'su empresa',
    obra: cot.cliente.obra || 'su proyecto',
    folio: cot.folio || '(genera el PDF para tener folio)',
    total: fmtMXN(totales?.total ?? 0),
    anticipo: fmtMXN(totales?.anticipo ?? 0),
    saldo: fmtMXN(totales?.saldo ?? 0),
    partidas: totales?.lineas.length ?? 0,
    vence: fmtFecha(sumarDias(fecha, config.comercial.vigenciaDias)),
    entrega: fmtFecha(sumarDias(fecha, totales?.leadTimeMax ?? 0)),
    vendedor: cot.vendedor || '',
    empresa: config.empresa.nombre,
    telefono: config.empresa.telefono,
    dias: config.comercial.vigenciaDias,
    hayImportados: totales?.hayImportados ?? false,
  };
}

const firma = (c) => `\n\n${c.vendedor}\n${c.empresa}\n${c.telefono}`;

export const PLANTILLAS = [
  {
    id: 'envio',
    nombre: 'Envío de la cotización',
    cuando: 'El mismo día, con el PDF adjunto',
    asunto: (c) => `Cotización ${c.folio} · ${c.obra}`,
    texto: (c) =>
`Hola ${c.saludo}, buen día.

Le comparto la cotización ${c.folio} para ${c.obra}, con ${c.partidas} partida(s).

Total con IVA: ${c.total}
Anticipo para arrancar: ${c.anticipo}
Entrega estimada: ${c.entrega}
Vigencia: ${c.vence}

En el PDF viene el desglose por partida y el anexo técnico con especificaciones, tiempos de entrega y condiciones. Ahí también está considerada la merma de instalación y el redondeo a caja completa, para que no haya sorpresas de material a media obra.

Quedo atento a cualquier ajuste de medidas o de especificación.${firma(c)}`,
  },
  {
    id: 'seguimiento3',
    nombre: 'Seguimiento a los 3 días',
    cuando: 'Si no contestó, sin presionar',
    asunto: (c) => `Seguimiento · cotización ${c.folio}`,
    texto: (c) =>
`Hola ${c.saludo}, ¿cómo va?

Le escribo para saber si tuvo oportunidad de revisar la cotización ${c.folio} de ${c.obra}.

Si algo no le cuadra, dígame qué es y lo ajustamos. Muchas veces con cambiar el espesor o la especie el número baja bastante sin perder el acabado.

¿Le sirve que le mande dos o tres alternativas con distinto precio para comparar?${firma(c)}`,
  },
  {
    id: 'alternativas',
    nombre: 'Ofrecer alternativas por precio',
    cuando: 'Cuando el cliente dice que está caro',
    asunto: (c) => `Alternativas para ${c.obra}`,
    texto: (c) =>
`Hola ${c.saludo}.

Entiendo el punto del presupuesto. Antes de mover el precio prefiero mover la especificación, que es donde de verdad se nota:

1. Bajar el espesor de la duela mantiene el mismo aspecto y reduce el material.
2. Cambiar de madera importada a nacional baja el costo y además acorta la entrega.
3. Cambiar el patrón de colocación de espina de pescado a recto reduce merma y mano de obra.

Dígame cuál de los tres le interesa y le mando el número hoy mismo.${firma(c)}`,
  },
  {
    id: 'vigencia',
    nombre: 'Aviso de vencimiento',
    cuando: 'Dos o tres días antes de que venza',
    asunto: (c) => `La cotización ${c.folio} vence el ${c.vence}`,
    texto: (c) =>
`Hola ${c.saludo}.

Le recuerdo que la cotización ${c.folio} tiene vigencia hasta el ${c.vence}.

${c.hayImportados
  ? 'Parte del material es de importación y está cotizado al tipo de cambio del día. Si el peso se mueve, el precio se ajusta en la orden nueva.'
  : 'Después de esa fecha tendría que revisar precios con el proveedor antes de confirmar.'}

Si quiere que la respetemos unos días más, avíseme y lo gestiono.${firma(c)}`,
  },
  {
    id: 'anticipo',
    nombre: 'Confirmación de anticipo',
    cuando: 'Al recibir el pago',
    asunto: (c) => `Anticipo recibido · ${c.folio}`,
    texto: (c) =>
`Hola ${c.saludo}, confirmado.

Recibimos el anticipo de ${c.anticipo} correspondiente a la cotización ${c.folio}. Con esto liberamos el pedido.

A partir de hoy corre el plazo de entrega: fecha estimada ${c.entrega}.
Saldo pendiente contra entrega en obra: ${c.saldo}.

Le voy avisando en cada etapa. Antes de la instalación paso a confirmar que el sitio esté nivelado y en obra blanca terminada.${firma(c)}`,
  },
  {
    id: 'transito',
    nombre: 'Material en tránsito',
    cuando: 'Producto de importación en camino',
    asunto: (c) => `Estatus del pedido ${c.folio}`,
    texto: (c) =>
`Hola ${c.saludo}.

Le informo el estatus de su pedido ${c.folio}: el material de importación ya salió de fábrica y va en tránsito.

Le confirmo la fecha exacta de entrega en cuanto salga de aduana. La estimación sigue siendo ${c.entrega}.

Mientras tanto, para no perder tiempo: la madera necesita 72 horas de aclimatación en obra antes de instalarse. Conviene que el sitio ya esté en condiciones finales de temperatura y humedad para esas fechas.${firma(c)}`,
  },
  {
    id: 'instalacion',
    nombre: 'Agendar instalación',
    cuando: 'Material entregado en obra',
    asunto: (c) => `Agendamos la instalación de ${c.obra}`,
    texto: (c) =>
`Hola ${c.saludo}.

El material ya está en obra. Para agendar instalación necesito confirmar tres cosas:

1. Que el sustrato esté nivelado, con tolerancia de 3 mm en 2 m.
2. Que la humedad de losa esté por debajo de 2.5%.
3. Que el área esté libre y en obra blanca terminada.

Dígame qué día le conviene y bloqueo a la cuadrilla.${firma(c)}`,
  },
  {
    id: 'cierre',
    nombre: 'Cierre y reseña',
    cuando: 'Una semana después de instalar',
    asunto: (c) => `¿Cómo quedó ${c.obra}?`,
    texto: (c) =>
`Hola ${c.saludo}.

Ya pasó una semana desde la instalación en ${c.obra}. ¿Cómo lo ve?

Si todo quedó bien, me ayudaría mucho una reseña corta. Y si algo no le convence, prefiero saberlo ahora y resolverlo.

Le recuerdo el mantenimiento: en piso aceitado conviene aplicar aceite de la misma línea cada 18 a 24 meses. Se lo puedo agendar.${firma(c)}`,
  },
  {
    id: 'lead',
    nombre: 'Primer contacto de campaña',
    cuando: 'Lead nuevo de anuncios, antes de cotizar',
    asunto: () => 'Su solicitud de información',
    texto: (c) =>
`Hola, buen día. Le escribo de ${c.empresa}.

Vi su solicitud de información. Para mandarle un número real hoy mismo necesito tres datos:

1. Metros cuadrados aproximados y en qué áreas.
2. Qué material tiene en mente: duela de madera, SPC impermeable, laminado o porcelanato.
3. Si necesita instalación o solo suministro.

Con eso le mando la cotización con desglose el mismo día.${firma(c)}`,
  },
];

/** Devuelve { asunto, texto } de una plantilla ya rellenada. */
export function armarMensaje(idPlantilla, cot, totales, config) {
  const p = PLANTILLAS.find((x) => x.id === idPlantilla) ?? PLANTILLAS[0];
  const c = contexto(cot, totales, config);
  return { plantilla: p, asunto: p.asunto(c), texto: p.texto(c) };
}

/** Número mexicano listo para wa.me. Devuelve '' si no hay teléfono usable. */
export function telefonoWhatsApp(tel) {
  const d = String(tel || '').replace(/\D/g, '');
  if (d.length < 10) return '';
  if (d.length === 10) return `52${d}`;
  return d;
}
