# Orbit 360 A&S — R4S6 Cliente 360 consecutive-read rootfix · SOURCE PASS

Fecha: 2026-08-17  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Público sin cambios: R4S6 exacta source `395f15d9c2e1fac2949763947834b88a9b521207`

## 1. Corte causal

El diagnóstico previo era correcto pero incompleto. La familia completa confirmada es:

`FUNCTIONAL_DEFECT / CLIENT_PROJECTION_FULL_CLIENT_NATIVE_CLONE_REPEATS_ACROSS_ROLE_SCOPE_CLIENTE360_BATCH_AND_VISUAL_ENHANCER`

El circuito real tiene tres consumidores consecutivos de la proyección completa de clientes:
1. activación/scope de Dirección: `Orbit.store.all('clientes')` antes de `Orbit.access.filter`;
2. Cliente 360: `withReadBatch` mediante alias `batchRunner`;
3. enhancer visual de Cliente 360: nueva llamada `Orbit.store.all('clientes')` al estabilizar ruta/DOM.

En R4S6, `projectedAll('clientes')` y la rama `clientes` de `withReadBatch` podían volver a ejecutar `nativeAll('clientes')` + proyección completa. El contexto de segmentación ya estaba cacheado, pero la colección proyectada de clientes no.

El owner causal permanece exclusivamente en:
`orbit360-platform/core/client-insurer-visual-contract-v20260720.js`.

No existe evidencia para modificar `modules/cliente360.js` ni el store protegido.

## 2. Gate de reproducción antes del producto

Gate source-only:
`tools/orbit360-r4s6-client-projection-consecutive-read-rootfix-gate-v20260817.mjs`.

Fixture representativo:
- 430 clientes con payload anidado pesado;
- 1,375 pólizas;
- 1,900 cobros;
- 900 comisiones;
- 7 asesores;
- secuencia role-scope → Cliente360 batch → enhancer visual.

Baseline reproducido:
- `clientes` nativeAll calls: 5;
- filas cliente clonadas: 2,150;
- bytes cliente serializados: 62,312,910;
- role/scoped/batch/enhancer: 430/430/430/430;
- triple consecutive read reproduced: true.

## 3. Incidentes metodológicos intermedios

### 3.1 VALIDATOR_STALE
Run `32024964086`, job `95372344895`.

El producto permaneció congelado. El gate buscaba literalmente `withReadBatch(...)`, pero Cliente 360 usa el alias `batchRunner(...)`. La reproducción causal sí había ocurrido; falló únicamente la comprobación estática.

Clasificación: `VALIDATOR_STALE`.

Evidence artifact `9286731473`.

### 3.2 PIPELINE_MECHANISM_FAILURE
Run `32025041917`, job `95372583305`.

La causa raíz ya pasó y la candidata se generó sintácticamente, pero la guardia de diff contó el `preflight-sanitizado.json` trackeado que el gate canónico actualiza como evidencia. La candidata fue efímera y no se publicó ni se commiteó.

Clasificación: `PIPELINE_MECHANISM_FAILURE`.

Evidence artifact `9286760913`.

La guardia se corrigió para separar evidencia trackeada de deltas de fuente, sin cambiar la lógica del rootfix.

## 4. Rootfix source-only certificado

Run final `32025202898`, job `95373065457` → SUCCESS.

Commit productivo/source resultante:
`ce9792e3e4e37b298d2eda6f65983c683d66a3a3`.

Commit contiene exactamente:
1. `orbit360-platform/core/client-insurer-visual-contract-v20260720.js`;
2. `tools/orbit360-r4s6-client-projection-consecutive-read-rootfix-gate-v20260817.mjs`.

Owner antes:
`5493a18acba2d2055c301bf576c46050959ddb6b2f74e7ca4293ee77f815604f`.

Owner candidato después:
`573a45da2f7dae3803e8dff86ff651ba58f5be507cf85b04a80863ac15bb4390`.

### Implementación

- cache/snapshot proyectada de clientes acotada a 5 s;
- una construcción completa y reutilización entre consumidores consecutivos;
- copia superficial defensiva por consumidor y copia de `etiquetas` para preservar aislamiento esperado;
- invalidación explícita ante `clientes`;
- invalidación de contexto + clientes ante `polizas`, `cobros`, `*`;
- invalidación ante cambio de threshold;
- métricas de builds/hits/invalidations/cachedRows/age;
- API pública de `Orbit.store` preservada;
- store protegido sin cambios.

## 5. Evidencia source-only final

Estado:
`R4S6_CLIENT_PROJECTION_CONSECUTIVE_READ_ROOTFIX_SOURCE_PASS`.

- semanticEqual: true;
- countsEqual: true;
- topLevelIsolation: true;
- role/scoped/batch/enhancer: 430/430/430/430.

### Baseline → candidata

- native client calls: 5 → 1 = **80% reducción**;
- client rows cloned: 2,150 → 430 = **80% reducción**;
- client serialized bytes: 62,312,910 → 12,462,582 = **80% reducción**;
- synthetic elapsed: 201.24 ms → 73.47 ms = **63.49% reducción**;
- clientProjection builds: 1;
- clientProjection hits: 4;
- cached rows: 430.

Invalidación PASS:
- `clientes`: rebuild 1→2;
- `polizas`: 2→3;
- `cobros`: 3→4;
- `*`: 4→5;
- threshold: 5→6.

Gate canónico volvió a pasar después del proof.

Evidence artifact:
- ID `9286817944`;
- digest `e2026fcf6f7bee07c257dbeaba10f080e1d32a72df6e41d40c9ace0cd9b87cf1`.

## 6. Alcance respetado

- `modules/cliente360.js`: sin cambios;
- store protegido: sin cambios;
- Auth: sin cambios;
- datos/Rules: sin cambios;
- browser/runtime/matriz: no ejecutados;
- publicación: no ejecutada;
- main/merge: no ejecutados;
- Firestore/Auth/operational writes: 0/0/0.

## 7. Estado y siguiente frontera

La causa raíz source-only queda cerrada con evidencia representativa. Esto **no certifica todavía runtime** ni modifica la R4S6 pública.

Siguiente frontera: construir/certificar una sucesora mínima de la R4S6 pública exacta incorporando únicamente el nuevo owner SHA `573a45da...`, comprobar lineage/byte identity y static package. Solo después, con autorización separada, publicar esa sucesora y posteriormente ejecutar una única matriz runtime read-only para cerrar Gate 3.

No corresponde ejecutar otro runtime sobre la R4S6 pública actual porque no contiene este rootfix.
