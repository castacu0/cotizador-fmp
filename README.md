# Cotizador · Fernando Martínez Parente

Aplicación web para cotizar pisos de ingeniería, SPC, laminado, deck, porcelanato,
cortinas, persianas, toldos y pérgolas, con PDF de hasta tres páginas listo para
enviar al cliente.

No necesita instalación ni servidor: son archivos estáticos que corren en el navegador.

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

1. **Cotizar**: busca el material, captura las medidas, marca accesorios, descarga el PDF.
   Al terminar se abre el centro de envío con nueve plantillas de seguimiento.
2. **Catálogo**: alta, edición y búsqueda de materiales. Cambio de precios por familia.
   Cada material trae su nombre en inglés, visible y buscable. Exporta a CSV.
3. **Ahorro**: qué ha ahorrado la empresa, margen promedio, valor cotizado por mes,
   registro de actividad (quién entró y quién cotizó) y bitácora de cambios de precio.
4. **Servicios**: qué incluye la herramienta hoy y qué entra en la Fase 2.
5. **Ayuda**: fórmulas explicadas y material de capacitación para el equipo de ventas.
6. **Ajustes**: quién usa el equipo, datos de la empresa, margen, IVA, tipo de cambio,
   tarifas e importación del catálogo.

Arriba a la derecha hay tres botones: **Texto grande** agranda toda la interfaz,
**Dudas** abre el asistente y **Tutorial** hace un recorrido guiado de quince pasos.
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

## Respaldo

`Ajustes > Respaldo del catálogo > Guardar respaldo` descarga un archivo con todo:
catálogo, precios, tarifas, ajustes, historial y bitácora. La aplicación avisa sola
cuando hay cambios sin respaldar.

Es lo único que recupera la información si se formatea la computadora o alguien limpia
el navegador. Conviene hacerlo cada vez que cambien precios y el primer día de cada mes.

---

## Soporte

Cesar Castañón · WhatsApp 55 7882 3635 · cesar@castacu0.com

Dentro de la aplicación, el botón **Dudas** abre un asistente con las preguntas más
comunes ya respondidas. No es un modelo de lenguaje: responde de una base de conocimiento
curada y, cuando no tiene la respuesta, ofrece el contacto directo en vez de inventar.

---

## Límites de esta versión

Hay que decirlos claro antes de operar con clientes reales:

- **Los datos viven en el navegador de cada computadora.** No hay servidor. El catálogo
  que carga una persona no lo ven las demás. Se comparte exportando el respaldo JSON
  desde Ajustes y restaurándolo en las otras máquinas.
- **Si se limpian los datos del navegador, se pierde todo.** Exportar respaldo con regularidad.
- **No hay usuarios ni permisos.** Cualquiera que abra el enlace ve la aplicación. La
  bitácora atribuye los cambios al nombre capturado en Ajustes: es atribución por
  confianza, no control de acceso.
- **El catálogo que viene cargado es de demostración.** Los precios son de referencia
  de mercado, no los de la empresa.

Para trabajo real con diez personas hace falta base de datos, cuentas y sincronización.
Eso es la fase 2.

**Nunca subas precios reales a un repositorio público.** El catálogo con costos y márgenes
se carga desde el navegador de cada quien, no se guarda en el código.

---

## Estructura

```
index.html            Entrada
css/app.css           Sistema de diseño completo
js/
  app.js              Arranque, ruteo y definición del tutorial
  state.js            Estado global y persistencia local
  pricing.js          Motor de cálculo. Toda la lógica comercial vive aquí
  pdf.js              Generación del PDF por flujo, tope estricto de 3 páginas
  mensajes.js         Plantillas de envío y seguimiento
  asistente.js        Asistente de dudas y contacto de soporte
  catalog-extra.js    Ampliación del catálogo de demostración
  importer.js         Lectura de Excel y CSV, mapeo de columnas
  catalog-seed.js     Catálogo de demostración
  demo.js             Cotización de ejemplo
  tour.js             Tutorial guiado
  ui.js               Componentes compartidos
  format.js           Formato es-MX y utilidades de DOM
  views/              Cotizador, catálogo, ahorro, servicios, ayuda y ajustes
pruebas.html          83 pruebas del motor de cálculo, importación y buscador
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
