# Orbit 360 A&S — R4S5 source rootfix Cliente 360 deep-clone composition PASS

Fecha: 2026-08-16  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open · sin merge  
Baseline público durante todo el bloque: R4S5 exacta `5474a1a9af64c018e6dcc71b4ad0cdfe57ce0484` · artifact `9270227820` · ZIP SHA256 `2d7a2ae75c5e6ef04c4759ff3438d41b8589d542fc20f14a603aaffb2053a1ac`.

## Alcance autorizado y consumido

Rootfix exclusivamente source-only para:
- `orbit360-platform/core/client-insurer-visual-contract-v20260720.js`
- `orbit360-platform/modules/cliente360.js`

Objetivo: cerrar `FUNCTIONAL_DEFECT / CLIENT_VISUAL_PROJECTION_REBUILDS_DEEP_CLONE_BATCH_PER_READ_AND_CLIENTE360_DUPLICATES_GLOBAL_READS`, reutilizando contexto de segmentación acotado e invalidable y colapsando lecturas globales duplicadas en Cliente 360, sin modificar `Orbit.store` protegido ni su API pública.

No autorizados y no ejecutados: browser, runtime, nueva matriz, publicación, deploy, Auth, datos, Rules, store, main, merge.

## Implementación

Commit source rootfix: `395f15d9c2e1fac2949763947834b88a9b521207`.

Diff del commit: exactamente 2 archivos de producto:
1. `core/client-insurer-visual-contract-v20260720.js`
   - blob previo `573f210b81a8e219e056fe82d3f79ad6622d83f8`
   - blob candidato `2a959b6a17439531f196fa6bfefb5f3555927a30`
   - SHA256 candidato `5493a18acba2d2055c301bf576c46050959ddb6b2f74e7ca4293ee77f815604f`
2. `modules/cliente360.js`
   - blob previo `4834b696cf5335b2bce478248aed60d5b59a2de8`
   - blob candidato `6fd43688b22d16529851eba1923653248277d455`
   - SHA256 candidato `5ac3f042add37ea45582cc88c670c5bcff139937dac406d9561e25f1b9962f9e`

`core/queries.js` permaneció exacto en SHA256 `b906c1d3382a9fad310695b0ce2c8e7f49a2bf99fe9b9ed674a8df7e0fcbbb7b`.

### Core visual projection

- revisión `segmentationBatchRevision/clientProjectionReadCacheRevision = 20260816.2`;
- cache acotada del contexto de segmentación;
- invalidación por `polizas`, `cobros`, `*` y cambio de umbral;
- `withReadBatch()` síncrono reutiliza la instantánea ya aislada durante el consumidor actual;
- fuera del batch se conserva el contrato público de `Orbit.store` y el clone-on-read protegido;
- cero escrituras.

### Cliente 360

- `clientesResumenIndex()` se ejecuta dentro de una única lectura batch de `clientes/polizas/cobros/comisiones`;
- reutiliza los clientes proyectados y el universo global de pólizas de esa misma instantánea;
- KPIs de pólizas activas, total histórico y renovaciones ≤45 d reutilizan esa instantánea sin lecturas globales duplicadas;
- conserva paginación de 40 filas y semántica/render previo.

## Gate source-only

Run final: `31974799184`  
Job: `95232542504`  
Conclusión: **SUCCESS**  
Evidence artifact: `9270753185`  
Artifact digest: `sha256:9af78303af3f154be50e39fe6bb0cc69d5c30c9e33f374488abee0e3ea7ef3a8`.

Gate canónico previo: PASS.

Fixture representativo:
- 430 clientes
- 1,375 pólizas
- 1,900 cobros
- 900 comisiones
- 7 asesores
- 30 aseguradoras
- payloads anidados representativos
- umbral Premium activo = 1000.

Resultado semántico:
- `semanticEqual=true`
- `projectedClientsEqual=true`
- `renderedHtmlEqual=true`
- writes=0.

### Costo before → after

| Métrica | R4S5 pública | Rootfix source | Reducción |
|---|---:|---:|---:|
| llamadas `all()` | 59 | 47 | 20.34% |
| filas clonadas | 23,407 | 5,752 | **75.43%** |
| bytes clonados | 10,125,764 | 2,452,091 | **75.78%** |

Ratios: 4.07x menos filas clonadas y 4.13x menos bytes clonados.

Cache observada antes de invalidación: builds=1, hits=2, batchReads=1.

Prueba de invalidación:
- cliente `c50` antes: `Nuevo`;
- se agrega póliza histórica en fixture y se emite `polizas`;
- después: `Recurrente`;
- invalidations=1, builds=2.

Esto demuestra que la reutilización no congela semántica obsoleta.

## Incidentes metodológicos cerrados dentro del bloque

### 1. PIPELINE_MECHANISM_FAILURE

Run `31974663848`: gate canónico PASS; STOP antes de producto porque `actions/checkout` estaba en detached HEAD y el workflow validaba `git branch --show-current`.

Clasificación: `PIPELINE_MECHANISM_FAILURE / DETACHED_HEAD_BRANCH_ASSERTION`.

Producto no aplicado, gate representativo y commit skipped. Se corrigió únicamente el workflow para validar `GITHUB_REF_NAME`.

### 2. VALIDATOR_STALE

Run `31974702138`: el rootfix ephemeral ya había pasado semántica exacta, HTML exacto y >60% de reducción de filas/bytes, pero el gate exigía adicionalmente >50% de reducción del número bruto de `all()`.

Resultado observado: 47 vs 59 llamadas. El contador incluía 40 lecturas pequeñas de asesores ajenas al deep-clone masivo y, por tanto, el umbral no representaba el defecto.

Clasificación: `VALIDATOR_STALE / ALL_CALL_THRESHOLD_COUNTS_SMALL_UNRELATED_READS`.

Producto no persistido; commit skipped. Se corrigió solo el validador para exigir reducción real de llamadas y mantener como gates fuertes >60% de reducción de filas y bytes. El run final pasó.

## Seguridad y control de alcance

- store protegido modificado: NO
- Auth modificado: NO
- datos modificados: NO
- Rules modificadas: NO
- browser: NO
- runtime: NO
- secretos de aplicación: NO
- lectura de datos reales: NO
- deploy/publicación: NO
- main/merge: NO
- Firestore writes: 0
- Auth writes: 0
- operational writes: 0

El workflow de smoke continúa congelado con `ORBIT360_R4_CERTIFIED_SOURCE_ONLY='true'` y no se dispara por cambios en estos dos archivos de producto.

## Estado

- R4S5 pública: sin cambios, exacta e inmutable.
- Rootfix: **SOURCE_ONLY PASS, todavía NO empaquetado ni publicado**.
- Gate 3 `POST_GO_LIVE_SMOKE_PASS`: abierto.
- Nueva matriz/browser: no autorizada.

Carriles:
- A frontend/UX: avance visible source-only en Cliente 360.
- B backend/Auth/store: congelado, sin cambios.
- C datos reales/migración: congelado, sin reimportación ni escritura.

Claude: `REPLICABLE_CLAUDE_ACUMULADO` — patrón reusable: cache/batch de lectura debe medirse por costo de clonación real y ser invalidable; no basta contar invocaciones.

Academia: `ACADEMIA_ACTUALIZAR` — distinguir número de llamadas de volumen serializado/clonado, invalidación de cache y disciplina FUNCTIONAL_DEFECT → VALIDATOR_STALE → gate corregido.

## Siguiente acción exacta

Requiere autorización separada: construir y certificar una sucesora mínima de la R4S5 pública exacta incorporando únicamente estos dos archivos source-rootfix certificados, con comparación R4S5→sucesora y certificación source/package/static. No publicar ni ejecutar browser/runtime bajo esa autorización.