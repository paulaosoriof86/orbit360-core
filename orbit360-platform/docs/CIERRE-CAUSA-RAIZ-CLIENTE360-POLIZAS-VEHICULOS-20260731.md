# CIERRE DE CAUSA RAÍZ ESTÁTICA — CLIENTE 360 / PÓLIZAS / VEHÍCULOS

Fecha operativa: 2026-07-31  
Tenant: `alianzas-soluciones`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Modo de este bloque: `STATIC_READMODEL_FIX / NO_DEPLOY / NO_DATA_WRITE`

## 1. Disparador real

La revisión humana posterior a Recibos/Cartera 9.1.0 quedó interrumpida por defectos funcionales visibles:

- Cliente 360 mostraba `0/0` pólizas en el listado mientras la ficha del mismo cliente sí encontraba pólizas;
- KPI de prima anual mostraba `NaN`;
- Pólizas y Vehículos exponían varios `undefined`;
- la lectura de una póliza volvió a abrir en modal/drawer aunque la UX previamente aprobada era ficha/pantalla completa;
- Vehículos no exponía acceso suficiente al detalle completo;
- la plataforma podía quedar sin responder durante la revisión;
- responsive seguía incompleto al reducir el viewport.

La revisión visual queda `FAILED/INCOMPLETE`; no se solicita otra revisión humana hasta que exista prueba automática previa.

## 2. Clasificación

### FUNCTIONAL_DEFECT — confirmado

`CLIENT360_LEGACY_FIELD_NAMES_AND_O_N_CLIENT_SUMMARY_AFTER_CANONICAL_MIGRATION`

El frontend legacy consume nombres como `p.prima`, `p.forma`, `v.anio`, `v.placa`, `v.chasis` y `v.motor`, mientras las escrituras canónicas recientes preservan principalmente `primaTotal/primaNeta/formaPago` y `anioModelo/placaNormalizada/chasisFuente/motorFuente`.

El cálculo legacy de `clienteResumen()` recorría colecciones completas por cada cliente y la lista invocaba ese resumen repetidamente, patrón que escala mal al baseline actual de 430 clientes + 1,373 pólizas + 1,032 vehículos + Recibos/Cartera.

### FUNCTIONAL_DEFECT — regresión UX confirmada

`POLICY_READ_VIEW_REGRESSED_FROM_FULLPAGE_TO_DRAWER`

El owner legacy `Cliente 360` conservó una función `verPoliza()` basada en `drawer-back`, de modo que un empalme posterior reactivó la lectura modal.

### DATA_CONTRACT_FAILURE — pendiente de enriquecimiento, no ocultable

La escritura canónica de Pólizas persistió correctamente el núcleo contractual usado para migración, pero no garantiza todavía todos los campos que la ficha operativa puede mostrar: desglose completo de gastos/impuestos, suma asegurada, comisiones, concepto/riesgo u otros detalles según la fuente.

La corrección visual NO inventa esos valores. Cuando un dato no existe en el documento canónico se muestra `Pendiente de completar`. El enriquecimiento de los 1,373 documentos se hará únicamente desde las fuentes ya recibidas, mediante dry-run idempotente y autorización macro única si llega a requerir escritura.

## 3. Corrección reusable aplicada

Archivo owner cargado ya por el runtime:

`modules/policy-receipts-v1199-detail-guard.js`

Versión funcional interna:

`20260731.1 / v1.199c`

Cambios:

1. Proyección visual canónica de Póliza, sin escritura:
   - `primaTotal/primaNeta → prima` para compatibilidad visual;
   - `formaPago/frecuencia/conductoPago → forma/conducto`;
   - aliases seguros para gastos, IVA/impuestos, suma asegurada y comisiones cuando existan.
2. Proyección visual canónica de Vehículo, sin escritura:
   - `placaNormalizada/placaFuente → placa`;
   - `anioModelo → anio`;
   - `chasisFuente → chasis`;
   - `motorFuente → motor`;
   - conserva inciso, concepto, descripción y comentarios cuando existan.
3. `clienteResumen()` pasa a usar índices por cliente y caché invalidable, en lugar de reescanear las colecciones completas por cada fila.
4. Lectura de Póliza usa deep-link dentro de Cliente 360 y renderiza ficha completa en `#host`; deja de usar modal como vista de lectura.
5. Lectura de Vehículo usa deep-link y ficha completa en `#host`.
6. La ficha completa de Póliza muestra, cuando estén disponibles:
   - cliente/asegurado;
   - aseguradora;
   - asesor;
   - número;
   - estado;
   - país/moneda;
   - ramo/subramo/producto/tipo;
   - vigencias y renovación;
   - suma asegurada;
   - concepto/riesgo;
   - prima neta;
   - gastos de expedición;
   - gastos financieros;
   - otros/asistencias;
   - base gravable;
   - IVA/impuestos;
   - prima total;
   - frecuencia, forma de pago y conducto;
   - riesgo/vehículo;
   - recibos y cartera;
   - historial/endosos;
   - estado de calidad de la información.
7. La ficha completa de Vehículo muestra marca, línea/tipo, modelo/año, placa, inciso, uso, chasis/VIN, motor, color, suma asegurada, concepto, descripción y póliza vinculada.
8. `undefined` y `NaN` dejan de ser estados visuales válidos; faltantes honestos se muestran como `Pendiente de completar`.
9. Se agrega contrato responsive básico de las fichas completas para escritorio/tableta/móvil.
10. El owner declara explícitamente `writesStore=false`, `writesBackend=false`, `canonicalVisualAliasesOnly=true`.

## 4. Prueba sintética de causa raíz

Se reprodujo y validó fuera de producción con fixture ficticio:

- alias `primaTotal → prima`: PASS;
- alias `formaPago → forma`: PASS;
- aliases vehículo canónico: PASS;
- resumen indexado: PASS;
- 1 póliza visible como 1/1: PASS;
- ruta de Póliza a pantalla completa: PASS;
- ruta de Vehículo a pantalla completa: PASS;
- render full-page Póliza: PASS;
- cero `undefined`/`NaN` en el fixture: PASS;
- escrituras: 0.

Test versionado:

`tools/orbit360-test-client360-policy-vehicle-readmodel-v1199c-20260731.mjs`

## 5. Lo que NO se hizo

- no Hosting deploy;
- no Rules deploy;
- no Functions/Storage;
- no Firestore data writes;
- no reimportación de Pólizas;
- no reimportación de Vehículos;
- no Cobros;
- no producción/main/merge;
- no se ocultaron faltantes mediante valores inventados.

## 6. Regla mínima de producto — ficha de Póliza

La ficha de Póliza de Orbit 360 no puede limitarse a primas. Como mínimo debe conservar lo útil de la operación actual y la capacidad ya existente en el frontend: identidad contractual, vigencia, estado, aseguradora/cliente/asesor, ramo/producto, riesgo asegurado, vehículo cuando aplique, suma asegurada, condiciones de pago, desglose de prima/impuestos/gastos, recibos/cartera, historial/endosos y calidad de datos. La ausencia de un dato se muestra honestamente y se enruta a enriquecimiento, nunca como `undefined`, `NaN` o un valor inventado.

## 7. Pendiente exacto

Queda un único subbloque técnico antes de otra visual humana:

1. preparar el dry-run de enriquecimiento de Pólizas desde las fuentes ya recibidas para determinar qué campos detallados existen realmente y cuáles permanecen ausentes;
2. perfilar en runtime, sin escritura, que Cliente 360 ya no entra en bloqueo con el resumen indexado;
3. ejecutar una única validación automática integral que exija: conteos coherentes lista/ficha, full-page Póliza/Vehículo, cero `NaN/undefined`, navegación y responsive básico.

Solo si el enriquecimiento requiere modificar los 1,373 documentos se preparará un request macro único después del dry-run. No se solicita autorización en este corte.

## 8. Impacto Claude / Academia

- `REPLICABLE_CLAUDE_ACUMULADO`: read-model canónico visual, navegación full-page, detalle mínimo de Póliza/Vehículo, rendimiento indexado, responsive y guard anti-regresión.
- `ACADEMIA_ACTUALIZAR`: diferencia entre contrato canónico de persistencia y proyección visual; faltantes honestos; navegación contextual; prevención de regresiones.
- `BACKEND_PROTEGIDO_NO_CLAUDE`: escrituras reales, workflows, reglas, credenciales, fuentes privadas y enriquecimiento A&S.
