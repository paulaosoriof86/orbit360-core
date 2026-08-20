# CHECKPOINT F2 — Request12 consumido, continuidad antibucle y causa raíz abierta

**StateVersion canónica:** `F2-R12-CONSUMED-ROOTCAUSE-OPEN-20260820-01`  
**Fecha UTC:** 2026-08-20  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft/open  
**Gate único F2:** `f2-productive-acceptance-exact-successor-v20260818`

## Fuente canónica de continuidad

La autoridad operativa de reanudación es `orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json`. Este checkpoint, `orbit360-live-state-v1.json`, `ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json`, lifecycle, README, CHANGELOG y PR #5 deben coincidir con su `stateVersion`. Una divergencia es `PIPELINE_MECHANISM_FAILURE:DOCUMENTATION_STATE_DRIFT` y bloquea el avance.

## Hecho terminal Request12

Request12 se materializó una sola vez en `3993fb5a8a8d3636914fa4a6d5bbdd18d5d6964d` y ejecutó run `32332301619`, attempt 1. Está consumido, `allowedExecutions=0`, `replayAllowed=false`; su autorización está igualmente consumida y congelada. No se permite replay.

Candidata exacta congelada: artifact `9387820198`, source `fc46bd85783d8b4d524cbeb0fee54ee9a2c774af`, ZIP SHA256 `58fcbe6e8d7d3a425509c87f229b1cb12dd35a99133d46c757544cc75c55aacc`, manifest SHA256 `b18422fdf82830d28e82f657f83b4fd5c10ea134a4735263fa2587a2ddd808cb`.

El run pasó boundary/self-test/lifecycle/gate canónico/candidata/dependencias/provider/identidad/snapshot/loopback. En browser, Dirección desktop → Pólizas terminó con clasificación observada `VALIDATOR_STALE:F2_ROUTE_READINESS_TIMEOUT_CONTRADICTED_BY_CAPTURE`; elapsed `64680 ms`. La captura final mostró contrato visible. Integridad before/after PASS, cross-tenant denied PASS, write guard PASS y cero writes. Artifact terminal `9393486955`, digest `sha256:6681ed2d681c0cf23dd06e047f56988cc93ef08f5c3bc33c3cf1c39923662ed6`.

## Causa raíz: ABIERTA, no asumir VALIDATOR_STALE

Este es el segundo fallo de la misma familia (Request10 y Request12). Por regla stop-retry queda prohibido crear Request13, aumentar timeout o modificar Pólizas hasta separar causalmente:

1. `FUNCTIONAL_DEFECT:F2_ROUTE_MAIN_THREAD_BLOCKING_POLIZAS` — el render/store bloquea event-loop y retrasa polling/timeout.
2. `VALIDATOR_STALE:F2_ROUTE_READINESS_WAITER_MISSED_VISIBLE_STATE` — el hilo permanece receptivo y el instrumento pierde el estado visible.

La siguiente acción exacta es instrumentación **source-only** de los límites event-loop → navegación → mount/render → readiness/poll → captura. Solo evidencia causal permite decidir owner y fix.

## Causa raíz del bucle entre conversaciones

La auditoría de continuidad del 20/08/2026 encontró que el problema no era únicamente runtime. PR #5, `orbit360-live-state-v1.json`, `ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json`, lifecycle y el invariant documental podían conservar fronteras Request10/11 mientras HEAD ya estaba en Request12. Además, el invariant estaba hard-codeado a Request11. Esa arquitectura permitía que una nueva conversación reanudara desde una verdad vieja.

La corrección estructural exige:

- ledger canónico independiente del ordinal;
- sincronización programática conservando historia;
- invariant genérico que deriva el request actual desde el ledger;
- compatibilidad de callers viejos sin validar la verdad vieja;
- auditoría fail-closed incluyendo PR real;
- evidencia persistida tanto en PASS como FAIL;
- prohibición de avanzar si cualquier owner activo diverge.

## Carriles

- **A — frontend/UX/Academia:** candidata congelada; cero cambio funcional. Academia se actualiza con continuidad antibucle y distinción defecto funcional vs validador.
- **B — backend/seguridad/gates:** F2 raíz causal abierta; continuidad documental en cierre transaccional.
- **C — datos reales A&S:** sin cambios.

## Prohibiciones vigentes

No Request11 replay; no Request12 replay; no Request13 antes de prueba causal; no aumento de timeout; no modificación de Pólizas antes de prueba causal; cero deploy/publicación/producción/main/merge.

## Reanudación obligatoria en conversación nueva

1. Leer masters/addenda vigentes.
2. Leer este checkpoint y el ledger canónico.
3. Leer evidencia `f2-continuity-audit-v20260820.json`; solo `PASS` permite confiar en la sincronización.
4. Leer HEAD/PR #5.
5. No reabrir Request11/12 ni pedir autorización de runtime.
6. Ejecutar únicamente la acción source-only causal de Pólizas indicada arriba.

**Estado:** `F2_ROOT_CAUSE_OPEN — CONTINUITY_ANTI_LOOP_SYNC_MUST_PASS_BEFORE_NEXT_TECHNICAL_ACTION`.
