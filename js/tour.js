// Tutorial guiado. Ilumina el elemento, explica qué hace y avanza.
// Se puede abandonar en cualquier momento con Esc.

import { el, $ } from './format.js';
import { icono } from './ui.js';

let estado = null;

const LLAVE_VISTO = 'fmp.tour.visto.v1';

export const tourYaVisto = () => localStorage.getItem(LLAVE_VISTO) === '1';
export const marcarTourVisto = () => localStorage.setItem(LLAVE_VISTO, '1');

/**
 * paso = {
 *   titulo, texto, selector?, posicion?: 'abajo'|'arriba'|'izquierda'|'derecha'|'centro',
 *   antes?: async () => void,   // prepara la pantalla (navegar, abrir un panel)
 *   espera?: number,            // ms a esperar tras `antes`
 * }
 */
export function iniciarTour(pasos, { alTerminar } = {}) {
  cerrarTour();

  const capa = el('div', { class: 'tour' });
  const foco = el('div', { class: 'tour__foco' });
  const globo = el('div', { class: 'tour__globo', role: 'dialog', 'aria-live': 'polite' });
  capa.append(foco, globo);
  document.body.append(capa);

  estado = { pasos, i: 0, capa, foco, globo, alTerminar };

  document.addEventListener('keydown', teclado);
  window.addEventListener('resize', reposicionar);
  window.addEventListener('scroll', reposicionar, true);

  mostrar(0);
}

export function cerrarTour({ completado = false } = {}) {
  if (!estado) return;
  document.removeEventListener('keydown', teclado);
  window.removeEventListener('resize', reposicionar);
  window.removeEventListener('scroll', reposicionar, true);
  estado.capa.remove();
  const cb = estado.alTerminar;
  estado = null;
  marcarTourVisto();
  cb?.(completado);
}

function teclado(e) {
  if (!estado) return;
  if (e.key === 'Escape') { e.stopPropagation(); cerrarTour(); }
  if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); avanzar(1); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); avanzar(-1); }
}

function avanzar(delta) {
  if (!estado) return;
  const siguiente = estado.i + delta;
  if (siguiente < 0) return;
  if (siguiente >= estado.pasos.length) return cerrarTour({ completado: true });
  mostrar(siguiente);
}

async function mostrar(indice) {
  if (!estado) return;
  estado.i = indice;
  const paso = estado.pasos[indice];

  estado.globo.style.opacity = '0';

  if (paso.antes) {
    try { await paso.antes(); } catch (err) { console.warn('Paso del tour falló:', err); }
  }
  await new Promise((r) => setTimeout(r, paso.espera ?? 120));
  if (!estado || estado.i !== indice) return;

  const destino = paso.selector ? $(paso.selector) : null;
  if (destino) {
    destino.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise((r) => setTimeout(r, 260));
  }
  if (!estado || estado.i !== indice) return;

  pintarGlobo(paso, indice);
  reposicionar();
  estado.globo.style.opacity = '1';
}

function pintarGlobo(paso, indice) {
  const total = estado.pasos.length;
  const ultimo = indice === total - 1;

  estado.globo.replaceChildren(
    el('div', { class: 'tour__barra' },
      el('div', { class: 'tour__barra-fill', style: `width:${((indice + 1) / total) * 100}%` })),
    el('div', { class: 'tour__cuerpo' },
      el('div', { class: 'row', style: 'justify-content:space-between;align-items:flex-start;gap:12px' },
        el('span', { class: 'eyebrow' }, `Paso ${indice + 1} de ${total}`),
        el('button', { class: 'tour__x', 'aria-label': 'Salir del tutorial', onclick: () => cerrarTour() },
          icono('cerrar', 14))),
      el('h3', { class: 'tour__titulo' }, paso.titulo),
      el('p', { class: 'tour__texto' }, paso.texto),
      el('div', { class: 'tour__pie' },
        indice > 0
          ? el('button', { class: 'btn btn--ghost btn--sm', onclick: () => avanzar(-1) }, 'Atrás')
          : el('button', { class: 'btn btn--ghost btn--sm', onclick: () => cerrarTour() }, 'Saltar'),
        el('span', { class: 'spacer' }),
        el('button', { class: 'btn btn--primary btn--sm', onclick: () => avanzar(1) },
          ultimo ? 'Terminar' : 'Siguiente',
          ultimo ? null : icono('chevron', 13, 2)))));
}

function reposicionar() {
  if (!estado) return;
  const paso = estado.pasos[estado.i];
  const destino = paso.selector ? $(paso.selector) : null;
  const { foco, globo } = estado;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const gw = globo.offsetWidth || 340;
  const gh = globo.offsetHeight || 190;
  const margen = 14;

  if (!destino) {
    // Sin objetivo: se atenúa la pantalla completa dejando el recuadro en cero.
    foco.style.opacity = '1';
    foco.style.left = `${vw / 2}px`;
    foco.style.top = `${vh / 2}px`;
    foco.style.width = '0px';
    foco.style.height = '0px';
    globo.style.left = `${(vw - gw) / 2}px`;
    globo.style.top = `${Math.max(80, (vh - gh) / 2)}px`;
    return;
  }

  const r = destino.getBoundingClientRect();
  const pad = 8;
  foco.style.opacity = '1';
  foco.style.left = `${r.left - pad}px`;
  foco.style.top = `${r.top - pad}px`;
  foco.style.width = `${r.width + pad * 2}px`;
  foco.style.height = `${r.height + pad * 2}px`;

  const pos = paso.posicion ?? 'abajo';
  let left, top;

  if (pos === 'derecha' && r.right + gw + margen < vw) {
    left = r.right + margen; top = r.top;
  } else if (pos === 'izquierda' && r.left - gw - margen > 0) {
    left = r.left - gw - margen; top = r.top;
  } else if (pos === 'arriba' && r.top - gh - margen > 0) {
    left = r.left; top = r.top - gh - margen;
  } else if (r.bottom + gh + margen < vh) {
    left = r.left; top = r.bottom + margen;
  } else if (r.top - gh - margen > 0) {
    left = r.left; top = r.top - gh - margen;
  } else {
    left = r.left; top = Math.max(margen, vh - gh - margen);
  }

  globo.style.left = `${Math.min(Math.max(margen, left), vw - gw - margen)}px`;
  globo.style.top = `${Math.min(Math.max(margen, top), vh - gh - margen)}px`;
}
