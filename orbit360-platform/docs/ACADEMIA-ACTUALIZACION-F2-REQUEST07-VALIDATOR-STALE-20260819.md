# Academia Orbit 360 — actualización F2 Request07 / VALIDATOR_STALE

Fecha: 2026-08-19

## Objetivo didáctico

Distinguir correctamente entre `FUNCTIONAL_DEFECT`, `DATA_CONTRACT_FAILURE`, `VALIDATOR_STALE` y `PIPELINE_MECHANISM_FAILURE` durante una aceptación productiva read-only.

## Caso Request07

La candidata exacta `9385306424` fue descargada y verificada correctamente por el workflow. El gate canónico dio GO, la identidad read-only fue resuelta y la integridad before/after permaneció idéntica con cero writes.

El browser runner se detuvo antes de activar el runtime porque todavía comparaba el manifest contra la candidata histórica `9345207863 / 29caae...`.

La salida original decía `DATA_CONTRACT_FAILURE:F2_BROWSER_MANIFEST_IDENTITY_MISMATCH`, pero la causa raíz demostrada fue:

`VALIDATOR_STALE:F2_BROWSER_MANIFEST_IDENTITY_EXPECTATION_BOUND_TO_PREDECESSOR`.

## Regla reusable

Un validator/test owner no debe hardcodear la identidad de una candidata histórica cuando el workflow ya usa Requests inmutables. Artifact, sourceHead, manifestStatus y fileCount deben resolverse desde el Request validado y cruzarse con el workflow/gate.

No corregir producto ni reimportar datos cuando el mismatch pertenece a la expectativa obsoleta del validator.

## Observabilidad

El observer que mira un runtime debe mantener su propio scope en cero-runtime/cero-secret/cero-data-access. El hecho de que el target observado esté autorizado para browser/runtime/secrets no transforma al observer en ejecutor de ese scope.

Por tanto:
- target runtime scope ≠ observer scope;
- observar una ejecución ≠ repetirla;
- `TARGET_RUN_NOT_FOUND` o fallo del observer no autoriza replay automático.

## Política de reintento

Una autorización de ejecución única se consume con el request que efectivamente disparó el runtime. Si ese run se detiene por `VALIDATOR_STALE`, se corrige primero el validator, se certifica el sourcefix sin runtime y luego se exige una autorización humana fresca para un request nuevo.

Request07 queda consumido. Request08 no puede crearse ni ejecutarse sin autorización fresca.

## Clasificación para reuso

- `REPLICABLE_CLAUDE_INMEDIATO`: binding dinámico de candidato desde Request inmutable; separación observer/target scope.
- `ACADEMIA_ACTUALIZAR`: diagnóstico de causa raíz y diferencia entre defecto funcional, contrato de datos y validador obsoleto.
- `BACKEND_PROTEGIDO_NO_CLAUDE`: secretos/provider/gates internos concretos no se entregan como código reutilizable externo.
- `SECRETO_DATO_REAL`: ningún secreto ni PII forma parte de esta actualización.
