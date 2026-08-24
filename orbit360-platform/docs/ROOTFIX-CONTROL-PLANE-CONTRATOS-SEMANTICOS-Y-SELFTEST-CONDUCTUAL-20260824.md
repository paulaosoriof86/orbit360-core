# ROOTFIX CONTROL-PLANE — CONTRATOS SEMÁNTICOS Y SELFTEST CONDUCTUAL — 2026-08-24

## Estado

`SOURCE_ONLY_ROOTFIX_IMPLEMENTED_AWAITING_CANONICAL_ACTIONS_VALIDATION`

No constituye PASS de Iteración 1. El cierre solo puede ocurrir después de una ejecución real del workflow canónico que produzca selftest y handshake del mismo run y después de que el owner de cierre vuelva a validar conductualmente el contrato completo antes de mutar el ledger.

## Clasificación

- Incidente estructural: `PIPELINE_MECHANISM_FAILURE`.
- Fallo del selftest run `32789328755`: `VALIDATOR_STALE`.
- Producto/candidata: congelados; no hay nueva evidencia que invalide artifact `9504702901`.
- Carril A: sin cambios de producto.
- Carril B: único carril intervenido.
- Carril C: congelado; cero reimportación.

## Causa raíz ampliada

La reparación previa cerró correctamente la clase `TRANSIENT_EVIDENCE_CLEANUP_PATH_SPECIFIC_NOT_CLASS_WIDE`, pero la auditoría de confiabilidad previa a avanzar detectó que persistía otra familia sistémica:

1. validators que intentaban demostrar comportamiento mediante `includes`, regex o cadenas literales del código fuente;
2. selftest amarrado al artifact/source de una candidata concreta;
3. cobertura del guard de source-rewrite definida mediante una lista manual incompleta;
4. ausencia de ejecución conductual aislada de la secuencia owner → autorización → request → attempt accept → pre-provider gate → terminal reducer;
5. reglas negativas escritas pero no necesariamente ejercitadas;
6. riesgo de que el handshake y el owner de cierre transportaran/verificaran menos propiedades que las que realmente prueba el selftest.

Esto viola el principio rector R2 del Plan Maestro 20260824: los validators no pueden quedar ligados a forma/texto, IDs históricos o datos de una candidata.

## Reparación

### 1. Contrato semántico machine-readable

Se incorpora `orbit360-control-plane-semantic-contract-v20260824.json` como contrato versionado de capacidades, componentes activos, lifecycle, invariantes de workflow y requisitos de selftest. La candidata y las revisiones se derivan del ledger/intent; no se codifican dentro del selftest.

### 2. Macro-3 semántico

`orbit360-macro3-mechanism-preflight-v20260823.mjs` deja de inspeccionar expresiones internas del owner/delegated owner/gate/register. Valida el contrato machine-readable y ejecuta controles reales: workflow audit, source-rewrite guard y lifecycle.

### 3. Guard por alcance contractual

`orbit360-control-plane-no-source-rewrite-guard-v20260824.mjs` obtiene su universo de componentes activos del contrato semántico. La cobertura ya no depende de una lista local que pueda quedar obsoleta silenciosamente.

### 4. Workflow audit revision-agnostic

`orbit360-workflow-operational-surface-audit-v20260820.mjs` rechaza cualquier hardcode operativo de revision, candidata o identidad y conserva el uso permitido de IDs técnicos de steps para verificar `gate → provider`.

### 5. Selftest conductual aislado

`orbit360-control-plane-selftest-v20260824.mjs` debe ejecutar en un worktree temporal aislado, sin provider/secrets/browser:

- candidata dinámica desde ledger;
- Macro-3 semántico;
- F2 source precheck real;
- lifecycle pre-auth por clase;
- filename futuro/desconocido;
- lifecycle pre-terminal preservando solo terminal actual;
- readback del HEAD remoto;
- cierre de control-plane en scratch;
- idempotencia/projection no muta ledger;
- persistencia de autorización ficticia solo dentro del scratch;
- materialización de request ficticio solo dentro del scratch;
- accept ficticio solo dentro del scratch;
- segundo accept → `STOP_RETRY`;
- superficie de publicación sin evidencia transitoria;
- gate real pre-provider con capacidades esperadas;
- reducer terminal FAIL y limpieza de auth/request/replay;
- prueba negativa provider sin gate;
- prueba negativa candidata hardcodeada;
- prueba negativa revisión operacional hardcodeada.

Nada de lo que ocurre en el scratch modifica ledger canónico, autorización real, provider o datos.

### 6. Owner de cierre como segundo verificador independiente

El handshake durable conserva la identidad causal del run canónico. No se usa como sustituto de las pruebas completas.

En un cierre canónico real, `tools/orbit360-continuity-transition-owner-v20260824.mjs` ejecuta nuevamente el selftest conductual completo y exige todas sus propiedades críticas antes de cambiar el ledger de `CONTROL_PLANE_REGRESSION_OPEN_STOP_RETRY` a estado cerrado. De esta forma, una lista incompleta de campos en el YAML o en el handshake no puede producir un falso cierre.

La única excepción es el handshake sintético generado dentro del worktree del propio selftest, identificado simultáneamente por `technicalPullRequest:0` y ruta `__selftest-handshake-*`. Esa excepción no es aceptable para un cierre canónico real y evita recursión infinita durante la simulación.

## Gate de confiabilidad para declarar Iteración 1 cerrada

Se prohíbe cerrar Iteración 1 solamente porque desaparezca el error anterior. El selftest canónico y la revalidación independiente del owner deben demostrar simultáneamente:

- `candidateBindingDynamic:true`;
- `semanticPreflightPass:true`;
- `sourceShapeValidationUsed:false`;
- `exactF2SourcePathExecuted:true`;
- `classWidePreAuthEvidenceLifecyclePass:true`;
- `classWidePreTerminalEvidenceLifecyclePass:true`;
- `arbitraryFutureFilenameCleanupPass:true`;
- `scratchBehavioralTransitionsPass:true`;
- `preProviderGatePathPass:true`;
- `projectionImmutabilityPass:true`;
- `remoteCASReadbackPass:true`;
- `secondAttemptStopRetryPass:true`;
- `workflowProviderUngatedNegativePass:true`;
- `workflowCandidateHardcodeNegativePass:true`;
- `workflowOperationalRevisionHardcodeNegativePass:true`;
- `negativeRegressionSuitePass:true`;
- autorización/request/runtime/browser/secrets/Firestore reales en false y writes en 0.

El mismo workflow canónico debe producir y publicar el handshake durable del mismo run. Solo ese handshake puede alimentar `CONTROL_PLANE_HARDENING_CLOSE`, y el owner vuelve a ejecutar el contrato conductual antes de cerrar.

## Efectos y límites

- No se toca producto.
- No se toca candidata.
- No se reimportan datos.
- No se accede a secrets/Firestore/browser.
- No se despliega.
- No se toca producción ni main.
- No se autoriza F2.
- Progreso permanece 75%.

## Academia

Actualizar el patrón reusable para enseñar:

- diferencia entre validación por texto y contrato semántico;
- por qué un validator puede volverse stale aunque el producto esté bien;
- bindings dinámicos de candidata/revisión;
- lifecycle de evidencias por clase;
- scratch behavioral testing antes de provider;
- gates negativos obligatorios;
- handshake como identidad causal, no como sustituto del comportamiento;
- owner de cierre con revalidación independiente;
- `STOP_RETRY` como propiedad ejecutada, no solo documentada.

## Claude

`BACKEND_PROTEGIDO_NO_CLAUDE`.

No enviar este bloque a Claude: pertenece al control-plane/backend protegido.

## Siguiente acción exacta

`AUDIT_FAST_FORWARD_ROOTFIX → BOOTSTRAP_SOURCE_ONLY_IF_CLEAN → ONE_CANONICAL_CONTROL_PLANE_SELFTEST → SAME_RUN_HANDSHAKE → OWNER_REVALIDATES_FULL_BEHAVIOR → CONTROL_PLANE_HARDENING_CLOSE`

Si el selftest o la revalidación independiente del owner fallan, no se reintenta automáticamente y no se abre F2. Se clasifica la causa y la Iteración 1 permanece abierta.
