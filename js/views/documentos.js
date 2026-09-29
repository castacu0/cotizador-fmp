// Documentos del proveedor: subir, buscar y ver PDFs sin salir de la aplicación.
// Hunter Douglas entrega las listas de precios solo en PDF, y hasta ahora el
// equipo las abría desde el portal, una por una, con la sesión del dueño.

import { el, fmtFechaCorta } from '../format.js';
import * as D from '../documentos.js';
import { icono, campo, entrada, selector, abrirModal, cerrarModal, confirmar, avisar, nota, vacio } from '../ui.js';

let consulta = '';
let filtroEtiqueta = '';
let etiquetaCarga = 'Lista de precios';
let urlAbierta = null;
let refs = {};

export function render(raiz) {
  refs = {};
  liberarUrl();

  raiz.append(el('div', { class: 'view' },
    el('header', { class: 'section' },
      el('div', { class: 'row' },
        el('div', { style: 'flex:1;min-width:0' },
          el('p', { class: 'eyebrow' }, 'Documentos'),
          el('h1', { class: 'display mt-3' }, 'PDF del proveedor'),
          el('p', { class: 'lead mt-3' },
            'Listas de precios, fichas técnicas y catálogos de Hunter Douglas, para consultarlos aquí mismo ' +
            'mientras se cotiza. Se guardan en esta computadora.')),
        el('div', { class: 'row row--tight' },
          el('a', { class: 'btn', href: '#/cotizador', title: 'Regresar al cotizador' },
            icono('cortina', 15), 'Cotizar')))),

    D.hayAlmacen()
      ? el('div', { class: 'stack stack-5' }, zonaCarga(), barraBusqueda(), listado(), pieEspacio())
      : el('div', { class: 'card card--pad-lg' },
          nota('Este navegador no permite guardar archivos localmente. Prueba con Chrome, Edge o Safari actualizados.', 'warn', 'alerta'))));

  pintarLista();
}

// --------------------------------------------------------------------------- carga

function zonaCarga() {
  const input = el('input', {
    type: 'file', accept: 'application/pdf,.pdf', multiple: true, style: 'display:none',
    onchange: (e) => { subir(Array.from(e.target.files ?? [])); e.target.value = ''; },
  });

  const zona = el('label', {
    class: 'card card--quiet zona-carga', title: 'Haz clic o arrastra aquí uno o varios PDF',
    ondragover: (e) => { e.preventDefault(); zona.classList.add('is-over'); },
    ondragleave: () => zona.classList.remove('is-over'),
    ondrop: (e) => {
      e.preventDefault();
      zona.classList.remove('is-over');
      subir(Array.from(e.dataTransfer?.files ?? []));
    },
  },
    el('span', { class: 'vacio__icon' }, icono('subir', 24)),
    el('span', { class: 'subtitle' }, 'Subir PDF'),
    el('span', { class: 'small muted' }, 'Haz clic para elegir el archivo o arrástralo aquí. Acepta varios a la vez.'),
    input);

  const etiqueta = campo({ etiqueta: 'Guardar como', pista: 'Se puede cambiar después, en cada documento' },
    selector({ valor: etiquetaCarga,
      opciones: D.ETIQUETAS.map((e) => ({ valor: e, etiqueta: e })),
      onChange: (e) => { etiquetaCarga = e.target.value; },
      title: 'Tipo de documento con el que se guarda lo que subas ahora' }));

  return el('div', { class: 'stack stack-3' },
    zona,
    el('div', { class: 'grid-3' }, etiqueta));
}

async function subir(archivos) {
  if (!archivos.length) return;
  let guardados = 0;
  for (const archivo of archivos) {
    if (!D.esPDF(archivo)) { avisar(`"${archivo.name}" no es PDF. Se omite.`, 'err'); continue; }
    try {
      await D.guardarDocumento(archivo, { etiqueta: etiquetaCarga });
      guardados += 1;
      if (archivo.size > D.PESO_AVISO) {
        avisar(`"${archivo.name}" pesa ${D.pesoLegible(archivo.size)}. Se guardó, pero abrirá lento.`);
      }
    } catch (err) {
      console.error(err);
      avisar(err.message || `No se pudo guardar "${archivo.name}".`, 'err');
    }
  }
  if (guardados) avisar(guardados === 1 ? 'Documento guardado' : `${guardados} documentos guardados`);
  pintarLista();
}

// --------------------------------------------------------------------------- búsqueda y lista

function barraBusqueda() {
  const input = el('input', {
    class: 'search__input', type: 'search', value: consulta, autocomplete: 'off',
    placeholder: 'Busca por nombre, tipo o nota. Ej: duette lista 2026',
    title: 'Filtra la lista conforme escribes',
    oninput: (e) => { consulta = e.target.value; pintarLista(); },
  });
  const chips = el('div', { class: 'pill-group mt-3' });
  refs.chips = chips;
  return el('div', {},
    el('div', { class: 'search' }, el('span', { class: 'search__icon' }, icono('buscar', 18)), input),
    chips);
}

function listado() {
  const cont = el('div', { class: 'stack stack-2 js-documentos' });
  refs.lista = cont;
  return cont;
}

function pieEspacio() {
  const p = el('p', { class: 'tiny muted' }, '');
  refs.espacio = p;
  return el('div', { class: 'stack stack-3' },
    p,
    nota('Los PDF viven en el navegador de esta computadora, igual que las fotos de obra, y no entran al ' +
         'respaldo JSON. Si se limpian los datos del navegador se pierden; el original sigue en My HunterDouglas.',
         '', 'info'));
}

function chip(texto, activo, onClick, title) {
  return el('button', { type: 'button', class: 'pill pill-toggle', 'aria-pressed': String(activo), onclick: onClick, title }, texto);
}

async function pintarLista() {
  if (!refs.lista) return;
  let docs = [];
  try { docs = await D.listarDocumentos(); }
  catch (err) { console.error(err); refs.lista.replaceChildren(nota('No se pudieron leer los documentos guardados.', 'danger', 'alerta')); return; }

  if (refs.chips) {
    const conteo = (e) => docs.filter((d) => d.etiqueta === e).length;
    refs.chips.replaceChildren(
      chip(`Todos · ${docs.length}`, !filtroEtiqueta, () => { filtroEtiqueta = ''; pintarLista(); }, 'Mostrar todos los documentos'),
      ...D.ETIQUETAS.filter((e) => conteo(e) > 0).map((e) =>
        chip(`${e} · ${conteo(e)}`, filtroEtiqueta === e,
          () => { filtroEtiqueta = filtroEtiqueta === e ? '' : e; pintarLista(); },
          `Solo ${e.toLowerCase()}`)));
  }

  const visibles = D.filtrarDocumentos(docs, consulta, filtroEtiqueta);

  if (!docs.length) {
    refs.lista.replaceChildren(el('div', { class: 'card card--quiet' },
      vacio({ iconoNombre: 'pdf', titulo: 'Todavía no hay documentos',
              mensaje: 'Descarga la lista de precios de My HunterDouglas y súbela aquí. Queda a la mano para todo el equipo de esta computadora.' })));
  } else if (!visibles.length) {
    refs.lista.replaceChildren(el('div', { class: 'res__empty' },
      el('p', {}, 'Ningún documento coincide.'),
      el('p', { class: 'tiny mt-3' }, 'Prueba con menos palabras o quita el filtro.')));
  } else {
    refs.lista.replaceChildren(...visibles.map(tarjetaDocumento));
  }

  if (refs.espacio) {
    const { cuenta, bytes, cuota } = await D.espacioUsado();
    refs.espacio.textContent = cuenta
      ? `${cuenta} documento(s) · ${D.pesoLegible(bytes)} en esta computadora` +
        (cuota ? ` · el navegador permite hasta ${D.pesoLegible(cuota)}` : '')
      : '';
  }
}

function tarjetaDocumento(d) {
  const boton = (iconoNombre, texto, title, onclick, extra = '') =>
    el('button', { class: `btn btn--sm ${extra}`, title, 'aria-label': title, onclick }, icono(iconoNombre, 14), texto);

  return el('article', { class: 'doc' },
    el('span', { class: 'doc__icono' }, icono('pdf', 20)),
    el('div', { class: 'doc__cuerpo' },
      el('div', { class: 'doc__nombre', title: d.nombre }, d.nombre),
      el('div', { class: 'doc__meta' },
        `${d.etiqueta}  ·  ${d.proveedor}  ·  ${D.pesoLegible(d.bytes)}  ·  guardado el ${fmtFechaCorta(d.fecha)}`),
      el('div', { class: 'row row--tight mt-3' },
        selector({ valor: d.etiqueta, class: 'select select--sm',
          opciones: D.ETIQUETAS.map((e) => ({ valor: e, etiqueta: e })),
          title: 'Cambiar el tipo de este documento',
          onChange: async (e) => { await D.actualizarDocumento(d.id, { etiqueta: e.target.value }); pintarLista(); } }),
        entrada({ valor: d.nota ?? '', placeholder: 'Nota: vigencia, versión, para qué sirve',
          title: 'Una nota corta que también entra en la búsqueda',
          style: 'flex:1;min-width:160px',
          onChange: async (e) => { await D.actualizarDocumento(d.id, { nota: e.target.value.trim() }); pintarLista(); } }))),
    el('div', { class: 'doc__acciones' },
      boton('ojo', 'Ver', 'Abrir el PDF aquí mismo, sin salir de la aplicación', () => verDocumento(d), 'btn--primary'),
      boton('externo', '', 'Abrir en una pestaña nueva del navegador', () => abrirEnPestana(d)),
      boton('bajar', '', 'Descargar una copia del PDF', () => descargar(d)),
      boton('basura', '', 'Quitar este documento de la computadora', () => quitar(d), 'btn--danger')));
}

// --------------------------------------------------------------------------- acciones

async function conBlob(d) {
  const registro = await D.documento(d.id);
  if (!registro?.blob) { avisar('El archivo ya no está en este navegador.', 'err'); return null; }
  return registro;
}

function liberarUrl() {
  if (urlAbierta) { URL.revokeObjectURL(urlAbierta); urlAbierta = null; }
}

async function verDocumento(d) {
  const registro = await conBlob(d);
  if (!registro) return;
  liberarUrl();
  urlAbierta = D.urlDeDocumento(registro);
  const url = urlAbierta;

  abrirModal(
    { titulo: d.nombre, ancho: true,
      subtitulo: `${d.etiqueta} · ${d.proveedor} · ${D.pesoLegible(d.bytes)}. Si el visor no carga, ábrelo en pestaña nueva.` },
    el('iframe', { class: 'visor', src: url, title: d.nombre }),
    [el('button', { class: 'btn', onclick: () => { cerrarModal(); liberarUrl(); }, title: 'Cerrar el visor' }, 'Cerrar'),
     el('a', { class: 'btn', href: url, target: '_blank', rel: 'noopener', title: 'Abrir en una pestaña nueva del navegador' },
       icono('externo', 14), 'Pestaña nueva'),
     el('a', { class: 'btn btn--primary', href: url, download: `${d.nombre}.pdf`, title: 'Descargar una copia del PDF' },
       icono('bajar', 14), 'Descargar')]);
}

async function abrirEnPestana(d) {
  const registro = await conBlob(d);
  if (!registro) return;
  const url = D.urlDeDocumento(registro);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

async function descargar(d) {
  const registro = await conBlob(d);
  if (!registro) return;
  const url = D.urlDeDocumento(registro);
  const a = el('a', { href: url, download: `${d.nombre}.pdf` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function quitar(d) {
  const ok = await confirmar({
    titulo: 'Quitar documento', peligro: true, textoOk: 'Quitar',
    mensaje: `Se quita "${d.nombre}" de esta computadora. El original sigue en el portal de Hunter Douglas.`,
  });
  if (!ok) return;
  await D.borrarDocumento(d.id);
  avisar('Documento quitado');
  pintarLista();
}
