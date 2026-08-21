// Ajustes: datos de la empresa, tarifas, importación de catálogo y respaldos.

import { el, fmtMXN, fmtNum, fmtFechaCorta } from '../format.js';
import * as S from '../state.js';
import { CATEGORIAS } from '../pricing.js';
import { leerArchivo, sugerirMapeo, mapearFilas, plantillaCSV } from '../importer.js';
import { icono, accion, campo, entrada, selector, casilla, abrirModal, cerrarModal,
         confirmar, avisar, nota, descargarTexto } from '../ui.js';

export function render(raiz) {
  const s = S.obtener();

  raiz.append(el('div', { class: 'view' },
    el('header', { class: 'section' },
      el('p', { class: 'eyebrow' }, 'Ajustes'),
      el('h1', { class: 'display mt-3' }, 'Configuración'),
      el('p', { class: 'lead mt-3' },
        'Los datos que salen en el PDF, las tarifas del cálculo y la carga del catálogo real.')),

    el('div', { class: 'stack stack-3' },
      bloqueEmpresa(s),
      bloqueComercial(s),
      bloqueTarifas(s),
      bloqueCatalogo(s),
      bloqueRespaldo(s),
      bloqueHistorial(s))));
}

const guardarEn = (ruta) => (e) => {
  const v = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
  S.actualizarConfig(ruta, v);
};
const guardarPct = (ruta) => (e) => S.actualizarConfig(ruta, Number(e.target.value || 0) / 100);

// --------------------------------------------------------------------------- empresa

function bloqueEmpresa(s) {
  const e = s.config.empresa;

  const vistaLogo = el('div', {
    style: 'width:74px;height:74px;border-radius:10px;border:1px solid var(--accent-line);' +
           'background:var(--accent-soft);display:grid;place-items:center;overflow:hidden;flex:none',
  });
  const pintarLogo = () => {
    const actual = S.obtener().config.empresa.logoDataUrl;
    vistaLogo.replaceChildren(actual
      ? el('img', { src: actual, style: 'width:100%;height:100%;object-fit:contain' })
      : el('span', { class: 'tiny', style: 'color:var(--accent);text-align:center' }, 'Sin logo'));
  };
  pintarLogo();

  const archivo = el('input', {
    type: 'file', accept: 'image/png,image/jpeg,image/svg+xml', class: 'hidden',
    onchange: (ev) => {
      const f = ev.target.files?.[0];
      if (!f) return;
      if (f.size > 900_000) return avisar('La imagen pesa más de 900 KB. Usa una versión más ligera.', 'err');
      const lector = new FileReader();
      lector.onload = () => {
        S.actualizarConfig('empresa.logoDataUrl', lector.result);
        pintarLogo();
        avisar('Logotipo actualizado');
      };
      lector.readAsDataURL(f);
    },
  });

  return accion(
    { iconoNombre: 'usuario', titulo: 'Datos de la empresa',
      pista: 'Encabezado y pie de todas las cotizaciones' },
    el('hr', { class: 'rule mt-0' }),
    el('div', { class: 'row mb-5', style: 'align-items:flex-start;gap:20px' },
      vistaLogo,
      el('div', { style: 'flex:1;min-width:0' },
        el('p', { class: 'field__label' }, 'Logotipo'),
        el('p', { class: 'tiny mb-3' }, 'PNG o JPG cuadrado, de preferencia con fondo transparente. Se imprime a 26 mm en el PDF.'),
        el('div', { class: 'row row--tight' },
          el('button', { class: 'btn btn--sm', onclick: () => archivo.click() }, icono('subir', 14), 'Subir imagen'),
          S.obtener().config.empresa.logoDataUrl
            ? el('button', {
                class: 'btn btn--danger btn--sm',
                onclick: () => { S.actualizarConfig('empresa.logoDataUrl', null); pintarLogo(); },
              }, 'Quitar')
            : null),
        archivo)),

    el('div', { class: 'grid-2' },
      campo({ etiqueta: 'Nombre comercial' }, entrada({ valor: e.nombre, onChange: guardarEn('empresa.nombre') })),
      campo({ etiqueta: 'Razón social' }, entrada({ valor: e.razonSocial, onChange: guardarEn('empresa.razonSocial') })),
      campo({ etiqueta: 'Descriptor', pista: 'Una línea bajo el nombre' },
        entrada({ valor: e.tagline, onChange: guardarEn('empresa.tagline') })),
      campo({ etiqueta: 'Año de fundación', pista: 'Se imprime como "DESDE 1987"' },
        entrada({ valor: e.fundacion, onChange: guardarEn('empresa.fundacion') })),
      campo({ etiqueta: 'Teléfono' }, entrada({ valor: e.telefono, onChange: guardarEn('empresa.telefono') })),
      campo({ etiqueta: 'Correo' }, entrada({ valor: e.email, tipo: 'email', onChange: guardarEn('empresa.email') })),
      campo({ etiqueta: 'Sitio web' }, entrada({ valor: e.web, onChange: guardarEn('empresa.web') })),
      campo({ etiqueta: 'RFC' }, entrada({ valor: e.rfc, onChange: guardarEn('empresa.rfc') }))),
    el('div', { class: 'mt-4' },
      campo({ etiqueta: 'Dirección', pista: 'Aparece en el encabezado y en el pie de las dos páginas' },
        entrada({ valor: e.direccion, onChange: guardarEn('empresa.direccion') }))),
    el('div', { class: 'mt-4' },
      nota('Los datos que vienen cargados son de ejemplo. Sustitúyelos antes de enviar la primera cotización real.', 'warn', 'alerta')));
}

// --------------------------------------------------------------------------- comercial

function bloqueComercial(s) {
  const c = s.config.comercial;
  const f = s.config.fiscal;
  const l = s.config.logistica;

  return accion(
    { iconoNombre: 'barras', titulo: 'Política comercial y fiscal',
      pista: 'Margen, IVA, tipo de cambio y plazos de importación' },
    el('hr', { class: 'rule mt-0' }),
    el('div', { class: 'grid-3' },
      campo({ etiqueta: 'Margen bruto por defecto', sufijo: '%',
              pista: 'Se puede sobrescribir en cada partida' },
        entrada({ valor: c.margenDefault * 100, tipo: 'number', paso: '0.5', min: '0', max: '90', numero: true,
                  onChange: guardarPct('comercial.margenDefault') })),
      campo({ etiqueta: 'IVA', sufijo: '%' },
        entrada({ valor: f.iva * 100, tipo: 'number', paso: '0.5', min: '0', numero: true,
                  onChange: guardarPct('fiscal.iva') })),
      campo({ etiqueta: 'Tipo de cambio USD', sufijo: 'MXN',
              pista: 'Actualízalo cada semana' },
        entrada({ valor: f.tipoCambio, tipo: 'number', paso: '0.01', min: '0', numero: true,
                  onChange: guardarEn('fiscal.tipoCambio') })),
      campo({ etiqueta: 'Vigencia de la cotización', sufijo: 'días' },
        entrada({ valor: c.vigenciaDias, tipo: 'number', paso: '1', min: '1', numero: true,
                  onChange: guardarEn('comercial.vigenciaDias') })),
      campo({ etiqueta: 'Anticipo', sufijo: '%' },
        entrada({ valor: c.anticipoPct * 100, tipo: 'number', paso: '5', min: '0', max: '100', numero: true,
                  onChange: guardarPct('comercial.anticipoPct') })),
      campo({ etiqueta: 'Garantía', sufijo: 'años' },
        entrada({ valor: c.garantiaAnios, tipo: 'number', paso: '1', min: '0', numero: true,
                  onChange: guardarEn('comercial.garantiaAnios') }))),

    el('hr', { class: 'rule' }),
    el('p', { class: 'field__label mb-3' }, 'Logística de importación'),
    el('div', { class: 'grid-3' },
      campo({ etiqueta: 'Tránsito marítimo', sufijo: 'días' },
        entrada({ valor: l.diasTransito, tipo: 'number', paso: '1', min: '0', numero: true,
                  onChange: guardarEn('logistica.diasTransito') })),
      campo({ etiqueta: 'Despacho aduanal', sufijo: 'días' },
        entrada({ valor: l.diasAduana, tipo: 'number', paso: '1', min: '0', numero: true,
                  onChange: guardarEn('logistica.diasAduana') })),
      campo({ etiqueta: 'Rendimiento de instalación', sufijo: 'm²/día',
              pista: 'Para estimar la fecha de terminación' },
        entrada({ valor: l.diasInstalacionM2, tipo: 'number', paso: '1', min: '1', numero: true,
                  onChange: guardarEn('logistica.diasInstalacionM2') }))),
    el('div', { class: 'mt-4' },
      nota(`Con estos valores, un producto importado con 30 días de fábrica se compromete a ${30 + l.diasTransito + l.diasAduana} días naturales desde el anticipo.`,
           'accent', 'reloj')));
}

// --------------------------------------------------------------------------- tarifas

function bloqueTarifas(s) {
  const t = s.config.tarifas;
  const num = (ruta, valor, etiqueta, sufijo, pista) =>
    campo({ etiqueta, sufijo, pista },
      entrada({ valor, tipo: 'number', paso: '1', min: '0', numero: true, onChange: guardarEn(ruta) }));

  return accion(
    { iconoNombre: 'regla', titulo: 'Tarifas de mano de obra y accesorios',
      pista: 'Los costos que la app suma sola en cada partida' },
    el('hr', { class: 'rule mt-0' }),
    el('p', { class: 'small muted mb-4' },
      'Son costos, no precios de venta. El margen se aplica encima. La tarifa de instalación se multiplica por el factor del patrón de colocación.'),

    el('p', { class: 'field__label mb-3' }, 'Instalación de piso, por m²'),
    el('div', { class: 'grid-3' },
      ...['duela-ingenieria', 'spc', 'laminado', 'deck', 'porcelanato'].map((k) =>
        num(`tarifas.instalacion.${k}`, t.instalacion[k], CATEGORIAS[k].nombre, 'MXN/m²'))),

    el('hr', { class: 'rule' }),
    el('p', { class: 'field__label mb-3' }, 'Accesorios de piso'),
    el('div', { class: 'grid-3' },
      num('tarifas.zocloML', t.zocloML, 'Zoclo', 'MXN/ml'),
      num('tarifas.underlaymentM2', t.underlaymentM2, 'Barrera de vapor', 'MXN/m²'),
      num('tarifas.perfilTransicionPza', t.perfilTransicionPza, 'Perfil de transición', 'MXN/pza'),
      num('tarifas.adhesivoCubeta', t.adhesivoCubeta, 'Adhesivo', 'MXN/cubeta'),
      num('tarifas.rendimientoAdhesivoM2', t.rendimientoAdhesivoM2, 'Rendimiento del adhesivo', 'm²/cubeta'),
      num('tarifas.boquillaKg', t.boquillaKg, 'Boquilla epóxica', 'MXN/kg')),

    el('hr', { class: 'rule' }),
    el('p', { class: 'field__label mb-3' }, 'Cortinería y persianas'),
    el('div', { class: 'grid-3' },
      num('tarifas.confeccionML', t.confeccionML, 'Confección', 'MXN/ml'),
      num('tarifas.rielML', t.rielML, 'Riel manual', 'MXN/ml'),
      num('tarifas.rielMotorizadoML', t.rielMotorizadoML, 'Riel motorizado', 'MXN/ml'),
      num('tarifas.forroML', t.forroML, 'Forro térmico', 'MXN/ml'),
      num('tarifas.instalacionCortinaML', t.instalacionCortinaML, 'Instalación de cortina', 'MXN/ml'),
      num('tarifas.minimoInstalacionCortina', t.minimoInstalacionCortina, 'Mínimo por visita', 'MXN'),
      campo({ etiqueta: 'Dobladillos', sufijo: 'm', pista: 'Superior más inferior' },
        entrada({ valor: t.dobladilloM, tipo: 'number', paso: '0.05', min: '0', numero: true,
                  onChange: guardarEn('tarifas.dobladilloM') })),
      campo({ etiqueta: 'Área mínima de persiana', sufijo: 'm²', pista: 'Mínimo facturable por pieza' },
        entrada({ valor: t.areaMinimaPersiana, tipo: 'number', paso: '0.1', min: '0', numero: true,
                  onChange: guardarEn('tarifas.areaMinimaPersiana') })),
      num('tarifas.instalacionPersianaPza', t.instalacionPersianaPza, 'Instalación de persiana', 'MXN/pza'),
      num('tarifas.motorPersianaPza', t.motorPersianaPza, 'Motorización', 'MXN/pza')));
}

// --------------------------------------------------------------------------- catálogo

function bloqueCatalogo(s) {
  return accion(
    { iconoNombre: 'caja', titulo: 'Catálogo de productos',
      pista: `${s.catalogo.length} materiales cargados${s.catalogoEsDemo ? ' (demostración)' : ''}`,
      abierto: s.catalogoEsDemo },
    el('hr', { class: 'rule mt-0' }),
    s.catalogoEsDemo
      ? el('div', { class: 'mb-4' },
          nota('El catálogo actual es de demostración. Los precios son de referencia de mercado, no los de la empresa.', 'warn', 'alerta'))
      : null,
    el('p', { class: 'small muted mb-4' },
      'La app lee archivos .xlsx, .xls y .csv, detecta las columnas y te muestra qué va a entrar antes de confirmar. ',
      'El dato más importante es el rendimiento por caja en m²: sin él no hay redondeo a caja completa.'),
    el('div', { class: 'row row--tight' },
      el('button', { class: 'btn btn--primary js-importar', onclick: abrirImportador }, icono('subir', 15), 'Importar catálogo'),
      el('button', {
        class: 'btn',
        onclick: () => {
          descargarTexto('plantilla-catalogo.csv', '﻿' + plantillaCSV(), 'text/csv;charset=utf-8');
          avisar('Plantilla descargada');
        },
      }, icono('bajar', 15), 'Descargar plantilla')));
}

function abrirImportador() {
  let datos = null;
  let mapeo = {};
  let modo = 'reemplazar';

  const zonaArchivo = el('div', {});
  const zonaMapeo = el('div', {});
  const zonaPreview = el('div', {});
  const btnConfirmar = el('button', { class: 'btn btn--primary', disabled: true }, 'Importar');

  const inputArchivo = el('input', {
    type: 'file', accept: '.xlsx,.xls,.csv,.txt', class: 'hidden',
    onchange: (ev) => cargar(ev.target.files?.[0]),
  });

  async function cargar(f, hoja = null) {
    if (!f) return;
    zonaArchivo.replaceChildren(el('p', { class: 'small muted' }, 'Leyendo el archivo…'));
    try {
      datos = await leerArchivo(f, hoja);
      datos._archivo = f;
      mapeo = sugerirMapeo(datos.columnas);
      pintarArchivo();
      pintarMapeo();
      pintarPreview();
    } catch (err) {
      console.error(err);
      zonaArchivo.replaceChildren(nota(`No se pudo leer: ${err.message}`, 'danger', 'alerta'));
    }
  }

  function pintarArchivo() {
    zonaArchivo.replaceChildren(
      el('div', { class: 'card card--flat' },
        el('div', { class: 'row' },
          icono('caja', 20),
          el('div', { style: 'flex:1;min-width:0' },
            el('p', { style: 'font-weight:500' }, datos._archivo.name),
            el('p', { class: 'tiny' }, `${datos.filas.length} filas · ${datos.columnas.length} columnas`)),
          el('button', { class: 'btn btn--sm', onclick: () => inputArchivo.click() }, 'Cambiar')),
        datos.hojas.length > 1
          ? el('div', { class: 'mt-4' },
              campo({ etiqueta: 'Hoja del libro', pista: 'El archivo tiene varias hojas' },
                selector({
                  valor: datos.hoja,
                  opciones: datos.hojas.map((h) => ({ valor: h, etiqueta: h })),
                  onChange: (e) => cargar(datos._archivo, e.target.value),
                })))
          : null));
  }

  function pintarMapeo() {
    const campos = [
      ['nombre', 'Nombre del producto', true],
      ['precio', 'Precio de costo', true],
      ['categoria', 'Familia o categoría', false],
      ['sku', 'SKU o clave', false],
      ['m2PorCaja', 'Rendimiento por caja (m²)', false],
      ['especie', 'Material o especie', false],
      ['espesorMm', 'Espesor (mm)', false],
      ['anchoMm', 'Ancho (mm)', false],
      ['largoMm', 'Largo (mm)', false],
      ['acabado', 'Acabado', false],
      ['color', 'Color', false],
      ['tela', 'Tela', false],
      ['anchoRolloM', 'Ancho de rollo (m)', false],
      ['moneda', 'Moneda', false],
      ['unidad', 'Unidad', false],
      ['origen', 'Origen', false],
      ['importado', 'Importado', false],
      ['leadTimeDias', 'Días de entrega', false],
      ['stock', 'Existencia', false],
      ['notas', 'Notas', false],
    ];
    const opciones = [{ valor: '', etiqueta: '— No usar —' },
      ...datos.columnas.map((c) => ({ valor: c, etiqueta: c }))];

    zonaMapeo.replaceChildren(
      el('p', { class: 'field__label mb-3' }, 'Correspondencia de columnas'),
      el('p', { class: 'tiny mb-4' },
        'La app propuso esto leyendo los encabezados. Corrige lo que esté mal. Los campos marcados son obligatorios.'),
      el('div', { class: 'grid-2' },
        ...campos.map(([clave, etiqueta, requerido]) =>
          campo({ etiqueta: requerido ? `${etiqueta} *` : etiqueta },
            selector({
              valor: mapeo[clave] ?? '',
              opciones,
              onChange: (e) => {
                if (e.target.value) mapeo[clave] = e.target.value;
                else delete mapeo[clave];
                pintarPreview();
              },
            })))));
  }

  function pintarPreview() {
    if (!datos) return;
    const r = mapearFilas(datos.filas, mapeo, { categoriaPorDefecto: null });

    btnConfirmar.disabled = r.productos.length === 0;
    btnConfirmar.textContent = r.productos.length
      ? `Importar ${r.productos.length} materiales`
      : 'Importar';

    const porCategoria = {};
    for (const p of r.productos) porCategoria[p.categoria] = (porCategoria[p.categoria] ?? 0) + 1;

    zonaPreview.replaceChildren(
      el('hr', { class: 'rule' }),
      el('div', { class: 'grid-3 mb-4' },
        el('div', { class: 'kpi' },
          el('div', { class: 'kpi__label' }, 'Entran'),
          el('div', { class: 'kpi__value', style: 'color:var(--ok)' }, r.productos.length)),
        el('div', { class: 'kpi' },
          el('div', { class: 'kpi__label' }, 'Se descartan'),
          el('div', { class: 'kpi__value', style: r.descartadas.length ? 'color:var(--danger)' : '' }, r.descartadas.length)),
        el('div', { class: 'kpi' },
          el('div', { class: 'kpi__label' }, 'Avisos'),
          el('div', { class: 'kpi__value', style: r.avisos.length ? 'color:var(--warn)' : '' }, r.avisos.length))),

      Object.keys(porCategoria).length
        ? el('div', { class: 'pill-group mb-4' },
            ...Object.entries(porCategoria).map(([k, n]) =>
              el('span', { class: 'pill' }, `${CATEGORIAS[k]?.nombre ?? k}: ${n}`)))
        : null,

      r.productos.length
        ? el('div', { class: 'tabla-wrap mb-4' },
            el('table', { class: 'tabla' },
              el('thead', {}, el('tr', {},
                el('th', {}, 'Nombre'), el('th', {}, 'Familia'), el('th', {}, 'SKU'),
                el('th', { class: 'r' }, 'Caja'), el('th', { class: 'r' }, 'Precio'), el('th', { class: 'r' }, 'Entrega'))),
              el('tbody', {}, ...r.productos.slice(0, 8).map((p) => el('tr', {},
                el('td', {}, p.nombre),
                el('td', {}, el('span', { class: 'pill pill--sm' }, CATEGORIAS[p.categoria]?.nombre ?? p.categoria)),
                el('td', { class: 'tiny' }, p.sku),
                el('td', { class: 'r small' }, p.m2PorCaja ? `${fmtNum(p.m2PorCaja)} m²` : '—'),
                el('td', { class: 'r' }, `${p.moneda} ${fmtNum(p.precio)}`),
                el('td', { class: 'r small' }, `${p.leadTimeDias} d`))))))
        : nota('Ninguna fila se pudo convertir. Revisa que estén mapeadas las columnas de nombre y precio.', 'danger', 'alerta'),

      r.descartadas.length
        ? el('details', { class: 'disc' },
            el('summary', { class: 'disc__head' },
              el('span', {}, `Ver las ${r.descartadas.length} filas descartadas`),
              el('span', { class: 'disc__chev' }, icono('chevron', 16, 1.8))),
            el('div', { class: 'disc__body' },
              el('ul', { class: 'small', style: 'margin:0;padding-left:20px' },
                ...r.descartadas.slice(0, 40).map((d) => el('li', {}, `Fila ${d.fila}: ${d.razon}`)),
                r.descartadas.length > 40 ? el('li', { class: 'muted' }, `…y ${r.descartadas.length - 40} más`) : null)))
        : null,

      r.avisos.length
        ? el('details', { class: 'disc mt-3' },
            el('summary', { class: 'disc__head' },
              el('span', {}, `Ver ${r.avisos.length} avisos`),
              el('span', { class: 'disc__chev' }, icono('chevron', 16, 1.8))),
            el('div', { class: 'disc__body' },
              el('ul', { class: 'small', style: 'margin:0;padding-left:20px' },
                ...r.avisos.slice(0, 40).map((a) => el('li', {}, a)))))
        : null,

      el('div', { class: 'mt-5' },
        el('p', { class: 'field__label mb-3' }, '¿Qué hacer con lo que ya está cargado?'),
        el('div', { class: 'pill-group' },
          el('button', {
            class: 'pill pill-toggle', 'aria-pressed': String(modo === 'reemplazar'), type: 'button',
            onclick: (ev) => { modo = 'reemplazar'; sincronizarModo(ev.target.parentElement); },
          }, 'Reemplazar todo el catálogo'),
          el('button', {
            class: 'pill pill-toggle', 'aria-pressed': String(modo === 'fusionar'), type: 'button',
            onclick: (ev) => { modo = 'fusionar'; sincronizarModo(ev.target.parentElement); },
          }, 'Fusionar por SKU'))));

    btnConfirmar.onclick = async () => {
      const ok = await confirmar({
        titulo: modo === 'reemplazar' ? 'Reemplazar el catálogo' : 'Fusionar el catálogo',
        textoOk: 'Importar',
        mensaje: modo === 'reemplazar'
          ? `Se eliminan los ${S.obtener().catalogo.length} materiales actuales y quedan ${r.productos.length}. Exporta un respaldo antes si tienes dudas.`
          : `Se actualizan los materiales que coincidan por SKU y se agregan los nuevos. Quedarán al menos ${S.obtener().catalogo.length} materiales.`,
      });
      if (!ok) return;
      S.reemplazarCatalogo(r.productos, { fusionar: modo === 'fusionar' });
      cerrarModal();
      avisar(`${r.productos.length} materiales importados`);
      S.guardarAhora();
      window.dispatchEvent(new CustomEvent('fmp:rerender'));
    };
  }

  function sincronizarModo(grupo) {
    for (const b of grupo.children) {
      b.setAttribute('aria-pressed', String(b.textContent.includes(modo === 'reemplazar' ? 'Reemplazar' : 'Fusionar')));
    }
  }

  zonaArchivo.replaceChildren(
    el('div', { class: 'card card--quiet text-c', style: 'padding:40px 24px' },
      el('div', { class: 'vacio__icon' }, icono('subir', 24)),
      el('p', { class: 'subtitle' }, 'Sube el archivo del catálogo'),
      el('p', { class: 'small muted mt-3' }, 'Excel (.xlsx, .xls) o CSV. Se lee en tu computadora, no se sube a ningún servidor.'),
      el('div', { class: 'row mt-5', style: 'justify-content:center' },
        el('button', { class: 'btn btn--primary', onclick: () => inputArchivo.click() }, 'Elegir archivo'),
        el('button', {
          class: 'btn',
          onclick: () => descargarTexto('plantilla-catalogo.csv', '﻿' + plantillaCSV(), 'text/csv;charset=utf-8'),
        }, 'Descargar plantilla'))));

  abrirModal(
    { titulo: 'Importar catálogo', ancho: true,
      subtitulo: 'Tres pasos: subir el archivo, revisar las columnas y confirmar lo que entra.' },
    el('div', { class: 'stack stack-5' }, inputArchivo, zonaArchivo, zonaMapeo, zonaPreview),
    [el('button', { class: 'btn', onclick: cerrarModal }, 'Cancelar'), btnConfirmar]);
}

// --------------------------------------------------------------------------- respaldo

function bloqueRespaldo(s) {
  const inputRestaurar = el('input', {
    type: 'file', accept: '.json', class: 'hidden',
    onchange: async (ev) => {
      const f = ev.target.files?.[0];
      if (!f) return;
      const ok = await confirmar({
        titulo: 'Restaurar respaldo', textoOk: 'Restaurar', peligro: true,
        mensaje: 'Se sustituye todo: catálogo, ajustes, cotización en curso e historial.',
      });
      if (!ok) return;
      try {
        S.importarRespaldo(await f.text());
        avisar('Respaldo restaurado');
        S.guardarAhora();
      window.dispatchEvent(new CustomEvent('fmp:rerender'));
      } catch (err) {
        avisar(`Archivo inválido: ${err.message}`, 'err');
      }
    },
  });

  return accion(
    { iconoNombre: 'copiar', titulo: 'Respaldo y sincronización',
      pista: 'Cómo mover los datos entre las computadoras del equipo' },
    el('hr', { class: 'rule mt-0' }),
    nota('Los datos viven en este navegador, en esta computadora. No hay servidor: lo que cargues aquí no lo ven tus compañeros y se pierde si se limpian los datos del navegador.',
         'warn', 'alerta'),
    el('p', { class: 'small muted mt-4 mb-4' },
      'Mientras no exista la versión con base de datos, la forma de trabajar en equipo es: una persona mantiene el catálogo, exporta el respaldo y el resto lo restaura. ',
      'Hazlo cada vez que cambien precios.'),
    el('div', { class: 'row row--tight' },
      el('button', {
        class: 'btn',
        onclick: () => {
          descargarTexto(`respaldo-cotizador-${new Date().toISOString().slice(0, 10)}.json`,
            S.exportarRespaldo(), 'application/json');
          avisar('Respaldo descargado');
        },
      }, icono('bajar', 15), 'Exportar respaldo'),
      el('button', { class: 'btn', onclick: () => inputRestaurar.click() }, icono('subir', 15), 'Restaurar respaldo'),
      inputRestaurar,
      el('button', {
        class: 'btn btn--danger',
        onclick: async () => {
          const ok = await confirmar({
            titulo: 'Restablecer la aplicación', textoOk: 'Borrar todo', peligro: true,
            mensaje: 'Se borran catálogo, ajustes, cotización en curso e historial, y vuelve el catálogo de demostración.',
          });
          if (!ok) return;
          S.restablecer();
          window.dispatchEvent(new CustomEvent('fmp:rerender'));
          avisar('Aplicación restablecida');
        },
      }, icono('basura', 15), 'Restablecer todo')));
}

// --------------------------------------------------------------------------- historial

function bloqueHistorial(s) {
  const h = s.historial ?? [];
  return accion(
    { iconoNombre: 'reloj', titulo: 'Cotizaciones emitidas',
      pista: h.length ? `${h.length} registradas en este equipo` : 'Todavía no generas ninguna' },
    el('hr', { class: 'rule mt-0' }),
    !h.length
      ? el('p', { class: 'small muted' }, 'Cada PDF que generes queda registrado aquí con su folio, cliente, total y margen.')
      : el('div', { class: 'tabla-wrap' },
          el('table', { class: 'tabla' },
            el('thead', {}, el('tr', {},
              el('th', {}, 'Folio'), el('th', {}, 'Fecha'), el('th', {}, 'Cliente'),
              el('th', { class: 'r' }, 'Partidas'), el('th', { class: 'r' }, 'Total'), el('th', { class: 'r' }, 'Margen'))),
            el('tbody', {}, ...h.slice(0, 40).map((c) => el('tr', {},
              el('td', { style: 'font-weight:500' }, c.folio ?? '—'),
              el('td', { class: 'small muted' }, fmtFechaCorta(c.fecha)),
              el('td', {}, c.cliente || '—',
                c.obra ? el('div', { class: 'tiny' }, c.obra) : null),
              el('td', { class: 'r small' }, c.partidas),
              el('td', { class: 'r', style: 'font-weight:600' }, fmtMXN(c.total)),
              el('td', { class: 'r' },
                el('span', {
                  class: `pill pill--sm ${c.margen < 0.25 ? 'pill--danger' : c.margen < 0.3 ? 'pill--warn' : 'pill--ok'}`,
                }, `${fmtNum(c.margen * 100, 1)}%`))))))));
}
