// Qué incluye el servicio. Sirve al equipo de Fernando para saber qué tienen
// contratado, y a Fernando para ver qué sigue.

import { el } from '../format.js';
import { icono, accion, desplegable, nota } from '../ui.js';

const INCLUIDO = [
  {
    icono: 'buscar', titulo: 'Buscador de materiales',
    detalle: 'Combina varias palabras a la vez. Encuentra por nombre, SKU, especie, medida, acabado, color y también por el nombre en inglés del material.',
    estado: 'Activo',
  },
  {
    icono: 'regla', titulo: 'Motor de cálculo por familia',
    detalle: 'Cinco motores distintos: pisos con merma y caja completa, cortinería por pliegue y ancho de rollo, persianas con área mínima, porcelanato con boquilla, y accesorios por pieza.',
    estado: 'Activo',
  },
  {
    icono: 'caja', titulo: 'Catálogo editable',
    detalle: 'Alta, edición y baja de materiales. Cambio de precio masivo por familia. Exportación a CSV para respaldo o para mandar al contador.',
    estado: 'Activo',
  },
  {
    icono: 'subir', titulo: 'Importación desde Excel',
    detalle: 'Lee .xlsx, .xls y .csv. Detecta las columnas por el encabezado, permite corregir el mapeo y muestra qué entra y qué se descarta antes de confirmar.',
    estado: 'Activo',
  },
  {
    icono: 'pdf', titulo: 'PDF de propuesta',
    detalle: 'Hasta tres páginas: propuesta con gráfica de inversión, anexo técnico con especificaciones, y tiempos, pagos y condiciones. Con logotipo, contacto y firma.',
    estado: 'Activo',
  },
  {
    icono: 'copiar', titulo: 'Mensajes de seguimiento',
    detalle: 'Nueve plantillas listas: envío, seguimiento a tres y siete días, alternativas por precio, vencimiento, anticipo, tránsito, instalación y cierre. Salen por correo o WhatsApp.',
    estado: 'Activo',
  },
  {
    icono: 'barras', titulo: 'Control de margen en vivo',
    detalle: 'El margen real se ve mientras se cotiza. Bajo 30% avisa en ámbar, bajo 25% en rojo, y por debajo del costo pide confirmación antes de generar el PDF.',
    estado: 'Activo',
  },
  {
    icono: 'reloj', titulo: 'Tiempos de entrega con importación',
    detalle: 'Fábrica más tránsito marítimo más despacho aduanal. La partida más lenta define la fecha comprometida de toda la obra.',
    estado: 'Activo',
  },
  {
    icono: 'usuario', titulo: 'Bitácora de cambios',
    detalle: 'Quién dio de alta, quién cambió un precio y de cuánto a cuánto, quién importó catálogo y quién emitió cada cotización. Exportable a CSV.',
    estado: 'Activo',
  },
  {
    icono: 'ayuda', titulo: 'Capacitación integrada',
    detalle: 'Tutorial guiado de doce pasos y sección de ayuda con las fórmulas explicadas, qué recomendar según el proyecto y los errores que cuestan dinero.',
    estado: 'Activo',
  },
];

const FASE2 = [
  {
    titulo: 'Base de datos compartida',
    detalle: 'El catálogo deja de vivir en cada computadora. Una sola lista de precios que todos ven igual, actualizada en el momento.',
  },
  {
    titulo: 'Cuenta por asesor',
    detalle: 'Cada quien entra con su usuario y su contraseña. La bitácora pasa de ser un registro por confianza a ser un registro verificado.',
  },
  {
    titulo: 'Permisos por puesto',
    detalle: 'Quién puede cambiar precios, quién puede autorizar descuentos por arriba de cierto porcentaje y quién solo cotiza.',
  },
  {
    titulo: 'Historial central de cotizaciones',
    detalle: 'Todas las cotizaciones de los diez asesores en un solo lugar, con búsqueda por cliente, folio y estatus.',
  },
  {
    titulo: 'Respaldo automático',
    detalle: 'Copia diaria fuera de la oficina. Hoy, si se formatea una computadora, se pierde lo que había en ella.',
  },
  {
    titulo: 'Sincronización del catálogo desde Excel',
    detalle: 'Una persona sube el Excel actualizado y los diez equipos quedan al día sin volver a importar uno por uno.',
  },
];

export function render(raiz) {
  raiz.append(el('div', { class: 'view' },
    el('header', { class: 'section' },
      el('p', { class: 'eyebrow' }, 'Servicio'),
      el('h1', { class: 'display mt-3' }, 'Qué incluye'),
      el('p', { class: 'lead mt-3' },
        'Todo lo que la herramienta hace hoy, y lo que entra en la siguiente fase. Sin letras chiquitas.')),

    el('section', { class: 'card card--pad-lg' },
      el('div', { class: 'row mb-4', style: 'justify-content:space-between;align-items:baseline' },
        el('h2', { class: 'title' }, 'Incluido y funcionando'),
        el('span', { class: 'pill pill--ok' }, `${INCLUIDO.length} funciones`)),
      ...INCLUIDO.map((s) => el('div', { class: 'servicio' },
        el('span', { class: 'servicio__icono' }, icono(s.icono, 17)),
        el('div', {},
          el('div', { class: 'servicio__t' }, s.titulo),
          el('div', { class: 'servicio__d' }, s.detalle)),
        el('span', { class: 'pill pill--ok pill--sm' }, s.estado)))),

    el('section', { class: 'section mt-6' },
      el('div', { class: 'card card--pad-lg' },
        el('div', { class: 'row mb-4', style: 'justify-content:space-between;align-items:baseline' },
          el('h2', { class: 'title' }, 'Fase 2: los diez usuarios'),
          el('span', { class: 'pill pill--warn' }, 'No incluido todavía')),
        el('p', { class: 'lead mb-5' },
          'Hoy los datos viven en el navegador de cada computadora. Eso alcanza para trabajar y para demostrar el método, no para que diez personas compartan el mismo catálogo.'),
        ...FASE2.map((s) => el('div', { class: 'servicio' },
          el('span', { class: 'servicio__icono' }, icono('capas', 17)),
          el('div', {},
            el('div', { class: 'servicio__t' }, s.titulo),
            el('div', { class: 'servicio__d' }, s.detalle)),
          el('span', { class: 'pill pill--outline pill--sm' }, 'Fase 2'))),
        el('div', { class: 'mt-5' },
          nota('El Excel del catálogo no necesita estar conectado a internet ni cambiar de formato. Se sigue trabajando en Excel como siempre; una persona lo sube cuando cambian precios y la aplicación se encarga del resto.',
               'accent', 'info')))),

    el('section', { class: 'section' },
      el('h2', { class: 'title mb-4' }, 'Preguntas de contratación'),
      desplegable({ titulo: '¿Qué necesito para usarla hoy?' },
        el('p', {}, 'Un navegador actualizado y el enlace. Funciona en Windows con Chrome, Edge o Firefox, y en Mac con Safari o Chrome. No se instala nada, no ocupa espacio en disco y no necesita permisos de administrador.')),
      desplegable({ titulo: '¿Funciona sin internet?' },
        el('p', {}, 'Sí, una vez cargada la página. El cálculo y el PDF corren en la computadora. Solo la primera carga necesita conexión.')),
      desplegable({ titulo: '¿Qué pasa si se formatea una computadora?' },
        el('p', {}, 'Se pierde lo que había en ella. Por eso hay exportación de respaldo en Ajustes y por eso existe la Fase 2. Mientras tanto, conviene exportar respaldo cada vez que cambien precios.')),
      desplegable({ titulo: '¿Los precios quedan expuestos en internet?' },
        el('p', {}, 'No. La aplicación se publica sin catálogo real: trae uno de demostración con precios de referencia de mercado. El catálogo de la empresa se carga desde cada computadora y nunca se guarda en el servidor.')),
      desplegable({ titulo: '¿Qué incluye el soporte mensual?' },
        el('p', {}, 'Actualización de precios y catálogo, cambios al formato del PDF, nuevas familias de producto, atención a los usuarios y respaldo de la información.')))));
}
