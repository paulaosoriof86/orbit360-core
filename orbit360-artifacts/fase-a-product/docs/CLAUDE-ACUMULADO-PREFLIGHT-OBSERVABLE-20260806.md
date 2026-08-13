# Claude acumulado — patrón de preflight observable

Fecha: 2026-08-06  
Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrón reusable

Todo wrapper de gate debe ser fail-closed y observable.

No usar aserciones desnudas bajo `set -e` cuando su fallo pueda consumir una autorización o impedir determinar la causa.

## Contrato mínimo

Cada fallo previo al router debe persistir:

```text
status: STOP_PREFLIGHT_WRAPPER
classification: PIPELINE_MECHANISM_FAILURE
failedCheckIds: [CHECK_EXACTO]
wrapperCheckpoint: CHECK_EXACTO
secretAccess: false
runtimeExecuted: false
browserExecuted: false
deployExecuted: false
```

## Router canónico

El wrapper debe:

1. capturar el exit code;
2. exigir evidencia durable;
3. copiar esa evidencia a la ruta específica del gate;
4. preservar los checks internos;
5. agregar `CANONICAL_ROUTER_NONZERO` cuando el router no retorna cero;
6. validar explícitamente el payload de `GO_GATE_CONTRACT` antes de publicar `go=true`.

## Checks reutilizables

```text
BRANCH_MISMATCH
RUN_ATTEMPT_NOT_ONE
REQUEST_FILE_MISSING
REQUEST_COMMIT_UNRESOLVED
REQUEST_PARENT_UNRESOLVED
REQUEST_NOT_IN_HEAD_TREE
REQUEST_COMMIT_NOT_SINGLE_FILE
REQUEST_COMMIT_WRONG_FILE
REQUEST_CONTRACT_INVALID
CANONICAL_ROUTER_EVIDENCE_MISSING
CANONICAL_EVIDENCE_COPY_FAILED
CANONICAL_ROUTER_NONZERO
CANONICAL_GO_EVIDENCE_INVALID
```

## Prueba obligatoria

La prueba source-only debe cubrir:

- fallo temprano observable;
- fallo del router con check interno preservado;
- camino positivo con `GO_GATE_CONTRACT`;
- ausencia total de secretos, datos, runtime, navegador y deploy.

Referencia:

```text
tools/orbit360-test-observable-preflight-wrapper-v20260806.mjs
orbit360-platform/runtime-gate-crm-v20260716/observable-preflight-wrapper-source-test-sanitized-v20260806.json
PASS_OBSERVABLE_PREFLIGHT_WRAPPER_SOURCE · 18/18
```

## Límites para Claude

Claude puede reutilizar:

- arquitectura del wrapper;
- nombres genéricos de checkpoints;
- patrón de captura de exit code;
- prueba negativa/positiva;
- evidencia sanitizada.

Claude no debe recibir ni modificar:

- secretos o credenciales;
- datos reales del tenant;
- requests vigentes o consumidos;
- decisiones humanas de autorización;
- adaptadores Firestore protegidos;
- Rules, Auth o configuraciones productivas.

## Regla de control

Un código de salida sin checkpoint no constituye una causa raíz suficiente. Si ocurre, se congela el runtime y se corrige primero la observabilidad del pipeline.
