# orbit360-core

Repositorio de Orbit 360.

La continuidad operativa vigente de A&S se rige por:

1. `orbit360-platform/docs/FUENTES-RECTORAS-VIGENTES-ORBIT360-AYS-20260730.md`;
2. `orbit360-platform/docs/PLAN-UNICO-SALIDA-RC-AYS-LAB-CANONICA-01-20260804.md`;
3. `orbit360-platform/docs/ANEXO-PLAN-UNICO-AUTH-V5-STOP-RETRY-DUAL-ROOTCAUSE-20260805.md`;
4. `orbit360-platform/docs/ESTADO-ACTIVO-AUTH-RUNTIME-V5-BLOQUE4-CONTINUA-20260805.md`;
5. `orbit360-platform/runtime-gate-crm-v20260716/auth-access-v5-dual-rootcause-sanitized-v20260805.json`;
6. `tools/orbit360-validator-lifecycle-contract-auth-access-recovery-lab-v5-20260805.json`;
7. `orbit360-platform/docs/ESTADO-ACTIVO-BLOQUE-4-COBROS-FULL-REPLAY-20260805.md`;
8. estado vivo del PR #5.

RC activa:

```text
RC-AYS-LAB-CANONICA-01
```

Candidata LAB retenida:

```text
runtime funcional: 18/18 PASS
rutas aisladas: 8/8 PASS
preflight canónico: 32/32 PASS
Functions operativas previas: 4/4
Hosting preview: retenido
integridad de candidata: PASS
```

URL LAB:

```text
https://ays-orbit-360-lab--orbit360-operational-block12-w8ibrr6w.web.app
```

## Auth v5

```text
Gate: block-auth-access-recovery-lab-v5-20260805
Estado: AUTH_ACCESS_RECOVERY_V5_CONSUMED_STOP_RETRY
Stage: STOP_RETRY_AUTH_ACCESS_RECOVERY
Primary: FUNCTIONAL_DEFECT
Secondary: PIPELINE_MECHANISM_FAILURE
```

El run pasó preflight, configuración, censo y disponibilidad de la Function. Se detuvo al invocar onboarding. El status remoto exacto no quedó persistido porque el workflow exigía un archivo de scopes que no existe cuando recovery falla.

Soluciones source-only:

- `tools/orbit360-auth-access-actor-parity-precheck-v6-20260805.mjs`;
- `tools/orbit360-auth-access-evidence-safe-persist-v6-20260805.mjs`;
- workflow v5 congelado y reutilizado como futuro diagnóstico source-only v6;
- request v5 consumido e inmutable;
- request source-only v6 ausente.

No se confirma creación persistida de identidades o memberships. Se enviaron cero correos. La integridad CRM quedó `NOT_POSTVERIFIED`; no se observó una modificación CRM.

## Cobros

```text
Gate: PASS_COBROS_FULL_REPLAY
Estado: ACTIVE_READ_ONLY_MONTHLY_INTAKE_PARALLEL
```

Continúan la clasificación de 365 pagos, recepción gradual de planillas/facturas/estados de cuenta, importador inteligente y contrato planilla de comisiones → CxC/CxP → factura posterior.

No reutilizar requests consumidos ni ejecutar producción, main, merge, Rules, reimportación o despliegues sin autorización explícita y gate correspondiente.
