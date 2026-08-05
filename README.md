# orbit360-core

Repositorio de Orbit 360.

La continuidad operativa vigente de A&S se rige por:

1. `orbit360-platform/docs/FUENTES-RECTORAS-VIGENTES-ORBIT360-AYS-20260730.md`;
2. `orbit360-platform/docs/PLAN-UNICO-SALIDA-RC-AYS-LAB-CANONICA-01-20260804.md`;
3. `orbit360-platform/docs/ANEXO-PLAN-UNICO-AUTH-FOUNDATION-ALL-TEAM-SOURCE-ONLY-PASS-20260805.md`;
4. `orbit360-platform/docs/AUDITORIA-FORENSE-AUTH-SOLUCION-DEFINITIVA-20260805.md`;
5. `orbit360-platform/runtime-gate-crm-v20260716/auth-foundation-all-team-source-only-sanitized-v20260805.json`;
6. `orbit360-platform/docs/ESTADO-ACTIVO-AUTH-FOUNDATION-ALL-TEAM-SOURCE-ONLY-PASS-BLOQUE4-CONTINUA-20260805.md`;
7. `orbit360-platform/docs/ESTADO-ACTIVO-BLOQUE-4-COBROS-FULL-REPLAY-20260805.md`;
8. estado vivo del PR #5.

RC activa:

```text
RC-AYS-LAB-CANONICA-01
```

Candidata LAB retenida:

```text
runtime funcional previo: 18/18 PASS
rutas aisladas previas: 8/8 PASS
preflight canónico de candidata: 32/32 PASS
Hosting preview: retenido
integridad de candidata: PASS
```

URL LAB:

```text
https://ays-orbit-360-lab--orbit360-operational-block12-w8ibrr6w.web.app
```

## Auth — Fundación all-team

Causa sistémica:

```text
FUNCTIONAL_DEFECT
AUTH_BOOTSTRAP_CIRCULAR_DEPENDENCY_AND_SPLIT_BRAIN_USER_STATE
```

El bootstrap inicial se separó del onboarding normal. Los tres perfiles Dirección, Operativo y Asesor son pruebas funcionales de permisos; el universo actual de identidad es de siete usuarios.

Cierre source-only:

```text
Gate: block-auth-foundation-all-team-source-only-v20260805
Contrato: 13.6.0
Estado: AUTH_FOUNDATION_ALL_TEAM_SOURCE_ONLY_CONSUMED_PASS
Checks: 29/29
Usuarios actuales cubiertos: 7/7
Perfiles funcionales: 3/3
Usuarios futuros: soportados
```

El owner genérico toma todos los registros activos de Equipo y no hardcodea personas. Bloquea conteos distintos de siete para este cierre, correos duplicados, falta de administrador bootstrap y contratos incompletos de roles, países o scopes.

Estado real:

```text
Identidades creadas por el gate source-only: 0
Memberships creadas: 0
Correos enviados: 0
Runtime v7 anterior: no ejecutado
```

La siguiente frontera es una sola ejecución runtime acumulativa para los siete usuarios actuales, con bootstrap Admin SDK, reconciliación de memberships, correos de establecimiento/recuperación, sesiones verificadas e integridad CRM.

## Cobros

```text
Gate: PASS_COBROS_FULL_REPLAY
Estado: ACTIVE_READ_ONLY_MONTHLY_INTAKE_PARALLEL
```

Continúan la clasificación de 365 pagos, recepción gradual de planillas/facturas/estados de cuenta, importador inteligente y contrato planilla de comisiones → CxC/CxP → factura posterior.

No reutilizar requests consumidos ni ejecutar producción, main, merge, Rules, reimportación o despliegues sin autorización explícita y gate correspondiente.
