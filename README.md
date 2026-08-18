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

## Estado resumido · 2026-08-18 · F1.3 cerrado

- Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`.
- PR #5: draft/open; sin main/merge.
- URL pública conservada: `https://app.aysseguros.com`.
- Paquete público R4S9C: conservar inmutable; F1.3 no hizo deploy ni rebuild.
- F0 `DOCUMENTATION_STATE_DRIFT`: **CERRADO**.
- F1.1 owner/observer source: **CERRADO**.
- F1.2A observer self-test: **CERRADO**.
- F1.2B observación runtime sanitizada: **CERRADO/CONSUMIDO** run `32175674293`.
- Error interno observado: `membership_invalid:email_invalido` en bootstrap `phase=blocked`.
- Causa raíz final F1.3: `VALIDATOR_STALE / MEMBERSHIP_EMAIL_REQUIRED_STALE_AUTH_IDENTITY_OWNERSHIP`.
- Rootfix: membership email pasa a ser opcional; Auth es owner de correo; si membership trae correo debe tener formato válido y coincidir con Auth.
- Evidencia source-only: `orbit360-platform/runtime-gate-crm-v20260716/f1-3-membership-email-ownership-source-only-v20260818.json`.
- Resultado: `F1_3_MEMBERSHIP_EMAIL_OWNERSHIP_SOURCE_ONLY_PASS`, `failed=[]`, `staticViolations=[]`.
- F1.3 browser/runtime/secrets/data reads/deploy/rebuild: 0.
- Firestore/Auth/operational writes: 0.
- Contraseña/reset/usuarios/membership/datos: 0 cambios.

## Plan congelado

Fuente vinculante:
`orbit360-platform/docs/ADDENDUM-MAESTRO-CIERRE-FORENSE-SINCRONIZACION-Y-PLAN-CONGELADO-20260818.md`

Ruta inmediata a producción:
- F0 Reconciliación/documentación = 20% — **CERRADO**;
- F1 Causa raíz runtime/bootstrap = 30% — **80% interno por hitos (4/5 subfases cerradas)**;
- F2 Aceptación productiva E2E real = 30%;
- F3 Go-live operativo = 20%.

**Ruta a producción cerrada: 20%.** F1 no suma al global hasta cerrar su Definition of Done.

Programa integral producción + postproducción:
- F0 10% — **CERRADO**;
- F1 15% — **80% interno**;
- F2 15%;
- F3 10%;
- F4 actualización incremental de información 15%;
- F5 Control Plane no-code 15%;
- F6 postproducción funcional 15%;
- F7 SaaS reusable/siguiente tenant 5%.

**Programa integral cerrado: 10%.**

## Checkpoint activo

`orbit360-platform/docs/CHECKPOINT-F1-3-MEMBERSHIP-EMAIL-ROOTFIX-SOURCE-ONLY-20260818.md`

## Siguiente acción exacta

`F1_4_SINGLE_RUNTIME_ROOTFIX_CONFIRMATION`.

Requiere autorización explícita de runtime/browser. Con una sola autorización macro: gate-contract validator primero → request nuevo único/inmutable/single-use → una sola frontera productiva read-only sobre la misma ruta → comprobar que desapareció `membership_invalid:email_invalido` y capturar siguiente fase/error o PASS → detener y sincronizar.

No reutilizar `32175674293`; no deploy/rebuild/candidata, no reset/cambio de contraseña, no usuarios nuevos, no cambios de membership/datos, cero writes y sin main/merge.
