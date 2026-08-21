// Componentes compartidos: iconos, modal, toast, disclosure, campos.

import { el, $ } from './format.js';

// --------------------------------------------------------------------------- iconos

const SVG = {
  chevron:  '<path d="M4 6.5L9 11.5L14 6.5"/>',
  buscar:   '<circle cx="8.5" cy="8.5" r="5.5"/><path d="M12.6 12.6L16.5 16.5"/>',
  mas:      '<path d="M9 3.5V14.5M3.5 9H14.5"/>',
  pdf:      '<path d="M5 2.5h5l4 4v11h-9z"/><path d="M10 2.5v4h4"/><path d="M7 11h4M7 13.5h4"/>',
  basura:   '<path d="M4 5.5h10M7.5 5.5V4h3v1.5M5.5 5.5l.6 10h5.8l.6-10"/>',
  editar:   '<path d="M12.5 3.5l2 2-8 8-2.6.6.6-2.6z"/>',
  regla:    '<rect x="2.5" y="6" width="13" height="6" rx="1"/><path d="M6 6v2.4M9 6v3.2M12 6v2.4"/>',
  capas:    '<path d="M9 2.5l6.5 3.4L9 9.3 2.5 5.9z"/><path d="M2.5 9.4L9 12.8l6.5-3.4"/><path d="M2.5 12.6L9 16l6.5-3.4"/>',
  cortina:  '<path d="M3 2.5h12M5 2.5v13c1.6 0 1.6-1.4 3.2-1.4M13 2.5v13c-1.6 0-1.6-1.4-3.2-1.4"/>',
  reloj:    '<circle cx="9" cy="9" r="6.5"/><path d="M9 5.4V9l2.4 1.6"/>',
  ayuda:    '<circle cx="9" cy="9" r="6.5"/><path d="M7.1 7a2 2 0 113.1 1.7c-.7.5-1.2.9-1.2 1.8"/><circle cx="9" cy="13" r=".6" fill="currentColor"/>',
  ajustes:  '<circle cx="9" cy="9" r="2.4"/><path d="M9 1.8v2.1M9 14.1v2.1M16.2 9h-2.1M3.9 9H1.8M14.1 3.9l-1.5 1.5M5.4 12.6l-1.5 1.5M14.1 14.1l-1.5-1.5M5.4 5.4L3.9 3.9"/>',
  cerrar:   '<path d="M4.5 4.5l9 9M13.5 4.5l-9 9"/>',
  subir:    '<path d="M9 13V3.5M5.5 7L9 3.5 12.5 7M3.5 14.5h11"/>',
  bajar:    '<path d="M9 3.5V13M5.5 9.5L9 13l3.5-3.5M3.5 15.5h11"/>',
  info:     '<circle cx="9" cy="9" r="6.5"/><path d="M9 8.4v4"/><circle cx="9" cy="5.9" r=".6" fill="currentColor"/>',
  alerta:   '<path d="M9 2.8l6.6 12.4H2.4z"/><path d="M9 7.4v3.4"/><circle cx="9" cy="12.9" r=".6" fill="currentColor"/>',
  check:    '<path d="M3.8 9.4l3.6 3.6 6.8-8"/>',
  barras:   '<path d="M3 15.5V9M7.5 15.5V4.5M12 15.5v-4M16.5 15.5V7"/>',
  caja:     '<path d="M9 2.5l6.5 3.2v6.6L9 15.5 2.5 12.3V5.7z"/><path d="M2.5 5.7L9 8.9l6.5-3.2M9 8.9v6.6"/>',
  usuario:  '<circle cx="9" cy="6.4" r="2.9"/><path d="M3.4 15.5c0-3.1 2.5-4.7 5.6-4.7s5.6 1.6 5.6 4.7"/>',
  globo:    '<circle cx="9" cy="9" r="6.5"/><path d="M2.6 9h12.8M9 2.5c1.8 2 2.7 4.2 2.7 6.5S10.8 14 9 15.5C7.2 14 6.3 11.8 6.3 9.5S7.2 4.5 9 2.5z"/>',
  copiar:   '<rect x="6" y="6" width="9.5" height="9.5" rx="1.4"/><path d="M12.4 6V4a1.4 1.4 0 00-1.4-1.4H4A1.4 1.4 0 002.6 4v7a1.4 1.4 0 001.4 1.4h2"/>',
};

export function icono(nombre, tam = 18, grosor = 1.5) {
  const span = document.createElement('span');
  span.style.cssText = 'display:inline-flex;line-height:0;flex:none';
  span.innerHTML =
    `<svg width="${tam}" height="${tam}" viewBox="0 0 18 18" fill="none" stroke="currentColor" ` +
    `stroke-width="${grosor}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
    `${SVG[nombre] ?? SVG.info}</svg>`;
  return span;
}

// --------------------------------------------------------------------------- disclosure

/**
 * Botón que se expande hacia abajo y explica qué hace la función.
 * El patrón central de la interfaz: nada obliga a leer, todo se puede consultar.
 */
export function accion({ iconoNombre = 'info', titulo, pista, abierto = false }, ...contenido) {
  const det = el('details', { class: 'action', open: abierto });
  const head = el('summary', { class: 'action__head' },
    el('span', { class: 'action__icon' }, icono(iconoNombre, 19)),
    el('span', { class: 'action__text' },
      el('span', { class: 'action__title' }, titulo),
      pista ? el('span', { class: 'action__hint' }, pista) : null),
    el('span', { class: 'disc__chev' }, icono('chevron', 16, 1.8)));
  det.append(head, el('div', { class: 'action__body' }, ...contenido));
  return det;
}

/** Disclosure ligero, para FAQ y notas. */
export function desplegable({ titulo, abierto = false, plano = false }, ...contenido) {
  const det = el('details', { class: `disc${plano ? ' disc--plain' : ''}`, open: abierto });
  det.append(
    el('summary', { class: 'disc__head' },
      el('span', {}, titulo),
      el('span', { class: 'disc__chev' }, icono('chevron', 16, 1.8))),
    el('div', { class: 'disc__body' }, ...contenido));
  return det;
}

// --------------------------------------------------------------------------- campos

export function campo({ etiqueta, pista, sufijo }, control) {
  return el('label', { class: 'field' },
    etiqueta ? el('span', { class: 'field__label' }, etiqueta) : null,
    sufijo
      ? el('span', { class: 'input-group' }, control, el('span', { class: 'input-group__suffix' }, sufijo))
      : control,
    pista ? el('span', { class: 'field__hint' }, pista) : null);
}

export function entrada({ valor = '', tipo = 'text', paso, min, max, placeholder, onInput, onChange, numero = false, ...resto } = {}) {
  return el('input', {
    class: `input${numero ? ' input--num' : ''}`,
    type: tipo, value: valor,
    step: paso, min, max, placeholder,
    oninput: onInput, onchange: onChange,
    ...resto,
  });
}

export function selector({ valor, opciones, onChange, ...resto } = {}) {
  const s = el('select', { class: 'select', onchange: onChange, ...resto });
  for (const o of opciones) {
    const op = el('option', { value: o.valor }, o.etiqueta);
    if (String(o.valor) === String(valor)) op.selected = true;
    s.append(op);
  }
  return s;
}

export function casilla({ marcado = false, texto, pista, onChange }) {
  return el('label', { class: 'check' },
    el('input', { type: 'checkbox', checked: marcado, onchange: (e) => onChange(e.target.checked) }),
    el('span', {},
      el('span', { class: 'check__text' }, texto),
      pista ? el('span', { class: 'check__hint', style: 'display:block' }, pista) : null));
}

export function pastillasToggle({ opciones, valor, onChange, multiple = false }) {
  const cont = el('div', { class: 'pill-group' });
  for (const o of opciones) {
    const activo = multiple ? (valor ?? []).includes(o.valor) : String(valor) === String(o.valor);
    const b = el('button', {
      type: 'button', class: 'pill pill-toggle', 'aria-pressed': String(activo),
      title: o.nota ?? '',
      onclick: () => onChange(o.valor),
    }, o.etiqueta);
    cont.append(b);
  }
  return cont;
}

// --------------------------------------------------------------------------- modal

let modalActivo = null;

export function abrirModal({ titulo, subtitulo, ancho = false }, cuerpo, pie) {
  cerrarModal();
  const fondo = el('div', { class: 'modal-bg', role: 'dialog', 'aria-modal': 'true' });
  const caja = el('div', { class: `modal${ancho ? ' modal--ancho' : ''}` });

  caja.append(
    el('div', { class: 'modal__head' },
      el('div', { class: 'grow', style: 'flex:1;min-width:0' },
        el('h2', { class: 'title' }, titulo),
        subtitulo ? el('p', { class: 'small muted mt-3' }, subtitulo) : null),
      el('button', { class: 'btn btn--ghost btn--icon', 'aria-label': 'Cerrar', onclick: cerrarModal },
        icono('cerrar', 16))),
    el('div', { class: 'modal__body' }, cuerpo));

  if (pie) caja.append(el('div', { class: 'modal__foot' }, pie));

  fondo.append(caja);
  fondo.addEventListener('mousedown', (e) => { if (e.target === fondo) cerrarModal(); });
  document.body.append(fondo);
  document.body.style.overflow = 'hidden';
  modalActivo = fondo;

  setTimeout(() => ($('input, select, textarea, button', caja))?.focus(), 60);
  return { fondo, caja };
}

export function cerrarModal() {
  if (!modalActivo) return;
  modalActivo.remove();
  modalActivo = null;
  document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarModal(); });

export function confirmar({ titulo, mensaje, textoOk = 'Confirmar', peligro = false }) {
  return new Promise((resolver) => {
    const ok = el('button', { class: `btn ${peligro ? 'btn--danger' : 'btn--primary'}` }, textoOk);
    const no = el('button', { class: 'btn' }, 'Cancelar');
    ok.onclick = () => { cerrarModal(); resolver(true); };
    no.onclick = () => { cerrarModal(); resolver(false); };
    abrirModal({ titulo }, el('p', { class: 'lead' }, mensaje), [no, ok]);
  });
}

// --------------------------------------------------------------------------- toast

export function avisar(mensaje, tipo = 'ok') {
  let zona = $('.toast-zona');
  if (!zona) { zona = el('div', { class: 'toast-zona' }); document.body.append(zona); }
  const t = el('div', { class: `toast${tipo === 'err' ? ' toast--err' : ''}` },
    icono(tipo === 'err' ? 'alerta' : 'check', 16, 2), mensaje);
  zona.append(t);
  setTimeout(() => {
    t.style.transition = 'opacity .3s, transform .3s';
    t.style.opacity = '0';
    t.style.transform = 'translateY(8px)';
    setTimeout(() => t.remove(), 320);
  }, 2800);
}

// --------------------------------------------------------------------------- varios

export function vacio({ iconoNombre = 'caja', titulo, mensaje }, ...acciones) {
  return el('div', { class: 'vacio' },
    el('div', { class: 'vacio__icon' }, icono(iconoNombre, 26)),
    el('h3', { class: 'subtitle' }, titulo),
    mensaje ? el('p', { class: 'lead muted mt-3', style: 'margin-inline:auto' }, mensaje) : null,
    acciones.length ? el('div', { class: 'row mt-5', style: 'justify-content:center' }, ...acciones) : null);
}

export function nota(texto, tipo = '', iconoNombre = 'info') {
  return el('div', { class: `nota${tipo ? ` nota--${tipo}` : ''}` },
    icono(iconoNombre, 16), el('span', {}, texto));
}

export function descargarTexto(nombre, contenido, tipoMime = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipoMime }));
  const a = el('a', { href: url, download: nombre });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
