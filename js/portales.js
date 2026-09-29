// Accesos directos a los portales de Hunter Douglas y calculadora del precio al
// cliente a partir de lo que muestra e-Pedidos. Primer ladrillo de la fase 3:
// no se conecta a Hunter Douglas ni guarda credenciales. Abre y calcula.

import { el, fmtMXN, fmtNum, fmtPct } from './format.js';
import * as S from './state.js';
import { calcularPrecioProveedor } from './pricing.js';
import { icono, abrirModal, cerrarModal, campo, entrada, nota } from './ui.js';

/** Solo se enlazan direcciones http(s). Lo demás se muestra sin enlace. */
export const urlSegura = (u) => /^https?:\/\/\S+$/i.test(String(u ?? '').trim());

export function portalesConfigurados() {
  return (S.obtener().config.portales ?? []).filter((p) => p && p.nombre);
}

// --------------------------------------------------------------------------- lista de portales

function listaPortales() {
  const portales = portalesConfigurados();
  if (!portales.length) {
    return nota('No hay portales capturados. Se agregan en Ajustes > Portales de Hunter Douglas.', '', 'info');
  }
  return el('div', { class: 'stack stack-2' },
    ...portales.map((p) => el('div', { class: 'card card--flat' },
      el('div', { class: 'row' },
        el('div', { style: 'flex:1;min-width:0' },
          el('div', { class: 'small', style: 'font-weight:600' }, p.nombre),
          el('div', { class: 'tiny mt-3' }, p.para ?? ''),
          urlSegura(p.url) ? el('div', { class: 'tiny truncate muted mt-3' }, p.url) : null),
        urlSegura(p.url)
          ? el('a', { class: 'btn btn--sm btn--primary', href: p.url,
                      target: '_blank', rel: 'noopener noreferrer' },
              icono('globo', 14), 'Abrir')
          : el('a', { class: 'btn btn--sm', href: '#/ajustes', onclick: () => cerrarModal() },
              'Capturar dirección')))));
}

// --------------------------------------------------------------------------- calculadora

/**
 * El resumen de e-Pedidos trae "Lista" y "Factura" sin IVA, y un "Precio con
 * IVA" que es la factura con impuesto. Aquí se capturan los dos números y sale
 * lo que se le cobra al cliente, con IVA, y lo que le queda a la empresa.
 */
function calculadora() {
  const cfg = S.obtener().config;
  const datos = { lista: '', factura: '', descuentoPct: 0 };
  const salida = el('div', { class: 'mt-4' });

  const fila = (k, v, fuerte = false) => el('div', { class: 'row', style: 'justify-content:space-between' },
    el('span', { class: `small${fuerte ? '' : ' muted'}`, style: fuerte ? 'font-weight:600' : '' }, k),
    el('span', { class: 'small', style: `font-variant-numeric:tabular-nums${fuerte ? ';font-weight:600' : ''}` }, v));

  const pintar = () => {
    salida.replaceChildren();
    const lista = Number(datos.lista);
    const factura = Number(datos.factura);
    if (!(lista > 0)) {
      salida.append(nota('Captura el precio de lista tal como lo muestra e-Pedidos, sin IVA.', '', 'info'));
      return;
    }
    const r = calcularPrecioProveedor({
      lista, factura, descuentoPct: Number(datos.descuentoPct || 0) / 100, ivaPct: cfg.fiscal.iva,
    });
    const ivaTxt = `${fmtNum(r.ivaPct * 100, 0)}%`;

    let alerta = null;
    if (factura > 0 && r.utilidad < 0) {
      alerta = nota('Por debajo del costo. Con este descuento la empresa pierde dinero en la partida.', 'danger', 'alerta');
    } else if (factura > 0 && r.margen < 0.25) {
      alerta = nota(`Margen de ${fmtPct(r.margen, 1)}. Revisa el descuento antes de mandarla.`, 'danger', 'alerta');
    } else if (factura > 0 && r.margen < 0.30) {
      alerta = nota(`Margen de ${fmtPct(r.margen, 1)}, por debajo del objetivo.`, 'warn', 'alerta');
    }

    salida.append(
      el('div', { class: 'card card--flat' },
        el('p', { class: 'eyebrow' }, 'Precio al cliente, con IVA'),
        el('div', { class: 'title mt-3', style: 'font-variant-numeric:tabular-nums' }, fmtMXN(r.precioConIva)),
        el('p', { class: 'tiny muted mt-3' },
          r.descuentoPct > 0
            ? `Lista menos ${fmtPct(r.descuentoPct, 0)} de descuento, más IVA de ${ivaTxt}.`
            : `Lista más IVA de ${ivaTxt}.`),
        el('div', { class: 'stack stack-2 mt-4' },
          fila('Precio de venta sin IVA', fmtMXN(r.precioVenta)),
          fila(`IVA ${ivaTxt}`, fmtMXN(r.ivaVenta)),
          factura > 0 ? fila('Costo a Hunter Douglas, sin IVA (Factura)', fmtMXN(r.factura)) : null,
          factura > 0 ? fila('Costo con IVA (lo que e-Pedidos llama "Precio con IVA")', fmtMXN(r.costoConIva)) : null,
          factura > 0 ? fila('Utilidad de la empresa', fmtMXN(r.utilidad), true) : null,
          factura > 0 ? fila('Margen real', fmtPct(r.margen, 1), true) : null)),
      alerta ? el('div', { class: 'mt-3' }, alerta) : null,
      el('div', { class: 'mt-3' },
        nota(`Si cobras ${fmtMXN(r.precioVenta)} como si ya trajera IVA, la empresa entera ` +
             `${fmtMXN(r.perdidaSiCobraSinIva)} de impuesto de su propia utilidad.`, 'accent', 'info')));
  };

  const num = (clave, extra = {}) => entrada({
    tipo: 'number', numero: true, min: 0, paso: '0.01', placeholder: '0.00',
    onInput: (e) => { datos[clave] = e.target.value; pintar(); }, ...extra,
  });

  pintar();
  return el('div', {},
    el('div', { class: 'grid-3' },
      campo({ etiqueta: 'Precio de lista', sufijo: 'MXN', pista: 'Renglón "Lista" de e-Pedidos, sin IVA' },
        num('lista')),
      campo({ etiqueta: 'Factura', sufijo: 'MXN', pista: 'Lo que paga la empresa, sin IVA' },
        num('factura')),
      campo({ etiqueta: 'Descuento al cliente', sufijo: '%', pista: 'Sobre la lista. Cero si no hay' },
        num('descuentoPct', { paso: '1', max: 100, placeholder: '0' }))),
    salida);
}

// --------------------------------------------------------------------------- modal

export function abrirPortales() {
  abrirModal(
    { titulo: 'Hunter Douglas',
      subtitulo: 'Portales del distribuidor y precio al cliente a partir de e-Pedidos.' },
    el('div', {},
      el('p', { class: 'eyebrow' }, 'A dónde entrar'),
      el('div', { class: 'mt-3' }, listaPortales()),
      el('hr', { class: 'rule' }),
      el('p', { class: 'eyebrow' }, 'Precio al cliente desde e-Pedidos'),
      el('p', { class: 'small muted mt-3' },
        'El resumen de e-Pedidos muestra "Lista" y "Factura" sin IVA, y su "Precio con IVA" es la ' +
        'factura con impuesto: lo que paga la empresa. Al cliente se le cobra la lista más IVA. ' +
        'Captura los dos números y sale el precio con IVA y el margen real.'),
      el('div', { class: 'mt-4' }, calculadora())));
}
