// Arranque, ruteo por hash y tutorial guiado.

import { el, $ } from './format.js';
import * as S from './state.js';
import { icono, avisar } from './ui.js';
// El tutorial, el asistente y la cotización de ejemplo solo existen cuando
// alguien los toca. Son 40 KB que no tienen por qué viajar a la obra.
const LLAVE_TOUR = 'fmp.tour.visto.v1';
const tourYaVisto = () => localStorage.getItem(LLAVE_TOUR) === '1';

// Las vistas se cargan cuando se entra a ellas, no en el arranque.
// Quien abre el medidor en la obra descarga el medidor, no el cotizador
// completo con su catálogo y su generador de PDF.

// La dirección pidió dos caminos, no una barra con nueve pestañas.
// El grupo decide qué se ve arriba: quien vino a cotizar no ve el reporte,
// y quien vino al reporte no ve el catálogo. Ajustes está siempre.
const GRUPOS = {
  cotizar: 'Cotización',
  ventas: 'Ventas',
};

const RUTAS = [
  { hash: '#/inicio',    etiqueta: 'Inicio',    grupo: null,      cargar: () => import('./views/inicio.js') },
  { hash: '#/medidor',   etiqueta: 'Medir',     grupo: 'cotizar', cargar: () => import('./views/medidor.js') },
  { hash: '#/cotizador', etiqueta: 'Cotizar',   grupo: 'cotizar', cargar: () => import('./views/cotizador.js') },
  { hash: '#/catalogo',  etiqueta: 'Catálogo',  grupo: 'cotizar', cargar: () => import('./views/catalogo.js') },
  { hash: '#/ayuda',     etiqueta: 'Ayuda',     grupo: 'cotizar', cargar: () => import('./views/ayuda.js') },
  { hash: '#/servicios', etiqueta: 'Servicios', grupo: 'cotizar', cargar: () => import('./views/servicios.js') },
  { hash: '#/ventas',    etiqueta: 'Reporte',   grupo: 'ventas',  cargar: () => import('./views/ventas.js') },
  { hash: '#/registrar', etiqueta: 'Registrar', grupo: 'ventas',  cargar: () => import('./views/registro.js') },
  { hash: '#/ahorro',    etiqueta: 'Tablero',   grupo: 'ventas',  cargar: () => import('./views/ahorro.js') },
  { hash: '#/ajustes',   etiqueta: 'Ajustes',   grupo: '*',       cargar: () => import('./views/ajustes.js') },
];

const vistas = new Map();
const traerVista = (ruta) => {
  if (!vistas.has(ruta.hash)) vistas.set(ruta.hash, ruta.cargar());
  return vistas.get(ruta.hash);
};

S.cargar();

const app = $('#app');
const empresa = S.obtener().config.empresa;

const nav = el('nav', { class: 'nav' });

/** La barra se rearma en cada navegación: solo trae el grupo en curso. */
function pintarNav(ruta) {
  const visibles = ruta.grupo
    ? RUTAS.filter((r) => r.grupo === ruta.grupo || r.grupo === '*')
    : RUTAS.filter((r) => r.grupo === '*');

  // replaceChildren convierte null en el texto "null": hay que filtrarlo antes.
  const etiquetaGrupo = ruta.grupo && ruta.grupo !== '*'
    ? [el('span', { class: 'nav__grupo' }, GRUPOS[ruta.grupo] ?? '')]
    : [];

  nav.replaceChildren(
    ...etiquetaGrupo,
    ...visibles.map((r) => el('button', {
      class: 'nav__item',
      dataset: { hash: r.hash },
      'aria-current': r.hash === ruta.hash ? 'page' : null,
      onclick: () => { location.hash = r.hash; },
    }, r.etiqueta)));
}

// --------------------------------------------------------------------------- tamaño de texto

// Tres niveles. Un interruptor de encendido y apagado obliga a adivinar qué hace;
// A menos y A más se entienden sin explicación y dejan elegir el punto cómodo.
const LLAVE_TAMANO = 'fmp.tamanoTexto';
const NIVELES = ['normal', 'grande', 'mayor'];

const nivelGuardado = () => {
  const v = localStorage.getItem(LLAVE_TAMANO);
  return NIVELES.includes(v) ? v : 'normal';
};

let nivelActual = nivelGuardado();

function aplicarTamano(nivel) {
  nivelActual = NIVELES.includes(nivel) ? nivel : 'normal';
  const raiz = document.documentElement;
  raiz.classList.remove('texto-grande', 'texto-mayor');
  if (nivelActual === 'grande') raiz.classList.add('texto-grande');
  if (nivelActual === 'mayor') raiz.classList.add('texto-mayor');
  localStorage.setItem(LLAVE_TAMANO, nivelActual);

  const i = NIVELES.indexOf(nivelActual);
  const menos = $('.js-menos');
  const mas = $('.js-mas');
  const etq = $('.js-tamano-etq');
  if (menos) menos.disabled = i === 0;
  if (mas) mas.disabled = i === NIVELES.length - 1;
  if (etq) etq.textContent = ['Normal', 'Grande', 'Mayor'][i];
}

const cambiarTamano = (paso) => {
  const i = NIVELES.indexOf(nivelActual);
  aplicarTamano(NIVELES[Math.min(Math.max(i + paso, 0), NIVELES.length - 1)]);
};

const controlTamano = el('div', { class: 'tamano', role: 'group', 'aria-label': 'Tamaño del texto' },
  el('button', {
    class: 'tamano__btn js-menos', title: 'Reducir el tamaño del texto',
    'aria-label': 'Reducir el tamaño del texto',
    onclick: () => cambiarTamano(-1),
  }, 'A', el('span', { class: 'tamano__signo' }, '−')),
  el('span', { class: 'tamano__etq js-tamano-etq' }, 'Normal'),
  el('button', {
    class: 'tamano__btn tamano__btn--mas js-mas', title: 'Agrandar el texto de toda la aplicación',
    'aria-label': 'Agrandar el texto de toda la aplicación',
    onclick: () => cambiarTamano(1),
  }, 'A', el('span', { class: 'tamano__signo' }, '+')));

const btnAsistente = el('button', {
  class: 'btn btn--sm js-asistente', 'aria-expanded': 'false',
  title: 'Resuelve dudas sobre cómo usar el cotizador',
  onclick: async () => {
    const { alternarAsistente } = await import('./asistente.js');
    alternarAsistente();
  },
}, icono('ayuda', 15), 'Dudas');

const btnTutorial = el('button', {
  class: 'btn btn--sm js-tutorial', title: 'Recorrido guiado por todas las funciones',
  onclick: () => arrancarTour(),
}, icono('ayuda', 15), 'Tutorial');

const iniciales = (empresa.nombre || 'Mundo de Interiores')
  .split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase();

const acciones = el('div', { class: 'topbar__acciones' }, controlTamano, btnAsistente, btnTutorial);

const topbar = el('header', { class: 'topbar' },
  el('a', { class: 'brand', href: '#/inicio', title: 'Volver a la portada' },
    el('span', { class: 'brand__mark' },
      empresa.logoDataUrl
        ? el('img', { src: empresa.logoDataUrl, style: 'width:100%;height:100%;object-fit:contain' })
        : iniciales),
    el('span', {},
      el('span', { class: 'brand__name', style: 'display:block' }, empresa.nombre),
      el('span', { class: 'brand__sub', style: 'display:block' }, 'Cotizador'))),
  nav,
  acciones);

// --------------------------------------------------------------------------- menú de hamburguesa

// En el teléfono no cabe la barra completa. Todo lo secundario vive aquí:
// las pantallas del grupo, el cambio de camino, el tamaño de texto y la ayuda.
const cajon = el('div', { class: 'cajon', id: 'cajon', 'aria-hidden': 'true' });
const velo = el('div', { class: 'velo', onclick: () => cerrarMenu() });

const btnMenu = el('button', {
  class: 'hamburguesa', 'aria-label': 'Abrir el menú', 'aria-expanded': 'false',
  'aria-controls': 'cajon',
  onclick: () => (document.body.classList.contains('menu-abierto') ? cerrarMenu() : abrirMenu()),
},
  el('span', { class: 'hamburguesa__lineas', 'aria-hidden': 'true' },
    el('i', {}), el('i', {}), el('i', {})));

topbar.append(btnMenu);

function abrirMenu() {
  document.body.classList.add('menu-abierto');
  cajon.setAttribute('aria-hidden', 'false');
  btnMenu.setAttribute('aria-expanded', 'true');
  cajon.querySelector('button, a')?.focus();
}

function cerrarMenu() {
  if (!document.body.classList.contains('menu-abierto')) return;
  document.body.classList.remove('menu-abierto');
  cajon.setAttribute('aria-hidden', 'true');
  btnMenu.setAttribute('aria-expanded', 'false');
}

// El cajón se arma una vez con huecos; nav y acciones se mudan a esos huecos
// en el teléfono y regresan a la barra en la computadora. Son los mismos
// nodos: duplicarlos dejaría dos controles de tamaño peleándose.
const cajonTitulo = el('span', { class: 'cajon__grupo' }, 'Menú');
const huecoNav = el('div', { class: 'cajon__lista' });
const huecoCambio = el('div', {});
const huecoAcciones = el('div', { class: 'cajon__pie' });

cajon.append(
  el('div', { class: 'cajon__cab' },
    cajonTitulo,
    el('button', { class: 'btn btn--ghost btn--icon', 'aria-label': 'Cerrar el menú', onclick: cerrarMenu },
      icono('cerrar', 16))),
  huecoNav,
  huecoCambio,
  huecoAcciones);

function pintarCajon(ruta) {
  cajonTitulo.textContent = ruta.grupo && ruta.grupo !== '*' ? GRUPOS[ruta.grupo] : 'Menú';

  const otro = ruta.grupo === 'ventas' ? 'cotizar' : 'ventas';
  huecoCambio.replaceChildren(
    ruta.grupo && ruta.grupo !== '*'
      ? el('button', {
          class: 'cajon__cambio',
          onclick: () => { location.hash = '#/inicio'; cerrarMenu(); },
        }, icono('capas', 15), `Cambiar a ${GRUPOS[otro]}`)
      : el('span', {}));
}

const esTelefono = window.matchMedia('(max-width: 900px)');

function acomodar() {
  if (esTelefono.matches) {
    huecoNav.append(nav);
    huecoAcciones.replaceChildren(
      el('span', { class: 'cajon__etq' }, 'Tamaño del texto'),
      acciones);
  } else {
    cerrarMenu();
    // Antes del botón de menú, que se queda al final y oculto en pantalla grande.
    topbar.insertBefore(nav, btnMenu);
    topbar.insertBefore(acciones, btnMenu);
  }
}

esTelefono.addEventListener('change', acomodar);
acomodar();

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarMenu(); });

const main = el('main', { class: 'main' });
app.append(topbar, velo, cajon, main);

// Si alguien navega dos veces seguidas, la carga lenta no debe pintar encima
// de la pantalla nueva. Solo el último viaje tiene derecho a dibujar.
let viaje = 0;

async function navegar() {
  // El hash puede traer parámetros: #/registrar?id=vta_123
  const hash = (location.hash || '#/inicio').split('?')[0];
  const ruta = RUTAS.find((r) => r.hash === hash) ?? RUTAS[0];
  const mio = ++viaje;

  pintarNav(ruta);
  pintarCajon(ruta);
  cerrarMenu();
  S.registrarVisita(ruta.etiqueta);

  main.replaceChildren();
  try {
    const vista = await traerVista(ruta);
    if (mio !== viaje) return;
    vista.render(main);
  } catch (err) {
    if (mio !== viaje) return;
    console.error(err);
    // Un módulo que no baja casi siempre es la red, no el código.
    vistas.delete(ruta.hash);
    main.append(el('div', { class: 'card' },
      el('h2', { class: 'title' }, 'No se pudo abrir esta pantalla'),
      el('p', { class: 'lead mt-3' },
        'Revisa la conexión y vuelve a intentar. Tus datos siguen guardados en este equipo.'),
      el('button', { class: 'btn btn--primary mt-4', onclick: navegar }, 'Reintentar'),
      el('pre', { class: 'formula mt-4' }, String(err?.stack ?? err))));
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
}

aplicarTamano(nivelGuardado());

window.addEventListener('hashchange', navegar);
// Las vistas piden un redibujo completo con este evento, en vez de recargar la página.
window.addEventListener('fmp:rerender', navegar);
navegar();

// --------------------------------------------------------------------------- tutorial

const irA = (hash) => new Promise((res) => {
  if (location.hash === hash) return res();
  location.hash = hash;
  setTimeout(res, 260);
});

const abrirAccion = (texto) => {
  const d = [...document.querySelectorAll('details.action')]
    .find((x) => x.querySelector('.action__title')?.textContent.includes(texto));
  if (d) d.open = true;
  return d;
};

async function arrancarTour() {
  const [{ iniciarTour }, { cargarEjemplo, hayDatosParaEjemplo }] =
    await Promise.all([import('./tour.js'), import('./demo.js')]);

  const pasos = [
    {
      titulo: 'Bienvenido',
      texto: 'Un recorrido de dos minutos por todo lo que hace la aplicación. ' +
             'Avanza con Siguiente o con las flechas del teclado. Puedes salir cuando quieras con Esc.',
      antes: () => irA('#/inicio'),
    },
    {
      titulo: 'Dos caminos, no doce pestañas',
      texto: 'La portada decide de entrada: o vienes a cotizar, o vienes a ver el mes. ' +
             'Cada tarjeta abre su propio menú, y el logotipo de arriba regresa aquí.',
      antes: () => irA('#/inicio'),
      selector: '.portada', posicion: 'abajo', espera: 260,
    },
    {
      titulo: 'Medir en obra, con puros números',
      texto: 'Sebastián captura cuarto por cuarto sin escribir una sola letra: 16.45,3.81,2.29 son tres áreas ' +
             'que se suman, 1.86(2) es esa medida dos veces, y el renglón del zoclo va aparte. ' +
             'El teclado de abajo es de la aplicación, no del teléfono. Arriba a la derecha se elige ' +
             'si se está midiendo con láser o con cinta.',
      antes: () => irA('#/medidor'),
      selector: '.view header', posicion: 'abajo', espera: 300,
    },
    {
      titulo: 'Cuartos de un toque, y fotos si hacen falta',
      texto: 'Recámara, cocina, escalera, patio: cada chip agrega el cuarto ya numerado, y el bote lo quita. ' +
             'Da igual si la casa trae tres cuartos o siete. Cada cuarto acepta fotos desde la cámara, ' +
             'y son opcionales: nadie tiene que fotografiar para poder cotizar.',
      selector: '.agregar', posicion: 'arriba', espera: 200,
    },
    {
      titulo: 'Todo empieza por el buscador',
      texto: 'Escribe varias palabras juntas y la búsqueda las combina: "encino 14 aceitado" llega a un solo material. ' +
             'También responde a medidas, colores y acabados.',
      selector: '.js-buscador .search', posicion: 'abajo',
      antes: () => irA('#/cotizador'),
    },
    {
      titulo: 'Filtros rápidos',
      texto: 'Las pastillas acotan por familia, especie, existencia e importación. ' +
             'Se combinan con lo que escribas arriba.',
      selector: '.js-buscador .pill-group', posicion: 'derecha',
    },
    {
      titulo: 'Los datos del cliente',
      texto: 'Nombre, contacto y obra salen impresos en el encabezado del PDF. ' +
             'El nombre es obligatorio: sin él la aplicación no genera la cotización.',
      antes: async () => { await irA('#/cotizador'); abrirAccion('cliente'); },
      selector: '.js-cliente', posicion: 'derecha',
    },
    {
      titulo: 'Así se ve una cotización real',
      texto: 'Cargamos un ejemplo de hotel con las cuatro familias: duela en espina de pescado, porcelanato, ' +
             'blackout hotelero y persianas. Fíjate en el detalle de cada partida.',
      antes: async () => {
        await irA('#/cotizador');
        if (!S.obtener().cotizacion.partidas.length && hayDatosParaEjemplo()) {
          cargarEjemplo();
          navegar();
          await new Promise((r) => setTimeout(r, 320));
        }
      },
      selector: '.js-partidas .linea', posicion: 'derecha', espera: 260,
    },
    {
      titulo: 'El desglose es el argumento de venta',
      texto: 'Abre "Ver desglose del cálculo" en cualquier partida. Ahí está la merma, el redondeo a caja completa, ' +
             'los accesorios y la mano de obra, con el número y el porqué. Eso es lo que hoy toma días de hoja de cálculo.',
      antes: async () => {
        const d = document.querySelector('.js-partidas .linea details');
        if (d) d.open = true;
        await new Promise((r) => setTimeout(r, 220));
      },
      selector: '.js-partidas .linea .desglose', posicion: 'derecha',
    },
    {
      titulo: 'El margen, en tiempo real',
      texto: 'El panel derecho muestra la utilidad mientras cotizas. Bajo 30% cambia a ámbar, bajo 25% a rojo. ' +
             'Nunca sale impreso: el cliente solo ve el precio final.',
      selector: '.js-resumen', posicion: 'izquierda',
    },
    {
      titulo: 'El PDF, en un clic',
      texto: 'Hasta tres páginas: propuesta con gráfica de inversión, anexo técnico y condiciones. ' +
             'Al terminar se abre el centro de envío con el mensaje ya escrito para correo o WhatsApp.',
      selector: '.js-pdf-lateral', posicion: 'izquierda',
    },
    {
      titulo: 'El reporte mensual de ventas',
      texto: 'Qué vendió cada asesor, de qué línea y color, en qué proporción, y cuánto está cobrado. ' +
             'Se compara tienda contra tienda: Santa Fe, Pedregal y la tercera. ' +
             'El desglose de todo el equipo lo abren Fernando, Melissa y Sebastián.',
      antes: () => irA('#/ventas'),
      selector: '.view header', posicion: 'abajo', espera: 300,
    },
    {
      titulo: 'Cotizar no es vender, y el color lo dice',
      texto: 'Ámbar mientras la cotización solo está enviada. Verde en cuanto entra el anticipo del 80%. ' +
             'Azul cuando queda liquidada, gris si no se concretó. El color cambia en el momento en que ' +
             'se captura el pago, y esta barra enseña cuánto del mes está en cada peldaño.',
      selector: '.semaforo', posicion: 'abajo', espera: 200,
    },
    {
      titulo: 'El catálogo completo',
      texto: 'Aquí vive todo lo que la empresa vende. Se busca igual que en el cotizador, y desde ' +
             '"Agregar producto" se da de alta un material nuevo en menos de un minuto.',
      antes: () => irA('#/catalogo'),
      selector: '.view header .row', posicion: 'abajo', espera: 260,
    },
    {
      titulo: 'El tablero de dirección',
      texto: 'Cuánto ha ahorrado la empresa, con qué margen se está cotizando y quién tocó cada precio. ' +
             'Los supuestos del cálculo son suyos y se editan ahí mismo.',
      antes: () => irA('#/ahorro'),
      selector: '.view header', posicion: 'abajo', espera: 260,
    },
    {
      titulo: 'Capacitación para el equipo',
      texto: 'Las fórmulas explicadas, qué recomendar según el proyecto, y los errores que cuestan dinero. ' +
             'Un asesor nuevo puede consultar aquí en vez de preguntar.',
      antes: () => irA('#/ayuda'),
      selector: '.view header', posicion: 'abajo', espera: 260,
    },
    {
      titulo: 'Qué incluye el servicio',
      texto: 'La lista completa de lo que hace la herramienta hoy y lo que entra en la Fase 2, ' +
             'sin letras chiquitas. Úsala cuando el equipo pregunte si algo se puede.',
      antes: () => irA('#/servicios'),
      selector: '.view header', posicion: 'abajo', espera: 260,
    },
    {
      titulo: 'Tu catálogo de Excel entra aquí',
      texto: 'Sube el .xlsx, la aplicación detecta las columnas y te enseña qué va a entrar antes de confirmar. ' +
             'También configuras aquí margen, IVA, tipo de cambio y tarifas de instalación.',
      antes: async () => { await irA('#/ajustes'); abrirAccion('Catálogo de productos'); },
      selector: '.js-importar', posicion: 'abajo', espera: 300,
    },
    {
      titulo: 'Si algo no queda claro, pregunta',
      texto: 'El botón Dudas abre un asistente con las preguntas más comunes ya respondidas. ' +
             'Si no tiene la respuesta, te pasa el WhatsApp de soporte en vez de inventar.',
      antes: () => irA('#/cotizador'),
      selector: '.js-asistente', posicion: 'abajo',
    },
    {
      titulo: 'Listo',
      texto: 'Puedes repetir este recorrido cuando quieras desde el botón Tutorial. ' +
             'Y si la letra se ve chica, los botones A menos y A más de arriba cambian el tamaño de toda la aplicación.',
      antes: () => irA('#/inicio'),
    },
  ];

  iniciarTour(pasos, {
    alTerminar: (completado) => {
      if (completado) avisar('Tutorial terminado. Está siempre disponible arriba.');
    },
  });
}

// Primera visita: ofrecer el tutorial sin bloquear.
if (!tourYaVisto()) {
  setTimeout(() => {
    if (!document.querySelector('.tour') && !document.querySelector('.modal')) arrancarTour();
  }, 900);
}

// --------------------------------------------------------------------------- atajos

document.addEventListener('keydown', (e) => {
  const enCampo = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? '');
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    if (location.hash !== '#/cotizador') location.hash = '#/cotizador';
    setTimeout(() => $('.search__input')?.focus(), 80);
  }
  if (e.key === '/' && !enCampo && !document.querySelector('.tour')) {
    e.preventDefault();
    $('.search__input')?.focus();
  }
});
