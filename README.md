# orbit360-core

Repositorio de Orbit 360.

La continuidad operativa vigente de A&S se rige por:

1. `orbit360-platform/docs/FUENTES-RECTORAS-VIGENTES-ORBIT360-AYS-20260730.md`;
2. `orbit360-platform/docs/PLAN-UNICO-SALIDA-RC-AYS-LAB-CANONICA-01-20260804.md`;
3. `orbit360-platform/docs/ANEXO-PLAN-UNICO-AUTH-SOURCE-ONLY-V4-PASS-20260805.md`;
4. `orbit360-platform/runtime-gate-crm-v20260716/rc-ays-lab-canonica-01-ledger-v20260804.json`;
5. `orbit360-platform/runtime-gate-crm-v20260716/auth-access-source-only-v4-ledger-v20260805.json`;
6. `orbit360-platform/docs/ESTADO-ACTIVO-AUTH-SOURCE-ONLY-V4-BLOQUE4-CONTINUA-20260805.md`;
7. `orbit360-platform/docs/ESTADO-ACTIVO-BLOQUE-4-COBROS-FULL-REPLAY-20260805.md`;
8. estado vivo del PR #5.

RC activa:

```text
RC-AYS-LAB-CANONICA-01
```

Evidencia preservada:

```text
runtime funcional: 30962756387 · 18/18 PASS
rutas aisladas: 30971707956 · 8/8 PASS
composición canónica: 30977179448 · 31/31 PASS
inner preflight canónico: 32/32 PASS
request v4 + provenance: 30979519198 · 33/33 PASS
```

Microbloque 2.5:

```text
run: 31005103975
preflight: 32/32 PASS
Functions: 4/4
Hosting preview: retenido
integridad: PASS
snapshots before/after: idénticos
Firestore/Auth writes: 0
```

URL LAB retenida para revisión manual:

```text
https://ays-orbit-360-lab--orbit360-operational-block12-w8ibrr6w.web.app
```

El modal `Acuerdos legales` debe aceptarse una sola vez en la sesión. Bloqueó las capturas automáticas, pero no bloquea la revisión manual ni la continuidad técnica. No se desactiva globalmente y no se redepliega Functions o Hosting para resolverlo.

Bloque 3.0:

```text
Gate: OPS_LEADS_BACKEND_LAB_COMPLETE
Estado: PASS_REUSED_FUNCTIONAL_RUNTIME_AND_CURRENT_DEPLOY
```

La evidencia funcional sigue vigente y ningún owner de Ops/Leads cambió entre el PASS 18/18 y el source HEAD desplegado. No se repite la batería funcional.

## Auth source-only v4

```text
Gate: block-auth-access-recovery-source-only-v4-20260805
Contract: 13.3.0
Resultado: AUTH_ACCESS_SOURCE_ONLY_V4_PASS
Checks: 26/26
```

Quedaron validados:

- provenance del root fix `38aae846477a35025950869a207bf10be9337cc1`;
- estrategia `READ_ALL → VALIDATE_ALL → WRITE_ALL`;
- allowlists exactas;
- atomicidad e idempotencia;
- requests Auth v1/v2/v3 inmutables y consumidos;
- request Auth source-only v4 consumido e inmutable;
- futuro request Auth runtime v5 ausente.

El source-only v4 ejecutó cero secretos, Firebase, Firestore, Auth, Functions, Hosting, navegador, deploy, Rules, reimportación, CRM, producción, main o merge. Las identidades y memberships reales de Paula, Carlos y Samuel todavía requieren un gate runtime nuevo y autorización explícita.

Estado activo de Cobros:

```text
Bloque 4.0
Gate: PASS_COBROS_FULL_REPLAY
Estado: ACTIVE_READ_ONLY_MONTHLY_INTAKE_PARALLEL
```

Universo del replay:

```text
pagos reportados: 365
secuencia cartera: 128
posteriores al corte: 2
pendientes de overlay: 235
cobros existentes preservados: 5
HOLD de estado: 44
```

Se recuperaron el workbook canónico privado y el dry-run normalizado de planillas. El replay continúa sin escrituras, reimportación, deploy, Rules, producción, main o merge.

No reutilizar requests consumidos ni sustituir las fuentes vivas por memoria o estados históricos.
