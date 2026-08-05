# orbit360-core

Repositorio de Orbit 360.

La continuidad operativa vigente de A&S se rige por:

1. `orbit360-platform/docs/FUENTES-RECTORAS-VIGENTES-ORBIT360-AYS-20260730.md`;
2. `orbit360-platform/docs/PLAN-UNICO-SALIDA-RC-AYS-LAB-CANONICA-01-20260804.md`;
3. `orbit360-platform/runtime-gate-crm-v20260716/rc-ays-lab-canonica-01-ledger-v20260804.json`;
4. `orbit360-platform/docs/ESTADO-ACTIVO-MICROBLOQUE-2-5-RC-AYS-CANONICA-20260805.md`;
5. `orbit360-platform/docs/CIERRE-MICROBLOQUE-2-4-PASS-REQUEST-V4-PROVENANCE-COMPOSITION-20260805.md`;
6. `orbit360-platform/runtime-gate-crm-v20260716/rc-ays-lab-canonica-01-microblock24-pass-v20260805.json`;
7. estado vivo del PR #5.

RC activa:

```text
RC-AYS-LAB-CANONICA-01
```

Gates cerrados:

```text
PASS_PLAN_PERSISTED
PASS_CANONICAL_BASELINE
PASS_ISOLATED_ROUTE_HARNESS
PASS_CANONICAL_PREFLIGHT_COMPOSITION
PASS_REQUEST_V4_PROVENANCE_COMPOSITION
```

Evidencia vigente:

```text
runtime funcional: 30962756387 · 18/18 PASS
rutas aisladas: 30971707956 · 8/8 PASS
composición canónica: 30977179448 · 31/31 PASS
inner preflight canónico: 32/32 PASS
request v4 + provenance: 30979519198 · 33/33 PASS
```

Estado activo:

```text
Microbloque 2.5
Gate: GO_LAB_CANDIDATE_VISIBLE
Estado: READY_AWAITING_NEW_EXPLICIT_LAB_DEPLOY_AUTHORIZATION
```

Topología vigente:

```text
workflow runtime existente:
.github/workflows/orbit360-block12-visual-layoutfree-reactivation-lab-v20260804.yml

request runtime futuro ausente:
.github/orbit360-requests/block12-go-lab-candidate-visible-v4.json

request runtime v3 consumido e inmutable:
.github/orbit360-requests/block12-go-lab-candidate-visible-v3.json

request source-only v4 consumido e inmutable:
.github/orbit360-requests/block12-go-lab-candidate-visible-v4-source-only.json
```

El checkout runtime usa `fetch-depth: 0` y valida expresamente la existencia del baseline congelado antes del preflight:

```text
git cat-file -e "$ORBIT360_SOURCE_BASELINE^{commit}"
```

El Microbloque 2.4 comprobó:

```text
baseline presente: sí
baseline ancestro del parent HEAD: sí
producto sin cambios: sí
blob del request v3 inmutable: sí
outer router exit: 0
inner engine reached: true
runtime y capacidades operativas: no
```

No crear el request runtime v4 sin una autorización LAB explícita nueva. No usar memoria, conversaciones o estados históricos para sustituir el ledger vivo.
