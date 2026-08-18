# orbit360-core

Repositorio de Orbit 360.

## REANUDACIÓN OBLIGATORIA — NO DIAGNOSTICAR DESDE DOCUMENTOS HISTÓRICOS

Antes de diagnosticar, modificar, ejecutar runtime/browser/deploy o continuar una conversación interrumpida, leer en este orden:

1. `orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json`;
2. `orbit360-platform/docs/orbit360-live-state-v1.json`;
3. HEAD real de `ays/backend-tenant-lab-v99-20260703` y PR #5;
4. las evidencias exactas indicadas por `lastRuntimeEvidence`, `lastLifecycleEvidence` y `lastSourceOnlyEvidence` del live-state;
5. el checkpoint vigente indicado por el live-state;
6. `orbit360-platform/docs/ADDENDUM-MAESTRO-CIERRE-FORENSE-SINCRONIZACION-Y-PLAN-CONGELADO-20260818.md`;
7. reglas maestras/addenda vinculantes listadas en el índice.

**Regla:** README no es una copia autónoma del estado operativo. El estado actual vive en índice + live-state + HEAD/PR + última evidencia. Cualquier cierre, changelog, checkpoint o “siguiente acción” anterior que contradiga esas superficies es `HISTORICAL_NOT_CURRENT_STATE`.

## Estado resumido · 2026-08-18

- Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`.
- PR #5: draft/open; sin main/merge.
- URL pública conservada: `https://app.aysseguros.com`.
- Paquete público R4S9C: conservar inmutable mientras se diagnostica; no rebuild/deploy por descarte.
- Auth real, contraseña, membership/tenant y HostDime: no son blockers demostrados en la evidencia más reciente.
- F0 `DOCUMENTATION_STATE_DRIFT`: **CERRADO 100%**.
- F1 activo: `FUNCTIONAL_DEFECT / R4_RUNTIME_ACTIVATION_TRIGGER_FAILED`.
- Observer source: `6d68495ec92f103c805503a42b46bd5a755c3ef9`.
- Ejecución previa `32155605314`: Auth/membership PASS y `PRODUCT_READONLY_BOOTSTRAP_NOT_READY`; no contiene el error interno porque ocurrió antes del observer.
- Self-test canónico source-only del observer: **PASS** `R4_ROLE_ROUTE_ATTRIBUTION_SELFTEST_PASS`.
- Evidencia: `orbit360-platform/runtime-gate-crm-v20260716/r4-role-route-attribution-selftest-v20260818.json`.
- Single invocation, no segundo bootstrap, allowlist sanitizada, restore del owner y sintaxis: PASS.
- Browser/runtime nuevos: 0; secretos: 0; data access productivo nuevo: 0; Firestore/Auth/operational writes: 0; deploy/rebuild: 0.
- La causa interna concreta del bootstrap continúa `UNKNOWN_PENDING_SANITIZED_OBSERVATION`; no inferirla.

## Plan congelado

Fuente vinculante:
`orbit360-platform/docs/ADDENDUM-MAESTRO-CIERRE-FORENSE-SINCRONIZACION-Y-PLAN-CONGELADO-20260818.md`

Ruta inmediata a producción:
- F0 Reconciliación/documentación = 20% — **CERRADO**;
- F1 Causa raíz runtime/bootstrap = 30% — **37.5% interno**;
- F2 Aceptación productiva E2E real = 30%;
- F3 Go-live operativo = 20%.

**Ruta a producción cerrada: 20%.** F1 no suma al global hasta cerrar su Definition of Done.

Programa integral producción + postproducción:
- F0 10% — **CERRADO**;
- F1 15% — **37.5% interno**;
- F2 15%;
- F3 10%;
- F4 actualización incremental de información 15%;
- F5 Control Plane no-code 15%;
- F6 postproducción funcional 15%;
- F7 SaaS reusable/siguiente tenant 5%.

**Programa integral cerrado: 10%.**

## Checkpoint activo

`orbit360-platform/docs/CHECKPOINT-F1-SOURCE-ONLY-BOOTSTRAP-ATTRIBUTION-20260818.md`

## Siguiente acción exacta

`F1_2B_SINGLE_RUNTIME_BOOTSTRAP_OBSERVATION`.

**Requiere autorización explícita de runtime/browser antes de ejecutarse.** Una vez autorizada: ejecutar primero el gate-contract validator, crear un request nuevo único/inmutable/single-use ligado al observer ya certificado y ejecutar una sola frontera read-only para capturar únicamente `bootstrapObservation.phase`, `errors`, `assignedRoleCount`, `countryCount`, `collectionCount`, `ready`, `writeAuthorized` y el error exterior sanitizado. Detener inmediatamente y sincronizar documentación.

No reusar ni reejecutar `32155605314`; no deploy, rebuild, nueva candidata, reset/cambio de contraseña, alta/baja de usuarios, cambios de membership/datos ni rootfix antes de obtener esa evidencia.