# orbit360-core

Repositorio de Orbit 360.

La continuidad operativa vigente de A&S se rige por:

1. `orbit360-platform/docs/FUENTES-RECTORAS-VIGENTES-ORBIT360-AYS-20260730.md`;
2. `orbit360-platform/docs/PLAN-UNICO-SALIDA-RC-AYS-LAB-CANONICA-01-20260804.md`;
3. `orbit360-platform/runtime-gate-crm-v20260716/rc-ays-lab-canonica-01-ledger-v20260804.json`;
4. `orbit360-platform/docs/CIERRE-BLOQUE-3-OPS-LEADS-DURABLE-PASS-REUTILIZADO-20260805.md`;
5. `orbit360-platform/docs/ESTADO-ACTIVO-BLOQUE-4-COBROS-FULL-REPLAY-20260805.md`;
6. estado vivo del PR #5.

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

Estado activo:

```text
Bloque 4.0
Gate: PASS_COBROS_FULL_REPLAY
Estado: ACTIVE_READ_ONLY
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

Los requests runtime v3, source-only v4 y runtime v4 están consumidos e inmutables. No usar memoria o estados históricos para sustituir el ledger vivo.
