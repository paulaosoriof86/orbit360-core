# Rootfix — precondición de transición con owner único — 2026-08-25

## Incidente evitado antes de ejecución

Tras sellar el run F2 `32887741144` como `PIPELINE_MECHANISM_FAILURE`, el owner canónico ya admitía `CONTROL_PLANE_REGRESSION_REOPEN` desde `F2_TERMINAL_RECONCILED_NO_REPLAY`, pero el precheck del workflow seguía admitiendo únicamente `CONTROL_PLANE_DEFINITIVE_CAUSAL_PASS_AWAITING_F2_AUTHORIZATION / CONTROL_PLANE_DEFINITIVE_CAUSAL_PASS`.

Clasificación: `VALIDATOR_STALE` dentro de `PIPELINE_MECHANISM_FAILURE`.

## Causa raíz

La precondición de estado de `CONTROL_PLANE_REGRESSION_REOPEN` estaba duplicada en dos superficies ejecutables: workflow y owner. La evolución del owner no obligaba a actualizar el precheck del workflow, por lo que ambas superficies podían divergir aunque compartieran el mismo transition id.

## Rootfix definitivo

1. `tools/orbit360-continuity-transition-owner-v20260824.mjs` se convierte también en owner semántico de precondición mediante `--validate-only`.
2. El workflow no interpreta localmente los estados permitidos para `CONTROL_PLANE_REGRESSION_REOPEN`; invoca al owner con `--validate-only` y exige `CONTROL_PLANE_REGRESSION_REOPEN_PRECONDITION_PASS`.
3. La misma validación se reutiliza inmediatamente después para ejecutar la transición real; no existe una segunda tabla de estados permitidos.
4. El control-plane selftest simula y valida la ruta `sealed F2 mechanism failure -> validate-only -> regression reopen`, además del STOP_RETRY y de las transiciones ya cubiertas.
5. Semantic contract, writer registry y Macro3 declaran y validan que las precondiciones críticas de transición tienen owner único y que el workflow no mantiene una copia semántica paralela.
6. El contrato de publicación machine-readable del rootfix anterior permanece obligatorio: stdout JSON único para `PUBLISH_VALIDATED`, stderr fuera del contrato y prohibición de `2>&1` hacia archivos JSON.

## Alcance

Solo control-plane, documentación y validadores. No modifica candidata `9504702901`, producto, datos, Auth funcional, Firestore, provider, navegador, deploy, producción, main ni merge.

## Gate de salida

No se solicita ni consume una nueva autorización F2 hasta completar de forma source-only:

`REGRESSION_REOPEN -> CONTROL_PLANE_SELFTEST -> durable handshake -> CONTROL_PLANE_HARDENING_CLOSE`.

Cualquier fallo vuelve a STOP_RETRY y se diagnostica sin rerun.

## Carriles

- A frontend/UX/Academia: congelado, sin cambios de producto.
- B backend/seguridad/gates: rootfix activo.
- C datos reales/migración: congelado, sin cambios.

Clasificación Claude: `BACKEND_PROTEGIDO_NO_CLAUDE`.
