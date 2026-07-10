# DECISIÓN MAESTRA — ASEGURADORAS / COTIZADOR / COMPARATIVO / HISTORIALES / IA / TARIFAS

Fecha: 2026-07-10  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.  
Control maestro relacionado: `CONTROL-MAESTRO-ACUMULADO-CLAUDE-BACKEND-UX-ACADEMIA-ORBIT360-AYS-20260709.md`.

## 0. Propósito

Cerrar con amplitud las decisiones de producto y arquitectura surgidas después de la auditoría forense de `comparativo_final_v110.html`, evitando:

- perder el entrenamiento acumulado durante meses;
- sustituirlo por el Cotizador/Comparativo simple del prototipo;
- copiar el HTML monolítico con sus parches;
- crear un segundo módulo maestro de aseguradoras;
- desviar el plan operativo CRM → Aseguradoras → Cotizador → Comparativo;
- dejar sin documentar los impactos backend, Claude, Academia y operación.

## 1. Estado del plan y regla anti-desviación

### CRM/Clientes

Se considera baseline cerrado en:

- análisis de la fuente real;
- cruces con pólizas, recibos, cobros, cartera y comisiones ya realizados;
- dry-run 440 / 414 crear / 26 requiere validación;
- motor y wire Clientes P0;
- reglas de calidad, asesores, duplicados y `pendiente_polizas`.

Pendientes residuales de CRM:

- CI visible;
- smoke visual;
- scopes multirol;
- escritura futura autorizada.

Estos pendientes no justifican reiniciar CRM ni bloquean el trabajo técnico de Aseguradoras. Deben cerrarse transversalmente en smoke, no mediante nueva auditoría general.

### Orden vigente

1. Aseguradoras como fuente primaria de conocimiento y operación.
2. Contrato canónico de cotizaciones, tarifas, documentos y conocimiento.
3. Cotizador A&S avanzado.
4. Comparativo A&S avanzado.
5. Adapter Cotizador → Comparativo.
6. Historial, permisos, impresión y WhatsApp.
7. Claude para integración visual después del contrato técnico.
8. Academia por rol en paralelo.

## 2. Fuente única de aseguradoras

La única fuente maestra es:

```txt
Orbit.modules.aseguradoras
Orbit.store
configuración tenant
```

`comparativo_final_v110.html` aporta:

- lógicas de lectura;
- conocimiento por aseguradora/producto/país;
- reglas de tarifas;
- extracción de PDF;
- Cotizador;
- Comparativo;
- impresión;
- recomendación consultiva;
- WhatsApp;
- edición/corrección;
- laboratorio de conocimiento.

No aporta ni debe trasladar:

- módulo interno de aseguradoras;
- estadísticas internas;
- catálogo paralelo;
- almacenamiento propio;
- Firebase/Firestore/Storage directo;
- navegación propia;
- usuarios o secretos.

## 3. Aseguradoras Orbit: doble función

Aseguradoras debe ser simultáneamente:

### 3.1 Directorio operativo

Debe administrar:

- identidad y logo;
- país y monedas;
- contactos editables;
- portales y URL clicables;
- usuario/contraseña visible bajo demanda para roles autorizados;
- botones mostrar, ocultar y copiar;
- cuentas bancarias visibles bajo demanda;
- copiar número de cuenta;
- Drive/repositorio de la aseguradora;
- datos de facturación;
- ramos/productos;
- comisiones;
- cartera relacionada;
- documentos requeridos para emisión;
- vínculos con pólizas, cobros, siniestros, documentos y comisiones.

Roles autorizados para credenciales y cuentas:

- SuperAdmin;
- Dirección;
- Admin/AdminTenant;
- Operativo.

Asesor y ClientePortal no tienen acceso por defecto.

Las consultas/copias deben generar auditoría sin registrar el secreto consultado.

### 3.2 Base de conocimiento

Debe almacenar o referenciar:

- tarifarios Excel/PDF;
- cotizadores Excel;
- cotizaciones PDF de ejemplo;
- pólizas PDF de ejemplo;
- condiciones generales/particulares;
- circulares y cambios de tasa;
- esquemas de coberturas y deducibles;
- instrucciones de extracción;
- aliases y formatos conocidos;
- correcciones humanas convertibles en propuesta de aprendizaje;
- versiones y vigencias;
- grado de confianza;
- estado de validación;
- fuente y trazabilidad.

No debe mostrar esta información de forma redundante. La ficha tendrá secciones/tabs claros y cada dato tendrá una sola fuente canónica.

## 4. Drive para aseguradoras y clientes

Objetivo inicial: evitar llenar almacenamiento operativo con duplicados cuando A&S ya mantiene expedientes en Google Drive.

Modelo:

```txt
externalFolderRef
provider: google_drive
folderId
folderUrl
entityType: cliente | aseguradora
entityId
matchMethod
matchConfidence
validatedBy
validatedAt
```

Reglas:

- Orbit guarda referencia y permisos, no una copia indiscriminada de todos los archivos;
- la carpeta padre puede compartirse una sola vez;
- el sistema propone el mapeo automático por nombre normalizado, identificador y metadatos;
- se ejecuta dry-run de correspondencias;
- coincidencias ambiguas quedan `REQUIERE_VALIDACION`;
- no se asigna carpeta incorrecta por similitud de nombre;
- Cliente360 y Aseguradoras muestran acceso directo al expediente autorizado;
- carga de documentos para lectura puede referenciar el archivo Drive sin alterar el original.

La conexión real se solicitará únicamente cuando se implemente el adapter Google Drive y se requiera acceso a las carpetas padre. No se pedirá carpeta por carpeta.

## 5. Cotizador: alcance definitivo

Cotizador administra cotizaciones individuales y un lote/sesión de cotización.

Debe aceptar cuatro orígenes:

1. `tarifa_validada`: cálculo automático desde una versión tarifaria habilitada.
2. `cotizador_excel`: cálculo desde reglas/fórmulas extraídas de un archivo oficial.
3. `pdf_externo`: propuesta recibida de una aseguradora sin tarifas/API.
4. `cotizador_linea_asistido`: resultado obtenido de un cotizador en línea mediante flujo autorizado.
5. `ajuste_manual_versionado`: cambio puntual con motivo, vigencia y referencia a versión base.

Todas las propuestas se normalizan al mismo contrato y aparecen en el mismo tablero.

### Acciones obligatorias

- cotizar;
- cargar propuesta PDF;
- revisar/corregir extracción;
- seleccionar aseguradoras/planes;
- imprimir una o varias cotizaciones;
- enviar por WhatsApp;
- guardar;
- retomar;
- duplicar;
- editar;
- archivar/eliminar lógicamente;
- derivar propuestas seleccionadas a Comparativo.

## 6. Impresión de cotización — decisión cerrada

La impresión actual genérica del prototipo no es suficiente.

### Estrategia recomendada: fidelidad controlada en formato A&S

Cada impresión debe:

- conservar todos los datos materiales de la cotización original;
- conservar el orden lógico y secciones importantes de la aseguradora;
- usar plantilla por aseguradora, país y producto;
- incorporar logo A&S/tenant y diseño corporativo;
- identificar claramente la aseguradora emisora de la propuesta;
- indicar fuente/documento/fecha/versión;
- mantener condiciones, exclusiones, vigencia, deducibles, coberturas y forma de pago;
- no omitir campos porque no existan en otras aseguradoras;
- permitir adjuntar o abrir el PDF original sin modificar;
- generar una salida A&S normalizada y conservar el original como evidencia.

No se recomienda copiar pixel por pixel el documento de la aseguradora. La mejor opción es conservar fielmente toda la información y su estructura material dentro de una plantilla A&S versionada. Esto reduce omisiones, mantiene consistencia comercial y conserva el original para contraste.

Cada plantilla requiere smoke contra documentos reales sanitizados antes de habilitarse.

## 7. WhatsApp en Cotizador

Cotizador debe tener WhatsApp, aunque el prototipo actual solo tenga envío genérico.

Debe incluir:

- plantilla por país/producto;
- datos del cliente;
- aseguradora y plan;
- resumen de prima y pagos;
- coberturas relevantes;
- advertencias/condiciones;
- enlace o adjunto de cotización;
- mensaje editable antes de enviar;
- estado preparado/enviado/error según integración real;
- auditoría y relación con cliente/asesor.

Publicación o modificación de plantillas requiere aprobación dual:

- Admin;
- Dirección.

El uso diario de una plantilla ya aprobada no requiere doble aprobación por mensaje.

## 8. Comparativo: alcance definitivo

Comparativo es independiente y también recibe propuestas desde Cotizador.

### Modo derivado

```txt
Cotizaciones normalizadas seleccionadas
→ validación de contrato
→ schema país/producto
→ tabla completa
→ edición/corrección
→ recomendación
→ pantalla/PDF/WhatsApp
```

### Modo independiente

- funciona aunque Cotizador esté desactivado;
- permite cargar cantidad variable de PDFs;
- identifica aseguradora/producto/país;
- extrae propuestas;
- permite corregir cada una;
- genera tabla por producto;
- recomienda;
- imprime y comparte.

### Recomendación consultiva

- activa por defecto;
- el tenant puede desactivarla;
- criterios: costo-beneficio, precio, cobertura, deducible, RC, criterio por producto y selección manual;
- debe explicar el criterio;
- puede replantearse;
- se recalcula al editar datos;
- aparece en pantalla, PDF y WhatsApp;
- no sustituye decisión humana.

## 9. Historial integral

Deben existir colecciones operativas separadas:

```txt
cotizaciones
comparativos
historialCotizaciones
historialComparativos
```

Cada registro conserva:

- tenant;
- cliente/prospecto;
- asesor propietario;
- país/moneda;
- ramo/producto;
- cotizaciones incluidas;
- documentos fuente;
- versiones tarifarias;
- recomendación;
- fecha/estado;
- auditoría;
- snapshot reproducible.

Acciones:

- ver detalle;
- retomar;
- duplicar;
- editar con versionado;
- archivar;
- restaurar;
- eliminar lógicamente.

La eliminación física no es la acción cotidiana. Solo puede considerarse con permiso reforzado y política de retención.

Scopes:

- Asesor: propios.
- Líder/equipo: equipo si está habilitado.
- Operativo/Admin/Dirección/SuperAdmin: todos según permisos.
- ClientePortal: solo salidas expresamente compartidas.

## 10. Tarifas y reglas: fuentes y versionado

### Fuentes aceptadas

- Excel oficial de tasas;
- cotizador Excel oficial;
- PDF/circular oficial;
- cotización PDF de ejemplo;
- cotizador en línea autorizado;
- modificación manual versionada;
- archivo adicional puntual.

### Regla de versionado

- una nueva fuente crea nueva versión;
- no pisa ni borra la anterior;
- conserva vigencia desde/hasta;
- identifica versión reemplazada;
- requiere diff;
- requiere validación antes de habilitar;
- permite rollback;
- una modificación manual es overlay sobre versión base, no edición silenciosa.

### Ajuste manual

Se permite cuando la aseguradora comunica un cambio puntual.

Requiere:

- versión base;
- aseguradora/producto/línea afectados;
- valor anterior/nuevo;
- motivo;
- evidencia o referencia;
- vigencia;
- actor;
- validación;
- auditoría.

## 11. Cotizadores en línea sin API

Hasta 2026-07-10 ninguna aseguradora A&S ha entregado API.

### Estrategia en orden de preferencia

1. Usar archivo oficial Excel/PDF/circular cuando exista.
2. Usar función oficial de exportar/imprimir PDF del cotizador en línea.
3. Captura asistida autorizada dentro de la sesión de un usuario autorizado.
4. Crear matriz de casos de calibración y registrar entradas/salidas.
5. Inferir reglas candidatas con confianza y validarlas contra casos no usados en el ajuste.
6. Mantener operación como propuesta si no se alcanza precisión mínima.
7. Permitir ajuste manual versionado para cambios puntuales.

### Captura asistida

Debe:

- usar la sesión del usuario autorizado;
- no compartir credenciales con el modelo;
- no evadir CAPTCHA/MFA/controles;
- verificar términos y permiso de automatización;
- registrar entradas y resultados;
- conservar PDF/captura de salida como evidencia;
- no afirmar que existe API;
- no ejecutar cotizaciones masivas no autorizadas.

### Inferencia de tarifas

No debe basarse en uno o dos ejemplos.

La matriz de calibración debe variar, según producto:

- valor asegurado;
- año/tipo de vehículo;
- marca/línea;
- uso;
- edad/género/integrantes;
- suma asegurada;
- deducible;
- forma y número de pagos;
- país/moneda;
- recargos y asistencia.

Resultado:

```txt
regla candidata
confianza
casos cubiertos
casos fallidos
excepciones
fuente
versión
estado de validación
```

## 12. Reglas A&S conocidas — configuración, no hardcode base

### Guatemala

- IVA 12%.
- Prima neta antes de IVA.
- Gastos de emisión usuales: 5% sobre prima neta, con excepciones por aseguradora/producto.
- Columna no cobra gastos de emisión en los casos conocidos.
- Contado: sin recargo de fraccionamiento.
- Fraccionado: recargo según número de pagos y aseguradora; valores observados alrededor de 13.3%–13.6% para 12 meses, sujetos a fuente/versionado.
- Algunas aseguradoras manejan 10 pagos y otras 12.
- Visa cuotas: la aseguradora recibe contado; se muestran cuotas financieras sin tratarlas automáticamente como recargo de aseguradora.
- Asistencia puede estar incluida, separada o no cobrarse.
- Prima mínima y tasas cambian por tipo de vehículo.

Un umbral mencionado para cuotas/recibos de Columna quedó `REQUIERE_VALIDACION` por posible ambigüedad de cifra y debe confirmarse con fuente antes de codificar.

### Colombia

- IVA 19%.
- Prima neta antes de IVA.
- Gastos de expedición variables.
- Fraccionamiento usualmente por financiera externa, no por la aseguradora.
- No aplicar recargo de aseguradora por defecto sin fuente.
- País, moneda, producto y financiera deben conservarse separados.

### Fuentes/cotizadores conocidos A&S

- Aseguradora Guatemalteca: tasas/cotizador parcial según producto.
- Columna: reglas inferidas y particularidades de gastos.
- Bantrab: cotizador de autos y cotizador separado de motos.
- Banrural: cotizadores/tarifas disponibles en ciertos productos.
- BAM: cotizadores/tarifas disponibles en ciertos productos.
- Gastos Médicos: principalmente BAM y Banrural en la información conocida.

Estos nombres y reglas viven solo en configuración tenant A&S/documentos, no en el núcleo reusable.

## 13. Selección de IA por tarea

### Principio

No elegir un único proveedor para todo ni hardcodear modelos concretos. La configuración debe permitir motor por módulo/tarea y fallback.

### Pipeline obligatorio

```txt
parser determinístico primero
→ extracción/OCR multimodal
→ salida JSON con schema
→ validadores de negocio
→ comparación contra fuente
→ revisión humana según confianza
→ aprendizaje versionado
```

### Enrutamiento recomendado inicial para A&S

#### Documentos complejos, pólizas/cotizaciones y razonamiento consultivo

Proveedor clase Claude como candidato primario inicial, porque A&S ya obtuvo buen desempeño y se requiere comprensión visual/textual profunda. Debe pasar benchmark propio antes de quedar definitivo.

#### Validación estructurada y normalización canónica

Proveedor clase OpenAI como candidato de validación/fallback por su soporte de archivos, hojas de cálculo y salida estructurada. No reemplaza validadores determinísticos.

#### OCR/preprocesamiento y volumen

Proveedor clase Gemini como candidato para preprocesamiento masivo, documentos largos y extracción estructurada de menor costo, sujeto a benchmark.

### Regla de decisión

La selección final se hará con un set sanitizado y etiquetado por:

- país;
- producto;
- aseguradora;
- PDF nativo/escaneado;
- Excel;
- complejidad;
- campos esperados.

Métricas:

- exactitud por campo;
- omisiones;
- falsos datos;
- lectura de tablas;
- moneda/impuestos;
- tiempo;
- costo;
- JSON válido;
- necesidad de corrección humana.

El proveedor ganador puede variar por tarea. Configuración del tenant decide proveedor, costo máximo, fallback y política de privacidad.

## 14. Auditoría de módulos Orbit actuales

### Cotizador actual

Fortalezas:

- listas desplegables;
- país y ramo;
- Auto/Vida/Gastos Médicos/Hogar/Daños;
- marcas/líneas/modelos;
- historial básico;
- selección de aseguradoras Orbit;
- modo tasas/manual;
- impresión y envío básico;
- derivación a Comparativo.

Brechas:

- tasas y recargos genéricos hardcodeados;
- gastos GT asumidos para todas las aseguradoras;
- historial en preferencia local, no colección operativa;
- impresión genérica incompleta;
- envío no tiene plantillas aprobadas ni estado real;
- modo manual no es versión tarifaria trazable;
- adapter a Comparativo pierde campos;
- no incluye PDF externo en el mismo contrato canónico.

### Comparativo actual

Fortalezas:

- independiente;
- carga múltiple de PDF;
- criterios por ramo;
- edición de propuestas;
- ranking;
- impresión comparativa;
- WhatsApp básico;
- historial básico;
- soporte de cotizaciones derivadas.

Brechas:

- catálogos locales duplicados;
- relación con aseguradora por nombre aproximado;
- estado global `Orbit._cots`;
- historial en memoria;
- errores de extracción absorbidos silenciosamente;
- edición sin diff/auditoría;
- ranking simplificado;
- falta schema por país/producto v110;
- envío genérico;
- contrato incompleto desde Cotizador.

## 15. Backend reusable implementado en este bloque

```txt
orbit360-platform/core/cotizador-comparativo-contrato-p0.js
tools/orbit360-test-cotizador-comparativo-contrato-p0.mjs
```

Cubre:

- orígenes de cotización;
- normalización canónica;
- validación;
- comparativo canónico;
- historial y scopes;
- retomar/duplicar/archivar;
- versiones tarifarias;
- ajustes manuales versionados;
- perfil de impresión fiel;
- política WhatsApp;
- routing de IA configurable;
- estrategia de cotizador en línea.

No escribe datos ni modifica módulos visibles todavía.

## 16. Claude / prototipo

Este bloque es `LISTO_PARA_CLAUDE`, pero no debe enviarse aislado.

Claude deberá recibir conjuntamente:

- auditoría v110;
- frontera Aseguradoras Orbit/v110;
- este documento;
- contrato canónico;
- matriz de empalme futura;
- restricciones backend;
- smokes;
- impacto Academia.

Claude debe:

- conservar interfaz valiosa de v110;
- incorporar lo mejor del prototipo;
- no simplificar A&S;
- no copiar aseguradoras v110;
- no usar estado global como fuente;
- no hardcodear tarifas;
- diseñar historial completo;
- mejorar diseño Aseguradoras;
- incluir mostrar/ocultar/copiar;
- incluir Drive;
- incluir plantillas WhatsApp;
- mantener dropdowns y catálogos por país;
- actualizar Academia y manuales.

## 17. Academia

Rutas nuevas/actualizadas:

### Asesor

- crear y retomar cotizaciones;
- cargar PDF externo;
- seleccionar e imprimir;
- enviar por WhatsApp;
- derivar a Comparativo;
- editar datos extraídos;
- interpretar recomendación.

### Operativo/Admin/Dirección

- mantener Aseguradoras;
- consultar credenciales/cuentas;
- cargar fuentes;
- revisar extracción;
- versionar tarifas;
- validar ajustes manuales;
- aprobar plantillas;
- administrar historial y scopes.

### IT/Seguridad

- routing IA;
- privacidad;
- auditoría;
- acceso a Drive;
- secretos;
- fallbacks;
- evaluación de modelos.

## 18. Pendientes y condición de cierre

### Aseguradoras

- integrar contrato de accesos/cuentas a runtime;
- tabs de conocimiento/documentos/versiones;
- Drive;
- permisos reales;
- diseño Claude;
- smoke.

### Cotizador

- adapter a contrato canónico;
- eliminar tasas fallback en A&S o marcarlas solo demo/configuración base;
- PDF externo;
- historial Orbit.store;
- impresión fiel;
- WhatsApp;
- scopes;
- smokes.

### Comparativo

- adapter desde Cotizador;
- schema v110 por país/producto;
- historial Orbit.store;
- auditoría de edición;
- recomendación avanzada;
- impresión/WhatsApp v110;
- smokes.

### IA/tarifas

- dataset sanitizado de evaluación;
- benchmark por tarea;
- adapter de proveedor;
- extracción Excel/fórmulas;
- estrategia piloto de cotizador en línea;
- control de versiones.

## 19. Acción manual

No requerida en este momento.

Será indispensable después para:

- autorizar acceso a carpeta padre Drive;
- aportar fuentes tarifarias/cotizadores cuando se inicie el benchmark;
- validar visualmente impresiones por aseguradora;
- aprobar proveedor IA y presupuesto;
- autorizar cualquier escritura real, deploy o merge.
