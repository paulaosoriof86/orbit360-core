# REGISTRO DE IMPLEMENTACIÓN — ASEGURADORAS / INVENTARIO DE FUENTES RUNTIME

Fecha: 2026-07-10  
Proyecto: Orbit 360 A&S  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## 0. Carril y propósito

Carril principal: B + preparación de A y C.

Este bloque convierte la documentación de fuentes de conocimiento de Aseguradoras en una capacidad visible y editable del runtime, sin cargar todavía archivos reales, sin escribir secretos y sin reabrir CRM, pólizas, cobros, recibos, cartera o comisiones.

Aseguradoras continúa siendo la fuente maestra única para Cotizador y Comparativo.

## 1. Necesidad

La ficha anterior guardaba cada documento únicamente como:

```txt
nombre
categoría
```

Ese modelo no permitía distinguir:

- una fuente tarifaria de una fuente de presentación;
- un cotizador Excel con hoja de salida de un tarifario simple;
- una cotización oficial de un documento comercial;
- país, ramo, producto, plan y versión;
- vigencia;
- estado de lectura/calibración;
- si falta una cotización ejemplo;
- si el archivo puede alimentar Cotizador, Comparativo o ambos.

## 2. Resultado esperado

Cada aseguradora debe poder inventariar fuentes sin crear un segundo directorio ni una colección paralela.

La ficha debe responder claramente:

```txt
¿Hay fuente tarifaria?
¿Hay fuente de presentación?
¿Se requiere cotización ejemplo?
¿Cuál es la versión vigente?
¿Para qué país/producto aplica?
¿Cuál es su estado de lectura y validación?
```

## 3. Causa raíz

El módulo había evolucionado como directorio operativo y conservaba documentos como una lista simple. La auditoría de `comparativo_final_v110.html` demostró que Cotizador y Comparativo necesitan un inventario mucho más rico por aseguradora, país, producto y formato.

Sin esta capa, el empalme habría obligado a:

- inferir el uso de cada archivo por su nombre;
- mezclar tasas con formatos de presentación;
- perder versiones;
- duplicar conocimiento dentro de Cotizador/Comparativo;
- repetir la dispersión presente en el HTML v110.

## 4. Archivos modificados o creados

### Backend/prototipo runtime

```txt
orbit360-platform/modules/aseguradoras.js
```

### Smoke

```txt
tools/orbit360-test-aseguradoras-fuentes-runtime-p0.mjs
.github/workflows/orbit360-cotizador-comparativo-smoke.yml
```

### Contratos fuente relacionados

```txt
orbit360-platform/core/cotizacion-esquema-aseguradora-p0.js
orbit360-platform/core/cotizador-comparativo-contrato-p0.js
```

## 5. Implementación funcional

### 5.1 Compatibilidad incremental

Se conserva el campo existente:

```txt
aseguradora.docs[]
```

No se creó una colección maestra paralela.

Los registros legacy con solo `nombre` y `cat` se normalizan al abrir la ficha. Al guardar, conservan esos campos y agregan la estructura nueva.

### 5.2 Tipos de fuente

El runtime admite:

```txt
cotizador_excel_salida
cotizacion_pdf_oficial
tarifario_excel
tarifario_pdf
poliza_ejemplo
condiciones
circular
ajuste_validado
cotizador_linea_asistido
formulario
documento_comercial
otro
```

Los documentos comerciales o formularios no se clasifican automáticamente como tarifas ni como cotizaciones.

### 5.3 Datos por fuente

Cada registro puede conservar:

```txt
id
nombre
categoría legacy
tipoFuente
país
ramo
producto
plan/familia
versión
archivoRef / Drive / documento
vigencia desde/hasta
estado
notas
trazabilidad
```

Indicadores de contenido:

```txt
contieneTarifas
contieneReglasCalculo
contieneHojaSalida
contieneFormatoCotizacion
contieneAreaImpresion
```

### 5.4 Estados

```txt
inventario_fuentes
fuentes_incompletas
lectura_pendiente
extraccion_en_prueba
requiere_validacion
calibrado
validado_habilitado
reemplazado_por_version
bloqueado
```

### 5.5 Resumen visible

Las tarjetas y la ficha muestran:

```txt
Tarifas: disponible/no disponible
Presentación: disponible/no disponible
Requiere cotización ejemplo
Cantidad de fuentes
Estado general
```

La ficha ya no presenta todos los documentos como equivalentes.

### 5.6 Reglas de evaluación

- Un tarifario Excel/PDF puede aportar tasas y requerir una cotización ejemplo.
- Un cotizador Excel con hoja/formato/área de salida puede aportar tarifas y presentación.
- Una cotización PDF oficial aporta presentación.
- Un documento comercial no habilita tarifas.
- Un flag marcado explícitamente como `false` no se reactiva por el valor predeterminado del tipo de fuente.
- La disponibilidad tarifaria no implica validación ni activación.

## 6. Smoke implementado

El test sintético cubre:

1. migración compatible de `Tarifas autos.xlsx`;
2. herencia de país desde la aseguradora;
3. tarifario con `requiere cotización ejemplo`;
4. cotizador Excel con salida como fuente dual;
5. cotización PDF como fuente de presentación;
6. resumen incompleto y resumen completo;
7. respeto de flags explícitos en falso;
8. documento comercial no clasificado como tarifa.

La sintaxis y el smoke fueron ejecutados localmente antes de subir el cambio. La ejecución de GitHub Actions debe verificarse por separado; no se considera aprobada hasta existir run visible.

## 7. Backend y seguridad

No se modificaron:

```txt
data/store.js
data/store-firestore-lab.local.js
core/backend-lab-*
core/auth.js
core/importa.js
firestore.rules
```

El módulo sigue usando exclusivamente `Orbit.store`.

Este bloque no cargó archivos reales, payloads A&S, tarifas reales ni credenciales.

## 8. Impacto para Claude / prototipo

Estado: `DOCUMENTADO / IMPLEMENTADO_RUNTIME_PARCIAL / PENDIENTE_UX_FINAL`.

Claude debe conservar acumulativamente:

- Aseguradoras como única fuente maestra;
- badges separados de tarifa y presentación;
- aviso `requiere cotización ejemplo`;
- editor por fuente, país, producto y versión;
- tipos de fuente configurables;
- estados de lectura/calibración;
- Drive o documento fuente visible;
- trazabilidad y vigencia;
- compatibilidad con documentos legacy;
- ausencia de un segundo laboratorio/directorio redundante;
- documentos comerciales sin falsas capacidades tarifarias;
- interfaz final corporativa más clara que la provisional.

Claude no debe:

- reducir la fuente a nombre/categoría;
- crear formularios de tarifas desconectados del archivo fuente;
- asumir que todo PDF es cotización;
- mezclar información de aseguradoras distintas;
- reemplazar `modules/aseguradoras.js` por el módulo de v110;
- tocar backend protegido.

## 9. Impacto Academia

### Dirección/Admin/Operativo

Academia debe enseñar:

- registrar una fuente;
- diferenciar tarifario, cotizador y cotización oficial;
- identificar hoja de salida y área de impresión;
- asignar país, ramo, producto y versión;
- interpretar `fuentes incompletas`;
- saber cuándo solicitar cotización ejemplo;
- cambiar una versión sin borrar la anterior;
- no activar conocimiento sin validación.

### Asesor

Debe enseñar:

- diferencia entre tarifa disponible y cotización lista para compartir;
- significado de formato validado;
- consulta de la fuente original;
- por qué no se debe presentar una extracción sin revisión.

## 10. Pendientes abiertos de Aseguradoras

### P0.2 — Accesos y cuentas sensibles

La necesidad ya está definida, pero no se cerró en este bloque:

- SuperAdmin, Dirección, Admin/AdminTenant y Operativo pueden consultar;
- mostrar/ocultar/copiar;
- secreto obtenido desde backend seguro mediante `credentialRef`;
- no guardar contraseña en el frontend ni en logs;
- auditoría de consulta/copia sin registrar el valor;
- cuentas bancarias visibles bajo demanda;
- permisos reales multirol.

### P0.3 — Drive

Pendiente:

- conectar carpeta padre de aseguradoras;
- proponer coincidencia automática por aseguradora;
- dry-run;
- validar coincidencias dudosas;
- abrir carpeta desde la ficha;
- no duplicar archivos en Storage durante la primera fase.

### P0.4 — Adapters documentales

Pendiente:

- lector de cotizador Excel;
- inventario de hojas, fórmulas, listas, rangos y área de impresión;
- lector PDF completo;
- extracción de secciones y presentación;
- creación de propuesta/diff;
- versionado y validación.

### P0.5 — Fuentes reales A&S

No solicitar hasta iniciar calibración.

Orden sugerido:

1. aseguradoras con cotizador Excel completo;
2. cotizadores que generan salida de impresión;
3. cotizaciones oficiales PDF;
4. casos con solo tarifas;
5. cotizadores en línea asistidos.

Aseguradora con solo tasas debe quedar marcada como `requiere cotización ejemplo`.

## 11. Relación con el plan general

### CRM/Clientes

No se reabrió. Continúa como baseline cerrado con pendientes transversales de CI, smoke, scopes y escritura futura autorizada.

### Aseguradoras

Avance actual:

```txt
Directorio operativo existente
+ contratos de fuentes
+ modelo de secciones
+ inventario runtime
```

### Cotizador

No se modificó en este bloque. Consumirá únicamente fuentes y versiones validadas.

### Comparativo

No se modificó en este bloque. Consumirá la capa canónica y conservará la presentación individual asociada.

## 12. Condición de cierre del bloque

Cerrado técnicamente cuando:

- el módulo está actualizado;
- el test existe;
- el workflow lo incluye;
- no se pisó backend protegido;
- la documentación Claude/Academia quedó acumulada.

Pendiente de validación:

- GitHub Actions visible;
- smoke visual real;
- permisos por rol;
- fuentes reales.

## 13. Siguiente acción

Continuar Aseguradoras, sin desviarse a CRM ni reescribir Cotizador/Comparativo:

1. implementar contrato runtime de accesos/cuentas sensibles usando referencia segura;
2. preparar vínculo de carpeta Drive padre y propuesta de matching;
3. diseñar adapter documental PDF/Excel aditivo;
4. después solicitar a Claude la consolidación visual de Aseguradoras.

## 14. Acción manual requerida

No requerida en este bloque.
