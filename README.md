# orbit360-core

Repositorio de Orbit 360.

La continuidad operativa vigente de A&S se rige por:

1. `orbit360-platform/docs/FUENTES-RECTORAS-VIGENTES-ORBIT360-AYS-20260730.md`;
2. `orbit360-platform/docs/PLAN-UNICO-SALIDA-RC-AYS-LAB-CANONICA-01-20260804.md`;
3. `orbit360-platform/docs/ANEXO-PLAN-UNICO-AUTH-FUNDACION-SOLUCION-DEFINITIVA-20260805.md`;
4. `orbit360-platform/docs/AUDITORIA-FORENSE-AUTH-SOLUCION-DEFINITIVA-20260805.md`;
5. `orbit360-platform/runtime-gate-crm-v20260716/auth-forensic-definitive-solution-v20260805.json`;
6. `orbit360-platform/docs/ESTADO-ACTIVO-AUTH-V7-SUSPENDIDO-BLOQUE4-CONTINUA-20260805.md`;
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

## Auth — auditoría forense y solución definitiva

```text
Runtime v7: SUSPENDIDO
Request v7: AUSENTE
Runtime ejecutado: no
Secretos/Firebase/Firestore/Auth/Functions: 0
```

Causa sistémica:

```text
FUNCTIONAL_DEFECT
AUTH_BOOTSTRAP_CIRCULAR_DEPENDENCY_AND_SPLIT_BRAIN_USER_STATE
```

Equipo puede guardar el registro operativo antes de que existan Firebase Auth y membership. El onboarding normal exige un actor ya autenticado con membership administrativa activa, por lo que no puede utilizarse como bootstrap de la primera administración real.

Solución:

```text
Bootstrap inicial directo por Admin SDK y roster sellado
→ identidades + memberships + correos
→ login real verificado
→ onboarding normal desde Equipo
→ recuperación visible de contraseña
→ retiro de demo y cierre de Rules antes de producción
```

No crear únicamente usuarios en Firebase: sin memberships válidas el login fail-closed los rechazará. No abrir gates separados por persona ni nuevas cadenas de recovery basadas en la callable inicial.

La siguiente unidad es un único macrobloque `AUTH_FOUNDATION_SINGLE_MACROBLOCK`, primero validado source-only de manera acumulativa y después ejecutado una sola vez bajo autorización explícita.

## Cobros

```text
Gate: PASS_COBROS_FULL_REPLAY
Estado: ACTIVE_READ_ONLY_MONTHLY_INTAKE_PARALLEL
```

Continúan la clasificación de 365 pagos, recepción gradual de planillas/facturas/estados de cuenta, importador inteligente y contrato planilla de comisiones → CxC/CxP → factura posterior.

No reutilizar requests consumidos ni ejecutar producción, main, merge, Rules, reimportación o despliegues sin autorización explícita y gate correspondiente.
