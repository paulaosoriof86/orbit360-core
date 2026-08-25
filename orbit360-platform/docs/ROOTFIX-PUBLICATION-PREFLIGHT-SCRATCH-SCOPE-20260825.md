# ROOTFIX — Scope scratch del preflight de publicación

**HISTORICAL INCIDENT EVIDENCE — NOT CURRENT STATE AUTHORITY.** Este documento conserva el diagnóstico y la corrección aplicados en su momento; no define estado vigente, nextAction ni autoridad de reanudación. El estado operativo actual se deriva únicamente del ledger y de sus proyecciones canónicas.

Fecha: 2026-08-25

## Hallazgo

El selftest canónico `32873171337` / job `97884793636` falló dentro de la transición scratch `CONTROL_PLANE_HARDENING_CLOSE`. La candidata, el source precheck, el lifecycle class-wide, el guard de source rewrite y el estado operativo permanecieron cerrados y sin efectos de runtime.

El arnés behavioral crea deliberadamente evidencia interna bajo `orbit360-platform/runtime-gate-crm-v20260716/`, incluyendo un handshake `__selftest-handshake-*`, antes de ejecutar el cierre scratch. Esa evidencia no pertenece al commit de cierre canónico. El nuevo preflight estaba leyendo toda la worktree y, en estado de cierre, trataba esos archivos scratch como parte de la superficie publicable.

## Clasificación

`PIPELINE_MECHANISM_FAILURE:PUBLICATION_PREFLIGHT_SELFTEST_SCOPE_MIXED_WITH_HARNESS_EVIDENCE`

No es un defecto funcional, de candidata ni del owner lógico. Tampoco autoriza rerun sin corrección.

## Corrección

En modo selftest, identificado exclusivamente por `ORBIT360_SELFTEST_EXPECTED_LEDGER`, el preflight:

- mantiene como superficie publicable únicamente `registry.sourceOfTruth + registry.projectionTargets`;
- puede ignorar para el commit temporal solo residuos adicionales dentro de `orbit360-platform/runtime-gate-crm-v20260716/`;
- falla si aparece cualquier archivo adicional fuera de esa carpeta;
- exige que el ledger esté realmente modificado durante el cierre scratch;
- conserva `diff --check` y `commit-tree` sobre la superficie que realmente se publicaría.

En ejecución canónica real no se excluye ningún residuo: cualquier archivo fuera de la superficie permitida sigue produciendo `CONTROL_PLANE_CLOSE_PUBLICATION_SURFACE`.

Además, los fallos del preflight ahora usan errores tipados en lugar de `process.exit()` dentro del bloque temporal. El `finally` elimina siempre el índice temporal antes de devolver el código causal. La redacción de token se aplica globalmente al diagnóstico de `push --dry-run`.

## Seguridad y alcance

Cero F2, runtime, browser, secrets, Firestore, writes operativos, deploy, producción, main o merge. Producto y candidata permanecen congelados.

## Siguiente gate histórico de esa iteración

No reutilizar el run fallido. Tras auditoría y fast-forward source-only, ejecutar un único `CONTROL_PLANE_SELFTEST` fresco. Solo un PASS integral permite producir un handshake nuevo y volver a intentar `CONTROL_PLANE_HARDENING_CLOSE`.
