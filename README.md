# orbit360-core

Repositorio de Orbit 360.

La continuidad operativa vigente de A&S se rige por:

1. `orbit360-platform/docs/FUENTES-RECTORAS-VIGENTES-ORBIT360-AYS-20260730.md`;
2. `orbit360-platform/docs/PLAN-UNICO-SALIDA-RC-AYS-LAB-CANONICA-01-20260804.md`;
3. `orbit360-platform/runtime-gate-crm-v20260716/rc-ays-lab-canonica-01-ledger-v20260804.json`;
4. `orbit360-platform/docs/CIERRE-MICROBLOQUE-2-2-PASS-CANONICAL-PREFLIGHT-COMPOSITION-20260805.md`;
5. `orbit360-platform/docs/ESTADO-ACTIVO-MICROBLOQUE-2-3-RC-AYS-CANONICA-20260805.md`;
6. estado vivo del PR #5.

RC activa:

```text
RC-AYS-LAB-CANONICA-01
sourceBaseline: 548cffa50cddfd93ad2118f5a06e9bb420699bde
```

Gates cerrados:

```text
PASS_PLAN_PERSISTED
PASS_CANONICAL_BASELINE
PASS_ISOLATED_ROUTE_HARNESS
PASS_CANONICAL_PREFLIGHT_COMPOSITION
```

Evidencia vigente:

```text
runtime funcional: 30962756387 · 18/18 PASS
rutas aisladas sintéticas: 30971707956 · 8/8 PASS
composición canónica final: 30977179448 · 31/31 PASS
inner preflight: 32/32 PASS
```

Estado activo:

```text
Microbloque 2.3
Gate: GO_LAB_CANDIDATE_VISIBLE
Estado: READY_AWAITING_NEW_EXPLICIT_LAB_DEPLOY_AUTHORIZATION
```

El workflow runtime existente está preparado para un request v3, pero permanece inerte:

```text
.github/orbit360-requests/block12-go-lab-candidate-visible-v3.json
```

Ese archivo no existe y no debe crearse sin autorización explícita nueva. El request anterior está consumido e inmutable.

La próxima autorización podrá cubrir únicamente: preflight antes de secretos, cuatro Functions LAB allowlisted, un Hosting preview retenido, ocho rutas aisladas/directas y snapshots before/after idénticos. No cubre Rules, reimportación, producción, main, merge ni repetición de los 18 escenarios.

No usar memoria, conversaciones o estados históricos para sustituir el ledger vivo.
