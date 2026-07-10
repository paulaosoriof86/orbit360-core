# AUDITORÍA FORENSE PROFUNDA — COTIZADOR Y COMPARATIVO V110 / CONTRATO A&S

Fecha: 2026-07-09  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.  
Fuente auditada: `comparativo_final_v110.html`  
Tamaño aproximado de la fuente: 1.46 millones de caracteres / 14,395 líneas.

## 0. Decisión ejecutiva

`comparativo_final_v110.html` no es un prototipo simple. Contiene una base funcional y de conocimiento entrenada durante meses, con lógicas diferenciadas por:

- país;
- ramo/producto;
- aseguradora;
- formato de documento;
- tipo de cotización;
- tipo de comparativo;
- moneda;
- criterios consultivos;
- impresión individual y comparativa;
- WhatsApp y plantillas;
- edición/corrección humana;
- laboratorio de conocimiento.

Por tanto:

1. No se reescribe desde cero.
2. No se copia como HTML monolítico.
3. No se traslada su módulo interno de aseguradoras, estadísticas, navegación ni Firebase directo.
4. Se conserva la interfaz y experiencia valiosa de Cotizador/Comparativo, combinándola con lo mejor del prototipo Orbit.
5. Aseguradoras Orbit 360 es la fuente maestra única.
6. El backend reusable debe permitir que cada tenant active Cotizador, Comparativo o ambos y cargue sus propias fuentes documentales.
7. A&S tendrá una configuración avanzada y personalizada construida a partir del conocimiento v110.
8. Un tenant futuro podrá partir de la versión configurable simple y evolucionar según tarifas/documentos disponibles.

## 1. Separación funcional obligatoria

### 1.1 Cotizador

Objetivo: generar y administrar cotizaciones individuales por aseguradora.

Debe soportar dos orígenes simultáneos:

#### A. Cotización automática por tarifas configuradas

- tarifas extraídas de Excel/CSV/PDF;
- reglas de cálculo validadas;
- rangos;
- primas mínimas;
- recargos;
- gastos;
- impuestos;
- formas de pago;
- reglas por país/producto/aseguradora;
- resultados calculados automáticamente.

#### B. Cotización recibida externamente en PDF

Para aseguradoras sin tarifa, sin API, sin tabla disponible o con cotización manual:

- cargar PDF enviado por la aseguradora;
- identificar aseguradora/producto/plan;
- extraer primas, coberturas, deducibles, pagos, condiciones y restricciones;
- permitir corrección humana;
- incorporar esa cotización al mismo tablero de resultados;
- imprimirla individualmente en el formato de cotización Orbit/A&S;
- permitir seleccionarla junto con cotizaciones automáticas;
- permitir derivarla al Comparativo.

El usuario no debe percibir dos sistemas separados. El tablero de Cotizador debe integrar resultados automáticos y cotizaciones PDF.

### 1.2 Comparativo

Objetivo: comparar varias propuestas completas por producto y emitir una recomendación consultiva.

Debe operar en dos modos independientes:

#### A. Derivado desde Cotizador

- recibe cotizaciones seleccionadas;
- conserva todos los campos normalizados;
- genera la tabla correspondiente al país/producto;
- permite editar/corregir;
- calcula recomendación;
- imprime en pantalla/PDF;
- comparte por WhatsApp.

#### B. Comparativo independiente

- funciona aunque el tenant no tenga activo Cotizador;
- permite cargar la cantidad necesaria de PDFs;
- identifica aseguradora y producto;
- extrae cada propuesta;
- permite corrección individual;
- genera tabla completa según país/producto;
- aplica recomendación consultiva;
- imprime y comparte.

Cotizador y Comparativo son módulos contratables por separado.

## 2. Capacidades reales encontradas en v110

La auditoría estática identificó funciones y flujos que deben conservarse como referencia funcional.

### 2.1 Selección de país

Funciones relevantes:

- `cotizadorSetPais`
- `cotizadorInit`
- `cotizadorRenderTipos`

Comportamiento existente:

- selección Guatemala/Colombia;
- sincronización de país activo;
- tipos de producto condicionados al país;
- moneda visual por país;
- formularios y configuraciones diferentes.

Regla Orbit:

- país nunca debe ser solo decorativo;
- determina productos, catálogos, moneda, impuestos, campos, reglas y formatos de impresión;
- GT → GTQ;
- CO → COP;
- USD se habilita solo donde producto/regla lo permita, por ejemplo Vida.

### 2.2 Formularios distintos por país y producto

Funciones/configuraciones relevantes:

- `cotizadorRenderClienteForm`
- `TC_GT`
- `TC_CO`
- `cotizadorRenderFormGM`
- `cotizadorCotizarGM`

Hallazgo:

- v110 no usa un formulario universal;
- Guatemala y Colombia solicitan datos distintos;
- Gastos Médicos tiene lógica propia de asegurados, edades, planes y opciones;
- Vida, Autos, Motos, Hogar y otros productos usan estructuras distintas;
- Colombia requiere mayor detalle en varios productos.

Regla Orbit:

- formularios configurables por `pais + producto + versión`;
- no simplificar A&S a un formulario genérico;
- mantener una plantilla base reusable para tenants futuros;
- permitir activación/desactivación de campos por configuración;
- todos los campos repetitivos deben usar listas desplegables/catálogos siempre que sea posible.

### 2.3 Marcas y líneas por país

Funciones/estructuras relevantes:

- `cotizadorUpdateLineas`
- `LINEAS_MARCA`
- catálogos de marcas disponibles.

Comportamiento existente:

- marca como lista desplegable;
- línea dependiente de marca;
- lista amplia de líneas conocidas;
- opción `Otra`;
- campo libre solo cuando corresponde;
- catálogos diferentes por país.

Regla Orbit:

- catálogos geográficos/producto por tenant;
- marcas/líneas GT y CO separadas;
- listas dependientes;
- opción `Otra / Requiere validación`;
- cambios de catálogo administrables;
- evitar digitaciones variantes y duplicados.

### 2.4 Cálculo automático por configuración

Funciones relevantes:

- `cotizadorCotizar`
- `COT.loadConfig`
- reglas de modo `tasas`;
- reglas de rangos, tipo de cálculo y resultados.

Comportamiento existente:

- carga configuración por país;
- filtra aseguradoras activas por producto;
- calcula resultados;
- conserva datos para impresión y selección;
- guarda borrador.

Regla Orbit:

- configuración activa solo desde documento validado;
- no tarifas manuales sin fuente;
- cada regla debe conservar `aseguradoraId`, país, moneda, producto, vigencia, versión y documento fuente;
- Cotizador solo consume configuraciones `validado_habilitado`.

### 2.5 Cotizaciones PDF dentro del Cotizador

Funciones relevantes:

- `cotizadorCardPDF`
- `cotizadorExtraerPDF`
- `cotizadorReemplazarPDF`
- `cotizadorVerCotizacion`
- `cotizadorImprimirCotizacion`

Hallazgo:

- v110 ya contempla aseguradoras en modo PDF;
- el usuario puede subir o reemplazar PDF;
- la extracción alimenta el resultado;
- la cotización se puede seleccionar igual que una calculada.

Regla Orbit:

- esta capacidad es obligatoria;
- debe convivir con resultados automáticos;
- el PDF original y la extracción deben conservarse separados;
- corrección humana con diff;
- versión y trazabilidad;
- ninguna corrección destruye el documento original.

### 2.6 Selección e impresión de cotizaciones individuales

Funciones relevantes:

- `cotizadorToggleSeleccion`
- `cotizadorSeleccionarTodosA`
- `cotizadorImprimirSeleccionadas`
- `cotizadorModalImpresion`
- `cotizadorEjecutarImpresionGrupo`
- `cotizadorGenerarPDFAseguradora`

Comportamiento existente:

- selección de aseguradoras;
- agrupación por aseguradora/planes;
- selección de cuotas/opciones;
- impresión por aseguradora;
- formato de cotización, no de comparativo.

Regla Orbit:

- Cotizador debe ofrecer `Imprimir cotización` independiente de `Generar comparativo`;
- el usuario selecciona qué aseguradoras/planes imprimir;
- cada cotización conserva el contenido/formato propio de la aseguradora;
- Orbit/A&S agrega logo, portada, identificación del asesor/cliente y diseño consistente;
- no convertir la impresión individual en tabla comparativa.

### 2.7 Derivación Cotizador → Comparativo

Función relevante:

- `cotizadorEnviarAComparativo`

Comportamiento encontrado:

- filtra cotizaciones seleccionadas y completas;
- acepta resultados automáticos y PDF;
- construye objetos de aseguradora;
- intenta mapear coberturas desde cadenas de texto;
- cambia al módulo Comparativo;
- llama `renderCB`, `renderQS`, `renderTable` y `renderSug`.

Fallo conocido informado y compatible con el análisis:

- la navegación ocurre;
- los objetos se trasladan parcialmente;
- la tabla puede quedar vacía o incompleta.

Causa técnica probable que debe comprobarse en smoke:

- contrato intermedio incompleto;
- mapeo manual por expresiones regulares demasiado dependiente de texto;
- campos requeridos por `getCfg/renderTable` no siempre existen;
- diferencias entre resultados automáticos y `pdfData`;
- dependencia de estado global `S` y del orden de render;
- errores absorbidos por `try/catch` que dejan pantalla vacía sin error visible.

Acción P0:

- crear DTO canónico `CotizacionNormalizada`;
- adaptar automática y PDF al mismo DTO;
- validar campos antes de navegar;
- construir tabla desde DTO, no desde cadenas ad hoc;
- mostrar alertas de campos faltantes;
- test por país/producto;
- no ocultar excepciones críticas.

### 2.8 Comparativo independiente y carga múltiple de PDF

Funciones relevantes:

- `handlePDF`
- slots múltiples de aseguradoras;
- lectura progresiva;
- edición posterior;
- render de tabla/quick summary/recomendación.

Regla Orbit:

- cantidad de propuestas variable;
- carga múltiple;
- cada propuesta con estado individual;
- reintento/reemplazo sin reiniciar todo;
- aseguradora y producto detectados contra el directorio Orbit;
- si no reconoce, permitir seleccionar de lista;
- no crear aseguradora paralela.

### 2.9 Edición y corrección humana

Funciones relevantes:

- `backToEdit`
- `editarDatosComparativo`
- `editCell`
- `editPlanWizard`
- `editPrimaWizard`
- `editPrima`
- `savePrima`

Comportamiento existente:

- editar comparativo en pantalla;
- corregir plan;
- corregir primas;
- editar celdas;
- recalcular visualización/recomendación.

Regla Orbit:

- edición permitida sobre extracción/propuesta, no sobre documento original;
- guardar valor anterior/nuevo;
- actor, fecha y motivo;
- marcar campo corregido manualmente;
- conservar confianza de extracción;
- recalcular recomendación después de correcciones;
- posibilidad de convertir corrección repetida en propuesta de aprendizaje para la aseguradora/producto/formato.

### 2.10 Tabla comparativa por producto y país

Funciones/estructuras relevantes:

- `renderTable`
- `getCfg`
- configuraciones de campos por producto;
- tratamiento de campos monetarios, porcentajes, incluidos/no incluidos;
- reglas especiales para GT/CO;
- reglas especiales para Vida y Gastos Médicos.

Hallazgos:

- la tabla no es universal;
- existe normalización visual de valores;
- campos monetarios extensos;
- deducibles cambian de interpretación según producto;
- Vida maneja devolución de prima y cálculos especiales;
- Colombia tiene campos propios de autos, hogar, vida/salud;
- se usan reglas para `Incluido/No incluido`, porcentajes, meses y moneda.

Regla Orbit:

- `ComparativoSchema` versionado por `pais + producto`;
- campos esperados, orden, secciones, etiquetas, tipo de dato y normalizador;
- permitir campos adicionales de una aseguradora sin romper tabla;
- conservar presentación completa del v110;
- evitar una tabla genérica mínima del prototipo para A&S.

### 2.11 Recomendación consultiva inteligente

Funciones relevantes:

- `renderSug`
- `showRecCriteria`
- `applyRecCriteria`
- `scoreIns`
- lógica especial de Vida;
- lógica costo-beneficio.

Criterios existentes:

- mejor costo-beneficio por defecto;
- menor precio;
- mayor cobertura;
- menor deducible;
- mayor Responsabilidad Civil;
- selección manual de aseguradora.

Hallazgos:

- la recomendación no es solo “más barata”;
- puntúa coberturas;
- adapta campos según producto/país;
- Vida diferencia opciones con/sin devolución y conversión USD/GTQ;
- la recomendación puede replantearse.

Regla Orbit:

- recomendación explicable;
- indicar criterio aplicado;
- permitir replantear;
- permitir selección manual con justificación;
- incluir resultado consultivo en pantalla, PDF y WhatsApp;
- registrar versión de reglas usada;
- no presentar como consejo absoluto;
- recalcular al editar primas/coberturas.

### 2.12 Impresión comparativa en pantalla y PDF

Funciones relevantes:

- área `print-area`;
- `doPrint`;
- estilos de impresión;
- encabezado, logo, títulos, fecha, cliente y producto;
- recomendación y badges.

Hallazgo:

- el diseño de impresión fue trabajado específicamente;
- existe composición distinta a la pantalla;
- incluye marca A&S y datos de comparación;
- identifica propuesta económica/recomendada.

Regla Orbit:

- conservar fidelidad de diseño útil;
- adaptar marca a white-label tenant;
- A&S usa su logo/configuración;
- PDF debe respetar áreas de impresión, saltos, anchos y legibilidad;
- pruebas reales por cantidad de aseguradoras y producto;
- versión móvil no sustituye formato PDF.

### 2.13 WhatsApp, plantillas y resumen consultivo

Funciones relevantes:

- `sendWA`
- `copySummary`
- `abrirSelectorPlantilla`
- `plantillaAbrirEditor`
- administración/aprobación de plantillas.

Comportamiento existente:

- número GT/CO;
- mensaje con cliente/vehículo/producto;
- recomendación calculada;
- contenido de propuestas;
- plantillas por canal/tipo;
- edición/aprobación;
- actualización de estado al compartir.

Regla Orbit:

- WhatsApp debe ser integración configurable;
- preparado ≠ enviado;
- si no hay proveedor conectado, abrir enlace/preparar mensaje y mostrar estado honesto;
- recomendación consultiva incluida;
- variables por país/producto/tenant;
- plantillas por rol con aprobación;
- registro de acción y estado;
- no declarar envío confirmado sin callback/proveedor.

### 2.14 Historial y seguimiento comercial

Funciones relevantes:

- `guardarComparativo`
- `guardarComparativoManual`
- `histCotCargar`
- `histCotFiltrar`
- `histCotRender`
- `historialReabrirCotizacion`
- `marcarComparativo`
- ganado/perdido;
- creación/actualización de lead.

Regla Orbit:

- cotización/comparativo vinculado a Cliente360/Lead/Oportunidad;
- estados borrador, generado, enviado, ganado, perdido, vencido;
- reabrir sin perder versión;
- aseguradora ganadora;
- motivo de pérdida;
- trazabilidad y actividad;
- no usar Firestore directo.

### 2.15 Base de conocimiento/laboratorio por aseguradora

Funciones relevantes:

- `kbRenderAseguradoras`
- `kbAgregarExcel`
- `kbAgregarPDFs`
- `kbEditAseguradora`
- `kbSaveAseguradora`
- `kbUploadCotizacion`
- `kbLabCargarPDFs`
- reglas/instrucciones por aseguradora.

Decisión:

- no trasladar la UI redundante/fea del laboratorio v110;
- sí trasladar todo el conocimiento útil al módulo Aseguradoras Orbit en secciones ordenadas.

Destino dentro de Aseguradoras Orbit:

1. Documentos fuente.
2. Tarifarios y versiones.
3. Ejemplos de cotizaciones.
4. Ejemplos de pólizas.
5. Formatos conocidos.
6. Instrucciones de extracción.
7. Alias/campos conocidos.
8. Coberturas/deducibles/formas de pago conocidas.
9. Correcciones aprendidas.
10. Estado de validación/activación.
11. Historial de entrenamiento.
12. Métricas de precisión, cuando exista backend real.

## 3. Contratos canónicos requeridos

### 3.1 `CotizacionNormalizada`

```txt
id
cotizacionOrigen: automatica_tarifa | pdf_aseguradora | manual_asistida
aseguradoraId
aseguradoraNombreSnapshot
pais
moneda
producto
ramo
plan
clienteId
prospectoId
asesorId
datosRiesgo
primaNeta
gastos
impuestos
primaTotal
primaMensual
formasPago
cuotas
coberturas[]
deducibles[]
condiciones[]
exclusiones[]
restricciones[]
beneficios[]
fuenteDocumentoId
configuracionTarifaId
versionFuente
confianzaExtraccion
camposCorregidos[]
estadoValidacion
estadoComercial
trazabilidad
```

### 3.2 `ComparativoNormalizado`

```txt
id
pais
moneda
producto
ramo
clienteId
prospectoId
asesorId
cotizacionIds[]
schemaComparativoId
filas/secciones normalizadas
criterioRecomendacion
recomendacion
explicacion
seleccionManual
versionReglas
estado
fechaGeneracion
fechaEnvio
archivoPdfRef
plantillaWhatsAppId
trazabilidad
```

### 3.3 `ConocimientoExtraccionAseguradora`

```txt
aseguradoraId
pais
producto
ramo
tipoDocumento
formatoConocido
aliases
instruccionesExtraccion
camposEsperados
seccionesEsperadas
coberturasConocidas
deduciblesConocidos
formasPagoConocidas
reglasNormalizacion
ejemplosFuenteIds[]
correccionesValidadas[]
version
estado
```

### 3.4 `ConfiguracionTarifaExtraida`

No editable manualmente desde cero.

```txt
aseguradoraId
pais
moneda
producto
ramo
archivoFuenteId
hoja
rango/celda/fila
encabezadosDetectados
mapeoValidado
tipoCalculo
reglas
rangos
lookup
primaMinima
recargos
gastos
impuestos
formasPago
vigencia
version
estado
```

## 4. Listas desplegables y calidad de datos

Regla transversal:

- usar listas desplegables/catálogos para reducir errores;
- país antes de producto;
- producto antes de formulario;
- marca antes de línea;
- aseguradora desde directorio Orbit;
- plan desde configuraciones validadas;
- moneda condicionada a país/producto;
- opción `Otra` con campo libre y validación;
- catálogos administrables por tenant;
- no mezclar catálogos GT/CO;
- preservar variantes regionales;
- no permitir que texto libre cree automáticamente un nuevo catálogo maestro.

## 5. Matriz producto/país mínima a preservar

La auditoría dinámica posterior debe inventariar todos los campos exactos, pero desde ya se fija:

### Guatemala

- Autos completo/RC.
- Motos completo/RC.
- Camión/cabezal/grúa/microbús/bus y variantes.
- Gastos Médicos con grupo familiar/edades/planes.
- Vida, incluyendo alternativas en USD y devolución de prima.
- Hogar y productos adicionales configurados.

### Colombia

- Autos y motos con campos ampliados.
- Responsabilidad Civil y amparos locales.
- Hogar con sumas y coberturas propias.
- Vida/salud con campos y monedas aplicables.
- Catálogo de marcas/líneas distinto.
- Formularios más detallados donde corresponda.

No homologar campos distintos solo para simplificar la UI.

## 6. Fallos/parches que no deben heredarse

### P0-01 — Cotizador → Comparativo deja tabla vacía

- preservar intención del flujo;
- reemplazar transferencia parcial por DTO validado;
- test completo automático/PDF/mixto;
- error visible, no `try/catch` silencioso.

### P0-02 — Estado global monolítico

- v110 usa objetos globales `S`, `COT`, dependencias y DOM compartido;
- Orbit debe separar estado de sesión, entidades y configuración;
- usar módulos/servicios y `Orbit.store`.

### P0-03 — Firebase/Firestore/Storage directo

- eliminar del empalme;
- reemplazar por adapter/servicio backend;
- no importar configuraciones ni credenciales del HTML.

### P0-04 — Regex/adaptaciones ad hoc

- conservar reglas útiles como conocimiento versionado;
- no dejar expresiones dispersas en UI;
- centralizar normalizadores por país/producto/aseguradora.

### P0-05 — Laboratorio redundante/disperso

- consolidar en Aseguradoras Orbit;
- no duplicar directorios o pantallas;
- separar documentos, conocimiento, tarifas y versiones.

### P1-01 — Errores absorbidos silenciosamente

- registrar error técnico internamente;
- mostrar estado honesto al usuario;
- permitir reintento/corrección.

### P1-02 — Hardcodes de moneda/tasa

- conversiones desde configuración y fecha;
- no tasa fija embebida;
- preservar moneda original y moneda de presentación.

### P1-03 — Impresión dependiente del DOM monolítico

- crear renderers de impresión probables y testeables;
- mantener fidelidad visual.

### P1-04 — Recomendación sin suficiente explicación

- conservar criterios;
- añadir explicación y factores;
- registrar versión de reglas.

## 7. Arquitectura objetivo A&S

```txt
Aseguradoras Orbit 360
  ├─ Directorio operativo
  ├─ Contactos
  ├─ Accesos/credenciales
  ├─ Cuentas bancarias
  ├─ Documentos fuente
  ├─ Tarifarios y versiones
  ├─ Ejemplos de cotización/póliza
  ├─ Conocimiento de extracción
  ├─ Correcciones aprendidas
  └─ Configuraciones validadas
            │
            ├──────── Cotizador
            │          ├─ automático por tarifa
            │          ├─ PDF externo
            │          ├─ impresión individual
            │          └─ selección para comparar
            │
            └──────── Comparativo
                       ├─ derivado desde Cotizador
                       ├─ carga independiente múltiple
                       ├─ edición/corrección
                       ├─ recomendación consultiva
                       ├─ pantalla/PDF
                       └─ WhatsApp/plantillas
```

## 8. Prototipo reusable vs implementación A&S

### Prototipo/base comercializable

- módulos simples configurables;
- activación independiente de Cotizador/Comparativo;
- contratos y estados completos;
- carga documental;
- listas desplegables;
- configuraciones por tenant;
- sin datos/lógicas exclusivas A&S hardcodeadas.

### Configuración A&S

- interfaz cercana a v110, mejorada con Orbit;
- reglas y entrenamiento acumulados;
- formatos de impresión trabajados;
- catálogos GT/CO;
- productos y esquemas comparativos avanzados;
- conocimiento por aseguradora/producto;
- plantillas y recomendación consultiva;
- todo configurado, versionado y conectado al backend Orbit.

La base no debe limitar la riqueza A&S. A&S es una configuración avanzada sobre la misma arquitectura reusable.

## 9. Claude/prototipo — paquete obligatorio futuro

Claude deberá recibir este documento completo, no un resumen parcial.

Debe:

- conservar la interfaz valiosa de v110;
- tomar lo mejor del prototipo Orbit;
- no copiar el módulo aseguradoras v110;
- no simplificar formularios A&S;
- conservar listas desplegables GT/CO;
- crear dos módulos independientes pero integrables;
- soportar automático + PDF en Cotizador;
- soportar derivado + independiente en Comparativo;
- conservar edición, recomendación, impresión y WhatsApp;
- diseñar Aseguradoras sin redundancia;
- añadir secciones de conocimiento/documentos/versiones;
- no tocar backend protegido;
- entregar inventario, riesgos y criterios de smoke.

Estado de envío: `LISTO_PARA_INCLUIR_EN_PAQUETE_CLAUDE`, pero Claude aún no debe intervenir hasta completar la matriz técnica de empalme y definir el bloque de implementación visual.

## 10. Academia

Rutas mínimas:

### Asesor

- seleccionar país/producto;
- completar datos con catálogos;
- interpretar cotización automática/PDF;
- imprimir cotización individual;
- seleccionar propuestas;
- generar comparativo;
- replantear recomendación;
- enviar por WhatsApp;
- editar/corregir sin alterar fuente.

### Operativo

- cargar tarifarios/documentos;
- revisar extracción;
- validar configuraciones;
- resolver errores de lectura;
- versionar;
- administrar conocimiento de aseguradora.

### Dirección/Admin

- activar módulos/aseguradoras/productos;
- aprobar reglas/versiones;
- revisar recomendación y trazabilidad;
- administrar plantillas;
- controlar calidad.

### IT/Seguridad

- permisos;
- secretos;
- almacenamiento documental;
- auditoría;
- errores y regresión;
- integraciones WhatsApp/IA.

## 11. Smokes obligatorios

1. Cotizador automático GT Autos.
2. Cotizador automático CO Autos con formulario ampliado.
3. Cotizador GT Gastos Médicos.
4. Cotizador Vida con USD/reglas especiales.
5. Carga PDF de aseguradora sin tarifa.
6. Mezcla de resultados automáticos y PDF.
7. Impresión individual de una aseguradora.
8. Impresión seleccionada de varias aseguradoras sin convertir a comparativo.
9. Derivar automático → Comparativo.
10. Derivar PDF → Comparativo.
11. Derivar mezcla → Comparativo.
12. Comparativo independiente con cantidad variable de PDFs.
13. Tabla correcta por país/producto.
14. Edición de prima/cobertura y recálculo.
15. Criterio costo-beneficio.
16. Replantear por precio/cobertura/deducible/RC/manual.
17. PDF comparativo con diseño completo.
18. WhatsApp con plantilla y recomendación.
19. Catálogos marca/línea GT y CO con `Otra`.
20. No duplicación de aseguradoras.
21. No Firebase directo.
22. No activación de tarifa sin documento validado.
23. Historial/reapertura/versionado.
24. Error visible si falta contrato para tabla.
25. Smoke de impresión con 2, 4, 6+ aseguradoras.

## 12. Estado y siguiente acción

Estado: `AUDITORÍA_FORENSE_ESTÁTICA_PROFUNDA_COMPLETADA / AUDITORÍA_DINÁMICA_Y_EMPAlME_PENDIENTES`.

Siguiente acción técnica:

1. Auditar `modules/cotizador.js` y `modules/comparativo.js` actuales.
2. Construir matriz función v110 → módulo Orbit → DTO → servicio/store → smoke.
3. Diseñar el DTO canónico y adapter de transición Cotizador→Comparativo.
4. Corregir primero el fallo de tabla vacía en contrato/test, sin copiar el HTML completo.
5. Preparar paquete Claude cuando el contrato técnico esté cerrado.

## 13. Dudas que requieren confirmación posterior, no bloquean ahora

1. Si la recomendación automática debe poder ser deshabilitada por tenant/producto.
2. Si el PDF individual debe reproducir exactamente el formato visual de la aseguradora o una reconstrucción fiel dentro del formato A&S; la instrucción actual se interpreta como conservar todo el contenido/formato esencial de cada aseguradora, con marca A&S y mejor composición.
3. Si las plantillas WhatsApp requieren aprobación solo de Admin o también Dirección.
4. Si las tasas de conversión monetaria deben ser manuales por período o integración futura.
5. Qué proveedores/aseguradoras permiten automatización/API en la primera fase.

Estas dudas deben resolverse antes de producción, pero no justifican detener la auditoría ni el diseño reusable.