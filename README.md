# orbit360-core

Repositorio de Orbit 360.

## REANUDACIÓN OBLIGATORIA — NO DIAGNOSTICAR DESDE DOCUMENTOS HISTÓRICOS

Antes de diagnosticar, modificar, ejecutar runtime/browser/deploy o continuar una conversación interrumpida, leer en este orden:

1. `orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json`;
2. `orbit360-platform/docs/orbit360-live-state-v1.json`;
3. HEAD real de `ays/backend-tenant-lab-v99-20260703` y PR #5;
4. la evidencia exacta indicada por `lastEvidence` / `lastRuntimeEvidence` del live-state;
5. `orbit360-platform/docs/ADDENDUM-MAESTRO-CIERRE-FORENSE-SINCRONIZACION-Y-PLAN-CONGELADO-20260818.md`;
6. reglas maestras/addenda vinculantes listadas en el índice.

**Regla:** README no es una copia del estado operativo. El estado actual vive únicamente en el índice + live-state + HEAD/PR + última evidencia. Cualquier cierre, changelog, checkpoint o “siguiente acción” anterior que contradiga esas superficies es `HISTORICAL_NOT_CURRENT_STATE`.

## Estado resumido · 2026-08-18

- Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`.
- PR #5: draft/open; sin main/merge.
- URL pública conservada: `https://app.aysseguros.com`.
- Paquete público R4S9C: conservar inmutable mientras se diagnostica; no rebuild/deploy por descarte.
- Auth real, contraseña, membership/tenant y HostDime: no son blockers demostrados en la evidencia más reciente.
- Bloqueo técnico vigente: `FUNCTIONAL_DEFECT / R4_RUNTIME_ACTIVATION_TRIGGER_FAILED`.
- Deriva metodológica detectada y en cierre F0: `PIPELINE_MECHANISM_FAILURE / DOCUMENTATION_STATE_DRIFT`.
- Observer source vigente: commit `6d68495ec92f103c805503a42b46bd5a755c3ef9`, diseñado para observar una única ejecución del bootstrap sin retry.
- Firestore/Auth/operational writes en la última ejecución: 0.
- Deploy/rebuild adicional para diagnosticar: no autorizado.

## Plan congelado

El plan F0–F7 y sus porcentajes están definidos en:

`orbit360-platform/docs/ADDENDUM-MAESTRO-CIERRE-FORENSE-SINCRONIZACION-Y-PLAN-CONGELADO-20260818.md`

Ruta inmediata a producción:

- F0 Reconciliación/documentación = 20%
- F1 Causa raíz runtime/bootstrap = 30%
- F2 Aceptación productiva E2E real = 30%
- F3 Go-live operativo = 20%

Programa integral producción + postproducción:

- F0 10%
- F1 15%
- F2 15%
- F3 10%
- F4 actualización incremental de información 15%
- F5 Control Plane no-code 15%
- F6 postproducción funcional 15%
- F7 SaaS reusable/siguiente tenant 5%

## Siguiente acción exacta

Completar la transacción documental F0 y después continuar F1 **source-only** sobre el observer del bootstrap. No ejecutar otro runtime/browser/deploy ni crear otra candidata hasta que live-state/PR/README estén sincronizados y la causa del `R4_RUNTIME_ACTIVATION_TRIGGER_FAILED` quede atribuida a su owner real.
