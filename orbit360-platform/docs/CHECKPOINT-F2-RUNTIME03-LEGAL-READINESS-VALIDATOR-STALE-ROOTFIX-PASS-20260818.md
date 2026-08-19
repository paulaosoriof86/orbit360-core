# CHECKPOINT — F2 RUNTIME03 · LEGAL READINESS VALIDATOR_STALE ROOTFIX PASS

Fecha: 2026-08-18
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Gate: `f2-productive-acceptance-exact-successor-v20260818`
Artifact bloqueado: `9345207863`

## Runtime03 — único intento consumido

Request03 commit `809228b1e8d65282f553881b0e2b4dd5e1974e2a`, run `32207049146`, attempt 1. Request03 quedó consumido, allowedExecutions 0 y replay false.

Runtime03 superó el gate canónico, verificó íntegramente el artifact exacto, resolvió la identidad existente read-only y obtuvo snapshot de integridad before. Entró al navegador, pero se detuvo en el helper de readiness legal antes de completar la matriz de roles, cross-tenant y service-worker.

## Hallazgo y reclasificación

El runtime emitió inicialmente `FUNCTIONAL_DEFECT:F2_LEGAL_GATE_NOT_IDEMPOTENT`. La evidencia real fue: una sola aceptación legal, `accepted=1`, `remaining=0`, sin page errors, sin console errors y sin señales de write. La integridad after comparó conteos y digests idénticos.

La causa raíz canónica es `VALIDATOR_STALE / BLOCKING_GATE_HARD_TIMEOUT_INCLUDED_SUCCESSFUL_DETACH_PHASE`: el helper contaba el tiempo de detach exitoso dentro del hard timeout y podía devolver timeout antes de conceder la quiet window posterior. No se demostró reaparición del modal ni defecto funcional del owner legal.

## Rootfix source-only

El helper `tools/orbit360-browser-blocking-gate-readiness-v20260730.mjs` quedó phase-aware. El self-test reproduce el patrón legacy cruzando el hard timeout con `accepted=1 / remaining=0` y ahora termina `quietWindowSatisfied=true`. Rootfix source-only run `32207309204`: PASS. Request03 no fue reproducido.

## Integridad e invariantes

- candidate artifact: verificado;
- identidad: read-only PASS;
- integrity before/after: PASS, countsIdentical=true, digestsIdentical=true;
- Firestore/Auth/membership/data/operational writes: 0;
- rebuild/deploy/publicación/producción: 0/no;
- role matrix completa: no;
- cross-tenant: no alcanzado;
- service-worker/cache: no alcanzado;
- F2: todavía abierto.

Ruta inmediata a producción: 50%. Programa integral: 25%. Carril A congelado; Carril B rootfix + post-docsync source gate PASS; Carril C sin cambios.

## Control post-docsync

Este mismo cierre se valida con gate canónico source-only después de modificar live-state/índice/checkpoint. Run source-only esperado del cierre: `32207781730`. Si ese gate no pasa, estos documentos no se persisten como estado canónico.

## Siguiente frontera

`F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1 / REQUEST04 / EXACT_ARTIFACT_9345207863`. Request04 no existe ni está autorizado. Requiere autorización explícita fresca y conserva los mismos límites read-only.

## Claude / Academia

`REPLICABLE_CLAUDE_ACUMULADO`: readiness phase-aware y separación entre resultado observable del helper y defecto funcional del owner; sin backend protegido, secretos ni datos reales.

`ACADEMIA_ACTUALIZAR`: un timeout del validador no equivale a falta de idempotencia si la evidencia registra una aceptación y cero gates restantes; root cause antes de rerun; post-docsync source gate obligatorio.

## Incidencia de persistencia del cierre

El primer run de docsync (`32207625109`) pasó el gate canónico sobre los documentos ya modificados, pero su push fue rechazado por `non-fast-forward` porque un observador de descubrimiento avanzó la misma rama en paralelo. Clasificación: `PIPELINE_MECHANISM_FAILURE / CONCURRENT_OBSERVER_COMMIT_NON_FAST_FORWARD`; producto no afectado. El mecanismo concurrente queda prohibido para este cierre y se sustituye por persistencia serializada V2, nuevamente con gate canónico antes del push.
