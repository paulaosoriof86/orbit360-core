# orbit360-core

Repositorio de Orbit 360.

## REANUDACIÓN OBLIGATORIA — NO DIAGNOSTICAR DESDE DOCUMENTOS HISTÓRICOS

Antes de diagnosticar, modificar, ejecutar runtime/browser/deploy o continuar una conversación interrumpida, leer en este orden:

1. `orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json`;
2. `orbit360-platform/docs/orbit360-live-state-v1.json`;
3. HEAD real de `ays/backend-tenant-lab-v99-20260703` y PR #5;
4. la evidencia exacta indicada por `lastRuntimeEvidence` / `lastLifecycleEvidence` del live-state;
5. `orbit360-platform/docs/ADDENDUM-MAESTRO-CIERRE-FORENSE-SINCRONIZACION-Y-PLAN-CONGELADO-20260818.md`;
6. reglas maestras/addenda vinculantes listadas en el índice.

**Regla:** README no es una copia autónoma del estado operativo. El estado actual vive en índice + live-state + HEAD/PR + última evidencia. Cualquier cierre, changelog, checkpoint o “siguiente acción” anterior que contradiga esas superficies es `HISTORICAL_NOT_CURRENT_STATE`.

## Estado resumido · 2026-08-18

- Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`.
- PR #5: draft/open; sin main/merge.
- URL pública conservada: `https://app.aysseguros.com`.
- Paquete público R4S9C: conservar inmutable mientras se diagnostica; no rebuild/deploy por descarte.
- Auth real, contraseña, membership/tenant y HostDime: no son blockers demostrados en la evidencia más reciente.
- F0 `DOCUMENTATION_STATE_DRIFT`: **CERRADO 100%** mediante addendum + índice + live-state + PR + README + checkpoint.
- F1 activo: `FUNCTIONAL_DEFECT / R4_RUNTIME_ACTIVATION_TRIGGER_FAILED`.
- Observer source: `6d68495ec92f103c805503a42b46bd5a755c3ef9`.
- F1.1 source-only: límite del fallo y owner chain atribuidos; observer de single-bootstrap validado por inspección de fuente.
- Ejecución existente `32155605314`: Auth/membership PASS y `PRODUCT_READONLY_BOOTSTRAP_NOT_READY`; no contiene el error interno porque ocurrió antes de incorporar el observer.
- Firestore/Auth/operational writes: 0.
- Deploy/rebuild adicional para diagnosticar: no autorizado.

## Plan congelado

Fuente vinculante:
`orbit360-platform/docs/ADDENDUM-MAESTRO-CIERRE-FORENSE-SINCRONIZACION-Y-PLAN-CONGELADO-20260818.md`

Ruta inmediata a producción:
- F0 Reconciliación/documentación = 20% — **CERRADO**;
- F1 Causa raíz runtime/bootstrap = 30% — **25% interno**;
- F2 Aceptación productiva E2E real = 30%;
- F3 Go-live operativo = 20%.

**Ruta a producción cerrada: 20%.** F1 no suma al global hasta cerrar su Definition of Done.

Programa integral producción + postproducción:
- F0 10% — **CERRADO**;
- F1 15% — **25% interno**;
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

Continuar F1 **source-only**: materializar/ejecutar únicamente el `--self-test-only` del observer en un carril que no enlace provider/browser/secrets/runtime, comprobar single invocation + allowlist + restore + cero operaciones externas y documentar el resultado. Después definir la única observación runtime necesaria para obtener `bootstrapObservation.phase/errors`. No reusar ni reejecutar el request consumido `32155605314`; no runtime/browser/deploy/candidata hasta cerrar esta frontera source-only.
