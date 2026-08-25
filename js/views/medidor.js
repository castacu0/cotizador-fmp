// Medidor de obra. La pantalla que usa quien va a medir la casa.
//
// Diseño: se captura con el pulgar, de pie, sin quitar la vista de la cinta.
// Por eso el teclado es de la aplicación y solo tiene números, coma, punto,
// multiplicar y repetir. Es la misma notación que ya traen en sus notas.

import { el, $, fmtMXN, fmtNum, fmtFechaCorta, uid } from '../format.js';
import * as S from '../state.js';
import { icono, accion, campo, entrada, selector, casilla, abrirModal, cerrarModal,
         confirmar, avisar, vacio, nota } from '../ui.js';
import { CATEGORIAS, precioBaseMXN } from '../pricing.js';
import { medicionVacia, cuartoVacio, calcularCuarto, calcularMedicion, estimarMedicion,
         parsearNota, CUARTOS_SUGERIDOS } from '../medidas.js';
import * as Fotos from '../fotos.js';

// Campo de medida enfocado. El teclado de la aplicación escribe aquí.
let activo = null;
let refs = {};

// ---------------------------------------------------------------------------

export function render(raiz) {
  const s = S.obtener();
  const abierta = S.medicionAbierta();
  refs = {};
  activo = null;

  raiz.append(el('div', { class: 'view' },
    abierta ? pantallaObra(abierta) : pantallaLista(s)));

  if (abierta) {
    montarFijos();
    recalcular();
  }
}

/**
 * La barra de totales y el teclado cuelgan del body, no de la vista.
 * .view corre una animación con transform, y eso convierte a la vista en el
 * bloque contenedor de cualquier hijo fijo: dentro de ella, position:fixed
 * deja de referirse a la pantalla y la barra se va al final del documento.
 */
function montarFijos() {
  const barra = barraTotales();
  refs.barra = barra;
  document.body.append(barra);

  const teclado = tecladoDeApp() ? construirTeclado() : null;
  if (teclado) document.body.append(teclado);

  const limpiar = () => {
    barra.remove();
    teclado?.remove();
    window.removeEventListener('hashchange', limpiar);
    window.removeEventListener('fmp:rerender', limpiar);
  };
  window.addEventListener('hashchange', limpiar);
  window.addEventListener('fmp:rerender', limpiar);
}

// --------------------------------------------------------------------------- lista de obras

function pantallaLista(s) {
  const mediciones = s.mediciones ?? [];

  return el('div', {},
    el('header', { class: 'section' },
      el('div', { class: 'row' },
        el('div', { style: 'flex:1;min-width:0' },
          el('p', { class: 'eyebrow' }, 'Levantamiento en obra'),
          el('h1', { class: 'display mt-3' }, 'Medir'),
          el('p', { class: 'lead mt-3' },
            'Captura las medidas cuarto por cuarto con puros números. La aplicación suma el área, ' +
            'el zoclo y te da un estimado antes de salir de la casa.')),
        el('div', { class: 'row row--tight' },
          el('button', { class: 'btn', onclick: abrirPegarNota }, icono('copiar', 15), 'Pegar nota'),
          el('button', { class: 'btn btn--primary', onclick: nuevaObra }, icono('mas', 15), 'Nueva obra')))),

    mediciones.length
      ? el('div', { class: 'stack stack-3' }, ...mediciones.map((m) => tarjetaObra(m)))
      : vacio({ iconoNombre: 'regla', titulo: 'Todavía no hay obras medidas',
                mensaje: 'Empieza una obra nueva, o pega la nota del teléfono y la aplicación la separa por cuartos.' },
          el('button', { class: 'btn btn--primary', onclick: nuevaObra }, icono('mas', 15), 'Nueva obra'),
          el('button', { class: 'btn', onclick: abrirPegarNota }, icono('copiar', 15), 'Pegar nota')));
}

function tarjetaObra(m) {
  const t = calcularMedicion(m);
  return el('article', { class: 'linea' },
    el('div', { class: 'linea__head' },
      el('div', { style: 'flex:1;min-width:0' },
        el('div', { class: 'row row--tight' },
          el('strong', {}, m.nombre || 'Obra sin nombre'),
          m.cliente ? el('span', { class: 'pill pill--sm pill--outline' }, m.cliente) : null),
        el('p', { class: 'small muted mt-3' },
          `${m.cuartos.length} ${m.cuartos.length === 1 ? 'cuarto' : 'cuartos'} · ` +
          `${fmtNum(t.areaM2, 2)} m² · ${fmtNum(t.zocloML, 2)} ml de zoclo · ${fmtFechaCorta(m.fecha)}`)),
      el('div', { class: 'row row--tight' },
        el('button', { class: 'btn btn--sm', onclick: () => { S.abrirMedicion(m.id); redibujar(); } },
          'Abrir'),
        el('button', {
          class: 'btn btn--danger btn--icon', 'aria-label': 'Eliminar obra',
          onclick: async () => {
            if (await confirmar({ titulo: 'Eliminar la obra',
              mensaje: `Se borra "${m.nombre || 'sin nombre'}" con sus ${m.cuartos.length} cuartos. No se puede deshacer.`,
              textoOk: 'Eliminar', peligro: true })) {
              S.eliminarMedicion(m.id);
              redibujar();
            }
          },
        }, icono('basura', 15)))));
}

function nuevaObra() {
  const m = medicionVacia('');
  m.medidoPor = S.usuarioActual();
  m.cuartos.push(cuartoVacio('Cuarto 1'));
  S.crearMedicion(m);
  redibujar();
}

// --------------------------------------------------------------------------- obra abierta

function pantallaObra(m) {
  // El título sigue al campo de nombre: si no, se queda con el nombre viejo
  // hasta el siguiente redibujo y parece que la app no guardó.
  const titulo = el('h1', { class: 'display mt-3' }, m.nombre || 'Obra sin nombre');

  return el('div', { class: 'medidor' },
    el('header', { class: 'section' },
      el('div', { class: 'row' },
        el('button', { class: 'btn btn--ghost btn--sm', onclick: () => { S.abrirMedicion(null); redibujar(); } },
          icono('chevron', 15, 1.8), 'Todas las obras'),
        el('span', { class: 'spacer' }),
        controlMetodo(m),
        el('button', { class: 'btn btn--sm', onclick: () => abrirEstimado(m) }, icono('barras', 15), 'Estimado'),
        el('button', { class: 'btn btn--sm btn--primary', onclick: () => abrirPasarACotizador(m) },
          icono('pdf', 15), 'Cotizar')),

      el('p', { class: 'eyebrow mt-5' }, 'Levantamiento en obra'),
      titulo,

      el('div', { class: 'grid-2 mt-5' },
        campo({ etiqueta: 'Obra' },
          entrada({ valor: m.nombre, placeholder: 'Casa Jackie',
            onInput: (e) => {
              S.actualizarMedicion(m.id, { nombre: e.target.value });
              titulo.textContent = e.target.value || 'Obra sin nombre';
            } })),
        campo({ etiqueta: 'Cliente' },
          entrada({ valor: m.cliente, placeholder: 'Nombre de quien contrata',
            onInput: (e) => S.actualizarMedicion(m.id, { cliente: e.target.value }) })))),

    barraMaterial(m),
    listaCuartos(m),

    barraAgregar(m),

    el('div', { class: 'mt-5' },
      accion({ iconoNombre: 'info', titulo: 'Cómo se escriben las medidas',
               pista: 'La misma notación de siempre, sin letras' },
        el('div', { class: 'formula' },
          el('p', {}, el('b', {}, '16.45,3.81,2.29'), ' suma tres áreas: 22.55 m².'),
          el('p', { class: 'mt-3' }, el('b', {}, '1.86(2)'), ' es esa medida dos veces.'),
          el('p', { class: 'mt-3' }, el('b', {}, '4*5'), ' multiplica los dos lados de un rectángulo: 20 m².'),
          el('p', { class: 'mt-3' }, el('b', {}, '.88'), ' se puede escribir sin el cero de adelante.'),
          el('p', { class: 'mt-3' }, 'El renglón del zoclo va en su propio campo. ' +
            'Si pegas una nota con ', el('b', {}, 'Z-'), ', la aplicación la manda sola al campo correcto.')))));
}

/**
 * Con qué se está midiendo. Sebastián trae distanciómetro y captura el área
 * directo; con cinta se miden dos lados y se multiplican. Cambia la pista del
 * campo y el ejemplo, no el cálculo.
 */
function controlMetodo(m) {
  const actual = () => (S.medicionAbierta() ?? m).metodo ?? S.obtener().config.medidor?.metodo ?? 'laser';

  const grupo = el('div', { class: 'metodo', role: 'group', 'aria-label': 'Cómo se está midiendo' });
  for (const [clave, etiqueta, titulo] of [
    ['laser', 'Láser', 'Distanciómetro: se captura el área directa'],
    ['cinta', 'Cinta', 'Cinta métrica: se miden dos lados y se multiplican con ×'],
  ]) {
    grupo.append(el('button', {
      type: 'button', class: 'metodo__btn', title: titulo,
      'aria-pressed': String(actual() === clave),
      onclick: () => { S.actualizarMedicion(m.id, { metodo: clave }); redibujar(); },
    }, etiqueta));
  }
  return grupo;
}

const metodoDe = (m) => m.metodo ?? S.obtener().config.medidor?.metodo ?? 'laser';

/** El material elegido para la obra, si sigue existiendo en el catálogo. */
const materialDe = (m) =>
  (m?.productoId ? S.obtener().catalogo.find((p) => p.id === m.productoId) : null) ?? null;

/**
 * Las opciones del estimado. Cuando hay material elegido, su precio manda:
 * es lo que convierte el estimado de campo en un número que se puede decir.
 */
function opcionesEstimado(m) {
  const producto = materialDe(m);
  if (!producto) return {};
  return { precioM2: precioBaseMXN(producto, S.obtener().config) };
}

/**
 * Selector de material. Sin él, el estimado usa el promedio de Ajustes y
 * la pantalla lo dice. Con él, usa el precio real de la línea.
 */
function barraMaterial(m) {
  const producto = materialDe(m);
  const cfg = S.obtener().config;

  return el('div', { class: `material${producto ? ' material--fijo' : ''}` },
    el('div', { style: 'flex:1;min-width:0' },
      el('span', { class: 'material__etq' }, producto ? 'Material de la obra' : 'Precio del estimado'),
      el('span', { class: 'material__nombre' },
        producto ? producto.nombre : `Promedio de ${fmtMXN(cfg.medidor.precioM2, 0)} por m²`),
      el('span', { class: 'material__precio num' },
        producto
          ? `${fmtMXN(precioBaseMXN(producto, cfg), 0)} / m² · ${CATEGORIAS[producto.categoria]?.nombre ?? ''}`
          : 'Elige el material y el estimado usa su precio real')),
    el('div', { class: 'row row--tight' },
      el('button', { class: 'btn btn--sm', onclick: () => abrirSelectorMaterial(m) },
        icono('buscar', 14), producto ? 'Cambiar' : 'Elegir material'),
      producto
        ? el('button', {
            class: 'btn btn--ghost btn--icon', 'aria-label': 'Quitar el material',
            onclick: () => { S.actualizarMedicion(m.id, { productoId: null }); redibujar(); },
          }, icono('cerrar', 14))
        : null));
}

function abrirSelectorMaterial(m) {
  const s = S.obtener();
  const busca = entrada({ placeholder: 'encino, spc, porcelanato, 14 mm…', autofocus: true });
  const lista = el('div', { class: 'res mt-4', style: 'max-height:52vh;overflow:auto' });

  const pintar = () => {
    const res = S.buscarProductos(s.catalogo, busca.value).slice(0, 60);
    lista.replaceChildren(...(res.length
      ? res.map(({ producto: p }) => el('button', {
          class: 'res__item',
          onclick: () => {
            S.actualizarMedicion(m.id, { productoId: p.id, precioM2: null });
            cerrarModal();
            avisar(`Precio de ${p.nombre} aplicado`);
            redibujar();
          },
        },
          el('span', { class: 'res__main' },
            el('span', { class: 'res__name' }, p.nombre),
            el('span', { class: 'res__meta' },
              `${CATEGORIAS[p.categoria]?.nombre ?? ''}${p.color ? ' · ' + p.color : ''} · ${p.sku}`)),
          el('span', { class: 'res__price' },
            el('span', { class: 'res__amount' }, fmtMXN(precioBaseMXN(p, s.config), 0)),
            el('span', { class: 'res__unit' }, `por ${p.unidad}`))))
      : [el('div', { class: 'res__empty' }, 'Ningún material coincide.')]));
  };

  busca.addEventListener('input', pintar);
  pintar();

  abrirModal({ titulo: 'Material de la obra',
    subtitulo: 'El estimado usará este precio en lugar del promedio, cuarto por cuarto.' },
    el('div', {}, busca, lista,
      s.catalogoEsDemo
        ? el('div', { class: 'mt-4' },
            nota('El catálogo cargado es de demostración. Cuando entren las listas reales de los ' +
                 'proveedores, este mismo selector dará el precio de venta verdadero.', 'warn', 'alerta'))
        : null),
    [el('button', { class: 'btn', onclick: cerrarModal }, 'Cancelar')]);
}

// Lo que el equipo agrega una y otra vez. Un toque y queda numerado solo.
const RAPIDOS = [
  { base: 'Recámara', tipo: 'area' },
  { base: 'Baño', tipo: 'area' },
  { base: 'Cocina', tipo: 'area' },
  { base: 'Sala', tipo: 'area' },
  { base: 'Comedor', tipo: 'area' },
  { base: 'Pasillo', tipo: 'area' },
  { base: 'Escalera', tipo: 'escalera' },
  { base: 'Patio', tipo: 'area' },
  { base: 'Cuarto', tipo: 'area' },
];

/** "Recámara" dos veces da "Recámara 1" y "Recámara 2", sin teclear. */
function nombreSiguiente(m, base) {
  const previos = m.cuartos.filter((c) => new RegExp(`^${base}(\\s|$)`, 'i').test(c.nombre ?? ''));
  if (!previos.length) return base;
  return `${base} ${previos.length + 1}`;
}

function barraAgregar(m) {
  return el('div', { class: 'agregar' },
    el('span', { class: 'agregar__etq' }, 'Agregar'),
    el('div', { class: 'agregar__chips' },
      ...RAPIDOS.map((r) => el('button', {
        class: 'agregar__chip', type: 'button',
        title: r.tipo === 'escalera' ? 'Escalera: se captura por escalón' : `Agregar ${r.base.toLowerCase()}`,
        onclick: () => agregarCuarto(m, r.tipo, nombreSiguiente(m, r.base)),
      }, icono('mas', 13), r.base))));
}

function listaCuartos(m) {
  return el('div', { class: 'stack stack-3 js-cuartos' },
    ...(m.cuartos.length
      ? m.cuartos.map((c, i) => tarjetaCuarto(m, c, i))
      : [nota('Agrega el primer cuarto para empezar a capturar.', '', 'info')]),
    el('datalist', { id: 'lista-cuartos' },
      ...CUARTOS_SUGERIDOS.map((n) => el('option', { value: n }))));
}

function agregarCuarto(m, tipo, nombre) {
  const c = cuartoVacio(nombre ?? (tipo === 'escalera' ? 'Escalera' : `Cuarto ${m.cuartos.length + 1}`), tipo);
  S.agregarCuarto(m.id, c);
  redibujar();
  setTimeout(() => {
    const campos = document.querySelectorAll('.js-cuartos .js-medida');
    campos[campos.length - 1]?.focus();
  }, 60);
}

// --------------------------------------------------------------------------- cuarto

function tarjetaCuarto(m, c, indice) {
  const totalEl = el('div', { class: 'cuarto__total num' });
  const detalleArea = el('div', { class: 'cuarto__eco' });
  const detalleZoclo = el('div', { class: 'cuarto__eco' });

  const pintar = () => {
    const r = calcularCuarto(c);
    totalEl.replaceChildren(
      el('span', { class: 'cuarto__m2' }, `${fmtNum(r.areaM2, 2)} m²`),
      r.zocloML > 0 ? el('span', { class: 'cuarto__ml' }, `${fmtNum(r.zocloML, 2)} ml`) : null,
      // El peso de este cuarto, en el renglón del cuarto. Es lo que hace que
      // quien mide pueda contestar "¿y la cocina cuánto?" sin abrir nada más.
      el('span', { class: 'cuarto__mxn num' }, precioDeCuarto(c)));
    detalleArea.replaceChildren(...eco(r.areas, 'm²'));
    detalleZoclo.replaceChildren(...eco(r.zoclos, 'ml'));
    return r;
  };

  const campoMedida = (clave, etiqueta, marcador) => {
    const inp = entrada({
      valor: c[clave] ?? '', placeholder: marcador,
      class: 'input input--num js-medida',
      inputmode: tecladoDeApp() ? 'none' : 'decimal',
      autocomplete: 'off', autocorrect: 'off', spellcheck: 'false',
      onInput: (e) => {
        S.actualizarCuarto(m.id, c.id, { [clave]: e.target.value });
        c[clave] = e.target.value;
        pintar();
        recalcular();
      },
    });
    inp.addEventListener('focus', () => fijarActivo(inp, `${c.nombre || 'Cuarto'} · ${etiqueta}`));
    return campo({ etiqueta }, inp);
  };

  const cuerpo = c.tipo === 'escalera'
    ? el('div', { class: 'stack stack-4' },
        el('div', { class: 'grid-4' },
          campoEscalera(m, c, 'piezas', 'Escalones', '14', pintar),
          campoEscalera(m, c, 'anchoM', 'Ancho', '.90', pintar),
          campoEscalera(m, c, 'huellaM', 'Huella', '.32', pintar),
          campoEscalera(m, c, 'peralteM', 'Peralte', '.15', pintar)),
        el('div', { class: 'grid-2' },
          campoEscalera(m, c, 'escalonesZoclo', 'Escalones con zoclo', 'todos', pintar),
          campo({ etiqueta: 'Lados con zoclo' },
            selector({
              valor: c.escalera.ladosZoclo ?? 1,
              opciones: [{ valor: 0, etiqueta: 'Sin zoclo' }, { valor: 1, etiqueta: 'Un lado' }, { valor: 2, etiqueta: 'Los dos lados' }],
              onChange: (e) => {
                c.escalera = { ...c.escalera, ladosZoclo: Number(e.target.value) };
                S.actualizarCuarto(m.id, c.id, { escalera: c.escalera });
                pintar(); recalcular();
              },
            }))),
        el('div', { class: 'grid-2' },
          el('div', {}, campoMedida('areas', 'Descanso, en m²', '2.11'), detalleArea),
          el('div', {}, campoMedida('zoclo', 'Zoclo del descanso, en ml', '2.13,1.10'), detalleZoclo)),
        el('p', { class: 'tiny' },
          'Cada escalón consume huella + peralte de material. El zoclo de escalera corre por el filo.'))
    : el('div', { class: 'grid-2' },
        el('div', {},
          campoMedida('areas', 'Área, en m²',
            metodoDe(m) === 'cinta' ? '4*5,2.4*1.8' : '16.45,3.81,2.29'),
          detalleArea),
        el('div', {}, campoMedida('zoclo', 'Zoclo, en metros lineales', '1.91,.88,1.27'), detalleZoclo));

  const tarjeta = el('article', { class: 'cuarto', dataset: { cuarto: c.id } },
    el('div', { class: 'cuarto__head' },
      el('span', { class: 'linea__idx' }, String(indice + 1)),
      entrada({
        valor: c.nombre, placeholder: 'Nombre del cuarto', class: 'input cuarto__nombre',
        list: 'lista-cuartos',
        onInput: (e) => { c.nombre = e.target.value; S.actualizarCuarto(m.id, c.id, { nombre: e.target.value }); },
      }),
      totalEl,
      el('button', {
        class: 'btn btn--danger btn--icon', 'aria-label': 'Quitar cuarto',
        onclick: async () => {
          const r = calcularCuarto(c);
          if (r.areaM2 || r.zocloML) {
            const ok = await confirmar({ titulo: 'Quitar el cuarto',
              mensaje: `"${c.nombre || 'Sin nombre'}" tiene ${fmtNum(r.areaM2, 2)} m² capturados.`,
              textoOk: 'Quitar', peligro: true });
            if (!ok) return;
          }
          await Fotos.borrarFotosDeCuarto(c.id).catch(() => {});
          S.eliminarCuarto(m.id, c.id);
          redibujar();
        },
      }, icono('basura', 15))),
    el('div', { class: 'cuarto__body' }, cuerpo, tiraDeFotos(m, c)));

  pintar();
  return tarjeta;
}

// --------------------------------------------------------------------------- fotos

/**
 * Fotos del cuarto. Opcionales por diseño: quien mide ya trae prisa, y obligar
 * a fotografiar cada cuarto haría que dejaran de usar la herramienta.
 */
function tiraDeFotos(m, c) {
  if (!Fotos.hayAlmacen()) return null;

  const galeria = el('div', { class: 'fotos__tira' });
  const etiqueta = el('span', { class: 'tiny' }, 'Sin fotos');
  const urls = [];

  const pintar = async () => {
    for (const u of urls.splice(0)) URL.revokeObjectURL(u);
    const fotos = await Fotos.fotosDeCuarto(c.id).catch(() => []);

    galeria.replaceChildren(...fotos.map((f) => {
      const url = Fotos.urlDeFoto(f);
      urls.push(url);
      return el('figure', { class: 'foto' },
        el('img', { src: url, alt: `Foto de ${c.nombre || 'el cuarto'}`, loading: 'lazy' }),
        el('button', {
          class: 'foto__quitar', 'aria-label': 'Quitar la foto', title: 'Quitar la foto',
          onclick: async () => {
            const ok = await confirmar({ titulo: 'Quitar la foto',
              mensaje: 'Se borra de esta computadora y no se puede recuperar.',
              textoOk: 'Quitar', peligro: true });
            if (!ok) return;
            await Fotos.borrarFoto(f.id);
            pintar();
          },
        }, icono('cerrar', 12)));
    }));

    etiqueta.textContent = fotos.length
      ? `${fotos.length} ${fotos.length === 1 ? 'foto' : 'fotos'} · ${Fotos.pesoLegible(fotos.reduce((a, f) => a + f.bytes, 0))}`
      : 'Sin fotos';
  };

  // capture="environment" abre la cámara trasera directo en el teléfono.
  // En computadora el mismo botón sirve para elegir un archivo.
  const archivo = el('input', {
    type: 'file', accept: 'image/*', multiple: true, capture: 'environment',
    style: 'display:none',
    onchange: async (e) => {
      const lista = [...e.target.files];
      e.target.value = '';
      if (!lista.length) return;
      try {
        for (const f of lista) await Fotos.guardarFoto(f, { medicionId: m.id, cuartoId: c.id });
        avisar(`${lista.length} ${lista.length === 1 ? 'foto guardada' : 'fotos guardadas'}`);
        pintar();
      } catch (err) {
        console.error(err);
        avisar('No se pudo guardar la foto. Revisa el espacio del navegador.', 'err');
      }
    },
  });

  pintar();

  return el('div', { class: 'fotos mt-4' },
    el('div', { class: 'row row--tight' },
      el('button', { class: 'btn btn--sm', onclick: () => archivo.click() },
        icono('capas', 14), 'Foto'),
      etiqueta,
      archivo),
    galeria);
}

function campoEscalera(m, c, clave, etiqueta, marcador, pintar) {
  const inp = entrada({
    valor: c.escalera?.[clave] ?? '', placeholder: marcador, numero: true,
    inputmode: tecladoDeApp() ? 'none' : 'decimal', autocomplete: 'off',
    onInput: (e) => {
      c.escalera = { ...c.escalera, [clave]: e.target.value };
      S.actualizarCuarto(m.id, c.id, { escalera: c.escalera });
      pintar();
      recalcular();
    },
  });
  inp.classList.add('js-medida');
  inp.addEventListener('focus', () => fijarActivo(inp, `${c.nombre || 'Escalera'} · ${etiqueta}`));
  return campo({ etiqueta }, inp);
}

/** El eco de lo capturado. Sin esto nadie confía en que la suma sea la suya. */
function eco(lista, unidad) {
  if (!lista) return [];
  const salida = [];
  if (lista.valores.length) {
    const partes = lista.valores.map((v) => (v.veces > 1 ? `${v.valor}×${v.veces}` : String(v.valor)));
    salida.push(el('span', { class: 'tiny' },
      `${partes.join(' + ')} = ${fmtNum(lista.suma, 2)} ${unidad} · ${lista.cuenta} medidas`));
  }
  if (lista.errores.length) {
    salida.push(el('span', { class: 'cuarto__error' }, `No entendí: ${lista.errores.join(', ')}`));
  }
  return salida;
}

// --------------------------------------------------------------------------- totales

function barraTotales() {
  return el('div', { class: 'totales' },
    el('div', { class: 'totales__bloque' },
      el('span', { class: 'totales__k' }, 'Área'),
      el('span', { class: 'totales__v num js-t-area' }, '0.00 m²')),
    el('div', { class: 'totales__bloque' },
      el('span', { class: 'totales__k' }, 'Zoclo'),
      el('span', { class: 'totales__v num js-t-zoclo' }, '0.00 ml')),
    el('div', { class: 'totales__bloque totales__bloque--fin' },
      el('span', { class: 'totales__k' }, 'Estimado con IVA'),
      el('span', { class: 'totales__v num js-t-total' }, '—')));
  refs.barra = barra;
  return barra;
}

/** Importe de un cuarto con el precio vigente de la obra, con IVA. */
function precioDeCuarto(cuarto) {
  const m = S.medicionAbierta();
  if (!m) return '—';
  const est = estimarMedicion(m, S.obtener().config, opcionesEstimado(m));
  const linea = est.cuartos.find((x) => x.cuarto.id === cuarto.id);
  return linea && linea.total > 0 ? fmtMXN(linea.total, 0) : '—';
}

function recalcular() {
  const m = S.medicionAbierta();
  if (!m || !refs.barra) return;
  const est = estimarMedicion(m, S.obtener().config, opcionesEstimado(m));
  $('.js-t-area', refs.barra).textContent = `${fmtNum(est.areaM2, 2)} m²`;
  $('.js-t-zoclo', refs.barra).textContent = `${fmtNum(est.zocloML, 2)} ml`;
  $('.js-t-total', refs.barra).textContent = est.areaM2 > 0 ? fmtMXN(est.total, 0) : '—';

  // El importe de cada cuarto se repinta con el total: si cambia el material
  // o la merma, todos los renglones se mueven juntos.
  for (const nodo of document.querySelectorAll('.js-cuartos .cuarto')) {
    const id = nodo.dataset.cuarto;
    const linea = est.cuartos.find((x) => x.cuarto.id === id);
    const destino = nodo.querySelector('.cuarto__mxn');
    if (destino) destino.textContent = linea && linea.total > 0 ? fmtMXN(linea.total, 0) : '—';
  }
}

// --------------------------------------------------------------------------- teclado

const tecladoDeApp = () => S.obtener().config.medidor?.tecladoApp !== false;

function fijarActivo(input, etiqueta) {
  activo = input;
  if (!refs.teclado) return;
  refs.teclado.classList.add('teclado--visible');
  if (refs.tecladoEtq) refs.tecladoEtq.textContent = etiqueta;
}

function insertar(texto) {
  if (!activo) return;
  const ini = activo.selectionStart ?? activo.value.length;
  const fin = activo.selectionEnd ?? ini;
  activo.value = activo.value.slice(0, ini) + texto + activo.value.slice(fin);
  const pos = ini + texto.length;
  try { activo.setSelectionRange(pos, pos); } catch { /* campos numéricos no dejan */ }
  activo.dispatchEvent(new Event('input', { bubbles: true }));
  activo.focus();
}

function borrar() {
  if (!activo) return;
  const ini = activo.selectionStart ?? activo.value.length;
  const fin = activo.selectionEnd ?? ini;
  if (fin > ini) activo.value = activo.value.slice(0, ini) + activo.value.slice(fin);
  else if (ini > 0) activo.value = activo.value.slice(0, ini - 1) + activo.value.slice(ini);
  else return;
  const pos = fin > ini ? ini : Math.max(0, ini - 1);
  try { activo.setSelectionRange(pos, pos); } catch { /* ignorar */ }
  activo.dispatchEvent(new Event('input', { bubbles: true }));
  activo.focus();
}

/** Repetir: si la última medida ya trae (n), sube a (n+1). Si no, pone (2). */
function repetir() {
  if (!activo) return;
  const v = activo.value;
  const m = v.match(/\((\d+)\)\s*$/);
  if (m) {
    const n = Math.min(999, parseInt(m[1], 10) + 1);
    activo.value = v.slice(0, m.index) + `(${n})`;
    activo.dispatchEvent(new Event('input', { bubbles: true }));
    activo.focus();
    return;
  }
  insertar('(2)');
}

const TECLAS = [
  ['7', '8', '9', { t: '⌫', clase: 'teclado__tecla--fn', fn: borrar, etq: 'Borrar' }],
  ['4', '5', '6', { t: ',', clase: 'teclado__tecla--acento', ins: ',', etq: 'Siguiente medida' }],
  ['1', '2', '3', { t: '×', clase: 'teclado__tecla--fn', ins: '*', etq: 'Multiplicar lados' }],
  ['.', '0', { t: '(2)', clase: 'teclado__tecla--fn', fn: repetir, etq: 'Repetir la medida' },
    { t: 'Listo', clase: 'teclado__tecla--ok', fn: ocultarTeclado, etq: 'Cerrar el teclado' }],
];

function ocultarTeclado() {
  activo?.blur();
  activo = null;
  refs.teclado?.classList.remove('teclado--visible');
}

function construirTeclado() {
  const etq = el('span', { class: 'teclado__etq' }, 'Toca un campo de medidas');
  const rejilla = el('div', { class: 'teclado__rejilla' });

  for (const fila of TECLAS) {
    for (const t of fila) {
      const def = typeof t === 'string' ? { t, ins: t } : t;
      rejilla.append(el('button', {
        type: 'button',
        class: `teclado__tecla ${def.clase ?? ''}`,
        title: def.etq ?? '',
        'aria-label': def.etq ?? def.t,
        // mousedown en vez de click: así el campo no pierde el foco al tocar.
        onmousedown: (e) => { e.preventDefault(); },
        onclick: () => (def.fn ? def.fn() : insertar(def.ins)),
      }, def.t));
    }
  }

  const teclado = el('div', { class: 'teclado' },
    el('div', { class: 'teclado__head' },
      etq,
      el('button', { class: 'btn btn--ghost btn--sm', onclick: ocultarTeclado }, 'Ocultar')),
    rejilla);

  refs.teclado = teclado;
  refs.tecladoEtq = etq;
  return teclado;
}

// --------------------------------------------------------------------------- pegar nota

function abrirPegarNota() {
  const area = el('textarea', {
    class: 'textarea', rows: 12, style: 'min-height:260px;font-family:var(--mono);font-size:13px',
    placeholder: 'Jackie\n\nCuarto 2\n16.45,3.81,2.29\nZ-1.91,.88,1.27,.30\n\nCuarto 3\n16.11,1.97\nZ-2.75,4.35,.69',
  });
  const previa = el('div', { class: 'mt-5' });
  let leido = { proyecto: '', cuartos: [] };

  const revisar = () => {
    leido = parsearNota(area.value);
    if (!leido.cuartos.length) {
      previa.replaceChildren(nota('Todavía no encuentro cuartos. Pega la nota completa, con el nombre de cada cuarto en su renglón.', '', 'info'));
      btn.disabled = true;
      return;
    }
    const total = leido.cuartos.reduce((a, c) => a + calcularCuarto(c).areaM2, 0);
    const zoclo = leido.cuartos.reduce((a, c) => a + calcularCuarto(c).zocloML, 0);
    previa.replaceChildren(
      el('p', { class: 'small muted mb-3' },
        `${leido.cuartos.length} cuartos · ${fmtNum(total, 2)} m² · ${fmtNum(zoclo, 2)} ml` +
        (leido.proyecto ? ` · obra "${leido.proyecto}"` : '')),
      el('div', { class: 'tabla-wrap' },
        el('table', { class: 'tabla', style: 'min-width:auto' },
          el('thead', {}, el('tr', {},
            el('th', {}, 'Cuarto'), el('th', { class: 'r' }, 'm²'), el('th', { class: 'r' }, 'ml'))),
          el('tbody', {}, ...leido.cuartos.map((c) => {
            const r = calcularCuarto(c);
            return el('tr', {},
              el('td', {}, c.nombre || 'Sin nombre',
                c.tipo === 'escalera' ? el('span', { class: 'pill pill--sm pill--outline', style: 'margin-left:6px' }, 'escalera') : null),
              el('td', { class: 'r' }, fmtNum(r.areaM2, 2)),
              el('td', { class: 'r' }, fmtNum(r.zocloML, 2)));
          })))));
    btn.disabled = false;
  };

  const btn = el('button', { class: 'btn btn--primary', disabled: true, onclick: () => {
    const abierta = S.medicionAbierta();
    if (abierta) {
      for (const c of leido.cuartos) S.agregarCuarto(abierta.id, c);
      if (!abierta.nombre && leido.proyecto) S.actualizarMedicion(abierta.id, { nombre: leido.proyecto });
    } else {
      const m = medicionVacia(leido.proyecto);
      m.medidoPor = S.usuarioActual();
      m.cuartos = leido.cuartos;
      S.crearMedicion(m);
    }
    cerrarModal();
    avisar(`${leido.cuartos.length} cuartos importados`);
    redibujar();
  } }, 'Importar cuartos');

  area.addEventListener('input', revisar);

  abrirModal({ titulo: 'Pegar la nota del teléfono',
    subtitulo: 'Copia la nota tal como está. La aplicación separa los cuartos, las áreas y los renglones de zoclo.',
    ancho: true },
    el('div', {},
      area,
      el('p', { class: 'tiny mt-3' },
        'Reconoce los renglones que empiezan con Z- como zoclo, "14 piezas / .90 de ancho / .32 huella / .15 peralte" ' +
        'como escalera, y (2) como una medida repetida.'),
      previa),
    [el('button', { class: 'btn', onclick: cerrarModal }, 'Cancelar'), btn]);

  setTimeout(() => area.focus(), 80);
}

// --------------------------------------------------------------------------- estimado

function abrirEstimado(m) {
  const cfg = S.obtener().config;
  // Los números se repintan; los controles se construyen una sola vez,
  // porque rehacerlos mientras se teclea les quita el foco.
  const numeros = el('div', {});

  const pintar = () => {
    const cur = S.medicionAbierta() ?? m;
    const est = estimarMedicion(cur, cfg, opcionesEstimado(cur));
    numeros.replaceChildren(
      el('div', { class: 'grid-3 mb-5' },
        kpi('Área medida', `${fmtNum(est.areaM2, 2)} m²`, `${cur.cuartos.length} cuartos`),
        kpi('Con merma', `${fmtNum(est.areaConMerma, 2)} m²`, `${fmtNum(est.mermaPct * 100, 0)}% de desperdicio`),
        kpi('Zoclo', `${fmtNum(est.zocloML, 2)} ml`, `${fmtMXN(est.precioZocloML, 0)} por metro`)),

      el('div', { class: 'desglose' },
        fila('Material', `${fmtNum(est.areaConMerma, 2)} m² × ${fmtMXN(est.precioM2, 0)}`, fmtMXN(est.material)),
        est.zoclo ? fila('Zoclo', `${fmtNum(est.zocloML, 2)} ml × ${fmtMXN(est.precioZocloML, 0)}`, fmtMXN(est.zoclo)) : null,
        est.instalacion ? fila('Instalación', `${fmtNum(est.areaM2, 2)} m² × ${fmtMXN(est.instalacionM2, 0)}`, fmtMXN(est.instalacion)) : null,
        fila('Subtotal', '', fmtMXN(est.subtotal)),
        fila('IVA', `${fmtNum(cfg.fiscal.iva * 100, 0)}%`, fmtMXN(est.iva)),
        fila('Estimado', 'Sujeto a cotización formal', fmtMXN(est.total), true)));
  };

  const refrescar = () => { pintar(); recalcular(); };

  const cuerpo = el('div', {}, numeros,
    el('div', { class: 'grid-2 mt-5' },
      campo({ etiqueta: 'Precio por m² de esta obra', pista: 'Solo para este estimado. El promedio vive en Ajustes.' },
        entrada({ valor: m.precioM2 ?? cfg.medidor.precioM2, tipo: 'number', paso: '10', numero: true,
          onInput: (e) => { S.actualizarMedicion(m.id, { precioM2: Number(e.target.value) || null }); refrescar(); } })),
      campo({ etiqueta: 'Merma', sufijo: '%' },
        entrada({ valor: Math.round((m.mermaPct ?? cfg.medidor.mermaPct) * 100), tipo: 'number', paso: '1', numero: true,
          onInput: (e) => { S.actualizarMedicion(m.id, { mermaPct: (Number(e.target.value) || 0) / 100 }); refrescar(); } }))),

    el('div', { class: 'mt-5' },
      casilla({ marcado: m.incluirZoclo !== false, texto: 'Incluir el zoclo en el estimado',
        onChange: (v) => { S.actualizarMedicion(m.id, { incluirZoclo: v }); refrescar(); } })),

    el('div', { class: 'mt-5' },
      nota('Es un estimado de campo con el precio promedio, no una cotización. Los números finos ' +
           '(caja completa, patrón, accesorios, tiempo de entrega) salen del cotizador con el material ya elegido.',
           'warn', 'alerta')));

  pintar();
  abrirModal({ titulo: 'Estimado de la obra', subtitulo: m.nombre || 'Obra sin nombre', ancho: true },
    cuerpo,
    [el('button', { class: 'btn', onclick: cerrarModal }, 'Cerrar'),
     el('button', { class: 'btn btn--primary', onclick: () => { cerrarModal(); abrirPasarACotizador(m); } },
       'Pasar al cotizador')]);
}

const kpi = (k, v, n) => el('div', { class: 'kpi' },
  el('div', { class: 'kpi__label' }, k),
  el('div', { class: 'kpi__value' }, v),
  n ? el('div', { class: 'kpi__note mt-3' }, n) : null);

const fila = (k, sub, v, total = false) => el('div', { class: `desglose__row${total ? ' desglose__row--total' : ''}` },
  el('span', { class: 'desglose__label' }, k, sub ? el('span', { class: 'tiny', style: 'display:block' }, sub) : null),
  el('span', { class: 'desglose__val' }, v));

// --------------------------------------------------------------------------- pasar al cotizador

function abrirPasarACotizador(m) {
  const s = S.obtener();
  const t = calcularMedicion(m);

  if (!(t.areaM2 > 0)) {
    avisar('Captura al menos un área antes de cotizar.', 'err');
    return;
  }

  const pisos = s.catalogo.filter((p) => CATEGORIAS[p.categoria]?.familia === 'piso');
  const busca = entrada({ placeholder: 'Buscar el material: encino, spc, porcelanato…', autofocus: true });
  const lista = el('div', { class: 'res mt-4', style: 'max-height:340px;overflow:auto' });

  const pintar = () => {
    const res = S.buscarProductos(pisos, busca.value).slice(0, 40);
    lista.replaceChildren(...(res.length
      ? res.map(({ producto: p }) => el('button', { class: 'res__item', onclick: () => usar(p) },
          el('span', { class: 'res__main' },
            el('span', { class: 'res__name' }, p.nombre),
            el('span', { class: 'res__meta' }, `${CATEGORIAS[p.categoria]?.nombre ?? ''} · ${p.sku}`)),
          el('span', { class: 'res__price' },
            el('span', { class: 'res__amount' }, fmtMXN(p.precio, 0)),
            el('span', { class: 'res__unit' }, `${p.moneda} / ${p.unidad}`))))
      : [el('div', { class: 'res__empty' }, 'Ningún material coincide.')]));
  };

  const usar = (producto) => {
    S.actualizarCliente({
      nombre: m.cliente || S.obtener().cotizacion.cliente.nombre,
      obra: m.nombre || S.obtener().cotizacion.cliente.obra,
    });
    S.agregarPartida({
      id: uid('pt'),
      productoId: producto.id,
      areaM2: t.areaM2,
      patron: 'recto',
      perimetroM: t.zocloML || '',
      incluirInstalacion: true,
      incluirZoclo: t.zocloML > 0,
      incluirUnderlayment: ['spc', 'laminado'].includes(producto.categoria),
      incluirAdhesivo: false,
      incluirBoquilla: producto.categoria === 'porcelanato',
      perfilesTransicion: 0,
      anchoM: '', altoM: '', cantidad: 1, pliegue: 2.5,
      incluirRiel: false, rielMotorizado: false, incluirForro: false,
      motorizada: false, sensorViento: false,
      margenOverride: null, descuentoPct: 0,
      _origenMedicion: m.id,
    });
    cerrarModal();
    avisar(`${fmtNum(t.areaM2, 2)} m² pasados al cotizador`);
    location.hash = '#/cotizador';
  };

  busca.addEventListener('input', pintar);
  pintar();

  abrirModal({ titulo: 'Pasar la obra al cotizador',
    subtitulo: `${fmtNum(t.areaM2, 2)} m² y ${fmtNum(t.zocloML, 2)} ml de zoclo. Elige el material y se crea la partida.` },
    el('div', {}, busca, lista,
      el('p', { class: 'tiny mt-3' },
        'Se crea una sola partida con el total de la obra. Si cada cuarto lleva material distinto, ' +
        'agrégalos por separado desde el cotizador.')),
    [el('button', { class: 'btn', onclick: cerrarModal }, 'Cancelar')]);
}

// --------------------------------------------------------------------------- redibujo

function redibujar() {
  window.dispatchEvent(new CustomEvent('fmp:rerender'));
}
