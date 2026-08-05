# orbit360-core

Repositorio de Orbit 360.

La continuidad operativa vigente de A&S se rige por:

1. `orbit360-platform/docs/FUENTES-RECTORAS-VIGENTES-ORBIT360-AYS-20260730.md`;
2. `orbit360-platform/docs/PLAN-UNICO-SALIDA-RC-AYS-LAB-CANONICA-01-20260804.md`;
3. `orbit360-platform/runtime-gate-crm-v20260716/rc-ays-lab-canonica-01-ledger-v20260804.json`;
4. `orbit360-platform/docs/ESTADO-ACTIVO-MICROBLOQUE-2-1-RC-AYS-CANONICA-20260804.md`;
5. `orbit360-platform/docs/CIERRE-STOP-RETRY-MICROBLOQUE-2-1-GO-LAB-CANDIDATE-VISIBLE-20260805.md`;
6. `orbit360-platform/docs/INCIDENTE-CIERRE-REQUEST-DISPARADOR-MICROBLOQUE-2-1-20260805.md`;
7. estado vivo del PR #5.

RC activa: `RC-AYS-LAB-CANONICA-01`.

Estado vigente:

```text
PASS_PLAN_PERSISTED
PASS_CANONICAL_BASELINE
PASS_ISOLATED_ROUTE_HARNESS
Microbloque 2.1: STOP_RETRY_DEFINITIVE_CONTROL_PLANE
```

La autorización de `GO_LAB_CANDIDATE_VISIBLE` está consumida. Los intentos autorizados `30974443335` y `30974745085` se detuvieron en el preflight antes de secretos, Firebase, Functions, Hosting y navegador. No existe URL LAB retenida.

El run `30975037529` fue un disparo administrativo accidental producido al marcar consumido el mismo archivo que activaba el workflow. Fue rechazado en la validación del request antes del preflight; no cuenta como ejecución autorizada ni runtime. El request disparador no se vuelve a modificar.

Causa raíz vigente:

```text
VALIDATOR_STALE + PIPELINE_MECHANISM_FAILURE
owner: tools/orbit360-validar-gate-contracts-v20260717.mjs
error: CANONICAL_LIFECYCLE_REVISION_MISMATCH
```

No ejecutar otro request ni otro parche de esta familia. La siguiente acción es exclusivamente source-only: rediseñar y probar outer router + lifecycle + inner engine como una unidad, conservar `phase-capability-contract-v1`, declarar la revisión del arnés en un campo separado, separar request inmutable de ledger de consumo y corregir contadores de evidencia basados en literales.

No usar memoria, conversaciones o estados históricos para sustituir el ledger vivo.
