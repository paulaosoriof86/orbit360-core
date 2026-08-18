# orbit360-core

Repositorio de Orbit 360.

## REANUDACIÓN OBLIGATORIA — NO DIAGNOSTICAR DESDE DOCUMENTOS HISTÓRICOS

Antes de diagnosticar, modificar, ejecutar runtime/browser/deploy o continuar una conversación interrumpida, leer en este orden:

1. `orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json`;
2. `orbit360-platform/docs/orbit360-live-state-v1.json`;
3. HEAD real de `ays/backend-tenant-lab-v99-20260703` y PR #5;
4. las evidencias exactas indicadas por el live-state;
5. el checkpoint vigente indicado por el live-state;
6. `orbit360-platform/docs/ADDENDUM-MAESTRO-CIERRE-FORENSE-SINCRONIZACION-Y-PLAN-CONGELADO-20260818.md`;
7. reglas maestras/addenda vinculantes listadas en el índice.

**Regla:** README no es una copia autónoma del estado operativo. El estado actual vive en índice + live-state + HEAD/PR + última evidencia. Cualquier cierre, changelog, checkpoint o “siguiente acción” anterior que contradiga esas superficies es `HISTORICAL_NOT_CURRENT_STATE`.

## Estado resumido · 2026-08-18 · F1 CLOSED/PASS

- Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`.
- PR #5: draft/open; sin main/merge.
- URL pública conservada: `https://app.aysseguros.com`.
- R4S9C publicado permanece inmutable e histórico para F1; no contiene F1.3.
- Candidata sucesora F1.4C permanece **no publicada**: artifact `9345207863`, source `29caae94a3db1f1626bdde2ea6ee9a21799f9df6`.
- ZIP SHA256: `493009c83390901aa772842a2ba9ddd5ce5293f6969d86c5c3395ebd670a44ac`.
- Manifest SHA256: `29dafe5e63b425ea6cf641937fe1b9d4b9e63f72479a51ae76f9148a55771761`.
- F1.4D runtime/browser read-only: **PASS/CONSUMED**, run `32195516901`, attempt `1`, rerun `false`.
- Gate canónico dio GO antes de artifact/provider/browser.
- Artifact exacto rehash 194/194 PASS.
- `membership_invalid:email_invalido`: **ausente** en la candidata exacta.
- Bootstrap: `ready-read-only`, `errors=[]`; store `ready-read-only`, write disabled.
- Firestore/Auth/operational writes: `0/0/0`.
- Package rebuild/deploy/publicación: `0/0/0` durante F1.4D.
- Producción Hosting no fue tocada.
- F1.4D no puede repetirse: request single-use consumido, frozen, replay=false.

## Cierre de causa raíz F1

1. F1.3 cerró `VALIDATOR_STALE / MEMBERSHIP_EMAIL_REQUIRED_STALE_AUTH_IDENTITY_OWNERSHIP`.
2. F1.4B cerró `PIPELINE_MECHANISM_FAILURE / ROOTFIX_ARTIFACT_PARITY_MISSING`.
3. F1.4C construyó una candidata sucesora exacta que contiene F1.3.
4. F1.4D ejecutó esa candidata exacta y confirmó que el error histórico desapareció y el bootstrap queda listo read-only.

**F1 = CLOSED/PASS. No reabrir sin evidencia nueva.**

## Plan congelado

Fuente vinculante:
`orbit360-platform/docs/ADDENDUM-MAESTRO-CIERRE-FORENSE-SINCRONIZACION-Y-PLAN-CONGELADO-20260818.md`

Ruta inmediata a producción:
- F0 Reconciliación/documentación = 20% — **CERRADO**;
- F1 Causa raíz runtime/bootstrap = 30% — **CERRADO**;
- F2 Aceptación productiva E2E real = 30% — pendiente;
- F3 Go-live operativo = 20% — pendiente.

**Ruta inmediata a producción cerrada: 50%.**

Programa integral producción + postproducción:
- F0 10% — **CERRADO**;
- F1 15% — **CERRADO**;
- F2 15%; F3 10%; F4 15%; F5 15%; F6 15%; F7 5%.

**Programa integral cerrado: 25%.**

## Checkpoint activo

`orbit360-platform/docs/CHECKPOINT-F1-4D-RUNTIME-BROWSER-READONLY-PASS-F1-CLOSED-20260818.md`

## Siguiente acción exacta

`F2_PRODUCTIVE_ACCEPTANCE_GATE_EXACT_SUCCESSOR`.

Antes de ejecutar F2 se debe derivar del Plan Congelado + estado vivo el gate exacto de aceptación, Definition of Done y frontera de autorización. La candidata F1.4C **no se publica ni despliega por inferencia**. No repetir F1.4, F1.4B, F1.4C ni F1.4D; no reimportar datos ni modificar Auth/membership para avanzar F2.
