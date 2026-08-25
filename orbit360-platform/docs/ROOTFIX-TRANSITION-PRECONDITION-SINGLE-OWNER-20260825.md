# Rootfix — precondición de transición con owner único — 2026-08-25

## Incidente evitado antes de ejecución

Tras sellar el run F2 `32887741144` como `PIPELINE_MECHANISM_FAILURE`, el owner canónico ya admitía `CONTROL_PLANE_REGRESSION_REOPEN` desde `F2_TERMINAL_RECONCILED_NO_REPLAY`, pero el precheck del workflow seguía admitiendo únicamente el estado cerrado pre-F2.

Clasificación: `VALIDATOR_STALE` dentro de `PIPELINE_MECHANISM_FAILURE`.

## Causa raíz

La precondición de estado de `CONTROL_PLANE_REGRESSION_REOPEN` estaba duplicada en dos superficies ejecutables: workflow y owner. La evolución del owner no obligaba a actualizar el precheck del workflow, por lo que ambas superficies podían divergir aunque compartieran el mismo transition id.

## Rootfix definitivo

1. `tools/orbit360-control-plane-transition-precondition-owner-v20260825.mjs` valida la precondición ejecutando el owner canónico real en un worktree scratch desechable.
2. El workflow no interpreta localmente los estados permitidos para `CONTROL_PLANE_REGRESSION_REOPEN`; invoca ese precondition owner y exige `CONTROL_PLANE_REGRESSION_REOPEN_PRECONDITION_PASS`.
3. La transición real se ejecuta inmediatamente después mediante el mismo owner canónico; no existe una segunda tabla de estados permitidos.
4. El precondition owner garantiza cleanup del worktree tanto en PASS como en FAIL; los errores se emiten como JSON fail-closed solo después de intentar la limpieza.
5. `tools/orbit360-workflow-operational-surface-audit-v20260820.mjs` rechaza cualquier reintroducción de predicados de estado duplicados en el bloque de regresión.
6. El mismo auditor rechaza `2>&1` en invocaciones `--publish-validated` que alimenten superficies machine-readable.
7. Macro3, semantic contract y writer registry declaran y validan el mismo owner de precondición, el mismo publisher y el mismo workflow.
8. Macro3 ejecuta conductualmente el precondition owner cuando el ledger vivo está en un F2 terminal de mecanismo; el workflow vuelve a ejecutarlo inmediatamente antes de la transición real. La recuperación no depende de una comprobación textual.
9. El contrato de publicación machine-readable del rootfix anterior permanece obligatorio: stdout JSON único para `PUBLISH_VALIDATED`; stderr queda fuera del contrato.

## Alcance congelado para bootstrap

El delta contra la rama canónica previa contiene exclusivamente siete superficies de control-plane/documentación: workflow canónico, este documento, semantic contract, writer registry, Macro3, workflow audit y transition precondition owner. No contiene candidata, módulos de producto, datos, Auth funcional, Firestore, provider ni runtime.

La auditoría previa al bootstrap confirmó avance lineal sin divergencia (`ahead`, `behind:0`) y la rama canónica permaneció inmutable durante la preparación. No se ejecutó runtime para validar este rootfix.

No modifica candidata `9504702901`, producto, datos, Auth funcional, Firestore, provider, navegador, deploy, producción, main ni merge.

## Gate de salida

No se solicita ni consume una nueva autorización F2 hasta completar de forma source-only:

`REGRESSION_REOPEN -> CONTROL_PLANE_SELFTEST -> durable handshake -> CONTROL_PLANE_HARDENING_CLOSE`.

Cada etapa se ejecuta una sola vez. Cualquier fallo vuelve a STOP_RETRY y se diagnostica sin rerun.

## Evidencia requerida para declarar cierre

- `REGRESSION_REOPEN` debe pasar desde el F2 terminal sellado usando la simulación del owner canónico.
- `CONTROL_PLANE_SELFTEST` debe pasar con Macro3, workflow audit, publication CLI probe, exact F2 source path, lifecycle class-wide, CAS, STOP_RETRY, register read-only y router nativo.
- Debe publicarse handshake durable del mismo run.
- `CONTROL_PLANE_HARDENING_CLOSE` debe volver a ejecutar el selftest y cerrar con autorización/request/runtime inertes y progreso 75.
- Solo entonces se prepara una identidad F2 nueva; la autorización consumida del run `32887741144` no puede reutilizarse.

## Carriles

- A frontend/UX/Academia: congelado, sin cambios de producto.
- B backend/seguridad/gates: rootfix activo.
- C datos reales/migración: congelado, sin cambios.

Clasificación Claude: `BACKEND_PROTEGIDO_NO_CLAUDE`.
