// Asistente de dudas.
//
// Importante y honesto: no es un modelo de lenguaje. No hay servidor, así que
// no hay a dónde mandar la pregunta. Es un buscador de respuestas sobre una base
// de conocimiento curada: reconoce la intención por palabras clave y devuelve la
// respuesta escrita por nosotros. Cuando no encuentra nada, ofrece el contacto
// directo en vez de inventar.

import { el, $, normalizar } from './format.js';
import { icono } from './ui.js';
import * as S from './state.js';

export const CONTACTO = {
  nombre: 'Cesar Castañón',
  email: 'cesar@castacu0.com',
  whatsapp: '55 7882 3635',
  whatsappE164: '5215578823635',
};

/**
 * Cada entrada: claves para reconocer la pregunta, la pregunta que se muestra
 * como sugerencia, y la respuesta. Se puede ampliar sin tocar el código.
 */
export const CONOCIMIENTO = [
  // ---------------------------------------------------------------- uso básico
  {
    tema: 'Uso',
    claves: 'como empiezo empezar primera cotizacion nueva arrancar inicio comienzo hago',
    p: '¿Cómo hago mi primera cotización?',
    r: 'Cuatro pasos. Uno: en la pestaña Cotizar, escribe el material en el buscador y haz clic en el resultado. Dos: captura los metros cuadrados o las medidas de la ventana. Tres: marca los accesorios que lleve, como zoclo o riel. Cuatro: presiona Generar PDF. El folio, la merma, las cajas y la fecha de entrega se calculan solos.',
  },
  {
    tema: 'Uso',
    claves: 'ejemplo demo prueba ver como se ve muestra',
    p: '¿Puedo ver un ejemplo antes de capturar algo?',
    r: 'Sí. En la pestaña Cotizar, el botón "Cargar ejemplo" arma una cotización completa de hotel con cuatro partidas en un clic. Sirve para conocer la herramienta sin capturar nada. Para borrarla, presiona "Nueva".',
  },
  {
    tema: 'Uso',
    claves: 'tutorial recorrido guia guiado aprender capacitar entrenar',
    p: '¿Hay un tutorial guiado?',
    r: 'Sí. El botón Tutorial, arriba a la derecha, hace un recorrido de catorce pasos por todas las pantallas. Se avanza con Siguiente o con las flechas del teclado y se sale con la tecla Esc. Se puede repetir las veces que quieras.',
  },
  {
    tema: 'Uso',
    claves: 'buscar buscador encontrar material producto no encuentro busqueda',
    p: '¿Cómo busco un material?',
    r: 'Escribe varias palabras juntas y la búsqueda las combina. "encino 14 aceitado" filtra por especie, espesor y acabado al mismo tiempo. También funciona en inglés: "roller shade" o "engineered oak" llegan al mismo producto. Si no aparece nada, quita una palabra o revisa que no tengas un filtro de familia activo.',
  },
  {
    tema: 'Uso',
    claves: 'texto grande letra chica pequena ver mal vista lentes agrandar zoom comodo',
    p: 'La letra se ve chica, ¿la puedo agrandar?',
    r: 'Sí. El botón "Texto grande" arriba a la derecha aumenta el tamaño de toda la aplicación y separa más los botones. Queda guardado para la próxima vez que entres. También funciona el zoom del navegador con Ctrl y la tecla más.',
  },
  {
    tema: 'Uso',
    claves: 'telefono celular movil tableta ipad funciona pantalla',
    p: '¿Funciona en el celular?',
    r: 'Sí, se adapta a la pantalla del teléfono y de la tableta. Para capturar una cotización completa se trabaja más cómodo en computadora, pero para consultar un precio o revisar el catálogo en casa del cliente funciona bien.',
  },

  // ---------------------------------------------------------------- cálculo
  {
    tema: 'Cálculo',
    claves: 'merma desperdicio sobra corte porque mas metros facturados plano',
    p: '¿Por qué factura más metros de los que pedí?',
    r: 'Por dos ajustes distintos. La merma cubre el material que se corta y se tira, entre 7% en colocación recta y 20% en chevron. El redondeo a caja completa existe porque el proveedor no vende media caja. En 120 m² de encino en espina de pescado, el área facturada sube a 142.78 m² en 59 cajas. Cotizar los 120 del plano regala esa diferencia.',
  },
  {
    tema: 'Cálculo',
    claves: 'patron colocacion espina pescado chevron diagonal recto damero cual elegir',
    p: '¿Qué cambia según el patrón de colocación?',
    r: 'Cambian dos cosas: la merma y la mano de obra. Recto 7% y factor 1.00. Damero 10% y 1.15. Diagonal 12% y 1.25. Espina de pescado 18% y 1.60. Chevron 20% y 1.75. Un cliente que pide espina sobre una cotización hecha en recto está viendo un precio que no existe. Siempre hay que preguntarlo antes de cotizar.',
  },
  {
    tema: 'Cálculo',
    claves: 'cortina tela pliegue metros paños ancho rollo cuanta',
    p: '¿Cómo se calcula la tela de una cortina?',
    r: 'Se multiplica el ancho de la ventana por el pliegue. Con pliegue hotelero de 2.5x, una ventana de 3.20 m necesita 8 m de tela. Después importa el ancho del rollo: si el rollo cubre la caída, se corta al ancho y no lleva costuras. Si el rollo es angosto, se unen paños verticales y el consumo se puede duplicar. La aplicación decide el método y te dice por qué.',
  },
  {
    tema: 'Cálculo',
    claves: 'pliegue fullness bajar 2.5 3.0 hotelero cuanto',
    p: '¿Qué pliegue recomiendo?',
    r: 'En hotelería, 2.5x es el mínimo aceptable y en suites se usa 3.0x. Bajar a 1.8x abarata la cotización cerca de 28%, pero la cortina cerrada se ve tensa y barata, y eso sale en la foto del cuarto. Si el cliente pide bajar el precio, conviene cambiar la tela antes que el pliegue.',
  },
  {
    tema: 'Cálculo',
    claves: 'persiana chica minimo area por que cuesta igual pequeña',
    p: '¿Por qué una persiana chica cuesta como una de un metro?',
    r: 'Porque el fabricante cobra un área mínima por pieza, normalmente 1 m². Cortar, ensamblar y empacar una persiana de 0.60 por 0.80 cuesta casi lo mismo que una grande. La aplicación aplica el mínimo sola y lo señala en el desglose para que puedas explicarlo con el número enfrente.',
  },
  {
    tema: 'Cálculo',
    claves: 'toldo pergola exterior minimo area salida proyeccion',
    p: '¿Cómo se cotiza un toldo o una pérgola?',
    r: 'Por área de sombra: ancho por salida en el toldo, ancho por fondo en la pérgola. El mínimo facturable es de 4 m² por equipo porque la estructura y el anclaje cuestan casi lo mismo en un equipo chico. La motorización y el sensor de viento se cobran por equipo, no por metro.',
  },
  {
    tema: 'Cálculo',
    claves: 'margen markup utilidad 35 por ciento ganancia calcular',
    p: '¿Margen y markup son lo mismo?',
    r: 'No, y confundirlos cuesta dinero. Sobre 100,000 pesos de costo, un 35% de margen da un precio de 153,846. Aplicado como multiplicador sobre el costo da 135,000. Son 18,846 pesos de diferencia por obra. La aplicación trabaja con margen real y te muestra el multiplicador equivalente para que compares con tus listas viejas.',
  },
  {
    tema: 'Cálculo',
    claves: 'zoclo perimetro cuanto lineal moldura',
    p: '¿Cómo calcula el zoclo si no tengo el perímetro?',
    r: 'Lo estima a partir del área, asumiendo una planta rectangular, y descuenta 8% por los vanos de puerta. Sirve para dar un número por teléfono. Para cerrar la venta hay que capturar el perímetro real: un pasillo de 40 m² tiene mucho más perímetro que una sala cuadrada de 40 m². Cuando el número es estimado, el desglose lo dice.',
  },
  {
    tema: 'Cálculo',
    claves: 'ambientes cuartos medir largo ancho sumar area',
    p: 'Solo tengo las medidas de cada cuarto, ¿qué hago?',
    r: 'Dentro de la partida, abre "Calcular el área midiendo ambiente por ambiente". Capturas largo por ancho de cada espacio y la suma llena la superficie y el perímetro automáticamente.',
  },

  // ---------------------------------------------------------------- entrega
  {
    tema: 'Entrega',
    claves: 'entrega fecha cuando llega tiempo dias importado aduana transito',
    p: '¿Cómo calcula la fecha de entrega?',
    r: 'Producto nacional: los días que da el proveedor. Producto importado: días de fábrica más tránsito marítimo más despacho aduanal, que por defecto son 35 y 7 días. La partida más lenta define la fecha de toda la obra. El plazo corre desde que entra el anticipo, no desde que mandas la cotización.',
  },
  {
    tema: 'Entrega',
    claves: 'competencia otro proveedor dos semanas mas rapido barato',
    p: 'El cliente dice que otro se lo entrega en dos semanas',
    r: 'Casi siempre significa una de tres cosas: es material nacional equivalente, es un lote que ya está en aduana, o le van a surtir lo que haya en existencia con riesgo de mezclar lotes. Un piso instalado con dos lotes distintos se nota en el tono y la reclamación llega a los tres meses. Ofrece la alternativa nacional con nombre y precio, no discutas el plazo.',
  },
  {
    tema: 'Entrega',
    claves: 'tipo cambio dolar precio sube importado moneda',
    p: '¿Por qué cambia el precio de lo importado?',
    r: 'Porque el costo está en dólares y la cotización se emite en pesos mexicanos. La aplicación convierte con el tipo de cambio configurado en Ajustes. Conviene actualizarlo cada lunes. El PDF ya dice que el precio de importado está sujeto al tipo de cambio del día de la orden.',
  },

  // ---------------------------------------------------------------- catálogo
  {
    tema: 'Catálogo',
    claves: 'agregar producto nuevo material alta dar de alta capturar',
    p: '¿Cómo doy de alta un material nuevo?',
    r: 'En la pestaña Catálogo, botón "Agregar producto". Lo único obligatorio es nombre, familia y precio de costo. Todo lo demás afina el cálculo y enriquece el PDF. Si es piso, el dato más importante es el rendimiento por caja en metros cuadrados: sin él no hay redondeo a caja completa.',
  },
  {
    tema: 'Catálogo',
    claves: 'excel importar cargar catalogo xlsx csv subir archivo',
    p: '¿Cómo cargo mi catálogo desde Excel?',
    r: 'Ajustes, luego "Importar catálogo". Acepta .xlsx, .xls y .csv. Lee las columnas por el encabezado, te deja corregir la correspondencia y te muestra cuántos productos entran y cuáles se descartan antes de confirmar. Puedes reemplazar todo el catálogo o fusionarlo por SKU. Tu Excel no cambia ni se sube a ningún lado.',
  },
  {
    tema: 'Catálogo',
    claves: 'subieron precios cambiar todos masivo porcentaje aumento lista proveedor',
    p: 'El proveedor subió precios, ¿los cambio uno por uno?',
    r: 'No hace falta. En Catálogo, el botón "Cambiar precios" ajusta una familia completa o todo el catálogo por porcentaje. Te muestra cuántos materiales se afectan y un ejemplo del precio nuevo antes de aplicar. Cada cambio queda en la bitácora con tu nombre.',
  },
  {
    tema: 'Catálogo',
    claves: 'ingles nombre traduccion como se dice keyword',
    p: '¿Los materiales tienen su nombre en inglés?',
    r: 'Sí. Cada material trae el nombre con el que se le conoce en inglés, entre paréntesis, y también sirve para buscar. Es útil con proveedor extranjero y con arquitectos que trabajan con fichas técnicas en inglés.',
  },

  // ---------------------------------------------------------------- datos
  {
    tema: 'Datos',
    claves: 'respaldo backup guardar copia perder informacion seguridad json',
    p: '¿Cómo protejo mi catálogo?',
    r: 'Con el botón "Guardar respaldo", que descarga un archivo con todo: catálogo, precios, ajustes, historial y bitácora. Guárdalo en una carpeta o mándatelo por correo. Hazlo cada vez que cambien precios. Si se formatea la computadora o alguien limpia el navegador, ese archivo es lo único que recupera la información.',
  },
  {
    tema: 'Datos',
    claves: 'donde se guarda nube servidor internet datos otra computadora comparten',
    p: '¿Dónde se guardan los datos?',
    r: 'En el navegador de esa computadora, no en un servidor. Eso significa que el catálogo que cargue una persona no lo ven las demás, y que si se limpian los datos del navegador se pierde. Para que los diez usuarios compartan el mismo catálogo hace falta la versión con base de datos, que es la Fase 2.',
  },
  {
    tema: 'Datos',
    claves: 'quien cambio precio bitacora registro actividad historial auditoria',
    p: '¿Puedo ver quién cambió un precio?',
    r: 'Sí, en la pestaña Ahorro está la bitácora. Registra quién dio de alta un material, quién cambió un precio y de cuánto a cuánto, quién importó catálogo y quién emitió cada cotización. También hay registro de actividad: quién entró y a qué pantalla. Se exporta a CSV. Es atribución por el nombre capturado en Ajustes, no control de acceso con contraseña.',
  },
  {
    tema: 'Datos',
    claves: 'sin internet offline conexion funciona',
    p: '¿Funciona sin internet?',
    r: 'Sí, una vez cargada la página. El cálculo y el PDF corren en la computadora. Solo la primera carga necesita conexión.',
  },

  // ---------------------------------------------------------------- comercial
  {
    tema: 'Comercial',
    claves: 'descuento cuanto bajar precio caro cliente pide rebaja',
    p: 'El cliente pide descuento, ¿hasta dónde bajo?',
    r: 'El panel derecho muestra el margen en tiempo real. Bajo 30% cambia a ámbar y bajo 25% a rojo. Si queda por debajo del costo, la aplicación pide confirmación antes de generar el PDF. Antes de mover el precio, prueba cambiar la especificación: bajar de 14 a 12 mm, o de roble europeo a encino nacional, sostiene el margen y baja el total. Un descuento de 10% sobre 35% de margen lo deja en 27.8%.',
  },
  {
    tema: 'Comercial',
    claves: 'cliente ve margen costo utilidad imprime pdf secreto',
    p: '¿El cliente ve mi margen en el PDF?',
    r: 'No. El PDF solo muestra precio unitario, importe, subtotal, IVA y total en pesos mexicanos. El costo, el margen y la utilidad se quedan en la aplicación y nunca se imprimen.',
  },
  {
    tema: 'Comercial',
    claves: 'seguimiento mensaje whatsapp correo enviar plantilla no contesta',
    p: '¿Cómo le doy seguimiento a una cotización?',
    r: 'Al generar el PDF se abre el centro de envío con nueve plantillas ya escritas: envío, seguimiento a tres y a siete días, alternativas por precio, aviso de vencimiento, confirmación de anticipo, material en tránsito, agendar instalación y cierre con solicitud de reseña. Se editan antes de mandarlas por correo o WhatsApp.',
  },
  {
    tema: 'Comercial',
    claves: 'pdf paginas correo adjuntar mandar enviar cotizacion cliente',
    p: '¿Cómo le mando el PDF al cliente?',
    r: 'El PDF se descarga a tu computadora al presionar Generar PDF. Después, desde el centro de envío, eliges correo o WhatsApp: se abre con el mensaje ya escrito y tú adjuntas el archivo descargado. El navegador no puede adjuntarlo solo por seguridad.',
  },
  {
    tema: 'Comercial',
    claves: 'hotel hoteleria requisitos retardante flama blackout norma',
    p: '¿Qué exige un hotel que una casa no?',
    r: 'Certificado de retardancia de flama NFPA 701 en toda la cortinería, blackout real del cien por ciento y no dimout, pliegue de 2.5x mínimo, capa de uso de 30 mil o más en piso vinílico de pasillos, y el mismo lote para todas las habitaciones. Conviene pedir el material completo de una sola vez.',
  },

  // ---------------------------------------------------------------- producto
  {
    tema: 'Producto',
    claves: 'capa noble espesor 9mm 14mm cual recomiendo diferencia relijar',
    p: '¿Qué diferencia hay entre 9 mm y 14 mm?',
    r: 'La capa noble, que es el espesor de madera real encima del contrachapado. Con 0.6 mm no se relija nunca, con 2.5 mm una vez, con 3 a 4 mm dos o tres veces. Los dos se ven igual el día de la instalación; a los quince años uno se cambia y el otro se relija. Ese es el argumento de venta del espesor, no el espesor en sí.',
  },
  {
    tema: 'Producto',
    claves: 'aceitado barnizado cual mejor acabado mantenimiento',
    p: '¿Aceitado o barnizado?',
    r: 'El aceitado se siente a madera natural y se repara puntualmente en sitio, sin sacar muebles, pero pide aceite cada 18 a 24 meses. El barnizado tiene una capa encima, resiste más la mancha y no pide mantenimiento hasta el relijado, pero una reparación obliga a relijar el paño completo. En residencia de alto nivel se vende el aceitado; en hotel de alto tránsito conviene el barnizado UV.',
  },
  {
    tema: 'Producto',
    claves: 'spc laminado madera cual recomiendo bano cocina humedad impermeable',
    p: '¿Qué piso recomiendo para baño o cocina?',
    r: 'SPC, que es el único cien por ciento impermeable. El laminado no lo es aunque el proveedor diga hidrorresistente: resiste un derrame limpiado a tiempo, no una fuga. Para exterior o alberca, deck WPC o porcelanato antiderrapante R11.',
  },
  {
    tema: 'Producto',
    claves: 'pino encino roble diferencia madera dura blanda marca',
    p: '¿Cuál es la diferencia entre pino, encino y roble?',
    r: 'El pino es madera blanda: marca con el tacón de una silla y hasta con la uña. Se vende por precio y hay que advertirle al cliente que se va a marcar. Encino y roble son duras, con veta abierta, y aguantan tránsito. Entre encino y roble la diferencia es sobre todo de tono y disponibilidad: el roble europeo llega en formatos más anchos y largos, por eso cuesta más y tarda más.',
  },

  // ---------------------------------------------------------------- soporte
  {
    tema: 'Soporte',
    claves: 'error falla no funciona problema truena roto ayuda soporte contacto quien',
    p: 'Algo no funciona, ¿a quién le hablo?',
    r: `Escríbele a ${CONTACTO.nombre}: WhatsApp ${CONTACTO.whatsapp} o correo ${CONTACTO.email}. Si puedes, manda una captura de pantalla y dinos qué estabas haciendo cuando pasó. Antes de reportar, prueba recargar la página: en la mayoría de los casos se resuelve y no se pierde nada porque los datos quedan guardados.`,
  },
  {
    tema: 'Soporte',
    claves: 'perdi datos borro desaparecio catalogo recuperar',
    p: 'Se me borró el catálogo, ¿lo recupero?',
    r: `Si tienes un archivo de respaldo, sí: Ajustes, "Restaurar respaldo", y eliges el archivo. Si nunca hiciste respaldo, no hay de dónde recuperarlo, porque los datos viven solo en esa computadora. Escríbele a ${CONTACTO.nombre} al ${CONTACTO.whatsapp} antes de hacer cualquier otra cosa.`,
  },
  {
    tema: 'Soporte',
    claves: 'nueva funcion pedir sugerencia cambiar pdf agregar familia',
    p: '¿Puedo pedir un cambio o una función nueva?',
    r: `Sí, eso entra en el soporte mensual: cambios al PDF, familias de producto nuevas, ajustes de tarifas. Escríbele a ${CONTACTO.nombre} al WhatsApp ${CONTACTO.whatsapp} o al correo ${CONTACTO.email} con lo que necesitas.`,
  },
];

// ---------------------------------------------------------------------------
// Búsqueda de la respuesta
// ---------------------------------------------------------------------------

const PARO = new Set(['que', 'como', 'para', 'por', 'con', 'los', 'las', 'del', 'una', 'uno',
  'the', 'and', 'mas', 'muy', 'pero', 'este', 'esta', 'esto', 'cual', 'cuando', 'donde',
  'hay', 'son', 'ser', 'estoy', 'tengo', 'puedo', 'quiero', 'sobre', 'todo', 'todos']);

/** Devuelve las mejores coincidencias, o [] si ninguna es suficientemente buena. */
export function responder(consulta, limite = 3) {
  const tokens = normalizar(consulta).split(' ')
    .filter((t) => t.length >= 3 && !PARO.has(t));
  if (!tokens.length) return [];

  const puntuadas = CONOCIMIENTO.map((e) => {
    const heno = normalizar(`${e.claves} ${e.p} ${e.tema}`);
    const enPregunta = normalizar(e.p);
    let puntaje = 0;
    for (const t of tokens) {
      if (enPregunta.includes(t)) puntaje += 3;
      else if (heno.includes(t)) puntaje += 2;
      // Coincidencia parcial: "cortinas" contra la clave "cortina".
      else if (t.length >= 5 && heno.includes(t.slice(0, -1))) puntaje += 1;
    }
    return { entrada: e, puntaje };
  }).filter((x) => x.puntaje >= 3);

  puntuadas.sort((a, b) => b.puntaje - a.puntaje);
  return puntuadas.slice(0, limite).map((x) => x.entrada);
}

export const TEMAS = [...new Set(CONOCIMIENTO.map((e) => e.tema))];

// ---------------------------------------------------------------------------
// Interfaz
// ---------------------------------------------------------------------------

let panel = null;

export function alternarAsistente() {
  if (panel) return cerrarAsistente();
  abrirAsistente();
}

export function cerrarAsistente() {
  panel?.remove();
  panel = null;
  $('.js-asistente')?.setAttribute('aria-expanded', 'false');
}

export function abrirAsistente(preguntaInicial = '') {
  cerrarAsistente();
  S.registrarVisita('Asistente');

  const hilo = el('div', { class: 'chat__hilo' });
  const entrada = el('input', {
    class: 'input', type: 'text', placeholder: 'Escribe tu duda y presiona Enter',
    autocomplete: 'off', 'aria-label': 'Escribe tu duda',
  });

  const burbuja = (quien, ...contenido) =>
    el('div', { class: `chat__msg chat__msg--${quien}` }, ...contenido);

  const irAlFinal = () => { hilo.scrollTop = hilo.scrollHeight; };

  const sugerir = (entradas) =>
    el('div', { class: 'chat__sugerencias' },
      ...entradas.map((e) => el('button', {
        class: 'chat__chip', type: 'button',
        onclick: () => preguntar(e.p),
      }, e.p)));

  function contactoDirecto() {
    return el('div', { class: 'chat__contacto' },
      el('p', { class: 'small' },
        'Esa no la tengo cargada. Pregúntale directo a ', el('strong', {}, CONTACTO.nombre), ':'),
      el('div', { class: 'row row--tight mt-3' },
        el('a', {
          class: 'btn btn--sm', target: '_blank', rel: 'noopener',
          href: `https://wa.me/${CONTACTO.whatsappE164}?text=${encodeURIComponent(
            `Hola ${CONTACTO.nombre}, tengo una duda del cotizador: ${entrada.value || ''}`)}`,
        }, 'WhatsApp ' + CONTACTO.whatsapp),
        el('a', { class: 'btn btn--sm', href: `mailto:${CONTACTO.email}` }, CONTACTO.email)));
  }

  function preguntar(texto) {
    const q = String(texto || '').trim();
    if (!q) return;
    entrada.value = '';
    hilo.append(burbuja('yo', el('p', {}, q)));
    irAlFinal();

    setTimeout(() => {
      const hits = responder(q);
      if (!hits.length) {
        hilo.append(burbuja('bot',
          el('p', {}, 'No encontré una respuesta cargada para eso.'),
          contactoDirecto()));
      } else {
        const [mejor, ...otras] = hits;
        hilo.append(burbuja('bot',
          el('p', { class: 'chat__tema' }, mejor.tema),
          el('p', {}, mejor.r),
          otras.length
            ? el('div', {},
                el('p', { class: 'tiny mt-3' }, 'También puede servirte:'),
                sugerir(otras))
            : null));
      }
      irAlFinal();
    }, 220);
  }

  entrada.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); preguntar(entrada.value); }
  });

  // Saludo con las preguntas más frecuentes
  const frecuentes = ['¿Cómo hago mi primera cotización?', '¿Por qué factura más metros de los que pedí?',
    '¿Cómo protejo mi catálogo?', 'La letra se ve chica, ¿la puedo agrandar?']
    .map((p) => CONOCIMIENTO.find((e) => e.p === p)).filter(Boolean);

  hilo.append(burbuja('bot',
    el('p', {}, 'Hola. Respondo dudas sobre cómo usar el cotizador, cómo calcula y qué recomendar.'),
    el('p', { class: 'tiny mt-3' },
      'Respondo con la información cargada en la aplicación, no invento. Si no la tengo, te paso el contacto directo.'),
    el('p', { class: 'small mt-4' }, 'Las más preguntadas:'),
    sugerir(frecuentes)));

  panel = el('div', { class: 'chat', role: 'dialog', 'aria-label': 'Asistente de dudas' },
    el('div', { class: 'chat__cabeza' },
      el('span', { class: 'chat__punto' }),
      el('div', { style: 'flex:1;min-width:0' },
        el('p', { style: 'font-weight:600;font-size:14.5px' }, 'Asistente'),
        el('p', { class: 'tiny' }, `${CONOCIMIENTO.length} respuestas cargadas`)),
      el('button', { class: 'btn btn--ghost btn--icon', 'aria-label': 'Cerrar asistente',
                     onclick: cerrarAsistente }, icono('cerrar', 16))),
    hilo,
    el('div', { class: 'chat__pie' },
      entrada,
      el('button', { class: 'btn btn--primary btn--sm', onclick: () => preguntar(entrada.value) },
        'Preguntar')));

  document.body.append(panel);
  $('.js-asistente')?.setAttribute('aria-expanded', 'true');
  setTimeout(() => entrada.focus(), 80);

  if (preguntaInicial) preguntar(preguntaInicial);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && panel && !document.querySelector('.modal')) cerrarAsistente();
});
