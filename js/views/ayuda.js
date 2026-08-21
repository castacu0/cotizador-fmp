// Ayuda y capacitación. Es el material de entrenamiento del equipo de ventas.

import { el, normalizar } from '../format.js';
import { icono, desplegable, nota } from '../ui.js';
import { CONTACTO, abrirAsistente } from '../asistente.js';

const CONTENIDO = [
  {
    titulo: 'Cómo se arma una cotización',
    icono: 'pdf',
    temas: [
      {
        p: '¿Cuál es el flujo completo, de la llamada al PDF?',
        r: [
          'pasos',
          [
            'Captura el nombre del cliente y la obra. Sin nombre no se genera el PDF.',
            'Busca el material. Escribe varias palabras juntas: "encino 14 aceitado" llega directo.',
            'Abre la partida y captura la superficie. Si no la tienes, usa "medir ambiente por ambiente".',
            'Elige el patrón de colocación. Cambia la merma y la mano de obra, no es un detalle estético.',
            'Marca los accesorios. El zoclo y la barrera de vapor son los que más se olvidan.',
            'Revisa el margen en el panel derecho. Debajo de 25% aparece una alerta.',
            'Descarga el PDF. Salen hasta tres páginas: propuesta, anexo técnico y condiciones.',
          ],
        ],
      },
      {
        p: 'El cliente solo me dio metros cuadrados, ¿qué hago con el perímetro?',
        r: ['texto', 'La app estima el perímetro a partir del área asumiendo una planta rectangular. Sirve para dar un número rápido por teléfono. Para cerrar la venta se necesita el perímetro real: un pasillo de 40 m² tiene mucho más perímetro que una sala cuadrada de 40 m², y ahí se va el costo del zoclo. Cuando el desglose usa una estimación, lo dice.'],
      },
      {
        p: '¿Puedo cambiar el margen de una sola partida?',
        r: ['texto', 'Sí. Dentro de la partida, en "Margen y descuento de esta partida". Sirve para bajar el margen en el material y sostenerlo en la instalación, o al revés. Si lo dejas vacío toma el margen general de Ajustes.'],
      },
      {
        p: '¿El cliente ve mi margen?',
        r: ['texto', 'No. El PDF solo muestra precio unitario, importe, subtotal, IVA y total en pesos mexicanos. El costo, el margen y la utilidad se quedan en la app.'],
      },
    ],
  },
  {
    titulo: 'Las fórmulas, y por qué son así',
    icono: 'regla',
    temas: [
      {
        p: '¿Por qué me facturan más metros de los que pedí?',
        r: [
          'formula',
          `Área solicitada          120.00 m²
Merma por colocación    × 1.07   (recto)
                        ─────────────────
Área con desperdicio    128.40 m²

Rendimiento de caja       2.42 m²
Cajas completas         ÷ = 53.06 → <b>54 cajas</b>
                        ─────────────────
<b>Área facturada          130.68 m²</b>`,
          'Dos ajustes distintos. La merma cubre el material que se corta y se tira. El redondeo a caja completa existe porque el proveedor no vende media caja. Si cotizas 120 m² planos, esos 10.68 m² de diferencia salen de tu utilidad.',
        ],
      },
      {
        p: '¿Cuánta merma lleva cada patrón?',
        r: [
          'tabla',
          [['Recto o lineal', '7%', '×1.00'],
           ['Damero', '10%', '×1.15'],
           ['Diagonal 45°', '12%', '×1.25'],
           ['Espina de pescado', '18%', '×1.60'],
           ['Chevron', '20%', '×1.75']],
          ['Patrón', 'Merma', 'Mano de obra'],
          'Un cliente que pide espina de pescado sobre una cotización hecha en recto está viendo un precio que no existe. La diferencia entre recto y chevron en 120 m² supera el 20% del total.',
        ],
      },
      {
        p: '¿Cómo se calcula la tela de una cortina?',
        r: [
          'formula',
          `Ancho de ventana         3.20 m
Pliegue hotelero        × 2.5
                        ─────────────
Tela requerida           8.00 m

Si el rollo (2.90 m) cubre la caída (2.60 m + 0.30 de dobladillos):
  <b>Corte al ancho</b> → 8.00 × 1.06 = <b>8.48 ml</b>, sin costuras

Si el rollo es angosto (1.40 m):
  Paños = 8.00 ÷ 1.40 = 5.71 → <b>6 paños</b>
  <b>6 × (2.60 + 0.30) = 17.40 ml</b>`,
          'La misma ventana consume el doble de tela según el ancho del rollo. Por eso en hotelería se compra tela de altura de 2.80 o 3.00 m: se corre de lado, no lleva costuras verticales y rinde mucho más.',
        ],
      },
      {
        p: '¿Qué es el pliegue y por qué no bajarlo?',
        r: ['texto', 'El pliegue es cuánta tela lleva la cortina respecto al ancho de la ventana. Con 2.5x, tres metros de ventana llevan 7.5 metros de tela. Bajar a 1.8x abarata la cotización un 28%, y la cortina se ve tensa y barata cuando está cerrada. En hotelería el estándar es 2.5x y en suites 3.0x. Si el cliente pide bajar el precio, se cambia la tela antes que el pliegue.'],
      },
      {
        p: '¿Por qué una persiana chica cuesta como una de un metro cuadrado?',
        r: ['texto', 'Porque el fabricante cobra un área mínima por pieza, normalmente 1 m². Cortar, ensamblar y empacar una persiana de 0.60 × 0.80 m cuesta casi lo mismo que una grande. La app aplica el mínimo automáticamente y lo señala en el desglose para que puedas explicarlo.'],
      },
      {
        p: 'Margen y markup no son lo mismo',
        r: [
          'formula',
          `Costo directo                    $100,000
Con <b>35% de margen</b>:   100,000 ÷ (1 − 0.35) = <b>$153,846</b>
Con <b>35% de markup</b>:   100,000 × 1.35        = $135,000
                                     ───────────
Diferencia por confundirlos:            $18,846`,
          'El margen es la parte del precio de venta que queda como utilidad. El markup es un multiplicador sobre el costo. La app trabaja con margen y te muestra el multiplicador equivalente para que compares con tus listas viejas.',
        ],
      },
    ],
  },
  {
    titulo: 'Producto: qué recomendar y cuándo',
    icono: 'capas',
    temas: [
      {
        p: 'Duela de ingeniería: ¿qué significa la capa noble?',
        r: ['texto', 'Es el espesor de madera real encima del contrachapado. Define cuántas veces se puede relijar el piso. Con 0.6 mm no se relija nunca, con 2.5 mm una vez, con 3 a 4 mm dos o tres veces. Un piso de 9 mm y uno de 14 mm se ven igual el día de la instalación; a los quince años uno se cambia y el otro se relija. Ese es el argumento de venta del espesor, no el espesor en sí.'],
      },
      {
        p: 'Aceitado contra barnizado: ¿cuál conviene?',
        r: [
          'tabla',
          [['Tacto', 'Madera al natural', 'Capa plástica encima'],
           ['Reparación', 'Puntual, en sitio', 'Relijar el paño completo'],
           ['Mantenimiento', 'Aceite cada 18-24 meses', 'Ninguno hasta el relijado'],
           ['Resistencia a la mancha', 'Menor', 'Mayor'],
           ['Percepción', 'Alta gama, mate profundo', 'Comercial']],
          ['', 'Aceitado', 'Barnizado'],
          'El aceitado se vende solo en residencias de alto nivel y se defiende con la reparación puntual: un rayón se corrige con un paño y aceite, sin sacar muebles. En hotel de alto tránsito, el barnizado UV da menos dolores de cabeza.',
        ],
      },
      {
        p: 'SPC, laminado y madera: ¿cómo decido?',
        r: [
          'tabla',
          [['Baño, cocina, sótano', 'SPC', 'Es el único 100% impermeable'],
           ['Recámaras, sala', 'Duela de ingeniería', 'Percepción de valor'],
           ['Renta o presupuesto corto', 'Laminado AC4', 'Costo por m² más bajo'],
           ['Hotel, alto tránsito', 'SPC 8 mm o duela barnizada', 'Capa de uso 30 mil'],
           ['Exterior, alberca', 'Deck WPC o porcelanato R11', 'Antiderrapante y anti-UV']],
          ['Situación', 'Recomendación', 'Por qué'],
          'El laminado no es impermeable aunque el proveedor diga "hidrorresistente". Resiste un derrame limpiado a tiempo, no una fuga.',
        ],
      },
      {
        p: '¿Qué exige un hotel que una casa no?',
        r: [
          'lista',
          ['Certificado de retardancia de flama NFPA 701 en toda la cortinería de áreas públicas y habitaciones.',
           'Blackout real del 100%, no dimout. El huésped que ve luz a las 6 a.m. deja mala reseña.',
           'Pliegue de 2.5x mínimo. Con menos, la cortina cerrada se ve tensa en la foto del cuarto.',
           'Capa de uso de 30 mil o más en piso vinílico de pasillos.',
           'Repetibilidad: el mismo lote para todas las habitaciones. Pedir el material completo de una vez.',
           'Tiempo de instalación por piso, no por habitación, para no cerrar toda la torre.'],
        ],
      },
      {
        p: 'Pino, encino y roble: la diferencia que importa',
        r: ['texto', 'El pino es madera blanda: marca con el tacón de una silla y con la uña. Se vende por precio, en recámaras o proyectos rústicos, y hay que decirle al cliente que va a marcarse. El encino y el roble son maderas duras, tienen veta abierta y aguantan tránsito. La diferencia entre encino y roble es sobre todo de tono y disponibilidad: el roble europeo llega en formatos más anchos y más largos, y por eso cuesta más y tarda más.'],
      },
    ],
  },
  {
    titulo: 'Importación y tiempos de entrega',
    icono: 'globo',
    temas: [
      {
        p: '¿Cómo se calcula la fecha que prometo?',
        r: [
          'formula',
          `Producto nacional:
  Días de proveedor                     =  3 a 12 días

Producto importado:
  Días de fábrica                       = 30 días
  + Tránsito marítimo                   = 35 días
  + Despacho aduanal                    =  7 días
                                          ─────────
  <b>Total comprometido                    = 72 días</b>`,
          'El plazo corre desde que entra el anticipo, no desde que se manda la cotización. La partida más lenta manda la fecha de toda la obra. Si el cliente tiene prisa, la solución es separar la entrega en etapas, no prometer menos días.',
        ],
      },
      {
        p: 'El cliente dice que otro proveedor se lo entrega en dos semanas',
        r: ['texto', 'Casi siempre significa una de tres cosas: es material nacional equivalente, es un lote que ya está en aduana, o le van a surtir lo que haya en existencia con riesgo de mezclar lotes. Un piso instalado con dos lotes distintos se nota en el tono y la reclamación llega a los tres meses. Ofrece la alternativa nacional con nombre y precio, no discutas el plazo.'],
      },
      {
        p: '¿Por qué el precio de importación puede cambiar?',
        r: ['texto', 'Porque el costo está en dólares y la cotización se emite en pesos. La app convierte con el tipo de cambio de Ajustes. Si el peso se mueve más de dos o tres por ciento entre la cotización y la orden, el precio ya no es el mismo. Por eso el PDF dice que el precio de importado está sujeto al tipo de cambio del día de la orden. Actualiza el tipo de cambio en Ajustes cada lunes.'],
      },
    ],
  },
  {
    titulo: 'Errores que cuestan dinero',
    icono: 'alerta',
    temas: [
      {
        p: 'Los seis errores más caros al cotizar',
        r: [
          'lista',
          ['Cotizar el área del plano sin merma ni redondeo a caja. En 120 m² son entre 8 y 12 m² regalados.',
           'Olvidar el zoclo. Es entre el 6% y el 10% del importe del piso y siempre lo piden después.',
           'No preguntar el patrón de colocación. Espina de pescado sube la mano de obra un 60%.',
           'Cotizar cortinas sin confirmar el ancho del rollo. Puede duplicar los metros de tela.',
           'Prometer fecha sin revisar si el producto es importado.',
           'Aplicar el "35%" como multiplicador sobre el costo en lugar de margen. Deja 26% real.'],
        ],
      },
      {
        p: '¿Qué debo aclarar siempre antes de mandar el PDF?',
        r: [
          'lista',
          ['Que el precio se basa en las medidas que dio el cliente y se ajusta con el levantamiento en sitio.',
           'Que el sitio debe estar nivelado y con humedad de losa por debajo de 2.5%.',
           'Que la madera necesita 72 horas de aclimatación antes de instalarse.',
           'Que no incluye demolición, retiro del piso anterior ni nivelación.',
           'Que la variación de veta y tono en madera natural no es defecto.'],
          'Todo esto ya viene impreso en la segunda página del PDF. Menciónalo al enviarlo, no dejes que lo descubran al final.',
        ],
      },
      {
        p: 'El cliente pide descuento, ¿hasta dónde puedo bajar?',
        r: ['texto', 'El panel derecho muestra el margen en tiempo real. Debajo del 30% cambia a ámbar y debajo del 25% a rojo con alerta. Antes de mover el precio, prueba cambiar la especificación: bajar de 14 mm a 12 mm, o de roble europeo a encino nacional, sostiene el margen y baja el total. Un descuento del 10% sobre una cotización con 35% de margen la deja en 27.8%.'],
      },
    ],
  },
  {
    titulo: 'Buenas prácticas del equipo',
    icono: 'check',
    temas: [
      {
        p: 'Todos los días, antes de empezar',
        r: [
          'lista',
          ['Confirma que tu nombre esté capturado en Ajustes. Sin eso la bitácora anota "Sin identificar".',
           'Revisa el tipo de cambio si vas a cotizar producto importado.',
           'Da una pasada al tablero de Ahorro: si hay cotizaciones bajo 25%, alguien está regalando margen.'],
        ],
      },
      {
        p: 'Cada vez que cambien precios',
        r: [
          'pasos',
          ['Actualiza el precio en Catálogo, o usa "Cambiar precios" si subió toda una familia.',
           'Revisa que el rendimiento por caja siga siendo el mismo: el proveedor a veces lo cambia sin avisar.',
           'Guarda un respaldo desde Ajustes.',
           'Avisa al equipo y comparte el archivo de respaldo para que todos queden con la misma lista.'],
          'Un precio viejo en la computadora de un asesor genera una cotización que la empresa tiene que respetar. Es el error más caro de esta etapa.',
        ],
      },
      {
        p: 'Quién mantiene qué',
        r: [
          'tabla',
          [['Precios y catálogo', 'Una sola persona', 'Cuando cambie la lista del proveedor'],
           ['Tipo de cambio', 'Quien cotice importado', 'Cada lunes'],
           ['Tarifas de instalación', 'Quien coordine obra', 'Cada trimestre'],
           ['Margen por defecto', 'Dirección', 'Cuando cambie la política'],
           ['Respaldo', 'Quien mantiene el catálogo', 'Cada cambio y el primer día del mes'],
           ['Existencias', 'Almacén', 'Semanal, o al menos antes de prometer entrega']],
          ['Qué', 'Quién', 'Cada cuándo'],
          'Si un renglón no tiene nombre y apellido asignado, en tres meses nadie lo actualiza y la herramienta empieza a mentir.',
        ],
      },
      {
        p: 'Antes de mandar cualquier cotización',
        r: [
          'lista',
          ['Que el nombre del cliente y la obra estén bien escritos: van impresos en el PDF.',
           'Que el patrón de colocación sea el que pidió el cliente, no el que traía por defecto.',
           'Que el margen esté en verde. Si está en ámbar o rojo, que sea una decisión, no un descuido.',
           'Que la fecha de entrega considere si hay producto importado.',
           'Abrir la vista previa y leer la página del anexo. Es la que protege a la empresa.'],
        ],
      },
      {
        p: 'Qué nunca hay que hacer',
        r: [
          'lista',
          ['Cotizar el área del plano sin merma ni redondeo a caja.',
           'Prometer una fecha sin revisar el tiempo de importación.',
           'Cambiar un precio de catálogo para "ajustar" una cotización: eso afecta a todo el equipo. Usa el descuento de la partida.',
           'Restablecer la aplicación sin haber guardado respaldo.',
           'Mandar el PDF sin abrirlo antes.'],
        ],
      },
      {
        p: 'Al entrar alguien nuevo al equipo',
        r: [
          'pasos',
          ['Que capture su nombre en Ajustes.',
           'Que corra el Tutorial completo, son catorce pasos.',
           'Que arme tres cotizaciones de práctica con "Cargar ejemplo" y las borre.',
           'Que lea esta sección de Ayuda entera.',
           'Que su primera cotización real la revise alguien con experiencia antes de enviarla.'],
        ],
      },
    ],
  },
  {
    titulo: 'La aplicación',
    icono: 'ajustes',
    temas: [
      {
        p: '¿Dónde se guardan mis datos?',
        r: ['texto', 'En este navegador, en esta computadora. No hay servidor. Eso significa que el catálogo que cargues aquí no lo ven tus compañeros, y que si limpias los datos del navegador se pierde. Exporta un respaldo desde Ajustes con regularidad. Para trabajar con un catálogo compartido entre todo el equipo hace falta la versión con base de datos.'],
      },
      {
        p: '¿Cómo cargo el catálogo real desde nuestros Excel?',
        r: [
          'pasos',
          ['Entra a Ajustes y abre "Importar catálogo".',
           'Descarga la plantilla CSV para ver qué columnas se esperan.',
           'Sube tu archivo .xlsx o .csv. La app detecta las columnas sola.',
           'Revisa el mapeo propuesto y corrige lo que haga falta.',
           'Mira el preview: cuántos productos entran, cuáles se descartan y por qué.',
           'Confirma. Puedes reemplazar el catálogo o fusionarlo con lo que ya existe.'],
          'Lo más importante que debe traer tu Excel es el rendimiento por caja en m². Sin ese dato no hay redondeo a caja completa y la cotización queda corta.',
        ],
      },
      {
        p: '¿Funciona sin internet?',
        r: ['texto', 'Sí, una vez cargada la página. El cálculo y el PDF corren en el navegador. Solo la primera carga y las tipografías necesitan conexión.'],
      },
      {
        p: '¿La letra se puede hacer más grande?',
        r: ['texto', 'Sí. El botón "Texto grande" arriba a la derecha aumenta el tamaño de toda la aplicación y separa más los botones. Queda guardado para la próxima vez.'],
      },
      {
        p: '¿A quién le hablo si algo falla?',
        r: ['texto', `A ${CONTACTO.nombre}: WhatsApp ${CONTACTO.whatsapp} o correo ${CONTACTO.email}. Antes de reportar, prueba recargar la página: no se pierde nada porque los datos quedan guardados.`],
      },
    ],
  },
];

// ---------------------------------------------------------------------------

let refs = {};
let consulta = '';

export function render(raiz) {
  const cuerpo = el('div', {});
  refs.cuerpo = cuerpo;

  raiz.append(el('div', { class: 'view' },
    el('header', { class: 'section' },
      el('p', { class: 'eyebrow' }, 'Ayuda'),
      el('h1', { class: 'display mt-3' }, 'Cómo cotizar bien'),
      el('p', { class: 'lead mt-3' },
        'Las fórmulas que usa la aplicación, explicadas, y lo que el equipo necesita saber para defender un precio. Todo se despliega hacia abajo.')),
    el('section', { class: 'section' },
      el('div', { class: 'search' },
        el('span', { class: 'search__icon' }, icono('buscar', 18)),
        el('input', {
          class: 'search__input', type: 'search', placeholder: 'Busca una duda: merma, pliegue, aduana, margen…',
          oninput: (e) => { consulta = e.target.value; refrescar(); },
        }))),
    cuerpo,
    bloqueSoporte()));

  refrescar();
}

function bloqueSoporte() {
  return el('section', { class: 'card card--pad-lg mt-6' },
    el('div', { class: 'row', style: 'justify-content:space-between;align-items:flex-start;gap:24px' },
      el('div', { style: 'flex:1;min-width:220px' },
        el('p', { class: 'eyebrow' }, 'Soporte'),
        el('h2', { class: 'title mt-3' }, '¿No encontraste la respuesta?'),
        el('p', { class: 'lead mt-3' },
          'El asistente resuelve las dudas más comunes al instante. Si necesitas algo que no está aquí, ',
          `escríbele directo a ${CONTACTO.nombre}.`)),
      el('div', { class: 'stack stack-2' },
        el('button', { class: 'btn btn--primary', onclick: () => abrirAsistente() },
          icono('ayuda', 15), 'Abrir el asistente'),
        el('a', {
          class: 'btn', target: '_blank', rel: 'noopener',
          href: `https://wa.me/${CONTACTO.whatsappE164}?text=${encodeURIComponent('Hola, tengo una duda del cotizador: ')}`,
        }, `WhatsApp ${CONTACTO.whatsapp}`),
        el('a', { class: 'btn', href: `mailto:${CONTACTO.email}` }, CONTACTO.email))));
}

function refrescar() {
  const q = normalizar(consulta);
  const secciones = [];

  for (const cat of CONTENIDO) {
    const temas = q
      ? cat.temas.filter((t) => normalizar(t.p + ' ' + JSON.stringify(t.r)).includes(q))
      : cat.temas;
    if (!temas.length) continue;

    secciones.push(el('section', { class: 'faq-cat' },
      el('div', { class: 'row row--tight mb-4' },
        el('span', { class: 'action__icon', style: 'width:32px;height:32px' }, icono(cat.icono, 16)),
        el('h2', { class: 'faq-cat__title', style: 'margin:0' }, cat.titulo)),
      ...temas.map((t) => desplegable({ titulo: t.p, abierto: !!q }, ...cuerpoTema(t.r)))));
  }

  if (!secciones.length) {
    refs.cuerpo.replaceChildren(el('div', { class: 'card card--quiet text-c' },
      el('p', { class: 'lead' }, 'Nada coincide con esa búsqueda.'),
      el('p', { class: 'small muted mt-3' }, 'Prueba con una palabra suelta: merma, caja, pliegue, aduana, margen.')));
    return;
  }
  refs.cuerpo.replaceChildren(...secciones);
}

function cuerpoTema(r) {
  const [tipo, dato, extra, extra2] = r;

  if (tipo === 'texto') return [el('p', {}, dato)];

  if (tipo === 'formula') {
    return [
      el('div', { class: 'formula', html: dato }),
      extra ? el('p', { class: 'mt-3' }, extra) : null,
    ].filter(Boolean);
  }

  if (tipo === 'pasos') {
    return [
      el('div', { class: 'stack stack-2' },
        ...dato.map((paso, i) => el('div', { class: 'paso' },
          el('span', { class: 'paso__n' }, i + 1),
          el('span', {}, paso)))),
      extra ? el('p', { class: 'mt-4' }, extra) : null,
    ].filter(Boolean);
  }

  if (tipo === 'lista') {
    return [
      el('ul', { class: 'stack stack-2', style: 'margin:0;padding-left:20px' },
        ...dato.map((x) => el('li', {}, x))),
      extra ? el('div', { class: 'mt-4' }, nota(extra, 'accent', 'info')) : null,
    ].filter(Boolean);
  }

  if (tipo === 'tabla') {
    const encabezados = extra ?? [];
    return [
      el('div', { class: 'tabla-wrap', style: 'margin-top:8px' },
        el('table', { class: 'tabla', style: 'min-width:0' },
          encabezados.length
            ? el('thead', {}, el('tr', {}, ...encabezados.map((h) => el('th', {}, h))))
            : null,
          el('tbody', {}, ...dato.map((fila) =>
            el('tr', {}, ...fila.map((celda, i) =>
              el('td', { style: i === 0 ? 'font-weight:500' : '' }, celda))))))),
      extra2 ? el('div', { class: 'mt-4' }, nota(extra2, 'accent', 'info')) : null,
    ].filter(Boolean);
  }

  return [el('p', {}, String(dato))];
}
