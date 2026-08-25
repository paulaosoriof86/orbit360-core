# ROOTFIX — WORKFLOW TOPOLOGY SINGLE SEMANTIC OWNER — 2026-08-24

## Estado

`SOURCE_ONLY_ROOTFIX_IMPLEMENTED_AWAITING_CANONICAL_SELFTEST`

No constituye PASS de Iteración 1. Progreso permanece 75%; F2, secrets, provider, browser, Firestore, deploy, producción, main y merge permanecen cerrados.

## Incidente

- Run canónico: `32793636764`.
- Job: `97640283272`.
- Etapa: `CONTROL_PLANE_SELFTEST`, scratch pre-provider.
- Resultado: FAIL cerrado antes de handshake y antes de cualquier ejecución F2 real.
- Campos que sí pasaron: candidata dinámica, preflight semántico, lifecycle por clase, CAS, projection immutability, STOP_RETRY, pruebas negativas, superficie canónica, runtimeRunId end-to-end, source rewrite negative test y `runtimeRegisterReadOnlyPass:true`.
- Campos fallidos: `routerNativeRuntimeContractPass:false`, `preProviderGatePathPass:false`.

## Clasificación

`VALIDATOR_STALE` — parser duplicado defectuoso en el gate semántico.

No es `FUNCTIONAL_DEFECT`, no invalida la candidata y no implica defecto del provider/runtime.

## Causa raíz exacta

`tools/orbit360-f2-gate-semantic-v20260824.mjs` tenía un parser local `stepBlock()` separado del auditor canónico de workflow.

Después de encontrar la línea real `      - id: provider`, ejecutaba conceptualmente:

`tail.slice(1).search(/^\s*-\s+(?:id:|name:|uses:)/m)`

Quitar un solo carácter no elimina la línea actual porque conserva su indentación. La búsqueda vuelve a encontrar el mismo `- id: provider` en posición 0 y el supuesto bloque del provider termina siendo un solo carácter de espacio.

Consecuencia: el gate emitía falsamente `SECURITY_FAILURE:F2_PROVIDER_NOT_DEPENDENT_ON_GATE`, aunque el workflow real contiene:

`if: steps.gate.outcome == 'success' && steps.dependencies.outcome == 'success'`

El auditor canónico `tools/orbit360-workflow-operational-surface-audit-v20260820.mjs` había validado correctamente esa dependencia en el mismo run. Esto demostró un split-brain de validadores: dos parsers distintos intentando ser autoridad sobre la misma topología.

## Reparación definitiva

### 1. Un único owner semántico de topología

`tools/orbit360-workflow-operational-surface-audit-v20260820.mjs` pasa a ser la única autoridad para:

- workflow único;
- orden técnico `gate → provider`;
- dependencia explícita de provider respecto del gate;
- no chaining;
- no dispatch paralelo;
- no hardcode de candidata, identidad o revisión operacional.

El gate F2 deja de parsear steps por su cuenta.

### 2. Snapshot ejecutado ligado al canónico

El auditor acepta `ORBIT360_WORKFLOW_SOURCE_FILE` y, cuando existe, exige igualdad byte a byte entre el snapshot ejecutado y el workflow canónico del HEAD vivo.

Un snapshot distinto produce `EXECUTING_WORKFLOW_SNAPSHOT_DRIFT` y FAIL cerrado.

### 3. Gate consume al owner, no duplica lógica

`tools/orbit360-f2-gate-semantic-v20260824.mjs`:

- obtiene el snapshot ejecutado;
- exige que sea idéntico al canónico;
- ejecuta el auditor único sobre ese snapshot;
- exige `WORKFLOW_CONTROL_SURFACE_AUDIT_PASS`;
- exige `topologySemanticOwner` correcto;
- solo después puede emitir `nativeRouterRuntimeContract:true` y `GO_GATE_CONTRACT`.

### 4. Contrato y registry sincronizados

El contrato semántico y writer registry declaran:

- `workflowTopologySemanticOwner = tools/orbit360-workflow-operational-surface-audit-v20260820.mjs`;
- duplicate workflow topology parsers forbidden;
- executing workflow snapshot must match canonical;
- runtime register read-only;
- runtime router F2 v3 nativo;
- source rewrite transitorio prohibido.

## Prueba causal previa al próximo run

El defecto fue reproducido determinísticamente con la línea real del provider: el parser anterior devolvía un bloque de un solo espacio. No se requiere otro run para conocer la causa.

La reparación no cambia el YAML ni debilita la condición de seguridad. Elimina el parser incorrecto y reutiliza la autoridad que ya había demostrado el comportamiento correcto.

## Gate para próxima validación

Solo procede una nueva ejecución `CONTROL_PLANE_SELFTEST` después de:

1. diff source-only auditado;
2. fast-forward limpio, sin producto/datos/candidata/workflow;
3. ledger aún 42/36, STOP_RETRY, 75%, sin autorización/request/runtime;
4. un único intent-only PR;
5. un único run, sin rerun automático.

Ese run debe demostrar simultáneamente `runtimeRegisterReadOnlyPass:true`, `routerNativeRuntimeContractPass:true`, `preProviderGatePathPass:true` y todos los demás `selftestRequiredTrueFields`.

Si falla, Iteración 1 permanece abierta y no se solicita F2.

## Carriles

- A frontend/UX/Academia: producto congelado; Academia incorpora single semantic owner, parser drift y validator stale.
- B backend/security/gates: rootfix activo.
- C datos reales: congelado, cero reimportación.

## Claude

`BACKEND_PROTEGIDO_NO_CLAUDE`.
