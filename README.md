# orbit360-core

Repositorio de Orbit 360.

La continuidad operativa vigente de A&S se rige por:

1. `orbit360-platform/docs/FUENTES-RECTORAS-VIGENTES-ORBIT360-AYS-20260730.md`;
2. `orbit360-platform/docs/PLAN-UNICO-SALIDA-RC-AYS-LAB-CANONICA-01-20260804.md`;
3. `orbit360-platform/runtime-gate-crm-v20260716/rc-ays-lab-canonica-01-ledger-v20260804.json`;
4. `orbit360-platform/docs/ESTADO-ACTIVO-MICROBLOQUE-2-3-RC-AYS-CANONICA-20260805.md`;
5. `orbit360-platform/docs/CIERRE-STOP-RETRY-MICROBLOQUE-2-3-BASELINE-PROVENANCE-20260805.md`;
6. `orbit360-platform/runtime-gate-crm-v20260716/rc-ays-lab-canonica-01-microblock23-stop-retry-v20260805.json`;
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
```

Estado vigente:

```text
Microbloque 2.3: STOP_RETRY_DEFINITIVE_BASELINE_PROVENANCE
run: 30977831814
autorización consumida: sí
URL LAB retenida: no
```

La ejecución se detuvo antes del preflight canónico porque el checkout superficial no contenía el baseline congelado. El error fue:

```text
fatal: Invalid revision range 548cffa50cddfd93ad2118f5a06e9bb420699bde..HEAD^
```

Clasificación:

```text
PIPELINE_MECHANISM_FAILURE
owner: .github/workflows/orbit360-block12-visual-layoutfree-reactivation-lab-v20260804.yml
```

No hubo secretos, Firebase, Functions deploy, Hosting deploy, navegador, escrituras, Rules, reimportación, producción, main o merge. `0/4 Functions` significa que la etapa no se ejecutó; no demuestra fallo de Functions.

Root fix source-only aplicado:

```text
commit: ed655ef5221cf84c5930ba4ce07da586a6fca64f
fetch-depth: 0
guard: git cat-file -e "$ORBIT360_SOURCE_BASELINE^{commit}"
```

El request v3 está consumido e inmutable. No se reejecuta ni se modifica. La siguiente acción es preparar source-only un nuevo path de request sobre el workflow existente y, después de validarlo, solicitar una autorización LAB nueva.

No usar memoria, conversaciones o estados históricos para sustituir el ledger vivo.
