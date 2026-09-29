// Qué incluye el servicio. Sirve al equipo de Fernando para saber qué tienen
// contratado, y a Fernando para ver qué sigue.

import { el } from '../format.js';
import { icono, accion, desplegable, nota } from '../ui.js';
import { CONTACTO, abrirAsistente, CONOCIMIENTO } from '../asistente.js';

const INCLUIDO = [
  {
    icono: 'regla', titulo: 'Medidor de obra en el teléfono',
    detalle: 'Quien mide captura con puros números, con la misma notación de sus notas: 16.45,3.81,2.29 son tres áreas que se suman, 1.86(2) es esa medida dos veces, 4*5 son los lados de un rectángulo, y el zoclo va en su propio renglón. El teclado es de la aplicación, no del teléfono. Cuarto por cuarto, con escaleras por escalón, huella y peralte.',
    estado: 'Activo',
  },
  {
    icono: 'copiar', titulo: 'Importar la nota del teléfono',
    detalle: 'Se pega la nota tal como está y la aplicación la separa en cuartos: reconoce los renglones Z- como zoclo, arma la escalera con piezas, ancho, huella y peralte, y distingue "Cuarto 2" de "Descanso 2.11". Muestra qué entendió antes de confirmar.',
    estado: 'Activo',
  },
  {
    icono: 'capas', titulo: 'Fotos de obra, opcionales',
    detalle: 'Cada cuarto puede llevar fotos tomadas con la cámara del teléfono. Se reducen solas antes de guardarse, así que caben cientos sin llenar el equipo. Nunca son obligatorias: quien mide decide.',
    estado: 'Activo',
  },
  {
    icono: 'barras', titulo: 'Reporte mensual de ventas',
    detalle: 'Qué vendió cada asesor, de qué familia, en qué proporción y con qué ticket. Detalle por línea y color, que es como el equipo reconoce el producto. Vendido contra cobrado, y lo que falta de anticipo por cada obra. Exporta a CSV.',
    estado: 'Activo',
  },
  {
    icono: 'reloj', titulo: 'Semáforo de la cotización',
    detalle: 'Ámbar mientras solo está cotizada, verde cuando entró el anticipo del 80%, azul cuando quedó liquidada y gris si no se concretó. El color cambia en el momento en que se captura el pago, y el reporte enseña cuánto del mes está en cada peldaño.',
    estado: 'Activo',
  },
  {
    icono: 'caja', titulo: 'Comparativo entre tiendas',
    detalle: 'Santa Fe, Pedregal y la tercera, cada una con sus asesores, su venta del mes, su participación y lo que lleva cobrado. La dirección ve las tres juntas; cada asesor ve lo suyo.',
    estado: 'Activo',
  },
  {
    icono: 'caja', titulo: 'Carpeta del proyecto',
    detalle: 'Cada venta lleva su enlace de Drive y la lista de los cinco documentos que tienen que existir antes de comprar material: presupuesto, pago del anticipo, requisición, orden de compra e instalación, cada uno con su responsable.',
    estado: 'Activo',
  },
  {
    icono: 'usuario', titulo: 'Separación por rol',
    detalle: 'Dirección ve las ventas de todo el equipo; el asesor ve las suyas. La lista se edita en Ajustes. Sin servidor no hay contraseñas, así que separa la información sin protegerla: eso llega en la fase 2.',
    estado: 'Activo',
  },
  {
    icono: 'buscar', titulo: 'Buscador de materiales',
    detalle: 'Combina varias palabras a la vez. Encuentra por nombre, SKU, especie, medida, acabado, color y también por el nombre en inglés del material.',
    estado: 'Activo',
  },
  {
    icono: 'regla', titulo: 'Motor de cálculo por familia',
    detalle: 'Motores distintos por familia: pisos con merma y caja completa, cortinería por pliegue y ancho de rollo, persianas con área mínima, toldos y pérgolas por área de sombra con mínimo por equipo, porcelanato con boquilla, y accesorios por pieza.',
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
    icono: 'pdf', titulo: 'PDF de propuesta con instalación desglosada',
    detalle: 'Hasta tres páginas: propuesta con gráfica de inversión, anexo técnico con especificaciones, y tiempos, pagos y condiciones. El total separa material y accesorios de instalación y mano de obra, que es lo primero que pregunta el cliente. La mano de obra sale con tarifa de referencia hasta que se cargue la real.',
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
    icono: 'cortina', titulo: 'Partida Hunter Douglas',
    detalle: 'El producto se configura en e-Pedidos como siempre y se copia su resumen: descripción, códigos, medidas, precio de lista y factura. Entra al PDF con la lista más IVA, con margen en vivo y semáforo; la factura nunca se imprime. La instalación se suma aparte con la tarifa de la empresa.',
    estado: 'Activo',
  },
  {
    icono: 'globo', titulo: 'Portales y calculadora de Hunter Douglas',
    detalle: 'Un botón abre e-Pedidos, My HunterDouglas, el LMS y los catálogos en pestaña nueva. La calculadora toma "Lista" y "Factura" tal como los muestra e-Pedidos y da el precio al cliente con IVA, la utilidad y el margen real. Las direcciones se editan en Ajustes; las contraseñas nunca se guardan.',
    estado: 'Activo',
  },
  {
    icono: 'pdf', titulo: 'Documentos del proveedor en PDF',
    detalle: 'Listas de precios, fichas técnicas y catálogos se suben una vez y se abren sin salir de la aplicación, con buscador, tipo y nota por documento. Viven en el navegador de cada computadora, como las fotos de obra.',
    estado: 'Activo',
  },
  {
    icono: 'ayuda', titulo: 'Asistente de dudas',
    detalle: `Responde al instante las preguntas más comunes sobre cómo usar la herramienta, cómo calcula y qué recomendar. Trae ${CONOCIMIENTO.length} respuestas cargadas y, cuando no tiene una, pasa el contacto de soporte en vez de inventar.`,
    estado: 'Activo',
  },
  {
    icono: 'regla', titulo: 'Modo de texto grande',
    detalle: 'Un botón agranda toda la aplicación y separa los botones, sin pelearse con el zoom del navegador. Queda guardado por computadora.',
    estado: 'Activo',
  },
  {
    icono: 'copiar', titulo: 'Respaldo del catálogo',
    detalle: 'Un archivo con todo: catálogo, precios, tarifas, ajustes, historial y bitácora. La aplicación avisa cuando hay cambios sin respaldar.',
    estado: 'Activo',
  },
  {
    icono: 'ayuda', titulo: 'Capacitación integrada',
    detalle: 'Tutorial guiado paso a paso y sección de ayuda con las fórmulas explicadas, buenas prácticas del equipo, qué recomendar según el proyecto y los errores que cuestan dinero.',
    estado: 'Activo',
  },
];

const FASE2 = [
  {
    titulo: 'Mano de obra con la tarifa real',
    detalle: 'Hoy la instalación sale en el PDF con una tarifa de referencia y así lo dice la nota al pie. Con los costos reales de cuadrilla por familia y por dificultad, deja de ser tentativa.',
  },
  {
    titulo: 'Las 34 listas de precios en hoja de cálculo compartida',
    detalle: 'Los 32 proveedores con su estructura real: apartado, proveedor, código, línea, color y bisel. Hoy son 34 archivos de Excel sueltos, y por eso el medidor todavía estima con un promedio por metro en vez de con el precio de la línea.',
  },
  {
    titulo: 'Margen real por producto',
    detalle: 'Con las listas cargadas, el reporte deja de decir solo cuánto se vendió y empieza a decir cuánto se ganó, por línea y por proveedor.',
  },
  {
    titulo: 'Reporte consolidado del mes',
    detalle: 'Hoy cada quien registra en su computadora y el mes se arma juntando los CSV. Con base de datos, la dirección abre el mes completo sin pedirle nada a nadie.',
  },
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
        el('p', {}, 'Actualización de precios y catálogo, cambios al formato del PDF, nuevas familias de producto, atención a los usuarios y respaldo de la información.'))),

    el('section', { class: 'card card--pad-lg' },
      el('div', { class: 'row', style: 'justify-content:space-between;align-items:flex-start;gap:24px' },
        el('div', { style: 'flex:1;min-width:220px' },
          el('p', { class: 'eyebrow' }, 'Contacto'),
          el('h2', { class: 'title mt-3' }, '¿Dudas sobre el servicio?'),
          el('p', { class: 'lead mt-3' },
            `${CONTACTO.nombre} atiende directo, sin ticket ni intermediarios. `,
            'Para dudas de uso, el asistente contesta al instante.')),
        el('div', { class: 'stack stack-2' },
          el('button', { class: 'btn btn--primary', onclick: () => abrirAsistente() },
            icono('ayuda', 15), 'Preguntar al asistente'),
          el('a', {
            class: 'btn', target: '_blank', rel: 'noopener',
            href: `https://wa.me/${CONTACTO.whatsappE164}?text=${encodeURIComponent('Hola Cesar, tengo una duda del cotizador: ')}`,
          }, `WhatsApp ${CONTACTO.whatsapp}`),
          el('a', { class: 'btn', href: `mailto:${CONTACTO.email}` }, CONTACTO.email))))));
}
