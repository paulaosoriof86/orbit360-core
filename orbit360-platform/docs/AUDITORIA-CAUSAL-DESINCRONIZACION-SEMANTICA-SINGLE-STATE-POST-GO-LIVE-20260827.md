# AUDITORÍA CAUSAL — DESINCRONIZACIÓN SEMÁNTICA SINGLE-STATE POST-GO-LIVE

**Fecha:** 2026-08-27  
**Repositorio:** `paulaosoriof86/orbit360-core`  
**Rama obligatoria:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft/open  
**Clasificación primaria:** `PIPELINE_MECHANISM_FAILURE`  
**Clasificación secundaria recurrente:** `VALIDATOR_STALE`  
**Estado:** `ROOT_CAUSE_CONFIRMED_STOP_RETRY_CLASSWIDE_ROOTFIX_REQUIRED`  
**Alcance:** source-only/documental. Cero runtime, secretos, Firestore, deploy, producción o writes de datos.

## 1. Hallazgo rector

La reparación single-state cerró correctamente la **unicidad física del escritor y del transporte de estado**, pero no cerró la **unicidad semántica del estado operativo**.

El ledger `orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json` quedó como único archivo declarado `stateBearing`, pero el estado vivo de módulos, pruebas y siguientes pasos continúa copiado o codificado en varios consumidores estáticos. Por ello cada avance legítimo puede dejar obsoleto un consumidor diferente y generar una nueva apariencia de desincronización.

No son fallas independientes. Son manifestaciones de la misma causa raíz: **estado operativo duplicado semánticamente fuera del ledger único**.

## 2. Evidencia causal reciente

La misma familia ya produjo el patrón que debía impedirse:

1. `CONTROL_PLANE_SELFTEST` run `33109149445`:
   - preservación de producto: PASS;
   - preservación de Aseguradoras: PASS;
   - invariant: FAIL `CLIENTE360_MODULE_LINEAGE_INVALID`;
   - clasificación: `PIPELINE_MECHANISM_FAILURE` + `VALIDATOR_STALE`;
   - cero runtime/product/data/deploy.
2. Después de sincronizar el consumidor del invariant, `CONTROL_PLANE_SELFTEST` run `33116493744` pasó.
3. El producto no cambió entre la prueba causal y la corrección del consumidor; cambió la representación/expectativa del mecanismo.

Esto confirma que el defecto está en la arquitectura de consumidores del estado, no en Cliente 360 como producto.

## 3. Superficies actualmente acopladas a estado vivo

### 3.1 `tools/orbit360-single-state-invariant-v20260827.mjs`

Contiene expectativas exactas de estado que deberían provenir de una única autoridad o ser evidencia append-only, por ejemplo:

- schema/revisión exacta del writer registry;
- estados y etiquetas actuales de Aseguradoras;
- estado y prueba exacta de Cliente 360;
- artifact IDs, `sourceHead`, tree/blob SHA y cadenas de lineage concretas;
- secuencia visual actual;
- comprobaciones de copy literal del workflow.

Un invariant estructural no debe necesitar edición porque cambió una evidencia válida de un módulo.

### 3.2 `.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml`

Duplica assertions `jq` específicas de Aseguradoras/Cliente 360 y vuelve a codificar estados/proofs exactos ya representados en otras fuentes.

### 3.3 `tools/orbit360-certified-product-preservation-v20260827.mjs`

El guard de preservación mezcla protección de paths/hashes de producto con estado vivo de module lineage y aceptación visual. La preservación debe responder a integridad del producto protegido, no convertirse en otra proyección del estado operativo.

### 3.4 `orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json`

Aunque declara `projectionTargets: []` y al ledger como única autoridad mutable, incorpora reglas y valores concretos de lineage/estado de módulos. Es estático físicamente pero state-bearing semánticamente.

### 3.5 `orbit360-platform/docs/orbit360-certified-product-preservation-registry-v20260827.json`

Incluye estado vivo como `liveVisualStatus`, `visualPass`, open deltas, run IDs y proofs actuales. Las nuevas evidencias humanas del 2026-08-27 ya superan algunos de esos valores, demostrando que el registro puede quedar obsoleto sin que cambie el producto preservado.

### 3.6 `orbit360-platform/docs/orbit360-control-plane-canonicality-contract-v20260822.json`

Mantiene `canonicalPlan` apuntando al plan congelado de 2026-08-24, aunque `PLAN-MAESTRO-DEFINITIVO-PRODUCCION-POSTPRODUCCION-ANTI-LOOP-ORBIT360-AYS-20260826.md` declara que supersede operacionalmente los planes de ruta anteriores. También replica metadatos actuales de módulos.

### 3.7 `orbit360-platform/docs/orbit360-control-plane-semantic-contract-v20260824.json`

Codifica estados/proofs actuales de módulos y acciones post-go-live. Un contrato semántico durable debe expresar leyes estables, no snapshot operativo.

### 3.8 `orbit360-platform/docs/orbit360-control-plane-frozen-baseline-v20260826.json`

Permanece identificado como baseline congelado mientras los componentes activos ya migraron a variantes 20260827 y sus hashes cambiaron. Debe ser histórico/superseded o regenerarse después del rootfix classwide; no coexistir como aparente baseline activo.

### 3.9 `orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json`

El orden rector todavía prioriza el plan de 2026-08-24 y no el plan definitivo de 2026-08-26 que lo supersede operacionalmente.

## 4. Contradicción de estado que debe reconciliarse

El ledger vigente registra `CONTROL_PLANE_POST_GO_LIVE_ACCESS_RECOVERY_ANTI_DESYNC_PASS` y `stateBearingFileCount: 1`.

La auditoría confirma que `stateBearingFileCount: 1` es cierto solo en sentido **físico/mutable**, pero no en sentido **semántico**: existen múltiples copias de estado vivo y expectativas exactas fuera del ledger.

Por lo tanto, `ANTI_DESYNC_PASS` no puede interpretarse como cierre classwide total. La reconciliación del ledger debe hacerse por el owner/CAS canónico después del rootfix; no mediante edición manual ad hoc.

## 5. STOP_RETRY obligatorio

Se aplica la regla maestra de causa raíz:

- no ejecutar nuevamente el mismo `CONTROL_PLANE_SELFTEST` esperando descubrir otro consumidor obsoleto;
- no parchear un consumidor individual y volver a probar;
- no tocar producto ni datos mientras la clasificación sea `PIPELINE_MECHANISM_FAILURE / VALIDATOR_STALE`;
- no reabrir F2, go-live técnico, antigua gate Bloque 1 ni autorizaciones históricas;
- no crear otro ledger, reducer, workflow paralelo ni proyección de estado.

## 6. Rootfix classwide requerido

El mecanismo se considerará reparado de manera completa solo cuando cumpla simultáneamente:

1. **Ledger único semántico:** todo estado operativo actual, siguiente acción, aceptación visual, open delta y resultado de ejecución vive solo en el ledger o en evidencia append-only referenciada por él.
2. **Registries estáticos:** writer/product/gate registries contienen únicamente contratos, owners, paths, hashes/identidades estáticas y políticas; no el estado vivo de un módulo.
3. **Invariant estructural:** valida unicidad de authority, ownership, CAS, shape, fail-closed, integridad y ausencia de duplicación; no artifact IDs, run IDs, SHAs de evidencia de módulos ni labels de aceptación actuales.
4. **Workflow genérico:** delega en validadores/owners canónicos y no duplica `jq` específicos de módulos ni copy literal de estados actuales.
5. **Preservation guard puro:** verifica únicamente integridad del producto/candidata/path surface protegido. La aceptación funcional/visual se evalúa fuera del guard.
6. **Canonicality/semantic contracts estables:** contienen reglas invariantes y punteros canónicos; no snapshots operativos.
7. **Baseline único renovado:** el baseline 20260826 queda explícitamente histórico/superseded y se genera un único `CONTROL_PLANE_FROZEN_BASELINE` después del rootfix, con hashes de los componentes activos.
8. **Índice documental sincronizado:** el plan definitivo 20260826 es la ruta operativa vigente; documentos anteriores quedan históricos.
9. **Prueba anti-stale:** cambiar de forma controlada una evidencia de módulo dentro del ledger/evidence debe NO requerir editar invariant, workflow, registries estáticos ni contratos semánticos.
10. **Un solo cierre:** después del rootfix se ejecuta una única validación source-only classwide. Si falla por la misma familia, se mantiene STOP_RETRY y se diagnostica sin otra capa.

## 7. Evidencia funcional post-go-live preservada y separada

Los hallazgos humanos actuales NO se convierten en otro motivo para alterar el control-plane:

- `LOGIN_LATENCY_OPEN`: ingreso humano funciona pero tarda demasiado; debe medirse `submit → auth → membership → store/snapshots → router → shell utilizable`.
- `INSURER_CREDENTIAL_REVEAL_OPEN`: la UI real muestra contraseña oculta y `Vinculación segura pendiente`; falta materializar el revelado temporal autorizado. No reimportar Aseguradoras.
- `CLIENT360_LIST_EMPTY_WITH_DATA_OPEN`: KPIs muestran datos, pero el listado queda `0 de 0`; además hay señales de divergencia entre source certificado y runtime servido. No reimportar Clientes.

Estos tres defectos permanecen en cola y se retomarán inmediatamente después de cerrar el rootfix del mecanismo. No se avanza a Pólizas mientras estos tres criterios visibles sigan fallando.

## 8. Carriles

- **A — frontend/UX/Academia:** producto congelado mientras se corrige el mecanismo; evidencia visual humana preservada como aceptación fallida, no como cambio de lineage.
- **B — backend/seguridad/gates:** activo exclusivamente para rootfix classwide single-state semántico.
- **C — datos reales/migración:** congelado; cero reimportación o escritura para resolver los defectos actuales.

## 9. Impacto Academia

Actualizar el patrón reusable de Academia para enseñar explícitamente:

- diferencia entre single-writer físico y single-state semántico;
- por qué un `VALIDATOR_STALE` repetido es señal de duplicación de autoridad;
- separación entre preservación de producto, aceptación funcional y estado operativo;
- regla `STOP_RETRY` y rootfix classwide;
- evidencia humana post-go-live como insumo funcional, no como razón para reabrir gates históricos.

## 10. Siguiente acción exacta

`IMPLEMENT_SEMANTIC_SINGLE_STATE_CLASSWIDE_ROOTFIX_SOURCE_ONLY`

Secuencia cerrada:

1. normalizar contratos/registries/guards/invariant/workflow sin tocar producto;
2. marcar/superseder baseline e índice documental obsoletos;
3. reconciliar el ledger únicamente mediante owner/CAS canónico;
4. ejecutar una sola validación source-only classwide;
5. sellar nuevo baseline si PASS;
6. reanudar diagnóstico funcional productivo de login, Aseguradoras y Cliente 360.

No se autoriza desde este documento runtime, deploy, producción, secretos, Firestore, main ni merge.
