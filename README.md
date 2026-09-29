# Mundo de Interiores · Cotizador y ventas

Aplicación web con dos caminos:

1. **Cotización**: medir la obra en el teléfono, armar la cotización de pisos de
   ingeniería, SPC, laminado, deck, porcelanato, cortinas, persianas, toldos y
   pérgolas, y sacar el PDF de hasta tres páginas listo para el cliente.
2. **Reporte mensual de ventas**: qué vendió cada asesor, de qué línea y color,
   en qué proporción, y cuánto de eso ya está cobrado.

No necesita instalación ni servidor: son archivos estáticos que corren en el navegador.

Abrir el medidor en el teléfono descarga **226 KB**, no los 894 KB de la aplicación
completa: cada pantalla se trae cuando se entra a ella, y el generador de PDF solo
cuando se genera un PDF.

---

## Enlaces

| Para qué | Dirección |
|---|---|
| Aplicación completa, en la computadora | https://castacu0.github.io/cotizador-fmp/ |
| Medidor, en el teléfono de quien mide | https://castacu0.github.io/cotizador-fmp/#/medidor |
| Pruebas del motor | https://castacu0.github.io/cotizador-fmp/pruebas.html |

La presentación para la dirección **no se publica aquí**: lleva precios y este repositorio
es público. Vive en `docs/presentacion.html`, está en `.gitignore`, y se comparte por
enlace privado.

Los dos primeros están también en `Ajustes > Enlaces para el equipo`, con botón de copiar
y, en iPhone, un botón **Compartir** que abre el panel nativo de compartir directo con el
enlace del medidor: desde ahí, *Agregar a inicio* queda a un toque, sin teclear la dirección.

**Para dejarla como aplicación en el teléfono**: se abre el enlace del medidor en Safari,
Compartir, *Agregar a inicio*. Queda a pantalla completa, sin barra del navegador. En
Android es el menú de tres puntos, *Agregar a pantalla principal*. Trae `manifest.webmanifest`
con accesos directos a Medir y a Ventas.

El slug `cotizador-fmp` se dejó como estaba a propósito: cambiarlo rompe el enlace que
el equipo ya tiene guardado.

---

## Medir en obra

`Inicio > Cotización > Medir en obra`.

Quien mide captura con puros números, con la misma notación que ya usa en sus notas:

| Se escribe | Quiere decir |
|---|---|
| `16.45,3.81,2.29` | Tres áreas que se suman: 22.55 m² |
| `1.86(2)` | Esa medida, dos veces |
| `4*5` | Los dos lados de un rectángulo: 20 m² |
| `.88` | Se puede omitir el cero de adelante |
| Campo de zoclo | Metros lineales, aparte del área |

El teclado es de la aplicación, no del teléfono: solo dígitos, coma, punto,
multiplicar, repetir y borrar. Se apaga desde `Ajustes > Medidor de obra`.

Arriba a la derecha se elige **láser** o **cinta**. Con láser se captura el área
directa; con cinta cambian los ejemplos a dos lados multiplicados (`4*5`).

Los cuartos se agregan de un toque: recámara, baño, cocina, sala, comedor, pasillo,
escalera, patio. Cada chip numera solo (`Recámara`, `Recámara 2`) y el bote lo quita.
Da igual si la casa trae tres cuartos o siete.

**Fotos**: cada cuarto acepta fotos desde la cámara, y son opcionales. Se reducen a
1600 px y JPEG antes de guardarse, así que una foto de teléfono de 4 MB queda en unos
200 KB. Viven en IndexedDB, no en el respaldo JSON: si se limpian los datos del
navegador se pierden, y ese es el precio de no tener servidor.

**Pegar nota** toma una nota de Apple Notes tal como está y la separa en cuartos:
reconoce los renglones que empiezan con `Z-` como zoclo, `14 piezas / .90 de ancho /
.32 huella / .15 peralte` como escalera, y distingue `Cuarto 2` (nombre) de
`Descanso 2.11` (medida).

**Precio en la casa, antes de irse.** Cada cuarto muestra su importe junto a sus metros,
y la barra de abajo el total con IVA. Con **Elegir material** se toma un producto del
catálogo y todos los renglones se recalculan con su precio real; sin material elegido usa
el promedio de `Ajustes` y la pantalla lo dice. En cuanto entren las listas de los 32
proveedores, ese mismo selector da el precio de venta verdadero sin tocar código.

El botón **Cotizar** pasa el total a una partida real del cotizador.

---

## Reporte mensual de ventas

`Inicio > Reporte mensual de ventas`.

Una cotización enviada no cuenta. Cuenta la venta registrada, y el color lo dice
antes de que alguien lea la cifra:

| Color | Estado | Qué significa |
|---|---|---|
| Ámbar | Cotizada | Enviada al cliente y sin pago. Todavía no es venta |
| Verde | Anticipada | Entró el 80%. Ya se puede levantar la requisición |
| Azul | Liquidada | Pagada al cien por ciento |
| Gris | Cancelada | No se concretó. No suma al mes ni al asesor |

El color cambia en el momento en que se captura el pago. La barra **De cotizado a
cobrado** enseña cuánto del mes está en cada peldaño.

El reporte da, por mes: vendido, cobrado, por cobrar y ticket promedio; el comparativo
entre tiendas; el desglose por asesor con su mezcla de producto; la proporción por
familia; y el detalle por **línea y color**, que es como el equipo identifica el
producto, no por código.

Cada venta lleva su carpeta de Drive con los cinco documentos del proyecto:
presupuesto, pago del anticipo, requisición, orden de compra (Aarón) e instalación.
En cuanto la orden de compra está marcada, la pantalla dice que ya se puede pedir
el material.

**Datos de ejemplo.** Con el mes vacío, `Reporte mensual de ventas` ofrece
**Cargar datos de ejemplo**: ocho ventas de muestra repartidas en las tres tiendas,
con precios distintos por línea, color y proveedor (de $17,160 a $162,240) y los
cuatro estados del semáforo a la vez. Sirve para demostrar cómo se ve el reporte
antes de que exista una sola venta real, y no toca el catálogo de productos.

**Tiendas y equipo**: tres tiendas con dos asesores cada una, seis en total. Fernando
y Sebastián son los asesores principales y a la vez dirección. Melissa administra las
tiendas y no aparece como asesora de venta. Se edita en `Ajustes > Equipo`.

**Quién ve qué**: Fernando, Melissa y Sebastián ven todo el equipo; los demás ven solo
lo suyo. Es separación por confianza, no un candado: sin servidor no hay contraseñas
que valgan.

---

## Qué resuelve

El cuello de botella no es el precio por metro, es todo lo que va alrededor:

| Lo que hoy se calcula a mano | Lo que hace la app |
|---|---|
| Merma por patrón de colocación | Automática, 7% a 20% según recto, diagonal, espina o chevron |
| Redondeo a caja completa | Calcula cajas y factura la superficie real, no la del plano |
| Zoclo, barrera de vapor, adhesivo, perfiles | Se suman con un clic, con su cantidad y su precio |
| Metros de tela por pliegue y ancho de rollo | Decide entre corte al ancho y por paños, y explica por qué |
| Área mínima facturable de persiana | Se aplica sola y se señala en el desglose |
| Fecha de entrega con importación | Fábrica + tránsito + aduana, la partida más lenta manda |
| Margen real después de descuentos | Visible en vivo mientras se cotiza, nunca en el PDF |

---

## Cómo se usa

La portada tiene dos opciones y cada una abre su propio menú. El logotipo regresa
a la portada.

**Cotización**

1. **Medir**: levantamiento en obra con el teclado numérico, importación de notas
   y estimado de campo.
2. **Cotizar**: busca el material, captura las medidas, marca accesorios, descarga el PDF.
   Al terminar se abre el centro de envío con nueve plantillas de seguimiento. El botón
   **Hunter Douglas** abre los portales del distribuidor y trae la calculadora de precio
   al cliente (ver abajo).
3. **Catálogo**: alta, edición y búsqueda de materiales. Cambio de precios por familia.
   Cada material trae su nombre en inglés, visible y buscable. Exporta a CSV.
4. **Documentos**: listas de precios, fichas técnicas y catálogos del proveedor en PDF,
   con visor integrado, buscador y tipo por documento.
5. **Ayuda**: fórmulas explicadas y material de capacitación para el equipo de ventas.
6. **Servicios**: qué incluye la herramienta hoy y qué entra en la Fase 2.

**Ventas**

7. **Reporte**: el mes por asesor, por familia y por línea y color. Exporta a CSV.
8. **Registrar**: alta de la venta con sus partidas, su anticipo y su carpeta de Drive.
9. **Tablero**: qué ha ahorrado la empresa, margen promedio, valor cotizado por mes,
   registro de actividad (quién entró y quién cotizó) y bitácora de cambios de precio.

**Siempre**

10. **Ajustes**: quién usa la computadora, equipo y permisos, supuestos del medidor,
    portales de Hunter Douglas, datos de la empresa, margen, IVA, tipo de cambio, tarifas,
    días de entrega del proveedor e importación del catálogo.

En el teléfono la barra se reduce al logotipo y un botón de menú: ahí dentro están las
pantallas del camino en curso, el cambio al otro camino, el control **A− / A+**, **Dudas**
y **Tutorial**. En computadora todo eso vive en la barra de arriba.
El botón **Cargar ejemplo** arma una cotización completa de hotel para ver la aplicación funcionando.

Atajos: `/` enfoca el buscador, `⌘K` o `Ctrl+K` va al cotizador y busca.

---

## Cargar el catálogo real

`Ajustes > Catálogo de productos > Importar catálogo`.

Acepta `.xlsx`, `.xls` y `.csv`. Detecta las columnas por el encabezado, permite corregir
la correspondencia y muestra qué entra y qué se descarta antes de confirmar. Se puede
reemplazar todo el catálogo o fusionar por SKU.

La columna más importante es **m² por caja**. Sin ella no hay redondeo a caja completa
y la cotización queda corta.

Hay una plantilla CSV descargable en esa misma pantalla.

---

## Hunter Douglas

El producto Hunter Douglas se configura y se pide en los portales del distribuidor, que
son tres: **e-Pedidos MX** (cotizador y pedidos), **My HunterDouglas** (listas de precios,
fichas y herramientas) y el **LMS** (capacitación). El botón **Hunter Douglas** de
`Cotizar` los abre en pestaña nueva; las direcciones se editan en
`Ajustes > Portales de Hunter Douglas`. La aplicación guarda solo direcciones: el usuario
y la contraseña se teclean en el portal, nunca aquí.

El resumen de precios de e-Pedidos trae **Lista** y **Factura** sin IVA, y un renglón
**Precio con IVA** que es la factura con impuesto, o sea lo que paga la empresa. Al
cliente se le cobra la lista más IVA, y ese número el portal no lo enseña. El mismo botón
trae una calculadora: se capturan Lista y Factura tal como aparecen y sale el precio al
cliente con IVA, la utilidad y el margen real, con el mismo semáforo del cotizador.

**Partida de proveedor.** En `Cotizar`, el botón **Partida de proveedor** mete a la
cotización un producto ya configurado en el portal del proveedor. Hunter Douglas viene
por defecto y el nombre se cambia para cualquier otro proveedor que fije su lista. Se
copia lo que dice el resumen de e-Pedidos: descripción, códigos, medidas en milímetros,
piezas, precio de lista y factura por pieza. El precio de venta lo fija la lista, así que
el margen se deduce en vez de aplicarse, y el margen por defecto de Ajustes no interviene.
Un descuento al cliente baja el margen y deja el costo igual. La instalación viene
marcada porque la hace la empresa con su cuadrilla cuando llega el material: se suma con
la tarifa por pieza y sí lleva el margen por defecto. En el PDF salen la descripción, la
medida, la cantidad, el precio de lista, el fabricante, el código en el anexo técnico y la
condición de fabricación a la medida; la factura y el margen nunca se imprimen. El
ejemplo de `Cargar ejemplo` trae una partida así, con precios inventados.

**Documentos.** Hunter Douglas entrega las listas de precios solo en PDF. La pestaña
`Documentos` los guarda una vez y los abre dentro de la aplicación, con buscador, tipo
(lista de precios, ficha técnica, catálogo, manual) y una nota por documento. Viven en el
navegador de esa computadora, como las fotos de obra: no entran al respaldo JSON. El
original sigue en My HunterDouglas.

Lo que sigue de la fase 3 está en *Lo que sigue*.

---

## Respaldo

`Ajustes > Respaldo del catálogo > Guardar respaldo` descarga un archivo con todo:
catálogo, precios, tarifas, ajustes, historial y bitácora. La aplicación avisa sola
cuando hay cambios sin respaldar.

Es lo único que recupera la información si se formatea la computadora o alguien limpia
el navegador. Conviene hacerlo cada vez que cambien precios y el primer día de cada mes.

---

## Soporte

Cesar Castanon A · WhatsApp +1 341 758 3854 · cesar@castacu0.com

Dentro de la aplicación, el botón **Dudas** abre un asistente con 53 respuestas cargadas,
incluidas las de las líneas Hunter Douglas. No es un modelo de lenguaje: responde de una
base de conocimiento curada y, cuando no tiene la respuesta, ofrece el contacto directo
en vez de inventar.

---

## Límites de esta versión

Hay que decirlos claro antes de operar con clientes reales:

- **Los datos viven en el navegador de cada computadora.** No hay servidor. El catálogo
  que carga una persona no lo ven las demás. Se comparte exportando el respaldo JSON
  desde Ajustes y restaurándolo en las otras máquinas.
- **Si se limpian los datos del navegador, se pierde todo.** Exportar respaldo con regularidad.
- **No hay usuarios ni contraseñas.** Cualquiera que abra el enlace ve la aplicación. El
  rol de `Ajustes > Equipo` decide qué se muestra, y la bitácora atribuye los cambios al
  nombre capturado: las dos cosas son por confianza, no control de acceso. Quien abra el
  navegador de otra persona verá lo de esa persona.
- **El reporte de ventas no se comparte entre computadoras.** Cada quien registra en la
  suya. Hasta que exista la hoja de cálculo compartida, el mes consolidado se arma
  exportando el CSV de cada persona.
- **El catálogo que viene cargado es de demostración.** Los precios son de referencia
  de mercado, no los de la empresa.
- **El estimado del medidor usa un promedio por m².** No es la lista real de los 32
  proveedores. Sirve para dar un número en la visita, no para cerrar.
- **La mano de obra del PDF es de referencia.** Sale desglosada y con su nota al pie,
  pero la tarifa todavía no es la real de cuadrilla.
- **Las fotos no entran al respaldo JSON.** Pesan demasiado. Viven solo en el navegador
  donde se tomaron.
- **Los PDF de Documentos tampoco.** Misma razón. Cada computadora sube los suyos, y el
  original sigue en el portal del proveedor.

Para trabajo real con diez personas hace falta base de datos, cuentas y sincronización.
Eso es la fase 2.

---

## Lo que sigue

Pendiente de la migración que se acordó con la dirección:

- Las 34 hojas de Excel de listas de precios pasan a hoja de cálculo compartida, con la
  estructura `Apartado · Proveedor · Código · Línea · Color · Bisel`.
- Los 32 proveedores quedan como catálogo propio, para que el estimado del medidor y el
  reporte de ventas dejen de usar promedios.
- Cuentas reales por persona, que reemplacen la separación por confianza de hoy.

Fase 3, Hunter Douglas dentro del cotizador. Ya están la partida Hunter Douglas, el
precio fijado por el proveedor en el motor, los portales, la calculadora y los documentos
en PDF. Lo que falta, por orden:

- Listas de precios de Hunter Douglas en el catálogo. Son unos 20 PDF de 19 a 25
  páginas: persianas por tipo, accesorios y motores. El camino corto es convertirlos una
  vez, fuera de la aplicación, a la hoja `Apartado · Proveedor · Código · Línea · Color ·
  Bisel` que ya lee el importador, con precio de lista y factura por producto. Lo que sí
  falta en el motor es el precio por rango de ancho y alto, que es como vienen las
  persianas a la medida. El precio fijado por el proveedor ya está.
- Los documentos compartidos entre computadoras, junto con el catálogo, cuando exista la
  base de datos de la fase 2.
- Ninguna integración automática con los portales de Hunter Douglas sin acuerdo escrito
  con ellos: se rompe con cada cambio suyo y pone en riesgo la cuenta del distribuidor.

**Nunca subas precios reales a un repositorio público.** El catálogo con costos y márgenes
se carga desde el navegador de cada quien, no se guarda en el código.

---

## Estructura

```
index.html            Entrada
css/app.css           Sistema de diseño completo
js/
  app.js              Arranque, ruteo por grupos y definición del tutorial
  state.js            Estado global y persistencia local
  pricing.js          Motor de cálculo de la cotización, incluida la partida de proveedor
  medidas.js          Notación de obra: lectura, escalera, estimado, importar nota
  ventas.js           Agregados del reporte, semáforo de estado y permisos
  fotos.js            Fotos de obra en IndexedDB, con compresión previa
  pdf.js              Generación del PDF por flujo, tope estricto de 3 páginas
  mensajes.js         Plantillas de envío y seguimiento
  asistente.js        Asistente de dudas y contacto de soporte
  portales.js         Portales de Hunter Douglas y precio al cliente desde e-Pedidos
  documentos.js       PDF del proveedor en IndexedDB: guardar, listar, buscar
  catalog-extra.js    Ampliación del catálogo de demostración
  importer.js         Lectura de Excel y CSV, mapeo de columnas
  catalog-seed.js     Catálogo de demostración
  demo.js             Cotización de ejemplo
  demo-ventas.js      Ventas de ejemplo para el reporte mensual
  tour.js             Tutorial guiado
  ui.js               Componentes compartidos
  format.js           Formato es-MX y utilidades de DOM
  views/              inicio, medidor, cotizador, catálogo, documentos, ventas,
                      registro, ahorro, servicios, ayuda y ajustes
manifest.webmanifest  Para instalarla en el teléfono
assets/icono.svg      Icono de la aplicación
pruebas.html          157 pruebas: cálculo, importación, buscador, medidas,
                      estimado, ventas, semáforo, tiendas y precio de proveedor
servidor-dev.py       Servidor local sin caché para desarrollo
vendor/               jsPDF y SheetJS, incluidos localmente
```

Sin build, sin dependencias que instalar. JavaScript nativo con módulos ES.

---

## Correr en local

```bash
python3 servidor-dev.py 4173
```

Y abrir `http://localhost:4173`. Las pruebas del motor están en
`http://localhost:4173/pruebas.html` y conviene correrlas después de cambiar tarifas.

Tiene que servirse por HTTP: los módulos ES no cargan abriendo el archivo directamente.

---

## Publicar cambios

Los archivos se sirven tal cual. Después de publicar, sube el número de versión en
`index.html` (`css/app.css?v=N`) para que los navegadores no sigan mostrando la hoja
de estilos vieja.
