// Arranque, ruteo por hash y tutorial guiado.

import { el, $ } from './format.js';
import * as S from './state.js';
import { icono, avisar } from './ui.js';
import { iniciarTour, tourYaVisto } from './tour.js';
import { alternarAsistente, abrirAsistente } from './asistente.js';
import { cargarEjemplo, hayDatosParaEjemplo } from './demo.js';

import * as Cotizador from './views/cotizador.js';
import * as Catalogo from './views/catalogo.js';
import * as Ahorro from './views/ahorro.js';
import * as Servicios from './views/servicios.js';
import * as Ayuda from './views/ayuda.js';
import * as Ajustes from './views/ajustes.js';

const RUTAS = [
  { hash: '#/cotizador', etiqueta: 'Cotizar',   vista: Cotizador },
  { hash: '#/catalogo',  etiqueta: 'Catálogo',  vista: Catalogo },
  { hash: '#/ahorro',    etiqueta: 'Ahorro',    vista: Ahorro },
  { hash: '#/servicios', etiqueta: 'Servicios', vista: Servicios },
  { hash: '#/ayuda',     etiqueta: 'Ayuda',     vista: Ayuda },
  { hash: '#/ajustes',   etiqueta: 'Ajustes',   vista: Ajustes },
];

S.cargar();

const app = $('#app');
const empresa = S.obtener().config.empresa;

const nav = el('nav', { class: 'nav' },
  ...RUTAS.map((r) => el('button', {
    class: 'nav__item', dataset: { hash: r.hash },
    onclick: () => { location.hash = r.hash; },
  }, r.etiqueta)));

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
  onclick: () => alternarAsistente(),
}, icono('ayuda', 15), 'Dudas');

const btnTutorial = el('button', {
  class: 'btn btn--sm js-tutorial', title: 'Recorrido guiado por todas las funciones',
  onclick: () => arrancarTour(),
}, icono('ayuda', 15), 'Tutorial');

const iniciales = (empresa.nombre || 'Mundo de Interiores')
  .split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase();

const topbar = el('header', { class: 'topbar' },
  el('a', { class: 'brand', href: '#/cotizador' },
    el('span', { class: 'brand__mark' },
      empresa.logoDataUrl
        ? el('img', { src: empresa.logoDataUrl, style: 'width:100%;height:100%;object-fit:contain' })
        : iniciales),
    el('span', {},
      el('span', { class: 'brand__name', style: 'display:block' }, empresa.nombre),
      el('span', { class: 'brand__sub', style: 'display:block' }, 'Cotizador'))),
  nav,
  el('div', { class: 'topbar__acciones' }, controlTamano, btnAsistente, btnTutorial));

const main = el('main', { class: 'main' });
app.append(topbar, main);

function navegar() {
  const hash = location.hash || '#/cotizador';
  const ruta = RUTAS.find((r) => r.hash === hash) ?? RUTAS[0];

  for (const b of nav.children) {
    if (b.dataset.hash === ruta.hash) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  }

  S.registrarVisita(ruta.etiqueta);

  main.replaceChildren();
  try {
    ruta.vista.render(main);
  } catch (err) {
    console.error(err);
    main.append(el('div', { class: 'card' },
      el('h2', { class: 'title' }, 'Algo se rompió al dibujar esta pantalla'),
      el('p', { class: 'lead mt-3' }, 'Abre la consola del navegador para ver el detalle. Tus datos siguen guardados.'),
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

function arrancarTour() {
  const pasos = [
    {
      titulo: 'Bienvenido al cotizador',
      texto: 'Un recorrido de dos minutos por todo lo que hace la aplicación. ' +
             'Avanza con Siguiente o con las flechas del teclado. Puedes salir cuando quieras con Esc.',
      antes: () => irA('#/cotizador'),
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
      antes: () => irA('#/cotizador'),
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
