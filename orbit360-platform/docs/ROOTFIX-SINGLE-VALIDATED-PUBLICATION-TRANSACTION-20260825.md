# HISTORICAL INCIDENT EVIDENCE — NOT CURRENT STATE AUTHORITY

# ROOTFIX — Single Validated Publication Transaction

Fecha: 2026-08-25

## Incidente

Los runs de hardening-close `32871437905` y `32878472113` demostraron que la transición lógica y los invariantes podían producir localmente un cierre coherente `43/37`, pero la publicación canónica volvía a fallar en el bloque shell posterior. El preflight temporal validaba `diffCheck` y `commitTree`, pero el workflow descartaba ese commit efímero y reconstruía la publicación con un segundo `git add → git commit → push`.

## Clasificación

`PIPELINE_MECHANISM_FAILURE:DUPLICATE_PHYSICAL_PUBLICATION_IMPLEMENTATION`

No es defecto funcional del producto, candidata, datos, Auth, Firestore ni browser. Es una divergencia entre el mecanismo validado y el mecanismo físico que publicaba.

## Causa raíz

La arquitectura declaraba single-writer a nivel lógico, pero todavía había dos implementaciones físicas consecutivas para la misma transición:

1. `tools/orbit360-control-plane-publication-preflight-v20260825.mjs` creaba y validaba un commit con índice temporal.
2. El workflow ignoraba ese commit y generaba otro con el índice real.

Por tanto, el resultado validado no era necesariamente el mismo objeto Git que intentaba llegar a la rama canónica.

## Rootfix

El owner existente de preflight se amplía, sin crear otro owner, a una transacción de dos fases sobre el mismo objeto Git:

`PREPARE → diff-check → commit-tree → remote CAS → push --dry-run → PUBLISH_VALIDATED exact commit → remote readback → local readback`.

Propiedades obligatorias:

- el `commitSha` preparado es exactamente el publicado;
- no existe segundo `git add/git commit` para hardening-close, accepted-state F2 ni terminal-state F2;
- la superficie de publicación se valida por clase;
- antes del push se reconstruye el tree en índice temporal y debe coincidir con `treeSha` preparado;
- el remoto debe seguir en `baseHead`;
- después del push el remoto debe leer exactamente `commitSha`;
- el runner hace readback local al mismo commit;
- los fallos tienen códigos causales de transacción;
- el token nunca forma parte del JSON emitido;
- cero runtime/browser/secrets/Firestore/writes/deploy/producción durante Iteración 1.

## Plan vigente

No se crea un roadmap nuevo. Se mantiene `PLAN-MAESTRO-CONGELADO-SALIDA-PRODUCCION-SIN-BUCLES-ORBIT360-AYS-20260824.md`; este rootfix pertenece a su Iteración 1 `CONTROL_PLANE_FINAL_SOURCE_ONLY`.

## Carriles

- A frontend/UX/Academia: producto congelado. Academia debe enseñar diferencia entre transición lógica, preparación de commit, publicación exacta y readback remoto.
- B backend/security/gates: rootfix exclusivamente del control-plane/publicación.
- C datos reales/migración: sin cambios.

## Claude

`BACKEND_PROTEGIDO_NO_CLAUDE`. Patrón conceptual reusable acumulable: `REPLICABLE_CLAUDE_ACUMULADO` para publicación transaccional prepare/commit/readback sin implementación protegida.

## Criterio histórico de salida

Un selftest source-only fresco debe pasar sobre el HEAD que contiene este mecanismo. Luego un único hardening-close debe publicar el commit preparado exacto y dejar Iteración 1 en `CONTROL_PLANE_DEFINITIVE_CAUSAL_PASS`. Solo después puede solicitarse una autorización F2 fresca.
