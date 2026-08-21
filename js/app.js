// Arranque, ruteo por hash y tutorial guiado.

import { el, $ } from './format.js';
import * as S from './state.js';
import { icono, avisar } from './ui.js';
import { iniciarTour, tourYaVisto } from './tour.js';
import { cargarEjemplo, hayDatosParaEjemplo } from './demo.js';

import * as Cotizador from './views/cotizador.js';
import * as Catalogo from './views/catalogo.js';
import * as Ayuda from './views/ayuda.js';
import * as Ajustes from './views/ajustes.js';

const RUTAS = [
  { hash: '#/cotizador', etiqueta: 'Cotizar',  vista: Cotizador },
  { hash: '#/catalogo',  etiqueta: 'Catálogo', vista: Catalogo },
  { hash: '#/ayuda',     etiqueta: 'Ayuda',    vista: Ayuda },
  { hash: '#/ajustes',   etiqueta: 'Ajustes',  vista: Ajustes },
];

S.cargar();

const app = $('#app');
const empresa = S.obtener().config.empresa;

const nav = el('nav', { class: 'nav' },
  ...RUTAS.map((r) => el('button', {
    class: 'nav__item', dataset: { hash: r.hash },
    onclick: () => { location.hash = r.hash; },
  }, r.etiqueta)));

const btnTutorial = el('button', {
  class: 'btn btn--sm js-tutorial', title: 'Recorrido guiado por todas las funciones',
  onclick: () => arrancarTour(),
}, icono('ayuda', 15), 'Tutorial');

const iniciales = (empresa.nombre || 'FMP')
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
  btnTutorial);

const main = el('main', { class: 'main' });
app.append(topbar, main);

function navegar() {
  const hash = location.hash || '#/cotizador';
  const ruta = RUTAS.find((r) => r.hash === hash) ?? RUTAS[0];

  for (const b of nav.children) {
    if (b.dataset.hash === ruta.hash) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  }

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
      texto: 'Dos páginas exactas: propuesta con gráfica de inversión, y anexo con especificaciones, ' +
             'tiempos de entrega, esquema de pago y condiciones. Listo para enviar.',
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
      titulo: 'Capacitación para el equipo',
      texto: 'Las fórmulas explicadas, qué recomendar según el proyecto, y los errores que cuestan dinero. ' +
             'Un asesor nuevo puede consultar aquí en vez de preguntar.',
      antes: () => irA('#/ayuda'),
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
      titulo: 'Listo',
      texto: 'Puedes repetir este recorrido cuando quieras desde el botón Tutorial, arriba a la derecha. ' +
             'Si algo no queda claro, la sección Ayuda tiene buscador propio.',
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
